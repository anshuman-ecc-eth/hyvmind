import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public', 'assets', 'hyvmind');

function send(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let b = '';
  for await (const chunk of req) b += chunk;
  return JSON.parse(b);
}

http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/save-collision') {
      const { pixels, w, h } = await readBody(req);
      const tmp = path.join(DIR, '_raw.dat');
      const buf = Buffer.alloc(pixels.length);
      for (let i = 0; i < pixels.length; i++) buf.writeUInt8(pixels[i], i);
      fs.writeFileSync(tmp, buf);
      const py = spawnSync('python3', ['-c', `
from PIL import Image
import sys
w, h = ${w}, ${h}
raw = open('${tmp}', 'rb').read()
img = Image.frombytes('RGBA', (w, h), raw)
img.save('${path.join(DIR, 'collision.png')}')
`]);
      fs.unlinkSync(tmp);
      if (py.status !== 0) throw new Error('PIL conversion failed: ' + py.stderr.toString());
      send(res, 200, { ok: true });
    } else if (req.method === 'POST' && req.url === '/save-triggers') {
      const data = await readBody(req);
      fs.writeFileSync(path.join(DIR, 'triggers.json'), JSON.stringify(data));
      send(res, 200, { ok: true });
    } else if (req.method === 'POST' && req.url === '/save-doors') {
      const data = await readBody(req);
      fs.writeFileSync(path.join(DIR, 'doors.json'), JSON.stringify(data));
      send(res, 200, { ok: true });
    } else if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      res.end();
    } else {
      send(res, 404, { error: 'not found' });
    }
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}).listen(8080, () => console.log('Save server running on :8080'));
