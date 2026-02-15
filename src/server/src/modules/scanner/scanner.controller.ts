import { scannerService } from "./scanner.service";
import { Response, Router } from "express";
import { StartScanRequest } from "./scanner.types";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../auth/auth.middleware";
import { asyncHandler } from "../../middleware/errorHandler";
import {
  ValidationError,
  UnauthorizedError,
} from "../../utils/errors";

export class scannerController {
  private readonly scannerService: scannerService;
  private readonly scannerRouter: Router;
  public readonly path: string = "/scans";

  constructor(scannerService: scannerService) {
    this.scannerService = scannerService;
    this.scannerRouter = Router();

    // All scanner routes require authentication
    this.scannerRouter.use(authMiddleware.verifySession);

    // Map routes
    this.mapRoutes();
  }

  public getRouter() {
    return this.scannerRouter;
  }

  private mapRoutes() {
    // Start a new scan
    this.scannerRouter.post(
      "/",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          // Validate request body exists and is an object
          if (
            !req.body ||
            typeof req.body !== "object" ||
            Array.isArray(req.body)
          ) {
            throw new ValidationError("Invalid request body");
          }

          const request = req.body as StartScanRequest;

          // Validate required fields
          if (!request.scanType || !request.targetPath) {
            throw new ValidationError(
              "Missing required fields: scanType, targetPath",
            );
          }

          if (
            !["full", "quick", "custom"].includes(request.scanType)
          ) {
            throw new ValidationError(
              "Invalid scanType. Must be: full, quick, or custom",
            );
          }

          const result = await this.scannerService.startScan(
            req.user.userId,
            request,
          );

          res.status(201).json(result);
        },
      ),
    );

    // Get scan history for current user
    this.scannerRouter.get(
      "/",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const limit = req.query.limit
            ? parseInt(req.query.limit as string)
            : undefined;

          const scans = this.scannerService.getScanHistory(
            req.user.userId,
            limit,
          );

          res.status(200).json({ scans });
        },
      ),
    );

    // Get specific scan by ID
    this.scannerRouter.get(
      "/:id",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scanId = parseInt(idParam);

          if (isNaN(scanId)) {
            throw new ValidationError("Invalid scan ID");
          }

          const scan = this.scannerService.getScan(
            scanId,
            req.user.userId,
          );

          if (!scan) {
            return res.status(404).json({ error: "Scan not found" });
          }

          res.status(200).json(scan);
        },
      ),
    );

    // Get scan progress
    this.scannerRouter.get(
      "/:id/progress",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scanId = parseInt(idParam);

          if (isNaN(scanId)) {
            throw new ValidationError("Invalid scan ID");
          }

          const progress = this.scannerService.getScanProgress(
            scanId,
            req.user.userId,
          );

          res.status(200).json(progress);
        },
      ),
    );

    // Cancel a running scan
    this.scannerRouter.patch(
      "/:id/cancel",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scanId = parseInt(idParam);

          if (isNaN(scanId)) {
            throw new ValidationError("Invalid scan ID");
          }

          this.scannerService.cancelScan(scanId, req.user.userId);

          res.status(200).json({
            message: "Scan cancellation requested",
          });
        },
      ),
    );

    // Delete a scan
    this.scannerRouter.delete(
      "/:id",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) {
            throw new UnauthorizedError();
          }

          const idParam = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
          const scanId = parseInt(idParam);

          if (isNaN(scanId)) {
            throw new ValidationError("Invalid scan ID");
          }

          this.scannerService.deleteScan(scanId, req.user.userId);

          res.status(200).json({
            message: "Scan deleted successfully",
          });
        },
      ),
    );
  }
}
