# ⚙️ إعدادات متقدمة والتحكم بالأداء (Advanced Guide)

صُممت **DriveKit** لتكون قابلة للتخصيص الدقيق لتناسب التطبيقات الضخمة والشركات التي تتطلب أداءً فائقاً واستهلاكاً مدروساً لموارد السيرفر.

---

## ⚡ محرك السرعة القصوى (DriveKit Turbo Engine)

تتضمن DriveKit تحسينات معمارية متطورة لتقليل زمن الاستجابة إلى أدنى حد ممكن واستغلال كامل سرعة خطوط الإنترنت الفائقة:

### 1. تجميع قنوات الاتصال وإعادة استخدامها (HTTP Keep-Alive Connection Pooling)
يقوم الوضع الافتراضي في Node.js بإعادة إنشاء مصافحة أمان TLS 1.3 / TCP مع كل طلب HTTP، مما يضيف تأخيراً يصل إلى 150-300ms لكل استدعاء لـ Google Drive API. توفر DriveKit مجمع اتصالات ذكي:
- **ما يصل إلى 64 قناة اتصال متزامنة** (`maxSockets: 64`).
- **32 قناة اتصال جاهزة** ومفتوحة دائماً لإعادة الاستخدام الفوري (`keepAliveMsecs: 60000`).
- **إلغاء تأخير حزم TCP** (`noDelay: true`) للإرسال الفوري للبيانات دون انتظار.
- يطبق تلقائياً عبر جميع استدعاءات Google Drive API v3، وقطع الرفع المتقطع، وتجديد رموز OAuth.

```typescript
import { getOptimizedHttpsAgent } from 'drivekit';

// يمكنك تخصيص مجمع الاتصالات إن رغبت
const agent = getOptimizedHttpsAgent({
  maxSockets: 64,
  keepAlive: true,
});
```

### 2. دمج الطلبات المتزامنة (In-Flight Request Coalescing)
عندما تقوم عمليات متعددة ومتزامنة بطلب استعلام أو إنشاء نفس المجلد الظاهري (مثل 20 عملية رفع بالتوازي تستهدف `/Backups/2026`)، تقوم DriveKit بتوحيد هذه الطلبات المتزامنة في **طلب شبكي واحد فقط**. يبدأ الطلب الأول العملية، بينما تنتظر الطلبات الـ 19 الأخرى على نفس الـ Promise، مما يوفر 95% من حصة الـ API ويمنع حدوث Race Conditions وتكرار المجلدات.

### 3. توسيع الذاكرة الوسيطة للتدفقات (HighWaterMark Tuning)
تم ضبط عمليات التدفق (`createReadStream` و `createWriteStream` و `download`) بذاكرة وسيطة سعتها **1 MiB** (مقارنة بـ 16 KiB الافتراضية في Node.js)، مما يسمح باستغلال كامل سعة خطوط الجيجابت دون تقطيع أو توقف مؤقت أثناء النقل.

---

## ⚡ الوصول المباشر للعميل الرسمي (`drive.getRawClient`)

إذا كنت بحاجة إلى استدعاء واجهات Google Drive API v3 متخصصة وغير شائعة (مثل: إدارة الأجهزة، إعداد Webhooks للإشعارات اللحظية، أو المراجعات التحريرية Revisions)، يمكنك الوصول المباشر إلى كائن `@googleapis/drive` الموثّق مسبقاً:

```typescript
const drive = await createDrive({ auth: { keyFilePath: './service-account.json' } });

// جلب العميل الرسمي الخام
const raw = await drive.getRawClient();

// يمكنك استدعاء أي دالة في Google Drive API v3 مباشرة!
const revisions = await raw.revisions.list({
  fileId: 'FILE_ID',
});

console.log(revisions.data);
```

---

## 🚀 ضبط حجم القطع لرفع فائق السرعة (Chunk Tuning)

في الرفع المتقطع، تفرض Google أن يكون حجم القطعة من مضاعفات **256 KiB** (أي مضاعفات 262,144 بايت).
- **الافتراضي في DriveKit**: هو **8 MiB** (8,388,608 بايت) وهو الحجم المتوازن والمثالي لمعظم خطوط الإنترنت.
- **للملفات العملاقة وسيرفرات مراكز البيانات**: يُنصح برفع القطعة إلى **16 MiB** أو **32 MiB** لتقليل عدد طلبات HTTP وتحقيق سرعة قصوى:

```typescript
const drive = await createDrive({
  // تخصيص حجم القطعة على مستوى الأداة ككل
  uploadChunkSize: 16 * 1024 * 1024, // 16MB
});

// أو تخصيصه لملف محدد أثناء الرفع:
await drive.upload({
  source: './massive-database.sql.gz',
  parent: '/Backups',
  chunkSize: 32 * 1024 * 1024, // 32MB لهذا الملف
});
```

---

## 🛡️ تخصيص خوارزمية إعادة المحاولة (Exponential Backoff with Full Jitter)

عندما ترسل آلاف الطلبات في وقت قصير، قد تفرض Google حظراً مؤقتاً بالرمز `429 Too Many Requests`.
تقوم DriveKit تلقائياً بحساب التأخير الزمني التنازلي مع تشويش عشوائي كامل (Jitter) وفق المعادلة:
$$\text{delay} = \text{random}(0, \min(\text{maxDelay}, \text{baseDelay} \times 2^{\text{attempt}}))$$

يمكنك تخصيص معايير إعادة المحاولة عند التهيئة:

```typescript
const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' },
  maxRetries: 7,          // عدد محاولات الإعادة (افتراضياً 5)
  retryBaseDelayMs: 1500, // التأخير الأساسي الأولي بالمللي ثانية (افتراضياً 1000ms)
});
```

---

## 🧠 إدارة الذاكرة العشوائية (Low Memory Footprint)

عند رفع ملفات ضخمة (5GB أو 20GB):
- لا تقم أبداً بتحميل الملف بالكامل في الذاكرة عبر `fs.readFileSync`.
- مرر مسار الملف كـ `string` إلى `source` مباشرة:
  ```typescript
  await drive.upload({ source: '/data/huge_file.iso', ... });
  ```
  تستخدم DriveKit واجهة `FileHandle` منخفضة المستوى لقراءة القطعة المطلوبة فقط من القرص وحذفها فور إرسالها، مما يبقي استهلاك الذاكرة في تطبيقك **أقل من 30 ميجابايت** مهما كان حجم الملف المرفوع!

---

## 🔒 تخصيص الصلاحيات (Custom Scopes)

افتراضياً، تطلب DriveKit الصلاحية الكاملة `https://www.googleapis.com/auth/drive`.
إذا كنت تريد حصر الصلاحيات لأسباب أمنية (مثلاً للقراءة فقط أو للملفات المنشأة بواسطة التطبيق فقط):

```typescript
const drive = await createDrive({
  auth: {
    keyFilePath: './service-account.json',
    scopes: [
      'https://www.googleapis.com/auth/drive.file', // فقط الملفات التي أنشأها التطبيق
      // أو للقراءة فقط:
      // 'https://www.googleapis.com/auth/drive.readonly',
    ],
  },
});
```

