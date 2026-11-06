# 🚀 دليل البدء السريع (Getting Started)

تم تصميم **DriveKit** لتمنح مطوري JavaScript و TypeScript تجربة برمجة استثنائية (Developer Experience) عند التعامل مع Google Drive، متجاوزة قيود وتعقيدات المكتبات الرسمية.

---

## 📦 التثبيت

يمكنك تثبيت الحزمة عبر مدير الحزم المفضل لديك:

::: code-group
```bash [npm]
npm install drivekit
```

```bash [pnpm]
pnpm add drivekit
```

```bash [yarn]
yarn add drivekit
```

```bash [bun]
bun add drivekit
```
:::

---

## ⚡ الاستخدام الأساسي (في 3 أسطر)

```typescript
import { createDrive } from 'drivekit';

// 1. إنشاء والاتصال بحساب Google Drive
const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' },
});

// 2. رفع ملف إلى مسار افتراضي (يتم إنشاء المجلدات تلقائياً إن لم تكن موجودة)
const file = await drive.upload({
  source: './report.pdf',
  parent: '/Backups/2026',
  onProgress: (p) => console.log(`التقدم: ${p.percentage}% | السرعة: ${p.speedFormatted}`),
});

console.log('معرف الملف المرفوع:', file.id);
```

---

## 💡 كائن الإعدادات العامة (Options)

عند استدعاء `createDrive(options)` أو `new DriveKit(options)` يمكنك تمرير الخيارات التالية:

```typescript
interface DriveKitOptions {
  /** إعدادات التوثيق والمصادقة */
  auth?: DriveKitAuthConfig;
  
  /** معرّف المجلد الجذري (افتراضياً: 'root') */
  rootFolderId?: string;
  
  /** حجم القطعة الافتراضي للرفع المتقطع بالبايت (افتراضياً: 8MB) */
  uploadChunkSize?: number;
  
  /** الحد الأقصى للمهام المتوازية في عمليات المزامنة (افتراضياً: 4) */
  concurrency?: number;
  
  /** تفعيل التخزين المؤقت للمسارات (افتراضياً: true) */
  enablePathCache?: boolean;
  
  /** مدة بقاء الكاش بالمللي ثانية (افتراضياً: 5 دقائق) */
  pathCacheTTL?: number;
  
  /** عدد محاولات إعادة الطلب عند مواجهة 429 أو 5xx (افتراضياً: 5) */
  maxRetries?: number;
}
```

