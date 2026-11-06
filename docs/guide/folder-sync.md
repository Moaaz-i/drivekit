# 🔄 Parallel Folder Sync

Concurrently upload complete directory trees with bounded concurrency:

```typescript
const result = await drive.syncFolder('./my-build-dist', '/Websites/Production', {
  concurrency: 6,   // 6 parallel uploads
  overwrite: true,
  onFileStart: (_, rel) => console.log(`Starting: ${rel}`),
  onFileComplete: (path, id) => console.log(`Finished: ${path}`),
});

console.log(`Synced ${result.uploaded.length} files in ${(result.durationMs / 1000).toFixed(1)}s`);
```

