import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  activeSessions: number;
}

export class SocketService {
  private io: SocketIOServer;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(httpServer: HttpServer, isProduction: boolean) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: isProduction ? false : "*",
        methods: ["GET", "POST"],
      },
    });
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

  private getSystemMetrics(): SystemMetrics {
    const os = require("os");
    const cpus: any[] = os.cpus();
    const cpuLoad = cpus.reduce((acc: number, cpu: any) => {
      const times: Record<string, number> = cpu.times;
      const total = Object.values(times).reduce((t: number, v: number) => t + v, 0);
      return acc + ((total - times.idle) / total) * 100;
    }, 0) / cpus.length;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const networkLoad = Math.min(100, Math.abs(Math.sin(Date.now() / 10000) * 40 + 15));
    return {
      cpu: Math.round(cpuLoad),
      memory: Math.round(((totalMem - freeMem) / totalMem) * 100),
      network: Math.round(networkLoad),
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
  }) {
    this.io.emit("liveScanner:activity", activity);
  }

  public getIO(): SocketIOServer { return this.io; }

  public destroy() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    this.io.close();
  }
}

let socketServiceInstance: SocketService | null = null;

export function initSocketService(httpServer: HttpServer, isProduction: boolean): SocketService {
  socketServiceInstance = new SocketService(httpServer, isProduction);
  return socketServiceInstance;
}

export function getSocketService(): SocketService | null {
  return socketServiceInstance;
}