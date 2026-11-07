import { DriveKit } from './core/client.js';
import type { DriveKitOptions } from './types.js';

/**
 * Creates and initializes a DriveKit instance
 *
 * @example
 * ```typescript
 * import { createDrive } from 'drivekit';
 *
 * const drive = await createDrive({
 *   auth: { keyFilePath: './service-account.json' }
 * });
 *
 * const file = await drive.upload({
 *   source: './report.pdf',
 *   parent: '/Backups/2026',
 *   onProgress: (p) => console.log(`${p.percentage}% (${p.speedFormatted})`)
 * });
 * ```
 */
export async function createDrive(options?: DriveKitOptions): Promise<DriveKit> {
  const instance = new DriveKit(options);
  await instance.init();
  return instance;
}

export { DriveKit };
export default DriveKit;

// Core modules & utilities
export * from './types.js';
export * from './errors.js';
export * from './auth/authenticator.js';
export * from './core/query-builder.js';
export * from './core/path-resolver.js';
export * from './core/resumable-uploader.js';
export * from './core/downloader.js';
export * from './core/concurrency-pool.js';
export * from './core/watcher.js';
export * from './core/storage-cleaner.js';
export * from './core/smart-sync.js';
export * from './core/resource-refs.js';
export * from './core/plugins.js';
export * from './core/cache.js';
export * from './server/webdav.js';
export * from './cli/terminal-ui.js';
export * from './auth/browser-login.js';
export * from './utils/format.js';
export * from './utils/mime.js';
export * from './utils/retry.js';
export * from './utils/http-agent.js';

