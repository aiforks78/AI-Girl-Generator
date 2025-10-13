import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';

// Error types for Girl Generator
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  RATE_LIMITED = 'RATE_LIMITED',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  DATABASE = 'DATABASE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
  statusCode: number;
  userMessage?: string;
}

export class GirlGeneratorError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly userMessage?: string;

  constructor(type: ErrorType, message: string, statusCode: number = 500, details?: any, userMessage?: string) {
    super(message);
    this.name = 'GirlGeneratorError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return 'Please log in to continue.';
      case ErrorType.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';
      case ErrorType.INSUFFICIENT_CREDITS:
        return 'You don\'t have enough credits. Please purchase more credits.';
      case ErrorType.RATE_LIMITED:
        return 'Too many requests. Please try again later.';
      case ErrorType.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorType.EXTERNAL_API:
        return 'External service is temporarily unavailable. Please try again.';
      case ErrorType.NOT_FOUND:
        return 'The requested resource was not found.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  toApiResponse(): ApiError {
    return {
      type: this.type,
      message: this.userMessage || this.message,
      details: this.details,
      statusCode: this.statusCode,
      userMessage: this.userMessage,
    };
  }
}

// API Error Handler Wrapper
export function withErrorHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error, req);
    }
  };
}

// Main error handling function
export function handleApiError(error: unknown, req?: NextRequest): NextResponse {
  let apiError: ApiError;

  if (error instanceof GirlGeneratorError) {
    apiError = error.toApiResponse();
  } else if (error instanceof Error) {
    // Handle known error types
    if (error.message.includes('insufficient credits')) {
      apiError = new GirlGeneratorError(
        ErrorType.INSUFFICIENT_CREDITS,
        error.message,
        402
      ).toApiResponse();
    } else if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      apiError = new GirlGeneratorError(
        ErrorType.AUTHENTICATION,
        error.message,
        401
      ).toApiResponse();
    } else if (error.message.includes('rate limit')) {
      apiError = new GirlGeneratorError(
        ErrorType.RATE_LIMITED,
        error.message,
        429
      ).toApiResponse();
    } else {
      apiError = new GirlGeneratorError(
        ErrorType.INTERNAL,
        error.message,
        500
      ).toApiResponse();
    }
  } else {
    apiError = new GirlGeneratorError(
      ErrorType.INTERNAL,
      'An unexpected error occurred',
      500
    ).toApiResponse();
  }

  // Log error to Sentry
  const sentryId = Sentry.captureException(error, {
    tags: {
      component: 'api',
      errorType: apiError.type,
      endpoint: req?.url || 'unknown',
    },
    extra: {
      requestMethod: req?.method,
      requestUrl: req?.url,
      userAgent: req?.headers.get('user-agent'),
      details: apiError.details,
    },
  });

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', {
      error: apiError,
      originalError: error,
      sentryId,
      url: req?.url,
      method: req?.method,
    });
  }

  // Return error response
  return NextResponse.json(
    {
      success: false,
      error: {
        type: apiError.type,
        message: apiError.userMessage || apiError.message,
        ...(process.env.NODE_ENV === 'development' && {
          details: apiError.details,
          sentryId,
        }),
      },
    },
    { status: apiError.statusCode }
  );
}

// Utility functions for common errors
export const createAuthError = (message = 'Authentication required') =>
  new GirlGeneratorError(ErrorType.AUTHENTICATION, message, 401);

export const createInsufficientCreditsError = (required: number, available: number) =>
  new GirlGeneratorError(
    ErrorType.INSUFFICIENT_CREDITS,
    `Insufficient credits: required ${required}, available ${available}`,
    402,
    { required, available }
  );

export const createValidationError = (message: string, details?: any) =>
  new GirlGeneratorError(ErrorType.VALIDATION, message, 400, details);

export const createRateLimitError = (message = 'Rate limit exceeded') =>
  new GirlGeneratorError(ErrorType.RATE_LIMITED, message, 429);

export const createExternalApiError = (service: string, message: string) =>
  new GirlGeneratorError(
    ErrorType.EXTERNAL_API,
    `${service} error: ${message}`,
    502,
    { service }
  );

export const createDatabaseError = (message: string) =>
  new GirlGeneratorError(ErrorType.DATABASE, message, 500);

// Monitoring helper
export function logApiMetrics(
  endpoint: string,
  method: string,
  duration: number,
  success: boolean,
  userId?: string
) {
  Sentry.addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: success ? 'info' : 'error',
    data: {
      endpoint,
      method,
      duration,
      success,
      userId,
    },
  });

  // Log performance metrics
  if (duration > 5000) { // Log slow requests (>5s)
    Sentry.captureMessage(`Slow API request: ${method} ${endpoint}`, {
      level: 'warning',
      tags: {
        component: 'api-performance',
        endpoint,
        method,
      },
      extra: {
        duration,
        userId,
      },
    });
  }
}
