# 🖥️ خادم WebDAV وربط Drive كنظام ملفات محلي (WebDAV Server)

توفر **DriveKit** خادماً مدمجاً وخفيفاً بدون أي مكتبات خارجية متوافقاً مع معيار **WebDAV (RFC 4918)**. يتيح لك هذا الخادم ربط Google Drive كمحرك أقراص محلي (Network Drive) مباشرة في **Finder** على macOS أو **Windows File Explorer** أو Linux دون الحاجة لتثبيت برنامج Google Drive Desktop الرسمي!

---

## 🚀 تشغيل الخادم عبر الطرفية (CLI)

أبسط طريقة لتشغيل الخادم هي عبر أمر `drivekit serve`:

```bash
npx drivekit serve --port 8080
```

ستظهر لك رسالة تفيد بتشغيل الخادم على الرابط: `http://127.0.0.1:8080`.

---

## 🍏 طريقة التوصيل في macOS Finder

1. افتح تطبيق **Finder**.
2. من القائمة العلوية اضغط على **Go -> Connect to Server** (أو اضغط اختصار <kbd>Cmd</kbd> + <kbd>K</kbd>).
3. في خانة Server Address أدخل:
   ```text
   http://127.0.0.1:8080
   ```
4. اضغط **Connect** واختر الاتصال كضيف (**Connect as Guest**).
5. سيفتح لك مجلد كامل يحتوي على ملفات Google Drive، يمكنك نسخ الملفات إليه، تعديلها، وإنشاء المجلدات كأنها فلاش ميموري موصولة بجهازك!

---

## 🪟 طريقة التوصيل في Windows Explorer

1. افتح **This PC** (هذا الكمبيوتر الشخصي).
2. من الشريط العلوي اختر **Map network drive** (تعيين محرك أقراص شبكة).
3. أدخل الرابط:
   ```text
   http://127.0.0.1:8080
   ```
4. اضغط **Finish**. سيعمل Google Drive كقرص تخزين إضافي (مثلاً `Z:`).

---

## 💻 الاستخدام البرمجي في الكود

يمكنك تشغيل الخادم برمجياً من خلال كود Node.js:

```typescript
import { createDrive } from 'drivekit';

const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' }
});

const serverInstance = await drive.serveWebDAV({
  port: 8080,
  host: '127.0.0.1'
});

console.log(`WebDAV active at: ${serverInstance.url}`);

// لإيقاف الخادم عند الحاجة:
// await serverInstance.close();
```

