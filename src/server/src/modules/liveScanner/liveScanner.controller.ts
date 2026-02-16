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

    // All live scanner routes require authentication
    this.liveScannerRouter.use(authMiddleware.verifySession);

    // Map routes
    this.mapRoutes();
  }

  public getRouter() {
    return this.liveScannerRouter;
  }

  private mapRoutes() {
    // Start a new live scanner
    this.liveScannerRouter.post(
      "/",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          // Validate request body
          if (
            !req.body ||
            typeof req.body !== "object" ||
            Array.isArray(req.body)
          ) {
            throw new ValidationError("Invalid request body");
          }

          const request = req.body as StartLiveScannerRequest;

          // Validate required fields
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
            throw new ValidationError(
              "Invalid watchMode. Must be: file-changes, directory-changes, or both",
            );
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

    // Get all live scanners for current user
    this.liveScannerRouter.get(
      "/",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const liveScanners =
            this.liveScannerService.getAllLiveScanners(
              req.user.userId,
            );

          res.json(liveScanners);
        },
      ),
    );

    // Get live scanner by ID
    this.liveScannerRouter.get(
      "/:id",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);

          if (isNaN(scannerId)) {
            throw new ValidationError("Invalid scanner ID");
          }

          const liveScanner =
            this.liveScannerService.getLiveScannerById(
              req.user.userId,
              scannerId,
            );

          res.json(liveScanner);
        },
      ),
    );

    // Get live scanner statistics
    this.liveScannerRouter.get(
      "/:id/stats",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);

          if (isNaN(scannerId)) {
            throw new ValidationError("Invalid scanner ID");
          }

          const stats = this.liveScannerService.getLiveScannerStats(
            req.user.userId,
            scannerId,
          );

          res.json(stats);
        },
      ),
    );

    // Stop a live scanner
    this.liveScannerRouter.post(
      "/:id/stop",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);

          if (isNaN(scannerId)) {
            throw new ValidationError("Invalid scanner ID");
          }

          const result =
            await this.liveScannerService.stopLiveScanner(
              req.user.userId,
              scannerId,
            );

          res.json(result);
        },
      ),
    );

    // Pause a live scanner
    this.liveScannerRouter.post(
      "/:id/pause",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);

          if (isNaN(scannerId)) {
            throw new ValidationError("Invalid scanner ID");
          }

          const result =
            await this.liveScannerService.pauseLiveScanner(
              req.user.userId,
              scannerId,
            );

          res.json(result);
        },
      ),
    );

    // Resume a paused live scanner
    this.liveScannerRouter.post(
      "/:id/resume",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);

          if (isNaN(scannerId)) {
            throw new ValidationError("Invalid scanner ID");
          }

          const result =
            await this.liveScannerService.resumeLiveScanner(
              req.user.userId,
              scannerId,
            );

          res.json(result);
        },
      ),
    );

    // Delete a live scanner
    this.liveScannerRouter.delete(
      "/:id",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scannerId = parseInt(idParam);

          if (isNaN(scannerId)) {
            throw new ValidationError("Invalid scanner ID");
          }

          const result =
            await this.liveScannerService.deleteLiveScanner(
              req.user.userId,
              scannerId,
            );

          res.json(result);
        },
      ),
    );
  }
}
