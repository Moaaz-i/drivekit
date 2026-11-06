# 🛠️ Troubleshooting & Error Reference

---

## 🛑 Custom Error Classes

All errors inherit from `DriveKitError`:

```typescript
import {
  DriveKitError,
  DriveAuthError,
  DriveNotFoundError,
  DriveRateLimitError,
  DriveUploadError,
} from 'drivekit';

try {
  await drive.upload({ source: './file.pdf', parent: '/UnknownPath' });
} catch (error) {
  if (error instanceof DriveNotFoundError) {
    console.error(`Resource missing: ${error.resourceIdOrPath}`);
  } else if (error instanceof DriveRateLimitError) {
    console.error(`Rate limited. Retry after: ${error.retryAfterSeconds}s`);
  } else if (error instanceof DriveUploadError) {
    console.error(`Upload failed after sending ${error.bytesUploaded} bytes`);
  } else if (error instanceof DriveAuthError) {
    console.error(`Auth error: ${error.message}`);
  }
}
```

| Error Class | Code | Cause |
|---|---|---|
| `DriveAuthError` | `AUTH_ERROR` | Missing credentials, invalid token, or expired session. |
| `DriveNotFoundError` | `NOT_FOUND` | Path or file ID does not exist. |
| `DriveRateLimitError` | `RATE_LIMIT_EXCEEDED` | Google Drive API rate limits (429). |
| `DriveUploadError` | `UPLOAD_ERROR` | Session initiation or chunk failure. |
| `DriveKitError` | `DRIVEKIT_ERROR` | Base class for all DriveKit errors. |

---

## ❓ Frequently Asked Questions

### 1. `Service Accounts do not have storage quota`
- **Cause:** Free personal `@gmail.com` accounts do not allocate storage quota to Service Accounts (`0 B`). A Service Account can list files, create directories (`mkdirp`), read documents, and search, but cannot own files with bytes in personal folders.
- **Solution:**
  1. **Personal Accounts:** Use OAuth2 (pass `accessToken: '...'` or use user login). This consumes the user's free 15 GB quota.
  2. **Google Workspace:** Add the Service Account to a **Shared Drive**.

---

### 2. Error 401: `Login Required`
- Ensure key file path exists or that the bearer access token has not expired (standard tokens expire in 1 hour).

---

### 3. Error 404: `Resource Not Found`
- Ensure the folder is shared with your Service Account email with **Editor** permissions.

