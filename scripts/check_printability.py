#!/usr/bin/env python3
"""Check bed contact and newly appearing islands at the supplied layer spacing.
This detects floating components; it does not predict bridge quality or adhesion.
"""
from pathlib import Path
import hashlib,json,numpy as np,trimesh,manifold3d as md
ROOT=Path(__file__).resolve().parents[1]
NAMES=['fixed-grip','squeeze-lever','tube-cap','nose-a','nose-b','jaw-a','jaw-b','fixed-jaw']
report={'status':'PASS','method':'Cross-section components sampled at layer midplanes: 0.20 mm first layer, then 0.16 mm. Every component above the first layer must overlap material in the preceding sample.','limitations':'Detects floating islands, not local overhang quality, bridge sagging, bed adhesion, or hardware tolerances. The wire passage and nut pocket require short bridges.','parts':{},'failures':[]}
for name in NAMES:
 p=ROOT/(name+'.stl');mesh=trimesh.load(p)
 solid=md.Manifold(md.Mesh(mesh.vertices.astype(np.float32),mesh.faces.astype(np.uint32)))
 assert solid.status()==md.Error.NoError,(name,solid.status())
 assert abs(mesh.bounds[0,2])<.001,(name,'not on bed')
 heights=[.1]+list(np.arange(.28,mesh.bounds[1,2]-.001,.16));previous=None;bad=[];layer_components=[]
 for z in heights:
  section=solid.slice(float(z));components=section.decompose();layer_components.append(len(components))
  if previous is not None:
   for component in components:
    if component.area()>.01 and (component^previous).area()<.001:bad.append({'z_mm':round(float(z),3),'island_area_mm2':component.area()})
  previous=section
 if bad:report['failures'].append({'part':name,'unsupported_components':bad})
 report['parts'][name]={'sampled_layers':len(heights),'first_layer_area_mm2':solid.slice(.1).area(),'max_layer_components':max(layer_components),'floating_islands':bad,'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
report['status']='FAIL' if report['failures'] else 'PASS'
(ROOT/'printability-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'status':report['status'],'parts':len(NAMES),'failures':report['failures']},indent=2))
if report['failures']:raise SystemExit(1)
