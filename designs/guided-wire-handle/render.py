"""Render the source-derived views exported by export.cjs."""
import sys,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[1]/'scripts'))
from render_assembly import render_meshes
work=Path(sys.argv[1]);views=json.loads((work/'views.json').read_text())
for n,meshes in views.items():
 render_meshes(meshes,ROOT/'images'/f'{n}.png');print('Rendered',n,flush=True)
(ROOT/'images/render-state.json').write_text(json.dumps({'source_sha256':hashlib.sha256((ROOT/'guided-wire-grasper.js').read_bytes()).hexdigest(),'images':{n:hashlib.sha256((ROOT/'images'/f'{n}.png').read_bytes()).hexdigest() for n in views}},indent=2)+'\n')
