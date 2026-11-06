---
layout: home

hero:
  name: DriveKit
  text: أداة Google Drive فائقة السرعة للمطورين
  tagline: تعامل مع Google Drive كنظام ملفات حقيقي، اربطه عبر WebDAV، وفهرس البيانات في كاش SQLite محلي فوري، وتدفق بالبيانات بأقصى سرعة.
  image:
    src: /logo.svg
    alt: DriveKit Logo
  actions:
    - theme: brand
      text: ابدأ الآن 🚀
      link: /ar/guide/getting-started
    - theme: alt
      text: استعراض المميزات
      link: /ar/guide/virtual-paths
    - theme: alt
      text: أداة CLI
      link: /ar/guide/cli

features:
  - icon: 📂
    title: نظام مسارات افتراضي ذكي
    details: تخلَّ عن البحث اليدوي عن معرفات المجلدات. استخدم مسارات حقيقية مثل /Backups/2026/db.sql مع دعم إنشاء المجلدات التلقائي (mkdirp) والتخزين المؤقت السريع.
  - icon: ⚡
    title: كاش SQLite محلي فوري (0ms)
    details: فهرسة البيانات محلياً باستخدام محرك SQLite المدمج في Node 22 لبحث فوري بدون استهلاك كوتا Google Drive API نهائياً.
  - icon: 🖥️
    title: خادم WebDAV وربط الأقراص
    details: اربط Google Drive كمحرك أقراص حقيقي في macOS Finder و Windows Explorer مباشرة مع حماية كاملة عبر Basic Authentication.
  - icon: 🌊
    title: تدفق البيانات Node.js Streams
    details: تدفق حقيقي بذاكرة ثابتة لنقل الجيجابايتات مع دعم createReadStream و createWriteStream والطلبات الجزئية HTTP 206 Range.
  - icon: 🚀
    title: رفع متقطع عالي السرعة
    details: رفع آمن للملفات الكبيرة بقطع سريعة مع استئناف فوري عند انقطاع الاتصال وتتبع حي لنسبة الإنجاز والسرعة والوقت المتبقي.
  - icon: 🧩
    title: نظام إضافات متكامل (Plugins)
    details: اعتراض العمليات في دورة الحياة، وتسمية وتأريخ تلقائي، وخطافات ويب (Webhooks) مع مهلة زمنية وإعادة المحاولة.
---
