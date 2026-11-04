---
layout: home

hero:
  name: DriveKit
  text: Ultra-Fast Google Drive SDK for Developers
  tagline: Treat Google Drive as a real filesystem, upload large files with resumable chunks, and query with fluent elegance.
  image:
    src: /logo.svg
    alt: DriveKit Logo
  actions:
    - theme: brand
      text: Get Started 🚀
      link: /en/guide/getting-started
    - theme: alt
      text: Features
      link: /en/guide/virtual-paths
    - theme: alt
      text: CLI Tool
      link: /en/guide/cli

features:
  - icon: 📂
    title: Smart Virtual Paths
    details: Ditch manual folder ID lookups. Use real paths like /Backups/2026/DB.dump with automated directory creation (mkdirp) and caching.
  - icon: 🚀
    title: Resumable Chunked Uploader
    details: High-speed chunked uploading with automatic resume on network drops, and live tracking for %, transfer speed (MB/s), and ETA.
  - icon: 🔍
    title: Fluent Query Builder
    details: Clean chainable search queries instead of error-prone SQL-like string formatting.
  - icon: 🛡️
    title: Adaptive Rate Limit Protection
    details: Automatic exponential backoff with full jitter gracefully handles 429 and 5xx errors.
  - icon: ⚡
    title: Parallel Folder Sync
    details: Concurrently upload complete folder trees with an internal concurrency pool for maximum throughput.
  - icon: 💻
    title: Powerful CLI Included
    details: Run quota checks, folder listing, uploads, downloads, and sync directly from your terminal.
---

