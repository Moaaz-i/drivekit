# ⚙️ Advanced Settings & Optimization

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

