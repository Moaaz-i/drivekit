# 💻 DriveKit Command Line Interface (CLI)

**DriveKit** comes equipped with a modern, interactive CLI that allows you to manage, sync, and inspect your Google Drive directly from your terminal.

---

## 🚀 Running the CLI

```bash
# Set your credentials environment variable
export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"

# Or pass directly via -k / --key flag
npx drivekit ls / -k ./service-account.json
```

---

## 🛠️ Available Commands

### 1. Storage Quota Check (`quota`)
```bash
npx drivekit quota
```
Displays total storage used, cloud quota, and trash volume in styled colored graphs.

---

### 2. List Files & Folders (`ls`)
```bash
npx drivekit ls /
npx drivekit ls /Backups/2026
```

---

### 3. High-Speed Upload with Deduplication (`upload`)
```bash
npx drivekit upload ./database-dump.sql /Backups -o -d
```
- `-o, --overwrite`: Overwrite existing remote file.
- `-d, --dedup`: Instant Cloud Upload via MD5 deduplication (0 bytes transferred if file exists).
- Displays real-time progress: %, current speed (MB/s), and ETA.

---

### 4. Interactive Terminal Explorer (`explore`)
```bash
npx drivekit explore /
```
Browse Google Drive directories interactively with keyboard arrow keys, <kbd>Enter</kbd> to enter folders, <kbd>Backspace</kbd> to go up, and clickable OSC-8 terminal hyperlinks.

---

### 5. Persistent SQLite Cache (`cache`)
```bash
# View cache statistics and SQLite database path
npx drivekit cache status

# Crawl and index all Drive metadata for 0ms lookups
npx drivekit cache sync

# Clear local SQLite database
npx drivekit cache clear
```

---

### 6. Embedded WebDAV Server (`serve`)
```bash
npx drivekit serve --port 8080
```
Starts a WebDAV bridge to mount Google Drive as a native disk volume in macOS Finder (<kbd>Cmd</kbd> + <kbd>K</kbd>) or Windows File Explorer.

---

### 7. Google Workspace Shared Drives (`shared-drives`)
```bash
npx drivekit shared-drives
```
Lists all accessible enterprise Shared Drives and their IDs.

---

### 8. Download File (`download`)
```bash
npx drivekit download FILE_ID_OR_PATH ./destination-folder
```

---

### 9. Share File & Get Links (`share`)
```bash
# Make public
npx drivekit share FILE_ID

# Share with specific email
npx drivekit share FILE_ID user@example.com
```

---

### 10. Concurrently Sync Local Directory (`sync`)
```bash
npx drivekit sync ./dist /Websites/Production -c 5 -o
```

---

### 11. Pull Remote Folder to Local (`pull`)
```bash
npx drivekit pull /Backups/2026 ./local-backups
```

---

### 12. Storage Cleaner & Duplicates (`clean`)
```bash
# Top 10 largest files
npx drivekit clean --largest 10

# Scan for duplicate files by MD5
npx drivekit clean --duplicates

# Empty Google Drive trash
npx drivekit clean --empty-trash
```

---

### 13. Delete File or Move to Trash (`delete`)
```bash
npx drivekit delete FILE_ID_OR_PATH
npx drivekit delete FILE_ID_OR_PATH --permanent
```
