'use client';

import { useState } from 'react';
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
    Type as Typography
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

    const formats = [
        { id: 'PDF', label: 'PDF Document', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
        { id: 'CSV', label: 'CSV Spreadsheet', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
        { id: 'JSON', label: 'JSON Data', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
        { id: 'TXT', label: 'TXT Text', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* 1. Quick Report Generator */}
            <div className="border rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
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
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase">Report Type</label>
                                    <select
                                        value={reportType}
                                        onChange={(e) => setReportType(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        <option>Monthly Compliance Report</option>
                                        <option>Security Audit</option>
                                        <option>Threat Intelligence</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase">Date Range</label>
                                    <select
                                        value={dateRange}
                                        onChange={(e) => setDateRange(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        <option>Today</option>
                                        <option>Last 7 Days</option>
                                        <option>Last 30 Days</option>
                                        <option>Custom Range</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-neutral-500 uppercase">Output Format</label>
                                <div className="flex flex-wrap gap-3">
                                    {formats.map((fmt) => (
                                        <button
                                            key={fmt.id}
                                            onClick={() => setFormat(fmt.id)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-bold ${format === fmt.id
                                                ? `${fmt.color} border-current ring-1 ring-current`
                                                : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/20'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${format === fmt.id ? 'bg-current' : 'bg-neutral-800'}`} />
                                            {fmt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Report Name Field */}
                        <div className="space-y-2 flex flex-col">
                            <label className="text-xs font-bold text-neutral-500 uppercase px-1">Report Name</label>
                            <input
                                type="text"
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                                placeholder="Enter report name..."
                                className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center gap-3 pt-4">
                        <button className="px-6 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold rounded-xl transition-all active:scale-95 border border-white/5">
                            Preview Report
                        </button>
                        <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2">
                            <Download size={18} />
                            Generate & Download Report
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
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                                                <FileJson size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-sm">{report.name}</span>
                                                <span className="text-neutral-500 text-[10px] lowercase">{report.date}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-neutral-400 text-sm whitespace-nowrap">{report.type}</span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-full border border-amber-500/20">
                                            {report.format}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center text-neutral-500 text-sm">
                                        {report.generated}
                                    </td>
                                    <td className="py-4 px-6 text-center text-neutral-500 text-sm">
                                        {report.size}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all" title="Share Report">
                                                <Share2 size={18} />
                                            </button>
                                            <button className="p-2 text-neutral-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all" title="Download">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-white/5 flex justify-center">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-black/40 border border-white/10 text-neutral-500 hover:text-white transition-all rounded-xl font-medium text-sm group">
                        <FileArchive size={16} className="group-hover:scale-110 transition-transform" />
                        View Report Archive
                    </button>
                </div>
            </div>
        </div>
    );
}
