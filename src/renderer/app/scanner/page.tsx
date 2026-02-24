"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { Search, Trash2, Shield, X } from "lucide-react";

import { useSecurity } from "@/context/SecurityContext";
import Table from "@/components/Table";
import Toast from "@/components/Toast";
import CustomSelect from "@/components/CustomSelect";
import ConfirmDialog from "@/components/ConfirmDialog";

const SENSITIVITY_CONFIDENCE: Record<string, number> = {
  Low: 95,
  Medium: 75,
  High: 50,
};

const SENSITIVITY_DESCRIPTION: Record<string, string> = {
  Low: "Base model · Highest accuracy, slower detection",
  Medium: "Small model · Balanced speed and accuracy",
  High: "Tiny model · Fastest detection, lower accuracy",
};

const SCAN_TYPE_OPTIONS = [
  { value: "quick", label: "Quick Scan (Fast)", description: "Scans common sensitive locations only" },
  { value: "full", label: "Full Scan (Slow)", description: "Deep scan across all accessible files" },
  { value: "custom", label: "Custom Path", description: "Scan a specific directory or path" },
];

const SENSITIVITY_OPTIONS = [
  { value: "Low", label: "Low", description: "Base model · Highest confidence" },
  { value: "Medium", label: "Medium", description: "Small model · Balanced" },
  { value: "High", label: "High", description: "Tiny model · Fastest, lower confidence" },
];

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
    const words = keywordInput
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0 && !excludedKeywords.includes(w));
    if (words.length > 0) {
      setExcludedKeywords((prev) => [...prev, ...words]);
      setKeywordInput("");
    }
  };

  const addPaths = () => {
    const paths = pathInput
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !whitelistedPaths.includes(p));
    if (paths.length > 0) {
      setWhitelistedPaths((prev) => [...prev, ...paths]);
      setPathInput("");
    }
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

  const handleStartScan = async () => {
    if (scanType === "custom" && !scanPath.trim()) {
      setToast({ message: "Please enter a path for Custom Scan.", type: "error" });
      return;
    }
    setIsScanning(true);
    try {
      await runScan(scanType, "All Files", scanPath || process.cwd());
      setToast({ message: "Scan started successfully!", type: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed to start scan", type: "error" });
    } finally {
      setIsScanning(false);
    }
  };

  const cardStyle = {
    background: "linear-gradient(135deg, #020617 0%, #000000 100%)",
    borderColor: "rgba(51, 65, 85, 0.3)",
  };

  return (
    <div className="space-y-6">
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
              <CustomSelect
                value={scanType}
                onChange={setScanType}
                options={SCAN_TYPE_OPTIONS}
              />
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

            <button
              onClick={handleStartScan}
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
              <CustomSelect
                value={sensitivity}
                onChange={setSensitivity}
                options={SENSITIVITY_OPTIONS}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-neutral-400">Confidence in Detection</label>
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
                <button onClick={addKeywords} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95">
                  Add
                </button>
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
                <button onClick={addPaths} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95">
                  Add
                </button>
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
            { header: "Date", accessor: "date", className: "text-neutral-500 text-xs text-right" },
          ]}
          data={scans.map((s, i) => ({ scanid: `SCN-${1000 + i}`, filename: s.type, threats: s.threats, date: s.time }))}
        />
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete All Scans?"
        message="This will permanently remove all scan records. This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        isDestructive={true}
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