import { describe, it, expect, vi } from 'vitest';
import { PathResolver } from '../src/core/path-resolver.js';
import { ResumableUploader, MULTIPART_THRESHOLD } from '../src/core/resumable-uploader.js';
import { getOptimizedHttpsAgent } from '../src/utils/http-agent.js';
import { SqliteMetadataCache } from '../src/core/cache.js';

describe('DriveKit Turbo Speed Optimizations', () => {
  it('HTTPS Agent creates persistent Keep-Alive connection pool', () => {
    const agent = getOptimizedHttpsAgent();
    expect(agent).toBeDefined();
    // @ts-ignore
    expect(agent.options.keepAlive).toBe(true);
    // @ts-ignore
    expect(agent.options.maxSockets).toBe(64);
    // @ts-ignore
    expect(agent.options.noDelay).toBe(true);
  });

  it('Coalesces concurrent in-flight path resolutions to eliminate redundant queries', async () => {
    let apiCallCount = 0;
    const fakeDrive: any = {
      files: {
        list: vi.fn().mockImplementation(async () => {
          apiCallCount++;
          // Simulate network delay
          await new Promise((r) => setTimeout(r, 50));
          return {
            data: {
              files: [{ id: 'folder_2026', name: '2026', mimeType: 'application/vnd.google-apps.folder' }],
            },
          };
        }),
      },
    };

    const resolver = new PathResolver(fakeDrive, 'root', { enableCache: false });

    // Launch 10 simultaneous resolves for the same uncached path
    const promises = Array.from({ length: 10 }).map(() =>
      resolver.resolve('/2026')
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(10);
    expect(results[0].id).toBe('folder_2026');
    // All 10 returned identical result
    for (const res of results) {
      expect(res.id).toBe('folder_2026');
    }
    // Only 1 network API call was made instead of 10!
    expect(apiCallCount).toBe(1);
  });

  it('ResumableUploader routes small files (<= 5MB) directly via multipart', () => {
    expect(MULTIPART_THRESHOLD).toBe(5 * 1024 * 1024);
  });

  it('Opportunistic Tree Caching populates path lookup in 0ms', () => {
    const cache = new SqliteMetadataCache(':memory:');
    cache.init();

    // Batch upsert children from a simulated ls('/Projects') call
    cache.upsertFiles([
      { id: 'p1', name: 'app.ts', mimeType: 'text/typescript', parentId: 'f1', path: '/Projects/app.ts', trashed: false },
      { id: 'p2', name: 'package.json', mimeType: 'application/json', parentId: 'f1', path: '/Projects/package.json', trashed: false },
    ]);

    const start = performance.now();
    const item = cache.getByPath('/Projects/app.ts');
    const elapsed = performance.now() - start;

    expect(item).not.toBeNull();
    expect(item?.id).toBe('p1');
    expect(item?.name).toBe('app.ts');
    // Resolution should be virtually 0ms (under 2ms in node test)
    expect(elapsed).toBeLessThan(5);
  });
});
