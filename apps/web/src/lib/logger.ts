export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error | unknown;
}

class LoggerService {
  private isProduction = process.env.NODE_ENV === "production";

  private formatError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      };
    }
    return { message: String(error) };
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (error) {
      entry.error = this.formatError(error);
    }

    if (this.isProduction) {
      // In production, log as structured JSON
      console[level === "debug" ? "log" : level](JSON.stringify(entry));
    } else {
      // In development, pretty print
      const color = {
        info: "\x1b[36m", // Cyan
        warn: "\x1b[33m", // Yellow
        error: "\x1b[31m", // Red
        debug: "\x1b[90m", // Gray
      }[level];
      const reset = "\x1b[0m";

      console[level === "debug" ? "log" : level](
        `${color}[${level.toUpperCase()}]${reset} ${message}`,
        context || "",
        error || ""
      );
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>, error?: unknown) {
    this.log("warn", message, context, error);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    this.log("error", message, context, error);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("debug", message, context);
  }
}

export const Logger = new LoggerService();
