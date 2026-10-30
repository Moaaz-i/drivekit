import http from 'node:http';
import { exec } from 'node:child_process';
import { auth as googleAuth } from '@googleapis/drive';
import { DEFAULT_SCOPES } from './authenticator.js';

export interface BrowserLoginOptions {
  clientId: string;
  clientSecret: string;
  port?: number;
  scopes?: string[];
}

export interface LoginResult {
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    token_type?: string | null;
  };
  client: any;
}

/**
 * Initiates interactive 1-click browser login flow:
 * 1. Starts ephemeral local callback server
 * 2. Opens default browser to Google OAuth consent
 * 3. Catches callback, exchanges code for tokens, and serves success page
 */
export async function loginWithBrowser(options: BrowserLoginOptions): Promise<LoginResult> {
  const port = options.port || 3000;
  const redirectUri = `http://localhost:${port}/oauth2callback`;
  const scopes = options.scopes || DEFAULT_SCOPES;

  const oauth2Client = new googleAuth.OAuth2(
    options.clientId,
    options.clientSecret,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', `http://localhost:${port}`);
        if (reqUrl.pathname === '/oauth2callback') {
          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<h2>❌ Authorization Failed</h2><p>${error}</p>`);
            server.close();
            return reject(new Error(`OAuth error: ${error}`));
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h2>❌ Missing authorization code</h2>');
            return;
          }

          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);

          // Render Success Page
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <title>DriveKit Authentication</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #0f172a;
                  color: #f8fafc;
                }
                .card {
                  text-align: center;
                  padding: 40px;
                  background: #1e293b;
                  border-radius: 16px;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                }
                .badge {
                  font-size: 48px;
                  margin-bottom: 12px;
                }
                h1 { color: #38bdf8; margin: 0 0 10px 0; }
                p { color: #94a3b8; font-size: 16px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="badge">⚡</div>
                <h1>Authentication Successful!</h1>
                <p>DriveKit is now connected to your Google Drive account.</p>
                <p>You can close this window and return to your terminal.</p>
              </div>
            </body>
            </html>
          `);

          server.close();
          resolve({ tokens, client: oauth2Client });
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>❌ Server Error</h2><p>${(err as any).message}</p>`);
        server.close();
        reject(err);
      }
    });

    server.listen(port, () => {
      // Launch browser
      const openCmd = process.platform === 'darwin'
        ? `open "${authUrl}"`
        : process.platform === 'win32'
          ? `start "" "${authUrl}"`
          : `xdg-open "${authUrl}"`;

      exec(openCmd, (err) => {
        if (err) {
          console.log(`\nPlease open the following URL in your browser to sign in:\n${authUrl}\n`);
        }
      });
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

