# 📂 نظام المسارات الافتراضي (Virtual Paths)

في Google Drive، لا يوجد مفهوم المسارات الشجري الحقيقي (`/Folder/SubFolder/file.txt`). الملفات عبارة عن كائنات تمتلك معرّف عشوائي (`fileId`) وقائمة بالمعرّفات الأبوية (`parents`).

**DriveKit تمنحك تجربة نظام ملفات حقيقي متكامل!**

---

## 🌟 إنشاء المجلدات المتسلسلة (drive.mkdirp)

تمكّنك دالة `drive.mkdirp` من إنشاء مسار متسلسل كامل بلمسة واحدة، شبيهة بأمر الطرفية `mkdir -p`:

```typescript
// سينشئ المجلدات /Backups ثم /2026 ثم /October إن لم تكن موجودة
const folderId = await drive.mkdirp('/Backups/2026/October');
console.log('معرّف المجلد الأخير:', folderId);
```

---

## 🔍 حل المسارات الافتراضية (drive.resolvePath)

يمكنك استخراج معرّف أي مجلد أو ملف عبر مساره المباشر:

```typescript
const info = await drive.resolvePath('/Documents/Projects/AppConfig.json');

console.log(info.id);       // '1a2b3c4d...'
console.log(info.name);     // 'AppConfig.json'
console.log(info.isFolder); // false
console.log(info.mimeType); // 'application/json'
```

---

## 📁 استعراض الملفات (drive.ls)

تعرض دالة `drive.ls()` محتويات المجلد سواء عبر تمرير مساره أو معرّفه:

```typescript
// استعراض محتويات المجلد الجذري والمجلدات المشتركة
const rootItems = await drive.ls('/');

// استعراض مجلد فرعي
const projectFiles = await drive.ls('/Projects/2026');

for (const item of projectFiles) {
  console.log(`- ${item.name} (${item.mimeType}) [${item.id}]`);
}
```

---

## ⚡ التخزين المؤقت الذكي (Path Cache)

لكي لا تستهلك كوتا الاستعلامات في كل مرة ترفع فيها ملفاً لنفس المجلد، تحتفظ DriveKit بكاش داخلي للمسارات التي تم حلها:
- يتم تفعيله تلقائياً (`enablePathCache: true`).
- مدة الصلاحية الافتراضية: **5 دقائق** (`pathCacheTTL: 300000`).
- يتم تحديثه وتفريغه تلقائياً عند النقل (`move`) أو الحذف (`delete`).

