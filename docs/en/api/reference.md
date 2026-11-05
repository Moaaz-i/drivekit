# 📚 API Reference

---

## ⚡ Factory Function

```typescript
function createDrive(options?: DriveKitOptions): Promise<DriveKit>
```

---

## 🏛️ `DriveKit` Methods

### Paths & Folders
- `mkdirp(virtualPath: string): Promise<string>`
- `resolvePath(virtualPath: string): Promise<{ id, name, isFolder, mimeType }>`
- `exists(idOrPath: string): Promise<boolean>`
- `ls(folderIdOrPath?: string): Promise<DriveApiFile[]>`

### Files & Uploads
- `upload(options: UploadOptions): Promise<DriveApiFile>`: Supports `deduplicate: true` for instant cloud cloning.
- `download(fileIdOrPath: string, options?: DownloadOptions)`: Supports auto-conversion for Google Docs, Sheets, and Slides.
- `getFile(fileIdOrPath: string): Promise<DriveApiFile>`
- `getText(fileIdOrPath: string): Promise<string>`
- `getJson<T>(fileIdOrPath: string): Promise<T>`
- `delete(fileIdOrPath: string, permanent?: boolean): Promise<void>`
- `move(fileIdOrPath: string, newParentIdOrPath: string): Promise<DriveApiFile>`
- `rename(fileIdOrPath: string, newName: string): Promise<DriveApiFile>`
- `copy(fileIdOrPath: string, options?: { name?, parent? }): Promise<DriveApiFile>`

### Streams & Range Requests
- `createReadStream(pathOrId: string, options?: { start?: number, end?: number }): Promise<NodeJS.ReadableStream>`
- `createWriteStream(remotePath: string, options?: UploadOptions): Promise<NodeJS.WritableStream>`

### Persistent SQLite Cache
- `getMetadataCache(): Promise<IMetadataCache | null>`
- `getCacheStats(): Promise<CacheStats | null>`
- `syncCache(options?: { onProgress?: (scanned: number) => void }): Promise<CacheStats>`
- `clearCache(): Promise<void>`

### Shared Drives & Enterprise Permissions
- `listSharedDrives(options?: { pageSize?: number }): Promise<{ id: string, name: string }[]>`
- `sharedDrive(driveId: string): DriveKit`
- `grantAccess(pathOrId: string, options: { email: string, role?: string, notify?: boolean, message?: string }): Promise<DriveApiPermission>`
- `revokeAccess(pathOrId: string, permissionIdOrEmail: string): Promise<void>`
- `listPermissions(pathOrId: string): Promise<DriveApiPermission[]>`

### Embedded WebDAV Server
- `serveWebDAV(options?: { port?: number, host?: string }): Promise<{ server, url, close }>`

### Sharing & Links
- `share(fileIdOrPath: string, options: ShareOptions): Promise<DriveApiPermission>`
- `sharePublic(fileIdOrPath: string, role?): Promise<{ previewLink, directDownloadLink }>`
- `getShareableLink(fileIdOrPath: string): Promise<{ previewLink, directDownloadLink }>`

### Queries
- `query(): DriveQueryBuilder`

### Sync & Storage Cleaning
- `syncFolder(localDir: string, remotePathOrId: string, options?: SyncOptions): Promise<SyncResult>`
- `pull(remoteFolderIdOrPath: string, localDestinationDir: string, options?): Promise<PullResult>`
- `getStorageQuota(): Promise<StorageQuota>`
- `findLargestFiles(options?): Promise<DriveApiFile[]>`
- `findDuplicates(options?): Promise<DuplicateGroup[]>`
- `emptyTrash(): Promise<void>`

---

## 🧩 Plugins

- `createWebhookPlugin(options: { url: string, events?: ('upload' | 'download')[], headers?: Record<string, string> })`
- `createAutoNamePlugin(options: { prefix?: string, suffix?: string, appendTimestamp?: boolean })`
