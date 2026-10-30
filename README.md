# ⚡ DriveKit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

> **DriveKit** is a fast, powerful, and developer-friendly Google Drive SDK and CLI for JavaScript and TypeScript.

---

## 🚀 Why DriveKit?

Working with the raw Google Drive API is often tedious:
- **No virtual path system**: You must resolve folder IDs manually layer-by-layer.
- **Resumable uploads are difficult**: Handling chunked uploads, resume checkpoints, and network backoff requires hundreds of lines of boilerplate.
- **Strict rate limits**: Hitting `429 Too Many Requests` or `503 Service Unavailable` crashes unhandled pipelines.
- **Search syntax is cryptic**: String interpolation with SQL-like syntax (`'root' in parents and trashed = false`) is prone to formatting bugs.
- **Exporting Google Docs/Sheets is clunky**: Binary downloads fail if a file is a Google Doc or Sheet unless converted.

**DriveKit solves all of this with an intuitive, production-ready API.**

---

## 🌟 Key Features

- 📂 **Virtual Filesystem Paths**: Treat Drive like a filesystem (`/Backups/2026/DB.dump`). Auto-creates missing parents (`mkdirp`).
- ⚡ **High-Speed Resumable Uploader**:
  - Memory-efficient chunked uploads (configurable 8MB or 16MB chunk sizes).
  - Auto-resumes from interrupted byte offset.
  - Real-time metrics: **Percentage (%)**, **Live Speed (MB/s)**, and **ETA**.
- 🔍 **Fluent Query Builder**: Chainable methods (`.nameContains()`, `.mimeType()`, `.notTrashed()`, `.orderBy()`, `.pageSize()`).
- 🛡️ **Adaptive Rate Limiting & Backoff**: Exponential backoff with full jitter automatically catches and retries `429` and `5xx` errors.
- 🔄 **Parallel Directory Sync**: Concurrently sync entire local folder trees with configurable concurrency limit.
- 📑 **Auto-Export Google Docs**: Seamlessly exports Google Docs (PDF/Docx), Sheets (Excel/CSV), and Slides (PDF).
- 🔗 **Instant Sharing**: One-liner to make files publicly accessible and obtain direct download and preview URLs.
- 💻 **Modern CLI Included**: Perform operations right from your terminal with `drivekit ls`, `drivekit upload`, `drivekit sync`, etc.

---

## 📦 Installation

```bash
npm install drivekit
# or
pnpm add drivekit
# or
yarn add drivekit
```

---

## 🔑 Authentication

DriveKit supports all standard authentication strategies:

```typescript
import { createDrive } from 'drivekit';

// 1. Service Account JSON file (or GOOGLE_APPLICATION_CREDENTIALS)
const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' },
});

// 2. Direct Bearer Access Token
const drive = await createDrive({
  auth: { accessToken: 'ya29.a0AfH...' },
});

// 3. OAuth2 Client Credentials & Refresh Token
const drive = await createDrive({
  auth: {
    oauth: {
      clientId: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET',
      refreshToken: 'YOUR_REFRESH_TOKEN',
    },
  },
});
```

---

## 💡 Quick Examples

### Uploading a Large File with Live Progress
```typescript
const file = await drive.upload({
  source: './large-archive.tar.gz',
  name: 'backup.tar.gz',
  parent: '/Backups/Servers', // Automatically creates folders if missing!
  overwrite: true,
  onProgress: (p) => {
    console.log(`${p.percentage}% | ${p.speedFormatted} | ETA: ${p.estimatedTimeRemainingSeconds}s`);
  },
});
```

### Fluent Search Query
```typescript
const files = await drive.query()
  .nameContains('invoice')
  .mimeType('application/pdf')
  .notTrashed()
  .modifiedAfter('2026-01-01')
  .orderBy('modifiedTime desc')
  .list();
```

### Downloading or Exporting
```typescript
await drive.download('/Documents/Report.docx', {
  destination: './local-folder',
  onProgress: (p) => {
    console.log(`Downloaded ${p.bytesRead} bytes at ${p.speedFormatted}`);
  },
});
```

### Read JSON or Text Directly
```typescript
const config = await drive.getJson('/Config/settings.json');
const text = await drive.getText('/Notes/todo.txt');
```

### Public Sharing
```typescript
const links = await drive.sharePublic(file.id);
console.log('Preview:', links.previewLink);
console.log('Direct Download:', links.directDownloadLink);
```

### Concurrent Folder Sync
```typescript
const result = await drive.syncFolder('./dist', '/Websites/Production', {
  concurrency: 6, // 6 parallel uploads
  overwrite: true,
});
console.log(`Synced ${result.uploaded.length} files in ${result.durationMs / 1000}s`);
```

---

## 💻 CLI Usage

```bash
# Set credentials once
export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"

# Check quota
npx drivekit quota

# List folder contents
npx drivekit ls /Backups

# Upload with progress
npx drivekit upload ./archive.zip /Backups

# Download
npx drivekit download FILE_ID ./downloads

# Share
npx drivekit share FILE_ID

# Recursive sync
npx drivekit sync ./dist /Backups -c 4
```

---

## 📚 Interactive Documentation (VitePress)

DriveKit includes a bilingual (Arabic & English) interactive documentation site built with **VitePress**:

```bash
# Start local documentation dev server
npm run docs:dev

# Build static documentation site
npm run docs:build

# Preview production build
npm run docs:preview
```

---

## 🧪 Testing

```bash
npm test
npm run build
```

---

## 📄 License
MIT © Moaaz

