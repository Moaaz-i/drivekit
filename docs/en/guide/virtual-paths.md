# 📂 Virtual Paths & Filesystem

In Google Drive, directories do not have physical paths; they are nodes with parents. DriveKit bridges this gap by providing full POSIX-like virtual path support.

---

## 🌟 Recursive Directory Creation (drive.mkdirp)

```typescript
const folderId = await drive.mkdirp('/Backups/2026/October');
console.log('Folder ID:', folderId);
```

---

## 🔍 Path Resolution (drive.resolvePath)

```typescript
const info = await drive.resolvePath('/Documents/Projects/AppConfig.json');

console.log(info.id);       // '1a2b3c4d...'
console.log(info.name);     // 'AppConfig.json'
console.log(info.isFolder); // false
console.log(info.mimeType); // 'application/json'
```

---

## 📁 Listing Directory Contents (drive.ls)

```typescript
// Lists root items and shared folders
const rootItems = await drive.ls('/');

// Lists contents of subpath
const projectFiles = await drive.ls('/Projects/2026');
```

