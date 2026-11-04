import { describe, it, expect, vi } from 'vitest';
import { DriveKit } from '../src/core/client.js';
import { PluginManager, type DriveKitPlugin } from '../src/core/plugins.js';
import { terminalLink } from '../src/cli/terminal-ui.js';

describe('Resource Refs & Fluent API', () => {
  it('instantiates DriveFileRef and DriveFolderRef correctly', () => {
    const drive = new DriveKit();
    const fileRef = drive.file('/Documents/test.pdf');
    const folderRef = drive.folder('/Documents');

    expect(fileRef.pathOrId).toBe('/Documents/test.pdf');
    expect(folderRef.pathOrId).toBe('/Documents');
    expect(typeof fileRef.get).toBe('function');
    expect(typeof fileRef.download).toBe('function');
    expect(typeof folderRef.ls).toBe('function');
    expect(typeof folderRef.upload).toBe('function');
  });

  it('generates OSC 8 terminal hyperlinks', () => {
    const link = terminalLink('Click Here', 'https://drive.google.com');
    expect(link).toContain('\u001B]8;;https://drive.google.com\u0007Click Here\u001B]8;;\u0007');
  });
});

describe('Plugin System', () => {
  it('executes beforeUpload and afterUpload hooks', async () => {
    const pm = new PluginManager();
    const beforeHook = vi.fn((opts) => ({ ...opts, name: 'modified-name.txt' }));
    const afterHook = vi.fn((file) => ({ ...file, description: 'added by plugin' }));

    pm.use({
      name: 'test-plugin',
      beforeUpload: beforeHook,
      afterUpload: afterHook,
    });

    const processedOpts = await pm.runBeforeUpload({ source: 'local.txt', name: 'original.txt' });
    expect(processedOpts.name).toBe('modified-name.txt');
    expect(beforeHook).toHaveBeenCalledOnce();

    const processedFile = await pm.runAfterUpload({ id: '123', name: 'modified-name.txt' });
    expect(processedFile.description).toBe('added by plugin');
    expect(afterHook).toHaveBeenCalledOnce();
  });
});
