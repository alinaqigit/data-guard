import { liveScannerService } from "./liveScanner.service";
import { Response, Router } from "express";
import { StartLiveScannerRequest } from "./liveScanner.types";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../auth/auth.middleware";
import { asyncHandler } from "../../middleware/errorHandler";
import {
  ValidationError,
  UnauthorizedError,
} from "../../utils/errors";

export class liveScannerController {
  private readonly liveScannerService: liveScannerService;
  private readonly liveScannerRouter: Router;
  public readonly path: string = "/live-scanners";

  constructor(liveScannerService: liveScannerService) {
    this.liveScannerService = liveScannerService;
    this.liveScannerRouter = Router();
    this.liveScannerRouter.use(authMiddleware.verifySession);
    this.mapRoutes();
  }

  public getRouter() {
    return this.liveScannerRouter;
  }

  private mapRoutes() {
    // ── NEW: Toggle-based monitoring endpoints ────────────────────────────────

    // POST /api/live-scanners/monitor/start — called when Real-time Monitoring toggled ON
    this.liveScannerRouter.post(
      "/monitor/start",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const autoResponse = req.body?.autoResponse === true;
          const result =
            await this.liveScannerService.startMonitoring(
              req.user.userId,
              autoResponse,
            );
          res.status(201).json(result);
        },
      ),
    );

    // POST /api/live-scanners/monitor/stop — called when Real-time Monitoring toggled OFF
    this.liveScannerRouter.post(
      "/monitor/stop",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          await this.liveScannerService.stopMonitoringForUser(
            req.user.userId,
          );
          res
            .status(200)
            .json({ message: "Live monitoring stopped" });
        },
      ),
    );

    // PATCH /api/live-scanners/monitor/auto-response — update auto-response flag
    this.liveScannerRouter.patch(
      "/monitor/auto-response",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const { autoResponse } = req.body;
          if (typeof autoResponse !== "boolean")
            throw new ValidationError("autoResponse must be boolean");
          this.liveScannerService.updateAutoResponse(
            req.user.userId,
            autoResponse,
          );
          res
            .status(200)
            .json({ message: "Auto-response updated", autoResponse });
        },
      ),
    );

    // GET /api/live-scanners/monitor/status — get monitoring status
    this.liveScannerRouter.get(
      "/monitor/status",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const status = this.liveScannerService.getMonitoringStatus(
            req.user.userId,
          );
          res.status(200).json(status);
        },
      ),
    );

    // GET /api/live-scanners/monitor/debug — diagnostic info for debugging
    this.liveScannerRouter.get(
      "/monitor/debug",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const diagnostics = this.liveScannerService.getDiagnostics(
            req.user.userId,
          );
          const status = this.liveScannerService.getMonitoringStatus(
            req.user.userId,
          );
          res.status(200).json({ ...status, ...diagnostics });
        },
      ),
    );

    // ── Existing routes ───────────────────────────────────────────────────────

    this.liveScannerRouter.post(
      "/",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const request = req.body as StartLiveScannerRequest;
          if (
            !request.name ||
            !request.targetPath ||
            !request.watchMode ||
            typeof request.isRecursive !== "boolean"
          ) {
            throw new ValidationError(
              "Missing required fields: name, targetPath, watchMode, isRecursive",
            );
          }
          if (
            !["file-changes", "directory-changes", "both"].includes(
              request.watchMode,
            )
          ) {
            throw new ValidationError("Invalid watchMode");
          }
          const result =
            await this.liveScannerService.startLiveScanner(
              req.user.userId,
              request,
            );
          res.status(201).json(result);
        },
      ),
    );

    this.liveScannerRouter.get(
      "/",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const liveScanners =
            this.liveScannerService.getAllLiveScanners(
              req.user.userId,
            );
          res.json(liveScanners);
        },
      ),
    );

    this.liveScannerRouter.get(
      "/:id",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);
          if (isNaN(scannerId))
            throw new ValidationError("Invalid scanner ID");
          res.json(
            this.liveScannerService.getLiveScannerById(
              req.user.userId,
              scannerId,
            ),
          );
        },
      ),
    );

    this.liveScannerRouter.get(
      "/:id/stats",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);
          if (isNaN(scannerId))
            throw new ValidationError("Invalid scanner ID");
          res.json(
            this.liveScannerService.getLiveScannerStats(
              req.user.userId,
              scannerId,
            ),
          );
        },
      ),
    );

    this.liveScannerRouter.post(
      "/:id/stop",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);
          if (isNaN(scannerId))
            throw new ValidationError("Invalid scanner ID");
          res.json(
            await this.liveScannerService.stopLiveScanner(
              req.user.userId,
              scannerId,
            ),
          );
        },
      ),
    );

    this.liveScannerRouter.post(
      "/:id/pause",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);
          if (isNaN(scannerId))
            throw new ValidationError("Invalid scanner ID");
          res.json(
            await this.liveScannerService.pauseLiveScanner(
              req.user.userId,
              scannerId,
            ),
          );
        },
      ),
    );

    this.liveScannerRouter.post(
      "/:id/resume",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);
          if (isNaN(scannerId))
            throw new ValidationError("Invalid scanner ID");
          res.json(
            await this.liveScannerService.resumeLiveScanner(
              req.user.userId,
              scannerId,
            ),
          );
        },
      ),
    );

    this.liveScannerRouter.delete(
      "/:id",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);
          if (isNaN(scannerId))
            throw new ValidationError("Invalid scanner ID");
          res.json(
            await this.liveScannerService.deleteLiveScanner(
              req.user.userId,
              scannerId,
            ),
          );
        },
      ),
    );
  }
}
