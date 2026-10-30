import type { drive_v3 } from '@googleapis/drive';
import { GOOGLE_WORKSPACE_MIME_TYPES } from '../utils/mime.js';
import { DriveNotFoundError } from '../errors.js';
import { withRetry } from '../utils/retry.js';

interface CacheEntry {
  id: string;
  name: string;
  mimeType: string;
  expiresAt: number;
}

/**
 * Resolves virtual hierarchical paths like "/Projects/2026/file.pdf" to Google Drive File/Folder IDs.
 */
export class PathResolver {
  private drive: drive_v3.Drive;
  private rootFolderId: string;
  private cache = new Map<string, CacheEntry>();
  private cacheTTL: number;
  private enableCache: boolean;

  constructor(
    drive: drive_v3.Drive,
    rootFolderId = 'root',
    options?: { enableCache?: boolean; cacheTTL?: number }
  ) {
    this.drive = drive;
    this.rootFolderId = rootFolderId;
    this.enableCache = options?.enableCache ?? true;
    this.cacheTTL = options?.cacheTTL ?? 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Normalizes a virtual path (e.g. "///Backups//2026/" -> "/Backups/2026")
   */
  public normalizePath(rawPath: string): string {
    if (!rawPath || rawPath.trim() === '' || rawPath === '/') {
      return '/';
    }
    const parts = rawPath
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean);
    return `/${parts.join('/')}`;
  }

  /**
   * Gets cache key for a path
   */
  private getCacheKey(path: string): string {
    return `${this.rootFolderId}:${this.normalizePath(path)}`;
  }

  /**
   * Clears the path cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate a single path from cache
   */
  public invalidatePath(path: string): void {
    const key = this.getCacheKey(path);
    this.cache.delete(key);
  }

  /**
   * Resolves a path to a Google Drive item (file or folder).
   * If createIfMissing is true, any missing intermediate directories will be automatically created (like mkdir -p).
   */
  async resolve(
    virtualPath: string,
    options: { createIfMissing?: boolean } = {}
  ): Promise<{ id: string; name: string; isFolder: boolean; mimeType: string }> {
    const norm = this.normalizePath(virtualPath);

    if (norm === '/') {
      return {
        id: this.rootFolderId,
        name: 'root',
        isFolder: true,
        mimeType: GOOGLE_WORKSPACE_MIME_TYPES.FOLDER,
      };
    }

    if (this.enableCache) {
      const cached = this.cache.get(this.getCacheKey(norm));
      if (cached && cached.expiresAt > Date.now()) {
        return {
          id: cached.id,
          name: cached.name,
          isFolder: cached.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.FOLDER,
          mimeType: cached.mimeType,
        };
      }
    }

    const segments = norm.split('/').filter(Boolean);
    let currentParentId = this.rootFolderId;
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      currentPath += `/${segment}`;

      // Check cache for intermediate path
      if (this.enableCache) {
        const cached = this.cache.get(this.getCacheKey(currentPath));
        if (cached && cached.expiresAt > Date.now()) {
          currentParentId = cached.id;
          if (isLast) {
            return {
              id: cached.id,
              name: cached.name,
              isFolder: cached.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.FOLDER,
              mimeType: cached.mimeType,
            };
          }
          continue;
        }
      }

      // Query Google Drive for this segment under currentParentId
      const escapedName = segment.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const q = `'${currentParentId}' in parents and name = '${escapedName}' and trashed = false`;

      const response = await withRetry(async () => {
        return await this.drive.files.list({
          q,
          fields: 'files(id, name, mimeType, parents)',
          pageSize: 1,
          spaces: 'drive',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
      });

      let file = response.data.files?.[0];

      // If not found and at root level, check shared folders (e.g. shared with service account)
      if (!file && currentParentId === this.rootFolderId) {
        const sharedQ = `name = '${escapedName}' and trashed = false`;
        const sharedResponse = await withRetry(async () => {
          return await this.drive.files.list({
            q: sharedQ,
            fields: 'files(id, name, mimeType, parents)',
            pageSize: 1,
            spaces: 'drive',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
        });
        file = sharedResponse.data.files?.[0];
      }

      if (file && file.id) {
        currentParentId = file.id;

        if (this.enableCache) {
          this.cache.set(this.getCacheKey(currentPath), {
            id: file.id,
            name: file.name || segment,
            mimeType: file.mimeType || '',
            expiresAt: Date.now() + this.cacheTTL,
          });
        }

        if (isLast) {
          return {
            id: file.id,
            name: file.name || segment,
            isFolder: file.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.FOLDER,
            mimeType: file.mimeType || '',
          };
        }
      } else {
        // Not found
        if (options.createIfMissing) {
          // Create directory
          const createRes = await withRetry(async () => {
            return await this.drive.files.create({
              requestBody: {
                name: segment,
                mimeType: GOOGLE_WORKSPACE_MIME_TYPES.FOLDER,
                parents: [currentParentId],
              },
              fields: 'id, name, mimeType',
              supportsAllDrives: true,
            });
          });

          const newFolder = createRes.data;
          if (!newFolder.id) {
            throw new Error(`Failed to create folder "${segment}" under parent "${currentParentId}"`);
          }

          currentParentId = newFolder.id;

          if (this.enableCache) {
            this.cache.set(this.getCacheKey(currentPath), {
              id: newFolder.id,
              name: segment,
              mimeType: GOOGLE_WORKSPACE_MIME_TYPES.FOLDER,
              expiresAt: Date.now() + this.cacheTTL,
            });
          }

          if (isLast) {
            return {
              id: newFolder.id,
              name: segment,
              isFolder: true,
              mimeType: GOOGLE_WORKSPACE_MIME_TYPES.FOLDER,
            };
          }
        } else {
          throw new DriveNotFoundError(
            virtualPath,
            `Path segment "${segment}" not found in path "${virtualPath}" under folder ID "${currentParentId}"`
          );
        }
      }
    }

    throw new DriveNotFoundError(virtualPath);
  }

  /**
   * Ensures that a directory structure exists (like mkdir -p).
   */
  async mkdirp(virtualPath: string): Promise<string> {
    const res = await this.resolve(virtualPath, { createIfMissing: true });
    return res.id;
  }
}

