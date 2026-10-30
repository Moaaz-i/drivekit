# 🧹 إدارة المساحة واكتشاف التكرارات (Storage Cleaner)

مع مرور الوقت، تمتلئ مساحة Google Drive بملفات ضخمة منسية أو نسخ مكررة لنفس الملفات. توفر **DriveKit** أدوات ذكية لتنظيف الحساب وتحرير المساحة التخزينية.

---

## 🔍 كشف أكبر الملفات استهلاكاً للمساحة (`drive.findLargestFiles`)

تسترجع قائمة مرتبة تنازلياً بأثقل الملفات في الحساب:

```typescript
// جلب أكبر 10 ملفات
const largestFiles = await drive.findLargestFiles(10);

for (const file of largestFiles) {
  console.log(`- ${file.name.padEnd(30)} ${file.formattedSize} (ID: ${file.id})`);
}
```

---

## 👥 اكتشاف الملفات المكررة (`drive.findDuplicates`)

تبحث DriveKit في الحساب وتجمع الملفات المكررة سواء عبر **تطابق الاسم** أو عبر **تطابق بصمة الهاش الرقمية MD5 Checksum**:

```typescript
// فحص التكرارات عبر تطابق البصمة الرقمية الدقيقة (MD5)
const duplicates = await drive.findDuplicates({ by: 'md5' });

for (const group of duplicates) {
  console.log(`الملف: "${group.name}" مكرر ${group.count} مرات بإجمالي حجم: ${group.formattedTotalSize}`);
  for (const copy of group.files) {
    console.log(`  - معرّف: ${copy.id} [تاريخ: ${copy.modifiedTime}]`);
  }
}
```

---

## 🗑️ إفراغ سلة المهملات بلمسة واحدة (`drive.emptyTrash`)

في Google Drive، تظل الملفات المحذوفة تستهلك المساحة حتى يتم تفريغ السلة:

```typescript
await drive.emptyTrash();
console.log('تم تفريغ سلة المهملات بالكامل وتحرير المساحة!');
```

---

## 💻 استخدام منظف المساحة من الـ CLI

```bash
# عرض أكبر 15 ملفاً في الحساب
npx drivekit clean -l 15

# البحث عن الملفات المكررة
npx drivekit clean --duplicates

# تفريغ سلة المهملات فوراً
npx drivekit clean --empty-trash
```

