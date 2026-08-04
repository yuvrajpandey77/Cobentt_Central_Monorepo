/**
 * Standardized error types for the Cobentt platform.
 *
 * Every API error flows through one of these classes, ensuring
 * consistent response shapes and logging.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super("NOT_FOUND", `${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 400, true, details);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterMs?: number) {
    super("RATE_LIMITED", "Too many requests", 429, true, { retryAfterMs });
    this.name = "RateLimitError";
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = "Daily quota exceeded") {
    super("QUOTA_EXCEEDED", message, 429);
    this.name = "QuotaExceededError";
  }
}

export class AIProviderError extends AppError {
  constructor(provider: string, status: number, body?: string) {
    super("AI_PROVIDER_ERROR", `AI provider error (${provider}): ${status}`, 502, true, {
      provider,
      upstreamStatus: status,
      body: body?.slice(0, 500),
    });
    this.name = "AIProviderError";
  }
}

export class SandboxError extends AppError {
  constructor(message = "Sandbox operation failed") {
    super("SANDBOX_ERROR", message, 502);
    this.name = "SandboxError";
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("PAYMENT_ERROR", message, 400, true, details);
    this.name = "PaymentError";
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super("INTERNAL_ERROR", message, 500, false);
    this.name = "InternalError";
  }
}

/**
 * Convert any error into a standardized API response shape.
 */
export function toAPIResponse(error: unknown): {
  status: number;
  body: { error: string; code: string; details?: Record<string, unknown> };
} {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        error: process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
        code: "INTERNAL_ERROR",
      },
    };
  }

  return {
    status: 500,
    body: { error: "Unknown error", code: "UNKNOWN_ERROR" },
  };
}
