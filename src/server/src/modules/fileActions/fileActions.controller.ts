import { Response, Router } from "express";
import { fileActionsService } from "./fileActions.service";
import { authMiddleware, AuthenticatedRequest } from "../auth/auth.middleware";
import { asyncHandler } from "../../middleware/errorHandler";
import { ValidationError, UnauthorizedError } from "../../utils/errors";

export class fileActionsController {
  private readonly service: fileActionsService;
  private readonly router: Router;

  constructor(service: fileActionsService) {
    this.service = service;
    this.router = Router();
    this.router.use(authMiddleware.verifySession);
    this.mapRoutes();
  }

  public getRouter() {
    return this.router;
  }

  private mapRoutes() {
    // POST /api/files/quarantine
    this.router.post("/quarantine", asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const { filePath } = req.body;
      if (!filePath) throw new ValidationError("filePath is required");
      const result = this.service.quarantineFile(req.user.userId, filePath);
      res.status(200).json(result);
    }));

    // POST /api/files/encrypt
    this.router.post("/encrypt", asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const { filePath } = req.body;
      if (!filePath) throw new ValidationError("filePath is required");
      const result = this.service.encryptFile(req.user.userId, filePath);
      res.status(200).json(result);
    }));

    // POST /api/files/decrypt
    this.router.post("/decrypt", asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const { filePath } = req.body;
      if (!filePath) throw new ValidationError("filePath is required");
      const result = this.service.decryptFile(req.user.userId, filePath);
      res.status(200).json(result);
    }));

    // POST /api/files/delete
    this.router.post("/delete", asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const { filePath } = req.body;
      if (!filePath) throw new ValidationError("filePath is required");
      const result = this.service.deleteFile(req.user.userId, filePath);
      res.status(200).json(result);
    }));

    // GET /api/files/encrypted — list encrypted files for user
    this.router.get("/encrypted", asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const files = this.service.getEncryptedFiles(req.user.userId);
      res.status(200).json({ files });
    }));
  }
}