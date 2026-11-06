# 🌊 تدفق البيانات والطلبات الجزئية (Streams & Range Requests)

تدعم **DriveKit** تدفق البيانات (Streams) الحقيقي المتوافق بنسبة 100% مع بروتوكولات Node.js Streams القياسية، مما يسمح بنقل ومعالجة ملفات بحجم عشرات الجيجابايتات دون حجز مساحات تخزين مؤقتة في الذاكرة أو على القرص الصلب.

---

## 📥 القراءة بالتدفق والطلبات الجزئية (`createReadStream`)

يتيح لك `createReadStream` استرجاع تدفق قراءة `ReadableStream` لملف موجود على Google Drive، مع دعم طلبات المدى (HTTP Range Requests - RFC 7233) لقراءة أجزاء وبايتات محددة من الملف:

### 1. قراءة الملف بالكامل كـ Stream
```typescript
import fs from 'node:fs';

const readStream = await drive.createReadStream('/Backups/database.sql');
const writeStream = fs.createWriteStream('./local-copy.sql');

readStream.pipe(writeStream);
```

### 2. قراءة مقاطع محددة من الملف (Audio/Video Streaming)
مثالي لتشغيل الفيديو والصوت أو القراءة الجزئية:

```typescript
// قراءة أول 1 ميجابايت فقط من الملف
const chunkStream = await drive.createReadStream('/Videos/conference.mp4', {
  start: 0,
  end: 1024 * 1024 - 1
});

// تمرير التدفق مباشرة في استجابة HTTP 206 لمشغل الفيديو في المتصفح
chunkStream.pipe(response);
```

### 3. استخدام الواجهة الموجهة للموارد (Fluent API)
```typescript
const videoStream = await drive.file('/Videos/sample.mp4').createReadStream({
  start: 500000,
  end: 1500000
});
```

---

## 📤 الكتابة المباشرة بالتدفق (`createWriteStream`)

تتيح لك دالة `createWriteStream` رفع تدفق بيانات مباشر من أي مصدر (تفريغ قاعدة بيانات، ملفات مضغوطة على الطاير، أو استجابة API أخرى) إلى Google Drive مباشرة دون الحاجة لإنشاء ملف مؤقت على جهازك:

### 1. الرفع عبر الـ Pipe وانتظار النتيجة (`.done`)
```typescript
import fs from 'node:fs';

const localReadStream = fs.createReadStream('./massive-export.csv');
const driveWriteStream = await drive.createWriteStream('/Exports/2026/export.csv', {
  mimeType: 'text/csv'
});

localReadStream.pipe(driveWriteStream);

// انتظر اكتمال الرفع واحصل على معلومات الملف المنشأ
const uploadedFile = await driveWriteStream.done;
console.log(`Uploaded file ID: ${uploadedFile.id}`);
```

### 2. الرفع المباشر عبر المجلد (Fluent Folder API)
```typescript
const folder = drive.folder('/Backups/Live');
const uploadStream = await folder.createWriteStream('live-backup.dump');

databaseProcess.stdout.pipe(uploadStream);
```

