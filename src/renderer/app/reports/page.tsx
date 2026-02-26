'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, BarChart3, FileJson, FileSpreadsheet, Trash2 } from 'lucide-react';
import Toast from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import ConfirmDialog from '@/components/ConfirmDialog';
import { reportsService, ReportRecord } from '@/lib/api/reports.service';

const REPORT_TYPE_OPTIONS = [
  { value: 'quick', label: 'Quick Report', description: 'Summary stats only — fast to generate' },
  { value: 'full', label: 'Full Report', description: 'Scans, alerts, policies — detailed breakdown' },
  { value: 'deep', label: 'Deep Report', description: 'Full audit trail + recommendations' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: "Today's Report", description: 'Data from the current day only' },
  { value: 'weekly', label: 'Weekly Report', description: 'Last 7 days of activity' },
  { value: 'all', label: 'Up till Today', description: 'All historical data up to now' },
];

const FORMAT_OPTIONS = [
  { id: 'pdf', label: 'PDF', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: FileText },
  { id: 'xlsx', label: 'XLSX', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: FileSpreadsheet },
  { id: 'json', label: 'JSON', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: FileJson },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatIcon(fmt: string) {
  if (fmt === 'json') return <FileJson size={20} className="text-amber-500" />;
  if (fmt === 'xlsx') return <FileSpreadsheet size={20} className="text-emerald-500" />;
  return <FileText size={20} className="text-red-400" />;
}

function formatBadgeColor(fmt: string) {
  if (fmt === 'json') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  if (fmt === 'xlsx') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
}

const cardStyle = {
  background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
  borderColor: 'rgba(51, 65, 85, 0.3)',
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState('quick');
  const [dateRange, setDateRange] = useState('today');
  const [format, setFormat] = useState('pdf');
  const [reportName, setReportName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadReports = async () => {
    try {
      const data = await reportsService.getReports();
      setReports(data);
    } catch {
      // Silently fail — reports history is non-critical
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { reportId } = await reportsService.generateReport({
        reportType: reportType as any,
        format: format as any,
        dateRange: dateRange as any,
        reportName: reportName.trim() || undefined,
      });

      // Immediately trigger download
      const name = reportName.trim() ||
        `${REPORT_TYPE_OPTIONS.find(o => o.value === reportType)?.label}_${new Date().toISOString().split('T')[0]}`;
      const ext = format;
      await reportsService.downloadReport(reportId, `${name}.${ext}`, format);

      setToast({ message: `Report generated and downloaded successfully.`, type: 'success' });
      await loadReports(); // Refresh history
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to generate report.',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (report: ReportRecord) => {
    setDownloadingId(report.id);
    try {
      const ext = report.format;
      await reportsService.downloadReport(report.id, `${report.name}.${ext}`, report.format);
    } catch {
      setToast({ message: 'Download failed. File may no longer be available.', type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await reportsService.deleteReport(deleteTarget.id);
      setReports(prev => prev.filter(r => r.id !== deleteTarget.id));
      setToast({ message: 'Report deleted.', type: 'success' });
    } catch {
      setToast({ message: 'Failed to delete report.', type: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Report Generator */}
      <div className="border rounded-2xl shadow-xl overflow-hidden" style={cardStyle}>
        <div className="p-4 md:p-6 border-b border-white/5">
          <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
            Reports & Analytics
          </h1>
        </div>

        <div className="p-4 md:p-6 space-y-8">
          <div className="flex items-center gap-2 text-indigo-400 font-black text-sm uppercase tracking-[0.15em]">
            <BarChart3 size={18} />
            Report Generator
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-neutral-500 uppercase tracking-widest">Report Type</label>
                  <CustomSelect value={reportType} onChange={setReportType} options={REPORT_TYPE_OPTIONS} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-neutral-500 uppercase tracking-widest">Date Range</label>
                  <CustomSelect value={dateRange} onChange={setDateRange} options={DATE_RANGE_OPTIONS} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-neutral-500 uppercase tracking-widest">Output Format</label>
                <div className="flex gap-3">
                  {FORMAT_OPTIONS.map((fmt) => {
                    const Icon = fmt.icon;
                    return (
                      <button
                        key={fmt.id}
                        onClick={() => setFormat(fmt.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all font-black text-sm tracking-wide ${
                          format === fmt.id
                            ? `${fmt.color} border-current ring-1 ring-current`
                            : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/20'
                        }`}
                      >
                        <Icon size={16} />
                        {fmt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-neutral-500 uppercase tracking-widest">
                Report Name <span className="normal-case font-medium text-neutral-600">(optional)</span>
              </label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g. Q1 Security Audit"
                className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors font-bold placeholder:text-neutral-700"
              />
              <p className="text-xs text-neutral-600">Leave blank to auto-name from type and date</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-base rounded-xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />Generating...</>
              ) : (
                <><Download size={20} />Generate & Download</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report History */}
      <div className="border rounded-2xl shadow-xl overflow-hidden" style={cardStyle}>
        <div className="p-4 md:p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Generated Reports</h2>
          {reports.length > 0 && (
            <span className="text-sm font-bold text-neutral-500">{reports.length} total</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/5 text-neutral-400 text-xs uppercase tracking-wider">
                <th className="py-4 px-5 font-semibold">Report Name</th>
                <th className="py-4 px-5 font-semibold">Type</th>
                <th className="py-4 px-5 font-semibold text-center">Format</th>
                <th className="py-4 px-5 font-semibold text-center">Generated</th>
                <th className="py-4 px-5 font-semibold text-center">Size</th>
                <th className="py-4 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingReports ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500 font-bold">Loading...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-5 bg-white/5 rounded-full text-neutral-600"><FileText size={40} /></div>
                      <p className="text-neutral-500 font-black text-lg">No reports yet</p>
                      <p className="text-neutral-600 text-sm">Generate a report above to see it here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg">{formatIcon(report.format)}</div>
                        <div>
                          <p className="text-white font-black tracking-tight text-sm">{report.name}</p>
                          <p className="text-neutral-600 text-xs mt-0.5">{report.dateRange}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-neutral-400 text-sm font-bold capitalize">{report.reportType}</span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg border ${formatBadgeColor(report.format)}`}>
                        {report.format}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center text-neutral-500 text-sm font-bold">
                      {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-5 text-center text-neutral-500 text-sm font-bold">
                      {report.status === 'completed' ? formatBytes(report.fileSizeBytes) : report.status}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex justify-end items-center gap-1">
                        {report.status === 'completed' && (
                          <button
                            onClick={() => handleDownload(report)}
                            disabled={downloadingId === report.id}
                            className="p-2 text-neutral-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all disabled:opacity-50"
                            title="Download"
                          >
                            {downloadingId === report.id
                              ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              : <Download size={17} />}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(report)}
                          className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Report?"
        message={`"${deleteTarget?.name}" will be permanently deleted and cannot be recovered.`}
        confirmText="Delete"
        isDestructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}