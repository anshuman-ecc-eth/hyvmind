import http.server
import os
import json

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_POST(self):
        length = int(self.headers['Content-Length'])
        body = self.rfile.read(length)

        if self.path == '/save-collision':
            data = json.loads(body.decode('utf-8'))
            pixels = data.get('pixels')
            w = data.get('w', 68)
            h = data.get('h', 60)
            import struct, zlib
            raw = bytearray()
            for y in range(h):
                raw.append(0)
                for x in range(w):
                    idx = (y * w + x) * 4
                    r, g, b, a = pixels[idx], pixels[idx+1], pixels[idx+2], pixels[idx+3]
                    raw.extend([r, g, b, a])
            compressed = zlib.compress(bytes(raw))
            path = os.path.join(DIR, 'assets/hyvmind/collision.png')
            with open(path, 'wb') as f:
                f.write(b'\x89PNG\r\n\x1a\n')
                ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
                chunk = b'IHDR' + ihdr
                f.write(struct.pack('>I', 13)); f.write(chunk); f.write(struct.pack('>I', zlib.crc32(chunk) & 0xFFFFFFFF))
                chunk = b'IDAT' + compressed
                f.write(struct.pack('>I', len(compressed))); f.write(chunk); f.write(struct.pack('>I', zlib.crc32(chunk) & 0xFFFFFFFF))
                chunk = b'IEND'
                f.write(struct.pack('>I', 0)); f.write(chunk); f.write(struct.pack('>I', zlib.crc32(chunk) & 0xFFFFFFFF))
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'size': os.path.getsize(path)}).encode('utf-8'))

        elif self.path == '/save-triggers':
            messages = json.loads(body.decode('utf-8'))
            path = os.path.join(DIR, 'assets/hyvmind/triggers.json')
            with open(path, 'w') as f:
                json.dump(messages, f)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode('utf-8'))

        elif self.path == '/save-doors':
            labels = json.loads(body.decode('utf-8'))
            path = os.path.join(DIR, 'assets/hyvmind/doors.json')
            with open(path, 'w') as f:
                json.dump(labels, f)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode('utf-8'))

        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def end_headers(self):
        if self.path in ('/save-collision', '/save-triggers', '/save-doors'):
            self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

print(f'Server on http://localhost:{PORT}')
http.server.HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
