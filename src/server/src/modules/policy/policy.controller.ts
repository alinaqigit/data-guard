import { policyService } from "./policy.service";
import { NextFunction, Response, Router } from "express";
import {
  CustomRequest,
  createPolicyDTO,
  updatePolicyDTO,
} from "./dto";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../auth/auth.middleware";

export class policyController {
  private readonly policyService: policyService;
  private readonly policyRouter: Router;
  public readonly path: string = "/policies";

  constructor(policyService: policyService) {
    this.policyService = policyService;
    this.policyRouter = Router();

    // All policy routes require authentication
    this.policyRouter.use(authMiddleware.verifySession);

    // Map middlewares and routes
    this.mapMiddlewares();
    this.mapRoutes();
  }

  public getRouter() {
    return this.policyRouter;
  }

  private mapMiddlewares() {
    this.policyRouter.use(this.attachDTO.bind(this));
    this.policyRouter.use(this.DTOValidator.bind(this));
  }

  private mapRoutes() {
    // Create policy
    this.policyRouter.post(
      "/",
      async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const { status, body, error } =
          await this.policyService.createPolicy(
            req.body as createPolicyDTO,
            req.user.userId,
          );
        res.status(status).json(error ? { error } : body);
      },
    );

    // Get all policies for current user
    this.policyRouter.get(
      "/",
      async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const { status, body, error } =
          await this.policyService.getAllPolicies(req.user.userId);
        res.status(status).json(error ? { error } : body);
      },
    );

    // Get single policy by ID
    this.policyRouter.get(
      "/:id",
      async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const idParam = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
          return res.status(400).json({ error: "Invalid policy ID" });
        }

        const { status, body, error } =
          await this.policyService.getPolicyById(id, req.user.userId);
        res.status(status).json(error ? { error } : body);
      },
    );

    // Update policy
    this.policyRouter.put(
      "/:id",
      async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const idParam = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
          return res.status(400).json({ error: "Invalid policy ID" });
        }

        const { status, body, error } =
          await this.policyService.updatePolicy(
            id,
            req.body as updatePolicyDTO,
            req.user.userId,
          );
        res.status(status).json(error ? { error } : body);
      },
    );

    // Toggle policy status (enable/disable)
    this.policyRouter.patch(
      "/:id/toggle",
      async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const idParam = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
          return res.status(400).json({ error: "Invalid policy ID" });
        }

        const { status, body, error } =
          await this.policyService.togglePolicyStatus(
            id,
            req.user.userId,
          );
        res.status(status).json(error ? { error } : body);
      },
    );

    // Delete policy
    this.policyRouter.delete(
      "/:id",
      async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const idParam = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
          return res.status(400).json({ error: "Invalid policy ID" });
        }

        const { status, body, error } =
          await this.policyService.deletePolicy(id, req.user.userId);
        res.status(status).json(error ? { error } : body);
      },
    );
  }

  // Custom Middlewares:

  private attachDTO(
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) {
    req.dto = null;

    // POST / - Create policy
    if (req.method === "POST" && req.path === "/") {
      req.dto = new createPolicyDTO();
    }

    // PUT /:id - Update policy
    if (req.method === "PUT" && req.path.match(/^\/\d+$/)) {
      req.dto = new updatePolicyDTO();
    }

    // GET, DELETE, and PATCH don't need DTOs
    if (
      req.method === "GET" ||
      req.method === "DELETE" ||
      req.method === "PATCH"
    ) {
      req.dto = true; // Skip validation
    }

    next();
  }

  private DTOValidator(
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) {
    // Skip validation for endpoints without DTOs
    if (req.dto === true) {
      return next();
    }

    if (!req.dto) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const errors = [];
    let validatedDTO: any = {};
    const isUpdateRequest = req.method === "PUT";

    for (const key in req.dto) {
      if (req.body && key in req.body) {
        // For update requests, treat empty strings as "not provided" (except description which can be empty)
        if (
          isUpdateRequest &&
          typeof req.body[key] === "string" &&
          req.body[key].trim() === "" &&
          key !== "description"
        ) {
          // Skip this field - treat as not provided
          continue;
        }

        // Type validation
        if (typeof req.body[key] !== typeof req.dto[key]) {
          errors.push(
            `${key} should be of type ${typeof req.dto[key]}`,
          );
        } else if (
          !isUpdateRequest &&
          typeof req.body[key] === "string" &&
          req.body[key].trim() === "" &&
          key !== "description" // description can be empty
        ) {
          errors.push(`${key} cannot be empty`);
        } else {
          validatedDTO[key] = req.body[key];
        }
      } else {
        // For update requests, fields are optional (partial updates allowed)
        // For create requests, all fields are required
        if (!isUpdateRequest) {
          errors.push(`${key} is required`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json(errors);
    }

    // Safely attach the validated DTO to the request object
    req.body = validatedDTO;
    next();
  }
}
