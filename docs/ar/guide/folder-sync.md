# 🔄 مزامنة المجلدات بالتوازي (Folder Sync)

تتيح لك دالة `drive.syncFolder` رفع ومزامنة مجلد محلي كامل بجميع تفرعاته ومجلداته الفرعية إلى Google Drive بأقصى سرعة واستغلال لخط الاتصال عبر طابور المهام المتوازية (`ConcurrencyPool`).

---

## ⚡ الاستخدام الأساسي

```typescript
const result = await drive.syncFolder('./my-build-dist', '/Websites/Production', {
  concurrency: 5,   // رفع 5 ملفات بالتوازي في نفس اللحظة
  overwrite: true,  // استبدال الملفات المكررة
  onFileStart: (fullPath, relPath) => {
    console.log(`بدء رفع: ${relPath}`);
  },
  onFileComplete: (fullPath, fileId) => {
    console.log(`اكتمل: ${fullPath} [معرف: ${fileId}]`);
  },
});

console.log(`✅ تم رفع ${result.uploaded.length} ملف بنجاح!`);
console.log(`📦 إجمالي الحجم: ${result.totalBytes} بايت`);
console.log(`⏱️  الوقت المستغرق: ${(result.durationMs / 1000).toFixed(1)} ثانية`);
```

---

## 📊 كائن نتيجة المزامنة (`SyncResult`)

```typescript
interface SyncResult {
  /** قائمة الملفات التي تم رفعها بنجاح مع معرّفاتها */
  uploaded: { localPath: string; fileId: string; name: string }[];
  
  /** الملفات التي تم تخطيها */
  skipped: { localPath: string; name: string; reason: string }[];
  
  /** الملفات التي فشل رفعها مع تفاصيل الخطأ */
  failed: { localPath: string; error: Error }[];
  
  /** إجمالي حجم الملفات المرفوعة بالبايت */
  totalBytes: number;
  
  /** المدة الزمنية الكلية بالمللي ثانية */
  durationMs: number;
}
```

---

## 🛡️ منع تجاوز قيود الكوتا (Rate Limits)

تم تزويد محرك المزامنة بطبقة حماية تمنع تعطل العملية إذا واجهت حدود Google Drive API (429 Too Many Requests)، حيث تعيد المحاولة تلقائياً مع تأخير زمني ديناميكي (Exponential Backoff with Full Jitter).

