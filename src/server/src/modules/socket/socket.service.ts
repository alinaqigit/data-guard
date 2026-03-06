import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import * as os from "os";

export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  activeSessions: number;
}

interface CpuSnapshot {
  idle: number;
  total: number;
}

export class SocketService {
  private io: SocketIOServer;
  private metricsInterval: NodeJS.Timeout | null = null;
  private prevCpuSnapshot: CpuSnapshot | null = null;
  private prevNetBytes: number = 0;
  private prevNetTime: number = 0;
  private cachedNetBytes: number = 0;
  private netFetchInProgress: boolean = false;
  // Assume 100 Mbps link for percentage calculation
  private readonly LINK_SPEED_BYTES = (100 * 1024 * 1024) / 8;

  constructor(httpServer: HttpServer, isProduction: boolean) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: isProduction ? false : "*",
        methods: ["GET", "POST"],
      },
    });
    // Take initial snapshots so the first delta is meaningful
    this.prevCpuSnapshot = this.takeCpuSnapshot();
    this.fetchNetBytesAsync(); // kick off first async fetch
    this.prevNetTime = Date.now();
    this.setupConnectionHandlers();
    this.startMetricsBroadcast();
  }

  private setupConnectionHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
      this.sendMetricsToSocket(socket);
    });
  }

  /** Snapshot aggregate CPU ticks across all cores */
  private takeCpuSnapshot(): CpuSnapshot {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      const t = cpu.times;
      idle += t.idle;
      total += t.user + t.nice + t.sys + t.idle + t.irq;
    }
    return { idle, total };
  }

  /** Real CPU usage: delta between two snapshots */
  private getCpuPercent(): number {
    const now = this.takeCpuSnapshot();
    const prev = this.prevCpuSnapshot;
    if (!prev) {
      this.prevCpuSnapshot = now;
      return 0;
    }
    const idleDiff = now.idle - prev.idle;
    const totalDiff = now.total - prev.total;
    this.prevCpuSnapshot = now;
    if (totalDiff === 0) return 0;
    return Math.round(((totalDiff - idleDiff) / totalDiff) * 100);
  }

  /** Fetch network bytes asynchronously — never blocks the event loop */
  private fetchNetBytesAsync(): void {
    if (this.netFetchInProgress) return;
    this.netFetchInProgress = true;

    if (process.platform === "linux") {
      try {
        const fs = require("fs");
        const data: string = fs.readFileSync("/proc/net/dev", "utf8");
        let bytes = 0;
        for (const line of data.split("\n").slice(2)) {
          const parts = line.trim().split(/\s+/);
          if (!parts[0] || parts[0] === "lo:") continue;
          bytes += parseInt(parts[1], 10) + parseInt(parts[9], 10);
        }
        this.cachedNetBytes = bytes;
      } catch {
        /* ignore */
      }
      this.netFetchInProgress = false;
      return;
    }

    if (process.platform === "win32") {
      const { exec } = require("child_process");
      exec(
        'powershell -NoProfile -Command "Get-NetAdapterStatistics | Select-Object ReceivedBytes,SentBytes | ConvertTo-Csv -NoTypeInformation"',
        { encoding: "utf8", timeout: 5000 },
        (err: any, stdout: string) => {
          this.netFetchInProgress = false;
          if (err) return;
          let bytes = 0;
          for (const line of stdout.trim().split("\n").slice(1)) {
            const cols = line.replace(/"/g, "").split(",");
            bytes +=
              (parseInt(cols[0], 10) || 0) +
              (parseInt(cols[1], 10) || 0);
          }
          this.cachedNetBytes = bytes;
        },
      );
      return;
    }

    this.netFetchInProgress = false;
  }

  /** Network throughput as a percentage of LINK_SPEED_BYTES */
  private getNetworkPercent(): number {
    const now = Date.now();
    const bytes = this.cachedNetBytes;
    // Kick off an async fetch for the next tick
    this.fetchNetBytesAsync();
    const elapsed = (now - this.prevNetTime) / 1000;
    if (elapsed <= 0 || this.prevNetTime === 0) {
      this.prevNetBytes = bytes;
      this.prevNetTime = now;
      return 0;
    }
    const bytesPerSec = (bytes - this.prevNetBytes) / elapsed;
    this.prevNetBytes = bytes;
    this.prevNetTime = now;
    const pct = (bytesPerSec / this.LINK_SPEED_BYTES) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }

  private getSystemMetrics(): SystemMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      cpu: this.getCpuPercent(),
      memory: Math.round(((totalMem - freeMem) / totalMem) * 100),
      network: this.getNetworkPercent(),
      activeSessions: this.io.sockets.sockets.size,
    };
  }

  private sendMetricsToSocket(socket: Socket) {
    socket.emit("metrics:update", this.getSystemMetrics());
  }

  private startMetricsBroadcast() {
    this.metricsInterval = setInterval(() => {
      this.io.emit("metrics:update", this.getSystemMetrics());
    }, 3000);
  }

  // Emitted once when a scan begins — tells frontend total file count for progress %
  public emitScanStart(data: {
    scanId: number;
    totalFiles: number;
    scanType: string;
    targetPath: string;
  }) {
    this.io.emit("scan:start", data);
  }

  public emitAlert(alert: {
    id: number;
    severity: "High" | "Medium" | "Low";
    time: string;
    type: string;
    description: string;
    source: string;
    status: "New" | "Resolved" | "Quarantined" | "Investigating";
    filePath?: string;
  }) {
    this.io.emit("alert:new", alert);
  }

  public emitScanProgress(progress: {
    scanId: number;
    status: string;
    filesScanned: number;
    filesWithThreats: number;
    totalThreats: number;
    totalFiles: number;
    currentFile?: string;
  }) {
    this.io.emit("scan:progress", progress);
  }

  public emitScanComplete(scan: {
    scanId: number;
    status: string;
    filesScanned: number;
    totalThreats: number;
    totalFiles: number;
  }) {
    this.io.emit("scan:complete", scan);
  }

  public emitLiveScannerActivity(activity: {
    scannerId: number;
    filePath: string;
    changeType: string;
    threatsFound: number;
    timestamp: string;
    watcherReady?: boolean;
  }) {
    this.io.emit("liveScanner:activity", activity);
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public destroy() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    this.io.close();
  }
}

let socketServiceInstance: SocketService | null = null;

export function initSocketService(
  httpServer: HttpServer,
  isProduction: boolean,
): SocketService {
  socketServiceInstance = new SocketService(httpServer, isProduction);
  return socketServiceInstance;
}

export function getSocketService(): SocketService | null {
  return socketServiceInstance;
}
