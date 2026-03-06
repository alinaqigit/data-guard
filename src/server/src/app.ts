import express, { Application } from "express";
import cors from "cors";
import { authModule } from "./modules/auth";
import { policyModule } from "./modules/policy";
import { scannerModule } from "./modules/scanner";
import { liveScannerModule } from "./modules/liveScanner";
import { reportsModule } from "./modules/reports";
import { fileActionsModule } from "./modules/fileActions";
import { threatsModule } from "./modules/threats";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler";

export interface Config {
  IS_PRODUCTION: boolean;
  DB_PATH: string;
}

export function createDataGuardApp(config: Config): Application {
  const app = express();

  const auth = new authModule(config.DB_PATH);
  const policy = new policyModule(config.DB_PATH);
  const scanner = new scannerModule(config.DB_PATH);
  const liveScanner = new liveScannerModule(config.DB_PATH);
  const reports = new reportsModule(config.DB_PATH);
  const fileActions = new fileActionsModule(config.DB_PATH);
  const threats = new threatsModule(config.DB_PATH);

  const corsOptions = {
    origin: config.IS_PRODUCTION ? "null" : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-session-id"],
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (_, res) => res.json({ status: "OK" }));

  // ── PUBLIC debug endpoint (no auth) — helps diagnose live-monitor issues ────
  app.get("/api/debug/live-monitor", (_req, res) => {
    try {
      const svc = liveScanner.liveScannerService;
      const allWatchers: any[] = [];
      const watchers = (svc as any).activeWatchers as Map<
        number,
        any
      >;
      for (const [id, aw] of watchers) {
        allWatchers.push({
          scannerId: id,
          userId: aw.userId,
          isReady: aw.isReady,
          initTimeMs: Date.now() - aw.startTime,
          policiesCount: aw.policies.length,
          autoResponse: aw.autoResponse,
          activityLogSize: aw.activityLog.length,
          recentActivity: aw.activityLog.slice(-5),
        });
      }
      const {
        getSocketService: getSS,
      } = require("./modules/socket/socket.service");
      const ss = getSS();
      res.json({
        status: "OK",
        codeVersion: "v8-debug",
        totalActiveWatchers: watchers.size,
        watchers: allWatchers,
        socketServiceActive: !!ss,
        connectedSockets: ss ? ss.getIO().engine.clientsCount : 0,
        serverUptime: process.uptime(),
        pid: process.pid,
      });
    } catch (err: any) {
      res.json({ status: "ERROR", error: err.message });
    }
  });

  // ── Force-emit a test liveScanner:activity event ────────────────────────────
  app.get("/api/debug/test-emit", (_req, res) => {
    const {
      getSocketService: getSS,
    } = require("./modules/socket/socket.service");
    const ss = getSS();
    if (!ss) return res.json({ error: "no socket service" });
    const testActivity = {
      scannerId: 0,
      filePath: "C:\\test\\debug-test-file.txt",
      changeType: "change",
      threatsFound: 0,
      timestamp: new Date().toISOString(),
    };
    ss.emitLiveScannerActivity(testActivity);
    res.json({
      emitted: true,
      activity: testActivity,
      clients: ss.getIO().engine.clientsCount,
    });
  });

  app.use("/api/auth", auth.authController.getRouter());
  app.use("/api/policies", policy.policyController.getRouter());
  app.use(
    "/api/live-scanners",
    liveScanner.liveScannerController.getRouter(),
  );
  app.use("/api/scans", scanner.scannerController.getRouter());
  app.use("/api/reports", reports.reportsController.getRouter());
  app.use("/api/files", fileActions.controller.getRouter());
  app.use("/api/threats", threats.threatsController.getRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
