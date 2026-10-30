import type { drive_v3 } from '@googleapis/drive';
import type { DriveApiFile } from '../types.js';
import { withRetry } from '../utils/retry.js';
import { formatBytes } from '../utils/format.js';

export interface DuplicateGroup {
  name: string;
  count: number;
  totalSize: number;
  formattedTotalSize: string;
  files: { id: string; name: string; size: number; modifiedTime: string; md5Checksum?: string }[];
}

export class StorageCleaner {
  private drive: drive_v3.Drive;

  constructor(drive: drive_v3.Drive) {
    this.drive = drive;
  }

  /**
   * Finds the largest files occupying space in the Google Drive account
   */
  async findLargestFiles(limit = 10): Promise<{
    id: string;
    name: string;
    size: number;
    formattedSize: string;
    mimeType: string;
    modifiedTime?: string;
    webViewLink?: string;
  }[]> {
    const res = await withRetry(async () => {
      return await this.drive.files.list({
        q: 'trashed = false and mimeType != "application/vnd.google-apps.folder"',
        orderBy: 'quotaBytesUsed desc',
        pageSize: Math.min(100, Math.max(1, limit)),
        fields: 'files(id, name, size, mimeType, modifiedTime, webViewLink, quotaBytesUsed)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
    });

    const files = res.data.files || [];
    return files.map((f) => {
      const sizeBytes = parseInt(f.size || f.quotaBytesUsed || '0', 10);
      return {
        id: f.id!,
        name: f.name || 'untitled',
        size: sizeBytes,
        formattedSize: formatBytes(sizeBytes),
        mimeType: f.mimeType || 'unknown',
        modifiedTime: f.modifiedTime || undefined,
        webViewLink: f.webViewLink || undefined,
      };
    });
  }

  /**
   * Scans Google Drive and detects duplicate files (by MD5 hash or exact name)
   */
  async findDuplicates(options: { by?: 'md5' | 'name'; maxScan?: number } = {}): Promise<DuplicateGroup[]> {
    const mode = options.by || 'name';
    const maxScan = options.maxScan || 1000;

    const res = await withRetry(async () => {
      return await this.drive.files.list({
        q: 'trashed = false and mimeType != "application/vnd.google-apps.folder"',
        pageSize: Math.min(1000, maxScan),
        fields: 'files(id, name, size, md5Checksum, modifiedTime)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
    });

    const files = res.data.files || [];
    const map = new Map<string, any[]>();

    for (const f of files) {
      if (!f.id) continue;
      const key = mode === 'md5' && f.md5Checksum ? f.md5Checksum : (f.name || '');
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(f);
    }

    const duplicates: DuplicateGroup[] = [];
    for (const [key, group] of map.entries()) {
      if (group.length > 1) {
        let totalSize = 0;
        const mappedFiles = group.map((item) => {
          const s = parseInt(item.size || '0', 10);
          totalSize += s;
          return {
            id: item.id,
            name: item.name,
            size: s,
            modifiedTime: item.modifiedTime,
            md5Checksum: item.md5Checksum,
          };
        });

        duplicates.push({
          name: key,
          count: group.length,
          totalSize,
          formattedTotalSize: formatBytes(totalSize),
          files: mappedFiles,
        });
      }
    }

    return duplicates.sort((a, b) => b.totalSize - a.totalSize);
  }

  /**
   * Empties the entire trash in Google Drive
   */
  async emptyTrash(): Promise<void> {
    await withRetry(async () => {
      await this.drive.files.emptyTrash({});
    });
  }
}

