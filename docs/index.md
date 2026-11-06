---
layout: home

hero:
  name: DriveKit
  text: Ultra-Fast Google Drive SDK for Developers
  tagline: Treat Google Drive as a real filesystem, mount it via WebDAV, cache metadata in local SQLite, and stream gigabytes with fluent elegance.
  image:
    src: /logo.svg
    alt: DriveKit Logo
  actions:
    - theme: brand
      text: Get Started 🚀
      link: /guide/getting-started
    - theme: alt
      text: Features
      link: /guide/virtual-paths
    - theme: alt
      text: CLI Tool
      link: /guide/cli

features:
  - icon: 📂
    title: Smart Virtual Paths
    details: Ditch manual folder ID lookups. Use real POSIX-like paths like /Backups/2026/db.sql with automated recursive directory creation (mkdirp).
  - icon: ⚡
    title: 0ms SQLite Cache
    details: Local SQLite-backed metadata index powered by Node 22 native node:sqlite for instant zero-latency file and path resolution.
  - icon: 🖥️
    title: Embedded WebDAV Server
    details: Mount Google Drive natively as a network filesystem directly in macOS Finder and Windows Explorer with HTTP Basic Auth.
  - icon: 🌊
    title: Node.js Streams & Range
    details: True memory-efficient streaming for multi-gigabyte transfers with createReadStream, createWriteStream, and HTTP 206 Partial Content.
  - icon: 🚀
    title: Resumable Chunked Uploader
    details: Resumable uploads with automatic network recovery, concurrent worker pools, and live metrics (MB/s, ETA, and progress %).
  - icon: 🧩
    title: Extensible Plugin System
    details: Lifecycle hooks (beforeUpload, afterUpload, etc.), auto-naming with timestamps, and reliable webhooks with timeout & retries.
---
