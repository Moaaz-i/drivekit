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

