# 🧩 Plugins Architecture

**DriveKit** provides an extensible plugin system that hooks into the core file lifecycle (`beforeUpload`, `afterUpload`, `beforeDownload`, `afterDownload`), allowing you to inspect, modify, or log operations without modifying library internals.

---

## 🛠️ Official Built-in Plugins

### 1. Webhook Notification Plugin (`createWebhookPlugin`)
Dispatches real-time HTTP POST notifications to webhooks (Discord, Slack, Telegram, Zapier, etc.) when uploads or downloads finish. Includes configurable timeouts, retries, and error handling:

```typescript
import { createDrive, createWebhookPlugin } from 'drivekit';

const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' },
});

drive.use(
  createWebhookPlugin({
    url: 'https://discord.com/api/webhooks/xxxx/yyyy',
    events: ['upload', 'download'],
    headers: { 'X-Secret': 'my-token' },
    timeout: 3000, // 3-second timeout per attempt (default: 5000ms)
    retries: 2,    // Retry up to 2 times on transient failures (default: 0)
    onError: (err, event) => {
      console.warn(`Webhook failed for ${event}:`, err.message);
    },
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
    suffix: '_v1',
  })
);

// Uploads as: prod_database_1740000000_v1.sql
await drive.upload({ source: './database.sql' });
```

---

## 🔄 Plugin Lifecycle & Management

### Duplicate Prevention
Registering a plugin with an existing `name` via `drive.use()` automatically replaces the previous registration, preventing duplicate hook execution or side-effects.

### Unregistering Plugins (`unuse`)
Plugins can be dynamically unregistered by name at runtime:

```typescript
// Unregister by name
const removed = drive.plugins.unuse('drivekit-official-webhook');
console.log(removed); // true if found and removed

// Check if a plugin is currently active
if (drive.plugins.has('my-custom-plugin')) {
  // ...
}

// Get all active plugins
const activePlugins = drive.plugins.getPlugins();
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
  },
};

drive.use(customLogger);
```
