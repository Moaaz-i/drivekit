import path from 'node:path';
import mime from 'mime-types';

/**
 * Standard Google Workspace MIME types
 */
export const GOOGLE_WORKSPACE_MIME_TYPES = {
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  DRAWING: 'application/vnd.google-apps.drawing',
  FORM: 'application/vnd.google-apps.form',
  SCRIPT: 'application/vnd.google-apps.script',
  FOLDER: 'application/vnd.google-apps.folder',
  SHORTCUT: 'application/vnd.google-apps.shortcut',
} as const;

/**
 * Default export MIME types for Google Docs, Sheets, Slides
 */
export const DEFAULT_EXPORT_MIMES: Record<string, { mimeType: string; extension: string }> = {
  [GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT]: {
    mimeType: 'application/pdf',
    extension: '.pdf',
  },
  [GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET]: {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: '.xlsx',
  },
  [GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION]: {
    mimeType: 'application/pdf',
    extension: '.pdf',
  },
  [GOOGLE_WORKSPACE_MIME_TYPES.DRAWING]: {
    mimeType: 'image/png',
    extension: '.png',
  },
};

/**
 * Detects MIME type from file path or fallback to octet-stream
 */
export function lookupMimeType(filePath: string): string {
  const detected = mime.lookup(filePath);
  return detected || 'application/octet-stream';
}

/**
 * Returns extension for a given MIME type
 */
export function getExtensionForMime(mimeType: string): string {
  const ext = mime.extension(mimeType);
  return ext ? `.${ext}` : '';
}

/**
 * Checks if a MIME type is a native Google Workspace format
 */
export function isGoogleWorkspaceDoc(mimeType?: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('application/vnd.google-apps.') &&
    mimeType !== GOOGLE_WORKSPACE_MIME_TYPES.FOLDER &&
    mimeType !== GOOGLE_WORKSPACE_MIME_TYPES.SHORTCUT;
}

