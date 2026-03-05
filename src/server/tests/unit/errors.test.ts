import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "../../src/utils/errors";

describe("Custom Error Classes", () => {
  describe("AppError", () => {
    it("should create with default values", () => {
      const error = new AppError("Something went wrong");
      expect(error.message).toBe("Something went wrong");
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.stack).toBeDefined();
    });

    it("should accept custom statusCode", () => {
      const error = new AppError("Bad request", 400);
      expect(error.statusCode).toBe(400);
    });

    it("should accept isOperational flag", () => {
      const error = new AppError("Fatal crash", 500, false);
      expect(error.isOperational).toBe(false);
    });

    it("should maintain proper stack trace", () => {
      const error = new AppError("Trace test");
      expect(error.stack).toContain("Trace test");
    });

    it("should pass instanceof checks correctly", () => {
      const error = new AppError("test");
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("ValidationError", () => {
    it("should set statusCode to 400", () => {
      const error = new ValidationError("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Invalid input");
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe("UnauthorizedError", () => {
    it("should set statusCode to 401 with default message", () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized");
    });

    it("should accept custom message", () => {
      const error = new UnauthorizedError("Token expired");
      expect(error.message).toBe("Token expired");
      expect(error).toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("ForbiddenError", () => {
    it("should set statusCode to 403 with default message", () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Access denied");
    });

    it("should accept custom message", () => {
      const error = new ForbiddenError("Insufficient role");
      expect(error.message).toBe("Insufficient role");
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe("NotFoundError", () => {
    it("should set statusCode to 404 with default message", () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Resource not found");
    });

    it("should accept custom message", () => {
      const error = new NotFoundError("User not found");
      expect(error.message).toBe("User not found");
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe("ConflictError", () => {
    it("should set statusCode to 409", () => {
      const error = new ConflictError("Username already exists");
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Username already exists");
      expect(error).toBeInstanceOf(ConflictError);
    });
  });

  describe("InternalServerError", () => {
    it("should set statusCode to 500 with default message", () => {
      const error = new InternalServerError();
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Internal server error");
    });

    it("should accept custom message", () => {
      const error = new InternalServerError(
        "Database connection failed",
      );
      expect(error.message).toBe("Database connection failed");
      expect(error).toBeInstanceOf(InternalServerError);
    });
  });

  describe("Error hierarchy", () => {
    it("all errors should be instances of AppError", () => {
      const errors = [
        new ValidationError("test"),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError("test"),
        new InternalServerError(),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(Error);
        expect(error.isOperational).toBe(true);
      });
    });
  });
});
