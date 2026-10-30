# 🔍 Fluent Query Builder

---

## 💡 Example

```typescript
const files = await drive.query()
  .nameContains('invoice')
  .mimeType('application/pdf')
  .notTrashed()
  .modifiedAfter('2026-01-01')
  .starred(true)
  .orderBy('modifiedTime desc')
  .pageSize(25)
  .list();
```

---

## 🛠️ Chainable Methods

- `.nameEquals(string)`
- `.nameContains(string)`
- `.mimeType(string)`
- `.isFolder()` / `.isFile()`
- `.inFolder(folderId)`
- `.notTrashed()` / `.onlyTrashed()`
- `.starred(boolean)`
- `.sharedWithMe()`
- `.modifiedAfter(Date | string)`
- `.modifiedBefore(Date | string)`
- `.fullText(string)`
- `.orderBy(string)`
- `.pageSize(number)`
- `.list()` / `.first()` / `.count()`

---

## ⚡ Async Pagination Iterator

```typescript
for await (const file of drive.query().inFolder(folderId).notTrashed()) {
  console.log(`Processing: ${file.name}`);
}
```

