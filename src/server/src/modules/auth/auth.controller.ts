import { authService } from "./auth.service";
import e, { NextFunction, Response, Router } from "express";
import { CustomRequest, loginDTO, registerDTO } from "./dto";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "./auth.middleware";
import { asyncHandler } from "../../middleware/errorHandler";

export class authController {
  private readonly authService: authService;
  private readonly authRouter: Router;
  public readonly path: string = "/auth";

  constructor(authService: authService) {
    this.authService = authService;
    this.authRouter = Router();

    // Map middlewares and routes
    this.mapMiddlewares();
    this.mapRoutes();
  }

  public getRouter() {
    return this.authRouter;
  }

  private mapMiddlewares() {
    this.authRouter.use(this.attachDTO.bind(this));
    this.authRouter.use(this.DTOValidator.bind(this));
  }

  private mapRoutes() {
    this.authRouter.post(
      "/login",
      asyncHandler(async (req: CustomRequest, res: Response) => {
        // Body validation is handled by DTOValidator middleware
        const { status, body, error } = await this.authService.login(
          req.body as loginDTO,
        );
        res.status(status).json(error ? { error } : body);
      }),
    );

    this.authRouter.post(
      "/register",
      asyncHandler(async (req: CustomRequest, res: Response) => {
        // Body validation is handled by DTOValidator middleware
        const { status, body, error } =
          await this.authService.register(req.body as registerDTO);
        res.status(status).json(error ? { error } : body);
      }),
    );

    this.authRouter.post(
      "/logout",
      asyncHandler(async (req: CustomRequest, res: Response) => {
        const sessionId = req.headers["x-session-id"] as string;

        if (!sessionId) {
          res.status(400).json({ error: "No session ID provided" });
          return;
        }

        const { status, body, error } =
          await this.authService.logout(sessionId);
        res.status(status).json(error ? { error } : body);
      }),
    );

    // Protected route - requires valid session
    this.authRouter.get(
      "/verify",
      authMiddleware.verifySession,
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          const sessionId = req.headers["x-session-id"] as string;
          const { status, body, error } =
            await this.authService.verifySession(sessionId);
          res.status(status).json(error ? { error } : body);
        },
      ),
    );

    // Example: Get current user profile (protected route)
    this.authRouter.get(
      "/me",
      authMiddleware.verifySession,
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          res.status(200).json({
            user: req.user,
          });
        },
      ),
    );
  }

  // Custom Middleares:

  private attachDTO(
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      req.dto = null;

      // attach DTO to request
      if (req.path === "/login") {
        req.dto = new loginDTO();
      }

      if (req.path === "/register") {
        req.dto = new registerDTO();
      }

      // No DTOs needed for logout, verify, or me endpoints
      if (
        req.path === "/logout" ||
        req.path === "/verify" ||
        req.path === "/me"
      ) {
        req.dto = true; // Skip validation
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  private DTOValidator(
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // Skip validation for endpoints without DTOs
      if (req.dto === true) {
        return next();
      }

      if (!req.dto) {
        return res.status(400).json({ error: "Invalid request" });
      }
      const errors = [];
      let validatedDTO: any = {};

      for (const key in req.dto) {
        if (req.body && key in req.body) {
          if (typeof req.body[key] !== typeof req.dto[key]) {
            errors.push(
              `${key} should be of type ${typeof req.dto[key]}`,
            );
          } else if (
            typeof req.body[key] === "string" &&
            req.body[key].trim() === ""
          ) {
            errors.push(`${key} cannot be empty`);
          } else {
            validatedDTO[key] = req.body[key];
          }
        } else {
          errors.push(`${key} is required`);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json(errors);
      }

      //safely attach the validated DTO to the request object
      req.body = validatedDTO;
      next();
    } catch (error) {
      next(error);
    }
  }
}
