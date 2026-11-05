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

---

## 🏢 Fluent Permission Management

Manage access directly using fluent resource references:

### Grant Access (`grantAccess`):
```typescript
const file = drive.file('/Contracts/Deal.pdf');

await file.grantAccess({
  email: 'partner@company.com',
  role: 'commenter', // 'reader' | 'commenter' | 'writer'
  notify: true,
  message: 'Here is the draft for your review.'
});
```

### Revoke Access (`revokeAccess`):
```typescript
await file.revokeAccess('partner@company.com');
```

### List Active Permissions (`listPermissions`):
```typescript
const permissions = await file.listPermissions();

for (const p of permissions) {
  console.log(`- ${p.displayName || p.emailAddress}: [${p.role}] (ID: ${p.id})`);
}
```

---

## 🏢 Google Workspace Shared Drives

### List Accessible Shared Drives (`listSharedDrives`):
```typescript
const sharedDrives = await drive.listSharedDrives();

for (const sd of sharedDrives) {
  console.log(`📁 ${sd.name} - ID: ${sd.id}`);
}
```

### Scope Client to a Shared Drive (`sharedDrive`):
```typescript
const marketingDrive = drive.sharedDrive('SHARED_DRIVE_ID');

// All subsequent operations are locked within this shared drive:
const files = await marketingDrive.ls('/');
await marketingDrive.upload({ source: './banner.png', parent: '/Campaigns/2026' });
```

