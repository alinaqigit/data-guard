/**
 * Utility for generating and downloading security reports
 */

export type ReportFormat = 'JSON' | 'CSV' | 'TXT' | 'PDF';

interface ReportData {
    scans: any[];
    alerts: any[];
    policies: any[];
    generatedAt: string;
    summary: {
        totalScans: number;
        totalThreats: number;
        activePolicies: number;
    };
}

export const generateAndDownloadReport = (
    data: ReportData,
    format: ReportFormat,
    fileName: string = 'security_report'
) => {
    let content = '';
    let contentType = '';
    let extension = '';

    switch (format) {
        case 'JSON':
            content = JSON.stringify(data, null, 2);
            contentType = 'application/json';
            extension = 'json';
            break;

        case 'CSV':
            content = generateCSV(data);
            contentType = 'text/csv';
            extension = 'csv';
            break;

        case 'TXT':
            content = generateTXT(data);
            contentType = 'text/plain';
            extension = 'txt';
            break;

        case 'PDF':
        default:
            // For simplicity in this environment, falling back to TXT for "PDF"
            content = generateTXT(data);
            contentType = 'text/plain';
            extension = 'txt';
            break;
    }

    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

function generateCSV(data: ReportData): string {
    let csv = 'SECURITY REPORT\n';
    csv += `Generated At: ${data.generatedAt}\n\n`;

    csv += 'SUMMARY\n';
    csv += `Total Scans,${data.summary.totalScans}\n`;
    csv += `Total Threats,${data.summary.totalThreats}\n`;
    csv += `Active Policies,${data.summary.activePolicies}\n\n`;

    // Scans
    csv += 'SCANS\n';
    csv += 'ID,Type,Time,Threats,Status\n';
    data.scans.forEach((s, i) => {
        csv += `${1000 + i},${s.type},${s.time},${s.threats},${s.status}\n`;
    });
    csv += '\n';

    // Alerts
    csv += 'THREATS\n';
    csv += 'ID,Type,Severity,Source,Status,Time\n';
    data.alerts.forEach((a) => {
        csv += `${a.id},${a.type},${a.severity},${a.source},${a.status},${a.time}\n`;
    });

    return csv;
}

function generateTXT(data: ReportData): string {
    let txt = '========================================\n';
    txt += '           SECURITY REPORT              \n';
    txt += '========================================\n';
    txt += `Generated At: ${data.generatedAt}\n\n`;

    txt += 'SUMMARY\n';
    txt += `Total Scans:     ${data.summary.totalScans}\n`;
    txt += `Total Threats:   ${data.summary.totalThreats}\n`;
    txt += `Active Policies: ${data.summary.activePolicies}\n\n`;

    txt += 'RECENT SCANS\n';
    txt += '----------------------------------------\n';
    data.scans.forEach((s, i) => {
        txt += `[SCN-${1000 + i}] ${s.type} | Threats: ${s.threats} | ${s.time}\n`;
    });
    txt += '\n';

    txt += 'ACTIVE THREATS\n';
    txt += '----------------------------------------\n';
    data.alerts.forEach((a) => {
        txt += `[THR-${a.id.toString().slice(-4)}] ${a.type} | ${a.severity} | ${a.status} | ${a.time}\n`;
    });

    return txt;
}
