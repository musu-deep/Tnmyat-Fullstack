import http from 'node:http';
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './database.js';
import worker from './worker.js';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.jpg':'image/jpeg'};
const env = {
  DB: openDatabase(),
  ASSETS: { async fetch(request) {
    const path = new URL(request.url).pathname;
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(resolve(root) + sep)) return new Response(null, { status: 404 });
    try {
      const data = await readFile(file);
      return new Response(data, {headers: {'Content-Type': types[extname(file)] || 'application/octet-stream'}});
    } catch { return new Response(null, {status: 404}); }
  }}
};
const {values: cli} = parseArgs({options:{strictPort:{type:'boolean'},port:{type:'string'},host:{type:'string'}}});
const port = Number(cli.port ?? process.env.PORT ?? 3000);
const host = cli.host || process.env.HOST || '127.0.0.1';
const server = http.createServer(async (req, res) => {
  try {
    const origin = process.env.PUBLIC_ORIGIN || 'http://' + req.headers.host;
    const url = new URL(req.url, origin);
    if (url.origin !== new URL(origin).origin) { res.writeHead(400).end(); return; }
    const largePost = (req.method==='POST' && url.pathname==='/api/posts') ||
      (req.method==='PATCH' && /^\/api\/posts\/\d+$/.test(url.pathname));
    const maxBytes = largePost ? 14*1024*1024 : 400*1024;
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > maxBytes) { res.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(name, value);
    }
    headers.set('CF-Connecting-IP', req.socket.remoteAddress || 'local');
    const method = req.method;
    const body = ['GET','HEAD'].includes(method) ? undefined : Buffer.concat(chunks);
    const response = await worker.fetch(new Request(url, {method, headers, body}), env);
    res.writeHead(response.status, {...Object.fromEntries(response.headers), 'x-content-type-options':'nosniff'});
    res.end(method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error.name);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
server.listen(port, host, () => console.log('Tnmyat listening on http://' + host + ':' + server.address().port));
