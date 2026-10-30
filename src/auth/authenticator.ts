import fs from 'node:fs';
import { auth as googleAuth } from '@googleapis/drive';
import type { DriveKitAuthConfig } from '../types.js';
import { DriveAuthError } from '../errors.js';

export const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/drive',
];

/**
 * Handles Google Drive authentication across various methods
 */
export class DriveAuthenticator {
  private config: DriveKitAuthConfig;
  private authClient: any = null;

  constructor(config: DriveKitAuthConfig = {}) {
    this.config = config;
  }

  /**
   * Initializes and returns an authenticated Google client
   */
  async getAuthClient(): Promise<any> {
    if (this.authClient) {
      return this.authClient;
    }

    try {
      const scopes = this.config.scopes || DEFAULT_SCOPES;

      // 1. Direct Access Token provided
      if (this.config.accessToken) {
        const oauth2Client = new googleAuth.OAuth2();
        oauth2Client.setCredentials({ access_token: this.config.accessToken });
        this.authClient = oauth2Client;
        return this.authClient;
      }

      // 2. Existing OAuth2Client instance provided
      if (this.config.oauth2Client) {
        this.authClient = this.config.oauth2Client;
        return this.authClient;
      }

      // 3. OAuth with Refresh Token
      if (this.config.oauth) {
        const { clientId, clientSecret, redirectUri = 'http://localhost:3000/oauth2callback', refreshToken } = this.config.oauth;
        const oauth2Client = new googleAuth.OAuth2(clientId, clientSecret, redirectUri);
        if (refreshToken) {
          oauth2Client.setCredentials({ refresh_token: refreshToken });
        }
        this.authClient = oauth2Client;
        return this.authClient;
      }

      // 4. Service Account Key File or Environment
      const keyFile = this.config.keyFilePath ||
        process.env.GDRIVE_SERVICE_ACCOUNT_PATH ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (keyFile) {
        if (!fs.existsSync(keyFile)) {
          throw new DriveAuthError(`Service account file not found at: ${keyFile}`);
        }
        const auth = new googleAuth.GoogleAuth({
          keyFile,
          scopes,
        });
        this.authClient = auth;
        return this.authClient;
      }

      // 5. In-Memory Service Account Credentials
      const creds = this.config.credentials || (process.env.GDRIVE_CREDENTIALS_JSON ? JSON.parse(process.env.GDRIVE_CREDENTIALS_JSON) : null);
      if (creds) {
        const auth = new googleAuth.GoogleAuth({
          credentials: creds,
          scopes,
        });
        this.authClient = auth;
        return this.authClient;
      }

      // 6. Fallback to Google Application Default Credentials (ADC)
      const auth = new googleAuth.GoogleAuth({ scopes });
      this.authClient = auth;
      return this.authClient;
    } catch (err: any) {
      if (err instanceof DriveAuthError) throw err;
      throw new DriveAuthError(`Failed to authenticate with Google Drive: ${err.message}`, err);
    }
  }

  /**
   * Helper to generate OAuth2 Consent URL for user authorization
   */
  static generateAuthUrl(options: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    scopes?: string[];
  }): string {
    const oauth2Client = new googleAuth.OAuth2(
      options.clientId,
      options.clientSecret,
      options.redirectUri || 'urn:ietf:wg:oauth:2.0:oob'
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: options.scopes || DEFAULT_SCOPES,
    });
  }

  /**
   * Helper to exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(options: {
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri?: string;
  }): Promise<{ access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }> {
    const oauth2Client = new googleAuth.OAuth2(
      options.clientId,
      options.clientSecret,
      options.redirectUri || 'urn:ietf:wg:oauth:2.0:oob'
    );

    const { tokens } = await oauth2Client.getToken(options.code);
    return tokens;
  }
}
