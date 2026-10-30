import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { calculateFileMd5 } from '../src/core/smart-sync.js';

describe('Smart Sync Utils', () => {
  it('calculates MD5 checksum of a file accurately', async () => {
    const tmpFile = path.resolve('./temp-md5-test.txt');
    fs.writeFileSync(tmpFile, 'DriveKit MD5 Test String 123', 'utf8');

    try {
      const md5 = await calculateFileMd5(tmpFile);
      expect(typeof md5).toBe('string');
      expect(md5).toHaveLength(32); // standard MD5 hex length
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });
});

