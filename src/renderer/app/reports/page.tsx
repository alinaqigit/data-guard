'use client';

import { useState } from 'react';
import Toast from '@/components/Toast';
import {
    FileText,
    Download,
    Share2,
    Eye,
    Lock,
    AlertTriangle,
    Clock,
    BarChart3,
    FileJson,
    FileSpreadsheet,
    FileArchive,
    Type as Typography,
    X
} from 'lucide-react';

export default function ReportsPage() {
    const [reportType, setReportType] = useState('Monthly Compliance Report');
    const [dateRange, setDateRange] = useState('Today');
    const [format, setFormat] = useState('PDF');
    const [reportName, setReportName] = useState('');
    const [sections, setSections] = useState({
        summary: true,
        scans: true,
        threats: true,
        recommendations: false
    });

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = () => {
        setIsDownloading(true);
        // Simulate download delay
        setTimeout(() => {
            setIsDownloading(false);
            setToast({ message: 'Report generated and downloaded successfully.', type: 'success' });
        }, 1500);
    };

    const togglePreview = () => setIsPreviewOpen(!isPreviewOpen);

    const formats = [
        { id: 'PDF', label: 'PDF Document', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
        { id: 'CSV', label: 'CSV Spreadsheet', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
        { id: 'JSON', label: 'JSON Data', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
        { id: 'TXT', label: 'TXT Text', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    ];

    return (
        <div className="space-y-8 pb-10">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Preview Modal */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-black/90 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
                        style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
                            boxShadow: '0 0 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Report Preview</h3>
                                    <p className="text-neutral-400 text-xs font-mono mt-0.5">
                                        {reportName || 'Untitled_Report'}.{format.toLowerCase()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={togglePreview}
                                className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 font-mono text-sm text-neutral-300 space-y-4 bg-black/30">
                            <div className="border border-white/5 p-8 bg-white/5 rounded-xl min-h-full">
                                <div className="text-center mb-8 border-b border-white/10 pb-8">
                                    <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-2">confidential</h1>
                                    <h2 className="text-xl font-bold text-indigo-400">{reportType.toUpperCase()}</h2>
                                    <p className="text-neutral-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-white font-bold uppercase tracking-wider border-b border-white/10 pb-2 mb-4">Executive Summary</h3>
                                        <p>This report covers security metrics for the period: <span className="text-emerald-400">{dateRange}</span>.</p>
                                        <p>Overall system status: <span className="text-emerald-500 font-bold">SECURE</span></p>
                                        <p>Total Scans Performed: 1,245</p>
                                        <p>Threats Mitigated: 0</p>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-white font-bold uppercase tracking-wider border-b border-white/10 pb-2 mb-4 pt-4">Compliance Status</h3>
                                        <p>GDPR Compliance: <span className="text-emerald-400">PASSED</span></p>
                                        <p>HIPAA Compliance: <span className="text-emerald-400">PASSED</span></p>
                                        <p>Internal Policy Audit: 100% Score</p>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-white font-bold uppercase tracking-wider border-b border-white/10 pb-2 mb-4 pt-4">Detailed Metrics</h3>
                                        <p className="text-neutral-500">[Full detailed metrics would appear here in the final generated document...]</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={togglePreview}
                                className="px-5 py-2.5 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                            >
                                Close Preview
                            </button>
                            <button
                                onClick={() => {
                                    togglePreview();
                                    handleDownload();
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 text-sm"
                            >
                                <Download size={16} />
                                Download Full Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Quick Report Generator */}
            <div className="border rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, #020617 0%, #020617 100%)', // Adjusted slightly to match
                    borderColor: 'rgba(51, 65, 85, 0.3)'
                }}>
                <div className="p-8 border-b border-white/5">
                    <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
                        Reports & Analytics
                    </h1>
                </div>

                <div className="p-8 space-y-8">
                    <div className="flex items-center gap-2 text-indigo-400 font-black text-base uppercase tracking-[0.15em] mb-4">
                        <BarChart3 size={20} />
                        Quick Report Generator
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Left Controls */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-neutral-500 uppercase tracking-widest pl-1">Report Type</label>
                                    <select
                                        value={reportType}
                                        onChange={(e) => setReportType(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors font-bold text-lg"
                                    >
                                        <option>Monthly Compliance Report</option>
                                        <option>Security Audit</option>
                                        <option>Threat Intelligence</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-neutral-500 uppercase tracking-widest pl-1">Date Range</label>
                                    <select
                                        value={dateRange}
                                        onChange={(e) => setDateRange(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors font-bold text-lg"
                                    >
                                        <option>Today</option>
                                        <option>Last 7 Days</option>
                                        <option>Last 30 Days</option>
                                        <option>Custom Range</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-black text-neutral-500 uppercase tracking-widest pl-1">Output Format</label>
                                <div className="flex flex-wrap gap-4">
                                    {formats.map((fmt) => (
                                        <button
                                            key={fmt.id}
                                            onClick={() => setFormat(fmt.id)}
                                            className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border transition-all text-base font-black tracking-wide ${format === fmt.id
                                                ? `${fmt.color} border-current ring-1 ring-current`
                                                : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/20'
                                                }`}
                                        >
                                            <div className={`w-2.5 h-2.5 rounded-full ${format === fmt.id ? 'bg-current' : 'bg-neutral-800'}`} />
                                            {fmt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Report Name Field */}
                        <div className="space-y-3 flex flex-col">
                            <label className="text-sm font-black text-neutral-500 uppercase tracking-widest pl-1">Report Name</label>
                            <input
                                type="text"
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                                placeholder="Enter report name..."
                                className="w-full bg-black/40 border border-white/10 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors font-bold text-lg placeholder:text-neutral-700"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-6">
                        <button
                            onClick={togglePreview}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-black text-lg rounded-2xl transition-all active:scale-95 border border-white/5 tracking-wide"
                        >
                            Preview Report
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
                        >
                            {isDownloading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Download size={22} />
                                    Generate & Download Report
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>


            {/* 2. Recently Generated Reports */}
            <div className="border rounded-2xl shadow-xl overflow-hidden mt-8 transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                    borderColor: 'rgba(51, 65, 85, 0.3)'
                }}>
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white">Recently Generated Reports</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5 text-neutral-400 text-xs uppercase tracking-wider">
                                <th className="py-4 px-6 font-semibold">Report Name</th>
                                <th className="py-4 px-6 font-semibold">Type</th>
                                <th className="py-4 px-6 font-semibold text-center">Format</th>
                                <th className="py-4 px-6 font-semibold text-center">Generated</th>
                                <th className="py-4 px-6 font-semibold text-center">Size</th>
                                <th className="py-4 px-6 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {[
                                { name: 'Threat Analysis', date: 'Jan 24, 2026', type: 'Full Security Audit', format: 'JSON', generated: '20 mins ago', size: '2.4 MB' }
                            ].map((report, i) => (
                                <tr key={i} className="group hover:bg-white/5 transition-colors">
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                                                <FileJson size={24} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-white font-black text-lg tracking-tight">{report.name}</span>
                                                <span className="text-neutral-500 text-sm font-bold lowercase">{report.date}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="text-neutral-400 text-base font-bold whitespace-nowrap">{report.type}</span>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <span className="px-4 py-1.5 bg-amber-500/10 text-amber-500 text-xs font-black uppercase tracking-wider rounded-lg border border-amber-500/20">
                                            {report.format}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-center text-neutral-500 text-base font-bold">
                                        {report.generated}
                                    </td>
                                    <td className="py-5 px-6 text-center text-neutral-500 text-base font-bold">
                                        {report.size}
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={handleDownload}
                                                className="p-3 text-neutral-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all" title="Download">
                                                <Download size={22} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
