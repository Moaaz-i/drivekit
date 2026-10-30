# 🔑 طرق المصادقة (Authentication)

تدعم **DriveKit** كافة استراتيجيات التوثيق الرسمية في Google Drive بمرونة مطلقة:

---

## 1. حساب الخدمة (Service Account)

الخيار الأكثر شيوعاً للبوتات والمخدمات (Backend Servers) وعمليات الأتمتة التي تعمل دون تدخل بشري:

```typescript
const drive = await createDrive({
  auth: {
    keyFilePath: './service-account.json', // أو عبر متغير البيئة GOOGLE_APPLICATION_CREDENTIALS
  },
});
```

أو بتمرير محتوى المفتاح مباشرة من كائن أو قاعدة بيانات:

```typescript
const drive = await createDrive({
  auth: {
    credentials: {
      client_email: 'service-account@project.iam.gserviceaccount.com',
      private_key: '-----BEGIN RSA PRIVATE KEY-----\n...',
      project_id: 'my-project-id',
    },
  },
});
```

> **تنبيه هام حول كوتا حسابات الخدمة:**  
> تمنح Google حسابات الخدمة مساحة تخزينية قدرها **0 بايت** في حسابات Gmail المجانية. لذلك يمكن لحساب الخدمة قراءة واستعراض الملفات، والبحث، وإنشاء المجلدات (`mkdirp`)، ولكن لرفع ملفات بايتية جديدة يُفضل استخدام **OAuth2** أو استخدام Google Workspace (Shared Drives).

---

## 2. رمز الوصول المباشر (OAuth2 Access Token)

إذا كان تطبيقك يحتوي على نظام تسجيل دخول بالمستخدم (Login with Google) وحصلت على Bearer Access Token من العميل:

```typescript
const drive = await createDrive({
  auth: {
    accessToken: 'ya29.a0AfH6SMD...', // يستخدم كوتا الـ 15GB المجانية الخاصة بالمستخدم
  },
});
```

---

## 3. المصادقة عبر OAuth2 Client و Refresh Token

لإبقاء الاتصال مستمراً مع تجديد الرمز تلقائياً في الخلفية:

```typescript
const drive = await createDrive({
  auth: {
    oauth: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
      redirectUri: 'http://localhost:3000/oauth2callback',
    },
  },
});
```

---

## 4. أدوات مساعدة لإنشاء رابط تسجيل الدخول واستبدال الرمز

توفر **DriveKit** دوال مساعدة لإنشاء رابط موافقة المستخدم واستخراج التوكن:

```typescript
import { DriveAuthenticator } from 'drivekit';

// 1. توليد رابط موافقة Google
const url = DriveAuthenticator.generateAuthUrl({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'http://localhost:3000/oauth2callback',
});

// 2. استبدال كود الموافقة برموز التوكن
const tokens = await DriveAuthenticator.exchangeCodeForTokens({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  code: 'AUTH_CODE_FROM_URL',
});

console.log('Refresh Token:', tokens.refresh_token);
```

