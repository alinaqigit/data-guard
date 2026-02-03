'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import {
  Users,
  ShieldAlert,
  FileSearch,
  ScrollText,
  ScanLine,
  FileText,
  Bell,
  ExternalLink
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
      alert('Report generated and downloaded successfully.');
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
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-500 dark:from-white dark:to-gray-400">
            Security Overview
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time insights into your DLP system status.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleGenerateReport()}
            className="cursor-pointer px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors"
          >
            {isGenerating ? 'Exporting...' : 'Export Report'}
          </button>
          <button
            onClick={handleQuickScan}
            disabled={isScanning}
            className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            trend={stat.trend as 'up' | 'down' | 'neutral'}
            color={stat.color}
            bgColor={stat.bg}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-white/5 backdrop-blur-sm mb-8 shadow-sm dark:shadow-inner dark:shadow-black/20">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleQuickScan}
            disabled={isScanning}
            className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:hover:translate-y-0"
          >
            <ScanLine size={18} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Scanning...' : 'Quick Scan'}
          </button>
          <button
            onClick={() => handleGenerateReport()}
            disabled={isGenerating}
            className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-xl font-medium transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
          >
            <FileText size={18} />
            Generate Report
          </button>
          <button
            onClick={() => router.push('/alerts')}
            className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-xl font-medium transition-all hover:-translate-y-0.5"
          >
            <Bell size={18} />
            View Alerts
          </button>
          <button
            onClick={() => router.push('/threats')}
            className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-xl font-medium transition-all hover:-translate-y-0.5"
          >
            <ShieldAlert size={18} />
            View Threats
          </button>
        </div>
      </div>

      {/* Main Grid: Recent Scans & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Scans Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Scans</h3>
              <button
                onClick={() => router.push('/scans')}
                className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                View All Scans
              </button>
            </div>

            <Table<RecentScan>
              columns={[
                { header: 'Scan Name', accessor: 'name', className: 'w-[30%]' },
                {
                  header: 'Type',
                  accessor: 'type',
                  render: (value) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${value === 'Full Scan'
                      ? 'bg-blue-500/10 text-blue-500'
                      : value === 'Quick Scan'
                        ? 'bg-indigo-500/10 text-indigo-500'
                        : 'bg-neutral-800 text-neutral-400'
                      }`}>
                      {value}
                    </span>
                  )
                },
                { header: 'Files', accessor: 'files' },
                {
                  header: 'Threats',
                  accessor: 'threats',
                  render: (value) => (
                    <span className={`${value > 0 ? 'text-rose-500 font-bold' : 'text-neutral-500'}`}>
                      {value}
                    </span>
                  )
                },
                {
                  header: 'Status',
                  accessor: 'status',
                  render: (value) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : value === 'Failed'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                      }`}>
                      {value}
                    </span>
                  )
                },
                { header: 'Time', accessor: 'time', className: 'text-neutral-500' },
              ]}
              data={scans.length > 0 ? scans.slice(0, 5).map(s => ({
                name: `Session: ${s.type}`,
                type: s.type,
                files: s.files,
                threats: s.threats,
                status: s.status,
                time: s.time
              })) : [
                { name: 'Weekly System Audit', type: 'Full Scan', files: '14,203', threats: 12, status: 'Completed', time: 'Yesterday' },
                { name: 'Quick Check', type: 'Quick Scan', files: '450', threats: 0, status: 'Completed', time: '2 days ago' },
              ]}
            />
          </div>

          {/* Recent Threats Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Threats</h3>
              <button
                onClick={() => router.push('/threats')}
                className="cursor-pointer text-xs text-rose-600 dark:text-rose-400 hover:text-rose-500 dark:hover:text-rose-300"
              >
                View All Threats
              </button>
            </div>

            <Table<RecentThreat>
              columns={[
                { header: 'Threat ID', accessor: 'id', className: 'font-mono text-neutral-500' },
                { header: 'Type', accessor: 'type' },
                { header: 'File', accessor: 'file', className: 'max-w-[150px] truncate' },
                {
                  header: 'Severity',
                  accessor: 'severity',
                  render: (value) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${value === 'Critical' || value === 'High'
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/20'
                      : value === 'Medium'
                        ? 'bg-orange-500/20 text-orange-500 border border-orange-500/20'
                        : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'
                      }`}>
                      {value}
                    </span>
                  )
                },
                {
                  header: 'Status',
                  accessor: 'status',
                  render: (value) => (
                    <span className={`px-3 py-1 rounded-full text-xs border ${value === 'Quarantined'
                      ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      : value === 'Resolved'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}>
                      {value}
                    </span>
                  )
                },
                { header: 'Detected', accessor: 'detected', className: 'text-neutral-500' },
              ]}
              data={alerts.length > 0 ? alerts.slice(0, 4).map(a => ({
                id: `THR-${a.id.toString().slice(-4)}`,
                type: a.type.replace('Policy Violation: ', ''),
                file: a.description.split(' in ')[1]?.split(' during ')[0] || 'Unknown',
                severity: a.severity,
                status: a.status === 'New' ? 'Blocked' : 'Resolved',
                detected: a.time.split(' ')[1] || a.time
              })) : [
                { id: 'THR-1024', type: 'Malware', file: 'invoice_2024.pdf.exe', severity: 'Critical', status: 'Quarantined', detected: 'Yesterday' },
                { id: 'THR-1023', type: 'Data Leak', file: 'customer_db.sql', severity: 'High', status: 'Blocked', detected: 'Yesterday' },
              ]}
            />
          </div>
        </div>

        {/* Right Column: System Status & Widgets */}
        <div className="space-y-6">

          {/* System Status */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">System Status</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Scanner Service</span>
                  <span className="text-emerald-500 font-medium">Active</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Data Protection</span>
                  <span className="text-indigo-500 font-medium">98%</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full w-[98%] bg-indigo-500 rounded-full"></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Report Generation</span>
                  <span className="text-amber-500 font-medium">Processing</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full w-[45%] bg-amber-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Report Form */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Quick Report</h3>
            <form className="space-y-4" onSubmit={handleGenerateReport}>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Report Type</label>
                <select className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors">
                  <option>Security Audit</option>
                  <option>Threat Analysis</option>
                  <option>User Activity</option>
                  <option>System Performance</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Time Range</label>
                <select className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors">
                  <option>Last 24 Hours</option>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>Custom Range</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="cursor-pointer w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </button>
            </form>
          </div>

          {/* Quick Links */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Quick Links</h3>
            <div className="space-y-3">
              {[
                { label: 'Security Policy Documentation', href: '#' },
                { label: 'Compliance Guidelines 2024', href: '#' },
                { label: 'Incident Response Plan', href: '#' },
                { label: 'System Architecture Diagram', href: '#' }
              ].map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all group"
                >
                  <span className="text-sm text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{link.label}</span>
                  <ExternalLink size={14} className="text-neutral-400 dark:text-neutral-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
