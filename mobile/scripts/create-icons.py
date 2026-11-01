"""Generate the project's own small PNG line icons; standard library only."""
from pathlib import Path
import math
import struct
import zlib

SIZE = 81
OUT = Path(__file__).resolve().parents[1] / 'static' / 'tabs'


def icon(name, color):
    pixels = bytearray(SIZE * SIZE * 4)

    def dot(x, y):
        for yy in range(max(0, int(y) - 2), min(SIZE, int(y) + 3)):
            for xx in range(max(0, int(x) - 2), min(SIZE, int(x) + 3)):
                if (xx - x) ** 2 + (yy - y) ** 2 <= 5:
                    i = (yy * SIZE + xx) * 4
                    pixels[i:i + 4] = bytes((*color, 255))

    def line(points):
        for (x0, y0), (x1, y1) in zip(points, points[1:]):
            n = max(1, int(math.hypot(x1 - x0, y1 - y0) * 3))
            for i in range(n + 1):
                dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)

    def circle(x, y, radius):
        line([(x + math.cos(a / 180 * math.pi) * radius, y + math.sin(a / 180 * math.pi) * radius) for a in range(361)])

    if name == 'home':
        line([(15, 36), (40, 15), (66, 36)])
        line([(21, 32), (21, 65), (33, 65), (33, 47), (48, 47), (48, 65), (60, 65), (60, 32)])
    elif name == 'book':
        line([(40, 25), (27, 19), (14, 19), (14, 60), (27, 60), (40, 66), (54, 60), (67, 60), (67, 19), (54, 19), (40, 25), (40, 66)])
        line([(23, 32), (31, 35)])
        line([(49, 35), (58, 32)])
    elif name == 'check':
        line([(47, 15), (18, 15), (18, 66), (62, 66), (62, 41)])
        line([(32, 34), (42, 44), (67, 19)])
        line([(28, 55), (48, 55)])
    else:
        circle(40, 27, 13)
        line([(16, 67), (16, 59), (20, 50), (29, 46), (51, 46), (60, 50), (65, 59), (65, 67)])

    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)

    raw = b''.join(b'\0' + pixels[y * SIZE * 4:(y + 1) * SIZE * 4] for y in range(SIZE))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', SIZE, SIZE, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


OUT.mkdir(parents=True, exist_ok=True)
for name in ('home', 'book', 'check', 'user'):
    for suffix, color in (('', (100, 116, 139)), ('-active', (37, 99, 235))):
        (OUT / f'{name}{suffix}.png').write_bytes(icon(name, color))
print('Created 8 original tab icons.')
