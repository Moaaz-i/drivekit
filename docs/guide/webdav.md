# 🖥️ WebDAV Server & Drive Mounting

**DriveKit** includes a zero-dependency, high-performance embedded **WebDAV server (RFC 4918)**. It allows you to mount Google Drive directly as a local network drive in **macOS Finder**, **Windows File Explorer**, or Linux without installing the bulky official Google Drive desktop client!

---

## 🚀 Starting the Server via CLI

Run the `serve` command:

```bash
# Start locally without authentication (localhost only)
npx drivekit serve --port 8080

# Start with HTTP Basic Authentication enabled (recommended)
npx drivekit serve --port 8080 --username admin --password secret
```

The server will start listening at `http://127.0.0.1:8080`.

---

## 🔒 Security & Authentication (HTTP Basic Auth)

When exposing your WebDAV server over a local network or remote host, protect your files with HTTP Basic Authentication:

```typescript
const serverInstance = await drive.serveWebDAV({
  port: 8080,
  host: '0.0.0.0',
  auth: {
    username: 'admin',
    password: 'super-secret-password',
  },
});
```

When enabled, unauthenticated or invalid requests receive an RFC-compliant `401 Unauthorized` response with a `WWW-Authenticate: Basic realm="DriveKit WebDAV"` challenge.

---

## 🍏 Mounting in macOS Finder

1. Open **Finder**.
2. Press <kbd>Cmd</kbd> + <kbd>K</kbd> (or select **Go -> Connect to Server** from the menu bar).
3. In the Server Address field, enter:
   ```text
   http://127.0.0.1:8080
   ```
4. Click **Connect**. If authentication is enabled, select **Registered User** and enter your credentials; otherwise choose **Connect as Guest**.
5. Your Google Drive files will mount as a native volume in Finder! You can browse, drag and drop files, and create folders natively.

---

## 🪟 Mounting in Windows Explorer

1. Open **This PC** in File Explorer.
2. In the top ribbon, click **Map network drive**.
3. In the Folder field, enter:
   ```text
   http://127.0.0.1:8080
   ```
4. If authentication is enabled, check **Connect using different credentials**, click **Finish**, and enter your credentials. DriveKit will mount as a drive letter (e.g. `Z:`).

---

## 💻 Programmatic Usage & Advanced Features

You can also start and manage the WebDAV server programmatically with full lifecycle control:

```typescript
import { createDrive } from 'drivekit';

const drive = await createDrive({
  auth: { keyFilePath: './service-account.json' },
});

const server = await drive.serveWebDAV({
  port: 8080,
  host: '127.0.0.1',
  auth: {
    username: 'admin',
    password: 'secure-password',
  },
});

console.log(`WebDAV active at: ${server.url}`);

// Stop the server when needed:
// await server.close();
```

### Protocol Capabilities:
* **Zero-Buffer Streaming `PUT`**: Files are piped directly into Google Drive via `createWriteStream()`. No multi-gigabyte memory buffers on large uploads. Returns `201 Created` for new files and `204 No Content` for overwrites.
* **HTTP Range (RFC 7233)**: Supports partial downloads and seekable streaming, returning `206 Partial Content`.
* **Atomic `MOVE` & `COPY`**: WebDAV `MOVE` and `COPY` headers are cleanly resolved by internal file ID, avoiding name collision and stale destination paths.
* **XML Escaping**: Special characters (`&`, `<`, `>`, `"`, `'`) in file and folder names are escaped safely in `PROPFIND` multistatus responses.
