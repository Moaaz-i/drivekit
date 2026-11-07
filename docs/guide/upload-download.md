# 🚀 Upload & Download

---

## ⚡ High-Speed Uploads (drive.upload)

Upload local files, in-memory Buffers, or Node.js Streams with live progress tracking:

```typescript
const file = await drive.upload({
  source: './4k-video.mp4',
  name: 'video.mp4',
  parent: '/Media/Videos/2026',
  overwrite: true,
  chunkSize: 8 * 1024 * 1024, // 8MB chunks
  onProgress: (p) => {
    console.log(`Progress: ${p.percentage}%`);
    console.log(`Speed: ${p.speedFormatted}`);
    console.log(`ETA: ${p.estimatedTimeRemainingSeconds}s`);
    console.log(`Chunk: ${p.chunkIndex}/${p.totalChunks}`);
  },
});
```

### 🏎️ Single-Roundtrip Fast Path (Files ≤ 5MB)
For files, buffers, or streams under or equal to **5 MiB**, DriveKit automatically activates the **Direct Multipart Upload** path. This cuts network latency in half by eliminating the initial session-initiation HTTP roundtrip, uploading the file in a single request while still delivering real-time progress callbacks.

### 📐 Adaptive Chunk Sizing
For files exceeding 5MB, DriveKit dynamically scales chunk granularity based on file volume:
- **Default**: **8 MiB** chunks for balanced memory and throughput.
- **Large Files (> 32 MiB)**: Scales to **16 MiB** chunks.
- **Huge Files (> 128 MiB)**: Scales to **32 MiB** chunks, reducing HTTP requests by up to 75%.
- **Custom Granularity**: Explicit `chunkSize` option is always honored (quantized to multiples of 256 KiB).

---

## 📥 Download & Auto-Export (drive.download)

Binary files are streamed or saved directly. **Google Workspace documents are automatically converted**:
- **Google Docs** $\rightarrow$ PDF (or Word docx)
- **Google Sheets** $\rightarrow$ Excel xlsx (or CSV)
- **Google Slides** $\rightarrow$ PDF

```typescript
const res = await drive.download('/Documents/Report.docx', {
  destination: './downloads',
  onProgress: (p) => console.log(`Downloaded ${p.bytesRead} bytes at ${p.speedFormatted}`),
});
```

---

## ⚡ Instant Cloud Deduplication

By setting `deduplicate: true`, DriveKit hashes your local file and checks the SQLite cache and Google Drive cloud:

- If an identical file exists, DriveKit performs an **instant cloud-side copy** in **~200ms** with 0 bytes transferred over the network!
- Ideal for redundant deployments and large backup files.

```typescript
const file = await drive.upload({
  source: './50GB-backup.iso',
  parent: '/Backups/Archive',
  deduplicate: true, // Instant Cloud Upload
});
```

---

## 📄 Read Text & JSON Directly

```typescript
// Read JSON file directly
const config = await drive.getJson('/Config/appsettings.json');

// Read plain text or Google Doc
const text = await drive.getText('/Notes/meeting.txt');
```

