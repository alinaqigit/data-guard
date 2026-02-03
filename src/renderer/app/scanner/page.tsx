'use client';

import { useState } from 'react';
import { Search, Trash2, Shield, Files, AlertCircle, CheckCircle } from 'lucide-react';

import { useSecurity } from '@/context/SecurityContext';

export default function ScannerPage() {
    const { scans, runScan, clearAllScans, totalFilesScanned } = useSecurity();
    const [scanType, setScanType] = useState('Quick Scan (Fast)');
    const [target, setTarget] = useState('All Files');
    const [scanPath, setScanPath] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    const handleStartScan = () => {
        if (!scanPath.trim()) {
            alert('Please enter a valid scan path before starting the scan.');
            return;
        }

        setIsScanning(true);
        runScan(scanType, target, scanPath);

        // Mock UI loading state
        setTimeout(() => {
            setIsScanning(false);
        }, 1500);
    };

    const handleTestScan = () => {
        setIsScanning(true);
        runScan('Test Scan', 'All Files', '/test/path');

        setTimeout(() => {
            setIsScanning(false);
        }, 1000);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white mb-6">Content Scanner</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Scan Configuration Card */}
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Shield className="text-blue-500" size={24} />
                        Scan Configuration
                    </h2>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-400">Target</label>
                                <select
                                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                                    value={target}
                                    onChange={(e) => setTarget(e.target.value)}
                                >
                                    <option>All Files</option>
                                    <option>Documents Only</option>
                                    <option>Media Files</option>
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

                        <div className="flex gap-4 pt-2">
                            <button
                                onClick={handleStartScan}
                                disabled={isScanning}
                                className={`flex-1 ${isScanning ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95`}
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
                            <button
                                onClick={handleTestScan}
                                disabled={isScanning}
                                className="px-6 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg font-medium transition-colors border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Test Scan
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scan Statistics Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 mb-2">
                        <Files size={32} />
                    </div>
                    <div>
                        <span className="text-5xl font-bold text-white block mb-2">{totalFilesScanned.toLocaleString()}</span>
                        <span className="text-neutral-400 font-medium">Total Files Scanned</span>
                    </div>
                </div>

            </div>

            {/* Recent Scan Results */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
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

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-neutral-800 text-neutral-400 text-sm uppercase tracking-wider">
                                <th className="py-3 px-4 font-medium">Time</th>
                                <th className="py-3 px-4 font-medium">Scan Type</th>
                                <th className="py-3 px-4 font-medium">Files</th>
                                <th className="py-3 px-4 font-medium">Threats</th>
                                <th className="py-3 px-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {scans.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                                        No recent scans found.
                                    </td>
                                </tr>
                            ) : (
                                scans.map((scan) => (
                                    <tr key={scan.id} className="group hover:bg-neutral-800/50 transition-colors">
                                        <td className="py-4 px-4 text-white text-sm">{scan.time}</td>
                                        <td className="py-4 px-4 text-neutral-300 text-sm">{scan.type}</td>
                                        <td className="py-4 px-4 text-neutral-300 text-sm">{scan.files}</td>
                                        <td className="py-4 px-4">
                                            {scan.threats > 0 ? (
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                                                    {scan.threats}
                                                </span>
                                            ) : (
                                                <span className="text-neutral-500 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
                                                <CheckCircle size={12} />
                                                {scan.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
