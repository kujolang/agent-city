"""Compile original static canine portraits; no reference image pixels or runtime state."""
import json
import struct
import zlib
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
art = json.loads((ROOT / 'assets/source/portraits.json').read_text())
roles = json.loads((ROOT / 'assets/source/characters.json').read_text())['palettes']
w, h = art['width'], art['height']
pixels = bytearray(w * h * len(roles) * 4)
for index, (_, coat, accent, accessory) in enumerate(roles):
    palette = {**art['palette'], 'C': coat, 'A': accent}
    for x, y, width, height, key in art['rectangles'] + art['accessories'][accessory]:
        assert 0 <= x < x + width <= w and 0 <= y < y + height <= h
        color = bytes.fromhex(palette[key][1:]) + b'\xff'
        for yy in range(y, y + height):
            for xx in range(x, x + width):
                offset = ((index * h + yy) * w + xx) * 4
                pixels[offset:offset + 4] = color

def chunk(kind, body):
    return struct.pack('!I', len(body)) + kind + body + struct.pack('!I', zlib.crc32(kind + body))
height = h * len(roles)
scanlines = b''.join(b'\0' + pixels[y*w*4:(y+1)*w*4] for y in range(height))
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', w, height, 8, 6, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(scanlines, 9)) + chunk(b'IEND', b'')
(ROOT / 'assets/compiled/portraits.png').write_bytes(png)
print(f'Original portraits: {w}x{height}, {len(png)} PNG bytes')
