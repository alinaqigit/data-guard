import { authService } from "./auth.service";
import { authController } from "./auth.controller";

export class authModule {
  public readonly authService: authService;
  public readonly authController: authController;

  constructor(DB_PATH: string) {
    this.authService = new authService(DB_PATH);
    this.authController = new authController(this.authService);
  }
}

// Export middleware and helpers for use in other modules
export { authMiddleware } from "./auth.middleware";
export { SessionManager } from "./auth.session";
export type { SessionPayload } from "./auth.session";
export type { AuthenticatedRequest } from "./auth.middleware";
