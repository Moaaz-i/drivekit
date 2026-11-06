# 🚀 Getting Started

**DriveKit** delivers a developer-first Google Drive SDK and CLI for JavaScript and TypeScript.

---

## 📦 Installation

::: code-group
```bash [npm]
npm install drivekit
```

```bash [pnpm]
pnpm add drivekit
```

```bash [yarn]
yarn add drivekit
```

```bash [bun]
bun add drivekit
```
:::

---

## ⚡ Quick Start

```typescript
import { createDrive } from 'drivekit';

// 1. Initialize DriveKit
const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' },
});

// 2. Upload file to a virtual path
const file = await drive.upload({
  source: './report.pdf',
  parent: '/Backups/2026',
  onProgress: (p) => console.log(`${p.percentage}% | ${p.speedFormatted}`),
});

console.log('Uploaded File ID:', file.id);
```

---

## 💡 Configuration Options

```typescript
interface DriveKitOptions {
  auth?: DriveKitAuthConfig;
  rootFolderId?: string;       // defaults to 'root'
  uploadChunkSize?: number;    // defaults to 8MB
  concurrency?: number;        // defaults to 4
  enablePathCache?: boolean;   // defaults to true
  pathCacheTTL?: number;       // defaults to 5 minutes
  maxRetries?: number;         // defaults to 5
}
```

