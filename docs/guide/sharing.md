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

