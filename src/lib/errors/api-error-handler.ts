/**
 * API Error Handler Utility
 * 
 * Standardized error handling for API routes
 * Provides consistent error response format and proper HTTP status codes
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Standard API Error Response Format
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: any;
  code?: string;
}

/**
 * Error codes for different error types
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  status: number,
  details?: any,
  code?: ErrorCode
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error,
    message,
  };

  if (details) {
    response.details = details;
  }

  if (code) {
    response.code = code;
  }

  // In development, include more details
  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: z.ZodError): NextResponse<ApiErrorResponse> {
  const issues = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return createErrorResponse(
    'Validation failed',
    'Please check your input and try again',
    400,
    { issues },
    ErrorCode.VALIDATION_ERROR
  );
}

/**
 * Handle authentication errors
 */
export function handleAuthError(message: string = 'Authentication required'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    'Authentication required',
    message,
    401,
    undefined,
    ErrorCode.AUTHENTICATION_REQUIRED
  );
}

/**
 * Handle authorization errors
 */
export function handleAuthorizationError(message: string = 'Access denied'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    'Access denied',
    message,
    403,
    undefined,
    ErrorCode.AUTHORIZATION_DENIED
  );
}

/**
 * Handle not found errors
 */
export function handleNotFoundError(resource: string = 'Resource'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    'Not found',
    `${resource} not found`,
    404,
    undefined,
    ErrorCode.NOT_FOUND
  );
}

/**
 * Handle conflict errors (e.g., duplicate subdomain)
 */
export function handleConflictError(message: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    'Conflict',
    message,
    409,
    undefined,
    ErrorCode.CONFLICT
  );
}

/**
 * Handle internal server errors
 */
export function handleInternalError(
  error: unknown,
  userMessage: string = 'An unexpected error occurred'
): NextResponse<ApiErrorResponse> {
  // Log error for debugging
  console.error('Internal server error:', error);

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return createErrorResponse(
    'Internal server error',
    userMessage,
    500,
    isDevelopment ? { originalError: errorMessage } : undefined,
    ErrorCode.INTERNAL_ERROR
  );
}

/**
 * Main error handler for API routes
 * 
 * Use this in catch blocks to handle all error types consistently
 * 
 * @example
 * ```typescript
 * try {
 *   // API logic
 * } catch (error) {
 *   return handleApiError(error);
 * }
 * ```
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return handleValidationError(error);
  }

  // Handle Error instances
  if (error instanceof Error) {
    // Authentication errors
    if (error.message === 'Authentication required' || error.message.includes('Authentication required')) {
      return handleAuthError();
    }

    // Authorization errors
    if (error.message.includes('Access denied') || error.message.includes('required role')) {
      return handleAuthorizationError(error.message);
    }

    // Not found errors
    if (error.message.includes('not found') || error.message.includes('Not found')) {
      return handleNotFoundError();
    }

    // Conflict errors
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      return handleConflictError(error.message);
    }
  }

  // Default: internal server error
  return handleInternalError(error);
}

