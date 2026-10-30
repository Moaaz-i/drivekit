# 🔑 Authentication

DriveKit supports all standard Google Drive authentication mechanisms:

---

## 1. Service Account JSON Key

Ideal for headless servers, background daemons, and microservices:

```typescript
const drive = await createDrive({
  auth: {
    keyFilePath: './service-account.json', // or process.env.GOOGLE_APPLICATION_CREDENTIALS
  },
});
```

---

## 2. Bearer Access Token

Ideal for client-authenticated flows (e.g. Login with Google):

```typescript
const drive = await createDrive({
  auth: {
    accessToken: 'ya29.a0AfH6SMD...', // uses user's 15GB quota
  },
});
```

---

## 3. OAuth2 Client with Refresh Token

```typescript
const drive = await createDrive({
  auth: {
    oauth: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
      redirectUri: 'http://localhost:3000/oauth2callback',
    },
  },
});
```

