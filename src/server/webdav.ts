import http from 'node:http';
import url from 'node:url';
import path from 'node:path';
import type { DriveKit } from '../core/client.js';
import type { DriveApiFile } from '../types.js';

export interface WebDAVServerOptions {
  port?: number;
  host?: string;
}

/**
 * Creates and starts a lightweight zero-dependency WebDAV server for DriveKit.
 * Allows mounting Google Drive directly in macOS Finder, Windows Explorer, or Linux.
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
      const parsedUrl = url.parse(req.url || '/', true);
      const decodedPath = decodeURIComponent(parsedUrl.pathname || '/');
      const virtualPath = decodedPath === '' ? '/' : decodedPath;

      // Handle WebDAV HTTP Verbs
      switch (req.method) {
        case 'OPTIONS': {
          res.writeHead(200, {
            DAV: '1, 2',
            Allow: 'OPTIONS, GET, HEAD, POST, PUT, DELETE, MKCOL, MOVE, COPY, PROPFIND',
            'MS-Author-Via': 'DAV',
          });
          res.end();
          return;
        }

        case 'PROPFIND': {
          const depth = req.headers['depth'] || '1';
          const xml = await handlePropfind(drive, virtualPath, depth as string);
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
            res.end('<h1>DriveKit WebDAV Server Running</h1><p>Connect via Finder or WebDAV client.</p>');
            return;
          }

          try {
            const file = await drive.getFile(virtualPath);
            if (file.mimeType === 'application/vnd.google-apps.folder') {
              res.writeHead(405, { 'Content-Type': 'text/plain' });
              res.end('Cannot GET a directory');
              return;
            }

            const stream = await drive.createReadStream(virtualPath);
            res.writeHead(200, {
              'Content-Type': file.mimeType || 'application/octet-stream',
              'Content-Length': file.size || undefined,
            });

            if (req.method === 'HEAD') {
              res.end();
            } else {
              stream.pipe(res);
            }
          } catch (e: any) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File Not Found');
          }
          return;
        }

        case 'PUT': {
          // Upload file
          const remoteDir = path.dirname(virtualPath);
          const fileName = path.basename(virtualPath);
          await drive.mkdirp(remoteDir);

          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              await drive.upload({
                source: buffer,
                filename: fileName,
                parent: remoteDir,
                overwrite: true,
              });
              res.writeHead(201, { 'Content-Type': 'text/plain' });
              res.end('Created');
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end(err.message || 'Upload failed');
            }
          });
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
          const destUrl = url.parse(destination);
          const destPath = decodeURIComponent(destUrl.pathname || '');
          const newName = path.basename(destPath);
          const newParent = path.dirname(destPath);

          try {
            await drive.move(virtualPath, newParent);
            if (newName !== path.basename(virtualPath)) {
              await drive.rename(destPath, newName);
            }
            res.writeHead(201);
            res.end('Moved');
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
async function handlePropfind(drive: DriveKit, virtualPath: string, depth: string): Promise<string> {
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
          selfItem.modifiedTime || new Date().toISOString()
        )
      );
    } catch {
      return `<?xml version="1.0" encoding="utf-8"?><D:multistatus xmlns:D="DAV:"></D:multistatus>`;
    }
  }

  // If directory and depth != 0, include children
  if (isFolder && depth !== '0') {
    try {
      const children = await drive.ls(virtualPath);
      for (const child of children) {
        const childIsFolder = child.mimeType === 'application/vnd.google-apps.folder';
        const childPath = virtualPath === '/' ? `/${child.name}` : `${virtualPath}/${child.name}`;
        responses.push(
          renderWebDAVResponse(
            childPath,
            childIsFolder,
            child.size ? parseInt(child.size, 10) : 0,
            child.modifiedTime || new Date().toISOString()
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

function renderWebDAVResponse(href: string, isDir: boolean, size: number, modifiedTime: string): string {
  const encodedHref = encodeURI(href);
  const resourceType = isDir ? '<D:collection/>' : '';
  const dateFormatted = new Date(modifiedTime).toUTCString();

  return `  <D:response>
    <D:href>${encodedHref}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${path.basename(href) || 'root'}</D:displayname>
        <D:resourcetype>${resourceType}</D:resourcetype>
        <D:getcontentlength>${isDir ? '0' : size}</D:getcontentlength>
        <D:getlastmodified>${dateFormatted}</D:getlastmodified>
        <D:status>HTTP/1.1 200 OK</D:status>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
}

