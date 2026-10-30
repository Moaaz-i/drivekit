import { describe, it, expect } from 'vitest';
import { DriveQueryBuilder } from '../src/core/query-builder.js';

describe('DriveQueryBuilder', () => {
  it('builds complex chained query strings correctly', () => {
    // Mock drive client
    const mockDrive: any = {};
    const qb = new DriveQueryBuilder(mockDrive);

    qb.nameContains('invoice')
      .mimeType('application/pdf')
      .inFolder('folder_123')
      .notTrashed()
      .starred()
      .modifiedAfter('2026-01-01T00:00:00Z');

    const queryString = qb.toQueryString();

    expect(queryString).toContain("name contains 'invoice'");
    expect(queryString).toContain("mimeType = 'application/pdf'");
    expect(queryString).toContain("'folder_123' in parents");
    expect(queryString).toContain("trashed = false");
    expect(queryString).toContain("starred = true");
    expect(queryString).toContain("modifiedTime > '2026-01-01T00:00:00.000Z'");
  });

  it('handles quotes escaping safely', () => {
    const mockDrive: any = {};
    const qb = new DriveQueryBuilder(mockDrive);

    qb.nameEquals("John's Presentation");
    expect(qb.toQueryString()).toBe("name = 'John\\'s Presentation'");
  });
});

