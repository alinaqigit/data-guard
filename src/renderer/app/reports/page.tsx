'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, BarChart3, FileJson, FileSpreadsheet, Trash2 } from 'lucide-react';
import Toast from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import ConfirmDialog from '@/components/ConfirmDialog';
import { reportsService, ReportRecord } from '@/lib/api/reports.service';

const REPORT_TYPE_OPTIONS = [
  { value: 'quick', label: 'Quick Report',  description: 'Summary stats only – fast to generate' },
  { value: 'full',  label: 'Full Report',   description: 'Scans, alerts, policies – detailed breakdown' },
  { value: 'deep',  label: 'Deep Report',   description: 'Full audit trail + recommendations' },
];
const DATE_RANGE_OPTIONS = [
  { value: 'today',  label: "Today's Report",  description: 'Data from the current day only' },
  { value: 'weekly', label: 'Weekly Report',   description: 'Last 7 days of activity' },
  { value: 'all',    label: 'Up till Today',   description: 'All historical data up to now' },
];
const FORMAT_OPTIONS = [
  { id: 'pdf',  label: 'PDF',  color: { active: '#F85149', bg: 'rgba(248,81,73,0.1)',   border: 'rgba(248,81,73,0.3)'   }, icon: FileText },
  { id: 'xlsx', label: 'XLSX', color: { active: '#22C35D', bg: 'rgba(34,195,93,0.1)',   border: 'rgba(34,195,93,0.3)'   }, icon: FileSpreadsheet },
  { id: 'json', label: 'JSON', color: { active: '#F8C149', bg: 'rgba(248,193,73,0.1)',  border: 'rgba(248,193,73,0.3)'  }, icon: FileJson },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('quick');
  const [dateRange, setDateRange]   = useState('today');
  const [format, setFormat]         = useState('pdf');
  const [reportName, setReportName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reports, setReports]       = useState<ReportRecord[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [downloadingId, setDownloadingId]   = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<ReportRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadReports = async () => {
    try { setReports(await reportsService.getReports()); }
    catch {}
    finally { setLoadingReports(false); }
  };

  useEffect(() => { loadReports(); }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { reportId } = await reportsService.generateReport({ reportType: reportType as any, format: format as any, dateRange: dateRange as any, reportName: reportName.trim() || undefined });
      const name = reportName.trim() || `${REPORT_TYPE_OPTIONS.find(o => o.value === reportType)?.label}_${new Date().toISOString().split('T')[0]}`;
      await reportsService.downloadReport(reportId, `${name}.${format}`, format);
      setToast({ message: 'Report generated and downloaded.', type: 'success' });
      await loadReports();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to generate report.', type: 'error' });
    } finally { setIsGenerating(false); }
  };

  const handleDownload = async (report: ReportRecord) => {
    setDownloadingId(report.id);
    try { await reportsService.downloadReport(report.id, `${report.name}.${report.format}`, report.format); }
    catch { setToast({ message: 'Download failed.', type: 'error' }); }
    finally { setDownloadingId(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await reportsService.deleteReport(deleteTarget.id);
      setReports(prev => prev.filter(r => r.id !== deleteTarget.id));
      setToast({ message: 'Report deleted.', type: 'success' });
    } catch { setToast({ message: 'Failed to delete report.', type: 'error' }); }
    finally { setDeleteTarget(null); }
  };

  const formatIconEl = (fmt: string) => {
    if (fmt === 'json')  return <FileJson size={18} style={{ color: '#F8C149' }} />;
    if (fmt === 'xlsx')  return <FileSpreadsheet size={18} style={{ color: '#22C35D' }} />;
    return <FileText size={18} style={{ color: '#F85149' }} />;
  };

  const cardStyle = { background: '#12161B', border: '1px solid #30363D', borderRadius: '16px' };
  const thStyle = { padding: '12px 20px', fontSize: '11px', fontWeight: 600 as const, color: '#535865', textTransform: 'uppercase' as const, letterSpacing: '0.08em' };
  const inputStyle = { background: '#0D1117', border: '1px solid #30363D', borderRadius: '10px', padding: '10px 14px', color: '#FFFFFF', fontSize: '14px', outline: 'none', width: '100%' };

  return (
    <div className="space-y-6 pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Generator */}
      <div style={cardStyle} className="overflow-hidden">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #30363D' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>Reports & Analytics</h1>
        </div>
        <div style={{ padding: '24px' }} className="space-y-6">
          <div className="flex items-center gap-2" style={{ color: '#5272C5', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <BarChart3 size={16} /> Report Generator
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ ...thStyle, display: 'block', marginBottom: '8px', padding: 0 }}>Report Type</label>
                  <CustomSelect value={reportType} onChange={setReportType} options={REPORT_TYPE_OPTIONS} />
                </div>
                <div>
                  <label style={{ ...thStyle, display: 'block', marginBottom: '8px', padding: 0 }}>Date Range</label>
                  <CustomSelect value={dateRange} onChange={setDateRange} options={DATE_RANGE_OPTIONS} />
                </div>
              </div>
              <div>
                <label style={{ ...thStyle, display: 'block', marginBottom: '8px', padding: 0 }}>Output Format</label>
                <div className="flex gap-2">
                  {FORMAT_OPTIONS.map((fmt) => {
                    const active = format === fmt.id;
                    const Icon = fmt.icon;
                    return (
                      <button key={fmt.id} onClick={() => setFormat(fmt.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                        style={{
                          fontSize: '13px', fontWeight: 600,
                          color: active ? fmt.color.active : '#989898',
                          background: active ? fmt.color.bg : 'transparent',
                          border: `1px solid ${active ? fmt.color.border : '#30363D'}`,
                        }}
                      ><Icon size={14} />{fmt.label}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>
              <label style={{ ...thStyle, display: 'block', marginBottom: '8px', padding: 0 }}>
                Report Name <span style={{ textTransform: 'none', fontWeight: 400, color: '#30363D' }}>(optional)</span>
              </label>
              <input type="text" value={reportName} onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g. Q1 Security Audit" style={inputStyle} />
              <p style={{ fontSize: '12px', color: '#535865', marginTop: '6px' }}>Leave blank to auto-name</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleGenerate} disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all"
              style={{ background: isGenerating ? '#3B5189' : '#5272C5', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, opacity: isGenerating ? 0.7 : 1 }}
              onMouseEnter={e => { if (!isGenerating) (e.currentTarget as HTMLButtonElement).style.background = '#445C9A'; }}
              onMouseLeave={e => { if (!isGenerating) (e.currentTarget as HTMLButtonElement).style.background = '#5272C5'; }}
            >
              {isGenerating
                ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} /> Generating...</>
                : <><Download size={16} /> Generate & Download</>}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div style={cardStyle} className="overflow-hidden">
        <div className="flex items-center justify-between" style={{ padding: '16px 24px', borderBottom: '1px solid #30363D' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>Generated Reports</span>
          {reports.length > 0 && <span style={{ fontSize: '13px', color: '#535865' }}>{reports.length} total</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead style={{ background: '#161B22', borderBottom: '1px solid #30363D' }}>
              <tr>
                {['Report Name','Type','Format','Generated','Size','Actions'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingReports ? (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#535865', fontSize: '14px' }}>Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '60px', textAlign: 'center' }}>
                  <FileText size={32} style={{ color: '#30363D', margin: '0 auto 12px' }} />
                  <p style={{ color: '#535865', fontWeight: 500 }}>No reports yet</p>
                  <p style={{ color: '#30363D', fontSize: '13px', marginTop: '4px' }}>Generate a report above to see it here.</p>
                </td></tr>
              ) : reports.map((report, i) => (
                <tr key={report.id}
                    style={{ borderTop: i > 0 ? '1px solid #1A1F28' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161B22')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ padding: '8px', background: '#161B22', borderRadius: '8px' }}>{formatIconEl(report.format)}</div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#FFFFFF' }}>{report.name}</p>
                        <p style={{ fontSize: '12px', color: '#535865', marginTop: '2px' }}>{report.dateRange}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#989898', textTransform: 'capitalize' }}>{report.reportType}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                      padding: '2px 10px', borderRadius: '6px',
                      ...(report.format === 'json' ? { color: '#F8C149', background: 'rgba(248,193,73,0.1)', border: '1px solid rgba(248,193,73,0.2)' }
                        : report.format === 'xlsx' ? { color: '#22C35D', background: 'rgba(34,195,93,0.1)', border: '1px solid rgba(34,195,93,0.2)' }
                        : { color: '#F85149', background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.2)' }),
                    }}>{report.format}</span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', color: '#535865' }}>
                    {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', color: '#535865' }}>
                    {report.status === 'completed' ? formatBytes(report.fileSizeBytes) : report.status}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div className="flex justify-end items-center gap-1">
                      {report.status === 'completed' && (
                        <button onClick={() => handleDownload(report)} disabled={downloadingId === report.id}
                          className="p-1.5 rounded-lg transition-all disabled:opacity-50"
                          style={{ color: '#535865' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#5272C5'; e.currentTarget.style.background = 'rgba(82,114,197,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#535865'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          {downloadingId === report.id
                            ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                            : <Download size={15} />}
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(report)}
                        className="p-1.5 rounded-lg transition-all" style={{ color: '#535865' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#F85149'; e.currentTarget.style.background = 'rgba(248,81,73,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#535865'; e.currentTarget.style.background = 'transparent'; }}
                      ><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog isOpen={deleteTarget !== null} title="Delete Report?"
        message={`"${deleteTarget?.name}" will be permanently deleted.`}
        confirmText="Delete" isDestructive onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </div>
  );
}