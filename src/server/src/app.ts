import express, { Application } from "express";
import cors from "cors";
import { authModule } from "./modules/auth";
import { policyModule } from "./modules/policy";
import { scannerModule } from "./modules/scanner";
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

  // modules setup
  const auth = new authModule(config.DB_PATH);
  const policy = new policyModule(config.DB_PATH);
  const scanner = new scannerModule(config.DB_PATH);

  // CORS
  const corsOptions = {
    origin: config.IS_PRODUCTION ? "null" : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-session-id"],
  };

  app.use(cors(corsOptions));

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.get("/api/health", (_, res) => res.json({ status: "OK" }));

  app.use("/api/auth", auth.authController.getRouter());
  app.use("/api/policies", policy.policyController.getRouter());
  app.use("/api/scans", scanner.scannerController.getRouter());

  // 404 handler - must be after all routes
  app.use(notFoundHandler);

  // Global error handler - must be last
  app.use(errorHandler);

  return app;
}
