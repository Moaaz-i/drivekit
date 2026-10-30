/**
 * Base DriveKit Error
 */
export class DriveKitError extends Error {
  public readonly code: string;
  public readonly originalError?: unknown;

  constructor(message: string, code = 'DRIVEKIT_ERROR', originalError?: unknown) {
    super(message);
    this.name = 'DriveKitError';
    this.code = code;
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Authentication Error
 */
export class DriveAuthError extends DriveKitError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'AUTH_ERROR', originalError);
    this.name = 'DriveAuthError';
  }
}

/**
 * Resource Not Found Error
 */
export class DriveNotFoundError extends DriveKitError {
  public readonly resourceIdOrPath: string;

  constructor(resourceIdOrPath: string, message?: string) {
    super(message || `Resource not found: "${resourceIdOrPath}"`, 'NOT_FOUND');
    this.name = 'DriveNotFoundError';
    this.resourceIdOrPath = resourceIdOrPath;
  }
}

/**
 * Rate limit / Quota exceeded Error
 */
export class DriveRateLimitError extends DriveKitError {
  public readonly retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number, originalError?: unknown) {
    super(message, 'RATE_LIMIT_EXCEEDED', originalError);
    this.name = 'DriveRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Upload Error (chunk or resumable session failure)
 */
export class DriveUploadError extends DriveKitError {
  public readonly bytesUploaded?: number;
  public readonly totalBytes?: number;

  constructor(message: string, bytesUploaded?: number, totalBytes?: number, originalError?: unknown) {
    super(message, 'UPLOAD_ERROR', originalError);
    this.name = 'DriveUploadError';
    this.bytesUploaded = bytesUploaded;
    this.totalBytes = totalBytes;
  }
}

