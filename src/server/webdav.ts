import http from 'node:http';
import url from 'node:url';
import path from 'node:path';
import type { DriveKit } from '../core/client.js';
import type { DriveApiFile } from '../types.js';

export interface WebDAVServerOptions {
  port?: number;
  host?: string;
  auth?: {
    username?: string;
    password?: string;
  };
}

/**
 * Escapes unsafe characters for valid XML output
 */
export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Creates and starts a production-grade, zero-dependency WebDAV server for DriveKit.
 * Supports HTTP Basic Authentication, Streaming PUT (Zero-Buffer), Range requests, MOVE, COPY, and MKCOL.
 */
export async function startWebDAVServer(
  drive: DriveKit,
  options: WebDAVServerOptions = {}
): Promise<{ server: http.Server; url: string; close: () => Promise<void> }> {
  const port = options.port || 8080;
  const host = options.host || '127.0.0.1';

  await drive.init();

  const server = http.createServer(async (req, res) => {
    try {
      // 1. Basic Authentication Verification (P0 Security)
      if (options.auth?.username && options.auth?.password) {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          res.writeHead(401, {
            'WWW-Authenticate': 'Basic realm="DriveKit WebDAV"',
            'Content-Type': 'text/plain',
          });
          res.end('Authentication required');
          return;
        }

        const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf8');
        const [user, pass] = credentials.split(':');
        if (user !== options.auth.username || pass !== options.auth.password) {
          res.writeHead(401, {
            'WWW-Authenticate': 'Basic realm="DriveKit WebDAV"',
            'Content-Type': 'text/plain',
          });
          res.end('Invalid credentials');
          return;
        }
      }

      const parsedUrl = url.parse(req.url || '/', true);
      const decodedPath = decodeURIComponent(parsedUrl.pathname || '/');
      const virtualPath = decodedPath === '' ? '/' : decodedPath;

      // Fast-reject macOS OS noise files to keep Finder ultra fast and prevent API spam
      const baseName = path.basename(virtualPath);
      if (
        baseName.startsWith('._') ||
        baseName === '.DS_Store' ||
        baseName === '.Trashes' ||
        baseName === '.Spotlight-V100' ||
        baseName === '.fseventsd'
      ) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      // 2. Handle WebDAV HTTP Verbs
      switch (req.method) {
        case 'OPTIONS': {
          res.writeHead(200, {
            DAV: '1, 2',
            Allow: 'OPTIONS, GET, HEAD, POST, PUT, DELETE, MKCOL, MOVE, COPY, PROPFIND',
            'MS-Author-Via': 'DAV',
            'Accept-Ranges': 'bytes',
          });
          res.end();
          return;
        }

        case 'PROPFIND': {
          const depth = req.headers['depth'] || '1';
          const xml = await handlePropfind(drive, virtualPath, depth as string);
          if (xml === null) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          res.writeHead(207, {
            'Content-Type': 'application/xml; charset=utf-8',
          });
          res.end(xml);
          return;
        }

        case 'GET':
        case 'HEAD': {
          if (virtualPath === '/' || virtualPath === '') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>DriveKit WebDAV Server Running</h1><p>Connect via Finder, File Explorer, or WebDAV client.</p>');
            return;
          }

          try {
            const file = await drive.getFile(virtualPath);
            if (file.mimeType === 'application/vnd.google-apps.folder') {
              res.writeHead(405, { 'Content-Type': 'text/plain' });
              res.end('Cannot GET a directory');
              return;
            }

            const fileSize = file.size ? parseInt(file.size, 10) : undefined;
            const rangeHeader = req.headers['range'];

            // Handle HTTP 206 Partial Content if Range header is present
            if (rangeHeader && rangeHeader.startsWith('bytes=') && fileSize !== undefined) {
              const parts = rangeHeader.replace('bytes=', '').split('-');
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

              if (isNaN(start) || start >= fileSize || (end !== undefined && end >= fileSize)) {
                res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
                res.end();
                return;
              }

              const stream = await drive.createReadStream(virtualPath, { start, end });
              const chunkLength = end - start + 1;

              res.writeHead(206, {
                'Content-Type': file.mimeType || 'application/octet-stream',
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': chunkLength,
                'Accept-Ranges': 'bytes',
              });

              if (req.method === 'HEAD') {
                res.end();
              } else {
                stream.pipe(res);
              }
            } else {
              const stream = await drive.createReadStream(virtualPath);
              res.writeHead(200, {
                'Content-Type': file.mimeType || 'application/octet-stream',
                'Content-Length': file.size || undefined,
                'Accept-Ranges': 'bytes',
              });

              if (req.method === 'HEAD') {
                res.end();
              } else {
                stream.pipe(res);
              }
            }
          } catch (e: any) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File Not Found');
          }
          return;
        }

        case 'PUT': {
          // Zero-Buffer Streaming Upload
          const remoteDir = path.dirname(virtualPath);
          await drive.mkdirp(remoteDir);

          let existed = false;
          try {
            const existingFile = await drive.getFile(virtualPath);
            if (existingFile && existingFile.id) {
              existed = true;
            }
          } catch {
            existed = false;
          }

          try {
            const uploadStream = await drive.createWriteStream(virtualPath, {
              overwrite: true,
            });

            req.pipe(uploadStream);
            await uploadStream.done;

            res.writeHead(existed ? 204 : 201, { 'Content-Type': 'text/plain' });
            res.end(existed ? '' : 'Created');
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(err.message || 'Upload failed');
          }
          return;
        }

        case 'MKCOL': {
          // Create directory
          try {
            await drive.mkdirp(virtualPath);
            res.writeHead(201, { 'Content-Type': 'text/plain' });
            res.end('Collection Created');
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(err.message);
          }
          return;
        }

        case 'DELETE': {
          try {
            await drive.delete(virtualPath, true);
            res.writeHead(204);
            res.end();
          } catch (err: any) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
          return;
        }

        case 'MOVE': {
          const destination = req.headers['destination'];
          if (!destination || typeof destination !== 'string') {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Destination header missing');
            return;
          }

          try {
            const file = await drive.getFile(virtualPath);
            if (!file?.id) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Source file not found');
              return;
            }
            const destUrl = url.parse(destination);
            const destPath = decodeURIComponent(destUrl.pathname || '');
            const newName = path.basename(destPath);
            const newParentDir = path.dirname(destPath);
            const newParentFolderId = await drive.mkdirp(newParentDir);

            const currentParentDir = path.dirname(virtualPath);
            if (newParentDir !== currentParentDir) {
              await drive.move(file.id, newParentFolderId);
            }
            if (newName !== path.basename(virtualPath)) {
              await drive.rename(file.id, newName);
            }
            res.writeHead(201);
            res.end('Moved');
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(err.message);
          }
          return;
        }

        case 'COPY': {
          const destination = req.headers['destination'];
          if (!destination || typeof destination !== 'string') {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Destination header missing');
            return;
          }

          try {
            const file = await drive.getFile(virtualPath);
            if (!file?.id) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Source file not found');
              return;
            }
            const destUrl = url.parse(destination);
            const destPath = decodeURIComponent(destUrl.pathname || '');
            const newName = path.basename(destPath);
            const newParentDir = path.dirname(destPath);
            const newParentFolderId = await drive.mkdirp(newParentDir);

            await drive.copy(file.id, { parent: newParentFolderId, name: newName });
            res.writeHead(201);
            res.end('Copied');
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(err.message);
          }
          return;
        }

        default: {
          res.writeHead(501, { 'Content-Type': 'text/plain' });
          res.end('Method Not Implemented');
        }
      }
    } catch (globalErr: any) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal Server Error: ${globalErr.message}`);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const serverUrl = `http://${host}:${port}`;
      resolve({
        server,
        url: serverUrl,
        close: () => new Promise<void>((resClose) => server.close(() => resClose())),
      });
    });
  });
}

/**
 * Generates RFC 4918 multistatus XML response for PROPFIND
 */
async function handlePropfind(drive: DriveKit, virtualPath: string, depth: string): Promise<string | null> {
  const responses: string[] = [];

  let isFolder = false;
  let selfItem: DriveApiFile | null = null;

  if (virtualPath === '/' || virtualPath === '') {
    isFolder = true;
    responses.push(renderWebDAVResponse('/', true, 0, new Date().toISOString()));
  } else {
    try {
      selfItem = await drive.getFile(virtualPath);
      isFolder = selfItem.mimeType === 'application/vnd.google-apps.folder';
      responses.push(
        renderWebDAVResponse(
          virtualPath,
          isFolder,
          selfItem.size ? parseInt(selfItem.size, 10) : 0,
          selfItem.modifiedTime || new Date().toISOString(),
          selfItem.mimeType || undefined
        )
      );
    } catch {
      return null;
    }
  }

  // If directory and depth != 0, include children
  if (isFolder && depth !== '0') {
    try {
      const children = await drive.ls(virtualPath);
      const seenNames = new Map<string, number>();

      for (const child of children) {
        let childName = child.name || 'untitled';
        if (seenNames.has(childName)) {
          const count = seenNames.get(childName)! + 1;
          seenNames.set(childName, count);
          const ext = path.extname(childName);
          const base = path.basename(childName, ext);
          childName = `${base} (${count})${ext}`;
        } else {
          seenNames.set(childName, 0);
        }

        const childIsFolder = child.mimeType === 'application/vnd.google-apps.folder';
        const childPath = virtualPath === '/' ? `/${childName}` : `${virtualPath}/${childName}`;
        responses.push(
          renderWebDAVResponse(
            childPath,
            childIsFolder,
            child.size ? parseInt(child.size, 10) : 0,
            child.modifiedTime || new Date().toISOString(),
            child.mimeType || undefined
          )
        );
      }
    } catch {
      // ignore
    }
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${responses.join('\n')}
</D:multistatus>`;
}

function renderWebDAVResponse(
  href: string,
  isDir: boolean,
  size: number,
  modifiedTime: string,
  mimeType?: string
): string {
  let cleanHref = href;
  if (isDir && !cleanHref.endsWith('/')) {
    cleanHref += '/';
  }
  const encodedHref = encodeURI(cleanHref);
  const displayName = escapeXml(path.basename(href) || 'root');
  const resourceType = isDir ? '<D:collection/>' : '';
  const dateFormatted = new Date(modifiedTime).toUTCString();
  const contentTypeTag = !isDir && mimeType ? `\n        <D:getcontenttype>${escapeXml(mimeType)}</D:getcontenttype>` : '';

  return `  <D:response>
    <D:href>${encodedHref}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${displayName}</D:displayname>
        <D:resourcetype>${resourceType}</D:resourcetype>
        <D:getcontentlength>${isDir ? '0' : size}</D:getcontentlength>
        <D:getlastmodified>${dateFormatted}</D:getlastmodified>${contentTypeTag}
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
}
