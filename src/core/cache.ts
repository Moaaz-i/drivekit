import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export interface CacheFileEntry {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  parentId?: string;
  path?: string;
  md5Checksum?: string;
  trashed: boolean;
  modifiedTime?: string;
  updatedAt?: number;
}

export interface CacheStats {
  fileCount: number;
  folderCount: number;
  totalSizeBytes: number;
  lastSyncTime: string | null;
  databasePath: string;
}

export interface IMetadataCache {
  init(): void;
  getById(id: string): CacheFileEntry | null;
  getByPath(normalizedPath: string): CacheFileEntry | null;
  getChildren(parentId: string): CacheFileEntry[];
  findByMd5(md5: string): CacheFileEntry | null;
  searchByName(query: string): CacheFileEntry[];
  upsertFile(entry: CacheFileEntry): void;
  upsertFiles(entries: CacheFileEntry[]): void;
  deleteFile(id: string): void;
  pruneMissing(activeIds: string[]): number;
  clear(): void;
  getMeta(key: string): string | null;
  setMeta(key: string, value: string): void;
  getStats(): CacheStats;
  close(): void;
}

/**
 * High-performance SQLite-backed persistent cache for DriveKit metadata.
 * Uses Node 22's built-in `node:sqlite` (DatabaseSync).
 */
export class SqliteMetadataCache implements IMetadataCache {
  private db: any = null;
  private dbPath: string;
  private initialized = false;
  private fallbackMemory?: MemoryMetadataCache;

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      const dir = path.join(os.homedir(), '.drivekit');
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {
          // fallback if home dir isn't writable
        }
      }
      this.dbPath = path.join(dir, 'cache.db');
    }
  }

  public init(): void {
    if (this.initialized) return;

    try {
      // Dynamic require so older environments or non-node runtimes don't fail parsing
      // @ts-ignore
      const { DatabaseSync } = require('node:sqlite');
      if (!DatabaseSync) {
        throw new Error('DatabaseSync not available');
      }
      this.db = new DatabaseSync(this.dbPath);

      // Initialize Schema & Indexes
      this.db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;

        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          mimeType TEXT,
          size INTEGER,
          parentId TEXT,
          path TEXT,
          md5Checksum TEXT,
          trashed INTEGER DEFAULT 0,
          modifiedTime TEXT,
          updatedAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
        CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parentId);
        CREATE INDEX IF NOT EXISTS idx_files_md5 ON files(md5Checksum);
        CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
      `);

      this.initialized = true;
    } catch (err) {
      // If node:sqlite is not available (Node < 22.5), transparently fallback to in-memory cache
      this.fallbackMemory = new MemoryMetadataCache();
      this.fallbackMemory.init();
      this.initialized = true;
      this.db = null;
    }
  }

  public getById(id: string): CacheFileEntry | null {
    if (this.fallbackMemory) return this.fallbackMemory.getById(id);
    if (!this.initialized || !this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM files WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRow(row) : null;
  }

  public getByPath(normalizedPath: string): CacheFileEntry | null {
    if (this.fallbackMemory) return this.fallbackMemory.getByPath(normalizedPath);
    if (!this.initialized || !this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM files WHERE path = ? AND trashed = 0 LIMIT 1');
    const row = stmt.get(normalizedPath);
    return row ? this.mapRow(row) : null;
  }

  public getChildren(parentId: string): CacheFileEntry[] {
    if (this.fallbackMemory) return this.fallbackMemory.getChildren(parentId);
    if (!this.initialized || !this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM files WHERE parentId = ? AND trashed = 0 ORDER BY name ASC');
    const rows = stmt.all(parentId);
    return rows.map((r: any) => this.mapRow(r));
  }

  public findByMd5(md5: string): CacheFileEntry | null {
    if (this.fallbackMemory) return this.fallbackMemory.findByMd5(md5);
    if (!this.initialized || !this.db || !md5) return null;
    const stmt = this.db.prepare('SELECT * FROM files WHERE md5Checksum = ? AND trashed = 0 LIMIT 1');
    const row = stmt.get(md5.toLowerCase());
    return row ? this.mapRow(row) : null;
  }

  public searchByName(query: string): CacheFileEntry[] {
    if (this.fallbackMemory) return this.fallbackMemory.searchByName(query);
    if (!this.initialized || !this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM files WHERE name LIKE ? AND trashed = 0 LIMIT 50');
    const rows = stmt.all(`%${query}%`);
    return rows.map((r: any) => this.mapRow(r));
  }

  public upsertFile(entry: CacheFileEntry): void {
    if (this.fallbackMemory) {
      this.fallbackMemory.upsertFile(entry);
      return;
    }
    if (!this.initialized || !this.db) return;
    const stmt = this.db.prepare(`
      INSERT INTO files (id, name, mimeType, size, parentId, path, md5Checksum, trashed, modifiedTime, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        mimeType = excluded.mimeType,
        size = excluded.size,
        parentId = excluded.parentId,
        path = COALESCE(excluded.path, files.path),
        md5Checksum = excluded.md5Checksum,
        trashed = excluded.trashed,
        modifiedTime = excluded.modifiedTime,
        updatedAt = excluded.updatedAt
    `);

    stmt.run(
      entry.id,
      entry.name,
      entry.mimeType ?? null,
      entry.size ?? null,
      entry.parentId ?? null,
      entry.path ?? null,
      entry.md5Checksum ? entry.md5Checksum.toLowerCase() : null,
      entry.trashed ? 1 : 0,
      entry.modifiedTime ?? null,
      entry.updatedAt ?? Date.now()
    );
  }

  public upsertFiles(entries: CacheFileEntry[]): void {
    if (this.fallbackMemory) {
      this.fallbackMemory.upsertFiles(entries);
      return;
    }
    if (!this.initialized || !this.db || entries.length === 0) return;

    // Prepare statement once for maximum bulk performance
    const stmt = this.db.prepare(`
      INSERT INTO files (id, name, mimeType, size, parentId, path, md5Checksum, trashed, modifiedTime, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        mimeType = excluded.mimeType,
        size = excluded.size,
        parentId = excluded.parentId,
        path = COALESCE(excluded.path, files.path),
        md5Checksum = excluded.md5Checksum,
        trashed = excluded.trashed,
        modifiedTime = excluded.modifiedTime,
        updatedAt = excluded.updatedAt
    `);

    // Execute inside a single transaction
    this.db.exec('BEGIN TRANSACTION;');
    try {
      for (const entry of entries) {
        stmt.run(
          entry.id,
          entry.name,
          entry.mimeType ?? null,
          entry.size ?? null,
          entry.parentId ?? null,
          entry.path ?? null,
          entry.md5Checksum ? entry.md5Checksum.toLowerCase() : null,
          entry.trashed ? 1 : 0,
          entry.modifiedTime ?? null,
          entry.updatedAt ?? Date.now()
        );
      }
      this.db.exec('COMMIT;');
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  public deleteFile(id: string): void {
    if (this.fallbackMemory) {
      this.fallbackMemory.deleteFile(id);
      return;
    }
    if (!this.initialized || !this.db) return;
    const stmt = this.db.prepare('DELETE FROM files WHERE id = ?');
    stmt.run(id);
  }

  public pruneMissing(activeIds: string[]): number {
    if (this.fallbackMemory) {
      return this.fallbackMemory.pruneMissing(activeIds);
    }
    if (!this.initialized || !this.db || activeIds.length === 0) return 0;
    const idSet = new Set(activeIds);
    const rows = this.db.prepare('SELECT id FROM files').all();
    let pruned = 0;
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const deleteStmt = this.db.prepare('DELETE FROM files WHERE id = ?');
      for (const row of rows) {
        if (!idSet.has(row.id)) {
          deleteStmt.run(row.id);
          pruned++;
        }
      }
      this.db.exec('COMMIT;');
      return pruned;
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  public clear(): void {
    if (this.fallbackMemory) {
      this.fallbackMemory.clear();
      return;
    }
    if (!this.initialized || !this.db) return;
    this.db.exec('DELETE FROM files; DELETE FROM meta;');
  }

  public getMeta(key: string): string | null {
    if (this.fallbackMemory) return this.fallbackMemory.getMeta(key);
    if (!this.initialized || !this.db) return null;
    const stmt = this.db.prepare('SELECT value FROM meta WHERE key = ?');
    const row = stmt.get(key);
    return row ? (row as any).value : null;
  }

  public setMeta(key: string, value: string): void {
    if (this.fallbackMemory) {
      this.fallbackMemory.setMeta(key, value);
      return;
    }
    if (!this.initialized || !this.db) return;
    const stmt = this.db.prepare(`
      INSERT INTO meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, value);
  }

  public getStats(): CacheStats {
    if (this.fallbackMemory) return this.fallbackMemory.getStats();
    if (!this.initialized || !this.db) {
      return {
        fileCount: 0,
        folderCount: 0,
        totalSizeBytes: 0,
        lastSyncTime: null,
        databasePath: this.dbPath,
      };
    }

    const fileCountRow: any = this.db.prepare(
      "SELECT COUNT(*) as count FROM files WHERE mimeType != 'application/vnd.google-apps.folder' AND trashed = 0"
    ).get();

    const folderCountRow: any = this.db.prepare(
      "SELECT COUNT(*) as count FROM files WHERE mimeType = 'application/vnd.google-apps.folder' AND trashed = 0"
    ).get();

    const totalSizeRow: any = this.db.prepare(
      'SELECT SUM(size) as total FROM files WHERE trashed = 0'
    ).get();

    const lastSync = this.getMeta('last_sync_timestamp');

    return {
      fileCount: fileCountRow?.count || 0,
      folderCount: folderCountRow?.count || 0,
      totalSizeBytes: totalSizeRow?.total || 0,
      lastSyncTime: lastSync,
      databasePath: this.dbPath,
    };
  }

  public close(): void {
    if (this.fallbackMemory) {
      this.fallbackMemory.close();
      this.fallbackMemory = undefined;
    }
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // ignore
      }
      this.initialized = false;
      this.db = null;
    }
  }

  private mapRow(row: any): CacheFileEntry {
    return {
      id: row.id,
      name: row.name,
      mimeType: row.mimeType,
      size: row.size != null ? Number(row.size) : undefined,
      parentId: row.parentId || undefined,
      path: row.path || undefined,
      md5Checksum: row.md5Checksum || undefined,
      trashed: row.trashed === 1,
      modifiedTime: row.modifiedTime || undefined,
      updatedAt: row.updatedAt != null ? Number(row.updatedAt) : undefined,
    };
  }
}

/**
 * Fallback in-memory cache if SQLite is unavailable
 */
export class MemoryMetadataCache implements IMetadataCache {
  private files = new Map<string, CacheFileEntry>();
  private meta = new Map<string, string>();

  public init(): void {}
  public getById(id: string): CacheFileEntry | null {
    return this.files.get(id) || null;
  }
  public getByPath(normalizedPath: string): CacheFileEntry | null {
    for (const f of this.files.values()) {
      if (f.path === normalizedPath && !f.trashed) return f;
    }
    return null;
  }
  public getChildren(parentId: string): CacheFileEntry[] {
    const list: CacheFileEntry[] = [];
    for (const f of this.files.values()) {
      if (f.parentId === parentId && !f.trashed) list.push(f);
    }
    return list;
  }
  public findByMd5(md5: string): CacheFileEntry | null {
    const target = md5.toLowerCase();
    for (const f of this.files.values()) {
      if (f.md5Checksum?.toLowerCase() === target && !f.trashed) return f;
    }
    return null;
  }
  public searchByName(query: string): CacheFileEntry[] {
    const q = query.toLowerCase();
    const list: CacheFileEntry[] = [];
    for (const f of this.files.values()) {
      if (f.name.toLowerCase().includes(q) && !f.trashed) list.push(f);
    }
    return list;
  }
  public upsertFile(entry: CacheFileEntry): void {
    this.files.set(entry.id, { ...entry, updatedAt: Date.now() });
  }
  public upsertFiles(entries: CacheFileEntry[]): void {
    for (const e of entries) this.upsertFile(e);
  }
  public deleteFile(id: string): void {
    this.files.delete(id);
  }
  public pruneMissing(activeIds: string[]): number {
    const idSet = new Set(activeIds);
    let pruned = 0;
    for (const id of Array.from(this.files.keys())) {
      if (!idSet.has(id)) {
        this.files.delete(id);
        pruned++;
      }
    }
    return pruned;
  }
  public clear(): void {
    this.files.clear();
    this.meta.clear();
  }
  public getMeta(key: string): string | null {
    return this.meta.get(key) || null;
  }
  public setMeta(key: string, value: string): void {
    this.meta.set(key, value);
  }
  public getStats(): CacheStats {
    let fileCount = 0;
    let folderCount = 0;
    let totalSizeBytes = 0;
    for (const f of this.files.values()) {
      if (f.trashed) continue;
      if (f.mimeType === 'application/vnd.google-apps.folder') folderCount++;
      else {
        fileCount++;
        totalSizeBytes += f.size || 0;
      }
    }
    return {
      fileCount,
      folderCount,
      totalSizeBytes,
      lastSyncTime: this.meta.get('last_sync_timestamp') || null,
      databasePath: ':memory:',
    };
  }
  public close(): void {
    this.clear();
  }
}

