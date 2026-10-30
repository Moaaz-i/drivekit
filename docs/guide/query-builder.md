# 🔍 باني الاستعلامات السلس (Fluent Query Builder)

يحتوي Google Drive على محرك استعلامات قوي، ولكن كتابة استعلاماته كسلاسل نصية SQL يدوية أمر شاق وعرضة لأخطاء الهروب (escaping) وعلامات التنصيص.

توفر **DriveKit** باني استعلامات سلس ومتكامل (`DriveQueryBuilder`) يدعم التسلسل (Chaining):

---

## 💡 مثال شامل

```typescript
const files = await drive.query()
  .nameContains('invoice')
  .mimeType('application/pdf')
  .notTrashed()
  .modifiedAfter('2026-01-01')
  .starred(true)
  .orderBy('modifiedTime desc')
  .pageSize(25)
  .list();

console.log(`تم العثور على ${files.length} ملف`);
```

---

## 🛠️ الدوال المتاحة في باني الاستعلامات

### فلترة الأسماء والأنواع:
- `.nameEquals(name)`: مطابقة اسم الملف بدقة.
- `.nameContains(substring)`: الاسم يحتوي على الكلمة.
- `.mimeType(mime)`: نوع الملف (مثال: `'application/pdf'`).
- `.isFolder()`: المجلدات فقط.
- `.isFile()`: الملفات العادية فقط (باستثناء المجلدات).

### فلترة المجلدات والآباء:
- `.inFolder(folderId)`: الملفات الموجودة مباشرة داخل مجلد محدد.

### الحالة والعلامات:
- `.notTrashed()`: استبعاد الملفات المحذوفة في السلة (موصى به افتراضياً).
- `.onlyTrashed()`: الملفات الموجودة في السلة فقط.
- `.starred(bool)`: الملفات المميزة بنجمة.
- `.sharedWithMe()`: الملفات المشتركة مع الحساب.

### التواريخ:
- `.modifiedAfter(date)`: عُدلت بعد تاريخ محدد (`Date` أو نص ISO).
- `.modifiedBefore(date)`: عُدلت قبل تاريخ محدد.

### البحث في المحتوى:
- `.fullText(term)`: بحث شامل في اسم الملف ومحتواه الداخلي (Full-text Search).

### الترتيب والكمية:
- `.orderBy('modifiedTime desc')`: ترتيب النتائج حسب تاريخ التعديل أو الاسم.
- `.pageSize(number)`: عدد العناصر في الصفحة (1 إلى 1000).

---

## ⚡ التكرار التلقائي للصفحات (Async Iterator)

إذا كان لديك آلاف الملفات وتريد معالجتها واحداً تلو الآخر دون ملء ذاكرة الخادم (RAM):

```typescript
const query = drive.query()
  .inFolder(backupFolderId)
  .notTrashed();

// استهلاك الصفحات تلقائياً بتدفق سلس (Stream)
for await (const file of query) {
  console.log(`معالجة: ${file.name} (${file.id})`);
}
```

