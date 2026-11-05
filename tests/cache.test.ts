import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteMetadataCache, MemoryMetadataCache } from '../src/core/cache.js';

describe('SqliteMetadataCache', () => {
  let cache: SqliteMetadataCache;

  beforeEach(() => {
    cache = new SqliteMetadataCache(':memory:');
    cache.init();
  });

  afterEach(() => {
    cache.close();
  });

  it('correctly initializes, upserts, and retrieves a file by ID and path', () => {
    cache.upsertFile({
      id: 'file_123',
      name: 'database.sql',
      mimeType: 'application/sql',
      size: 1048576,
      parentId: 'folder_root',
      path: '/Backups/database.sql',
      md5Checksum: 'd41d8cd98f00b204e9800998ecf8427e',
      trashed: false,
    });

    const byId = cache.getById('file_123');
    expect(byId).toBeDefined();
    expect(byId?.name).toBe('database.sql');
    expect(byId?.size).toBe(1048576);

    const byPath = cache.getByPath('/Backups/database.sql');
    expect(byPath).toBeDefined();
    expect(byPath?.id).toBe('file_123');

    const byMd5 = cache.findByMd5('D41D8CD98F00B204E9800998ECF8427E');
    expect(byMd5).toBeDefined();
    expect(byMd5?.id).toBe('file_123');
  });

  it('correctly retrieves child files for a parent folder', () => {
    cache.upsertFiles([
      { id: 'f1', name: 'a.txt', mimeType: 'text/plain', parentId: 'p1', trashed: false },
      { id: 'f2', name: 'b.txt', mimeType: 'text/plain', parentId: 'p1', trashed: false },
      { id: 'f3', name: 'c.txt', mimeType: 'text/plain', parentId: 'p2', trashed: false },
    ]);

    const children = cache.getChildren('p1');
    expect(children.length).toBe(2);
    expect(children.map((c) => c.name)).toEqual(['a.txt', 'b.txt']);
  });

  it('calculates accurate cache statistics', () => {
    cache.upsertFiles([
      { id: 'dir1', name: 'Docs', mimeType: 'application/vnd.google-apps.folder', trashed: false },
      { id: 'doc1', name: 'report.pdf', mimeType: 'application/pdf', size: 5000, trashed: false },
    ]);

    const stats = cache.getStats();
    expect(stats.folderCount).toBe(1);
    expect(stats.fileCount).toBe(1);
    expect(stats.totalSizeBytes).toBe(5000);
  });
});

describe('MemoryMetadataCache (Fallback)', () => {
  it('supports basic CRUD and querying', () => {
    const mem = new MemoryMetadataCache();
    mem.upsertFile({
      id: 'm1',
      name: 'notes.txt',
      mimeType: 'text/plain',
      path: '/notes.txt',
      md5Checksum: 'abc',
      trashed: false,
    });

    expect(mem.getById('m1')?.name).toBe('notes.txt');
    expect(mem.getByPath('/notes.txt')?.id).toBe('m1');
    expect(mem.findByMd5('ABC')?.id).toBe('m1');
  });
});

