# 📡 Real-time Change Watcher

Stay in sync with Google Drive using DriveKit's reactive `drive.watch()` event emitter.

---

## ⚡ Basic Usage

```typescript
// Watch a specific directory or the whole drive
const watcher = await drive.watch('/Backups', {
  intervalMs: 5000,
});

watcher.on('create', (event) => {
  console.log('Created:', event.file?.name, event.fileId);
});

watcher.on('modify', (event) => {
  console.log('Modified:', event.file?.name, event.fileId);
});

watcher.on('delete', (event) => {
  console.log('Deleted:', event.fileId);
});

watcher.on('change', (event) => {
  console.log(`[${event.type.toUpperCase()}] at ${event.time.toLocaleTimeString()}`);
});

// Stop watching
// watcher.stop();
```

---

## 💻 CLI Live Watching

```bash
npx drivekit watch /Backups -i 3000
```

