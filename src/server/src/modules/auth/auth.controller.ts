import { authService } from "./auth.service";
import { Router } from "express";

export class authController {
  private readonly authService: authService;
  private readonly authRouter: Router;
  private readonly path: string = "/auth";

  constructor(DB_PATH: string) {
    this.authService = new authService(DB_PATH);
    this.authRouter = Router();
  }

  public getRouter() {
    // Define your routes here, for example:
    // this.authRouter.post("/login", this.authService.login.bind(this.authService));

    this.authRouter.post("/login", (req, res) => {
      res.send({ message: "login route" });
    });

    this.authRouter.post("/register", (req, res) => {
      res.send({ message: "register route" });
    });

    return this.authRouter;
  }
}