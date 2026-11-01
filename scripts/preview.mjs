// Production-shaped preview: serves dist/ with the status codes a real host must return.
// Unknown paths get the app shell with a 404, so crawlers and audits see a true not-found
// instead of a soft 200. `npm run build && npm run preview`.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.env.PREVIEW_PORT || process.env.FRONTEND_PORT || 4173);
const apiTarget = process.env.API_PROXY_TARGET || `http://127.0.0.1:${process.env.API_PORT || 3002}`;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

// Routes the client owns. Anything else is a genuine miss.
const known = ['/', '/login', '/patient', '/doctor', '/admin', '/pharmacy'];
const isKnownRoute = (url) => url === '/' || known.some((r) => url === r || url.startsWith(`${r}/`));

const readBody = (request) => new Promise((resolve, reject) => {
  const chunks = [];
  request.on('data', (chunk) => chunks.push(chunk));
  request.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
  request.on('error', reject);
});

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname.startsWith('/api')) {
      const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await readBody(request);
      const upstream = await fetch(apiTarget + pathname + url.search, {
        method: request.method,
        headers: { 'content-type': 'application/json', ...(request.headers.cookie ? { cookie: request.headers.cookie } : {}) },
        body,
      }).catch(() => null);
      if (!upstream) { response.writeHead(502, { 'content-type': 'application/json' }); return response.end('{"error":"api_unreachable"}'); }
      const headers = { 'content-type': upstream.headers.get('content-type') ?? 'application/json' };
      const cookies = upstream.headers.getSetCookie();
      if (cookies.length) headers['set-cookie'] = cookies;
      response.writeHead(upstream.status, headers);
      return response.end(Buffer.from(await upstream.arrayBuffer()));
    }
  } catch {
    response.writeHead(502, { 'content-type': 'application/json' });
    return response.end('{"error":"api_proxy_failed"}');
  }

  const file = path.join(root, pathname);
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    response.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
    return fs.createReadStream(file).pipe(response);
  }

  const shell = path.join(root, 'index.html');
  if (!fs.existsSync(shell)) { response.writeHead(500).end('Run npm run build first.'); return; }
  response.writeHead(isKnownRoute(pathname) ? 200 : 404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
  fs.createReadStream(shell).pipe(response);
});

server.listen(port, '127.0.0.1', () => console.log(`preview: http://127.0.0.1:${port}  (api proxy → ${apiTarget})`));
