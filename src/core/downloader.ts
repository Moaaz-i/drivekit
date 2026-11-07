import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import type { drive_v3 } from '@googleapis/drive';
import type { DownloadOptions, DownloadProgress } from '../types.js';
import { isGoogleWorkspaceDoc, DEFAULT_EXPORT_MIMES, getExtensionForMime } from '../utils/mime.js';
import { formatSpeed } from '../utils/format.js';
import { withRetry } from '../utils/retry.js';

export class Downloader {
  private drive: drive_v3.Drive;

  constructor(drive: drive_v3.Drive) {
    this.drive = drive;
  }

  /**
   * Downloads a file from Google Drive to local destination path or returns a readable stream.
   */
  async download(fileId: string, options: DownloadOptions = {}): Promise<{
    filePath?: string;
    stream?: NodeJS.ReadableStream;
    name: string;
    mimeType: string;
    size?: number;
  }> {
    // 1. Check if metadata is pre-provided or needs remote fetch
    let name = options.metadata?.name;
    let mimeType = options.metadata?.mimeType;
    let totalBytes = options.metadata?.size;

    if (!name || !mimeType) {
      const metaRes = await withRetry(async () => {
        return await this.drive.files.get({
          fileId,
          fields: 'id, name, mimeType, size',
          supportsAllDrives: true,
        });
      });

      const file = metaRes.data;
      name = file.name || 'downloaded-file';
      mimeType = file.mimeType || 'application/octet-stream';
      totalBytes = file.size ? parseInt(file.size, 10) : undefined;
    }

    let downloadStream: NodeJS.ReadableStream;
    let finalFileName = name!;

    // 2. Determine if it's a Google Workspace document needing export
    if (isGoogleWorkspaceDoc(mimeType)) {
      const exportConfig = DEFAULT_EXPORT_MIMES[mimeType] || {
        mimeType: 'application/pdf',
        extension: '.pdf',
      };
      const targetMime = options.exportMimeType || exportConfig.mimeType;
      const ext = getExtensionForMime(targetMime) || exportConfig.extension;

      if (!finalFileName.endsWith(ext)) {
        finalFileName = `${finalFileName}${ext}`;
      }

      const res = await withRetry(async () => {
        return await this.drive.files.export(
          { fileId, mimeType: targetMime },
          { responseType: 'stream' }
        );
      });
      downloadStream = res.data as NodeJS.ReadableStream;
    } else {
      // Regular binary file download
      const res = await withRetry(async () => {
        return await this.drive.files.get(
          { fileId, alt: 'media', supportsAllDrives: true },
          { responseType: 'stream' }
        );
      });
      downloadStream = res.data as NodeJS.ReadableStream;
    }

    // 3. Attach progress tracker if requested
    let bytesRead = 0;
    const startTime = Date.now();

    const progressTracker = new Transform({
      transform(chunk, encoding, callback) {
        bytesRead += chunk.length;
        if (options.onProgress) {
          const elapsedSecs = (Date.now() - startTime) / 1000;
          const bytesPerSecond = elapsedSecs > 0 ? Math.round(bytesRead / elapsedSecs) : 0;
          const percentage = totalBytes ? Math.min(100, Math.round((bytesRead / totalBytes) * 1000) / 10) : undefined;

          options.onProgress({
            bytesRead,
            totalBytes,
            percentage,
            bytesPerSecond,
            speedFormatted: formatSpeed(bytesPerSecond),
          });
        }
        callback(null, chunk);
      },
    });

    const monitoredStream = downloadStream.pipe(progressTracker);

    // 4. Save to disk if destination provided, otherwise return stream
    if (options.destination) {
      let destPath = options.destination;
      // If destination is a directory, append finalFileName
      if (fs.existsSync(destPath) && fs.statSync(destPath).isDirectory()) {
        destPath = path.join(destPath, finalFileName);
      }

      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      const writeStream = fs.createWriteStream(destPath, { highWaterMark: 1024 * 1024 });
      await pipeline(monitoredStream, writeStream);

      return {
        filePath: destPath,
        name: finalFileName,
        mimeType,
        size: bytesRead,
      };
    }

    return {
      stream: monitoredStream,
      name: finalFileName,
      mimeType,
      size: totalBytes,
    };
  }

  /**
   * Returns a raw ReadableStream for the file, supporting HTTP Range requests for partial content / streaming.
   */
  async createReadStream(
    fileId: string,
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream> {
    const headers: Record<string, string> = {};
    if (options?.start !== undefined || options?.end !== undefined) {
      const start = options.start ?? 0;
      const end = options.end !== undefined ? options.end : '';
      headers['Range'] = `bytes=${start}-${end}`;
    }

    const res = await withRetry(async () => {
      return await this.drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream', headers }
      );
    });
    return res.data as NodeJS.ReadableStream;
  }
}

