/**
 * Custom error types for better error handling and classification
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(message, 500);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
