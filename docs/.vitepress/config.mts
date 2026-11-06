import { defineConfig } from 'vitepress';

const base = process.env.GITHUB_ACTIONS ? '/drivekit/' : '/';

export default defineConfig({
  title: 'DriveKit',
  description: 'The fast, powerful, and developer-friendly Google Drive SDK & CLI',
  base,
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#0284c7' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'DriveKit | Ultra-Fast Google Drive SDK' }],
    ['meta', { property: 'og:description', content: 'Modern, high-performance Google Drive SDK with virtual paths, resumable chunked uploads, SQLite cache, WebDAV, and CLI.' }],
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      dir: 'ltr',
      title: 'DriveKit',
      description: 'The fast, powerful, and developer-friendly Google Drive SDK & CLI',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Features', link: '/guide/virtual-paths' },
          { text: 'CLI', link: '/guide/cli' },
          { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          { text: 'API Reference', link: '/api/reference' },
        ],
        sidebar: [
          {
            text: 'Getting Started',
            items: [
              { text: 'Introduction', link: '/guide/getting-started' },
              { text: 'Authentication', link: '/guide/authentication' },
            ],
          },
          {
            text: 'Core Features',
            items: [
              { text: 'Virtual Paths', link: '/guide/virtual-paths' },
              { text: 'Resumable Upload & Download', link: '/guide/upload-download' },
              { text: 'Streams & Range Requests', link: '/guide/streams' },
              { text: 'SQLite 0ms Cache', link: '/guide/sqlite-cache' },
              { text: 'File Management (CRUD)', link: '/guide/file-management' },
              { text: 'Fluent Query Builder', link: '/guide/query-builder' },
              { text: 'Parallel Sync & Smart Pull', link: '/guide/folder-sync' },
              { text: 'WebDAV Server & Mounting', link: '/guide/webdav' },
              { text: 'Real-time Change Watcher', link: '/guide/watcher' },
              { text: 'Storage Cleaner & Duplicates', link: '/guide/cleaner' },
              { text: 'Sharing & Enterprise Drives', link: '/guide/sharing' },
              { text: 'Plugins Architecture', link: '/guide/plugins' },
            ],
          },
          {
            text: 'Advanced & Diagnostics',
            items: [
              { text: 'Advanced Settings & Raw Client', link: '/guide/advanced' },
              { text: 'Troubleshooting & FAQ', link: '/guide/troubleshooting' },
            ],
          },
          {
            text: 'Command Line',
            items: [
              { text: 'CLI Commands', link: '/guide/cli' },
            ],
          },
          {
            text: 'Reference',
            items: [
              { text: 'API Reference', link: '/api/reference' },
            ],
          },
        ],
        outline: {
          label: 'On this page',
        },
        docFooter: {
          prev: 'Previous page',
          next: 'Next page',
        },
      },
    },
    ar: {
      label: 'العربية',
      lang: 'ar',
      dir: 'rtl',
      link: '/ar/',
      title: 'DriveKit',
      description: 'أداة ومكتبة Google Drive فائقة السرعة والمرونة للمطورين',
      themeConfig: {
        nav: [
          { text: 'الرئيسية', link: '/ar/' },
          { text: 'دليل البدء', link: '/ar/guide/getting-started' },
          { text: 'المميزات', link: '/ar/guide/virtual-paths' },
          { text: 'أداة CLI', link: '/ar/guide/cli' },
          { text: 'استكشاف الأخطاء', link: '/ar/guide/troubleshooting' },
          { text: 'مرجع API', link: '/ar/api/reference' },
        ],
        sidebar: [
          {
            text: 'البداية السريعة',
            items: [
              { text: 'مقدمة عن DriveKit', link: '/ar/guide/getting-started' },
              { text: 'طرق المصادقة (Auth)', link: '/ar/guide/authentication' },
            ],
          },
          {
            text: 'المميزات والعمليات',
            items: [
              { text: 'المسارات الافتراضية (Virtual Paths)', link: '/ar/guide/virtual-paths' },
              { text: 'الرفع المتقطع والتنزيل (Upload & Download)', link: '/ar/guide/upload-download' },
              { text: 'تدفق البيانات والمدى الجزئي (Streams)', link: '/ar/guide/streams' },
              { text: 'كاش SQLite اللحظي (0ms Cache)', link: '/ar/guide/sqlite-cache' },
              { text: 'إدارة الملفات (CRUD & Operations)', link: '/ar/guide/file-management' },
              { text: 'باني الاستعلامات (Query Builder)', link: '/ar/guide/query-builder' },
              { text: 'المزامنة والتنزيل الذكي (Sync & Pull)', link: '/ar/guide/folder-sync' },
              { text: 'خادم WebDAV وربط الأقراص (WebDAV)', link: '/ar/guide/webdav' },
              { text: 'مراقب التغييرات اللحظي (Change Watcher)', link: '/ar/guide/watcher' },
              { text: 'تنظيف المساحة والتكرارات (Storage Cleaner)', link: '/ar/guide/cleaner' },
              { text: 'المشاركة والأذونات والأقراص المشتركة', link: '/ar/guide/sharing' },
              { text: 'نظام الإضافات (Plugins)', link: '/ar/guide/plugins' },
            ],
          },
          {
            text: 'متقدم واستكشاف الأخطاء',
            items: [
              { text: 'إعدادات متقدمة وأداء (Advanced)', link: '/ar/guide/advanced' },
              { text: 'استكشاف الأخطاء وحلها (Troubleshooting)', link: '/ar/guide/troubleshooting' },
            ],
          },
          {
            text: 'أداة الطرفية',
            items: [
              { text: 'أوامر سطر الأوامر (CLI Guide)', link: '/ar/guide/cli' },
            ],
          },
          {
            text: 'المرجع الشامل',
            items: [
              { text: 'مرجع الدوال والكلاسات (API Reference)', link: '/ar/api/reference' },
            ],
          },
        ],
        outline: {
          label: 'في هذه الصفحة',
        },
        docFooter: {
          prev: 'الصفحة السابقة',
          next: 'الصفحة التالية',
        },
      },
    },
  },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'DriveKit',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Moaaz-i/drivekit' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Moaaz. Built with ❤️ for Developers.',
    },
    search: {
      provider: 'local',
    },
  },
});
