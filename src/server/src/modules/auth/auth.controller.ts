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
        // rememberMe is optional and saved separately in attachDTO
        const dto = req.body as loginDTO;
        dto.rememberMe = (req as any)._rememberMe;
        const { status, body, error } = await this.authService.login(dto);
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

    // Update user profile (protected route)
    this.authRouter.put(
      "/profile",
      authMiddleware.verifySession,
      asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
          const userId = req.user!.userId;
          const { name, email, bio } = req.body;
          const { status, body, error } =
            await this.authService.updateProfile(userId, { name, email, bio });
          res.status(status).json(error ? { error } : body);
        },
      ),
    );

    // Verify a remember token and create a new session (for app restart persistence)
    this.authRouter.post(
      "/verify-remember",
      asyncHandler(async (req: CustomRequest, res: Response) => {
        const { rememberToken } = req.body;
        if (!rememberToken) {
          res.status(400).json({ error: "Remember token is required" });
          return;
        }
        const { status, body, error } =
          await this.authService.verifyRememberToken(rememberToken);
        res.status(status).json(error ? { error } : body);
      }),
    );

    // Verify email exists for password reset
    this.authRouter.post(
      "/verify-email",
      asyncHandler(async (req: CustomRequest, res: Response) => {
        const { email } = req.body;
        if (!email) {
          res.status(400).json({ error: "Email is required" });
          return;
        }
        const { status, body, error } =
          await this.authService.verifyEmail(email);
        res.status(status).json(error ? { error } : body);
      }),
    );

    // Reset password using email verification
    this.authRouter.post(
      "/reset-password",
      asyncHandler(async (req: CustomRequest, res: Response) => {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
          res.status(400).json({ error: "Email and new password are required" });
          return;
        }
        if (typeof newPassword === "string" && newPassword.length < 4) {
          res.status(400).json({ error: "Password must be at least 4 characters" });
          return;
        }
        const { status, body, error } =
          await this.authService.resetPassword(email, newPassword);
        res.status(status).json(error ? { error } : body);
      }),
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
        // Save optional rememberMe before DTO validation strips it
        (req as any)._rememberMe = req.body?.rememberMe === true;
      }

      if (req.path === "/register") {
        req.dto = new registerDTO();
      }

      // No DTOs needed for logout, verify, me, profile, verify-remember, or reset-password endpoints
      if (
        req.path === "/logout" ||
        req.path === "/verify" ||
        req.path === "/me" ||
        req.path === "/profile" ||
        req.path === "/verify-remember" ||
        req.path === "/verify-email" ||
        req.path === "/reset-password"
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
