#!/usr/bin/env python3
"""Render every STL with a headless, orthographic studio view (no GPU required)."""
from pathlib import Path
import argparse
import struct

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'docs/images'


def read_stl(path):
    data = path.read_bytes()
    count = struct.unpack_from('<I', data, 80)[0] if len(data) >= 84 else 0
    if len(data) == 84 + count * 50:
        record = np.dtype([('normal', '<f4', (3,)), ('vertices', '<f4', (3, 3)), ('attr', '<u2')])
        triangles = np.frombuffer(data, dtype=record, offset=84)['vertices'].astype(float)
    else:
        vertices = [list(map(float, line.split()[1:])) for line in data.decode('ascii').splitlines()
                    if line.strip().startswith('vertex ')]
        triangles = np.asarray(vertices, dtype=float).reshape(-1, 3, 3)
    if not triangles.size or not np.isfinite(triangles).all():
        raise ValueError(f'{path}: empty or nonfinite geometry')
    return triangles


def render(source, destination):
    triangles = read_stl(source)
    low, high = triangles.min(axis=(0, 1)), triangles.max(axis=(0, 1))
    size = high - low
    triangles -= (low + high) / 2
    normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    norms = np.linalg.norm(normals, axis=1)
    normals /= np.maximum(norms[:, None], 1e-12)
    light = np.array([-0.4, -0.5, 0.85])
    light /= np.linalg.norm(light)
    brightness = 0.52 + 0.48 * np.maximum(0, normals @ light)
    base = np.array([0.16, 0.53, 0.56])
    if source.stem in ('trigger', 'jaw'):
        base = np.array([0.94, 0.47, 0.19])
    colors = np.clip(brightness[:, None] * base, 0, 1)
    # Rasterize with a depth buffer: painter sorting produces false seams on
    # long coplanar STL triangles and can hide holes behind the wrong faces.
    width, height, supersample = 1620, 1260, 2
    azimuth, elevation = np.radians([-65, 58])
    right = np.array([-np.sin(azimuth), np.cos(azimuth), 0])
    up = np.array([-np.sin(elevation)*np.cos(azimuth),
                   -np.sin(elevation)*np.sin(azimuth), np.cos(elevation)])
    toward = np.cross(right, up)
    projected = triangles @ np.array([right, -up, toward]).T
    lo, hi = projected.min(axis=(0, 1)), projected.max(axis=(0, 1))
    scale = min(1300 / (hi[0]-lo[0]), 880 / (hi[1]-lo[1]))
    projected[:, :, :2] = (projected[:, :, :2] - (lo[:2]+hi[:2])/2) * scale
    projected[:, :, :2] += [width/2, 650]
    projected[:, :, :2] *= supersample
    w, h = width*supersample, height*supersample
    depth = np.full((h, w), -np.inf, dtype=np.float32)
    pixels = np.zeros((h, w, 4), dtype=np.uint8)
    for tri, color in zip(projected, colors):
        x0, y0 = np.maximum(np.floor(tri[:, :2].min(axis=0)).astype(int), 0)
        x1, y1 = np.minimum(np.ceil(tri[:, :2].max(axis=0)).astype(int), [w-1, h-1])
        if x1 < x0 or y1 < y0:
            continue
        a, b, c = tri
        denom = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
        if abs(denom) < 1e-10:
            continue
        yy, xx = np.mgrid[y0:y1+1, x0:x1+1]
        xx, yy = xx+0.5, yy+0.5
        u = ((b[1]-c[1])*(xx-c[0]) + (c[0]-b[0])*(yy-c[1]))/denom
        v = ((c[1]-a[1])*(xx-c[0]) + (a[0]-c[0])*(yy-c[1]))/denom
        z = u*a[2] + v*b[2] + (1-u-v)*c[2]
        region = depth[y0:y1+1, x0:x1+1]
        mask = (u >= -1e-8) & (v >= -1e-8) & (u+v <= 1+1e-8) & (z > region)
        region[mask] = z[mask]
        pixels[y0:y1+1, x0:x1+1][mask] = [*np.round(color*255).astype(int), 255]
    part = Image.fromarray(pixels).resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (width, height), '#f3f5f4')
    shadow = Image.new('RGBA', (width, height), '#244449')
    shadow.putalpha(part.getchannel('A').point(lambda value: round(value*0.12)).filter(ImageFilter.GaussianBlur(15)))
    canvas.alpha_composite(shadow, (8, 20))
    canvas.alpha_composite(part)
    draw = ImageDraw.Draw(canvas)
    def font(size, bold=False):
        # Pillow resolves DejaVu on common platforms; fall back to its bundled font.
        try:
            return ImageFont.truetype('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf', size)
        except OSError:
            return ImageFont.load_default(size=size)
    draw.text((105, 56), source.stem.replace('-', ' ').upper(), font=font(46, True), fill='#173c40')
    dimensions = ' × '.join(f'{value:.1f}' for value in size)
    draw.text((105, 1180), f'{source.name}   /   {dimensions} mm', font=font(24), fill='#52696b')
    canvas.convert('RGB').save(destination)



def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true', help='Rebuild even unchanged images')
    args = parser.parse_args()
    sources = sorted(p for p in ROOT.rglob('*') if p.suffix.lower() == '.stl' and
                     not any(part.startswith('.') for part in p.relative_to(ROOT).parts))
    if not sources:
        parser.error('No STL files found')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    gallery = ['<!-- Generated by scripts/render_stls.py; do not edit this section. -->',
               '## STL previews', '',
               'Print one of each individual part, **or** the combined layout. Dimensions are the STL bounds; previews are individually scaled.', '']
    for source in sources:
        relative = source.relative_to(ROOT)
        name = relative.with_suffix('').as_posix().replace('/', '__')
        destination = OUTPUT / f'{name}.png'
        if args.force or not destination.exists() or destination.stat().st_mtime < max(source.stat().st_mtime, Path(__file__).stat().st_mtime):
            render(source, destination)
            print(f'Rendered {relative} → {destination.relative_to(ROOT)}')
        gallery.extend([f'### {source.stem.replace("-", " ").title()}', '',
                        f'[![{source.stem} STL preview](docs/images/{name}.png)]({relative.as_posix()})', ''])
    readme = ROOT / 'README.md'
    content = readme.read_text()
    start, end = '<!-- STL-GALLERY:START -->', '<!-- STL-GALLERY:END -->'
    before, rest = content.split(start, 1)
    _, after = rest.split(end, 1)
    updated = before + start + '\n' + '\n'.join(gallery) + end + after
    if updated != content:
        readme.write_text(updated)


if __name__ == '__main__':
    main()
