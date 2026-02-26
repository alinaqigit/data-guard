import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socket.on("connect", () => console.log("[Socket] Connected:", socket?.id));
    socket.on("disconnect", (reason) => console.log("[Socket] Disconnected:", reason));
    socket.on("connect_error", (error) => console.error("[Socket] Error:", error.message));
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export type SystemMetrics = {
  cpu: number; memory: number; network: number; activeSessions: number;
};

export type SocketAlert = {
  id: number;
  severity: "High" | "Medium" | "Low";
  time: string; type: string; description: string; source: string;
  status: "New" | "Resolved" | "Quarantined" | "Investigating";
  filePath?: string;
};

// Emitted once when scan starts — provides totalFiles for % calculation
export type ScanStart = {
  scanId: number;
  totalFiles: number;
  scanType: string;
  targetPath: string;
};

export type ScanProgress = {
  scanId: number;
  status: string;
  filesScanned: number;
  filesWithThreats: number;
  totalThreats: number;
  totalFiles: number;       // now included
  currentFile?: string;
};

export type LiveScannerActivity = {
  scannerId: number;
  filePath: string;
  changeType: string;
  threatsFound: number;
  timestamp: string;
};