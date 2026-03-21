"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
} from "react";
import {
  Search,
  Trash2,
  Shield,
  X,
  FileSearch,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  useSecurity,
  ScanState,
  IDLE_SCAN,
} from "@/context/SecurityContext";
import { getSocket } from "@/lib/api/socket";
import { scannerService } from "@/lib/api/scanner.service";
import type { ScanStart, ScanProgress } from "@/lib/api/socket";
import Table from "@/components/Table";
import Toast from "@/components/Toast";
import CustomSelect from "@/components/CustomSelect";
import ConfirmDialog from "@/components/ConfirmDialog";
import CopyableText from "@/components/CopyableText";

const SCAN_TYPE_OPTIONS = [
  {
    value: "quick",
    label: "Quick Scan (Fast)",
    description: "Shallow scan across all drives and user folders",
  },
  {
    value: "full",
    label: "Full Scan (Slow)",
    description: "Deep recursive scan across all drives",
  },
  {
    value: "custom",
    label: "Custom Path",
    description: "Scan a specific directory or path",
  },
];


function formatETA(
  filesScanned: number,
  totalFiles: number,
  startTime: number,
): string {
  if (filesScanned === 0 || totalFiles === 0) return "Calculating...";
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = filesScanned / elapsed;
  const remaining = (totalFiles - filesScanned) / rate;
  if (!isFinite(remaining) || remaining <= 0) return "Almost done...";
  if (remaining < 60) return `~${Math.round(remaining)}s left`;
  if (remaining < 3600) return `~${Math.round(remaining / 60)}m left`;
  return `~${Math.round(remaining / 3600)}h left`;
}

const INITIAL: ScanState = IDLE_SCAN;

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function ScannerPage() {
  // scanState and setScanState live in context — survive navigation
  const { scans, runScan, clearAllScans, scanState, setScanState } =
    useSecurity();

  const [scanType, setScanType] = useState("quick");
  const [scanPath, setScanPath] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const [excludedKeywords, setExcludedKeywords] = useState<string[]>(
    [],
  );
  const [whitelistedPaths, setWhitelistedPaths] = useState<string[]>(
    [],
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [pathInput, setPathInput] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const scanStateRef = useRef<ScanState>(IDLE_SCAN);
  const completionTimeRef = useRef<number | null>(null);
  const cancelledRef    = useRef(false);

  // Throttle ref for scan:progress — prevents UI freeze from rapid socket events
  const progressThrottleRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const latestProgressRef = useRef<ScanProgress | null>(null);

  // Sync scanStateRef when scanState changes from context
  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  const updateScanState = (
    updates: Partial<ScanState> | ScanState,
  ) => {
    setScanState(updates);
  };

  // Flush any pending throttled progress update on unmount or scan end
  const flushProgress = useCallback(() => {
    if (progressThrottleRef.current) {
      clearTimeout(progressThrottleRef.current);
      progressThrottleRef.current = null;
    }
    const pending = latestProgressRef.current;
    if (pending) {
      latestProgressRef.current = null;
      updateScanState({
        activeScanId: pending.scanId,
        filesScanned: pending.filesScanned,
        filesWithThreats: pending.filesWithThreats,
        totalThreats: pending.totalThreats,
        totalFiles: pending.totalFiles,
        currentFile: pending.currentFile || "",
        status: "running",
      });
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleScanStart = (data: ScanStart) => {
      const currentId = scanStateRef.current.activeScanId;
      if (
        currentId !== null &&
        currentId !== -1 &&
        data.scanId !== currentId
      )
        return;
      updateScanState({
        activeScanId: data.scanId,
        totalFiles: data.totalFiles,
        startTime: Date.now(),
        status: "running",
      });
    };

    // FIX: Throttle progress updates to ~150ms to prevent UI freeze
    const handleScanProgress = (data: ScanProgress) => {
      const currentId = scanStateRef.current.activeScanId;
      if (
        currentId !== null &&
        currentId !== -1 &&
        data.scanId !== currentId
      )
        return;
      // FIX: Stop updating progress after cancel
      if (cancelledRef.current) return;

      // Store latest progress data
      latestProgressRef.current = data;

      // Only schedule a state update if one isn't already pending
      if (!progressThrottleRef.current) {
        progressThrottleRef.current = setTimeout(() => {
          progressThrottleRef.current = null;
          const latest = latestProgressRef.current;
          if (!latest || cancelledRef.current) return;
          latestProgressRef.current = null;
          updateScanState({
            activeScanId: latest.scanId,
            filesScanned: latest.filesScanned,
            filesWithThreats: latest.filesWithThreats,
            totalThreats: latest.totalThreats,
            totalFiles: latest.totalFiles,
            currentFile: latest.currentFile || "",
            status: "running",
          });
        }, 150);
      }
    };

    const handleScanComplete = (data: any) => {
      const currentId = scanStateRef.current.activeScanId;
      if (
        currentId !== null &&
        currentId !== -1 &&
        data.scanId !== currentId
      )
        return;
      // FIX: Ignore completion event if scan was cancelled
      if (cancelledRef.current) return;
      // Flush any pending throttled progress before marking complete
      if (progressThrottleRef.current) {
        clearTimeout(progressThrottleRef.current);
        progressThrottleRef.current = null;
        latestProgressRef.current = null;
      }
      completionTimeRef.current = Date.now();
      updateScanState({
        filesScanned: data.filesScanned,
        totalThreats: data.totalThreats,
        totalFiles:
          data.totalFiles || scanStateRef.current.totalFiles,
        status: "completed",
        currentFile: "",
      });
    };

    socket.on("scan:start", handleScanStart);
    socket.on("scan:progress", handleScanProgress);
    socket.on("scan:complete", handleScanComplete);

    return () => {
      // FIX: Remove only THIS component's listeners, not SecurityContext's
      socket.off("scan:start", handleScanStart);
      socket.off("scan:progress", handleScanProgress);
      socket.off("scan:complete", handleScanComplete);
      // Clear any pending throttle timer
      if (progressThrottleRef.current) {
        clearTimeout(progressThrottleRef.current);
        progressThrottleRef.current = null;
      }
    };
  }, []);

  // Load saved preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem("dlp_scanner_prefs");
    if (saved) try {
      const p = JSON.parse(saved);
      setExcludedKeywords(p.excludedKeywords || []);
      setWhitelistedPaths(p.whitelistedPaths || []);
    } catch {}
  }, []);

  const addKeywords = () => {
    const words = keywordInput
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w && !excludedKeywords.includes(w));
    if (words.length) {
      setExcludedKeywords((p) => [...p, ...words]);
      setKeywordInput("");
    }
  };
  const addPaths = () => {
    const paths = pathInput
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p && !whitelistedPaths.includes(p));
    if (paths.length) {
      setWhitelistedPaths((p) => [...p, ...paths]);
      setPathInput("");
    }
  };
  const handleKeywordKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeywords();
    }
  };
  const handlePathKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPaths();
    }
  };

  const handleSavePreferences = () => {
    if (keywordInput.trim()) addKeywords();
    if (pathInput.trim()) addPaths();
    localStorage.setItem(
      "dlp_scanner_prefs",
      JSON.stringify({
        excludedKeywords,
        whitelistedPaths,
      }),
    );
    setToast({ message: "Preferences saved.", type: "success" });
  };

  const handleStartScan = async () => {
    if (scanType === "custom" && !scanPath.trim()) {
      setToast({
        message: "Please enter a path for Custom Scan.",
        type: "error",
      });
      return;
    }
    completionTimeRef.current = null;
    cancelledRef.current = false;

    updateScanState({
      ...IDLE_SCAN,
      status: "running",
      startTime: Date.now(),
      activeScanId: -1,
    });

    try {
      setIsStarting(true);
      await runScan(
        scanType,
        "All Files",
        scanPath || "/",
        (threatsFound) => {
          // FIX: Don't fire completion toast if scan was cancelled
          if (cancelledRef.current) return;
          if (threatsFound === -1) {
            setToast({
              message: "Scan encountered an error.",
              type: "error",
            });
          } else if (threatsFound > 0) {
            setToast({
              message: `Scan complete — ${threatsFound} threat(s) detected!`,
              type: "error",
            });
          } else {
            setToast({
              message: "Scan complete — no threats found.",
              type: "success",
            });
          }
        },
      );

      setToast({ message: "Scan started!", type: "success" });
    } catch (err) {
      setScanState(IDLE_SCAN);
      setToast({
        message:
          err instanceof Error ? err.message : "Failed to start scan",
        type: "error",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelScan = async () => {
    try {
      cancelledRef.current = true;
      // Clear any pending throttled progress update
      if (progressThrottleRef.current) {
        clearTimeout(progressThrottleRef.current);
        progressThrottleRef.current = null;
        latestProgressRef.current = null;
      }
      await scannerService.cancelScan(scanState.activeScanId!);
      updateScanState({
        status: "idle",
        currentFile: "",
      });
      setToast({ message: "Scan cancelled.", type: "success" });
    } catch {
      cancelledRef.current = false;
      setToast({ message: "Failed to cancel scan.", type: "error" });
    }
  };

  const percentage =
    scanState.totalFiles > 0
      ? Math.min(
          100,
          Math.round(
            (scanState.filesScanned / scanState.totalFiles) * 100,
          ),
        )
      : 0;

  const isCompleted = scanState.status === "completed";
  const isFailed = scanState.status === "failed";
  const isCancelled = cancelledRef.current;
  const isRunning = scanState.status === "running";
  const showProgress =
    isRunning || isCompleted || isFailed || isCancelled;
  const cardStyle = { background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: '16px' };

  return (
    <div className="space-y-6 pb-12">
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Content Scanner</h1>

      {/* ── Config ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6">
        <div
          className="border rounded-2xl p-4 md:p-5"
          style={cardStyle}
        >
          <h2 className="flex items-center gap-3 tracking-tight" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '24px' }}>
            <Shield className="text-blue-500" size={20} />
            Scan Configuration
          </h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                Scan Type
              </label>
              <CustomSelect
                value={scanType}
                onChange={setScanType}
                options={SCAN_TYPE_OPTIONS}
              />
            </div>
            {scanType === "custom" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                  Custom Path
                </label>
                <input
                  type="text"
                  placeholder="e.g. C:\Users\Documents or /home/user/documents"
                  className="w-full rounded-xl px-4 py-2.5 focus:outline-none transition-colors text-sm"
                  style={{ background: 'var(--background-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                />
              </div>
            )}

            <div className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
              {scanType === "quick" &&
                "Scans top-level files across all drives and user folders. Fast."}
              {scanType === "full" &&
                "Recursively scans every accessible file across all drives. May take several minutes."}
              {scanType === "custom" &&
                "Scans only the path you specify, recursively."}
            </div>
            <button
              onClick={handleStartScan}
              disabled={isStarting || isRunning}
              className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: isStarting || isRunning ? 'var(--brand-mid)' : 'var(--brand-light)', color: 'var(--text-on-brand)', opacity: isStarting || isRunning ? 0.7 : 1, cursor: isStarting || isRunning ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!isStarting && !isRunning) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-main)'; }}
              onMouseLeave={e => { if (!isStarting && !isRunning) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-light)'; }}
            >
              {isStarting || isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isRunning ? "Scanning..." : "Starting..."}
                </>
              ) : (
                <>
                  <Search size={18} />
                  Start Scan
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      {showProgress && (
        <div
          className={`border rounded-2xl p-5 transition-all duration-300 ${
            isCompleted
              ? "border-emerald-500/30 bg-emerald-950/20"
              : isFailed
                ? "border-rose-500/30 bg-rose-950/20"
                : isCancelled
                  ? "border-amber-500/30 bg-amber-950/20"
                  : "border-blue-500/30"
          }`}
          style={
            isCompleted || isFailed || isCancelled ? {} : cardStyle
          }
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {isCompleted ? <CheckCircle2 size={18} style={{ color: 'var(--success-alt)' }} /> :
               isFailed    ? <AlertTriangle size={18} style={{ color: 'var(--danger)' }} /> :
               isCancelled ? <X size={18} style={{ color: 'var(--warning)' }} /> :
               <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--brand-a30)', borderTopColor: 'var(--brand-light)' }} />}
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {isCompleted ? 'Scan Complete' : isFailed ? 'Scan Failed' : isCancelled ? 'Scan Cancelled' : 'Scanning in Progress'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isCancelled && (
                <button
                  onClick={() => updateScanState(IDLE_SCAN)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
                >
                  <X size={14} />
                  Dismiss
                </button>
              )}
              {/* Cancel button — only while actively scanning */}
              {isRunning &&
                scanState.activeScanId &&
                scanState.activeScanId !== -1 && (
                  <button
                    onClick={handleCancelScan}
                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-sm font-bold transition-colors"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                )}
              <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {percentage}%
              </span>
            </div>
          </div>

          <div className="relative w-full h-3 rounded-full overflow-hidden mb-5" style={{ background: 'var(--surface-1)' }}>
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                isCompleted
                  ? "bg-emerald-500"
                  : isFailed
                    ? "bg-rose-500"
                    : isCancelled
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-blue-600 to-indigo-400"
              }`}
              style={{ width: `${percentage}%` }}
            />
            {!isCompleted && !isFailed && !isCancelled && (
              <div
                className="absolute top-0 left-0 h-full w-full rounded-full opacity-30"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                  animation: "shimmer 1.5s infinite",
                  backgroundSize: "200% 100%",
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-1)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Files Scanned
              </p>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {scanState.filesScanned.toLocaleString()}
              </p>
              {scanState.totalFiles > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-disabled)' }}>
                  of {scanState.totalFiles.toLocaleString()}
                </p>
              )}
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-1)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Confirmed Leaks
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${scanState.totalThreats > 0 ? "text-rose-400" : "text-emerald-400"}`}
              >
                {scanState.totalThreats}
              </p>
              {scanState.filesWithThreats > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-disabled)' }}>
                  in {scanState.filesWithThreats} file
                  {scanState.filesWithThreats !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-1)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {isCompleted ? "Duration" : "ETA"}
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {isCompleted &&
                scanState.startTime &&
                completionTimeRef.current
                  ? formatDuration(
                      completionTimeRef.current - scanState.startTime,
                    )
                  : scanState.startTime && !isCancelled
                    ? formatETA(
                        scanState.filesScanned,
                        scanState.totalFiles,
                        scanState.startTime,
                      )
                    : "—"}
              </p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-1)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Status
              </p>
              <p
                className={`text-sm font-bold uppercase tracking-wide ${
                  isCompleted
                    ? "text-emerald-400"
                    : isFailed
                      ? "text-rose-400"
                      : isCancelled
                        ? "text-amber-400"
                        : "text-blue-400"
                }`}
              >
                {scanState.status}
              </p>
            </div>
          </div>

          {scanState.currentFile && !isCompleted && !isCancelled && (
            <div className="flex items-center gap-2 text-xs font-mono truncate px-1" style={{ color: 'var(--text-muted)' }}>
              <FileSearch
                size={12}
                className="flex-shrink-0"
                style={{ color: 'var(--text-disabled)' }}
              />
              <CopyableText
                text={scanState.currentFile}
                className="truncate"
                inline
                iconSize={11}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Scanner Preferences ──────────────────────────────────────────────── */}
      <div
        className="border rounded-2xl p-4 md:p-5"
        style={cardStyle}
      >
        <h3 className="mb-6" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Scanner Preferences
        </h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                Excluded Keywords
              </label>
              <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                Matches containing these keywords are skipped before
                ML analysis.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. ticket, train, invoice"
                  className="flex-1 rounded-xl px-4 py-2.5 focus:outline-none transition-colors text-sm"
                  style={{ background: 'var(--background-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                />
                <button
                  onClick={addKeywords}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{ background: 'var(--brand-light)', color: 'var(--text-on-brand)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-main)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-light)'}
                >
                  Add
                </button>
              </div>
              {excludedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {excludedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold"
                    >
                      {kw}
                      <button
                        onClick={() =>
                          setExcludedKeywords((p) =>
                            p.filter((k) => k !== kw),
                          )
                        }
                        className="hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                Whitelisted Paths
              </label>
              <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                These directories are completely skipped during
                scanning.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. C:\Users\Public"
                  className="flex-1 rounded-xl px-4 py-2.5 focus:outline-none transition-colors text-sm"
                  style={{ background: 'var(--background-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyDown={handlePathKeyDown}
                />
                <button
                  onClick={addPaths}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{ background: 'var(--brand-light)', color: 'var(--text-on-brand)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-main)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-light)'}
                >
                  Add
                </button>
              </div>
              {whitelistedPaths.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {whitelistedPaths.map((p) => (
                    <span
                      key={p}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold"
                    >
                      {p}
                      <button
                        onClick={() =>
                          setWhitelistedPaths((prev) =>
                            prev.filter((x) => x !== p),
                          )
                        }
                        className="hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        <button onClick={handleSavePreferences}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all mt-6"
          style={{ background: 'var(--brand-light)', color: 'var(--text-on-brand)', fontSize: '13px', fontWeight: 600 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-main)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-light)'; }}
        >
          Save Preferences
        </button>
      </div>

      {/* ── Recent Scan Results ──────────────────────────────────────────────── */}
      <div
        className="border rounded-2xl p-4 md:p-5"
        style={cardStyle}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Scan Results
          </h3>
          {scans.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
            >
              <Trash2 size={16} />
              Delete All Scans
            </button>
          )}
        </div>
        {scans.length === 0 ? (
          <div className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
            <FileSearch
              size={36}
              className="mx-auto mb-3 opacity-20"
            />
            <p className="font-bold">No scans yet</p>
            <p className="text-sm mt-1">
              Run a scan above to see results here.
            </p>
          </div>
        ) : (
          <Table<any>
            columns={[
              {
                header: "Scan ID",
                accessor: "scanid",
                render: (v) => (
                  <span className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'var(--surface-1)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
                    {v}
                  </span>
                ),
              },
              {
                header: "Type",
                accessor: "type",
                className: "w-[35%]",
                render: (v) => (
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {v}
                  </span>
                ),
              },
              {
                header: "Threats",
                accessor: "threats",
                render: (v) => (
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${v > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`}
                    />
                    <span
                      className={
                        v > 0
                          ? "text-rose-500 font-bold"
                          : ""
                      }
                      style={v > 0 ? {} : { color: 'var(--text-muted)' }}
                    >
                      {v}
                    </span>
                  </div>
                ),
              },
              {
                header: "Time",
                accessor: "time",
                className: "text-xs text-right",
              },
            ]}
            data={scans.map((s) => ({
              scanid: `SCN-${String(s.id).padStart(4, "0")}`,
              type: s.type,
              threats: s.threats,
              time: s.time,
            }))}
          />
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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
        onConfirm={() => {
          clearAllScans();
          setShowDeleteConfirm(false);
          setToast({
            message: "All scans deleted.",
            type: "success",
          });
        }}
      />
    </div>
  );
}
