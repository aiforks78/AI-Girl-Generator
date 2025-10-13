/**
 * 🎀 Girl Generator - secure logging utilities
 *
 * Provides:
 * - Logging with sensitive-field filtering
 * - Protection against leaking database error details
 * - Structured error logging helpers
 *
 * ⚠️ Server-side usage only
 */

import 'server-only';

// Patterns that indicate sensitive content
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /credential/i,
  /connection string/i,
  /database.*error/i,
  /sql.*error/i,
  /constraint.*violation/i,
  /duplicate.*key/i,
  /relation.*does not exist/i,
  /column.*does not exist/i,
  /syntax error/i,
  /permission denied/i
];

// Log level enumeration
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

// Context passed to log entries
export interface LogContext {
  userId?: string;
  operation?: string;
  component?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Sanitize a message and strip sensitive data
 */
function sanitizeMessage(message: string): string {
  let sanitized = message;
  
  // Detect sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(sanitized)) {
      // Replace with a generic error when sensitive data is found
      return 'Operation failed - details logged for debugging';
    }
  }
  
  // Remove potential SQL error details
  sanitized = sanitized.replace(/DETAIL:.*$/gm, '');
  sanitized = sanitized.replace(/HINT:.*$/gm, '');
  sanitized = sanitized.replace(/CONTEXT:.*$/gm, '');
  
  return sanitized;
}

/**
 * Sanitize an error payload
 */
function sanitizeError(error: unknown): string {
  if (!error) return 'Unknown error';
  
  // String errors can be sanitized directly
  if (typeof error === 'string') {
    return sanitizeMessage(error);
  }
  
  // Handle Error instances
  if (error instanceof Error) {
    return sanitizeMessage(error.message);
  }
  
  // Handle database-style error objects
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return sanitizeMessage(String((error as { message: unknown }).message));
  }
  
  // Fallback: stringify then sanitize
  return sanitizeMessage(String(error));
}

/**
 * Secure logger implementation
 */
export class SecureLogger {
  private component: string;
  
  constructor(component: string) {
    this.component = component;
  }
  
  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * Log errors with sanitization
   */
  error(message: string, error?: unknown, context?: LogContext) {
    const sanitizedMessage = sanitizeMessage(message);
    const sanitizedError = error ? sanitizeError(error) : undefined;
    
    this.log(LogLevel.ERROR, sanitizedMessage, {
      ...context,
      error: sanitizedError
    });
    
    // Emit full error details in development for debugging
    if (process.env.NODE_ENV === 'development' && error) {
      console.error('[DEV] Full error details:', error);
    }
  }
  
  /**
   * Log debug messages (development only)
   */
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, message, context);
    }
  }
  
  /**
   * Core logging primitive
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message: sanitizeMessage(message),
      ...context
    };
    
    // Choose console method based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(JSON.stringify(logEntry));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logEntry));
        break;
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(logEntry));
        break;
      default:
        console.log(JSON.stringify(logEntry));
    }
  }
}

/**
 * Factory for component-scoped loggers
 */
export function createSecureLogger(component: string): SecureLogger {
  return new SecureLogger(component);
}

/**
 * Global secure logger instance
 */
export const secureLogger = createSecureLogger('girl-generator');

/**
 * Dedicated logger for database operations
 */
export const dbLogger = createSecureLogger('database');

/**
 * Dedicated logger for API operations
 */
export const apiLogger = createSecureLogger('api');

/**
 * Dedicated logger for credit system flows
 */
export const creditLogger = createSecureLogger('credit-system');

/**
 * Convenience error logging helper
 */
export function logSecureError(
  component: string,
  operation: string,
  error: unknown,
  context?: Omit<LogContext, 'component' | 'operation'>
) {
  const logger = createSecureLogger(component);
  logger.error(`${operation} failed`, error, {
    operation,
    ...context
  });
}

/**
 * Convenience helper for database errors
 */
export function logDatabaseError(
  operation: string,
  error: unknown,
  context?: Omit<LogContext, 'component' | 'operation'>
) {
  logSecureError('database', operation, error, context);
}

/**
 * Convenience helper for API errors
 */
export function logApiError(
  endpoint: string,
  error: unknown,
  context?: Omit<LogContext, 'component' | 'operation'>
) {
  logSecureError('api', endpoint, error, context);
}
