import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { drive_v3 } from '@googleapis/drive';
import type { DriveApiFile } from '../types.js';
import { ConcurrencyPool } from './concurrency-pool.js';
import { Downloader } from './downloader.js';
import { withRetry } from '../utils/retry.js';
import { formatBytes } from '../utils/format.js';

/**
 * Calculates MD5 checksum of a local file via streams (low memory)
 */
export async function calculateFileMd5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export interface PullResult {
  downloaded: { remoteId: string; remoteName: string; localPath: string; size: number }[];
  skipped: { remoteId: string; remoteName: string; reason: string }[];
  failed: { remoteId: string; remoteName: string; error: Error }[];
  totalBytes: number;
  durationMs: number;
}

export class SmartSyncEngine {
  private drive: drive_v3.Drive;
  private downloader: Downloader;

  constructor(drive: drive_v3.Drive) {
    this.drive = drive;
    this.downloader = new Downloader(drive);
  }

  /**
   * Pulls (downloads) an entire Google Drive folder tree to a local directory
   */
  async pullFolder(
    remoteFolderId: string,
    localDestinationDir: string,
    options: {
      concurrency?: number;
      overwrite?: boolean;
      onFileStart?: (remoteName: string, relativePath: string) => void;
      onFileComplete?: (remoteName: string, localPath: string) => void;
    } = {}
  ): Promise<PullResult> {
    const startTime = Date.now();
    const concurrency = options.concurrency || 4;
    const pool = new ConcurrencyPool(concurrency);

    const result: PullResult = {
      downloaded: [],
      skipped: [],
      failed: [],
      totalBytes: 0,
      durationMs: 0,
    };

    await fs.promises.mkdir(localDestinationDir, { recursive: true });

    // Recursive remote listing
    const collectRemoteItems = async (folderId: string, relPath: string): Promise<{
      id: string;
      name: string;
      isFolder: boolean;
      relPath: string;
      size: number;
      md5Checksum?: string;
    }[]> => {
      const items: any[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const res = await withRetry(async () => {
          return await this.drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType, size, md5Checksum)',
            pageSize: 500,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
        });

        const files = res.data.files || [];
        for (const file of files) {
          if (!file.id || !file.name) continue;
          const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
          const fileRel = relPath ? path.join(relPath, file.name) : file.name;

          if (isFolder) {
            const sub = await collectRemoteItems(file.id, fileRel);
            items.push(...sub);
          } else {
            items.push({
              id: file.id,
              name: file.name,
              isFolder: false,
              relPath: fileRel,
              size: parseInt(file.size || '0', 10),
              md5Checksum: file.md5Checksum,
            });
          }
        }
        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);

      return items;
    };

    const remoteFiles = await collectRemoteItems(remoteFolderId, '');

    await pool.map(remoteFiles, async (remoteItem) => {
      const localFilePath = path.join(localDestinationDir, remoteItem.relPath);

      // Check if local file already exists and matches MD5 or size
      if (!options.overwrite && fs.existsSync(localFilePath)) {
        const localStat = await fs.promises.stat(localFilePath);
        if (remoteItem.md5Checksum) {
          const localMd5 = await calculateFileMd5(localFilePath);
          if (localMd5.toLowerCase() === remoteItem.md5Checksum.toLowerCase()) {
            result.skipped.push({
              remoteId: remoteItem.id,
              remoteName: remoteItem.name,
              reason: 'Identical MD5 checksum matches local file',
            });
            return;
          }
        } else if (localStat.size === remoteItem.size && remoteItem.size > 0) {
          result.skipped.push({
            remoteId: remoteItem.id,
            remoteName: remoteItem.name,
            reason: 'Identical file size exists locally',
          });
          return;
        }
      }

      try {
        if (options.onFileStart) {
          options.onFileStart(remoteItem.name, remoteItem.relPath);
        }

        await this.downloader.download(remoteItem.id, {
          destination: localFilePath,
        });

        result.downloaded.push({
          remoteId: remoteItem.id,
          remoteName: remoteItem.name,
          localPath: localFilePath,
          size: remoteItem.size,
        });
        result.totalBytes += remoteItem.size;

        if (options.onFileComplete) {
          options.onFileComplete(remoteItem.name, localFilePath);
        }
      } catch (err: any) {
        result.failed.push({
          remoteId: remoteItem.id,
          remoteName: remoteItem.name,
          error: err,
        });
      }
    });

    result.durationMs = Date.now() - startTime;
    return result;
  }
}

