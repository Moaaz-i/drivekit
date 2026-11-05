# ⚡ محرك الكاش المحلي فائق السرعة (SQLite Cache Engine)

تأتي مكتبة **DriveKit** بمحرك كاش محلي دائم فائق التطور يعتمد على **`node:sqlite`** المدمج في Node.js 22. يقوم هذا المحرك بفهرسة شجرة المجلدات، معرّفات الملفات، وتوقيعات الـ MD5 محلياً، مما يتيح استجابة فورية في **0ms** لعمليات فحص المسارات واستعراض المجلدات دون استهلاك كوتا Google Drive API.

---

## 🌟 لماذا محرك SQLite المحلي؟

1. **سرعة خارقة (0ms Path Resolution)**: بدلاً من إرسال طلبات شبكة تسلسلية للبحث عن معرف كل مجلد، يتم جلب المسار من قاعدة البيانات المحلية فورياً.
2. **استمرار الكاش عبر الجلسات (Persistent across CLI Runs)**: يبقى الكاش مخزناً على جهازك في `~/.drivekit/cache.db` حتى بعد إعادة تشغيل السيرفر أو انتهاء أمر الـ CLI.
3. **تفادي استهلاك الكوتا (Rate-Limit Immune)**: تجنب مواجهة أخطاء `429 Too Many Requests` أثناء العمليات المتكررة.
4. **صفر مكتبات خارجية (Zero-Dependency)**: يعمل مباشرة عبر محرك SQLite الداخلي في Node.js دون الحاجة لترجمة كود C++ بواسطة node-gyp.

---

## 💻 الاستخدام البرمجي

### 1. تفعيل الكاش تلقائياً

يعمل الكاش بشكل تلقائي وافتراضي عند إنشاء أي عميل DriveKit:

```typescript
import { createDrive } from 'drivekit';

const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' },
  enablePersistentCache: true, // مفعل افتراضياً
  // يمكنك تحديد مسار مخصص لقاعدة البيانات (اختياري)
  // cacheDatabasePath: './my-custom-cache.db'
});
```

---

### 2. مزامنة وفهرسة محتويات Drive في الكاش (`syncCache`)

يقوم هذا الأمر بمسح حساب Google Drive دفعة واحدة (Bulk List) وفهرسة كافة الملفات والمجلدات في قاعدة البيانات المحلية:

```typescript
const stats = await drive.syncCache({
  onProgress: (scanned) => {
    console.log(`تم مسح وفهرسة ${scanned} عنصراً...`);
  }
});

console.log(`إجمالي المجلدات المفهرسة: ${stats.folderCount}`);
console.log(`إجمالي الملفات المفهرسة:   ${stats.fileCount}`);
```

---

### 3. استعراض إحصائيات الكاش (`getCacheStats`)

```typescript
const stats = await drive.getCacheStats();

if (stats) {
  console.log(`مسار قاعدة البيانات: ${stats.databasePath}`);
  console.log(`عدد الملفات: ${stats.fileCount}`);
  console.log(`عدد المجلدات: ${stats.folderCount}`);
  console.log(`الحجم الكلي: ${stats.totalSizeBytes} بايت`);
  console.log(`تاريخ آخر مزامنة: ${stats.lastSyncTime}`);
}
```

---

### 4. مسح الكاش (`clearCache`)

```typescript
await drive.clearCache();
console.log('تم تنظيف الكاش المحلي بنجاح');
```

---

## 🛠️ أوامر سطر الأوامر (CLI)

يمكنك إدارة الكاش المحلي مباشرة عبر الطرفية:

### عرض حالة وإحصائيات الكاش:
```bash
npx drivekit cache status
```

### عمل مزامنة وفهرسة لحسابك السحابي:
```bash
npx drivekit cache sync
```

### مسح قاعدة البيانات المحلية:
```bash
npx drivekit cache clear
```
