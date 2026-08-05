/**
 * Structured logger for the Cobentt platform.
 *
 * Outputs JSON-structured logs with correlation IDs, timestamps,
 * and severity levels. Compatible with log aggregation tools
 * (Datadog, CloudWatch, GCP Logging, etc.)
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  durationMs?: number;
  statusCode?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "cobentt",
    context,
  };
  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  const line = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") console.debug(line);
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => log("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext, err?: Error) => log("error", msg, ctx, err),

  /** Create a child logger with pre-bound context (e.g. requestId). */
  child: (baseContext: LogContext) => ({
    debug: (msg: string, ctx?: LogContext) => log("debug", msg, { ...baseContext, ...ctx }),
    info: (msg: string, ctx?: LogContext) => log("info", msg, { ...baseContext, ...ctx }),
    warn: (msg: string, ctx?: LogContext) => log("warn", msg, { ...baseContext, ...ctx }),
    error: (msg: string, ctx?: LogContext, err?: Error) =>
      log("error", msg, { ...baseContext, ...ctx }, err),
  }),
};

/**
 * Generate a short unique request ID for correlation.
 * Format: req_<8 hex chars>
 */
export function generateRequestId(): string {
  return `req_${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Timing helper — returns elapsed ms since creation.
 */
export function createTimer() {
  const start = performance.now();
  return {
    elapsedMs: () => Math.round(performance.now() - start),
  };
}
