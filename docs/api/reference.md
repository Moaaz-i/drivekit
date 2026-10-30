# 📚 مرجع الدوال والكلاسات (API Reference)

توثيق شامل لكافة الكلاسات والدوال المصدّرة من حزمة `drivekit`.

---

## ⚡ دالة المصنع (createDrive)

```typescript
function createDrive(options?: DriveKitOptions): Promise<DriveKit>
```
تنشئ كائن `DriveKit` وتقوم بتسجيل الاتصال والتحقق من التوثيق تلقائياً في خطوة واحدة.

---

## 🏛️ كلاس `DriveKit`

الكلاس الرئيسي الذي يحتوي على كافة العمليات:

### المسارات والمجلدات
- `mkdirp(virtualPath: string): Promise<string>`: إنشاء مجلدات متسلسلة وإرجاع معرف المجلد النهائي.
- `resolvePath(virtualPath: string): Promise<{ id: string, name: string, isFolder: boolean, mimeType: string }>`: استخراج بيانات المسار.
- `exists(idOrPath: string): Promise<boolean>`: التحقق من وجود الملف أو المجلد.
- `ls(folderIdOrPath?: string): Promise<DriveApiFile[]>`: استعراض محتويات المجلد.

### الملفات
- `upload(options: UploadOptions): Promise<DriveApiFile>`: رفع ملف مع تتبع السرعة ونسبة الإنجاز.
- `download(fileIdOrPath: string, options?: DownloadOptions)`: تنزيل ملف أو تصدير مستند Google.
- `getFile(fileIdOrPath: string): Promise<DriveApiFile>`: جلب البيانات الوصفية للملف.
- `getText(fileIdOrPath: string): Promise<string>`: قراءة المحتوى كنص UTF-8.
- `getJson<T>(fileIdOrPath: string): Promise<T>`: قراءة محتوى JSON.
- `delete(fileIdOrPath: string, permanent?: boolean): Promise<void>`: حذف الملف أو نقله للسلة.
- `move(fileIdOrPath: string, newParentIdOrPath: string): Promise<DriveApiFile>`: نقل الملف إلى مجلد آخر.
- `rename(fileIdOrPath: string, newName: string): Promise<DriveApiFile>`: إعادة تسمية الملف.
- `copy(fileIdOrPath: string, options?: { name?: string, parent?: string }): Promise<DriveApiFile>`: نسخ الملف.

### المشاركة
- `share(fileIdOrPath: string, options: ShareOptions): Promise<DriveApiPermission>`: إضافة صلاحية.
- `sharePublic(fileIdOrPath: string, role?: 'reader' | 'commenter' | 'writer')`: إتاحة الملف للعامة والحصول على روابط مباشرة.
- `getShareableLink(fileIdOrPath: string)`: روابط المعاينة والتحميل.

### الاستعلامات والبحث
- `query(): DriveQueryBuilder`: إنشاء باني استعلامات جديد.

### المزامنة والمساحة
- `syncFolder(localDir: string, remotePathOrId: string, options?: SyncOptions): Promise<SyncResult>`: مزامنة تفرعية.
- `getStorageQuota()`: فحص استهلاك المساحة والحدود.

---

## 🔍 كلاس `DriveQueryBuilder`

- `.nameEquals(string)`
- `.nameContains(string)`
- `.mimeType(string)`
- `.isFolder()`
- `.isFile()`
- `.inFolder(folderId)`
- `.notTrashed()`
- `.onlyTrashed()`
- `.starred(boolean)`
- `.sharedWithMe()`
- `.modifiedAfter(Date | string)`
- `.modifiedBefore(Date | string)`
- `.fullText(string)`
- `.orderBy(string)`
- `.pageSize(number)`
- `.list(): Promise<DriveApiFile[]>`
- `.first(): Promise<DriveApiFile | null>`
- `.count(): Promise<number>`

---

## 🛠️ دوال التنسيق المساعدة

- `formatBytes(bytes: number, decimals?: number): string`: تحويل البايتات إلى KB، MB، GB.
- `formatSpeed(bytesPerSecond: number): string`: تنسيق سرعة النقل (مثال: `4.5 MB/s`).
- `formatDuration(seconds: number): string`: تنسيق الوقت المتبقي (مثال: `2m 15s`).
- `lookupMimeType(filePath: string): string`: الكشف التلقائي عن نوع الملف (MIME type).

