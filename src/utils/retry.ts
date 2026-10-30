import { DriveRateLimitError } from '../errors.js';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Checks if an error returned by Google Drive is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const status = error.status || error.statusCode || error.response?.status;
  if (status && DEFAULT_RETRYABLE_STATUSES.has(status)) {
    return true;
  }

  // Check error message or Google error reasons
  const message = (error.message || '').toLowerCase();
  if (
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('userate') ||
    message.includes('backend error') ||
    message.includes('socket hang up') ||
    message.includes('econnreset') ||
    message.includes('etimedout')
  ) {
    return true;
  }

  const errors = error.errors || error.response?.data?.error?.errors;
  if (Array.isArray(errors)) {
    for (const e of errors) {
      if (e.reason === 'rateLimitExceeded' || e.reason === 'userRateLimitExceeded' || e.reason === 'backendError') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Executes an async operation with exponential backoff and full jitter
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 32000;
  const shouldRetry = options.shouldRetry ?? isRetryableError;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt > maxRetries || !shouldRetry(error)) {
        if (error?.status === 429 || error?.response?.status === 429) {
          throw new DriveRateLimitError(
            `Drive API rate limit exceeded after ${attempt} attempts.`,
            undefined,
            error
          );
        }
        throw error;
      }

      // Calculate exponential backoff with full jitter: delay = random_between(0, min(maxDelay, base * 2^attempt))
      const calculatedDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const jitterDelay = Math.floor(Math.random() * calculatedDelay);

      await new Promise((resolve) => setTimeout(resolve, jitterDelay));
    }
  }
}

