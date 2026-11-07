# 🚀 الرفع المتقطع والتنزيل (Upload & Download)

يقدم محرك الرفع والتنزيل في **DriveKit** أداءً استثنائياً مصمماً لتحمل انقطاعات الشبكة والملفات الضخمة وتتبع السرعة بدقة متناهية.

---

## ⚡ الرفع فائق السرعة (drive.upload)

تدعم دالة `drive.upload` رفع الملفات من:
1. **مسار ملف محلي** (`filePath: string`)
2. **ذاكرة بايتية** (`Buffer`)
3. **تدفق قراءة** (`NodeJS.ReadableStream`)

```typescript
const file = await drive.upload({
  source: './4k-video-render.mp4',
  name: 'final-cut.mp4',
  parent: '/Media/Videos/2026', // مسار افتراضي أو Folder ID
  overwrite: true,              // استبدال الملف إن كان موجوداً
  chunkSize: 8 * 1024 * 1024,   // قطع بحجم 8MB لأقصى إنتاجية
  onProgress: (p) => {
    console.log(`نسبة الإنجاز: ${p.percentage}%`);
    console.log(`السرعة الحالية: ${p.speedFormatted}`);
    console.log(`الوقت المتبقي: ${p.estimatedTimeRemainingSeconds} ثانية`);
    console.log(`القطعة: ${p.chunkIndex} من ${p.totalChunks}`);
  },
});
```

### 🏎️ مسار الرفع المباشر الفوري (للملفات ≤ 5MB)
للملفات أو الذاكرة المؤقتة (Buffers) التي يقل حجمها عن أو يساوي **5 MiB**، تقوم DriveKit تلقائياً بتفعيل مسار **Direct Multipart Upload**. يقلل هذا المسار زمن الاستجابة إلى النصف بتجاوز طلب إنشاء جلسة الرفع، ويتم رفع الملف في طلب HTTP واحد مباشر مع استمرار تقديم تنبيهات التقدم اللحظية بدقة.

### 📐 التكيف التلقائي لحجم القطع (Adaptive Chunk Sizing)
للملفات التي تتجاوز 5MB، تضبط DriveKit حجم القطع تلقائياً بناءً على حجم الملف لتحقيق أقصى استغلال لسرعة الشبكة:
- **الافتراضي**: قطع بحجم **8 MiB**.
- **الملفات الكبيرة (> 32 MiB)**: الترقية التلقائية إلى **16 MiB**.
- **الملفات الضخمة (> 128 MiB)**: الترقية التلقائية إلى **32 MiB**، مما يقلل عدد طلبات الشبكة بنسبة تصل إلى 75%.
- **الحجم المخصص**: يتم دائماً احترام خيار `chunkSize` المخصص عند تمريره (بمضاعفات 256 KiB).

### كائن تقدم الرفع (`UploadProgress`)

| الحقل | النوع | الوصف |
|---|---|---|
| `bytesSent` | `number` | عدد البايتات المرسلة حتى اللحظة |
| `totalBytes` | `number` | الحجم الإجمالي للملف بالبايت |
| `percentage` | `number` | نسبة الإنجاز المئوية (0 - 100) |
| `bytesPerSecond` | `number` | سرعة النقل الحالية بالبايت/ثانية |
| `speedFormatted` | `string` | السرعة بصيغة مقروءة (مثال: `5.4 MB/s`) |
| `estimatedTimeRemainingSeconds` | `number` | الوقت المتبقي المقدر للانتهاء بالثواني |
| `chunkIndex` | `number` | رقم القطعة الحالية التي يتم إرسالها |
| `totalChunks` | `number` | إجمالي عدد القطع |

---

## 📥 التنزيل والتصدير التلقائي (drive.download)

تتيح دالة `drive.download` تنزيل الملفات الثنائية العادية، بالإضافة إلى **التحويل والتصدير التلقائي لمستندات Google Workspace**:

```typescript
// تنزيل ملف ثنائي أو مستند وحفظه محلياً
const res = await drive.download('/Documents/Report.docx', {
  destination: './downloads',
  onProgress: (p) => {
    console.log(`تم تنزيل ${p.bytesRead} بايت بسرعة ${p.speedFormatted}`);
  },
});

console.log('تم الحفظ في:', res.filePath);
```

### التصدير التلقائي لمستندات Google:
- **Google Docs**: يتم تصديره تلقائياً كـ **PDF** (أو Word عبر خيار `exportMimeType`).
- **Google Sheets**: يتم تصديره تلقائياً كـ **Excel (.xlsx)** أو CSV.
- **Google Slides**: يتم تصديره تلقائياً كـ **PDF**.

---

## ⚡ الرفع الفوري عبر تفادي التكرار السحابي (Instant Cloud Deduplication)

عند تفعيل خيار `deduplicate: true`، تقوم DriveKit بحساب بصمة الـ MD5 للملف المحلي والتحقق فورياً في قاعدة بيانات الكاش وسحابة Google Drive:

- إذا كان الملف موجوداً بالفعل في حسابك، يتم عمل **استنساخ سحابي فوري (Cloud Clone)** خلال **~200ms** دون إرسال بايت واحد عبر شبكة الإنترنت!
- هذا يوفر استهلاك الإنترنت والوقت بشكل مذهل عند تكرار رفع ملفات الأرشيف والوسائط الضخمة.

```typescript
const file = await drive.upload({
  source: './50GB-backup.iso',
  parent: '/Backups/Archive',
  deduplicate: true, // تفعيل الرفع اللحظي السحابي
});
```

---

## 📄 قراءة النصوص والـ JSON مباشرة

```typescript
// قراءة ملف JSON مباشرة دون حفظه على القرص
const settings = await drive.getJson('/Config/appsettings.json');
console.log(settings.database.host);

// قراءة ملف نصي أو Google Doc كنص نقي
const notes = await drive.getText('/Notes/meeting.txt');
console.log(notes);
```

