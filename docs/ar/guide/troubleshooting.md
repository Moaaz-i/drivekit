# 🛠️ استكشاف الأخطاء وحلها (Troubleshooting & Errors)

يوثق هذا الدليل كافة أصناف الأخطاء (Error Classes) التي تطلقها **DriveKit** وكيفية تشخيص وحل المشاكل الشائعة التي تواجه المطورين مع Google Drive API.

---

## 🛑 أصناف الأخطاء المخصصة (Error Classes)

ترث كافة أخطاء المكتبة من الكلاس الأساسي `DriveKitError`، مما يتيح لك صيدها والتعامل معها بدقة واحترافية:

```typescript
import {
  DriveKitError,
  DriveAuthError,
  DriveNotFoundError,
  DriveRateLimitError,
  DriveUploadError,
} from 'drivekit';

try {
  await drive.upload({ source: './file.pdf', parent: '/UnknownPath' });
} catch (error) {
  if (error instanceof DriveNotFoundError) {
    console.error(`المسار أو المعرف غير موجود: ${error.resourceIdOrPath}`);
  } else if (error instanceof DriveRateLimitError) {
    console.error(`تم تجاوز كوتا الاستعلامات، يُرجى الانتظار: ${error.retryAfterSeconds}s`);
  } else if (error instanceof DriveUploadError) {
    console.error(`فشل الرفع بعد إرسال ${error.bytesUploaded} من أصل ${error.totalBytes} بايت`);
  } else if (error instanceof DriveAuthError) {
    console.error(`خطأ في بيانات التوثيق: ${error.message}`);
  } else {
    console.error(`خطأ غير متوقع:`, error);
  }
}
```

| كلاس الخطأ | الكود (`code`) | سبب الحدوث |
|---|---|---|
| `DriveAuthError` | `AUTH_ERROR` | فشل التوثيق، مفتاح غير صالح، ملف المفتاح غير موجود، أو توكن منتهي. |
| `DriveNotFoundError` | `NOT_FOUND` | المسار الافتراضي غير موجود أو معرف الملف غير موجود في الحساب. |
| `DriveRateLimitError` | `RATE_LIMIT_EXCEEDED` | تجاوز حدود الاستعلامات القصوى المسموحة من Google (429). |
| `DriveUploadError` | `UPLOAD_ERROR` | فشل إنشاء جلسة الرفع أو انقطاع غير قابل للاسترداد أثناء إرسال القطع. |
| `DriveKitError` | `DRIVEKIT_ERROR` | الكلاس الأب لكافة أخطاء الحزمة. |

---

## ❓ المشاكل الشائعة وحلولها

### 1. خطأ كوتا حساب الخدمة: `Service Accounts do not have storage quota`
- **السبب:**  
  في سياسة Google Drive الحالية، حسابات الخدمة (`@...iam.gserviceaccount.com`) تملك **0 بايت** من المساحة التخزينية الخاصة في حسابات Gmail العادية المجانية.
  لذلك يسمح Google لحساب الخدمة بـ:
  - استعراض وتنزيل الملفات (`ls` و `download`).
  - إنشاء مجلدات (`mkdirp` - لأن المجلدات حجمها 0 بايت).
  - البحث والاستعلام (`query`).
  - ولكن عند محاولة **رفع ملف جديد بحجم أكبر من 0 بايت**، ترفض Google العملية لأن حساب الخدمة هو مالك الملف ولا يملك رصيد تخزين.
- **الحل:**
  1. **الحل الأمثل للحسابات الشخصية:** استخدام **OAuth2 Token** (عبر إدخال `accessToken` في خيارات التهيئة أو تسجيل الدخول بالمستخدم). حيث يستخدم التوكن مساحة الـ 15GB المجانية الخاصة بالمستخدم مباشرة.
  2. **الحل لشركات Google Workspace:** استخدام مجلدات **Shared Drives** وإضافة حساب الخدمة كعضو فيها.

---

### 2. خطأ 401: `Login Required` أو `Unregistered callers`
- **السبب:** الترويسة `Authorization: Bearer` مفقودة أو أن التوكن غير صالح/منتهي الصلاحية.
- **الحل:**
  - تأكد من صحة مسار ملف `service-account.json`.
  - إذا كنت تستخدم `accessToken`، تأكد أنه لم تنتهِ صلاحيته (صلاحية الـ Access Token ساعة واحدة، وتتطلب تجديدها عبر الـ Refresh Token).

---

### 3. خطأ 404: `Resource not found`
- **السبب:** البحث عن مسار أو معرّف غير موجود أو غير مشارك مع الحساب.
- **الحل:**
  - إذا كنت تستخدم Service Account، تأكد أنك قمت بفتح المجلد في Google Drive والضغط على **Share** ومشاركته مع إيميل حساب الخدمة بصلاحية **Editor**.
  - في المسارات، يمكنك تمرير الخيار `createIfMissing: true` أو استخدام `drive.mkdirp()` لإنشاء المجلدات الناقصة تلقائياً.

---

### 4. خطأ 403: `Rate Limit Exceeded` أو `User Rate Limit Exceeded`
- **السبب:** إرسال عدد كبير جداً من الاستعلامات في الثانية الواحدة.
- **الحل:**
  - تدير DriveKit هذا الخطأ تلقائياً عبر آلية Exponential Backoff.
  - إذا كنت تقوم بمزامنة آلاف الملفات، قلل معامل التوازي: `drive.syncFolder(dir, path, { concurrency: 2 })`.

