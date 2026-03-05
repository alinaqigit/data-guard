import { threatsService } from "./threats.service";
import { Response, Router } from "express";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../auth/auth.middleware";
import { asyncHandler } from "../../middleware/errorHandler";
import {
  ValidationError,
  UnauthorizedError,
} from "../../utils/errors";

export class threatsController {
  private readonly service: threatsService;
  private readonly router: Router;

  constructor(service: threatsService) {
    this.service = service;
    this.router = Router();

    this.router.use(authMiddleware.verifySession);
    this.mapRoutes();
  }

  public getRouter() {
    return this.router;
  }

  private mapRoutes() {
    // GET /api/threats — all threats for current user
    this.router.get(
      "/",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          const threats = this.service.getAllThreatsByUserId(
            req.user.userId,
          );
          res.json({ threats });
        },
      ),
    );

    // PATCH /api/threats/:id/status — update threat status
    this.router.patch(
      "/:id/status",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();

          const id = parseInt(req.params.id as string, 10);
          if (isNaN(id))
            throw new ValidationError("Invalid threat ID");

          const { status } = req.body;
          if (
            !status ||
            ![
              "New",
              "Investigating",
              "Quarantined",
              "Resolved",
            ].includes(status)
          ) {
            throw new ValidationError(
              "Invalid status. Must be: New, Investigating, Quarantined, or Resolved",
            );
          }

          this.service.updateThreatStatus(
            id,
            req.user.userId,
            status,
          );
          res.json({ message: "Threat status updated" });
        },
      ),
    );

    // DELETE /api/threats/:id — delete a single threat
    this.router.delete(
      "/:id",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();

          const id = parseInt(req.params.id as string, 10);
          if (isNaN(id))
            throw new ValidationError("Invalid threat ID");

          this.service.deleteThreat(id, req.user.userId);
          res.json({ message: "Threat deleted" });
        },
      ),
    );

    // DELETE /api/threats — delete all threats for current user
    this.router.delete(
      "/",
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          if (!req.user) throw new UnauthorizedError();
          this.service.deleteAllThreats(req.user.userId);
          res.json({ message: "All threats deleted" });
        },
      ),
    );
  }
}
