import { describe, it, expect } from 'vitest';
import { PathResolver } from '../src/core/path-resolver.js';

describe('PathResolver', () => {
  it('normalizes paths properly', () => {
    const mockDrive: any = {};
    const resolver = new PathResolver(mockDrive);

    expect(resolver.normalizePath('')).toBe('/');
    expect(resolver.normalizePath('/')).toBe('/');
    expect(resolver.normalizePath('///Projects//2026/')).toBe('/Projects/2026');
    expect(resolver.normalizePath('file.txt')).toBe('/file.txt');
  });
});

