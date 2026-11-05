# 🔗 المشاركة والأذونات (Sharing & Permissions)

تسهل **DriveKit** التحكم في صلاحيات الوصول ومشاركة الملفات والحصول على الروابط المباشرة في سطر واحد:

---

## 🌐 جعل الملف عاماً (drive.sharePublic)

لجعل أي ملف أو مجلد متاحاً لأي شخص لديه الرابط والحصول على رابط المعاينة والرابط المباشر للتحميل:

```typescript
const links = await drive.sharePublic(fileId, 'reader');

console.log('رابط المعاينة:', links.previewLink);
// https://drive.google.com/file/d/1XbC.../view

console.log('رابط التحميل المباشر:', links.directDownloadLink);
// https://drive.google.com/uc?export=download&id=1XbC...
```

---

## 👥 مشاركة الملف مع بريد محدد (drive.share)

```typescript
await drive.share(fileId, {
  role: 'writer',                     // 'reader' | 'commenter' | 'writer'
  type: 'user',                       // 'user' | 'group' | 'domain' | 'anyone'
  emailAddress: 'colleague@gmail.com',
  sendNotificationEmail: true,
  emailMessage: 'مرحباً، إليك الملف الذي طلبته!',
});
```

---

## 🔗 الحصول على روابط المشاركة (drive.getShareableLink)

```typescript
const { previewLink, directDownloadLink } = await drive.getShareableLink('/Documents/report.pdf');
```

---

## 🏢 إدارة الصلاحيات بدقة (Fluent Permissions)

يمكنك إدارة الصلاحيات بالبريد مباشرة عبر المورد `drive.file()` أو `drive.folder()`:

### منح صلاحية لبريد محدد (`grantAccess`):
```typescript
const file = drive.file('/Contracts/Deal.pdf');

await file.grantAccess({
  email: 'partner@company.com',
  role: 'commenter', // 'reader' | 'commenter' | 'writer'
  notify: true,
  message: 'مرحباً، إليك مسودة العقد للمراجعة وإبداء الملاحظات.'
});
```

### إلغاء الصلاحية بالبريد أو المعرّف (`revokeAccess`):
```typescript
await file.revokeAccess('partner@company.com');
```

### استعراض كافة الصلاحيات الممنوحة (`listPermissions`):
```typescript
const permissions = await file.listPermissions();

for (const p of permissions) {
  console.log(`- ${p.displayName || p.emailAddress}: [${p.role}] (ID: ${p.id})`);
}
```

---

## 🏢 دعم الأقراص المشتركة للشركات (Google Workspace Shared Drives)

### استعراض الأقراص المشتركة المتاحة (`listSharedDrives`):
```typescript
const sharedDrives = await drive.listSharedDrives();

for (const sd of sharedDrives) {
  console.log(`📁 ${sd.name} - ID: ${sd.id}`);
}
```

### حصر وتوجيه العمليات لقرص مشترك محدد (`sharedDrive`):
```typescript
// إنشاء عميل مخصص محصور في Shared Drive معين
const marketingDrive = drive.sharedDrive('SHARED_DRIVE_ID');

// كافة العمليات هنا ستتم داخل هذا القرص المشترك حصراً:
const files = await marketingDrive.ls('/');
await marketingDrive.upload({ source: './banner.png', parent: '/Campaigns/2026' });
```

