import { authService } from "./auth.service";
import { NextFunction, Response, Router } from "express";
import { CustomRequest, loginDTO, registerDTO } from "./dto";

export class authController {
  private readonly authService: authService;
  private readonly authRouter: Router;
  private readonly path: string = "/auth";

  constructor(DB_PATH: string) {
    this.authService = new authService(DB_PATH);
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
      (req: CustomRequest, res: Response) => {
        const { status, body, message } = this.authService.login(req.body as loginDTO);;
        res.status(status).json(body || message);
      },
    );

    this.authRouter.post(
      "/register",
      (req: CustomRequest, res: Response) => {
        const { status, body, message } = this.authService.register(
          req.body as registerDTO,
        );
        res.status(status).json(body || message);
      },
    );
  }

  // Custom Middleares:

  private attachDTO(
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) {
    // attach DTO to request
    if (req.path === "/login") {
      req.dto = new loginDTO();
    }

    if (req.path === "/register") {
      req.dto = new registerDTO();
    }

    req.dto = null;
    next();
  }

  private DTOValidator(
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) {
    // validate login DTO

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
  }
}
