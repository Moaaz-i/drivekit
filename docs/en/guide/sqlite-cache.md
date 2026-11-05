# ⚡ Persistent SQLite Cache Engine

**DriveKit** features a high-performance, embedded metadata cache engine powered by Node.js 22's native **`node:sqlite`**. It indexes directory trees, folder hierarchies, and MD5 hashes locally on your machine, enabling **instant 0ms path resolution** without consuming Google Drive API quota.

---

## 🌟 Why Persistent SQLite Cache?

1. **Blazing Fast (0ms Path Lookups)**: Replaces sequential network calls with local database lookups.
2. **Persistent Across CLI Sessions**: Cached metadata resides on disk at `~/.drivekit/cache.db`, remaining intact after your server or CLI command finishes.
3. **Quota Protection**: Drastically reduces HTTP requests to prevent `429 Too Many Requests` rate limit errors.
4. **Zero External Dependencies**: Operates natively without requiring C++ compilation (`node-gyp`).

---

## 💻 Programmatic Usage

### 1. Default Automatic Caching

Persistent caching is enabled by default in DriveKit:

```typescript
import { createDrive } from 'drivekit';

const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' },
  enablePersistentCache: true, // Default: true
  // Optional custom SQLite file path:
  // cacheDatabasePath: './custom-cache.db'
});
```

---

### 2. Crawl and Index Entire Drive (`syncCache`)

Crawl all files and folders in batch into the local SQLite database:

```typescript
const stats = await drive.syncCache({
  onProgress: (scanned) => {
    console.log(`Scanned and indexed ${scanned} items...`);
  }
});

console.log(`Folders indexed: ${stats.folderCount}`);
console.log(`Files indexed:   ${stats.fileCount}`);
```

---

### 3. Retrieve Cache Statistics (`getCacheStats`)

```typescript
const stats = await drive.getCacheStats();

if (stats) {
  console.log(`Database Path: ${stats.databasePath}`);
  console.log(`File Count:    ${stats.fileCount}`);
  console.log(`Folder Count:  ${stats.folderCount}`);
  console.log(`Total Size:    ${stats.totalSizeBytes} bytes`);
  console.log(`Last Sync:     ${stats.lastSyncTime}`);
}
```

---

### 4. Clear the Cache (`clearCache`)

```typescript
await drive.clearCache();
console.log('Cache cleared successfully');
```

---

## 🛠️ CLI Commands

Manage the local cache directly from your terminal:

### View cache status and stats:
```bash
npx drivekit cache status
```

### Crawl and sync your Drive metadata:
```bash
npx drivekit cache sync
```

### Clear the local SQLite cache:
```bash
npx drivekit cache clear
```
