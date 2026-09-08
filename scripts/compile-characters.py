"""Compile original authored pixel silhouettes into a lossless, nearest-neighbor atlas.

No image dependencies, reference sampling, random state or protected source pixels.
Pose names are an asset vocabulary only; world-core decides when a pose is justified.
"""
import json
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
source = json.loads((ROOT / 'assets/source/characters.json').read_text())
W, H = source['width'], source['height']
poses = source['poses']
width, height = W * len(poses), H * 8 * len(source['palettes'])
pixels = bytearray(width * height * 4)


def rect(rows, x, y, w, h, color):
    for yy in range(max(0, y), min(H, y + h)):
        for xx in range(max(0, x), min(W, x + w)):
            rows[yy][xx] = color


for role, (identity, coat, accent, accessory) in enumerate(source['palettes']):
    palette = {' ': '#00000000', '#': '#080b15', 'F': '#b9ad83',
               'S': '#6c685d', 'C': coat, 'A': accent, 'B': '#283548',
               'H': '#e2e4c7', 'L': '#399af1'}
    for mode in range(2):
        for frame in range(4):
            for pose_index, pose in enumerate(poses):
                authored = source['side' if mode else 'front']
                assert len(authored) == H and all(len(row) == W for row in authored)
                rows = [list(row) for row in authored]
                if accessory == 'cap':
                    rect(rows, 5, 3, 7, 2, 'C')
                    rect(rows, 5, 5, 10, 1, 'A')
                elif accessory == 'headset':
                    rect(rows, 3, 5, 2, 5, 'B')
                    rect(rows, 3, 6, 1, 3, 'A')
                else:
                    rect(rows, 5, 5, 8, 1, 'A')
                if pose == 'walk':
                    stride = source['walkSide' if mode else 'walkFront'][frame]
                    assert len(stride) == 7 and all(len(row) == W for row in stride)
                    rows[17:] = [list(row) for row in stride]
                    # Counter-swing the visible forearm. No position or timing
                    # lives in the asset; the deterministic planner owns both.
                    if frame % 2:
                        rect(rows, 12, 13, 3, 4, 'C')
                        rect(rows, 13, 12 if frame == 1 else 15, 2, 2, 'F')
                if pose in ['read', 'inspect', 'carry']:
                    rect(rows, 10, 12, 9, 7, '#')
                    rect(rows, 11, 13, 7, 5, 'H' if pose != 'carry' else 'A')
                    rect(rows, 14, 13, 1, 5, 'B')
                    rect(rows, 10, 16, 2, 2, 'F')
                    rect(rows, 17, 16, 2, 2, 'F')
                if pose in ['terminal', 'work']:
                    rect(rows, 12, 14, 6, 3, 'C')
                    rect(rows, 16, 14 + frame % 2, 3, 2, 'F')
                if pose == 'ladder':
                    rect(rows, 2, 11, 3, 6, ' ')
                    rect(rows, 13, 11, 3, 6, ' ')
                    rect(rows, 2, 5 + (frame % 2) * 4, 3, 7, 'C')
                    rect(rows, 2, 5 + (frame % 2) * 4, 3, 2, 'F')
                    rect(rows, 13, 9 - (frame % 2) * 4, 3, 7, 'C')
                    rect(rows, 13, 9 - (frame % 2) * 4, 3, 2, 'F')
                if pose in ['wait', 'blocked']:
                    rect(rows, 6, 14, 7, 3, 'C')
                    rect(rows, 7, 15, 5, 1, 'F')
                if pose == 'talk' and frame % 2:
                    rect(rows, 10, 9, 3, 1, '#')
                if pose == 'alert':
                    rect(rows, 12, 12, 3, 5, 'C')
                    rect(rows, 12, 10, 3, 2, 'F')
                # Completion remains a resting pose, never an invented celebration.
                if pose == 'offline':
                    for row in rows:
                        for x, color in enumerate(row):
                            if color in ['C', 'A', 'L']:
                                row[x] = 'S'
                ox = pose_index * W
                oy = (role * 8 + mode * 4 + frame) * H
                for y, row in enumerate(rows):
                    for x, key in enumerate(row):
                        value = bytes.fromhex(palette[key][1:])
                        if len(value) == 3:
                            value += b'\xff'
                        offset = ((oy + y) * width + ox + x) * 4
                        pixels[offset:offset + 4] = value


def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))


scanlines = b''.join(b'\0' + pixels[y * width * 4:(y + 1) * width * 4] for y in range(height))
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', width, height, 8, 6, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(scanlines, 9)) + chunk(b'IEND', b'')
(ROOT / 'assets/compiled/characters.png').write_bytes(png)
print(f'Characters: {width}×{height}, {len(png)} PNG bytes, {len(pixels)} decoded bytes')
