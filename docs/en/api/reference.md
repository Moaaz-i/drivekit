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

### Files
- `upload(options: UploadOptions): Promise<DriveApiFile>`
- `download(fileIdOrPath: string, options?: DownloadOptions)`
- `getFile(fileIdOrPath: string): Promise<DriveApiFile>`
- `getText(fileIdOrPath: string): Promise<string>`
- `getJson<T>(fileIdOrPath: string): Promise<T>`
- `delete(fileIdOrPath: string, permanent?: boolean): Promise<void>`
- `move(fileIdOrPath: string, newParentIdOrPath: string): Promise<DriveApiFile>`
- `rename(fileIdOrPath: string, newName: string): Promise<DriveApiFile>`
- `copy(fileIdOrPath: string, options?: { name?, parent? }): Promise<DriveApiFile>`

### Sharing
- `share(fileIdOrPath: string, options: ShareOptions): Promise<DriveApiPermission>`
- `sharePublic(fileIdOrPath: string, role?): Promise<{ previewLink, directDownloadLink }>`
- `getShareableLink(fileIdOrPath: string): Promise<{ previewLink, directDownloadLink }>`

### Queries
- `query(): DriveQueryBuilder`

### Sync & Storage
- `syncFolder(localDir: string, remotePathOrId: string, options?: SyncOptions): Promise<SyncResult>`
- `getStorageQuota(): Promise<{ limit, usage, usageInDrive, usageInDriveTrash, percentUsed, formattedUsage, formattedLimit }>`

