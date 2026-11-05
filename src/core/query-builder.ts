import type { drive_v3 } from '@googleapis/drive';
import type { DriveApiFile } from '../types.js';
import { GOOGLE_WORKSPACE_MIME_TYPES } from '../utils/mime.js';
import { withRetry } from '../utils/retry.js';

export class DriveQueryBuilder {
  private drive: drive_v3.Drive;
  private conditions: string[] = [];
  private orderClauses: string[] = [];
  private limitNumber = 100;
  private requestedFields = 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, parents, trashed, webViewLink, webContentLink, shared)';
  private spaces = 'drive';

  constructor(drive: drive_v3.Drive) {
    this.drive = drive;
  }

  /**
   * Escape single quotes and backslashes for Google Drive search queries
   */
  private escape(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  /**
   * Filter: Exact file name match
   */
  nameEquals(name: string): this {
    this.conditions.push(`name = '${this.escape(name)}'`);
    return this;
  }

  /**
   * Filter: File name contains substring
   */
  nameContains(substring: string): this {
    this.conditions.push(`name contains '${this.escape(substring)}'`);
    return this;
  }

  /**
   * Filter: Specific MIME type
   */
  mimeType(mime: string): this {
    this.conditions.push(`mimeType = '${this.escape(mime)}'`);
    return this;
  }

  /**
   * Filter: Only folders
   */
  isFolder(): this {
    this.conditions.push(`mimeType = '${GOOGLE_WORKSPACE_MIME_TYPES.FOLDER}'`);
    return this;
  }

  /**
   * Filter: Exclude folders (only files)
   */
  isFile(): this {
    this.conditions.push(`mimeType != '${GOOGLE_WORKSPACE_MIME_TYPES.FOLDER}'`);
    return this;
  }

  /**
   * Filter: Direct parent folder ID
   */
  inFolder(folderId: string): this {
    this.conditions.push(`'${this.escape(folderId)}' in parents`);
    return this;
  }

  /**
   * Filter: Items not in trash (default recommended)
   */
  notTrashed(): this {
    this.conditions.push('trashed = false');
    return this;
  }

  /**
   * Filter: Only trashed items
   */
  onlyTrashed(): this {
    this.conditions.push('trashed = true');
    return this;
  }

  /**
   * Filter: Starred items
   */
  starred(isStarred = true): this {
    this.conditions.push(`starred = ${isStarred}`);
    return this;
  }

  /**
   * Filter: Shared with current user
   */
  sharedWithMe(): this {
    this.conditions.push('sharedWithMe = true');
    return this;
  }

  /**
   * Filter: Modified after timestamp or Date
   */
  modifiedAfter(date: Date | string): this {
    const iso = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    this.conditions.push(`modifiedTime > '${iso}'`);
    return this;
  }

  /**
   * Filter: Modified before timestamp or Date
   */
  modifiedBefore(date: Date | string): this {
    const iso = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    this.conditions.push(`modifiedTime < '${iso}'`);
    return this;
  }

  /**
   * Filter: Full-text search across content and name
   */
  fullText(term: string): this {
    this.conditions.push(`fullText contains '${this.escape(term)}'`);
    return this;
  }

  /**
   * Custom raw query condition
   */
  raw(condition: string): this {
    this.conditions.push(`(${condition})`);
    return this;
  }

  /**
   * Custom raw query condition (alias for raw)
   */
  custom(condition: string): this {
    return this.raw(condition);
  }

  /**
   * Filter: Exact MD5 checksum match
   */
  md5(checksum: string): this {
    this.conditions.push(`md5Checksum = '${this.escape(checksum)}'`);
    return this;
  }

  /**
   * Sort ordering (e.g. 'modifiedTime desc', 'name', 'folder,modifiedTime desc')
   */
  orderBy(order: string): this {
    this.orderClauses.push(order);
    return this;
  }

  /**
   * Maximum items to retrieve per page or query
   */
  pageSize(size: number): this {
    this.limitNumber = Math.min(1000, Math.max(1, size));
    return this;
  }

  /**
   * Custom fields to return from Drive API
   */
  fields(fieldsString: string): this {
    this.requestedFields = fieldsString;
    return this;
  }

  /**
   * Compiles the full query string
   */
  toQueryString(): string {
    return this.conditions.join(' and ');
  }

  /**
   * Executes query and returns array of matching files
   */
  async list(): Promise<DriveApiFile[]> {
    const q = this.toQueryString();
    const orderBy = this.orderClauses.join(', ');

    const res = await withRetry(async () => {
      return await this.drive.files.list({
        q: q || undefined,
        orderBy: orderBy || undefined,
        pageSize: this.limitNumber,
        fields: this.requestedFields,
        spaces: this.spaces,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
    });

    return res.data.files || [];
  }

  /**
   * Executes query and returns array of matching files (alias for list)
   */
  async execute(): Promise<DriveApiFile[]> {
    return await this.list();
  }

  /**
   * Returns the first matching file, or null if not found
   */
  async first(): Promise<DriveApiFile | null> {
    const originalLimit = this.limitNumber;
    this.limitNumber = 1;
    const items = await this.list();
    this.limitNumber = originalLimit;
    return items[0] || null;
  }

  /**
   * Counts matching items (up to 1000)
   */
  async count(): Promise<number> {
    const items = await this.list();
    return items.length;
  }

  /**
   * Async iterator to stream all pages automatically without loading all into memory
   */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<DriveApiFile> {
    const q = this.toQueryString();
    const orderBy = this.orderClauses.join(', ');
    let pageToken: string | undefined = undefined;

    do {
      const res = await withRetry(async () => {
        return await this.drive.files.list({
          q: q || undefined,
          orderBy: orderBy || undefined,
          pageSize: this.limitNumber,
          pageToken,
          fields: this.requestedFields,
          spaces: this.spaces,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
      });

      const files = res.data.files || [];
      for (const file of files) {
        yield file;
      }
      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);
  }
}

