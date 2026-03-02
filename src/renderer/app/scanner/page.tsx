"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Search, Trash2, Shield, X, FileSearch, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSecurity } from "@/context/SecurityContext";
import { getSocket } from "@/lib/api/socket";
import { scannerService } from "@/lib/api/scanner.service";
import type { ScanStart, ScanProgress } from "@/lib/api/socket";
import Table from "@/components/Table";
import Toast from "@/components/Toast";
import CustomSelect from "@/components/CustomSelect";
import ConfirmDialog from "@/components/ConfirmDialog";

const SENSITIVITY_CONFIDENCE: Record<string, number> = { Low: 95, Medium: 75, High: 50 };
const SENSITIVITY_DESCRIPTION: Record<string, string> = {
  Low: "Base model · Highest accuracy, slower detection",
  Medium: "Small model · Balanced speed and accuracy",
  High: "Tiny model · Fastest detection, lower accuracy",
};
const SCAN_TYPE_OPTIONS = [
  { value: "quick",  label: "Quick Scan",   description: "Shallow scan across all drives and user folders" },
  { value: "full",   label: "Full Scan",    description: "Deep recursive scan across all drives" },
  { value: "custom", label: "Custom Path",  description: "Scan a specific directory or path" },
];
const SENSITIVITY_OPTIONS = [
  { value: "Low",    label: "Low",    description: "Base model · Highest confidence" },
  { value: "Medium", label: "Medium", description: "Small model · Balanced" },
  { value: "High",   label: "High",   description: "Tiny model · Fastest, lower confidence" },
];

interface ScanState {
  isActive: boolean; scanId: number | null; totalFiles: number;
  filesScanned: number; filesWithThreats: number; totalThreats: number;
  currentFile: string; startTime: number | null;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
}

const INITIAL: ScanState = { isActive: false, scanId: null, totalFiles: 0, filesScanned: 0, filesWithThreats: 0, totalThreats: 0, currentFile: "", startTime: null, status: "idle" };

function formatETA(filesScanned: number, totalFiles: number, startTime: number) {
  if (!filesScanned || !totalFiles) return "Calculating...";
  const rate = filesScanned / ((Date.now() - startTime) / 1000);
  const rem = (totalFiles - filesScanned) / rate;
  if (rem < 60) return `~${Math.round(rem)}s left`;
  if (rem < 3600) return `~${Math.round(rem / 60)}m left`;
  return `~${Math.round(rem / 3600)}h left`;
}
function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function ScannerPage() {
  const { scans, runScan, clearAllScans } = useSecurity();
  const [scanType, setScanType]     = useState("quick");
  const [scanPath, setScanPath]     = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [sensitivity, setSensitivity] = useState("Medium");
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([]);
  const [whitelistedPaths, setWhitelistedPaths] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [pathInput, setPathInput]       = useState("");
  const [isSaving, setIsSaving]         = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [scanState, setScanState]       = useState<ScanState>(INITIAL);
  const scanStateRef    = useRef<ScanState>(INITIAL);
  const completionTimeRef = useRef<number | null>(null);
  const cancelledRef    = useRef(false);

  const update = (updates: Partial<ScanState>) => setScanState(prev => {
    const next = { ...prev, ...updates };
    scanStateRef.current = next;
    return next;
  });

  useEffect(() => {
    const socket = getSocket();
    socket.on("scan:start", (data: ScanStart) => {
      const cur = scanStateRef.current.scanId;
      if (cur !== null && cur !== -1 && data.scanId !== cur) return;
      update({ scanId: data.scanId, totalFiles: data.totalFiles, startTime: Date.now(), status: "running", isActive: true });
    });
    socket.on("scan:progress", (data: ScanProgress) => {
      const cur = scanStateRef.current.scanId;
      if (cur !== null && cur !== -1 && data.scanId !== cur) return;
      if (scanStateRef.current.status === "cancelled") return;
      update({ scanId: data.scanId, filesScanned: data.filesScanned, filesWithThreats: data.filesWithThreats, totalThreats: data.totalThreats, totalFiles: data.totalFiles, currentFile: data.currentFile || "", status: "running", isActive: true });
    });
    socket.on("scan:complete", (data: any) => {
      const cur = scanStateRef.current.scanId;
      if (cur !== null && cur !== -1 && data.scanId !== cur) return;
      if (scanStateRef.current.status === "cancelled") return;
      completionTimeRef.current = Date.now();
      update({ filesScanned: data.filesScanned, totalThreats: data.totalThreats, totalFiles: data.totalFiles || scanStateRef.current.totalFiles, status: "completed", isActive: false, currentFile: "" });
      setIsScanning(false);
    });
    return () => { socket.off("scan:start"); socket.off("scan:progress"); socket.off("scan:complete"); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("dlp_scanner_prefs");
    if (saved) try {
      const p = JSON.parse(saved);
      setExcludedKeywords(p.excludedKeywords || []);
      setWhitelistedPaths(p.whitelistedPaths || []);
      setSensitivity(p.sensitivity || "Medium");
    } catch {}
  }, []);

  const addKeywords = () => {
    const words = keywordInput.split(",").map(w => w.trim()).filter(w => w && !excludedKeywords.includes(w));
    if (words.length) { setExcludedKeywords(prev => [...prev, ...words]); setKeywordInput(""); }
  };
  const addPaths = () => {
    const paths = pathInput.split(",").map(p => p.trim()).filter(p => p && !whitelistedPaths.includes(p));
    if (paths.length) { setWhitelistedPaths(prev => [...prev, ...paths]); setPathInput(""); }
  };

  const handleStartScan = async () => {
    if (scanType === "custom" && !scanPath.trim()) { setToast({ message: "Please enter a path for Custom Scan.", type: "error" }); return; }
    setIsScanning(true);
    completionTimeRef.current = null;
    cancelledRef.current = false;
    update({ ...INITIAL, isActive: true, status: "running", startTime: Date.now(), scanId: -1 });
    try {
      await runScan(scanType, "All Files", scanPath || process.cwd(), (threatsFound) => {
        if (cancelledRef.current) return;
        if (threatsFound === -1) setToast({ message: "Scan encountered an error.", type: "error" });
        else if (threatsFound > 0) setToast({ message: `Scan complete — ${threatsFound} threat(s) detected!`, type: "error" });
        else setToast({ message: "Scan complete — no threats found.", type: "success" });
        setIsScanning(false);
      });
      setToast({ message: "Scan started!", type: "success" });
    } catch (error) {
      setIsScanning(false);
      update({ ...INITIAL });
      setToast({ message: error instanceof Error ? error.message : "Failed to start scan", type: "error" });
    }
  };

  const handleCancelScan = async () => {
    try {
      cancelledRef.current = true;
      await scannerService.cancelScan(scanState.scanId!);
      update({ status: "cancelled", isActive: false, currentFile: "" });
      setIsScanning(false);
      setToast({ message: "Scan cancelled.", type: "success" });
    } catch {
      cancelledRef.current = false;
      setToast({ message: "Failed to cancel scan.", type: "error" });
    }
  };

  const percentage = scanState.totalFiles > 0 ? Math.min(100, Math.round((scanState.filesScanned / scanState.totalFiles) * 100)) : 0;
  const isCompleted = scanState.status === "completed";
  const isFailed    = scanState.status === "failed";
  const isCancelled = scanState.status === "cancelled";
  const showProgress = scanState.isActive || isCompleted || isFailed || isCancelled;
  const confidence = SENSITIVITY_CONFIDENCE[sensitivity];

  const cardStyle = { background: '#12161B', border: '1px solid #30363D', borderRadius: '16px', padding: '20px 24px' };
  const inputStyle = { background: '#0D1117', border: '1px solid #30363D', borderRadius: '10px', padding: '10px 14px', color: '#FFFFFF', fontSize: '13px', outline: 'none', width: '100%' };
  const labelStyle = { fontSize: '11px', fontWeight: 600 as const, color: '#535865', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' };

  const progressBorderColor = isCompleted ? 'rgba(34,195,93,0.3)' : isFailed ? 'rgba(248,81,73,0.3)' : isCancelled ? 'rgba(248,193,73,0.3)' : 'rgba(82,114,197,0.3)';
  const progressBg          = isCompleted ? 'rgba(34,195,93,0.05)' : isFailed ? 'rgba(248,81,73,0.05)' : isCancelled ? 'rgba(248,193,73,0.05)' : '#12161B';
  const progressBarColor    = isCompleted ? '#22C35D' : isFailed ? '#F85149' : isCancelled ? '#F8C149' : '#5272C5';

  return (
    <div className="space-y-6 pb-12">
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>Content Scanner</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Config */}
        <div style={cardStyle} className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Shield size={18} style={{ color: '#5272C5' }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>Scan Configuration</span>
          </div>
          <div className="space-y-5">
            <div>
              <label style={labelStyle}>Scan Type</label>
              <CustomSelect value={scanType} onChange={setScanType} options={SCAN_TYPE_OPTIONS} />
            </div>
            {scanType === "custom" && (
              <div>
                <label style={labelStyle}>Custom Path</label>
                <input type="text" placeholder="e.g. C:\Users\Documents" value={scanPath}
                  onChange={e => setScanPath(e.target.value)} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
                />
              </div>
            )}
            <p style={{ fontSize: '12px', color: '#535865' }}>
              {scanType === "quick"  && "Scans top-level files across all drives and user folders. Fast."}
              {scanType === "full"   && "Recursively scans every accessible file across all drives. May take several minutes."}
              {scanType === "custom" && "Scans only the path you specify, recursively."}
            </p>
            <button onClick={handleStartScan} disabled={isScanning}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
              style={{ background: isScanning ? '#3B5189' : '#5272C5', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, opacity: isScanning ? 0.7 : 1, cursor: isScanning ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!isScanning) (e.currentTarget as HTMLButtonElement).style.background = '#445C9A'; }}
              onMouseLeave={e => { if (!isScanning) (e.currentTarget as HTMLButtonElement).style.background = '#5272C5'; }}
            >
              {isScanning
                ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} /> Scanning...</>
                : <><Search size={16} /> Start Scan</>}
            </button>
          </div>
        </div>

        {/* Model Config */}
        <div style={cardStyle}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', display: 'block', marginBottom: '20px' }}>Model Configuration</span>
          <div className="space-y-5">
            <div>
              <label style={labelStyle}>Model Sensitivity</label>
              <CustomSelect value={sensitivity} onChange={setSensitivity} options={SENSITIVITY_OPTIONS} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label style={{ ...labelStyle, marginBottom: 0 }}>Detection Confidence</label>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#5272C5', fontFamily: 'monospace' }}>{confidence}%</span>
              </div>
              <div style={{ height: '6px', background: '#1A1F28', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${confidence}%`, background: '#5272C5', borderRadius: '99px', transition: 'width 0.5s ease' }} />
              </div>
              <p style={{ fontSize: '12px', color: '#535865', marginTop: '8px' }}>{SENSITIVITY_DESCRIPTION[sensitivity]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {showProgress && (
        <div style={{ background: progressBg, border: `1px solid ${progressBorderColor}`, borderRadius: '16px', padding: '20px 24px' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {isCompleted ? <CheckCircle2 size={18} style={{ color: '#22C35D' }} /> :
               isFailed    ? <AlertTriangle size={18} style={{ color: '#F85149' }} /> :
               isCancelled ? <X size={18} style={{ color: '#F8C149' }} /> :
               <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(82,114,197,0.3)', borderTopColor: '#5272C5' }} />}
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
                {isCompleted ? 'Scan Complete' : isFailed ? 'Scan Failed' : isCancelled ? 'Scan Cancelled' : 'Scanning in Progress'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isCancelled && (
                <button onClick={() => update(INITIAL)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: '#161B22', border: '1px solid #30363D', color: '#989898', fontSize: '12px', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#989898')}
                ><X size={13} /> Dismiss</button>
              )}
              {isScanning && scanState.scanId && scanState.scanId !== -1 && (
                <button onClick={handleCancelScan}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: '#F85149', fontSize: '12px', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,81,73,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,81,73,0.1)')}
                ><X size={13} /> Cancel</button>
              )}
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>{percentage}%</span>
            </div>
          </div>

          {/* Bar */}
          <div style={{ height: '6px', background: '#1A1F28', borderRadius: '99px', overflow: 'hidden', marginBottom: '20px', position: 'relative' }}>
            <div style={{ height: '100%', width: `${percentage}%`, background: progressBarColor, borderRadius: '99px', transition: 'width 0.5s ease' }} />
            {!isCompleted && !isFailed && !isCancelled && (
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '100%', width: '100%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '99px',
              }} />
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Files Scanned', value: scanState.filesScanned.toLocaleString(), sub: scanState.totalFiles > 0 ? `of ${scanState.totalFiles.toLocaleString()}` : undefined },
              { label: 'Threats Found', value: String(scanState.totalThreats), valueColor: scanState.totalThreats > 0 ? '#F85149' : '#22C35D', sub: scanState.filesWithThreats > 0 ? `in ${scanState.filesWithThreats} file(s)` : undefined },
              { label: isCompleted ? 'Duration' : 'ETA', value: isCompleted && scanState.startTime && completionTimeRef.current ? formatDuration(completionTimeRef.current - scanState.startTime) : scanState.startTime && !isCancelled ? formatETA(scanState.filesScanned, scanState.totalFiles, scanState.startTime) : '—' },
              { label: 'Status', value: scanState.status.charAt(0).toUpperCase() + scanState.status.slice(1), valueColor: isCompleted ? '#22C35D' : isFailed ? '#F85149' : isCancelled ? '#F8C149' : '#5272C5' },
            ].map(({ label, value, sub, valueColor }) => (
              <div key={label} style={{ background: '#161B22', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#535865', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{label}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: valueColor || '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                {sub && <p style={{ fontSize: '11px', color: '#30363D', marginTop: '2px' }}>{sub}</p>}
              </div>
            ))}
          </div>

          {scanState.currentFile && !isCompleted && !isCancelled && (
            <div className="flex items-center gap-2 truncate" style={{ fontSize: '11px', color: '#535865', fontFamily: 'monospace' }}>
              <FileSearch size={11} style={{ flexShrink: 0 }} />
              <span className="truncate">{scanState.currentFile}</span>
            </div>
          )}
        </div>
      )}

      {/* Preferences */}
      <div style={cardStyle}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', display: 'block', marginBottom: '20px' }}>Scanner Preferences</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          {/* Excluded Keywords */}
          <div>
            <label style={labelStyle}>Excluded Keywords</label>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="e.g. ticket, invoice" value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeywords(); } }}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
              />
              <button onClick={addKeywords}
                className="px-4 rounded-xl transition-all"
                style={{ background: '#5272C5', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#445C9A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#5272C5')}
              >Add</button>
            </div>
            <p style={{ fontSize: '11px', color: '#535865', marginBottom: '8px' }}>Separate multiple keywords with commas</p>
            <div className="flex flex-wrap gap-2">
              {excludedKeywords.map(kw => (
                <span key={kw} className="flex items-center gap-1.5"
                  style={{ background: 'rgba(82,114,197,0.1)', border: '1px solid rgba(82,114,197,0.25)', borderRadius: '99px', padding: '3px 10px', fontSize: '12px', fontWeight: 500, color: '#5272C5' }}>
                  {kw}
                  <button onClick={() => setExcludedKeywords(prev => prev.filter(k => k !== kw))}
                    style={{ color: '#5272C5' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#5272C5')}
                  ><X size={11} /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Whitelisted Paths */}
          <div>
            <label style={labelStyle}>Whitelisted Paths</label>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="e.g. C:\Windows\System32" value={pathInput}
                onChange={e => setPathInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addPaths(); } }}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
              />
              <button onClick={addPaths}
                className="px-4 rounded-xl transition-all"
                style={{ background: '#5272C5', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#445C9A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#5272C5')}
              >Add</button>
            </div>
            <p style={{ fontSize: '11px', color: '#535865', marginBottom: '8px' }}>Press Enter or click Add</p>
            <div className="flex flex-wrap gap-2">
              {whitelistedPaths.map(p => (
                <span key={p} className="flex items-center gap-1.5"
                  style={{ background: 'rgba(34,195,93,0.1)', border: '1px solid rgba(34,195,93,0.25)', borderRadius: '99px', padding: '3px 10px', fontSize: '12px', fontWeight: 500, color: '#22C35D' }}>
                  {p}
                  <button onClick={() => setWhitelistedPaths(prev => prev.filter(x => x !== p))}
                    style={{ color: '#22C35D' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#22C35D')}
                  ><X size={11} /></button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <button onClick={() => {
          setIsSaving(true);
          if (keywordInput.trim()) addKeywords();
          if (pathInput.trim()) addPaths();
          localStorage.setItem("dlp_scanner_prefs", JSON.stringify({ excludedKeywords, whitelistedPaths, sensitivity }));
          setTimeout(() => { setIsSaving(false); setToast({ message: "Preferences saved.", type: "success" }); }, 800);
        }}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all"
          style={{ background: isSaving ? '#3B5189' : '#5272C5', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, opacity: isSaving ? 0.7 : 1 }}
          onMouseEnter={e => { if (!isSaving) (e.currentTarget as HTMLButtonElement).style.background = '#445C9A'; }}
          onMouseLeave={e => { if (!isSaving) (e.currentTarget as HTMLButtonElement).style.background = '#5272C5'; }}
        >
          {isSaving ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} /> Saving...</> : 'Save Preferences'}
        </button>
      </div>

      {/* Recent Results */}
      <div style={cardStyle}>
        <div className="flex justify-between items-center mb-5">
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>Recent Scan Results</span>
          {scans.length > 0 && (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 transition-all"
              style={{ fontSize: '13px', fontWeight: 500, color: '#535865' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F85149')}
              onMouseLeave={e => (e.currentTarget.style.color = '#535865')}
            ><Trash2 size={14} /> Delete All</button>
          )}
        </div>

        {scans.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <FileSearch size={32} style={{ color: '#30363D', margin: '0 auto 12px' }} />
            <p style={{ color: '#535865', fontWeight: 500 }}>No scans yet</p>
            <p style={{ color: '#30363D', fontSize: '13px', marginTop: '4px' }}>Run a scan above to see results here.</p>
          </div>
        ) : (
          <Table<any>
            columns={[
              { header: "Scan ID", accessor: "scanid", render: v => (
                <span style={{ fontFamily: 'monospace', fontSize: '12px', padding: '2px 8px', background: '#161B22', border: '1px solid #30363D', borderRadius: '6px', color: '#989898' }}>{v}</span>
              )},
              { header: "Type", accessor: "filename", className: "w-[40%]", render: v => <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{v}</span> },
              { header: "Threats", accessor: "threats", render: v => (
                <div className="flex items-center gap-2">
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: v > 0 ? '#F85149' : '#22C35D', display: 'inline-block' }} />
                  <span style={{ color: v > 0 ? '#F85149' : '#535865', fontWeight: v > 0 ? 600 : 400 }}>{v}</span>
                </div>
              )},
              { header: "Time", accessor: "date", className: "text-right", render: v => <span style={{ color: '#535865', fontSize: '12px' }}>{v}</span> },
            ]}
            data={scans.map(s => ({ scanid: `SCN-${String(s.id).padStart(4, '0')}`, filename: s.type, threats: s.threats, date: s.time }))}
          />
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <ConfirmDialog isOpen={showDeleteConfirm} title="Delete All Scans?"
        message="This will permanently remove all scan records. This action cannot be undone."
        confirmText="Delete All" cancelText="Cancel" isDestructive
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => { clearAllScans(); setShowDeleteConfirm(false); setToast({ message: "All scans deleted.", type: "success" }); }} />
    </div>
  );
}