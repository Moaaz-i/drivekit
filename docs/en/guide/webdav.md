# 🖥️ WebDAV Server & Drive Mounting

**DriveKit** includes a zero-dependency, high-performance embedded **WebDAV server (RFC 4918)**. It allows you to mount Google Drive directly as a local network drive in **macOS Finder**, **Windows File Explorer**, or Linux without installing the bulky official Google Drive desktop client!

---

## 🚀 Starting the Server via CLI

Run the `serve` command:

```bash
npx drivekit serve --port 8080
```

The server will start listening at `http://127.0.0.1:8080`.

---

## 🍏 Mounting in macOS Finder

1. Open **Finder**.
2. Press <kbd>Cmd</kbd> + <kbd>K</kbd> (or select **Go -> Connect to Server** from the menu bar).
3. In the Server Address field, enter:
   ```text
   http://127.0.0.1:8080
   ```
4. Click **Connect** and choose **Connect as Guest**.
5. Your Google Drive files will mount as a native volume in Finder! You can browse, drag and drop files, and create folders natively.

---

## 🪟 Mounting in Windows Explorer

1. Open **This PC** in File Explorer.
2. In the top ribbon, click **Map network drive**.
3. In the Folder field, enter:
   ```text
   http://127.0.0.1:8080
   ```
4. Click **Finish**. DriveKit will mount as a drive letter (e.g. `Z:`).

---

## 💻 Programmatic Usage

You can also start and manage the WebDAV server programmatically:

```typescript
import { createDrive } from 'drivekit';

const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' }
});

const server = await drive.serveWebDAV({
  port: 8080,
  host: '127.0.0.1'
});

console.log(`WebDAV active at: ${server.url}`);

// Stop when done:
// await server.close();
```

