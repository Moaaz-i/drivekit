# ⚡ DriveKit (أداة Google Drive فائقة السرعة والمرونة للمطورين)

> حزمة جافاسكريبت وتايب سكريبت حديثة، فائقة السرعة والموثوقية، تمنح المطورين قوة مطلقة في التعامل مع **Google Drive** بأبسط كود ممكن وبأعلى أداء!

---

## 🌟 لماذا DriveKit؟

التعامل المباشر مع مكتبات Google Drive الرسمية مليء بالتعقيدات:
- ❌ لا يوجد نظام مسارات حقيقي (تحتاج يدوياً للبحث عن معرف المجلد `folderId` خطوة بخطوة).
- ❌ رفع الملفات الكبيرة يتطلب كتابة مئات أسطر الكود للتعامل مع الرفع المتقطع والقطع وحسابات البايتات.
- ❌ مواجهة مشاكل تجاوز كوتا الاستعلامات (429 Rate Limits) وتوقف العمليات.
- ❌ كتابة استعلامات البحث كسلاسل نصية SQL معقدة ومعرضة للأخطاء الإملائية والهروب (Escaping).
- ❌ صعوبة تنزيل وتصدير مستندات Google Docs و Sheets و Slides إلى PDF أو Excel.

**DriveKit تحل كل هذه المشاكل بأسلوب ساحر!**

---

## ✨ المميزات الرئيسية

1. 📂 **نظام مسارات افتراضي ذكي (Virtual Path System)**:
   - تعامل مع Google Drive كنظام ملفات حقيقي: `drive.mkdirp('/Backups/2026')` أو الرفع المباشر إلى مسار: `parent: '/Projects/App'`.
   - تخزين مؤقت تلقائي لمسارات المجلدات لتسريع العمليات وتوفير استعلامات الـ API.

2. 🚀 **محرك رفع متقطع فائق السرعة (Resumable Chunked Uploader)**:
   - رفع آمن للملفات الضخمة (ميجابايتات وجيجابايتات) بقطع سريعة (8MB أو 16MB).
   - استئناف تلقائي عند انقطاع الشبكة بدون إعادة رفع الملف من الصفر.
   - تتبع حي ودقيق: **نسبة الإنجاز %**، **سرعة الرفع الحالية (MB/s)**، **الوقت المتبقي المقدر (ETA)**.

3. 🔍 **باني استعلامات سلس (Fluent Query Builder)**:
   - كتابة استعلامات نظيفة وسلسة وسهلة القراءة بأسلوب السلسلة (Chaining).

4. 🛡️ **مقاومة أخطاء الشبكة والكوتا (Exponential Backoff with Full Jitter)**:
   - إعادة محاولة ذكية وتلقائية عند مواجهة `429 Too Many Requests` أو `5xx Backend Errors`.

5. ⚡ **مزامنة المجلدات بالتوازي (Parallel Sync Engine)**:
   - رفع مجلدات كاملة بجميع تفرعاتها بالتوازي مع التحكم في عدد المسارات المتزامنة (Concurrency).

6. 📄 **تصدير مستندات Google تلقائياً**:
   - تحويل Google Docs إلى PDF أو Docx، و Sheets إلى Excel أو CSV، و Slides إلى PDF بلمسة واحدة.

7. 🔗 **مشاركة فورية للملفات**:
   - تحويل أي ملف إلى عام بلمسة واحدة والحصول على رابط العرض والرابط المباشر للتحميل (`directDownloadLink`).

8. 💻 **أداة سطر أوامر مدمجة (CLI)**:
   - تشغيل مباشر من الطرفية عبر `drivekit ls` أو `drivekit upload` أو `drivekit sync`.

---

## 📦 التثبيت

```bash
npm install drivekit
# أو
pnpm add drivekit
# أو
yarn add drivekit
```

---

## 🔑 خيارات المصادقة السريعة

يدعم **DriveKit** كافة طرق المصادقة الشائعة:

### 1. عبر ملف Service Account (الأكثر شيوعاً للمخدمات والبوتات):
```typescript
import { createDrive } from 'drivekit';

const drive = await createDrive({
  auth: {
    keyFilePath: './service-account.json', // أو عبر متغير البيئة GOOGLE_APPLICATION_CREDENTIALS
  },
});
```

### 2. عبر رمز الدخول المباشر (Access Token):
```typescript
const drive = await createDrive({
  auth: { accessToken: 'ya29.a0AfH...' }
});
```

### 3. عبر OAuth2:
```typescript
const drive = await createDrive({
  auth: {
    oauth: {
      clientId: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET',
      refreshToken: 'YOUR_REFRESH_TOKEN',
    }
  }
});
```

---

## 🚀 أمثلة عملية

### 1. رفع ملف مع تتبع السرعة ونسبة الإنجاز
```typescript
const file = await drive.upload({
  source: './database-backup.zip', // مسار ملف محلي أو Buffer أو Stream
  name: 'db-backup-2026.zip',
  parent: '/Backups/Databases', // مسار افتراضي (يتم إنشاؤه تلقائياً إن لم يوجد!)
  overwrite: true,
  onProgress: (p) => {
    console.log(`نسبة الإنجاز: ${p.percentage}% | السرعة: ${p.speedFormatted} | متبقي: ${p.estimatedTimeRemainingSeconds} ثانية`);
  },
});

console.log(`تم الرفع بنجاح! معرف الملف: ${file.id}`);
```

### 2. البحث والاستعلام بأسلوب سلس (Query Builder)
```typescript
const files = await drive.query()
  .nameContains('invoice')
  .mimeType('application/pdf')
  .notTrashed()
  .modifiedAfter('2026-01-01')
  .orderBy('modifiedTime desc')
  .pageSize(20)
  .list();

for (const f of files) {
  console.log(`- ${f.name} [${f.id}]`);
}
```

### 3. تنزيل ملف أو تصدير مستند
```typescript
// تنزيل ملف وحفظه في مجلد محلي
await drive.download('FILE_ID_OR_PATH', {
  destination: './downloads',
  onProgress: (p) => {
    console.log(`تم تنزيل: ${p.bytesRead} بايت بسرعه ${p.speedFormatted}`);
  }
});
```

### 4. قراءة محتوى نصي أو JSON مباشرة
```typescript
// قراءة ملف JSON من الدرايف مباشرة
const config = await drive.getJson('/Config/settings.json');
console.log(config);

// قراءة نص
const text = await drive.getText('/Notes/todo.txt');
```

### 5. مشاركة الملف والحصول على الروابط
```typescript
// جعل الملف متاحاً لأي شخص لديه الرابط والحصول على رابط مباشر
const links = await drive.sharePublic('FILE_ID_OR_PATH');
console.log('رابط المعاينة:', links.previewLink);
console.log('رابط التحميل المباشر:', links.directDownloadLink);

// أو مشاركته مع بريد محدد
await drive.share('FILE_ID', {
  role: 'writer',
  emailAddress: 'colleague@example.com',
  sendNotificationEmail: true,
});
```

### 6. مزامنة مجلد كامل بالتوازي (Folder Sync)
```typescript
const result = await drive.syncFolder('./my-project-build', '/Builds/Release-v1', {
  concurrency: 5, // رفع 5 ملفات بالتوازي
  overwrite: true,
  onFileComplete: (path, id) => {
    console.log(`تم رفع: ${path}`);
  }
});

console.log(`تمت مزامنة ${result.uploaded.length} ملف بنجاح في ${result.durationMs / 1000} ثانية!`);
```

---

## 💻 استخدام أداة سطر الأوامر (CLI)

يمكنك استخدام الأداة مباشرة من الطرفية:

```bash
# عرض المساحة التخزينية والكوتا
npx drivekit quota -k ./service-account.json

# استعراض المجلدات
npx drivekit ls /Backups -k ./service-account.json

# رفع ملف مع شريط تقدم حي وحساب السرعة
npx drivekit upload ./video.mp4 /Videos -k ./service-account.json

# تنزيل ملف
npx drivekit download FILE_ID ./destination -k ./service-account.json

# مشاركة ملف وجعله عاماً
npx drivekit share FILE_ID -k ./service-account.json

# مزامنة مجلد كامل تفرعياً
npx drivekit sync ./dist /Websites/Production -c 6 -k ./service-account.json
```

> **ملاحظة**: إذا قمت بضبط متغير البيئة `export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"`، فلن تحتاج لتمرير خيار `-k` في كل مرة!

---

## 📚 موقع التوثيق الرسمي (VitePress)

تم بناء موقع توثيق تفاعلي كامل ومزدوج اللغة (عربي / إنجليزي) عبر **VitePress**:

```bash
# تشغيل موقع التوثيق محلياً (وضع التطوير)
npm run docs:dev

# بناء نسخة الإنتاج لموقع التوثيق
npm run docs:build

# معاينة النسخة المبنية
npm run docs:preview
```

---

## 🧪 الاختبارات والبناء

```bash
# تشغيل جميع الاختبارات
npm test

# فحص الأنواع وبناء الحزمة
npm run build
```

---

## 📄 الترخيص
MIT License - متاح للاستخدام التجاري والشخصي بحرية تامة.

