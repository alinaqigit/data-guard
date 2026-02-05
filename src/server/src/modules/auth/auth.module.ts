import { authService } from "./auth.service";
import { authController } from "./auth.controller";

export class authModule {
  public readonly authService: authService;
  public readonly authController: authController;

  constructor(DB_PATH: string) {
    this.authService = new authService(DB_PATH);
    this.authController = new authController(DB_PATH);
  }
}