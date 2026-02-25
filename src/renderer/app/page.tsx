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
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Total Threats",
      value: alerts.length.toString(),
      change: newAlertsCount > 0 ? `${newAlertsCount} new alert${newAlertsCount !== 1 ? 's' : ''}` : "No new alerts",
      trend: alerts.length > 0 ? "up" : "down",
      icon: ShieldAlert,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      title: "Files Scanned",
      value: totalFilesScanned.toLocaleString(),
      change: totalFilesScanned > 0 ? "Across all scans" : "Run a scan to start",
      trend: totalFilesScanned > 0 ? "up" : "neutral",
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Active Policies",
      value: activePoliciesCount.toString(),
      change: `${policies.length} total polic${policies.length !== 1 ? 'ies' : 'y'}`,
      trend: activePoliciesCount > 0 ? "up" : "neutral",
      icon: ScrollText,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
        Security Overview
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* Recent Scans */}
          <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white tracking-tight">Recent Scans</h3>
              <button onClick={() => router.push("/scanner")} className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                View All
              </button>
            </div>

            {scans.length === 0 ? (
              <div className="py-10 text-center text-neutral-500">
                <FileSearch size={36} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold">No scans yet</p>
                <p className="text-sm mt-1">Run a scan from the Content Scanner page.</p>
              </div>
            ) : (
              <Table<any>
                columns={[
                  {
                    header: "Scan ID",
                    accessor: "scanid",
                    render: (value) => (
                      <span className="font-mono text-xs px-2 py-1 bg-white/5 rounded text-neutral-400 border border-white/5">{value}</span>
                    ),
                  },
                  {
                    header: "Type",
                    accessor: "filename",
                    className: "w-[40%]",
                    render: (value) => <span className="font-semibold text-neutral-100">{value}</span>,
                  },
                  {
                    header: "Threats",
                    accessor: "threats",
                    render: (value) => (
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${value > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                        <span className={value > 0 ? "text-rose-500 font-bold" : "text-neutral-500"}>{value}</span>
                      </div>
                    ),
                  },
                  { header: "Time", accessor: "date", className: "text-neutral-500 text-xs text-right" },
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
          <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white tracking-tight">Recent Threats</h3>
              <button onClick={() => router.push("/threats")} className="text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors">
                View All
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="py-10 text-center text-neutral-500">
                <ShieldAlert size={36} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-emerald-500">No threats detected</p>
                <p className="text-sm mt-1">Your environment is currently secure.</p>
              </div>
            ) : (
              <Table<any>
                columns={[
                  {
                    header: "Threat ID",
                    accessor: "scanid",
                    render: (value) => (
                      <span className="font-mono text-xs px-2 py-1 bg-white/5 rounded text-neutral-400 border border-white/5">{value}</span>
                    ),
                  },
                  {
                    header: "Type",
                    accessor: "filename",
                    className: "w-[40%]",
                    render: (value) => <span className="font-semibold text-neutral-100 truncate">{value}</span>,
                  },
                  {
                    header: "Severity",
                    accessor: "threats",
                    render: (value) => {
                      const colors: Record<string, string> = {
                        High: "text-rose-500", Medium: "text-amber-500", Low: "text-sky-400",
                      };
                      return (
                        <span className={`text-xs font-black uppercase tracking-wider ${colors[value] || "text-neutral-500"}`}>
                          {value}
                        </span>
                      );
                    },
                  },
                  { header: "Time", accessor: "date", className: "text-neutral-500 text-xs text-right" },
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
        <div
          className="p-4 md:p-5 rounded-2xl border shadow-xl h-fit"
          style={{ background: "linear-gradient(135deg, #020617 0%, #000000 100%)", borderColor: "rgba(51, 65, 85, 0.3)" }}
        >
          <h3 className="text-xl font-black text-white mb-6 tracking-tight">Quick Report</h3>
          <form className="space-y-6" onSubmit={handleGenerateReport}>
            <div className="space-y-3">
              <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-1">Format</label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value as any)}
                className="w-full h-12 px-4 bg-neutral-800/80 border border-neutral-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer font-bold"
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="xlsx">Excel Workbook (.xlsx)</option>
                <option value="json">JSON Data (.json)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />Generating...</>
              ) : (
                "Download Report"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}