/**
 * Structured JSON logger for the Kratos MCP Server
 *
 * Uses console.error to output logs to stderr (required for MCP stdio servers)
 * @module logging/logger
 */

import type { Config } from "../config.js";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId?: string;
  tool?: string;
  resource?: string;
  kratosEndpoint?: string;
  durationMs?: number;
  message: string;
  error?: {
    code?: string;
    message?: string;
  };
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export class Logger {
  private minLevel: LogLevel;

  constructor(config: Pick<Config, "logLevel">) {
    this.minLevel = config.logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.minLevel];
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }
    console.error(JSON.stringify(entry));
  }

  trace(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>,
  ): void {
    this.log({ timestamp: new Date().toISOString(), level: "trace", message, ...context });
  }

  debug(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>,
  ): void {
    this.log({ timestamp: new Date().toISOString(), level: "debug", message, ...context });
  }

  info(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>,
  ): void {
    this.log({ timestamp: new Date().toISOString(), level: "info", message, ...context });
  }

  warn(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>,
  ): void {
    this.log({ timestamp: new Date().toISOString(), level: "warn", message, ...context });
  }

  error(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>,
  ): void {
    this.log({ timestamp: new Date().toISOString(), level: "error", message, ...context });
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

  trace(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message" | "correlationId">>,
  ): void {
    this.parent.trace(message, { ...context, correlationId: this.correlationId });
  }

  debug(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message" | "correlationId">>,
  ): void {
    this.parent.debug(message, { ...context, correlationId: this.correlationId });
  }

  info(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message" | "correlationId">>,
  ): void {
    this.parent.info(message, { ...context, correlationId: this.correlationId });
  }

  warn(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message" | "correlationId">>,
  ): void {
    this.parent.warn(message, { ...context, correlationId: this.correlationId });
  }

  error(
    message: string,
    context?: Partial<Omit<LogEntry, "timestamp" | "level" | "message" | "correlationId">>,
  ): void {
    this.parent.error(message, { ...context, correlationId: this.correlationId });
  }
}

/**
 * Generate a unique correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
