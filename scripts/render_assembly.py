#!/usr/bin/env python3
"""Render current JSCAD assembly views without changing geometry or print files."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess

from PIL import Image, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def render_meshes(meshes, destination):
    triangles = np.concatenate([np.asarray(m["triangles"],dtype=float) for m in meshes])
    base = np.concatenate([np.tile(m["color"][:3], (len(m["triangles"]),1)) for m in meshes])
    low, high = triangles.min(axis=(0, 1)), triangles.max(axis=(0, 1))
    size = high - low
    triangles -= (low + high) / 2
    normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    norms = np.linalg.norm(normals, axis=1)
    normals /= np.maximum(norms[:, None], 1e-12)
    light = np.array([-0.4, -0.5, 0.85])
    light /= np.linalg.norm(light)
    brightness = 0.52 + 0.48 * np.maximum(0, normals @ light)
    colors = np.clip(brightness[:, None] * base, 0, 1)
    # Rasterize with a depth buffer: painter sorting produces false seams on
    # long coplanar STL triangles and can hide holes behind the wrong faces.
    width, height, supersample = 1800, 780, 2
    azimuth, elevation = np.radians([-80, 62])
    right = np.array([-np.sin(azimuth), np.cos(azimuth), 0])
    up = np.array([-np.sin(elevation)*np.cos(azimuth),
                   -np.sin(elevation)*np.sin(azimuth), np.cos(elevation)])
    toward = np.cross(right, up)
    projected = triangles @ np.array([right, -up, toward]).T
    lo, hi = projected.min(axis=(0, 1)), projected.max(axis=(0, 1))
    scale = min(1550 / (hi[0]-lo[0]), 570 / (hi[1]-lo[1]))
    projected[:, :, :2] = (projected[:, :, :2] - (lo[:2]+hi[:2])/2) * scale
    projected[:, :, :2] += [width/2, height/2-8]
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
    canvas.convert('RGB').save(destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    inputs = ['scripts/render_assembly.py', 'scripts/export_views.cjs', 'package-lock.json',
              'precision-grasper.js']
    hashes = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in inputs}
    state_path = ROOT / 'docs/images/cad-render-state.json'
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    if not args.force and state.get('inputs') == hashes and all(
            (ROOT / p).exists() and hashlib.sha256((ROOT / p).read_bytes()).hexdigest() == h
            for p, h in state.get('images', {}).items()) and state.get('images'):
        print('CAD screenshots are current.')
        return
    result = subprocess.run(['node', str(ROOT / 'scripts/export_views.cjs')],
                            cwd=ROOT, check=True, text=True, capture_output=True)
    data = json.loads(result.stdout)
    images = {}
    for view in data['views']:
        paths = [ROOT / p for p in view['destinations']]
        for p in paths:
            p.parent.mkdir(parents=True, exist_ok=True)
        render_meshes(view['meshes'], paths[0])
        for p in paths[1:]:
            shutil.copy2(paths[0], p)
        for p in paths:
            images[p.relative_to(ROOT).as_posix()] = hashlib.sha256(p.read_bytes()).hexdigest()
        print('Rendered CAD view:', view['name'], flush=True)
    metadata_path = ROOT / 'docs/preview-colors.json'
    metadata = json.loads(metadata_path.read_text())
    metadata['layouts']['layout'] = data['handleLayout']
    content = json.dumps(metadata, indent=2) + '\n'
    if metadata_path.read_text() != content:
        metadata_path.write_text(content)
    state_path.write_text(json.dumps({'inputs': hashes, 'images': images}, indent=2) + '\n')


if __name__ == '__main__':
    main()
