import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startWebDAVServer } from '../src/server/webdav.js';

describe('WebDAV Server', () => {
  let serverInstance: { server: any; url: string; close: () => Promise<void> };

  beforeAll(async () => {
    // Mock minimal DriveKit instance for WebDAV HTTP compliance test
    const mockDrive: any = {
      init: async () => {},
      getFile: async (path: string) => ({
        id: '123',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: '18',
        modifiedTime: new Date().toISOString(),
      }),
      ls: async () => [],
      createReadStream: async () => {
        const { Readable } = await import('node:stream');
        return Readable.from(['Hello from WebDAV!']);
      },
      mkdirp: async () => 'folder_id',
      upload: async () => ({ id: 'new_id' }),
      delete: async () => {},
    };

    serverInstance = await startWebDAVServer(mockDrive, { port: 9876, host: '127.0.0.1' });
  });

  afterAll(async () => {
    if (serverInstance) {
      await serverInstance.close();
    }
  });

  it('responds with RFC 4918 headers on OPTIONS request', async () => {
    const res = await fetch(`${serverInstance.url}/`, { method: 'OPTIONS' });
    expect(res.status).toBe(200);
    expect(res.headers.get('dav')).toContain('1');
    expect(res.headers.get('allow')).toContain('PROPFIND');
  });

  it('returns XML multistatus on PROPFIND request', async () => {
    const res = await fetch(`${serverInstance.url}/`, {
      method: 'PROPFIND',
      headers: { Depth: '0' },
    });
    expect(res.status).toBe(207);
    const body = await res.text();
    expect(body).toContain('<D:multistatus');
    expect(body).toContain('<D:response>');
  });

  it('streams file contents on GET request', async () => {
    const res = await fetch(`${serverInstance.url}/test.txt`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('Hello from WebDAV!');
  });
});
