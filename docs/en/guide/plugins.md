# 🧩 Plugins Architecture

**DriveKit** provides an extensible plugin system that hooks into the core file lifecycle (`beforeUpload`, `afterUpload`, `beforeDownload`, `afterDownload`), allowing you to inspect, modify, or log operations.

---

## 🛠️ Official Built-in Plugins

### 1. Webhook Notification Plugin (`createWebhookPlugin`)
Dispatches real-time HTTP POST notifications to webhooks (Discord, Slack, Telegram, Zapier, etc.) when uploads or downloads finish:

```typescript
import { createDrive, createWebhookPlugin } from 'drivekit';

const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' }
});

drive.use(
  createWebhookPlugin({
    url: 'https://discord.com/api/webhooks/xxxx/yyyy',
    events: ['upload', 'download'],
    headers: { 'X-Secret': 'my-token' }
  })
);

await drive.upload({ source: './report.pdf', parent: '/Reports' });
```

---

### 2. Auto-Namer & Timestamp Plugin (`createAutoNamePlugin`)
Automatically adds prefixes, suffixes, or timestamps to uploaded filenames:

```typescript
import { createDrive, createAutoNamePlugin } from 'drivekit';

const drive = await createDrive();

drive.use(
  createAutoNamePlugin({
    prefix: 'prod_',
    appendTimestamp: true,
    suffix: '_v1'
  })
);

// Uploads as: prod_database_1740000000_v1.sql
await drive.upload({ source: './database.sql' });
```

---

## 🏗️ Writing a Custom Plugin

Implement the `DriveKitPlugin` interface:

```typescript
import type { DriveKitPlugin } from 'drivekit';

const customLogger: DriveKitPlugin = {
  name: 'custom-logger',
  beforeUpload(options) {
    console.log(`[Before Upload] Preparing: ${options.filename || 'unknown'}`);
    return options;
  },
  afterUpload(file) {
    console.log(`[After Upload] Upload complete! File ID: ${file.id}`);
  }
};

drive.use(customLogger);
```

