# 🗂️ إدارة الملفات والعمليات (File Management & CRUD)

توفر **DriveKit** مجموعة دوال متكاملة لتنفيذ كافة عمليات إدارة الملفات والمجلدات بكل بساطة وسرعة، مع دعم المسارات الافتراضية والمعرّفات على حد سواء.

---

## 🔍 التحقق من وجود الملف أو المجلد (`drive.exists`)

تتيح لك دالة `drive.exists` فحص وجود أي مسار أو معرّف دون التسبب في أخطاء استثنائية:

```typescript
// التحقق عبر مسار افتراضي
const isFound = await drive.exists('/Backups/2026/db.dump');
if (isFound) {
  console.log('الملف موجود بالفعل!');
}

// أو التحقق عبر معرّف ID مباشر
const fileExists = await drive.exists('1XbCHTHd23cc8eOzSkan4Vj0p-6iVhE9C');
```

---

## 📋 جلب بيانات الملف الوصفية (`drive.getFile`)

تسترجع البيانات الشاملة للملف (الاسم، الحجم، تاريخ التعديل والإنشاء، الآباء، الروابط، الخصائص):

```typescript
const file = await drive.getFile('/Documents/Invoice.pdf');

console.log('معرف الملف:', file.id);
console.log('الاسم:', file.name);
console.log('النوع:', file.mimeType);
console.log('الحجم:', file.size);
console.log('تاريخ التعديل:', file.modifiedTime);
console.log('رابط المعاينة:', file.webViewLink);
console.log('رابط التنزيل المباشر:', file.webContentLink);
```

---

## 🗑️ الحذف ونقل الملفات للسلة (`drive.delete` و `drive.trash`)

تدعم الأداة النقل الآمن للسلة أو الحذف النهائي المباشر:

```typescript
// 1. نقل الملف أو المجلد إلى السلة (Trash) - يمكن استرجاعه لاحقاً
await drive.trash('/OldData/archive.zip');
// أو:
await drive.delete('/OldData/archive.zip', false);

// 2. الحذف النهائي الأبدي (Permanent Delete)
await drive.delete('/Temp/unneeded.log', true);
```

> **ملاحظة:** عند حذف مسار افتراضي، تقوم DriveKit تلقائياً بتحديث وتفريغ التخزين المؤقت (Cache Invalidation) لهذا المسار فوراً.

---

## ♻️ استعادة الملفات من السلة (`drive.restore`)

إذا قمت بنقل ملف للسلة بالخطأ، يمكنك استعادته بلمسة واحدة:

```typescript
await drive.restore(fileId);
console.log('تمت استعادة الملف من السلة بنجاح!');
```

---

## 📦 نقل الملفات بين المجلدات (`drive.move`)

لنقل ملف من مجلد إلى آخر مع تحديث الآباء تلقائياً:

```typescript
// نقل ملف إلى مجلد آخر عبر مسار افتراضي (يتم إنشاء المجلد الهدف تلقائياً إن لم يوجد!)
const updatedFile = await drive.move('/Inbox/contract.pdf', '/Archive/2026');

console.log(`تم نقل الملف ${updatedFile.name} إلى المجلد الجديد!`);
```

---

## ✏️ إعادة تسمية الملفات (`drive.rename`)

```typescript
await drive.rename('/Documents/draft.docx', 'final-report.docx');
```

---

## 📄 نسخ الملفات (`drive.copy`)

لإنشاء نسخة مطابقة من ملف موجود، مع إمكانية تحديد اسم جديد ومجلد هدف مختلف:

```typescript
const copiedFile = await drive.copy('/Templates/agreement.docx', {
  name: 'Agreement-Client-A.docx',
  parent: '/Clients/Client-A', // مسار افتراضي أو معرّف
});

console.log('تم إنشاء النسخة بمعرف:', copiedFile.id);
```

