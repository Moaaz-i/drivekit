import path from 'node:path';
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

  /**
   * Register a plugin. If a plugin with the same name already exists,
   * it replaces the old one to avoid duplicate side-effects.
   */
  use(plugin: DriveKitPlugin): this {
    this.plugins = this.plugins.filter((p) => p.name !== plugin.name);
    this.plugins.push(plugin);
    return this;
  }

  /**
   * Unregister a plugin by its name.
   * Returns true if a plugin was found and removed, false otherwise.
   */
  unuse(pluginName: string): boolean {
    const initialLen = this.plugins.length;
    this.plugins = this.plugins.filter((p) => p.name !== pluginName);
    return this.plugins.length < initialLen;
  }

  /**
   * Check if a plugin with given name is currently active
   */
  has(pluginName: string): boolean {
    return this.plugins.some((p) => p.name === pluginName);
  }

  /**
   * Returns all currently registered plugins
   */
  getPlugins(): readonly DriveKitPlugin[] {
    return [...this.plugins];
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

export interface WebhookPluginOptions {
  url: string;
  headers?: Record<string, string>;
  events?: ('upload' | 'download')[];
  timeout?: number;
  retries?: number;
  onError?: (err: Error, event: 'upload' | 'download') => void;
}

/**
 * Creates an official Webhook Plugin to notify external services (Slack, Discord, Telegram, Zapier)
 * when uploads or downloads finish. Includes configurable timeout, retry mechanism, and error callback.
 */
export function createWebhookPlugin(options: WebhookPluginOptions): DriveKitPlugin {
  const events = options.events || ['upload'];
  const timeoutMs = options.timeout ?? 5000;
  const maxRetries = options.retries ?? 0;

  const sendWebhook = async (event: 'upload' | 'download', payload: any) => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let timeoutId: NodeJS.Timeout | undefined;
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(options.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`Webhook returned HTTP ${res.status}: ${res.statusText}`);
        }
        return; // Success
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        if (attempt === maxRetries) {
          if (options.onError) {
            options.onError(lastError instanceof Error ? lastError : new Error(String(lastError)), event);
          }
        }
      }
    }
  };

  return {
    name: 'drivekit-official-webhook',
    async afterUpload(file) {
      if (!events.includes('upload')) return;
      await sendWebhook('upload', {
        event: 'drivekit:upload',
        timestamp: new Date().toISOString(),
        file: {
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        },
      });
    },
    async afterDownload(result) {
      if (!events.includes('download')) return;
      await sendWebhook('download', {
        event: 'drivekit:download',
        timestamp: new Date().toISOString(),
        file: {
          name: result.name,
          size: result.size,
        },
      });
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
        name = path.basename(opts.source);
      }
      if (!name) return opts;

      const ext = path.extname(name);
      const base = path.basename(name, ext);

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
