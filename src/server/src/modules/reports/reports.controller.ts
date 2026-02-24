import { Response, Router } from "express";
import { reportsService } from "./reports.service";
import { authMiddleware, AuthenticatedRequest } from "../auth/auth.middleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { ValidationError, UnauthorizedError } from "../../utils/errors";
import { GenerateReportRequest, ReportFormat, ReportType, ReportDateRange } from "./reports.types";
import path from "path";

const VALID_TYPES: ReportType[] = ["quick", "full", "deep"];
const VALID_FORMATS: ReportFormat[] = ["pdf", "xlsx", "json"];
const VALID_RANGES: ReportDateRange[] = ["today", "weekly", "all"];

export class reportsController {
  private readonly reportsService: reportsService;
  private readonly router: Router;

  constructor(reportsService: reportsService) {
    this.reportsService = reportsService;
    this.router = Router();
    this.router.use(authMiddleware.verifySession);
    this.mapRoutes();
  }

  public getRouter() {
    return this.router;
  }

  private mapRoutes() {
    // POST /api/reports — generate a new report
    this.router.post(
      "/",
      asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) throw new UnauthorizedError();

        const body = req.body as GenerateReportRequest;

        if (!body.reportType || !VALID_TYPES.includes(body.reportType)) {
          throw new ValidationError(`reportType must be one of: ${VALID_TYPES.join(", ")}`);
        }
        if (!body.format || !VALID_FORMATS.includes(body.format)) {
          throw new ValidationError(`format must be one of: ${VALID_FORMATS.join(", ")}`);
        }
        if (!body.dateRange || !VALID_RANGES.includes(body.dateRange)) {
          throw new ValidationError(`dateRange must be one of: ${VALID_RANGES.join(", ")}`);
        }

        const { reportId, filePath } = await this.reportsService.generateReport(
          req.user.userId,
          req.user.username,
          body,
        );

        res.status(201).json({ reportId, message: "Report generated successfully" });
      }),
    );

    // GET /api/reports — get report history
    this.router.get(
      "/",
      asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) throw new UnauthorizedError();
        const reports = this.reportsService.getReportHistory(req.user.userId);
        res.status(200).json({ reports });
      }),
    );

    // GET /api/reports/:id/download — stream the file to client
    this.router.get(
      "/:id/download",
      asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) throw new UnauthorizedError();

        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const reportId = parseInt(idParam);
        if (isNaN(reportId)) throw new ValidationError("Invalid report ID");

        const filePath = this.reportsService.getReportFilePath(reportId, req.user.userId);
        const ext = path.extname(filePath).toLowerCase();

        const mimeTypes: Record<string, string> = {
          ".pdf": "application/pdf",
          ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ".json": "application/json",
        };

        const mime = mimeTypes[ext] || "application/octet-stream";
        const filename = path.basename(filePath);

        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.sendFile(filePath);
      }),
    );

    // DELETE /api/reports/:id — delete a report
    this.router.delete(
      "/:id",
      asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) throw new UnauthorizedError();

        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const reportId = parseInt(idParam);
        if (isNaN(reportId)) throw new ValidationError("Invalid report ID");

        this.reportsService.deleteReport(reportId, req.user.userId);
        res.status(200).json({ message: "Report deleted successfully" });
      }),
    );
  }
}