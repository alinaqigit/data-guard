import {
  errorHandler,
  asyncHandler,
  notFoundHandler,
} from "../../src/middleware/errorHandler";
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from "../../src/utils/errors";
import { mockRequest, mockResponse, mockNext } from "../helpers";

describe("Error Handler Middleware", () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });

  describe("errorHandler", () => {
    it("should handle AppError with correct status code", () => {
      const err = new AppError("Bad thing happened", 422);
      const req = mockRequest({ path: "/test", method: "GET" });
      const res = mockResponse();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad thing happened" }),
      );
    });

    it("should handle ValidationError (400)", () => {
      const err = new ValidationError("Missing field");
      const req = mockRequest({ path: "/api/test", method: "POST" });
      const res = mockResponse();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Missing field" }),
      );
    });

    it("should handle UnauthorizedError (401)", () => {
      const err = new UnauthorizedError();
      const req = mockRequest({ path: "/api/secure", method: "GET" });
      const res = mockResponse();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should handle NotFoundError (404)", () => {
      const err = new NotFoundError("Scan not found");
      const req = mockRequest({
        path: "/api/scans/999",
        method: "GET",
      });
      const res = mockResponse();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Scan not found" }),
      );
    });

    it("should handle generic Error with 500 status", () => {
      const err = new Error("Unexpected crash");
      const req = mockRequest({ path: "/api/data", method: "GET" });
      const res = mockResponse();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "An unexpected error occurred",
        }),
      );
    });

    it("should include stack trace in development mode", () => {
      process.env.NODE_ENV = "development";
      const err = new AppError("Dev error", 500);
      const req = mockRequest({ path: "/api/test", method: "GET" });
      const res = mockResponse();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ stack: expect.any(String) }),
      );
    });

    it("should NOT include stack trace in production mode", () => {
      process.env.NODE_ENV = "production";
      const err = new AppError("Prod error", 500);
      const req = mockRequest({ path: "/api/test", method: "GET" });
      const res = mockResponse();
      const next = mockNext();

      errorHandler(err, req, res, next);

      const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg.stack).toBeUndefined();
    });

    it("should log error details", () => {
      const err = new Error("Logged error");
      const req = mockRequest({ path: "/api/test", method: "POST" });
      const res = mockResponse();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error occurred:",
        expect.objectContaining({
          message: "Logged error",
          path: "/api/test",
          method: "POST",
        }),
      );
    });
  });

  describe("notFoundHandler", () => {
    it("should return 404 with route info", () => {
      const req = mockRequest({
        path: "/api/nonexistent",
        method: "GET",
      });
      const res = mockResponse();
      const next = mockNext();

      notFoundHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Route GET /api/nonexistent not found",
        }),
      );
    });

    it("should include method in error message", () => {
      const req = mockRequest({
        path: "/api/users",
        method: "DELETE",
      });
      const res = mockResponse();
      const next = mockNext();

      notFoundHandler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: "Route DELETE /api/users not found",
      });
    });
  });

  describe("asyncHandler", () => {
    it("should pass resolved result through", async () => {
      const handler = asyncHandler(async (req, res) => {
        res.json({ success: true });
      });

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(next).not.toHaveBeenCalled();
    });

    it("should catch async errors and pass to next", async () => {
      const handler = asyncHandler(async () => {
        throw new ValidationError("Async validation failed");
      });

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await handler(req, res, next);

      // asyncHandler calls next with the error
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it("should catch non-Error throws and pass to next", async () => {
      const handler = asyncHandler(async () => {
        throw "string error";
      });

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await handler(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
