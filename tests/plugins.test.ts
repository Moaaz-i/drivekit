import { describe, it, expect } from 'vitest';
import { PluginManager, createAutoNamePlugin, createWebhookPlugin } from '../src/core/plugins.js';

describe('Official Plugins', () => {
  it('AutoNamePlugin prefixes and suffixes filename properly', async () => {
    const manager = new PluginManager();
    manager.use(
      createAutoNamePlugin({
        prefix: 'backup_',
        suffix: '_final',
      })
    );

    const result = await manager.runBeforeUpload({
      source: 'test.sql',
      filename: 'test.sql',
    });

    expect(result.filename).toBe('backup_test_final.sql');
  });

  it('WebhookPlugin executes after upload without throwing', async () => {
    const manager = new PluginManager();
    manager.use(
      createWebhookPlugin({
        url: 'http://127.0.0.1:9999/dummy-webhook',
        events: ['upload'],
      })
    );

    // Mock file
    const file = {
      id: 'f1',
      name: 'hello.txt',
      mimeType: 'text/plain',
      size: '123',
    };

    // Should not throw even if URL is unreachable
    const res = await manager.runAfterUpload(file);
    expect(res.id).toBe('f1');
  });
});
