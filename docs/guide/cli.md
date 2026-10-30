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
npx drivekit upload ./database-dump.sql /Backups -o
```
- خيار `-o` أو `--overwrite`: استبدال الملف إن كان موجوداً مسبقاً.
- يعرض شريط تقدم حي: النسبة المئوية %، السرعة الحالية (MB/s)، والوقت المتبقي (ETA).

---

### 4. تنزيل ملف (`download`)
```bash
npx drivekit download FILE_ID_OR_PATH ./destination-folder
```

---

### 5. مشاركة ملف والحصول على الروابط (`share`)
```bash
# جعله عاماً للجميع مع استخراج الرابط المباشر
npx drivekit share FILE_ID

# مشاركته مع بريد محدد
npx drivekit share FILE_ID user@example.com
```

---

### 6. مزامنة مجلد محلي بالكامل بالتوازي (`sync`)
```bash
npx drivekit sync ./dist /Websites/Production -c 5 -o
```
- `-c 5`: رفع 5 ملفات بالتوازي.
- `-o`: استبدال الملفات المكررة.

---

### 7. حذف ملف أو نقله للسلة (`delete`)
```bash
# نقله للسلة
npx drivekit delete FILE_ID_OR_PATH

# حذفه نهائياً
npx drivekit delete FILE_ID_OR_PATH --permanent
```

