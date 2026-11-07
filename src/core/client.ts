import fs from 'node:fs';
import path from 'node:path';
import { drive, drive_v3 } from '@googleapis/drive';
import type {
  DriveKitOptions,
  UploadOptions,
  DownloadOptions,
  ShareOptions,
  SyncResult,
  DriveApiFile,
  DriveApiPermission,
} from '../types.js';
import { DriveAuthenticator } from '../auth/authenticator.js';
import { PathResolver } from './path-resolver.js';
import { ResumableUploader, DEFAULT_CHUNK_SIZE } from './resumable-uploader.js';
import { Downloader } from './downloader.js';
import { DriveQueryBuilder } from './query-builder.js';
import { ConcurrencyPool } from './concurrency-pool.js';
import { DriveWatcher, type WatcherOptions } from './watcher.js';
import { StorageCleaner, type DuplicateGroup } from './storage-cleaner.js';
import { SmartSyncEngine, type PullResult, calculateFileMd5 } from './smart-sync.js';
import { loginWithBrowser, type BrowserLoginOptions } from '../auth/browser-login.js';
import { DriveFileRef, DriveFolderRef } from './resource-refs.js';
import { PluginManager, type DriveKitPlugin } from './plugins.js';
import { DriveNotFoundError } from '../errors.js';
import { withRetry } from '../utils/retry.js';
import { formatBytes } from '../utils/format.js';
import { GOOGLE_WORKSPACE_MIME_TYPES } from '../utils/mime.js';
import { SqliteMetadataCache, type IMetadataCache, type CacheStats, type CacheFileEntry } from './cache.js';
import { getOptimizedHttpsAgent } from '../utils/http-agent.js';

export class DriveKit {
  private options: DriveKitOptions;
  private authenticator: DriveAuthenticator;
  private driveClient: drive_v3.Drive | null = null;
  private pathResolverInstance: PathResolver | null = null;
  private uploaderInstance: ResumableUploader | null = null;
  private downloaderInstance: Downloader | null = null;
  private metadataCacheInstance: IMetadataCache | null = null;
  private rootFolderId: string;
  private pluginManager = new PluginManager();

  constructor(options: DriveKitOptions = {}) {
    this.options = options;
    this.rootFolderId = options.rootFolderId || 'root';
    this.authenticator = new DriveAuthenticator(options.auth);
  }

  /**
   * Registers a middleware plugin into DriveKit lifecycle
   */
  use(plugin: DriveKitPlugin): this {
    this.pluginManager.use(plugin);
    return this;
  }

  /**
   * Unregisters a middleware plugin by name
   */
  unuse(pluginName: string): boolean {
    return this.pluginManager.unuse(pluginName);
  }

  /**
   * Access the underlying plugin manager instance
   */
  get plugins(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Returns a fluent, chained reference to a specific file
   */
  file(pathOrId: string): DriveFileRef {
    return new DriveFileRef(this, pathOrId);
  }

  /**
   * Returns a fluent, chained reference to a specific folder
   */
  folder(pathOrId: string): DriveFolderRef {
    return new DriveFolderRef(this, pathOrId);
  }

  /**
   * Initializes the Google Drive API client (lazy-loaded if not called explicitly)
   */
  async init(): Promise<this> {
    if (!this.driveClient) {
      const auth = await this.authenticator.getAuthClient();
      const agent = getOptimizedHttpsAgent();
      this.driveClient = drive({ version: 'v3', auth, agent } as any) as unknown as drive_v3.Drive;

      if (this.options.enablePersistentCache !== false) {
        this.metadataCacheInstance = new SqliteMetadataCache(this.options.cacheDatabasePath);
        this.metadataCacheInstance.init();
      }

      this.pathResolverInstance = new PathResolver(this.driveClient!, this.rootFolderId, {
        enableCache: this.options.enablePathCache ?? true,
        cacheTTL: this.options.pathCacheTTL,
        metadataCache: this.metadataCacheInstance || undefined,
      });

      this.uploaderInstance = new ResumableUploader(
        this.driveClient!,
        this.options.uploadChunkSize || DEFAULT_CHUNK_SIZE
      );

      this.downloaderInstance = new Downloader(this.driveClient!);
    }
    return this;
  }

  /**
   * Access the underlying official `@googleapis/drive` instance for raw API calls
   */
  async getRawClient(): Promise<drive_v3.Drive> {
    await this.init();
    return this.driveClient!;
  }

  private async getResolver(): Promise<PathResolver> {
    await this.init();
    return this.pathResolverInstance!;
  }

  private async getUploader(): Promise<ResumableUploader> {
    await this.init();
    return this.uploaderInstance!;
  }

  private async getDownloader(): Promise<Downloader> {
    await this.init();
    return this.downloaderInstance!;
  }

  /**
   * Resolves a target string that could be either an ID or a virtual path (starting with '/')
   */
  private async resolveId(idOrPath: string, autoCreateDir = false): Promise<string> {
    if (idOrPath.startsWith('/')) {
      const resolver = await this.getResolver();
      const res = await resolver.resolve(idOrPath, { createIfMissing: autoCreateDir });
      return res.id;
    }
    return idOrPath;
  }

  // ==========================================
  // DIRECTORY & PATH OPERATIONS
  // ==========================================

  /**
   * Creates a folder structure recursively, similar to `mkdir -p`.
   * @param virtualPath Path like "/Documents/Projects/2026"
   * @returns Folder ID of the created or existing directory
   */
  async mkdirp(virtualPath: string): Promise<string> {
    const resolver = await this.getResolver();
    return await resolver.mkdirp(virtualPath);
  }

  /**
   * Resolves a virtual path to its Drive metadata
   */
  async resolvePath(virtualPath: string) {
    const resolver = await this.getResolver();
    return await resolver.resolve(virtualPath);
  }

  /**
   * Check if a file or folder exists (by ID or virtual path)
   */
  async exists(idOrPath: string): Promise<boolean> {
    try {
      if (idOrPath.startsWith('/')) {
        await this.resolvePath(idOrPath);
        return true;
      }
      const raw = await this.getRawClient();
      await raw.files.get({ fileId: idOrPath, fields: 'id, trashed' });
      return true;
    } catch (err: any) {
      if (err.status === 404 || err.code === 'NOT_FOUND') {
        return false;
      }
      throw err;
    }
  }

  /**
   * Lists contents of a folder (by folder ID or path) with opportunistic tree caching
   */
  async ls(folderIdOrPath = '/'): Promise<DriveApiFile[]> {
    let parentFolderId: string;
    let normalizedPath: string | null = null;
    let files: DriveApiFile[];

    if (folderIdOrPath === '/' || folderIdOrPath === 'root' || folderIdOrPath === this.rootFolderId) {
      parentFolderId = this.rootFolderId;
      normalizedPath = '/';
      const parentFilter = this.rootFolderId === 'root'
        ? "'root' in parents or sharedWithMe = true"
        : `'${this.rootFolderId}' in parents`;

      files = await this.query()
        .raw(parentFilter)
        .notTrashed()
        .orderBy('folder,name')
        .list();
    } else {
      if (folderIdOrPath.startsWith('/')) {
        normalizedPath = folderIdOrPath.replace(/\/+$/, '') || '/';
        parentFolderId = await this.resolveId(normalizedPath);
      } else {
        parentFolderId = folderIdOrPath;
      }

      files = await this.query()
        .inFolder(parentFolderId)
        .notTrashed()
        .orderBy('folder,name')
        .list();
    }

    // Opportunistic Tree Caching: populate local SQLite metadata cache for 0ms subsequent queries
    if (this.metadataCacheInstance && files.length > 0) {
      const cacheEntries: CacheFileEntry[] = files
        .filter((f) => !!f.id)
        .map((f) => ({
          id: f.id!,
          name: f.name || 'untitled',
          mimeType: f.mimeType || '',
          size: f.size ? parseInt(f.size, 10) : undefined,
          parentId: parentFolderId,
          path: normalizedPath
            ? `${normalizedPath === '/' ? '' : normalizedPath}/${f.name}`
            : undefined,
          md5Checksum: f.md5Checksum || undefined,
          modifiedTime: f.modifiedTime || undefined,
          trashed: false,
        }));
      this.metadataCacheInstance.upsertFiles(cacheEntries);
    }

    return files;
  }

  // ==========================================
  // FILE OPERATIONS (UPLOAD, DOWNLOAD, GET)
  // ==========================================

  /**
   * Powerful upload method:
   * - Supports local paths, Buffers, or Streams
   * - Automatically uses high-speed resumable chunked upload for large files
   * - Parent can be a folder ID OR a virtual path (e.g. '/Backups/2026')
   * - Real-time progress callback: % complete, transfer speed (MB/s), ETA
   */
  async upload(options: UploadOptions): Promise<DriveApiFile> {
    const opts = await this.pluginManager.runBeforeUpload(options);
    const uploader = await this.getUploader();
    let parentId = opts.parent;

    if (parentId && parentId.startsWith('/')) {
      parentId = await this.mkdirp(parentId);
    }

    // Check overwrite if requested
    const targetName = opts.name || opts.filename || (typeof opts.source === 'string' ? path.basename(opts.source) : undefined);
    if (opts.overwrite && targetName && parentId) {
      const existing = await this.query()
        .inFolder(parentId)
        .nameEquals(targetName)
        .notTrashed()
        .first();

      if (existing?.id) {
        await this.delete(existing.id, true);
      }
    }

    // Check deduplication (Fast Instant Upload via Cloud Clone)
    if (opts.deduplicate && typeof opts.source === 'string' && fs.existsSync(opts.source)) {
      const localMd5 = await calculateFileMd5(opts.source);
      let existingId: string | undefined;

      if (this.metadataCacheInstance) {
        const cached = this.metadataCacheInstance.findByMd5(localMd5);
        if (cached) existingId = cached.id;
      }

      if (!existingId) {
        const found = await this.query()
          .md5(localMd5)
          .notTrashed()
          .first();
        if (found?.id) {
          existingId = found.id;
        }
      }

      if (existingId) {
        const fileName = targetName || path.basename(opts.source);
        const raw = await this.getRawClient();
        const copyRes = await withRetry(async () => {
          return await raw.files.copy({
            fileId: existingId,
            requestBody: {
              name: fileName,
              parents: parentId ? [parentId] : undefined,
              description: opts.description,
            },
            fields: 'id, name, mimeType, size, modifiedTime, md5Checksum',
            supportsAllDrives: true,
          });
        });

        const file = copyRes.data as DriveApiFile;
        if (this.metadataCacheInstance && file.id) {
          this.metadataCacheInstance.upsertFile({
            id: file.id,
            name: file.name || fileName,
            mimeType: file.mimeType || '',
            size: file.size ? parseInt(file.size, 10) : undefined,
            parentId,
            md5Checksum: localMd5,
            trashed: false,
          });
        }
        return await this.pluginManager.runAfterUpload(file);
      }
    }

    const uploaded = await uploader.upload({
      ...opts,
      name: targetName,
      parent: parentId,
    });

    if (this.metadataCacheInstance && uploaded.id) {
      const virtualPath =
        typeof opts.parent === 'string' && opts.parent.startsWith('/')
          ? `${opts.parent === '/' ? '' : opts.parent}/${uploaded.name || targetName || 'untitled'}`
          : undefined;

      this.metadataCacheInstance.upsertFile({
        id: uploaded.id,
        name: uploaded.name || targetName || 'untitled',
        mimeType: uploaded.mimeType || '',
        size: uploaded.size ? parseInt(uploaded.size, 10) : undefined,
        parentId,
        path: virtualPath,
        trashed: false,
      });
    }

    return await this.pluginManager.runAfterUpload(uploaded);
  }

  /**
   * Downloads a file from Google Drive:
   * - Automatic conversion for Google Docs, Sheets, and Slides
   * - Progress events
   * - Saves directly to file or returns Readable Stream
   * - Leverages local metadata cache to bypass redundant Google API roundtrips
   */
  async download(fileIdOrPath: string, options: DownloadOptions = {}) {
    const fileId = await this.resolveId(fileIdOrPath);
    let cachedMeta = options.metadata;
    if (!cachedMeta && this.metadataCacheInstance) {
      const cached = this.metadataCacheInstance.getById(fileId);
      if (cached && cached.name && cached.mimeType) {
        cachedMeta = { name: cached.name, mimeType: cached.mimeType, size: cached.size };
      }
    }

    const mergedOpts: DownloadOptions = cachedMeta ? { ...options, metadata: cachedMeta } : options;
    const processedOpts = await this.pluginManager.runBeforeDownload(fileId, mergedOpts);
    const downloader = await this.getDownloader();
    const result = await downloader.download(fileId, processedOpts);
    return await this.pluginManager.runAfterDownload(result);
  }

  /**
   * Gets file metadata and updates the local metadata cache
   */
  async getFile(fileIdOrPath: string): Promise<DriveApiFile> {
    const fileId = await this.resolveId(fileIdOrPath);
    const raw = await this.getRawClient();

    const res = await withRetry(async () => {
      return await raw.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime, createdTime, parents, trashed, webViewLink, webContentLink, description, properties, shared',
        supportsAllDrives: true,
      });
    });

    const file = res.data;
    if (this.metadataCacheInstance && file.id) {
      this.metadataCacheInstance.upsertFile({
        id: file.id,
        name: file.name || '',
        mimeType: file.mimeType || '',
        size: file.size ? parseInt(file.size, 10) : undefined,
        parentId: file.parents?.[0],
        path: fileIdOrPath.startsWith('/') ? fileIdOrPath : undefined,
        modifiedTime: file.modifiedTime || undefined,
        trashed: file.trashed || false,
      });
    }

    return file;
  }

  /**
   * Reads file content as UTF-8 string
   */
  async getText(fileIdOrPath: string): Promise<string> {
    const { stream } = await this.download(fileIdOrPath);
    if (!stream) throw new Error('Failed to obtain download stream');

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  /**
   * Reads file content and parses as JSON
   */
  async getJson<T = any>(fileIdOrPath: string): Promise<T> {
    const text = await this.getText(fileIdOrPath);
    return JSON.parse(text) as T;
  }

  /**
   * Deletes a file or moves it to trash
   */
  async delete(fileIdOrPath: string, permanent = false): Promise<void> {
    const fileId = await this.resolveId(fileIdOrPath);
    const raw = await this.getRawClient();

    if (permanent) {
      await withRetry(async () => {
        await raw.files.delete({ fileId, supportsAllDrives: true });
      });
    } else {
      await withRetry(async () => {
        await raw.files.update({
          fileId,
          requestBody: { trashed: true },
          supportsAllDrives: true,
        });
      });
    }

    if (this.pathResolverInstance && fileIdOrPath.startsWith('/')) {
      this.pathResolverInstance.invalidatePath(fileIdOrPath);
    }
    if (this.metadataCacheInstance) {
      this.metadataCacheInstance.deleteFile(fileId);
    }
  }

  /**
   * Move item to trash
   */
  async trash(fileIdOrPath: string): Promise<void> {
    return this.delete(fileIdOrPath, false);
  }

  /**
   * Restore item from trash
   */
  async restore(fileId: string): Promise<void> {
    const raw = await this.getRawClient();
    await withRetry(async () => {
      await raw.files.update({
        fileId,
        requestBody: { trashed: false },
        supportsAllDrives: true,
      });
    });
  }

  /**
   * Move file to a different folder
   */
  async move(fileIdOrPath: string, newParentIdOrPath: string): Promise<DriveApiFile> {
    const fileId = await this.resolveId(fileIdOrPath);
    const newParentId = await this.resolveId(newParentIdOrPath, true);
    const raw = await this.getRawClient();

    // Get current parents
    const file = await this.getFile(fileId);
    const previousParents = (file.parents || []).join(',');

    const res = await withRetry(async () => {
      return await raw.files.update({
        fileId,
        addParents: newParentId,
        removeParents: previousParents,
        fields: 'id, name, parents',
        supportsAllDrives: true,
      });
    });

    if (this.pathResolverInstance) {
      this.pathResolverInstance.clearCache();
    }
    if (this.metadataCacheInstance) {
      const cached = this.metadataCacheInstance.getById(fileId);
      if (cached) {
        this.metadataCacheInstance.upsertFile({
          ...cached,
          parentId: newParentId,
          path: undefined,
        });
      }
    }

    return res.data;
  }

  /**
   * Copies a file
   */
  async copy(fileIdOrPath: string, options: { name?: string; parent?: string } = {}): Promise<DriveApiFile> {
    const fileId = await this.resolveId(fileIdOrPath);
    const raw = await this.getRawClient();

    let parentId = options.parent;
    if (parentId && parentId.startsWith('/')) {
      parentId = await this.mkdirp(parentId);
    }

    const requestBody: drive_v3.Schema$File = {};
    if (options.name) requestBody.name = options.name;
    if (parentId) requestBody.parents = [parentId];

    const res = await withRetry(async () => {
      return await raw.files.copy({
        fileId,
        requestBody,
        fields: 'id, name, mimeType, webViewLink',
        supportsAllDrives: true,
      });
    });

    return res.data;
  }

  /**
   * Renames a file
   */
  async rename(fileIdOrPath: string, newName: string): Promise<DriveApiFile> {
    const fileId = await this.resolveId(fileIdOrPath);
    const raw = await this.getRawClient();

    const res = await withRetry(async () => {
      return await raw.files.update({
        fileId,
        requestBody: { name: newName },
        fields: 'id, name, mimeType',
        supportsAllDrives: true,
      });
    });

    if (this.pathResolverInstance) {
      this.pathResolverInstance.clearCache();
    }
    if (this.metadataCacheInstance) {
      const cached = this.metadataCacheInstance.getById(fileId);
      if (cached) {
        this.metadataCacheInstance.upsertFile({
          ...cached,
          name: newName,
          path: undefined,
        });
      }
    }

    return res.data;
  }

  // ==========================================
  // SHARING & PERMISSIONS
  // ==========================================

  /**
   * Share file with user, group, domain, or anyone
   */
  async share(fileIdOrPath: string, options: ShareOptions = {}): Promise<DriveApiPermission> {
    const fileId = await this.resolveId(fileIdOrPath);
    const raw = await this.getRawClient();

    const requestBody: drive_v3.Schema$Permission = {
      role: options.role || 'reader',
      type: options.type || (options.emailAddress ? 'user' : 'anyone'),
      emailAddress: options.emailAddress,
      domain: options.domain,
    };

    const res = await withRetry(async () => {
      return await raw.permissions.create({
        fileId,
        requestBody,
        sendNotificationEmail: options.sendNotificationEmail,
        emailMessage: options.emailMessage,
        transferOwnership: options.transferOwnership,
        supportsAllDrives: true,
        fields: 'id, role, type, emailAddress',
      });
    });

    return res.data;
  }

  /**
   * Quickly make a file public to anyone with the link
   */
  async sharePublic(fileIdOrPath: string, role: 'reader' | 'commenter' | 'writer' = 'reader') {
    const fileId = await this.resolveId(fileIdOrPath);
    await this.share(fileId, { role, type: 'anyone' });
    const file = await this.getFile(fileId);

    return {
      fileId,
      previewLink: file.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      directDownloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  }

  /**
   * Returns sharing links for a file
   */
  async getShareableLink(fileIdOrPath: string) {
    const fileId = await this.resolveId(fileIdOrPath);
    const file = await this.getFile(fileId);
    return {
      previewLink: file.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      directDownloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  }

  // ==========================================
  // QUERY BUILDER
  // ==========================================

  /**
   * Returns a fluent search query builder
   */
  query(): DriveQueryBuilder {
    if (!this.driveClient) {
      throw new Error('DriveKit not initialized. Call await drive.init() first, or use an async method.');
    }
    return new DriveQueryBuilder(this.driveClient);
  }

  // ==========================================
  // FOLDER SYNC & BATCH UPLOAD
  // ==========================================

  /**
   * Recursively uploads a local folder to a Google Drive path with high concurrency
   */
  async syncFolder(
    localDir: string,
    remotePathOrId: string,
    options: {
      concurrency?: number;
      overwrite?: boolean;
      onFileStart?: (filePath: string, relativePath: string) => void;
      onFileComplete?: (filePath: string, fileId: string) => void;
    } = {}
  ): Promise<SyncResult> {
    await this.init();
    const startTime = Date.now();
    const concurrency = options.concurrency || this.options.concurrency || 4;
    const pool = new ConcurrencyPool(concurrency);

    const targetFolderId = await this.resolveId(remotePathOrId, true);

    const result: SyncResult = {
      uploaded: [],
      skipped: [],
      failed: [],
      totalBytes: 0,
      durationMs: 0,
    };

    // Recursively collect all local files
    const collectFiles = async (dir: string, base: string): Promise<{ fullPath: string; relPath: string; size: number }[]> => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const files: { fullPath: string; relPath: string; size: number }[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(base, entry.name);

        if (entry.isDirectory()) {
          const sub = await collectFiles(fullPath, relPath);
          files.push(...sub);
        } else if (entry.isFile()) {
          const stat = await fs.promises.stat(fullPath);
          files.push({ fullPath, relPath, size: stat.size });
        }
      }
      return files;
    };

    const allFiles = await collectFiles(localDir, '');

    // Directory ID cache for subfolders
    const remoteDirCache = new Map<string, string>();
    remoteDirCache.set('', targetFolderId);

    const ensureRemoteSubdir = async (relDir: string): Promise<string> => {
      if (remoteDirCache.has(relDir)) {
        return remoteDirCache.get(relDir)!;
      }

      const parts = relDir.split(path.sep).filter(Boolean);
      let currentParent = targetFolderId;
      let currentRel = '';

      for (const part of parts) {
        currentRel = currentRel ? path.join(currentRel, part) : part;
        if (remoteDirCache.has(currentRel)) {
          currentParent = remoteDirCache.get(currentRel)!;
          continue;
        }

        // Query or create
        const existing = await this.query()
          .inFolder(currentParent)
          .nameEquals(part)
          .isFolder()
          .notTrashed()
          .first();

        if (existing?.id) {
          currentParent = existing.id;
        } else {
          const raw = await this.getRawClient();
          const created = await withRetry(async () => {
            return await raw.files.create({
              requestBody: {
                name: part,
                mimeType: GOOGLE_WORKSPACE_MIME_TYPES.FOLDER,
                parents: [currentParent],
              },
              fields: 'id',
              supportsAllDrives: true,
            });
          });
          currentParent = created.data.id!;
        }

        remoteDirCache.set(currentRel, currentParent);
      }

      return currentParent;
    };

    // Upload files concurrently
    await pool.map(allFiles, async (fileItem) => {
      try {
        const relDir = path.dirname(fileItem.relPath);
        const fileName = path.basename(fileItem.relPath);
        const parentFolderId = await ensureRemoteSubdir(relDir === '.' ? '' : relDir);

        if (options.onFileStart) {
          options.onFileStart(fileItem.fullPath, fileItem.relPath);
        }

        const uploadedFile = await this.upload({
          source: fileItem.fullPath,
          name: fileName,
          parent: parentFolderId,
          overwrite: options.overwrite ?? false,
        });

        result.uploaded.push({
          localPath: fileItem.fullPath,
          fileId: uploadedFile.id!,
          name: fileName,
        });
        result.totalBytes += fileItem.size;

        if (options.onFileComplete) {
          options.onFileComplete(fileItem.fullPath, uploadedFile.id!);
        }
      } catch (err: any) {
        result.failed.push({
          localPath: fileItem.fullPath,
          error: err,
        });
      }
    });

    result.durationMs = Date.now() - startTime;
    return result;
  }

  // ==========================================
  // STORAGE & QUOTA
  // ==========================================

  /**
   * Retrieves Google Drive storage quota usage and limits
   */
  async getStorageQuota() {
    const raw = await this.getRawClient();
    const res = await withRetry(async () => {
      return await raw.about.get({
        fields: 'storageQuota, user',
      });
    });

    const quota = res.data.storageQuota || {};
    const limit = quota.limit ? parseInt(quota.limit, 10) : null;
    const usage = quota.usage ? parseInt(quota.usage, 10) : 0;
    const usageInDrive = quota.usageInDrive ? parseInt(quota.usageInDrive, 10) : 0;
    const usageInDriveTrash = quota.usageInDriveTrash ? parseInt(quota.usageInDriveTrash, 10) : 0;
    const percentUsed = limit && limit > 0 ? Math.round((usage / limit) * 1000) / 10 : null;

    return {
      user: res.data.user,
      limit,
      usage,
      usageInDrive,
      usageInDriveTrash,
      percentUsed,
      formattedUsage: formatBytes(usage),
      formattedLimit: limit ? formatBytes(limit) : 'Unlimited',
    };
  }

  // ==========================================
  // CHANGE WATCHER (REAL-TIME EVENTS)
  // ==========================================

  /**
   * Watches Google Drive or a specific folder for real-time changes, creations, and deletions
   */
  async watch(folderIdOrPath?: string, options: Omit<WatcherOptions, 'folderId'> = {}): Promise<DriveWatcher> {
    await this.init();
    let folderId: string | undefined = undefined;
    if (folderIdOrPath && folderIdOrPath !== '/') {
      folderId = await this.resolveId(folderIdOrPath);
    }

    const watcher = new DriveWatcher(this.driveClient!, {
      ...options,
      folderId,
    });

    await watcher.start();
    return watcher;
  }

  // ==========================================
  // STORAGE CLEANER & DUPLICATE FINDER
  // ==========================================

  /**
   * Finds the largest files consuming Google Drive storage
   */
  async findLargestFiles(limit = 10) {
    await this.init();
    const cleaner = new StorageCleaner(this.driveClient!);
    return await cleaner.findLargestFiles(limit);
  }

  /**
   * Finds duplicate files (by MD5 hash or exact file name)
   */
  async findDuplicates(options?: { by?: 'md5' | 'name'; maxScan?: number }) {
    await this.init();
    const cleaner = new StorageCleaner(this.driveClient!);
    return await cleaner.findDuplicates(options);
  }

  /**
   * Empties the entire trash bin in Google Drive
   */
  async emptyTrash(): Promise<void> {
    await this.init();
    const cleaner = new StorageCleaner(this.driveClient!);
    await cleaner.emptyTrash();
  }

  // ==========================================
  // SMART PULL & TWO-WAY SYNC
  // ==========================================

  /**
   * Pulls (downloads) an entire remote Google Drive directory down to a local folder with MD5 deduplication
   */
  async pull(
    remoteFolderIdOrPath: string,
    localDestinationDir: string,
    options: {
      concurrency?: number;
      overwrite?: boolean;
      onFileStart?: (remoteName: string, relativePath: string) => void;
      onFileComplete?: (remoteName: string, localPath: string) => void;
    } = {}
  ): Promise<PullResult> {
    await this.init();
    const folderId = await this.resolveId(remoteFolderIdOrPath);
    const engine = new SmartSyncEngine(this.driveClient!);
    return await engine.pullFolder(folderId, localDestinationDir, options);
  }

  // ==========================================
  // STREAMS & RANGE REQUESTS
  // ==========================================

  /**
   * Creates a readable stream for a file, supporting partial range requests
   */
  async createReadStream(
    pathOrId: string,
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream> {
    const fileId = await this.resolveId(pathOrId);
    const downloader = await this.getDownloader();
    return await downloader.createReadStream(fileId, options);
  }

  /**
   * Creates a writable stream directly into Google Drive
   */
  async createWriteStream(
    remotePath: string,
    options: Omit<UploadOptions, 'source'> = {}
  ): Promise<NodeJS.WritableStream & { done: Promise<DriveApiFile> }> {
    await this.init();
    const { PassThrough } = await import('node:stream');
    const passThrough = new PassThrough({ highWaterMark: 1024 * 1024 });

    let resolveDone!: (file: DriveApiFile) => void;
    let rejectDone!: (err: Error) => void;
    const donePromise = new Promise<DriveApiFile>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });

    (passThrough as any).done = donePromise;

    const remoteDir = path.dirname(remotePath);
    const fileName = options.name || options.filename || path.basename(remotePath);
    const targetParentId = remoteDir === '.' || remoteDir === '/' ? this.rootFolderId : await this.mkdirp(remoteDir);
    const mimeType = options.mimeType || 'application/octet-stream';

    const raw = this.driveClient!;
    raw.files.create({
      requestBody: {
        name: fileName,
        parents: [targetParentId],
        description: options.description,
      },
      media: {
        mimeType,
        body: passThrough,
      },
      fields: 'id, name, mimeType, size, md5Checksum',
      supportsAllDrives: true,
    }).then((res) => {
      const file = res.data as DriveApiFile;
      if (file.id && this.metadataCacheInstance) {
        this.metadataCacheInstance.upsertFile({
          id: file.id,
          name: fileName,
          mimeType,
          parentId: targetParentId,
          path: remotePath,
          trashed: false,
        });
      }
      resolveDone(file);
    }).catch((err) => {
      passThrough.destroy(err);
      rejectDone(err);
    });

    return passThrough as any;
  }

  // ==========================================
  // METADATA CACHE OPERATIONS
  // ==========================================

  /**
   * Synchronous getter for the active metadata cache instance
   */
  get cache(): IMetadataCache | null {
    return this.metadataCacheInstance;
  }

  /**
   * Returns the active persistent metadata cache instance (SQLite/Memory)
   */
  async getMetadataCache(): Promise<IMetadataCache | null> {
    await this.init();
    return this.metadataCacheInstance;
  }

  /**
   * Returns cache statistics (total files, folders, size, last sync)
   */
  async getCacheStats(): Promise<CacheStats | null> {
    await this.init();
    return this.metadataCacheInstance ? this.metadataCacheInstance.getStats() : null;
  }

  /**
   * Clears the path and metadata cache
   */
  async clearCache(): Promise<void> {
    await this.init();
    if (this.pathResolverInstance) {
      this.pathResolverInstance.clearCache();
    }
    if (this.metadataCacheInstance) {
      this.metadataCacheInstance.clear();
    }
  }

  /**
   * Crawls and indexes Google Drive metadata into the local SQLite database for instant 0ms lookups
   */
  async syncCache(options?: {
    onProgress?: (scanned: number) => void;
  }): Promise<CacheStats> {
    await this.init();
    if (!this.metadataCacheInstance) {
      throw new Error('Persistent cache is disabled on this DriveKit instance');
    }

    const client = this.driveClient!;
    let pageToken: string | undefined = undefined;
    let totalScanned = 0;
    const rawFiles: drive_v3.Schema$File[] = [];

    do {
      const res = await withRetry(async () => {
        return await client.files.list({
          pageSize: 1000,
          pageToken,
          fields: 'nextPageToken, files(id, name, mimeType, size, parents, md5Checksum, trashed, modifiedTime)',
          spaces: 'drive',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          q: 'trashed = false',
        });
      });

      const files = res.data.files || [];
      for (const f of files) {
        if (f.id) rawFiles.push(f);
      }
      totalScanned += files.length;
      options?.onProgress?.(totalScanned);

      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    // Build hierarchical paths using memoization
    const fileMap = new Map<string, drive_v3.Schema$File>();
    for (const f of rawFiles) {
      fileMap.set(f.id!, f);
    }

    const pathMemo = new Map<string, string>();
    const rootId = this.rootFolderId;

    function computePath(id: string, visited = new Set<string>()): string {
      if (pathMemo.has(id)) return pathMemo.get(id)!;
      if (visited.has(id)) return ''; // cycle detection
      visited.add(id);

      const f = fileMap.get(id);
      if (!f || !f.name) return '';

      const parentId = f.parents?.[0];
      if (!parentId || parentId === 'root' || parentId === rootId) {
        const p = `/${f.name}`;
        pathMemo.set(id, p);
        return p;
      }

      const parentPath = computePath(parentId, visited);
      const fullPath = parentPath ? `${parentPath}/${f.name}` : `/${f.name}`;
      pathMemo.set(id, fullPath);
      return fullPath;
    }

    const entries: CacheFileEntry[] = rawFiles.map((f) => ({
      id: f.id!,
      name: f.name || 'untitled',
      mimeType: f.mimeType || '',
      size: f.size ? parseInt(f.size, 10) : undefined,
      parentId: f.parents?.[0],
      path: computePath(f.id!),
      md5Checksum: f.md5Checksum || undefined,
      trashed: !!f.trashed,
      modifiedTime: f.modifiedTime || undefined,
    }));

    // Upsert all and prune deleted entries
    this.metadataCacheInstance.upsertFiles(entries);
    this.metadataCacheInstance.pruneMissing(rawFiles.map((f) => f.id!));
    this.metadataCacheInstance.setMeta('last_sync_timestamp', new Date().toISOString());

    return this.metadataCacheInstance.getStats();
  }

  // ==========================================
  // SHARED DRIVES & ENTERPRISE PERMISSIONS
  // ==========================================

  /**
   * Lists all Google Workspace Shared Drives accessible by current user or service account
   */
  async listSharedDrives(options: { pageSize?: number } = {}): Promise<{ id: string; name: string }[]> {
    await this.init();
    const raw = await this.getRawClient();
    const res = await withRetry(async () => {
      return await raw.drives.list({
        pageSize: options.pageSize || 100,
        fields: 'drives(id, name)',
      });
    });
    return (res.data.drives || []).map((d) => ({ id: d.id!, name: d.name! }));
  }

  /**
   * Creates a scoped DriveKit client locked to a specific Shared Drive
   */
  sharedDrive(driveId: string): DriveKit {
    return new DriveKit({
      ...this.options,
      rootFolderId: driveId,
    });
  }

  /**
   * Grants access to a specific email with custom role and notification
   */
  async grantAccess(
    pathOrId: string,
    options: {
      email: string;
      role?: 'reader' | 'commenter' | 'writer';
      notify?: boolean;
      message?: string;
    }
  ): Promise<DriveApiPermission> {
    const fileId = await this.resolveId(pathOrId);
    const raw = await this.getRawClient();
    const res = await withRetry(async () => {
      return await raw.permissions.create({
        fileId,
        requestBody: {
          type: 'user',
          role: options.role || 'reader',
          emailAddress: options.email,
        },
        sendNotificationEmail: options.notify ?? true,
        emailMessage: options.message,
        fields: 'id, type, role, emailAddress, displayName',
        supportsAllDrives: true,
      });
    });
    return res.data;
  }

  /**
   * Revokes access for a specific permission ID or email address
   */
  async revokeAccess(pathOrId: string, permissionIdOrEmail: string): Promise<void> {
    const fileId = await this.resolveId(pathOrId);
    const raw = await this.getRawClient();
    let targetId = permissionIdOrEmail;

    if (permissionIdOrEmail.includes('@')) {
      const listRes = await this.listPermissions(fileId);
      const found = listRes.find((p) => p.emailAddress?.toLowerCase() === permissionIdOrEmail.toLowerCase());
      if (found && found.id) {
        targetId = found.id;
      }
    }

    await withRetry(async () => {
      return await raw.permissions.delete({
        fileId,
        permissionId: targetId,
        supportsAllDrives: true,
      });
    });
  }

  /**
   * Lists all active permissions on a file or folder
   */
  async listPermissions(pathOrId: string): Promise<DriveApiPermission[]> {
    const fileId = await this.resolveId(pathOrId);
    const raw = await this.getRawClient();
    const res = await withRetry(async () => {
      return await raw.permissions.list({
        fileId,
        fields: 'permissions(id, type, role, emailAddress, displayName)',
        supportsAllDrives: true,
      });
    });
    return res.data.permissions || [];
  }

  /**
   * Starts an embedded WebDAV server to mount DriveKit directly in macOS Finder or Windows Explorer
   */
  async serveWebDAV(options?: { port?: number; host?: string; auth?: { username?: string; password?: string } }) {
    const { startWebDAVServer } = await import('../server/webdav.js');
    return await startWebDAVServer(this, options);
  }

  /**
   * Calculates local file MD5 hash for integrity and deduplication checks
   */
  static async calculateFileMd5(filePath: string): Promise<string> {
    return await calculateFileMd5(filePath);
  }

  /**
   * Interactive 1-click browser OAuth login flow
   */
  static async loginWithBrowser(options: BrowserLoginOptions) {
    return await loginWithBrowser(options);
  }
}

