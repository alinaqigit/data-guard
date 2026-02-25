"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Search, Trash2, Shield, X, FileSearch, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSecurity } from "@/context/SecurityContext";
import { getSocket } from "@/lib/api/socket";
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
  { value: "quick",  label: "Quick Scan (Fast)",  description: "Shallow scan across all drives and user folders" },
  { value: "full",   label: "Full Scan (Slow)",   description: "Deep recursive scan across all drives" },
  { value: "custom", label: "Custom Path",        description: "Scan a specific directory or path" },
];

const SENSITIVITY_OPTIONS = [
  { value: "Low",    label: "Low",    description: "Base model · Highest confidence" },
  { value: "Medium", label: "Medium", description: "Small model · Balanced" },
  { value: "High",   label: "High",   description: "Tiny model · Fastest, lower confidence" },
];

interface ScanState {
  isActive: boolean;
  scanId: number | null;
  totalFiles: number;
  filesScanned: number;
  filesWithThreats: number;
  totalThreats: number;
  currentFile: string;
  startTime: number | null;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
}

const INITIAL_SCAN_STATE: ScanState = {
  isActive: false, scanId: null, totalFiles: 0, filesScanned: 0,
  filesWithThreats: 0, totalThreats: 0, currentFile: "",
  startTime: null, status: "idle",
};

function formatETA(filesScanned: number, totalFiles: number, startTime: number): string {
  if (filesScanned === 0 || totalFiles === 0) return "Calculating...";
  const elapsed = (Date.now() - startTime) / 1000; // seconds
  const rate = filesScanned / elapsed; // files per second
  const remaining = (totalFiles - filesScanned) / rate;
  if (remaining < 60) return `~${Math.round(remaining)}s left`;
  if (remaining < 3600) return `~${Math.round(remaining / 60)}m left`;
  return `~${Math.round(remaining / 3600)}h left`;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const cardStyle = {
  background: "linear-gradient(135deg, #020617 0%, #000000 100%)",
  borderColor: "rgba(51, 65, 85, 0.3)",
};

export default function ScannerPage() {
  const { scans, runScan, clearAllScans } = useSecurity();
  const [scanType, setScanType] = useState("quick");
  const [scanPath, setScanPath] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [sensitivity, setSensitivity] = useState("Medium");
  const confidence = SENSITIVITY_CONFIDENCE[sensitivity];
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([]);
  const [whitelistedPaths, setWhitelistedPaths] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [pathInput, setPathInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [scanState, setScanState] = useState<ScanState>(INITIAL_SCAN_STATE);
  const scanStateRef = useRef<ScanState>(INITIAL_SCAN_STATE);
  const completionTimeRef = useRef<number | null>(null);

  // Keep ref in sync so socket callbacks have latest state
  const updateScanState = (updates: Partial<ScanState>) => {
    setScanState((prev) => {
      const next = { ...prev, ...updates };
      scanStateRef.current = next;
      return next;
    });
  };

  // Socket listeners for scan progress
  useEffect(() => {
    const socket = getSocket();

    socket.on("scan:start", (data: ScanStart) => {
      // Accept any scan:start when we're in pending state (scanId === -1 or null)
      const currentId = scanStateRef.current.scanId;
      if (currentId !== null && currentId !== -1 && data.scanId !== currentId) return;
      updateScanState({
        scanId: data.scanId,
        totalFiles: data.totalFiles,
        startTime: Date.now(),
        status: "running",
        isActive: true,
      });
    });

    socket.on("scan:progress", (data: ScanProgress) => {
      const currentId = scanStateRef.current.scanId;
      if (currentId !== null && currentId !== -1 && data.scanId !== currentId) return;
      updateScanState({
        scanId: data.scanId,
        filesScanned: data.filesScanned,
        filesWithThreats: data.filesWithThreats,
        totalThreats: data.totalThreats,
        totalFiles: data.totalFiles,
        currentFile: data.currentFile || "",
        status: "running",
        isActive: true,
      });
    });

    socket.on("scan:complete", (data: any) => {
      const currentId = scanStateRef.current.scanId;
      if (currentId !== null && currentId !== -1 && data.scanId !== currentId) return;
      completionTimeRef.current = Date.now();
      updateScanState({
        filesScanned: data.filesScanned,
        totalThreats: data.totalThreats,
        totalFiles: data.totalFiles || scanStateRef.current.totalFiles,
        status: "completed",
        isActive: false,
        currentFile: "",
      });
      setIsScanning(false);
    });

    return () => {
      socket.off("scan:start");
      socket.off("scan:progress");
      socket.off("scan:complete");
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("dlp_scanner_prefs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setExcludedKeywords(parsed.excludedKeywords || []);
        setWhitelistedPaths(parsed.whitelistedPaths || []);
        setSensitivity(parsed.sensitivity || "Medium");
      } catch {}
    }
  }, []);

  const addKeywords = () => {
    const words = keywordInput.split(",").map((w) => w.trim())
      .filter((w) => w.length > 0 && !excludedKeywords.includes(w));
    if (words.length > 0) { setExcludedKeywords((prev) => [...prev, ...words]); setKeywordInput(""); }
  };

  const addPaths = () => {
    const paths = pathInput.split(",").map((p) => p.trim())
      .filter((p) => p.length > 0 && !whitelistedPaths.includes(p));
    if (paths.length > 0) { setWhitelistedPaths((prev) => [...prev, ...paths]); setPathInput(""); }
  };

  const handleKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeywords(); }
  };

  const handlePathKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addPaths(); }
  };

  const handleSavePreferences = () => {
    setIsSaving(true);
    if (keywordInput.trim()) addKeywords();
    if (pathInput.trim()) addPaths();
    localStorage.setItem("dlp_scanner_prefs", JSON.stringify({ excludedKeywords, whitelistedPaths, sensitivity }));
    setTimeout(() => {
      setIsSaving(false);
      setToast({ message: "Preferences saved successfully.", type: "success" });
    }, 800);
  };

  const handleStartScanWithId = async () => {
    if (scanType === "custom" && !scanPath.trim()) {
      setToast({ message: "Please enter a path for Custom Scan.", type: "error" });
      return;
    }
    setIsScanning(true);
    completionTimeRef.current = null;

    // Reset to pending state — scanId -1 means "accept the next scan:start"
    updateScanState({ ...INITIAL_SCAN_STATE, isActive: true, status: "running", startTime: Date.now(), scanId: -1 });

    try {
      await runScan(scanType, "All Files", scanPath || process.cwd(), (threatsFound) => {
        // onComplete fires via polling when scan finishes
        // Only use this for the toast — socket events handle the progress UI
        if (threatsFound === -1) {
          setToast({ message: "Scan encountered an error.", type: "error" });
        } else if (threatsFound > 0) {
          setToast({ message: `Scan complete — ${threatsFound} threat(s) detected!`, type: "error" });
        } else {
          setToast({ message: "Scan complete — no threats found.", type: "success" });
        }
        setIsScanning(false);
      });

      setToast({ message: "Scan started!", type: "success" });
    } catch (error) {
      setIsScanning(false);
      updateScanState({ ...INITIAL_SCAN_STATE });
      setToast({ message: error instanceof Error ? error.message : "Failed to start scan", type: "error" });
    }
  };

  const percentage = scanState.totalFiles > 0
    ? Math.min(100, Math.round((scanState.filesScanned / scanState.totalFiles) * 100))
    : 0;

  const isCompleted = scanState.status === "completed";
  const isFailed = scanState.status === "failed";
  const showProgress = scanState.isActive || isCompleted || isFailed;

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 mb-8 tracking-tight">
        Content Scanner
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Configuration */}
        <div className="lg:col-span-2 border rounded-2xl p-4 md:p-5 shadow-lg" style={cardStyle}>
          <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3 tracking-tight">
            <Shield className="text-blue-500" size={28} />
            Scan Configuration
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Scan Type</label>
              <CustomSelect value={scanType} onChange={setScanType} options={SCAN_TYPE_OPTIONS} />
            </div>

            {scanType === "custom" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-sm font-medium text-neutral-400">Custom Path to Scan</label>
                <input
                  type="text"
                  placeholder="e.g. C:\Users\Documents or /home/user/documents"
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-neutral-600"
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                />
              </div>
            )}

            {/* Scan type descriptions */}
            <div className="text-xs text-neutral-500 px-1">
              {scanType === "quick" && "Scans top-level files across all drives and user folders. Fast."}
              {scanType === "full"  && "Recursively scans every accessible file across all drives. May take several minutes."}
              {scanType === "custom" && "Scans only the path you specify, recursively."}
            </div>

            <button
              onClick={handleStartScanWithId}
              disabled={isScanning}
              className={`w-full ${isScanning ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"} text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95`}
            >
              {isScanning ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning...</>
              ) : (
                <><Search size={18} />Start Scan</>
              )}
            </button>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="border rounded-2xl p-4 md:p-5 shadow-lg flex flex-col justify-center" style={cardStyle}>
          <h3 className="text-lg font-bold text-white mb-6">Model Configuration</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Model Sensitivity</label>
              <CustomSelect value={sensitivity} onChange={setSensitivity} options={SENSITIVITY_OPTIONS} />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-neutral-400">Detection Confidence</label>
                <span className="text-indigo-400 font-mono font-bold text-sm">{confidence}%</span>
              </div>
              <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500 rounded-full"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <p className="text-xs text-neutral-600 px-1">{SENSITIVITY_DESCRIPTION[sensitivity]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scan Progress Panel ─────────────────────────────────────────────── */}
      {showProgress && (
        <div className={`border rounded-2xl p-5 shadow-lg transition-all duration-300 ${
          isCompleted ? "border-emerald-500/30 bg-emerald-950/20" :
          isFailed    ? "border-rose-500/30 bg-rose-950/20" :
                        "border-blue-500/30"
        }`} style={isCompleted || isFailed ? {} : cardStyle}>

          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-black text-white flex items-center gap-3">
              {isCompleted ? (
                <><CheckCircle2 className="text-emerald-500" size={22} />Scan Complete</>
              ) : isFailed ? (
                <><AlertTriangle className="text-rose-500" size={22} />Scan Failed</>
              ) : (
                <><div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />Scanning in Progress</>
              )}
            </h3>
            <span className="text-2xl font-black text-white tabular-nums">{percentage}%</span>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden mb-5">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                isCompleted ? "bg-emerald-500" :
                isFailed    ? "bg-rose-500" :
                              "bg-gradient-to-r from-blue-600 to-indigo-400"
              }`}
              style={{ width: `${percentage}%` }}
            />
            {/* Shimmer animation while running */}
            {!isCompleted && !isFailed && (
              <div
                className="absolute top-0 left-0 h-full w-full rounded-full opacity-30"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                  animation: "shimmer 1.5s infinite",
                  backgroundSize: "200% 100%",
                }}
              />
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Files Scanned</p>
              <p className="text-xl font-black text-white tabular-nums">{scanState.filesScanned.toLocaleString()}</p>
              {scanState.totalFiles > 0 && (
                <p className="text-xs text-neutral-600 mt-0.5">of {scanState.totalFiles.toLocaleString()}</p>
              )}
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Threats Found</p>
              <p className={`text-xl font-black tabular-nums ${scanState.totalThreats > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {scanState.totalThreats}
              </p>
              {scanState.filesWithThreats > 0 && (
                <p className="text-xs text-neutral-600 mt-0.5">in {scanState.filesWithThreats} file{scanState.filesWithThreats !== 1 ? "s" : ""}</p>
              )}
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">
                {isCompleted ? "Duration" : "ETA"}
              </p>
              <p className="text-xl font-black text-white">
                {isCompleted && scanState.startTime && completionTimeRef.current
                  ? formatDuration(completionTimeRef.current - scanState.startTime)
                  : scanState.startTime
                  ? formatETA(scanState.filesScanned, scanState.totalFiles, scanState.startTime)
                  : "—"}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Status</p>
              <p className={`text-sm font-black uppercase tracking-wide ${
                isCompleted ? "text-emerald-400" :
                isFailed    ? "text-rose-400" :
                              "text-blue-400"
              }`}>
                {scanState.status}
              </p>
            </div>
          </div>

          {/* Current file */}
          {scanState.currentFile && !isCompleted && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono truncate px-1">
              <FileSearch size={12} className="flex-shrink-0 text-neutral-600" />
              <span className="truncate">{scanState.currentFile}</span>
            </div>
          )}
        </div>
      )}

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Scanner Preferences */}
      <div className="border rounded-2xl p-4 md:p-5 shadow-lg" style={cardStyle}>
        <h3 className="text-lg font-bold text-white mb-6">Scanner Preferences</h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Excluded Keywords */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-400">Excluded Keywords</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. ticket, train, invoice"
                  className="flex-1 bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-600 text-sm"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                />
                <button onClick={addKeywords} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95">Add</button>
              </div>
              <p className="text-xs text-neutral-600">Separate multiple keywords with commas</p>
              {excludedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {excludedKeywords.map((kw) => (
                    <span key={kw} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold">
                      {kw}
                      <button onClick={() => setExcludedKeywords((prev) => prev.filter((k) => k !== kw))} className="hover:text-white transition-colors"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Whitelisted Paths */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-400">Whitelisted Paths</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. C:\Windows\System32"
                  className="flex-1 bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-600 text-sm"
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyDown={handlePathKeyDown}
                />
                <button onClick={addPaths} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95">Add</button>
              </div>
              <p className="text-xs text-neutral-600">Press Enter or click Add to add a path</p>
              {whitelistedPaths.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {whitelistedPaths.map((p) => (
                    <span key={p} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold">
                      {p}
                      <button onClick={() => setWhitelistedPaths((prev) => prev.filter((x) => x !== p))} className="hover:text-white transition-colors"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className={`px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 ${isSaving ? "bg-indigo-600/50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"} text-white`}
          >
            {isSaving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>) : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* Recent Scan Results */}
      <div className="border rounded-2xl p-4 md:p-5 shadow-lg" style={cardStyle}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-white">Recent Scan Results</h3>
          {scans.length > 0 && (
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-medium transition-colors">
              <Trash2 size={16} />Delete All Scans
            </button>
          )}
        </div>

        {scans.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            <FileSearch size={36} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold">No scans yet</p>
            <p className="text-sm mt-1">Run a scan above to see results here.</p>
          </div>
        ) : (
          <Table<any>
            columns={[
              { header: "Scan ID", accessor: "scanid", render: (value) => <span className="font-mono text-xs px-2 py-1 bg-white/5 rounded text-neutral-400 border border-white/5">{value}</span> },
              { header: "Type", accessor: "filename", className: "w-[40%]", render: (value) => <span className="font-semibold text-neutral-100">{value}</span> },
              { header: "Threats", accessor: "threats", render: (value) => (
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${value > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                  <span className={value > 0 ? "text-rose-500 font-bold" : "text-neutral-500"}>{value}</span>
                </div>
              )},
              { header: "Time", accessor: "date", className: "text-neutral-500 text-xs text-right" },
            ]}
            data={scans.map((s) => ({
              scanid: `SCN-${String(s.id).padStart(4, "0")}`,
              filename: s.type,
              threats: s.threats,
              date: s.time,
            }))}
          />
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete All Scans?"
        message="This will permanently remove all scan records from the database. This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        isDestructive
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          clearAllScans();
          setShowDeleteConfirm(false);
          setToast({ message: "All scans deleted.", type: "success" });
        }}
      />
    </div>
  );
}