import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Readable, PassThrough } from 'node:stream';
import { startWebDAVServer, escapeXml } from '../src/server/webdav.js';
import { PluginManager, createWebhookPlugin } from '../src/core/plugins.js';
import { SqliteMetadataCache, MemoryMetadataCache } from '../src/core/cache.js';

describe('DriveKit v1.1.1 Hardening & Security Tests', () => {
  describe('WebDAV Security & Protocols', () => {
    let authServer: { server: any; url: string; close: () => Promise<void> };
    const mockFile = {
      id: 'file_spec',
      name: 'hello & world <test>.txt',
      mimeType: 'text/plain',
      size: '18',
      modifiedTime: new Date().toISOString(),
    };

    let movedFile: any = null;
    let renamedFile: any = null;

    beforeAll(async () => {
      const mockDrive: any = {
        init: async () => {},
        getFile: async (path: string) => {
          if (path.includes('hello')) return mockFile;
          if (path === '/source.txt') return { id: 'src_1', name: 'source.txt', size: '10' };
          return null;
        },
        ls: async () => [mockFile],
        createReadStream: async (_fileId: string, options?: { range?: { start: number; end: number } }) => {
          const content = 'Hello from WebDAV!';
          if (options?.range) {
            const slice = content.slice(options.range.start, options.range.end + 1);
            return Readable.from([slice]);
          }
          return Readable.from([content]);
        },
        createWriteStream: async () => {
          const pt: any = new PassThrough();
          pt.done = Promise.resolve({ id: 'uploaded_id', name: 'stream.txt' });
          return pt;
        },
        download: async () => ({ data: Buffer.from('copy content') }),
        upload: async (opts: any) => ({ id: 'new_upload', name: opts.name }),
        copy: async (_fileId: string, opts: any) => ({ id: 'copied_id', name: opts.name }),
        mkdirp: async () => 'folder_id',
        move: async (fileId: string, newParent: string) => {
          movedFile = { fileId, newParent };
        },
        rename: async (fileId: string, newName: string) => {
          renamedFile = { fileId, newName };
        },
        delete: async () => {},
      };

      authServer = await startWebDAVServer(mockDrive, {
        port: 9877,
        host: '127.0.0.1',
        auth: {
          username: 'admin',
          password: 'secretpassword',
        },
      });
    });

    afterAll(async () => {
      if (authServer) {
        await authServer.close();
      }
    });

    it('rejects unauthenticated requests with 401 Unauthorized and WWW-Authenticate header', async () => {
      const res = await fetch(`${authServer.url}/`, { method: 'PROPFIND' });
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toContain('Basic realm="DriveKit WebDAV"');
    });

    it('rejects invalid credentials with 401 Unauthorized', async () => {
      const invalidCreds = Buffer.from('admin:wrongpassword').toString('base64');
      const res = await fetch(`${authServer.url}/`, {
        method: 'PROPFIND',
        headers: { Authorization: `Basic ${invalidCreds}` },
      });
      expect(res.status).toBe(401);
    });

    it('accepts valid credentials with 207 Multi-Status', async () => {
      const validCreds = Buffer.from('admin:secretpassword').toString('base64');
      const res = await fetch(`${authServer.url}/`, {
        method: 'PROPFIND',
        headers: { Authorization: `Basic ${validCreds}`, Depth: '1' },
      });
      expect(res.status).toBe(207);
    });

    it('escapes XML special characters safely in PROPFIND output', async () => {
      expect(escapeXml('hello & world <test> "quoted" \'item\'')).toBe(
        'hello &amp; world &lt;test&gt; &quot;quoted&quot; &apos;item&apos;'
      );

      const validCreds = Buffer.from('admin:secretpassword').toString('base64');
      const res = await fetch(`${authServer.url}/`, {
        method: 'PROPFIND',
        headers: { Authorization: `Basic ${validCreds}`, Depth: '1' },
      });
      const xml = await res.text();
      expect(xml).toContain('hello &amp; world &lt;test&gt;.txt');
    });

    it('handles HTTP Range headers with 206 Partial Content', async () => {
      const validCreds = Buffer.from('admin:secretpassword').toString('base64');
      const res = await fetch(`${authServer.url}/hello.txt`, {
        headers: {
          Authorization: `Basic ${validCreds}`,
          Range: 'bytes=0-4',
        },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get('content-range')).toBe('bytes 0-4/18');
      const text = await res.text();
      expect(text).toBe('Hello');
    });

    it('executes COPY verb with Destination header', async () => {
      const validCreds = Buffer.from('admin:secretpassword').toString('base64');
      const res = await fetch(`${authServer.url}/source.txt`, {
        method: 'COPY',
        headers: {
          Authorization: `Basic ${validCreds}`,
          Destination: `${authServer.url}/destination.txt`,
        },
      });
      expect([201, 204]).toContain(res.status);
    });

    it('executes atomic MOVE verb properly by ID', async () => {
      const validCreds = Buffer.from('admin:secretpassword').toString('base64');
      const res = await fetch(`${authServer.url}/source.txt`, {
        method: 'MOVE',
        headers: {
          Authorization: `Basic ${validCreds}`,
          Destination: `${authServer.url}/TargetFolder/renamed.txt`,
        },
      });
      expect([201, 204]).toContain(res.status);
      expect(movedFile).toBeDefined();
      expect(movedFile.fileId).toBe('src_1');
      expect(renamedFile).toBeDefined();
      expect(renamedFile.newName).toBe('renamed.txt');
    });
  });

  describe('Cache Pruning & Fallback', () => {
    it('prunes deleted records accurately in MemoryMetadataCache', () => {
      const mem = new MemoryMetadataCache();
      mem.upsertFiles([
        { id: 'f1', name: 'keep.txt', trashed: false },
        { id: 'f2', name: 'deleted.txt', trashed: false },
        { id: 'f3', name: 'keep2.txt', trashed: false },
      ]);

      expect(mem.getStats().fileCount).toBe(3);

      const pruned = mem.pruneMissing(['f1', 'f3']);
      expect(pruned).toBe(1);
      expect(mem.getById('f2')).toBeNull();
      expect(mem.getById('f1')).toBeDefined();
      expect(mem.getById('f3')).toBeDefined();
    });

    it('prunes deleted records accurately in SqliteMetadataCache', () => {
      const sqlite = new SqliteMetadataCache(':memory:');
      sqlite.init();
      sqlite.upsertFiles([
        { id: 'f1', name: 'keep.txt', trashed: false },
        { id: 'f2', name: 'deleted.txt', trashed: false },
      ]);

      const pruned = sqlite.pruneMissing(['f1']);
      expect(pruned).toBe(1);
      expect(sqlite.getById('f2')).toBeNull();
      expect(sqlite.getById('f1')).toBeDefined();
      sqlite.close();
    });
  });

  describe('Plugin Lifecycle & Hardening', () => {
    it('prevents duplicate plugins by replacing older instances', () => {
      const pm = new PluginManager();
      pm.use({ name: 'p1' });
      pm.use({ name: 'p2' });
      pm.use({ name: 'p1' });

      expect(pm.getPlugins().length).toBe(2);
      expect(pm.has('p1')).toBe(true);
    });

    it('removes plugins cleanly via unuse()', () => {
      const pm = new PluginManager();
      pm.use({ name: 'audit' });
      expect(pm.has('audit')).toBe(true);

      const removed = pm.unuse('audit');
      expect(removed).toBe(true);
      expect(pm.has('audit')).toBe(false);

      const removedAgain = pm.unuse('audit');
      expect(removedAgain).toBe(false);
    });

    it('supports WebhookPlugin error handler on timeout / failure', async () => {
      let capturedError: Error | null = null;
      let capturedEvent = '';

      const webhook = createWebhookPlugin({
        url: 'http://127.0.0.1:59999/non-existent-endpoint',
        events: ['upload'],
        timeout: 200,
        retries: 0,
        onError: (err, event) => {
          capturedError = err;
          capturedEvent = event;
        },
      });

      const pm = new PluginManager();
      pm.use(webhook);

      await pm.runAfterUpload({
        id: '123',
        name: 'test.txt',
        mimeType: 'text/plain',
      });

      expect(capturedError).not.toBeNull();
      expect(capturedEvent).toBe('upload');
    });
  });
});
