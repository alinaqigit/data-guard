'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import {
  Users,
  ShieldAlert,
  FileSearch,
  ScrollText,
  Download
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import Table from '@/components/Table';

interface RecentScan {
  name: string;
  type: string;
  files: string;
  threats: number;
  status: string;
  time: string;
}

interface RecentThreat {
  id: string;
  type: string;
  file: string;
  severity: string;
  status: string;
  detected: string;
}

import { useSecurity } from '@/context/SecurityContext';

export default function Home() {
  const router = useRouter();
  const { scans, alerts, runScan, totalFilesScanned, isAuthenticated } = useSecurity();
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleQuickScan = () => {
    setIsScanning(true);
    runScan('Quick Scan', 'All Files', '/default/path');

    // UI loading simulation
    setTimeout(() => {
      setIsScanning(false);
    }, 1500);
  };

  const handleGenerateReport = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
      setShowDownloadSuccess(true);
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowDownloadSuccess(false);
      }, 3000);
    }, 1500);
  };

  const stats = [
    {
      title: 'Total Scans',
      value: (24500 + scans.length).toLocaleString(),
      change: `+${scans.length} new scans`,
      trend: 'up',
      icon: FileSearch,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Total Threats',
      value: alerts.length.toString(),
      change: `${alerts.filter(a => a.status === 'New').length} new alerts`,
      trend: alerts.length > 5 ? 'up' : 'down',
      icon: ShieldAlert,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10'
    },
    {
      title: 'Files Scanned',
      value: totalFilesScanned.toLocaleString(),
      change: 'Across all sources',
      trend: 'up',
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Active Policies',
      value: '28',
      change: 'All enforced',
      trend: 'neutral',
      icon: ScrollText,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
            Security Overview
          </h2>
        </div>
      </div>


      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          // Define navigation handlers for specific cards
          let handleClick: (() => void) | undefined;

          if (stat.title === 'Total Threats') {
            handleClick = () => router.push('/threats');
          } else if (stat.title === 'Files Scanned') {
            handleClick = () => router.push('/scanner');
          } else if (stat.title === 'Active Policies') {
            handleClick = () => router.push('/policies');
          }

          return (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              change={stat.change}
              trend={stat.trend as 'up' | 'down' | 'neutral'}
              color={stat.color}
              bgColor={stat.bg}
              onClick={handleClick}
            />
          );
        })}
      </div>


      {/* Main Grid: Recent Scans & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Scans Table */}
          <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white tracking-tight">Recent Scans</h3>
              <button
                onClick={() => router.push('/scans')}
                className="cursor-pointer text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View All Scans
              </button>
            </div>

            <Table<any>
              columns={[
                {
                  header: 'Scan ID',
                  accessor: 'scanid',
                  render: (value) => (
                    <span className="font-mono text-xs px-2 py-1 bg-neutral-100 dark:bg-white/5 rounded text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-white/5">
                      {value}
                    </span>
                  )
                },
                {
                  header: 'Filename',
                  accessor: 'filename',
                  className: 'w-[40%]',
                  render: (value) => (
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{value}</span>
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
              data={scans.length > 0 ? scans.slice(0, 5).map((s, i) => ({
                scanid: `SCN-${1000 + i}`,
                filename: `Session: ${s.type}`,
                threats: s.threats,
                date: s.time
              })) : [
                { scanid: 'SCN-1024', filename: 'Weekly System Audit', threats: 12, date: 'Yesterday' },
                { scanid: 'SCN-1023', filename: 'Quick Security Check', threats: 0, date: '2 days ago' },
              ]}
            />
          </div>

          {/* Recent Threats Table */}
          <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white tracking-tight">Recent Threats</h3>
              <button
                onClick={() => router.push('/threats')}
                className="cursor-pointer text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors"
              >
                View All Threats
              </button>
            </div>

            <Table<any>
              columns={[
                {
                  header: 'Scan ID',
                  accessor: 'scanid',
                  render: (value) => (
                    <span className="font-mono text-xs px-2 py-1 bg-neutral-100 dark:bg-white/5 rounded text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-white/5">
                      {value}
                    </span>
                  )
                },
                {
                  header: 'Filename',
                  accessor: 'filename',
                  className: 'w-[40%]',
                  render: (value) => (
                    <div className="flex flex-col group cursor-default">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-indigo-500 transition-colors" title={value}>{value}</span>
                    </div>
                  )
                },
                {
                  header: 'Threats',
                  accessor: 'threats',
                  render: (value) => {
                    const colors = {
                      'Critical': 'bg-rose-500 text-rose-500',
                      'High': 'bg-orange-500 text-orange-500',
                      'Medium': 'bg-amber-500 text-amber-500',
                      'Low': 'bg-blue-500 text-blue-500'
                    };
                    const colorClass = colors[value as keyof typeof colors] || 'bg-neutral-500 text-neutral-500';

                    return (
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${colorClass.split(' ')[0]}`}></div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${colorClass.split(' ')[1]}`}>
                          {value}
                        </span>
                      </div>
                    );
                  }
                },
                {
                  header: 'Date',
                  accessor: 'date',
                  className: 'text-neutral-500 text-xs text-right'
                },
              ]}
              data={alerts.length > 0 ? alerts.slice(0, 4).map(a => ({
                scanid: `THR-${a.id.toString().slice(-4)}`,
                filename: a.description.split(' in ')[1]?.split(' during ')[0] || 'Unknown',
                threats: a.severity,
                date: a.time.split(' ')[1] || a.time
              })) : [
                { scanid: 'THR-1024', filename: 'invoice_2024.pdf.exe', threats: 'Critical', date: 'Yesterday' },
                { scanid: 'THR-1023', filename: 'customer_db.sql', threats: 'High', date: 'Yesterday' },
              ]}
            />
          </div>
        </div>

        {/* Right Column: System Status & Widgets */}
        <div className="space-y-6">


          {/* Quick Report Form */}
          <div className="p-4 md:p-5 rounded-2xl border transition-all duration-300 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
              borderColor: 'rgba(51, 65, 85, 0.3)'
            }}
          >
            <h3 className="text-xl font-black text-white mb-6 tracking-tight">Quick Report</h3>
            <form className="space-y-6" onSubmit={handleGenerateReport}>
              <div className="space-y-3">
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-1">File Type</label>
                <select className="w-full h-12 px-4 bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/50 rounded-xl text-base text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-bold">
                  <option value="pdf" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">PDF Document (.pdf)</option>
                  <option value="csv" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">CSV Spreadsheet (.csv)</option>
                  <option value="json" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">JSON Data (.json)</option>
                  <option value="xlsx" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Excel Workbook (.xlsx)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="cursor-pointer w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Preparing...
                  </span>
                ) : (
                  <>
                    <Download size={20} />
                    Download Report
                  </>
                )}
              </button>
            </form>
          </div>


        </div>
      </div>

      {/* Download Success Toast */}
      {showDownloadSuccess && (
        <div className="fixed top-8 right-8 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-black text-lg">Download Completed</span>
          </div>
        </div>
      )}
    </div>
  );
}
