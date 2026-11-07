# ⚙️ Advanced Settings & Optimization

---

## ⚡ DriveKit Turbo Engine (High-Throughput & Low-Latency)

DriveKit integrates native-speed optimizations to eliminate protocol overhead and maximize saturation on high-bandwidth networks:

### 1. HTTP Keep-Alive Connection Pooling
Node.js default networking renegotiates TCP/TLS handshakes repeatedly, adding 150–300ms latency to every Google API roundtrip. DriveKit provides an embedded, persistent connection pool:
- **Up to 64 Concurrent Sockets** (`maxSockets: 64`).
- **32 Free Sockets** kept warm and reusable (`keepAliveMsecs: 60000`).
- **TCP Nagle Bypass** (`noDelay: true`) for instant packet dispatch.
- Applied automatically across Google Drive API v3 calls, resumable upload chunks, and OAuth token exchanges.

```typescript
import { getOptimizedHttpsAgent } from 'drivekit';

// Inspect or customize the underlying pooling agent
const agent = getOptimizedHttpsAgent({
  maxSockets: 64,
  keepAlive: true,
});
```

### 2. In-Flight Request Coalescing (Single-Flight Deduplication)
When concurrent operations target the same virtual directory (e.g., 20 parallel worker uploads resolving `/Backups/2026`), DriveKit coalesces identical in-flight resolutions into a **single network execution**. The first request initiates the lookup, while the remaining 19 wait on the same Promise, saving 95% of API quota and eliminating duplicate directory creation race conditions.

### 3. Stream HighWaterMark Buffer Tuning
Streaming operations (`createReadStream`, `createWriteStream`, and `download`) are configured with a **1 MiB highWaterMark** buffer (compared to Node's 16 KiB default), allowing gigabit network pipes to stream continuously without I/O context thrashing.

---

## ⚡ Direct Access to Raw Client (`drive.getRawClient`)

When you need specialized Google Drive API v3 endpoints (revisions, comments, webhooks, or team drives), get the authenticated official client instance:

```typescript
const drive = await createDrive({ auth: { keyFilePath: './service-account.json' } });

// Get underlying @googleapis/drive client
const raw = await drive.getRawClient();

// Call any native v3 method directly
const res = await raw.revisions.list({ fileId: 'FILE_ID' });
console.log(res.data);
```

---

## 🚀 Resumable Chunk Tuning

Google requires chunk sizes to be multiples of **256 KiB**:
- **DriveKit default**: **8 MiB** (balanced for standard networks).
- **High-throughput servers**: Set to **16 MiB** or **32 MiB** to minimize HTTP roundtrips:

```typescript
const drive = await createDrive({
  uploadChunkSize: 16 * 1024 * 1024, // 16MB default
});

// Or per-upload:
await drive.upload({
  source: './large_dataset.tar.gz',
  parent: '/Backups',
  chunkSize: 32 * 1024 * 1024, // 32MB
});
```

---

## 🛡️ Exponential Backoff with Full Jitter

DriveKit retries transient errors (408, 429, 500, 502, 503, 504) automatically:
$$\text{delay} = \text{random}(0, \min(\text{maxDelay}, \text{baseDelay} \times 2^{\text{attempt}}))$$

```typescript
const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' },
  maxRetries: 7,          // 7 attempts
  retryBaseDelayMs: 1500, // 1.5s initial base delay
});
```

---

## 🧠 Low Memory Footprint

Passing a file path `string` to `upload({ source: '/path/to/huge.iso' })` streams chunks directly from disk with low-level `FileHandle` descriptors, keeping memory usage **under 30 MB** even for 20+ GB files!

---

## 🔒 Custom Scopes

Restrict permissions when needed:

```typescript
const drive = await createDrive({
  auth: {
    keyFilePath: './service-account.json',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  },
});
```

