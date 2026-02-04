'use client';

import { useState } from 'react';
import { Search, Trash2, Shield, Files, AlertCircle, CheckCircle } from 'lucide-react';

import { useSecurity } from '@/context/SecurityContext';
import Table from '@/components/Table';

export default function ScannerPage() {
    const { scans, runScan, clearAllScans, totalFilesScanned } = useSecurity();
    const [scanType, setScanType] = useState('Quick Scan (Fast)');
    const [scanPath, setScanPath] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [excludedKeywords, setExcludedKeywords] = useState('');
    const [whitelistedPaths, setWhitelistedPaths] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [confidence, setConfidence] = useState(85);
    const [sensitivity, setSensitivity] = useState('Medium');

    const handleSavePreferences = () => {
        setIsSaving(true);
        // Simulate save
        setTimeout(() => {
            setIsSaving(false);
            alert('Preferences saved successfully.');
        }, 1000);
    };

    const handleStartScan = () => {
        if (!scanPath.trim()) {
            alert('Please enter a valid scan path before starting the scan.');
            return;
        }

        setIsScanning(true);
        runScan(scanType, 'All Files', scanPath);

        // Mock UI loading state
        setTimeout(() => {
            setIsScanning(false);
        }, 1500);
    };


    return (
        <div className="space-y-6">
            <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 mb-8 tracking-tight">Content Scanner</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Scan Configuration Card */}
                <div className="lg:col-span-2 border rounded-2xl p-6 shadow-lg transition-all duration-300"
                    style={{
                        background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                        borderColor: 'rgba(51, 65, 85, 0.3)'
                    }}>
                    <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3 tracking-tight">
                        <Shield className="text-blue-500" size={28} />
                        Scan Configuration
                    </h2>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-400">Scan Type</label>
                                <select
                                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                                    value={scanType}
                                    onChange={(e) => setScanType(e.target.value)}
                                >
                                    <option>Quick Scan (Fast)</option>
                                    <option>Full Scan</option>
                                    <option>Custom Scan</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400">Scan Path (Optional)</label>
                            <input
                                type="text"
                                placeholder="/path/to/scan"
                                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-neutral-600"
                                value={scanPath}
                                onChange={(e) => setScanPath(e.target.value)}
                            />
                        </div>

                        <div className="flex pt-2">
                            <button
                                onClick={handleStartScan}
                                disabled={isScanning}
                                className={`w-full ${isScanning ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95`}
                            >
                                {isScanning ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Scanning...
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

                {/* Model Configuration Card */}
                <div className="border rounded-2xl p-6 shadow-lg transition-all duration-300 flex flex-col justify-center"
                    style={{
                        background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                        borderColor: 'rgba(51, 65, 85, 0.3)'
                    }}>
                    <h3 className="text-lg font-bold text-white mb-6">Model Configuration</h3>

                    <div className="space-y-6">
                        {/* Confidence Bar */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-neutral-400">Confidence in Detection</label>
                                <span className="text-indigo-400 font-mono font-bold text-sm tracking-tighter">{confidence}%</span>
                            </div>
                            <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500 rounded-full"
                                    style={{ width: `${confidence}%` }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={confidence}
                                    onChange={(e) => setConfidence(parseInt(e.target.value))}
                                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Sensitivity Dropdown */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400">Model Sensitivity</label>
                            <select
                                className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                                value={sensitivity}
                                onChange={(e) => setSensitivity(e.target.value)}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>
                </div>

            </div>

            {/* Scanner Preferences Card */}
            <div className="border rounded-2xl p-6 shadow-lg transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                    borderColor: 'rgba(51, 65, 85, 0.3)'
                }}>
                <h3 className="text-lg font-bold text-white mb-6">Scanner Preferences</h3>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400">Excluded Keywords</label>
                            <input
                                type="text"
                                placeholder="Enter keywords separated by commas"
                                className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-600"
                                value={excludedKeywords}
                                onChange={(e) => setExcludedKeywords(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400">Whitelisted Paths</label>
                            <input
                                type="text"
                                placeholder="Enter paths separated by commas"
                                className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-600"
                                value={whitelistedPaths}
                                onChange={(e) => setWhitelistedPaths(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-start">
                        <button
                            onClick={handleSavePreferences}
                            disabled={isSaving}
                            className={`px-8 py-2.5 rounded-lg font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 ${isSaving ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
                                } text-white`}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Preferences'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Scan Results */}
            <div className="border rounded-2xl p-6 shadow-lg transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                    borderColor: 'rgba(51, 65, 85, 0.3)'
                }}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Recent Scan Results</h3>
                    {scans.length > 0 && (
                        <button
                            onClick={clearAllScans}
                            className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
                        >
                            <Trash2 size={16} />
                            Delete All Scans
                        </button>
                    )}
                </div>

                <Table<any>
                    columns={[
                        {
                            header: 'Scan ID',
                            accessor: 'scanid',
                            render: (value) => (
                                <span className="font-mono text-xs px-2 py-1 bg-white/5 rounded text-neutral-400 border border-white/5">
                                    {value}
                                </span>
                            )
                        },
                        {
                            header: 'Filename',
                            accessor: 'filename',
                            className: 'w-[40%]',
                            render: (value) => (
                                <span className="font-semibold text-neutral-100">{value}</span>
                            )
                        },
                        {
                            header: 'Threats',
                            accessor: 'threats',
                            render: (value) => (
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${value > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                    <span className={`${value > 0 ? 'text-rose-500 font-bold' : 'text-neutral-500'}`}>
                                        {value}
                                    </span>
                                </div>
                            )
                        },
                        {
                            header: 'Date',
                            accessor: 'date',
                            className: 'text-neutral-500 text-xs text-right'
                        },
                    ]}
                    data={scans.map((s, i) => ({
                        scanid: `SCN-${1000 + i}`,
                        filename: s.type,
                        threats: s.threats,
                        date: s.time
                    }))}
                />
            </div>
        </div>
    );
}
