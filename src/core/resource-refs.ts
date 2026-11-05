import type { DriveKit } from './client.js';
import type {
  DriveApiFile,
  DriveApiPermission,
  DownloadOptions,
  ShareOptions,
  UploadOptions,
  SyncResult,
} from '../types.js';
import type { PullResult } from './smart-sync.js';
import type { WatcherOptions, DriveWatcher } from './watcher.js';

/**
 * Fluent reference to a specific file in Google Drive
 */
export class DriveFileRef {
  private drive: DriveKit;
  public readonly pathOrId: string;

  constructor(drive: DriveKit, pathOrId: string) {
    this.drive = drive;
    this.pathOrId = pathOrId;
  }

  /** Gets file metadata */
  async get(): Promise<DriveApiFile> {
    return await this.drive.getFile(this.pathOrId);
  }

  /** Checks if the file exists */
  async exists(): Promise<boolean> {
    return await this.drive.exists(this.pathOrId);
  }

  /** Reads file as UTF-8 string */
  async getText(): Promise<string> {
    return await this.drive.getText(this.pathOrId);
  }

  /** Reads and parses JSON file */
  async getJson<T = any>(): Promise<T> {
    return await this.drive.getJson<T>(this.pathOrId);
  }

  /** Downloads the file to destination */
  async download(optionsOrDestination?: string | DownloadOptions) {
    const opts = typeof optionsOrDestination === 'string'
      ? { destination: optionsOrDestination }
      : optionsOrDestination;
    return await this.drive.download(this.pathOrId, opts);
  }

  /** Moves the file to a new folder path or ID */
  async moveTo(newParentPathOrId: string): Promise<DriveApiFile> {
    return await this.drive.move(this.pathOrId, newParentPathOrId);
  }

  /** Copies the file to a target directory */
  async copyTo(parentPathOrId?: string, newName?: string): Promise<DriveApiFile> {
    return await this.drive.copy(this.pathOrId, { parent: parentPathOrId, name: newName });
  }

  /** Renames the file */
  async rename(newName: string): Promise<DriveApiFile> {
    return await this.drive.rename(this.pathOrId, newName);
  }

  /** Deletes the file (or moves to trash if permanent is false) */
  async delete(permanent = false): Promise<void> {
    return await this.drive.delete(this.pathOrId, permanent);
  }

  /** Moves file to trash */
  async trash(): Promise<void> {
    return await this.drive.trash(this.pathOrId);
  }

  /** Shares file */
  async share(options: ShareOptions): Promise<DriveApiPermission> {
    return await this.drive.share(this.pathOrId, options);
  }

  /** Makes file publicly accessible */
  async sharePublic(role: 'reader' | 'commenter' | 'writer' = 'reader') {
    return await this.drive.sharePublic(this.pathOrId, role);
  }

  /** Gets public/preview links */
  async getLink() {
    return await this.drive.getShareableLink(this.pathOrId);
  }

  /** Returns a ReadableStream for this file, optionally with byte Range requests */
  async createReadStream(options?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream> {
    return await this.drive.createReadStream(this.pathOrId, options);
  }

  /** Grants access to a specific email with custom role and notification */
  async grantAccess(options: {
    email: string;
    role?: 'reader' | 'commenter' | 'writer';
    notify?: boolean;
    message?: string;
  }): Promise<DriveApiPermission> {
    return await this.drive.grantAccess(this.pathOrId, options);
  }

  /** Revokes access by permission ID or user email */
  async revokeAccess(permissionIdOrEmail: string): Promise<void> {
    return await this.drive.revokeAccess(this.pathOrId, permissionIdOrEmail);
  }

  /** Lists all granted permissions on this file */
  async listPermissions(): Promise<DriveApiPermission[]> {
    return await this.drive.listPermissions(this.pathOrId);
  }
}

/**
 * Fluent reference to a specific folder in Google Drive
 */
export class DriveFolderRef {
  private drive: DriveKit;
  public readonly pathOrId: string;

  constructor(drive: DriveKit, pathOrId: string) {
    this.drive = drive;
    this.pathOrId = pathOrId;
  }

  /** Lists contents of this folder */
  async ls(): Promise<DriveApiFile[]> {
    return await this.drive.ls(this.pathOrId);
  }

  /** Ensures this folder and subpaths exist (mkdir -p) */
  async mkdirp(subPath?: string): Promise<string> {
    const target = subPath
      ? (this.pathOrId.endsWith('/') ? `${this.pathOrId}${subPath}` : `${this.pathOrId}/${subPath}`)
      : this.pathOrId;
    return await this.drive.mkdirp(target);
  }

  /** Uploads a file directly into this folder */
  async upload(source: UploadOptions['source'], options: Omit<UploadOptions, 'source' | 'parent'> = {}): Promise<DriveApiFile> {
    return await this.drive.upload({
      ...options,
      source,
      parent: this.pathOrId,
    });
  }

  /** Synchronizes a local directory into this remote folder */
  async syncFrom(localDir: string, options: Parameters<DriveKit['syncFolder']>[2] = {}): Promise<SyncResult> {
    return await this.drive.syncFolder(localDir, this.pathOrId, options);
  }

  /** Pulls this remote folder down to local directory */
  async pullTo(localDestinationDir: string, options: Parameters<DriveKit['pull']>[2] = {}): Promise<PullResult> {
    return await this.drive.pull(this.pathOrId, localDestinationDir, options);
  }

  /** Watches this folder for real-time changes */
  async watch(options: Omit<WatcherOptions, 'folderId'> = {}): Promise<DriveWatcher> {
    return await this.drive.watch(this.pathOrId, options);
  }

  /** Grants access to this entire folder */
  async grantAccess(options: {
    email: string;
    role?: 'reader' | 'commenter' | 'writer';
    notify?: boolean;
    message?: string;
  }): Promise<DriveApiPermission> {
    return await this.drive.grantAccess(this.pathOrId, options);
  }

  /** Creates a writable stream directly into a file inside this folder */
  async createWriteStream(
    fileName: string,
    options?: Omit<UploadOptions, 'source' | 'filename' | 'parent'>
  ): Promise<NodeJS.WritableStream> {
    const targetPath = this.pathOrId.endsWith('/') ? `${this.pathOrId}${fileName}` : `${this.pathOrId}/${fileName}`;
    return await this.drive.createWriteStream(targetPath, options);
  }
}

