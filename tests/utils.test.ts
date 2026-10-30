import { describe, it, expect } from 'vitest';
import { formatBytes, formatSpeed, formatDuration } from '../src/utils/format.js';
import { lookupMimeType, isGoogleWorkspaceDoc, GOOGLE_WORKSPACE_MIME_TYPES } from '../src/utils/mime.js';
import { isRetryableError } from '../src/utils/retry.js';

describe('Format Utils', () => {
  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe('2 GB');
  });

  it('formats speed', () => {
    expect(formatSpeed(1024 * 1024 * 4)).toBe('4 MB/s');
  });

  it('formats duration', () => {
    expect(formatDuration(45)).toBe('0m 45s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(3665)).toBe('1h 1m 5s');
    expect(formatDuration(-1)).toBe('--:--');
  });
});

describe('MIME Utils', () => {
  it('detects common MIME types', () => {
    expect(lookupMimeType('test.pdf')).toBe('application/pdf');
    expect(lookupMimeType('image.png')).toBe('image/png');
    expect(lookupMimeType('archive.zip')).toBe('application/zip');
    expect(lookupMimeType('unknown.customext123')).toBe('application/octet-stream');
  });

  it('identifies Google Workspace docs correctly', () => {
    expect(isGoogleWorkspaceDoc(GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT)).toBe(true);
    expect(isGoogleWorkspaceDoc(GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET)).toBe(true);
    expect(isGoogleWorkspaceDoc(GOOGLE_WORKSPACE_MIME_TYPES.FOLDER)).toBe(false);
    expect(isGoogleWorkspaceDoc('application/pdf')).toBe(false);
  });
});

describe('Retry Utils', () => {
  it('identifies retryable error codes', () => {
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ status: 404 })).toBe(false);
    expect(isRetryableError({ message: 'User rate limit exceeded' })).toBe(true);
  });
});

