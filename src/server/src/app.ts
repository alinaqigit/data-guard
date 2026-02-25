import express, { Application } from "express";
import cors from "cors";
import { authModule } from "./modules/auth";
import { policyModule } from "./modules/policy";
import { scannerModule } from "./modules/scanner";
import { liveScannerModule } from "./modules/liveScanner";
import { reportsModule } from "./modules/reports";
import { fileActionsModule } from "./modules/fileActions";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

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

  const corsOptions = {
    origin: config.IS_PRODUCTION ? "null" : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-session-id"],
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (_, res) => res.json({ status: "OK" }));
  app.use("/api/auth", auth.authController.getRouter());
  app.use("/api/policies", policy.policyController.getRouter());
  app.use("/api/live-scanners", liveScanner.liveScannerController.getRouter());
  app.use("/api/scans", scanner.scannerController.getRouter());
  app.use("/api/reports", reports.reportsController.getRouter());
  app.use("/api/files", fileActions.controller.getRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}