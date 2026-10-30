# 🗂️ File Management & CRUD

DriveKit provides an intuitive suite of methods to handle the complete lifecycle of files and folders using either virtual paths or IDs.

---

## 🔍 Checking Existence (`drive.exists`)

```typescript
// Check by virtual path
const found = await drive.exists('/Backups/2026/db.dump');

// Check by ID
const fileExists = await drive.exists('1XbCHTHd23cc8eOzSkan4Vj0p-6iVhE9C');
```

---

## 📋 Get File Metadata (`drive.getFile`)

```typescript
const file = await drive.getFile('/Documents/Invoice.pdf');

console.log('ID:', file.id);
console.log('Name:', file.name);
console.log('MIME:', file.mimeType);
console.log('Size:', file.size);
console.log('Modified:', file.modifiedTime);
console.log('Preview:', file.webViewLink);
console.log('Direct Download:', file.webContentLink);
```

---

## 🗑️ Trashing & Permanent Deletion (`drive.delete` & `drive.trash`)

```typescript
// 1. Move to Trash (can be restored later)
await drive.trash('/OldData/archive.zip');
// or:
await drive.delete('/OldData/archive.zip', false);

// 2. Permanent Delete (cannot be recovered)
await drive.delete('/Temp/unneeded.log', true);
```

> **Note:** Whenever a path is deleted or trashed, DriveKit automatically invalidates its cached path entry.

---

## ♻️ Restoring from Trash (`drive.restore`)

```typescript
await drive.restore(fileId);
```

---

## 📦 Moving Files Between Folders (`drive.move`)

```typescript
// Target folder is auto-created if it doesn't exist!
const updatedFile = await drive.move('/Inbox/contract.pdf', '/Archive/2026');
console.log(`Moved to new folder: ${updatedFile.name}`);
```

---

## ✏️ Renaming Files (`drive.rename`)

```typescript
await drive.rename('/Documents/draft.docx', 'final-report.docx');
```

---

## 📄 Copying Files (`drive.copy`)

```typescript
const copied = await drive.copy('/Templates/agreement.docx', {
  name: 'Agreement-Client-A.docx',
  parent: '/Clients/Client-A',
});

console.log('Copied File ID:', copied.id);
```

