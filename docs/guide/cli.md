# 💻 أداة سطر الأوامر (DriveKit CLI)

تتضمن **DriveKit** أداة طرفية مدمجة وقوية تتيح لك إدارة ملفاتك ورفعها وتنزيلها مباشرة من التيرمينال دون كتابة كود!

---

## 🚀 التشغيل المباشر

```bash
# ضبط مسار ملف المصادقة
export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"

# أو تمريره مباشرة عبر علم -k
npx drivekit ls / -k ./service-account.json
```

---

## 🛠️ قائمة الأوامر المتاحة

### 1. استعراض المساحة والكوتا التخزينية (`quota`)
```bash
npx drivekit quota
```
يعرض بيانات الحساب، والمساحة المستهلكة، والمساحة الموجودة في السلة بنظام ملون.

---

### 2. استعراض الملفات والمجلدات (`ls`)
```bash
# استعراض المجلد الجذري والمشترك
npx drivekit ls /

# استعراض مجلد محدد
npx drivekit ls /Backups/2026
```

---

### 3. رفع ملف مع شريط تقدم وحساب السرعة (`upload`)
```bash
npx drivekit upload ./database-dump.sql /Backups -o -d
```
- خيار `-o` أو `--overwrite`: استبدال الملف إن كان موجوداً مسبقاً.
- خيار `-d` أو `--dedup`: تفعيل التكرار الفوري السحابي (Instant Cloud Upload) عبر الـ MD5 Checksum.
- يعرض شريط تقدم حي: النسبة المئوية %، السرعة الحالية (MB/s)، والوقت المتبقي (ETA).

---

### 4. المتصفح التفاعلي في التيرمينال (`explore`)
```bash
npx drivekit explore /
```
يتيح لك تصفح المجلدات بأسهم لوحة المفاتيح والضغط على Enter للدخول في المجلدات والعودة بـ Backspace مع روابط تشعبية قابلة للنقر (OSC-8 Hyperlinks).

---

### 5. إدارة الكاش المحلي فائق السرعة (`cache`)
```bash
# عرض إحصائيات الكاش ومسار قاعدة بيانات SQLite
npx drivekit cache status

# مسح وفهرسة كافة محتويات Drive في الكاش المحلي
npx drivekit cache sync

# تفريغ الكاش المحلي
npx drivekit cache clear
```

---

### 6. تشغيل خادم WebDAV لربط Drive محلياً (`serve`)
```bash
npx drivekit serve --port 8080
```
يتيح ربط حساب Google Drive كمحرك أقراص محلي في Finder على macOS أو File Explorer في Windows.

---

### 7. استعراض الأقراص المشتركة للمؤسسات (`shared-drives`)
```bash
npx drivekit shared-drives
```
استعراض كافة Google Workspace Shared Drives المتاحة ومعرفاتها.

---

### 8. تنزيل ملف (`download`)
```bash
npx drivekit download FILE_ID_OR_PATH ./destination-folder
```

---

### 9. مشاركة ملف والحصول على الروابط (`share`)
```bash
# جعله عاماً للجميع مع استخراج الرابط المباشر
npx drivekit share FILE_ID

# مشاركته مع بريد محدد
npx drivekit share FILE_ID user@example.com
```

---

### 10. مزامنة مجلد محلي بالكامل بالتوازي (`sync`)
```bash
npx drivekit sync ./dist /Websites/Production -c 5 -o
```
- `-c 5`: رفع 5 ملفات بالتوازي.
- `-o`: استبدال الملفات المكررة.

---

### 11. تنزيل مجلد كامل من السحابة (`pull`)
```bash
npx drivekit pull /Backups/2026 ./local-backups
```

---

### 12. تنظيف المساحة والملفات الكبيرة (`clean`)
```bash
# استعراض أكبر الملفات المستهلكة للمساحة
npx drivekit clean --largest 10

# العثور على الملفات المكررة بالـ MD5
npx drivekit clean --duplicates

# تفريغ سلة المهملات
npx drivekit clean --empty-trash
```

---

### 13. حذف ملف أو نقله للسلة (`delete`)
```bash
# نقله للسلة
npx drivekit delete FILE_ID_OR_PATH

# حذفه نهائياً
npx drivekit delete FILE_ID_OR_PATH --permanent
```

