/**
 * Structured JSON logger for the Kratos MCP Server
 *
 * Writes JSON lines to stderr (required for MCP stdio servers). An optional
 * sink can forward entries to the connected MCP client via the `logging`
 * capability.
 * @module logging/logger
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

/** Free-form structured context attached to a log entry */
export type LogContext = Record<string, unknown> & {
  tool?: string;
  resource?: string;
  durationMs?: number;
  error?: { code?: string; message?: string };
};

export interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
}

/** Receives every emitted entry (after level filtering) */
export type LogSink = (entry: LogEntry) => void;

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export class Logger {
  private minLevel: LogLevel;
  private sinks: LogSink[] = [];

  constructor(options: { logLevel: LogLevel }) {
    this.minLevel = options.logLevel;
  }

  /** Change the minimum level at runtime (e.g. from MCP `logging/setLevel`) */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /** Add an extra sink; stderr output is always kept */
  addSink(sink: LogSink): void {
    this.sinks.push(sink);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.minLevel];
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }
    const entry: LogEntry = { timestamp: new Date().toISOString(), level, message, ...context };
    console.error(JSON.stringify(entry));
    for (const sink of this.sinks) {
      try {
        sink(entry);
      } catch {
        // A failing sink must never break the server
      }
    }
  }

  trace(message: string, context?: LogContext): void {
    this.log("trace", message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  /**
   * Create a child logger with correlation ID bound
   */
  withCorrelationId(correlationId: string): CorrelatedLogger {
    return new CorrelatedLogger(this, correlationId);
  }
}

/**
 * Logger with a bound correlation ID for request tracing
 */
export class CorrelatedLogger {
  constructor(
    private parent: Logger,
    private correlationId: string,
  ) {}

  private log(level: LogLevel, message: string, context?: LogContext): void {
    this.parent.log(level, message, { ...context, correlationId: this.correlationId });
  }

  trace(message: string, context?: LogContext): void {
    this.log("trace", message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }
}

/**
 * Generate a unique correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
