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

Crawl all files and folders into the local SQLite database. In v1.1.1, `syncCache()` dynamically computes complete hierarchical paths (e.g. `/Backups/2026/db.sql`) and automatically prunes deleted/stale records from the database:

```typescript
const stats = await drive.syncCache({
  onProgress: (scanned) => {
    console.log(`Scanned and indexed ${scanned} items...`);
  }
});

console.log(`Folders indexed: ${stats.folderCount}`);
console.log(`Files indexed:   ${stats.fileCount}`);
console.log(`Database Path:   ${stats.databasePath}`);
```

> **Note on Cross-Version Compatibility:** In environments where Node 22 native `node:sqlite` is unavailable (e.g., Node 18 or 20 CI runners), DriveKit transparently falls back to an internal In-Memory cache without throwing errors.

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

### 5. Opportunistic Tree Caching (`drive.ls`)

Whenever `drive.ls('/path')` or `drive.ls(folderId)` is called, DriveKit automatically inspects all returned files and opportunistically batch-upserts their metadata and computed virtual paths into the local SQLite cache inside a single atomic transaction.

Subsequent lookups via `drive.resolvePath()`, `drive.getFile()`, or `drive.exists()` for any of those items resolve in **0.03ms (0ms Hit)** directly from SQLite without sending any HTTP requests to Google Drive:

```typescript
// 1. List directory contents (fetches from Drive & opportunistically caches tree)
const items = await drive.ls('/Backups');

// 2. Subsequent lookups hit local SQLite instantly (0.03 ms)
const file = await drive.getFile('/Backups/database.sql');
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

