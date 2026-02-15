import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

/**
 * Global error handling middleware
 * Catches all errors and sends appropriate responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Log error for debugging
  console.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
      }),
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    error: "An unexpected error occurred",
    ...(process.env.NODE_ENV === "development" && {
      message: err.message,
      stack: err.stack,
    }),
  });
}

/**
 * Wrapper for async route handlers to catch errors and pass to error middleware
 */
export function asyncHandler(
  fn: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
}
