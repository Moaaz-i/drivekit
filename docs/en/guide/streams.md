# 🌊 Streams & Range Requests

**DriveKit** provides first-class support for native Node.js Streams, allowing you to stream gigabytes of data seamlessly with constant memory consumption and zero temporary disk overhead.

---

## 📥 Streaming Reads & Partial Content (`createReadStream`)

The `createReadStream` method returns a standard `NodeJS.ReadableStream` with full support for HTTP Range requests (RFC 7233) to fetch specific byte slices:

### 1. Pipe Entire File
```typescript
import fs from 'node:fs';

const readStream = await drive.createReadStream('/Backups/database.sql');
const writeStream = fs.createWriteStream('./local-copy.sql');

readStream.pipe(writeStream);
```

### 2. Audio/Video Streaming with Range Requests
Ideal for video/audio seeking and partial HTTP 206 responses:

```typescript
// Fetch the first 1 MB slice
const chunkStream = await drive.createReadStream('/Videos/conference.mp4', {
  start: 0,
  end: 1024 * 1024 - 1
});

// Pipe directly to browser video player HTTP response
chunkStream.pipe(response);
```

### 3. Fluent Resource API
```typescript
const videoStream = await drive.file('/Videos/sample.mp4').createReadStream({
  start: 500000,
  end: 1500000
});
```

---

## 📤 Direct Streaming Writes (`createWriteStream`)

The `createWriteStream` method creates a writable `PassThrough` stream, enabling you to stream data directly into Google Drive from any source (database dumps, live sensor feeds, or network pipes) without writing to disk:

### 1. Pipe to Drive
```typescript
import fs from 'node:fs';

const localReadStream = fs.createReadStream('./massive-export.csv');
const driveWriteStream = await drive.createWriteStream('/Exports/2026/export.csv', {
  mimeType: 'text/csv'
});

localReadStream.pipe(driveWriteStream);
```

### 2. Stream into a Folder (Fluent Folder Ref)
```typescript
const folder = drive.folder('/Backups/Live');
const uploadStream = await folder.createWriteStream('live-backup.dump');

databaseProcess.stdout.pipe(uploadStream);
```

