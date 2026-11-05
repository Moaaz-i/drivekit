import type { UploadOptions, DownloadOptions, DriveApiFile } from '../types.js';

export interface DriveKitPlugin {
  name: string;
  beforeUpload?: (options: UploadOptions) => Promise<UploadOptions | void> | UploadOptions | void;
  afterUpload?: (file: DriveApiFile) => Promise<DriveApiFile | void> | DriveApiFile | void;
  beforeDownload?: (fileId: string, options: DownloadOptions) => Promise<DownloadOptions | void> | DownloadOptions | void;
  afterDownload?: (result: any) => Promise<any | void> | any | void;
}

export class PluginManager {
  private plugins: DriveKitPlugin[] = [];

  use(plugin: DriveKitPlugin): this {
    this.plugins.push(plugin);
    return this;
  }

  async runBeforeUpload(options: UploadOptions): Promise<UploadOptions> {
    let current = { ...options };
    for (const plugin of this.plugins) {
      if (plugin.beforeUpload) {
        const modified = await plugin.beforeUpload(current);
        if (modified) current = modified;
      }
    }
    return current;
  }

  async runAfterUpload(file: DriveApiFile): Promise<DriveApiFile> {
    let current = file;
    for (const plugin of this.plugins) {
      if (plugin.afterUpload) {
        const modified = await plugin.afterUpload(current);
        if (modified) current = modified;
      }
    }
    return current;
  }

  async runBeforeDownload(fileId: string, options: DownloadOptions): Promise<DownloadOptions> {
    let current = { ...options };
    for (const plugin of this.plugins) {
      if (plugin.beforeDownload) {
        const modified = await plugin.beforeDownload(fileId, current);
        if (modified) current = modified;
      }
    }
    return current;
  }

  async runAfterDownload(result: any): Promise<any> {
    let current = result;
    for (const plugin of this.plugins) {
      if (plugin.afterDownload) {
        const modified = await plugin.afterDownload(current);
        if (modified) current = modified;
      }
    }
    return current;
  }
}

/**
 * Creates an official Webhook Plugin to notify external services (Slack, Discord, Telegram, Zapier)
 * when uploads or downloads finish.
 */
export function createWebhookPlugin(options: {
  url: string;
  headers?: Record<string, string>;
  events?: ('upload' | 'download')[];
}): DriveKitPlugin {
  const events = options.events || ['upload'];

  return {
    name: 'drivekit-official-webhook',
    async afterUpload(file) {
      if (!events.includes('upload')) return;
      try {
        await fetch(options.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
          body: JSON.stringify({
            event: 'drivekit:upload',
            timestamp: new Date().toISOString(),
            file: {
              id: file.id,
              name: file.name,
              size: file.size,
              mimeType: file.mimeType,
            },
          }),
        });
      } catch (e) {
        // Silently swallow webhook errors to avoid interrupting operations
      }
    },
    async afterDownload(result) {
      if (!events.includes('download')) return;
      try {
        await fetch(options.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
          body: JSON.stringify({
            event: 'drivekit:download',
            timestamp: new Date().toISOString(),
            file: {
              name: result.name,
              size: result.size,
            },
          }),
        });
      } catch (e) {
        // ignore
      }
    },
  };
}

/**
 * Creates an Auto-Namer Plugin to automatically prefix/suffix or timestamp files
 */
export function createAutoNamePlugin(options: {
  prefix?: string;
  suffix?: string;
  appendTimestamp?: boolean;
}): DriveKitPlugin {
  return {
    name: 'drivekit-official-autoname',
    beforeUpload(opts) {
      let name = opts.filename;
      if (!name && typeof opts.source === 'string') {
        const pathModule = require('node:path');
        name = pathModule.basename(opts.source);
      }
      if (!name) return opts;

      const pathModule = require('node:path');
      const ext = pathModule.extname(name);
      const base = pathModule.basename(name, ext);

      let finalName = base;
      if (options.prefix) finalName = `${options.prefix}${finalName}`;
      if (options.appendTimestamp) {
        finalName = `${finalName}_${Date.now()}`;
      }
      if (options.suffix) finalName = `${finalName}${options.suffix}`;
      finalName = `${finalName}${ext}`;

      return {
        ...opts,
        filename: finalName,
      };
    },
  };
}

