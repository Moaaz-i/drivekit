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
    ['meta', { property: 'og:description', content: 'Modern, high-performance Google Drive SDK with virtual paths, resumable chunked uploads, and CLI.' }],
  ],

  locales: {
    root: {
      label: 'العربية',
      lang: 'ar',
      dir: 'rtl',
      title: 'DriveKit',
      description: 'أداة ومكتبة Google Drive فائقة السرعة والمرونة للمطورين',
      themeConfig: {
        nav: [
          { text: 'الرئيسية', link: '/' },
          { text: 'دليل البدء', link: '/guide/getting-started' },
          { text: 'المميزات', link: '/guide/virtual-paths' },
          { text: 'أداة CLI', link: '/guide/cli' },
          { text: 'استكشاف الأخطاء', link: '/guide/troubleshooting' },
          { text: 'مرجع API', link: '/api/reference' },
        ],
        sidebar: [
          {
            text: 'البداية السريعة',
            items: [
              { text: 'مقدمة عن DriveKit', link: '/guide/getting-started' },
              { text: 'طرق المصادقة (Auth)', link: '/guide/authentication' },
            ],
          },
          {
            text: 'المميزات والعمليات',
            items: [
              { text: 'المسارات الافتراضية (Virtual Paths)', link: '/guide/virtual-paths' },
              { text: 'الرفع المتقطع والتنزيل (Upload & Download)', link: '/guide/upload-download' },
              { text: 'تدفق البيانات والمدى الجزئي (Streams)', link: '/guide/streams' },
              { text: 'كاش SQLite اللحظي (0ms Cache)', link: '/guide/sqlite-cache' },
              { text: 'إدارة الملفات (CRUD & Operations)', link: '/guide/file-management' },
              { text: 'باني الاستعلامات (Query Builder)', link: '/guide/query-builder' },
              { text: 'المزامنة والتنزيل الذكي (Sync & Pull)', link: '/guide/folder-sync' },
              { text: 'خادم WebDAV وربط الأقراص (WebDAV)', link: '/guide/webdav' },
              { text: 'مراقب التغييرات اللحظي (Change Watcher)', link: '/guide/watcher' },
              { text: 'تنظيف المساحة والتكرارات (Storage Cleaner)', link: '/guide/cleaner' },
              { text: 'المشاركة والأذونات والأقراص المشتركة', link: '/guide/sharing' },
              { text: 'نظام الإضافات (Plugins)', link: '/guide/plugins' },
            ],
          },
          {
            text: 'متقدم واستكشاف الأخطاء',
            items: [
              { text: 'إعدادات متقدمة وأداء (Advanced)', link: '/guide/advanced' },
              { text: 'استكشاف الأخطاء وحلها (Troubleshooting)', link: '/guide/troubleshooting' },
            ],
          },
          {
            text: 'أداة الطرفية',
            items: [
              { text: 'أوامر سطر الأوامر (CLI Guide)', link: '/guide/cli' },
            ],
          },
          {
            text: 'المرجع الشامل',
            items: [
              { text: 'مرجع الدوال والكلاسات (API Reference)', link: '/api/reference' },
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
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'CLI', link: '/en/guide/cli' },
          { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
          { text: 'API Reference', link: '/en/api/reference' },
        ],
        sidebar: [
          {
            text: 'Getting Started',
            items: [
              { text: 'Introduction', link: '/en/guide/getting-started' },
              { text: 'Authentication', link: '/en/guide/authentication' },
            ],
          },
          {
            text: 'Core Features',
            items: [
              { text: 'Virtual Paths', link: '/en/guide/virtual-paths' },
              { text: 'Resumable Upload & Download', link: '/en/guide/upload-download' },
              { text: 'Streams & Range Requests', link: '/en/guide/streams' },
              { text: 'SQLite 0ms Cache', link: '/en/guide/sqlite-cache' },
              { text: 'File Management (CRUD)', link: '/en/guide/file-management' },
              { text: 'Fluent Query Builder', link: '/en/guide/query-builder' },
              { text: 'Parallel Sync & Smart Pull', link: '/en/guide/folder-sync' },
              { text: 'WebDAV Server & Mounting', link: '/en/guide/webdav' },
              { text: 'Real-time Change Watcher', link: '/en/guide/watcher' },
              { text: 'Storage Cleaner & Duplicates', link: '/en/guide/cleaner' },
              { text: 'Sharing & Enterprise Drives', link: '/en/guide/sharing' },
              { text: 'Plugins Architecture', link: '/en/guide/plugins' },
            ],
          },
          {
            text: 'Advanced & Diagnostics',
            items: [
              { text: 'Advanced Settings & Raw Client', link: '/en/guide/advanced' },
              { text: 'Troubleshooting & FAQ', link: '/en/guide/troubleshooting' },
            ],
          },
          {
            text: 'Command Line',
            items: [
              { text: 'CLI Commands', link: '/en/guide/cli' },
            ],
          },
          {
            text: 'Reference',
            items: [
              { text: 'API Reference', link: '/en/api/reference' },
            ],
          },
        ],
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

