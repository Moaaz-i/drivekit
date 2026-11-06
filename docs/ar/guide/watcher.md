# 📡 مراقب التغييرات اللحظي (Real-time Change Watcher)

من أكبر التحديات التي تواجه المطورين مع Google Drive هي معرفة اللحظة التي يتم فيها إضافة أو تعديل أو حذف ملف أو مجلد.

تقدم **DriveKit** محرك مراقبة تفاعلي فائق الذكاء (`drive.watch()`) مبني على نمط `EventEmitter` ويتواصل مع Google Drive Changes API في الخلفية.

---

## ⚡ الاستخدام الأساسي

```typescript
// مراقبة مجلد محدد (أو الحساب كاملاً إذا لم تحدد مجلداً)
const watcher = await drive.watch('/Backups', {
  intervalMs: 5000, // فحص التغييرات كل 5 ثوانٍ
});

// 1. الاستماع لإنشاء ملفات جديدة
watcher.on('create', (event) => {
  console.log('📄 تم إنشاء ملف جديد:', event.file?.name, event.fileId);
});

// 2. الاستماع لتعديل الملفات
watcher.on('modify', (event) => {
  console.log('✏️  تم تعديل الملف:', event.file?.name, event.fileId);
});

// 3. الاستماع لحذف الملفات
watcher.on('delete', (event) => {
  console.log('🗑️  تم حذف الملف:', event.fileId);
});

// 4. الاستماع لأي تغيير عام
watcher.on('change', (event) => {
  console.log(`[${event.type.toUpperCase()}] في الوقت: ${event.time.toLocaleTimeString()}`);
});

// إيقاف المراقبة عند الانتهاء
// watcher.stop();
```

---

## 📊 كائن حدث التغيير (`FileChangeEvent`)

| الخاصية | النوع | الوصف |
|---|---|---|
| `type` | `'create' \| 'modify' \| 'delete'` | نوع الحدث الذي طرأ على الملف |
| `fileId` | `string` | معرّف الملف في Google Drive |
| `file` | `DriveApiFile` | البيانات الوصفية للملف (الاسم، الحجم، تاريخ التعديل...) |
| `removed` | `boolean` | هل تم حذفه بالكامل من الدرايف |
| `time` | `Date` | توقيت حدوث التغيير |

---

## 💻 المراقبة الحية من سطر الأوامر (CLI)

يمكنك تشغيل المراقبة مباشرة من الطرفية لمشاهدة التغييرات تتدفق أمام عينيك في الوقت الفعلي:

```bash
npx drivekit watch /Backups -i 3000
```

