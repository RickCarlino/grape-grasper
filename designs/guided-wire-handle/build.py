"""Build watertight STLs from the JSCAD's shared planar sections; verify layers.
Usage: node export.cjs /path/to/work && python build.py /path/to/work
"""
from pathlib import Path
import sys,json,hashlib,numpy as np,trimesh,manifold3d as md
ROOT=Path(__file__).resolve().parent
work=Path(sys.argv[1]);data=json.loads((work/'recipe.json').read_text());scale=1000
dims=data['dimensions']
sections={n:md.CrossSection([np.round(np.asarray(c)*scale) for c in cs],md.FillRule.EvenOdd) for n,cs in data['sections'].items()}
reports={};meshes=[]
for part in data['parts']:
 name=part['name'];solid=md.Manifold()
 for layer in data['plans'][name]:
  shape=sections[layer['add'][0]]
  for n in layer['add'][1:]:shape=shape+sections[n]
  for n in layer.get('cut',[]):shape=shape-sections[n]
  solid=solid+shape.extrude(round(layer['h']*scale)).translate([0,0,round(layer['z']*scale)])
 if name in ('frame','cover'):
  bore=md.Manifold.cylinder(round((26.3-dims['tubeStart'])*scale),3325,3325,64).rotate([0,90,0]).translate([round(dims['tubeStart']*scale),0,6500]);solid=solid-bore
 if name=='frame':
  solid=solid-sections['pivotNut'].extrude(2800).translate([0,0,-100])
  solid=solid-md.Manifold.cube([29400,10500,30000],True).translate([-6500,0,19500])
  solid=solid-md.Manifold.cube([16400,24000,30000],True).translate([18200,0,21500])
  solid=solid-md.Manifold.cube([18300,4000,12000],True).translate([17250,0,10500])
  solid=solid-md.Manifold.cube([12000,1500,1500],True).translate([-26600,0,6500])
 assert solid.status()==md.Error.NoError,(name,solid.status())
 if name=='cover':solid=solid.mirror([0,0,1])
 solid=solid.scale([.001]*3);raw=solid.to_mesh64()
 mesh=trimesh.Trimesh(vertices=raw.vert_properties[:,:3],faces=raw.tri_verts,process=False);mesh.apply_translation(-mesh.bounds[0]);p=ROOT/'stl'/f'{name}.stl';mesh.export(p);mesh=trimesh.load(p)
 assert mesh.is_watertight and mesh.is_winding_consistent and len(mesh.split())==1,name
 delta=abs(mesh.volume-part['volume']);assert delta<max(.2,part['volume']*.0001),(name,delta)
 target=np.array(part['bounds']);size=target[1]-target[0];assert np.max(np.abs(mesh.extents-size))<.002,(name,mesh.extents,size)
 solid=md.Manifold(md.Mesh(mesh.vertices.astype(np.float32),mesh.faces.astype(np.uint32)))
 heights=[.1]+list(np.arange(.28,mesh.bounds[1,2]-.001,.16));prev=None;bad=[]
 for z in heights:
  section=solid.slice(float(z))
  if prev is not None:
   for c in section.decompose():
    if c.area()>.01 and (c^prev).area()<.001:bad.append({'z':round(float(z),3),'area':c.area()})
  prev=section
 assert not bad,(name,'floating islands',bad)
 reports[name]={'watertight':True,'bodies':1,'triangles':len(mesh.faces),'bounds_mm':mesh.bounds.tolist(),'volume_mm3':mesh.volume,'CAD_volume_delta_mm3':delta,'floating_islands':bad,'sampled_layers':len(heights),'STL_sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 meshes.append(mesh);print(name,len(mesh.faces),'triangles; watertight; no floating islands; volume delta',round(delta,4),flush=True)
for mesh,offset in zip(meshes,[[0,0,0],[100,0,0],[140,0,0],[140,28,0]]):mesh.apply_translation(offset)
layout=trimesh.util.concatenate(meshes);assert layout.is_watertight and len(layout.split())==4;layout.export(ROOT/'stl/layout.stl')
(ROOT/'mesh-checks.json').write_text(json.dumps({'status':'PASS','source_sha256':hashlib.sha256((ROOT/'guided-wire-grasper.js').read_bytes()).hexdigest(),'method':'Shared JSCAD section recipes extruded and booleaned in Manifold on a 0.001 mm grid; no ad hoc mesh repair. Layer midplane checks at 0.20 / 0.16 mm.','limitations':'No floating islands does not prove bridge quality, fit, friction, or grip.','parts':reports},indent=2)+'\n')
