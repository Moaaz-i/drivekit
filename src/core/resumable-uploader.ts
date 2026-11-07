import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import type { drive_v3 } from '@googleapis/drive';
import type { UploadOptions, UploadProgress, DriveApiFile } from '../types.js';
import { DriveUploadError } from '../errors.js';
import { formatSpeed } from '../utils/format.js';
import { lookupMimeType } from '../utils/mime.js';
import { withRetry } from '../utils/retry.js';
import { getOptimizedHttpsAgent } from '../utils/http-agent.js';

/** Minimum Google Drive chunk granularity: 256 KiB */
export const MIN_CHUNK_SIZE = 256 * 1024;
/** Default chunk size: 8 MiB (must be multiple of 256 KiB) */
export const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;
/** Files smaller than this can use direct single-request multipart upload */
export const MULTIPART_THRESHOLD = 5 * 1024 * 1024;

export class ResumableUploader {
  private drive: drive_v3.Drive;
  private defaultChunkSize: number;

  constructor(drive: drive_v3.Drive, defaultChunkSize = DEFAULT_CHUNK_SIZE) {
    this.drive = drive;
    // Ensure chunk size is multiple of 256 KiB
    this.defaultChunkSize = Math.max(
      MIN_CHUNK_SIZE,
      Math.floor(defaultChunkSize / MIN_CHUNK_SIZE) * MIN_CHUNK_SIZE
    );
  }

  /**
   * Uploads a file with automatic selection of direct multipart (small files)
   * or resumable chunked upload with progress events (large files).
   */
  async upload(options: UploadOptions): Promise<DriveApiFile> {
    if (typeof options.source === 'string') {
      return await this.uploadFromPath(options.source, options);
    } else if (Buffer.isBuffer(options.source)) {
      return await this.uploadFromBuffer(options.source, options);
    } else {
      // Readable Stream: standard drive.files.create with stream
      return await this.uploadFromStream(options.source, options);
    }
  }

  /**
   * Upload from local file path with memory-efficient chunked streaming
   */
  private async uploadFromPath(filePath: string, options: UploadOptions): Promise<DriveApiFile> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist at path: "${filePath}"`);
    }

    const stat = await fs.promises.stat(filePath);
    const totalBytes = stat.size;
    const fileName = options.name || path.basename(filePath);
    const mimeType = options.mimeType || lookupMimeType(filePath);

    // Fast path: files <= MULTIPART_THRESHOLD (5 MB) use single-roundtrip direct multipart upload
    if (totalBytes <= MULTIPART_THRESHOLD) {
      const readStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
      const stream = options.onProgress
        ? this.wrapStreamWithProgress(readStream, totalBytes, options.onProgress)
        : readStream;
      return await this.directUpload(stream, {
        ...options,
        name: fileName,
        mimeType,
      });
    }

    return await this.chunkedUpload({
      filePath,
      totalBytes,
      fileName,
      mimeType,
      options,
    });
  }

  /**
   * Upload from in-memory Buffer
   */
  private async uploadFromBuffer(buffer: Buffer, options: UploadOptions): Promise<DriveApiFile> {
    const totalBytes = buffer.length;
    const fileName = options.name || 'untitled';
    const mimeType = options.mimeType || 'application/octet-stream';

    // Fast path: buffers <= MULTIPART_THRESHOLD (5 MB) use single-roundtrip direct multipart upload
    if (totalBytes <= MULTIPART_THRESHOLD) {
      const { Readable } = await import('node:stream');
      const baseStream = Readable.from(totalBytes === 0 ? [] : [buffer]);
      const stream = options.onProgress
        ? this.wrapStreamWithProgress(baseStream, totalBytes, options.onProgress)
        : baseStream;
      return await this.directUpload(stream, {
        ...options,
        name: fileName,
        mimeType,
      });
    }

    return await this.chunkedUploadBuffer({
      buffer,
      totalBytes,
      fileName,
      mimeType,
      options,
    });
  }

  /**
   * Upload from generic Readable Stream
   */
  private async uploadFromStream(stream: NodeJS.ReadableStream, options: UploadOptions): Promise<DriveApiFile> {
    const fileName = options.name || 'untitled';
    const mimeType = options.mimeType || 'application/octet-stream';

    return await this.directUpload(stream, {
      ...options,
      name: fileName,
      mimeType,
    });
  }

  /**
   * Calculates optimal chunk size based on file size for maximum throughput.
   */
  private computeAdaptiveChunkSize(totalBytes: number, explicitChunkSize?: number): number {
    if (explicitChunkSize) {
      return Math.max(MIN_CHUNK_SIZE, Math.floor(explicitChunkSize / MIN_CHUNK_SIZE) * MIN_CHUNK_SIZE);
    }
    if (totalBytes > 128 * 1024 * 1024) {
      return 32 * 1024 * 1024; // 32 MiB chunks for files > 128MB
    }
    if (totalBytes > 32 * 1024 * 1024) {
      return 16 * 1024 * 1024; // 16 MiB chunks for files > 32MB
    }
    return this.defaultChunkSize; // 8 MiB default
  }

  /**
   * Attaches real-time progress monitoring to direct stream uploads.
   */
  private wrapStreamWithProgress(
    stream: NodeJS.ReadableStream,
    totalBytes: number,
    onProgress: (progress: UploadProgress) => void
  ): NodeJS.ReadableStream {
    let bytesSent = 0;
    const startTime = Date.now();
    const progressTransform = new Transform({
      transform(chunk, _encoding, callback) {
        bytesSent += chunk.length;
        const elapsedSecs = (Date.now() - startTime) / 1000;
        const bytesPerSecond = elapsedSecs > 0 ? Math.round(bytesSent / elapsedSecs) : 0;
        const remainingBytes = Math.max(0, totalBytes - bytesSent);
        const estimatedTimeRemainingSeconds = bytesPerSecond > 0 ? Math.round(remainingBytes / bytesPerSecond) : 0;
        const percentage = totalBytes > 0 ? Math.min(100, Math.round((bytesSent / totalBytes) * 1000) / 10) : 100;

        onProgress({
          bytesSent,
          totalBytes,
          percentage,
          bytesPerSecond,
          speedFormatted: formatSpeed(bytesPerSecond),
          estimatedTimeRemainingSeconds,
          chunkIndex: 1,
          totalChunks: 1,
        });

        callback(null, chunk);
      },
    });

    return stream.pipe(progressTransform);
  }

  /**
   * Fast direct upload using googleapis multipart
   */
  private async directUpload(stream: NodeJS.ReadableStream, options: UploadOptions): Promise<DriveApiFile> {
    const requestBody: drive_v3.Schema$File = {
      name: options.name,
      mimeType: options.mimeType,
      description: options.description,
      properties: options.properties,
      appProperties: options.appProperties,
    };

    if (options.parent) {
      requestBody.parents = [options.parent];
    }

    const res = await withRetry(async () => {
      return await this.drive.files.create({
        requestBody,
        media: {
          mimeType: options.mimeType,
          body: stream,
        },
        fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime, modifiedTime',
        supportsAllDrives: true,
      });
    });

    return res.data;
  }

  /**
   * Chunked resumable upload for local files with low memory footprint
   */
  private async chunkedUpload(params: {
    filePath: string;
    totalBytes: number;
    fileName: string;
    mimeType: string;
    options: UploadOptions;
  }): Promise<DriveApiFile> {
    const { filePath, totalBytes, fileName, mimeType, options } = params;
    const chunkSize = this.computeAdaptiveChunkSize(totalBytes, options.chunkSize);

    // 1. Initiate Resumable Upload Session
    const sessionUrl = await this.initiateResumableSession({
      fileName,
      mimeType,
      totalBytes,
      parent: options.parent,
      description: options.description,
      properties: options.properties,
      appProperties: options.appProperties,
    });

    // 2. Upload Chunks
    const fd = await fs.promises.open(filePath, 'r');
    let bytesSent = 0;
    const startTime = Date.now();
    const totalChunks = Math.ceil(totalBytes / chunkSize) || 1;
    let chunkIndex = 0;

    try {
      while (bytesSent < totalBytes) {
        if (options.signal?.aborted) {
          throw new Error('Upload aborted by user signal');
        }
        chunkIndex++;
        const currentChunkSize = Math.min(chunkSize, totalBytes - bytesSent);
        const buffer = Buffer.alloc(currentChunkSize);
        await fd.read(buffer, 0, currentChunkSize, bytesSent);

        const rangeStart = bytesSent;
        const rangeEnd = bytesSent + currentChunkSize - 1;

        const chunkResult = await this.uploadChunkWithRetry({
          sessionUrl,
          buffer,
          rangeStart,
          rangeEnd,
          totalBytes,
        });

        bytesSent += currentChunkSize;

        // Progress Calculation
        if (options.onProgress) {
          const elapsedSecs = (Date.now() - startTime) / 1000;
          const bytesPerSecond = elapsedSecs > 0 ? Math.round(bytesSent / elapsedSecs) : 0;
          const remainingBytes = totalBytes - bytesSent;
          const estimatedTimeRemainingSeconds = bytesPerSecond > 0 ? Math.round(remainingBytes / bytesPerSecond) : 0;
          const percentage = totalBytes > 0 ? Math.min(100, Math.round((bytesSent / totalBytes) * 1000) / 10) : 100;

          options.onProgress({
            bytesSent,
            totalBytes,
            percentage,
            bytesPerSecond,
            speedFormatted: formatSpeed(bytesPerSecond),
            estimatedTimeRemainingSeconds,
            chunkIndex,
            totalChunks,
          });
        }

        if (chunkResult.isComplete && chunkResult.file) {
          return chunkResult.file;
        }
      }
    } finally {
      await fd.close();
    }

    throw new DriveUploadError('Resumable upload loop ended without completion response', bytesSent, totalBytes);
  }

  /**
   * Chunked resumable upload for memory buffers
   */
  private async chunkedUploadBuffer(params: {
    buffer: Buffer;
    totalBytes: number;
    fileName: string;
    mimeType: string;
    options: UploadOptions;
  }): Promise<DriveApiFile> {
    const { buffer, totalBytes, fileName, mimeType, options } = params;
    const chunkSize = this.computeAdaptiveChunkSize(totalBytes, options.chunkSize);

    const sessionUrl = await this.initiateResumableSession({
      fileName,
      mimeType,
      totalBytes,
      parent: options.parent,
      description: options.description,
      properties: options.properties,
      appProperties: options.appProperties,
    });

    let bytesSent = 0;
    const startTime = Date.now();
    const totalChunks = Math.ceil(totalBytes / chunkSize) || 1;
    let chunkIndex = 0;

    while (bytesSent < totalBytes) {
      if (options.signal?.aborted) {
        throw new Error('Upload aborted by user signal');
      }
      chunkIndex++;
      const currentChunkSize = Math.min(chunkSize, totalBytes - bytesSent);
      const chunk = buffer.subarray(bytesSent, bytesSent + currentChunkSize);

      const rangeStart = bytesSent;
      const rangeEnd = bytesSent + currentChunkSize - 1;

      const chunkResult = await this.uploadChunkWithRetry({
        sessionUrl,
        buffer: chunk,
        rangeStart,
        rangeEnd,
        totalBytes,
      });

      bytesSent += currentChunkSize;

      if (options.onProgress) {
        const elapsedSecs = (Date.now() - startTime) / 1000;
        const bytesPerSecond = elapsedSecs > 0 ? Math.round(bytesSent / elapsedSecs) : 0;
        const remainingBytes = totalBytes - bytesSent;
        const estimatedTimeRemainingSeconds = bytesPerSecond > 0 ? Math.round(remainingBytes / bytesPerSecond) : 0;
        const percentage = totalBytes > 0 ? Math.min(100, Math.round((bytesSent / totalBytes) * 1000) / 10) : 100;

        options.onProgress({
          bytesSent,
          totalBytes,
          percentage,
          bytesPerSecond,
          speedFormatted: formatSpeed(bytesPerSecond),
          estimatedTimeRemainingSeconds,
          chunkIndex,
          totalChunks,
        });
      }

      if (chunkResult.isComplete && chunkResult.file) {
        return chunkResult.file;
      }
    }

    throw new DriveUploadError('Resumable buffer upload ended without completion', bytesSent, totalBytes);
  }

  /**
   * Request an upload session URI from Google Drive API
   */
  private async initiateResumableSession(meta: {
    fileName: string;
    mimeType: string;
    totalBytes: number;
    parent?: string;
    description?: string;
    properties?: Record<string, string>;
    appProperties?: Record<string, string>;
  }): Promise<string> {
    const authClient = (this.drive as any).context._options.auth;
    const headers: Record<string, string> = {
      'X-Upload-Content-Type': meta.mimeType,
      'X-Upload-Content-Length': meta.totalBytes.toString(),
      'Content-Type': 'application/json; charset=UTF-8',
    };

    const metadata: any = {
      name: meta.fileName,
      mimeType: meta.mimeType,
      description: meta.description,
      properties: meta.properties,
      appProperties: meta.appProperties,
    };

    if (meta.parent) {
      metadata.parents = [meta.parent];
    }

    const res = await withRetry(async () => {
      return await authClient.request({
        url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
        method: 'POST',
        headers,
        data: metadata,
        agent: getOptimizedHttpsAgent(),
      });
    });

    const sessionUrl = res.headers?.get ? res.headers.get('location') : (res.headers?.location || res.headers?.['location']);
    if (!sessionUrl) {
      throw new DriveUploadError('Failed to initiate resumable upload session: No Location header in response');
    }

    return sessionUrl;
  }

  /**
   * Upload a chunk with exponential backoff on network failures
   */
  private async uploadChunkWithRetry(params: {
    sessionUrl: string;
    buffer: Buffer;
    rangeStart: number;
    rangeEnd: number;
    totalBytes: number;
  }): Promise<{ isComplete: boolean; file?: DriveApiFile }> {
    const { sessionUrl, buffer, rangeStart, rangeEnd, totalBytes } = params;
    const authClient = (this.drive as any).context._options.auth;

    const headers = {
      'Content-Length': buffer.length.toString(),
      'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalBytes}`,
    };

    return await withRetry(async () => {
      try {
        const res = await authClient.request({
          url: sessionUrl,
          method: 'PUT',
          headers,
          data: buffer,
          agent: getOptimizedHttpsAgent(),
          validateStatus: (status: number) => (status >= 200 && status < 300) || status === 308,
        });

        if (res.status === 200 || res.status === 201) {
          return { isComplete: true, file: res.data };
        }

        if (res.status === 308) {
          return { isComplete: false };
        }

        throw new DriveUploadError(`Unexpected response status ${res.status} during chunk upload`);
      } catch (err: any) {
        if (err.status === 308) {
          return { isComplete: false };
        }
        const msg = err.message || err.response?.data?.error?.message || '';
        if (msg.includes('Service Accounts do not have storage quota') || msg.includes('storageQuotaExceeded')) {
          throw new DriveUploadError(
            'Google Drive Policy: Service Accounts do not have file storage quota in personal Google accounts. To upload files, use an OAuth2 token or pass accessToken.',
            params.rangeStart,
            params.totalBytes,
            err
          );
        }
        throw err;
      }
    });
  }
}

