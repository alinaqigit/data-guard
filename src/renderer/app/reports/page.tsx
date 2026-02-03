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
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-neutral-800 bg-neutral-900/50">
                    <h1 className="text-2xl font-bold text-white mb-1">Reports & Analytics</h1>
                    <p className="text-neutral-500 text-sm">Design and distribute comprehensive security assessments.</p>
                </div>

                <div className="p-8 space-y-8">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-2">
                        <BarChart3 size={18} />
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
                                        className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
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
                                        className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
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
                                                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${format === fmt.id ? 'bg-current' : 'bg-neutral-800'}`} />
                                            {fmt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Checkboxes */}
                        <div className="space-y-6 bg-neutral-950/50 p-6 rounded-2xl border border-neutral-800">
                            <label className="text-xs font-bold text-neutral-500 uppercase">Include Sections</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { id: 'summary', label: 'Executive Summary' },
                                    { id: 'scans', label: 'Scan Results' },
                                    { id: 'threats', label: 'Threat Analysis' },
                                    { id: 'recommendations', label: 'Recommendations' }
                                ].map((sec) => (
                                    <label key={sec.id} className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={sections[sec.id as keyof typeof sections]}
                                            onChange={() => setSections({ ...sections, [sec.id]: !sections[sec.id as keyof typeof sections] })}
                                            className="w-5 h-5 rounded border-neutral-800 bg-neutral-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-neutral-950"
                                        />
                                        <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">{sec.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold rounded-xl transition-all active:scale-95 border border-neutral-700">
                            Preview Report
                        </button>
                        <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2">
                            <Download size={18} />
                            Generate & Download Report
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Quick Report Templates */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white px-2">Quick Report Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: 'Daily Summary', subtitle: 'Overview of today\'s security activities', icon: Clock, color: 'text-blue-400' },
                        { title: 'Security Audit', subtitle: 'Comprehensive security assessment', icon: Lock, color: 'text-indigo-400' },
                        { title: 'Threat Analysis', subtitle: 'Detailed threat detection report', icon: AlertTriangle, color: 'text-rose-400' }
                    ].map((tpl, i) => (
                        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-4 hover:border-indigo-500/50 hover:shadow-indigo-500/5 shadow-lg transition-all group cursor-pointer">
                            <div className={`mx-auto p-4 rounded-2xl bg-neutral-950 w-fit ${tpl.color} group-hover:scale-110 transition-transform`}>
                                <tpl.icon size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{tpl.title}</h3>
                                <p className="text-neutral-500 text-sm mt-1">{tpl.subtitle}</p>
                            </div>
                            <div className="flex justify-center gap-2 pt-2">
                                <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full border border-red-500/20">PDF</span>
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full border border-emerald-500/20">CSV</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Recently Generated Reports */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden mt-8">
                <div className="p-6 border-b border-neutral-800">
                    <h2 className="text-xl font-bold text-white">Recently Generated Reports</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-950/50 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                                <th className="py-4 px-6 font-semibold">Report Name</th>
                                <th className="py-4 px-6 font-semibold">Type</th>
                                <th className="py-4 px-6 font-semibold text-center">Format</th>
                                <th className="py-4 px-6 font-semibold text-center">Generated</th>
                                <th className="py-4 px-6 font-semibold text-center">Size</th>
                                <th className="py-4 px-6 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {[
                                { name: 'Threat Analysis', date: 'Jan 24, 2026', type: 'Full Security Audit', format: 'JSON', generated: '20 mins ago', size: '2.4 MB' }
                            ].map((report, i) => (
                                <tr key={i} className="group hover:bg-neutral-800/40 transition-colors">
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

                <div className="p-6 border-t border-neutral-800 flex justify-center">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-neutral-950 border border-neutral-800 text-neutral-500 hover:text-white transition-all rounded-xl font-medium text-sm group">
                        <FileArchive size={16} className="group-hover:scale-110 transition-transform" />
                        View Report Archive
                    </button>
                </div>
            </div>
        </div>
    );
}
