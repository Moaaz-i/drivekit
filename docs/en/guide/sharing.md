# 🔗 Sharing & Permissions

---

## 🌐 Instant Public Sharing

```typescript
const links = await drive.sharePublic(fileId, 'reader');

console.log('Preview Link:', links.previewLink);
console.log('Direct Download Link:', links.directDownloadLink);
```

---

## 👥 User Sharing

```typescript
await drive.share(fileId, {
  role: 'writer',
  type: 'user',
  emailAddress: 'colleague@example.com',
  sendNotificationEmail: true,
  emailMessage: 'Check out the new report!',
});
```

