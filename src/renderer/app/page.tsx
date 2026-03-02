"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Users, ShieldAlert, FileSearch, ScrollText } from "lucide-react";
import StatCard from "@/components/StatCard";
import Table from "@/components/Table";
import { useSecurity } from "@/context/SecurityContext";
import { reportsService } from "@/lib/api/reports.service";

export default function Home() {
  const router = useRouter();
  const { scans, alerts, totalFilesScanned, isAuthenticated, policies } = useSecurity();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState<"pdf" | "xlsx" | "json">("pdf");

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  const activePoliciesCount = policies.filter((p) => p.status === "Active").length;
  const newAlertsCount = alerts.filter((a) => a.status === "New").length;

  const stats = [
    {
      title: "Total Scans",
      value: scans.length.toLocaleString(),
      change: scans.length > 0 ? `${scans.length} scan${scans.length !== 1 ? 's' : ''} recorded` : "No scans yet",
      trend: scans.length > 0 ? "up" : "neutral",
      icon: FileSearch,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Total Threats",
      value: alerts.length.toString(),
      change: newAlertsCount > 0 ? `${newAlertsCount} new alert${newAlertsCount !== 1 ? 's' : ''}` : "No new alerts",
      trend: alerts.length > 0 ? "up" : "down",
      icon: ShieldAlert,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      title: "Files Scanned",
      value: totalFilesScanned.toLocaleString(),
      change: totalFilesScanned > 0 ? "Across all scans" : "Run a scan to start",
      trend: totalFilesScanned > 0 ? "up" : "neutral",
      icon: Users,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Active Policies",
      value: activePoliciesCount.toString(),
      change: `${policies.length} total polic${policies.length !== 1 ? 'ies' : 'y'}`,
      trend: activePoliciesCount > 0 ? "up" : "neutral",
      icon: ScrollText,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
  ];

  const handleGenerateReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    try {
      const { reportId } = await reportsService.generateReport({
        reportType: "quick",
        format: reportFormat,
        dateRange: "today",
        reportName: `Quick Report ${new Date().toLocaleDateString()}`,
      });
      const name = `quick_report_${new Date().toISOString().split("T")[0]}`;
      await reportsService.downloadReport(reportId, `${name}.${reportFormat}`, reportFormat);
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const cardStyle = {
    background: '#12161B',
    border: '1px solid #30363D',
    borderRadius: '16px',
    padding: '20px 24px',
  };

  return (
    <div className="space-y-6 pb-10">

      {/* Page title */}
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
        Security Overview
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          let handleClick: (() => void) | undefined;
          if (stat.title === "Total Threats") handleClick = () => router.push("/threats");
          else if (stat.title === "Files Scanned") handleClick = () => router.push("/scanner");
          else if (stat.title === "Active Policies") handleClick = () => router.push("/policies");
          return (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              change={stat.change}
              trend={stat.trend as "up" | "down" | "neutral"}
              color={stat.color}
              bgColor={stat.bg}
              onClick={handleClick}
            />
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Recent Scans */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>
                Recent Scans
              </h2>
              <button
                onClick={() => router.push("/scanner")}
                style={{ fontSize: '13px', fontWeight: 500, color: '#5272C5' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#BABABA')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5272C5')}
              >
                View All
              </button>
            </div>

            {scans.length === 0 ? (
              <div className="py-10 text-center">
                <FileSearch size={32} className="mx-auto mb-3" style={{ color: '#535865' }} />
                <p style={{ color: '#989898', fontWeight: 500, fontSize: '14px' }}>No scans yet</p>
                <p style={{ color: '#535865', fontSize: '13px', marginTop: '4px' }}>
                  Run a scan from the Content Scanner page.
                </p>
              </div>
            ) : (
              <Table<any>
                columns={[
                  {
                    header: "Scan ID",
                    accessor: "scanid",
                    render: (value) => (
                      <span style={{
                        fontFamily: 'monospace', fontSize: '12px',
                        padding: '2px 8px', background: '#161B22',
                        border: '1px solid #30363D', borderRadius: '6px',
                        color: '#989898',
                      }}>{value}</span>
                    ),
                  },
                  {
                    header: "Type",
                    accessor: "filename",
                    className: "w-[40%]",
                    render: (value) => (
                      <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{value}</span>
                    ),
                  },
                  {
                    header: "Threats",
                    accessor: "threats",
                    render: (value) => (
                      <div className="flex items-center gap-2">
                        <span style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          background: value > 0 ? '#F85149' : '#22C35D',
                          display: 'inline-block',
                        }} />
                        <span style={{
                          color: value > 0 ? '#F85149' : '#535865',
                          fontWeight: value > 0 ? 600 : 400,
                        }}>{value}</span>
                      </div>
                    ),
                  },
                  {
                    header: "Time", accessor: "date",
                    className: "text-right",
                    render: (value) => (
                      <span style={{ color: '#535865', fontSize: '12px' }}>{value}</span>
                    ),
                  },
                ]}
                data={scans.slice(0, 5).map((s) => ({
                  scanid: `SCN-${String(s.id).padStart(4, '0')}`,
                  filename: s.type,
                  threats: s.threats,
                  date: s.time,
                }))}
              />
            )}
          </div>

          {/* Recent Threats */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>
                Recent Threats
              </h2>
              <button
                onClick={() => router.push("/threats")}
                style={{ fontSize: '13px', fontWeight: 500, color: '#F85149' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#BABABA')}
                onMouseLeave={e => (e.currentTarget.style.color = '#F85149')}
              >
                View All
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="py-10 text-center">
                <ShieldAlert size={32} className="mx-auto mb-3" style={{ color: '#535865' }} />
                <p style={{ color: '#22C35D', fontWeight: 500, fontSize: '14px' }}>
                  No threats detected
                </p>
                <p style={{ color: '#535865', fontSize: '13px', marginTop: '4px' }}>
                  Your environment is currently secure.
                </p>
              </div>
            ) : (
              <Table<any>
                columns={[
                  {
                    header: "Threat ID",
                    accessor: "scanid",
                    render: (value) => (
                      <span style={{
                        fontFamily: 'monospace', fontSize: '12px',
                        padding: '2px 8px', background: '#161B22',
                        border: '1px solid #30363D', borderRadius: '6px',
                        color: '#989898',
                      }}>{value}</span>
                    ),
                  },
                  {
                    header: "Type",
                    accessor: "filename",
                    className: "w-[40%]",
                    render: (value) => (
                      <span style={{ color: '#FFFFFF', fontWeight: 500 }}
                        className="truncate block max-w-xs">{value}</span>
                    ),
                  },
                  {
                    header: "Severity",
                    accessor: "threats",
                    render: (value) => {
                      const colors: Record<string, string> = {
                        High: '#F85149', Medium: '#F8C149', Low: '#5272C5',
                      };
                      return (
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          color: colors[value] || '#989898',
                        }}>
                          {value}
                        </span>
                      );
                    },
                  },
                  {
                    header: "Time", accessor: "date",
                    className: "text-right",
                    render: (value) => (
                      <span style={{ color: '#535865', fontSize: '12px' }}>{value}</span>
                    ),
                  },
                ]}
                data={alerts.slice(0, 4).map((a) => ({
                  scanid: `THR-${String(a.id).slice(-4).padStart(4, '0')}`,
                  filename: a.type,
                  threats: a.severity,
                  date: a.time.split(" ")[1] || a.time,
                }))}
              />
            )}
          </div>
        </div>

        {/* Quick Report */}
        <div style={{ ...cardStyle, height: 'fit-content' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginBottom: '20px' }}>
            Quick Report
          </h2>
          <form className="space-y-4" onSubmit={handleGenerateReport}>
            <div className="space-y-2">
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#989898', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Format
              </label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl appearance-none cursor-pointer focus:outline-none transition-all"
                style={{
                  background: '#161B22',
                  border: '1px solid #30363D',
                  color: '#FFFFFF',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="xlsx">Excel Workbook (.xlsx)</option>
                <option value="json">JSON Data (.json)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              style={{
                background: isGenerating ? '#3B5189' : '#5272C5',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!isGenerating) (e.currentTarget as HTMLButtonElement).style.background = '#445C9A'; }}
              onMouseLeave={e => { if (!isGenerating) (e.currentTarget as HTMLButtonElement).style.background = '#5272C5'; }}
            >
              {isGenerating ? (
                <><div className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#FFFFFF' }} />
                  Generating...</>
              ) : "Download Report"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}