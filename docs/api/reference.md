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

### التدفق والطلبات الجزئية (Streams)
- `createReadStream(pathOrId: string, options?: { start?: number, end?: number }): Promise<NodeJS.ReadableStream>`: تدفق قراءة مع دعم الـ Range Requests.
- `createWriteStream(remotePath: string, options?: UploadOptions): Promise<NodeJS.WritableStream>`: تدفق كتابة ورفع مباشر دون حفظ على القرص.

### الكاش المحلي الدائم (SQLite Cache)
- `getMetadataCache(): Promise<IMetadataCache | null>`: جلب محرك الكاش النشط.
- `getCacheStats(): Promise<CacheStats | null>`: إحصائيات قاعدة بيانات SQLite المحلية.
- `syncCache(options?: { onProgress?: (scanned: number) => void }): Promise<CacheStats>`: مسح وفهرسة محتويات الحساب كاملاً.
- `clearCache(): Promise<void>`: مسح الكاش المحلي.

### الأقراص المشتركة والأذونات المؤسسية
- `listSharedDrives(options?: { pageSize?: number }): Promise<{ id: string, name: string }[]>`: جلب الأقراص المشتركة (Shared Drives).
- `sharedDrive(driveId: string): DriveKit`: إنشاء عميل مخصص محصور في Shared Drive معين.
- `grantAccess(pathOrId: string, options: { email: string, role?: string, notify?: boolean, message?: string })`: منح صلاحية.
- `revokeAccess(pathOrId: string, permissionIdOrEmail: string): Promise<void>`: إلغاء صلاحية.
- `listPermissions(pathOrId: string): Promise<DriveApiPermission[]>`: استعراض صلاحيات الملف أو المجلد.

### خادم WebDAV المدمج
- `serveWebDAV(options?: { port?: number, host?: string })`: تشغيل خادم WebDAV لربط Drive كنظام ملفات محلي.

### المشاركة
- `share(fileIdOrPath: string, options: ShareOptions): Promise<DriveApiPermission>`: إضافة صلاحية.
- `sharePublic(fileIdOrPath: string, role?: 'reader' | 'commenter' | 'writer')`: إتاحة الملف للعامة والحصول على روابط مباشرة.
- `getShareableLink(fileIdOrPath: string)`: روابط المعاينة والتحميل.

### الاستعلامات والبحث
- `query(): DriveQueryBuilder`: إنشاء باني استعلامات جديد.

### المزامنة والمساحة
- `syncFolder(localDir: string, remotePathOrId: string, options?: SyncOptions): Promise<SyncResult>`: مزامنة تفرعية.
- `pull(remoteFolderIdOrPath: string, localDestinationDir: string, options?)`: تنزيل مجلد كامل من السحابة.
- `getStorageQuota()`: فحص استهلاك المساحة والحدود.
- `findLargestFiles(options?)`: كشف أكبر الملفات المستهلكة للمساحة.
- `findDuplicates(options?)`: كشف الملفات المكررة بالـ MD5.
- `emptyTrash()`: تفريغ سلة المهملات.

---

## 🧩 الإضافات المدمجة (Plugins)

- `createWebhookPlugin(options: { url: string, events?: ('upload' | 'download')[], headers?: Record<string, string> })`
- `createAutoNamePlugin(options: { prefix?: string, suffix?: string, appendTimestamp?: boolean })`

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

