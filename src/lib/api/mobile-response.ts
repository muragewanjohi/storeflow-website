export type MobileErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SUBSCRIPTION_EXPIRED'
  | 'BAD_REQUEST';

export interface MobilePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MobileApiSuccessResponse<T> {
  success: true;
  data: T;
  pagination?: MobilePagination;
}

export interface MobileApiErrorResponse {
  success: false;
  error: {
    code: MobileErrorCode;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export function mobileSuccess<T>(
  data: T,
  pagination?: MobilePagination,
): MobileApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(pagination ? { pagination } : {}),
  };
}

export function mobileError(
  code: MobileErrorCode,
  message: string,
  details?: Array<{ field: string; message: string }>,
): MobileApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };
}

