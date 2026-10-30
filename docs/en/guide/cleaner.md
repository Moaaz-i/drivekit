# 🧹 Storage Cleaner & Duplicates

Keep your Google Drive storage optimized and free from space-wasters.

---

## 🔍 Find Largest Space-Eaters (`drive.findLargestFiles`)

```typescript
const largest = await drive.findLargestFiles(10);

for (const file of largest) {
  console.log(`${file.name.padEnd(30)} ${file.formattedSize} (${file.id})`);
}
```

---

## 👥 Detect Duplicate Files (`drive.findDuplicates`)

Detect duplicates by exact file name or byte-accurate MD5 checksum:

```typescript
const duplicates = await drive.findDuplicates({ by: 'md5' });

for (const group of duplicates) {
  console.log(`"${group.name}" has ${group.count} copies (Total: ${group.formattedTotalSize})`);
}
```

---

## 🗑️ Empty Trash Bin (`drive.emptyTrash`)

```typescript
await drive.emptyTrash();
```

---

## 💻 CLI Commands

```bash
# View top 15 largest files
npx drivekit clean -l 15

# Scan for duplicates
npx drivekit clean --duplicates

# Empty trash
npx drivekit clean --empty-trash
```

