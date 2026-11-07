import { EventEmitter } from 'node:events';
import type { drive_v3 } from '@googleapis/drive';
import type { DriveApiFile } from '../types.js';
import { withRetry } from '../utils/retry.js';

export interface WatcherOptions {
  /** Polling interval in milliseconds (default: 5000) */
  intervalMs?: number;
  /** Restrict changes to a specific folder ID or path */
  folderId?: string;
  /** Whether to emit initial existing files on startup (default: false) */
  emitInitial?: boolean;
}

export interface FileChangeEvent {
  type: 'create' | 'modify' | 'delete';
  fileId: string;
  file?: DriveApiFile;
  removed?: boolean;
  time: Date;
}

/**
 * Real-time Google Drive Change Watcher
 * Listens for new files, updates, and deletions using the Google Drive Changes API.
 */
export class DriveWatcher extends EventEmitter {
  private drive: drive_v3.Drive;
  private options: WatcherOptions;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private pageToken: string | null = null;

  constructor(drive: drive_v3.Drive, options: WatcherOptions = {}) {
    super();
    this.drive = drive;
    this.options = {
      intervalMs: 5000,
      ...options,
    };
  }

  /**
   * Starts listening for changes
   */
  async start(): Promise<this> {
    if (this.isRunning) return this;
    this.isRunning = true;

    // Get initial start page token
    if (!this.pageToken) {
      const tokenRes = await withRetry(async () => {
        return await this.drive.changes.getStartPageToken({
          supportsAllDrives: true,
        });
      });
      this.pageToken = tokenRes.data.startPageToken || null;
    }

    this.poll();
    return this;
  }

  /**
   * Stops listening
   */
  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emit('stop');
  }

  /**
   * Internal polling cycle
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      if (!this.pageToken) {
        const tokenRes = await withRetry(async () => {
          return await this.drive.changes.getStartPageToken({
            supportsAllDrives: true,
          });
        });
        this.pageToken = tokenRes.data.startPageToken || null;
      }

      let nextPageToken = this.pageToken;

      do {
        const res = await withRetry(async () => {
          return await this.drive.changes.list({
            pageToken: nextPageToken!,
            fields: 'nextPageToken, newStartPageToken, changes(changeType, fileId, removed, time, file(id, name, mimeType, size, createdTime, modifiedTime, parents, trashed))',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
        });

        const changes = res.data.changes || [];

        for (const change of changes) {
          if (!change.fileId) continue;

          // If restricted to a folder, check parents
          if (this.options.folderId && change.file) {
            const parents = change.file.parents || [];
            if (!parents.includes(this.options.folderId)) {
              continue;
            }
          }

          let eventType: 'create' | 'modify' | 'delete' = 'modify';
          if (change.removed || change.file?.trashed) {
            eventType = 'delete';
          } else if (change.file?.createdTime && change.file?.modifiedTime) {
            const created = new Date(change.file.createdTime).getTime();
            const modified = new Date(change.file.modifiedTime).getTime();
            if (Math.abs(modified - created) < 2000) {
              eventType = 'create';
            }
          }

          const eventPayload: FileChangeEvent = {
            type: eventType,
            fileId: change.fileId,
            file: change.file || undefined,
            removed: change.removed || false,
            time: change.time ? new Date(change.time) : new Date(),
          };

          this.emit('change', eventPayload);
          this.emit(eventType, eventPayload);
        }

        if (res.data.newStartPageToken) {
          this.pageToken = res.data.newStartPageToken;
          break;
        }

        nextPageToken = res.data.nextPageToken || null;
      } while (nextPageToken);
    } catch (err) {
      this.emit('error', err);
    } finally {
      if (this.isRunning) {
        this.timer = setTimeout(() => this.poll(), this.options.intervalMs);
      }
    }
  }
}

