# 🧩 نظام الإضافات (Plugins Architecture)

تعتمد **DriveKit** على بنية إضافات مرنة ومفتوحة (Extensible Architecture) تتيح للمطورين التدخل في دورة حياة العمليات (`beforeUpload`، `afterUpload`، `beforeDownload`، `afterDownload`) لتعديل البيانات أو إرسال الإشعارات.

---

## 🛠️ الإضافات الرسمية المدمجة

### 1. إضافة خطافات الويب (`createWebhookPlugin`)
تقوم هذه الإضافة بإرسال إشعار لحظي عبر HTTP POST إلى خدمات مثل Discord أو Slack أو Telegram أو Zapier بمجرد اكتمال رفع أو تنزيل ملف:

```typescript
import { createDrive, createWebhookPlugin } from 'drivekit';

const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' }
});

// تفعيل الإضافة
drive.use(
  createWebhookPlugin({
    url: 'https://discord.com/api/webhooks/xxxx/yyyy',
    events: ['upload', 'download'], // الأحداث المطلوبة
    headers: { 'X-Custom-Auth': 'secret-token' }
  })
);

// عند رفع أي ملف سيتم إرسال إشعار لحظي
await drive.upload({ source: './report.pdf', parent: '/Reports' });
```

---

### 2. إضافة التسمية التلقائية والتأريخ (`createAutoNamePlugin`)
تقوم بتعديل اسم الملفات المرفوعة تلقائياً بإضافة بادئة أو لاحقة أو طابع زمني لحظي:

```typescript
import { createDrive, createAutoNamePlugin } from 'drivekit';

const drive = await createDrive();

drive.use(
  createAutoNamePlugin({
    prefix: 'prod_',
    appendTimestamp: true,
    suffix: '_v1'
  })
);

// سيرفع الملف باسم: prod_database_1740000000_v1.sql
await drive.upload({ source: './database.sql' });
```

---

## 🏗️ بناء إضافة مخصصة (Custom Plugin)

يمكنك كتابة إضافة مخصصة بسهولة تامة عبر واجهة `DriveKitPlugin`:

```typescript
import type { DriveKitPlugin } from 'drivekit';

const myCustomLoggerPlugin: DriveKitPlugin = {
  name: 'my-logger',
  beforeUpload(options) {
    console.log(`[Before Upload] Preparing to upload: ${options.filename || 'unknown'}`);
    return options;
  },
  afterUpload(file) {
    console.log(`[After Upload] File successfully uploaded with ID: ${file.id}`);
  }
};

drive.use(myCustomLoggerPlugin);
```

