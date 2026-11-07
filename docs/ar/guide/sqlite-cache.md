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

يقوم هذا الأمر بمسح حساب Google Drive دفعة واحدة (Bulk List) وفهرسة كافة الملفات والمجلدات في قاعدة البيانات المحلية. في الإصدار v1.1.1 يقوم `syncCache()` بحساب المسارات الهرمية التراكمية بالكامل (`/Backups/2026/db.sql`) وتنظيف وحذف أي سجلات ملغاة من قاعدة البيانات (`pruneMissing`):

```typescript
const stats = await drive.syncCache({
  onProgress: (scanned) => {
    console.log(`تم مسح وفهرسة ${scanned} عنصراً...`);
  }
});

console.log(`إجمالي المجلدات المفهرسة: ${stats.folderCount}`);
console.log(`إجمالي الملفات المفهرسة:   ${stats.fileCount}`);
console.log(`مسار قاعدة البيانات:       ${stats.databasePath}`);
```

> **ملاحظة حول التوافقية مع بيئات CI**: في حال تشغيل الكود في بيئة لا تدعم `node:sqlite` (مثل Node 18 أو 20 القديمة)، تنتقل DriveKit تلقائياً وبشكل شفاف إلى التخزين المؤقت في الذاكرة (In-Memory Fallback) لضمان استمرارية التشغيل دون أخطاء.

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

### 5. التخزين المؤقت الاستباقي للشجرة (`drive.ls`)

بمجرد استدعاء `drive.ls('/path')` أو معرف مجلد، تقوم DriveKit تلقائياً وبشكل استباقي بفحص كافة العناصر المعادة وتخزين بياناتها ومساراتها الافتراضية المحسوبة دفعة واحدة داخل SQLite بمعاملة ذرية سريعة.

أي استدعاء لاحق لـ `drive.resolvePath()` أو `drive.getFile()` أو `drive.exists()` لأي من تلك العناصر يستجيب خلال **0.03 مللي ثانية (0ms Hit)** مباشرة من قاعدة البيانات المحلية دون إرسال أي طلب HTTP إلى Google Drive:

```typescript
// 1. استعراض محتويات المجلد (يجلب من السحابة ويخزن الشجرة استباقياً)
const items = await drive.ls('/Backups');

// 2. الاستعلام اللاحق يستجيب فوراً من SQLite في 0.03ms دون استهلاك الشبكة!
const file = await drive.getFile('/Backups/database.sql');
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

