import type { drive_v3 } from '@googleapis/drive';
import type { OAuth2Client } from 'google-auth-library';

export type DriveApiFile = drive_v3.Schema$File;
export type DriveApiFileList = drive_v3.Schema$FileList;
export type DriveApiPermission = drive_v3.Schema$Permission;

/**
 * Authentication configuration options for DriveKit
 */
export interface DriveKitAuthConfig {
  /** Path to Google Service Account JSON file */
  keyFilePath?: string;
  /** Parsed Service Account JSON object */
  credentials?: {
    client_email?: string;
    private_key?: string;
    project_id?: string;
    [key: string]: any;
  };
  /** Pre-existing OAuth2Client or access token */
  oauth2Client?: OAuth2Client;
  /** Direct bearer access token */
  accessToken?: string;
  /** OAuth2 Client Credentials for OAuth flow */
  oauth?: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    refreshToken?: string;
  };
  /** Scopes (defaults to full drive scope: ['https://www.googleapis.com/auth/drive']) */
  scopes?: string[];
}

/**
 * Global configuration options for DriveKit instance
 */
export interface DriveKitOptions {
  auth?: DriveKitAuthConfig;
  /** Root folder ID to restrict operations (defaults to 'root') */
  rootFolderId?: string;
  /** Default chunk size in bytes for resumable uploads (default: 8MB) */
  uploadChunkSize?: number;
  /** Maximum parallel operations for batch/sync (default: 4) */
  concurrency?: number;
  /** Cache folder paths to reduce API queries (default: true) */
  enablePathCache?: boolean;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  pathCacheTTL?: number;
  /** Enable persistent SQLite metadata cache for 0ms path resolution across sessions (default: true) */
  enablePersistentCache?: boolean;
  /** Custom path to the SQLite cache database file (default: ~/.drivekit/cache.db) */
  cacheDatabasePath?: string;
  /** Number of retry attempts for 429/5xx errors (default: 5) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  retryBaseDelayMs?: number;
}

/**
 * Upload progress event payload
 */
export interface UploadProgress {
  /** Bytes transferred so far */
  bytesSent: number;
  /** Total bytes of the file */
  totalBytes: number;
  /** Percentage completed (0 - 100) */
  percentage: number;
  /** Current transfer speed in bytes per second */
  bytesPerSecond: number;
  /** Formatted speed (e.g. "4.2 MB/s") */
  speedFormatted: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemainingSeconds: number;
  /** Chunk index currently sent */
  chunkIndex: number;
  /** Total chunks */
  totalChunks: number;
}

/**
 * Download progress event payload
 */
export interface DownloadProgress {
  bytesRead: number;
  totalBytes?: number;
  percentage?: number;
  bytesPerSecond: number;
  speedFormatted: string;
}

/**
 * File upload parameters
 */
export interface UploadOptions {
  /** Local file path, Buffer, or Readable stream */
  source: string | Buffer | NodeJS.ReadableStream;
  /** Target file name on Google Drive */
  name?: string;
  /** Target parent folder ID or virtual path (e.g. '/Backups/2026') */
  parent?: string;
  /** MIME type (inferred automatically if omitted) */
  mimeType?: string;
  /** File description */
  description?: string;
  /** Custom chunk size for this specific upload */
  chunkSize?: number;
  /** Progress callback */
  onProgress?: (progress: UploadProgress) => void;
  /** Whether to overwrite file with same name in destination */
  overwrite?: boolean;
  /** Whether to enable instant upload deduplication by file MD5 hash */
  deduplicate?: boolean;
  /** Alias for target file name */
  filename?: string;
  /** Custom properties / metadata */
  properties?: Record<string, string>;
  appProperties?: Record<string, string>;
  /** Optional AbortSignal for instant operation cancellation */
  signal?: AbortSignal;
}

/**
 * File download parameters
 */
export interface DownloadOptions {
  /** Destination local file path (if saving to disk) */
  destination?: string;
  /** Progress callback */
  onProgress?: (progress: DownloadProgress) => void;
  /** Export MIME type for Google Workspace documents */
  exportMimeType?: string;
  /** Optional AbortSignal for instant operation cancellation */
  signal?: AbortSignal;
}

/**
 * Permission role types
 */
export type PermissionRole = 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';

/**
 * Permission grantee types
 */
export type PermissionType = 'user' | 'group' | 'domain' | 'anyone';

/**
 * Share file options
 */
export interface ShareOptions {
  role?: PermissionRole;
  type?: PermissionType;
  emailAddress?: string;
  domain?: string;
  sendNotificationEmail?: boolean;
  emailMessage?: string;
  transferOwnership?: boolean;
}

/**
 * Directory sync summary
 */
export interface SyncResult {
  uploaded: { localPath: string; fileId: string; name: string }[];
  skipped: { localPath: string; name: string; reason: string }[];
  failed: { localPath: string; error: Error }[];
  totalBytes: number;
  durationMs: number;
}

