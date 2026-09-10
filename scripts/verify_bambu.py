#!/usr/bin/env python3
"""Verify a Bambu 3MF's embedded meshes, print settings, and actual extrusion paths.
Usage: python scripts/verify_bambu.py PATH.3mf handle|head|guided|cover [--source-dir STL_DIR] [--output-dir DIR]
Requires numpy and trimesh; paths are resolved relative to this repository.
"""
import argparse, collections, hashlib, json, re, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
import trimesh
ROOT=Path(__file__).resolve().parents[1]
NS={'c':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02','p':'http://schemas.microsoft.com/3dmanufacturing/production/2015/06'}
SETS={'handle':(['fixed-grip','squeeze-lever','tube-cap'],5,'60%'), 'head':(['nose-a','nose-b','jaw-a','jaw-b','fixed-jaw'],4,'50%'), 'guided':(['frame','lever','carriage','cover'],5,'60%'), 'cover':(['cover'],5,'60%')}
def transform(v,s):
 m=np.asarray([float(x) for x in s.split()]);return v@m[:9].reshape(3,3)+m[9:]
def max_nearest(a,b):
 return max(float(np.sqrt(((chunk[:,None,:]-b[None,:,:])**2).sum(2).min(1)).max()) for chunk in np.array_split(a,max(1,int(np.ceil(len(a)/256)))))
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('project',type=Path);ap.add_argument('kind',choices=SETS);ap.add_argument('--output-dir',type=Path);ap.add_argument('--source-dir',type=Path,default=ROOT);args=ap.parse_args();source_dir=args.source_dir
 p=args.project;out=args.output_dir or p.parent;expected,walls,infill=SETS[args.kind];embedded={};bed_bounds={};notices=[]
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None,'Bad ZIP CRC'
  gbytes=z.read('Metadata/plate_1.gcode');gcode=gbytes.decode();md5=z.read('Metadata/plate_1.gcode.md5').decode().strip()
  assert hashlib.md5(gbytes).hexdigest().lower()==md5.lower(),'G-code checksum'
  settings=json.loads(z.read('Metadata/project_settings.config'))
  checks={'printer_model':'Bambu Lab A1','printer_settings_id':'Bambu Lab A1 0.4 nozzle','nozzle_diameter':['0.4'],'filament_type':['PLA'],'curr_bed_type':'Textured PEI Plate','layer_height':'0.16','initial_layer_print_height':'0.2','wall_loops':str(walls),'sparse_infill_density':infill,'sparse_infill_pattern':'gyroid','enable_support':'0','brim_width':'2','print_sequence':'by layer'}
  for k,v in checks.items():assert settings.get(k)==v,(k,settings.get(k),v)
  si=ET.fromstring(z.read('Metadata/slice_info.config'));meta={e.attrib['key']:e.attrib['value'] for e in si.findall('plate/metadata')}
  assert meta['printer_model_id']=='N2S' and meta['outside']=='false'
  objects=si.findall('plate/object');assert len(objects)==len(expected) and all(o.attrib['skipped']=='false' for o in objects)
  ids={o.attrib['identify_id']:o.attrib['name'].removesuffix('.stl') for o in objects};assert set(ids.values())==set(expected)
  model=ET.fromstring(z.read('3D/3dmodel.model'));resources={o.attrib['id']:o for o in model.findall('c:resources/c:object',NS)}
  config=ET.fromstring(z.read('Metadata/model_settings.config'));configs={o.attrib['id']:o for o in config.findall('object')}
  for item in model.findall('c:build/c:item',NS):
   oid=item.attrib['objectid'];obj=resources[oid];comp=obj.find('c:components/c:component',NS);cfg=configs[oid]
   name=next(e.attrib['value'] for e in cfg.findall('metadata') if e.attrib.get('key')=='name').removesuffix('.stl');part=cfg.find('part')
   pm={e.attrib['key']:e.attrib['value'] for e in part.findall('metadata') if 'key' in e.attrib}
   meshxml=ET.fromstring(z.read(comp.attrib['{'+NS['p']+'}path'].lstrip('/'))).find('c:resources/c:object/c:mesh',NS)
   v=np.array([[float(e.attrib[k]) for k in ('x','y','z')] for e in meshxml.findall('c:vertices/c:vertex',NS)])
   f=np.array([[int(e.attrib[k]) for k in ('v1','v2','v3')] for e in meshxml.findall('c:triangles/c:triangle',NS)])
   # A slicer placement must also preserve handedness.
   for placement in (comp.attrib['transform'],item.attrib['transform']):
    determinant=np.linalg.det(np.array([float(x) for x in placement.split()])[:9].reshape(3,3))
    assert abs(determinant-1)<.0001,(name,'placement is not a rigid rotation',determinant)
   bed=transform(transform(v,comp.attrib['transform']),item.attrib['transform']);bounds=np.array([bed.min(0),bed.max(0)]);bed_bounds[name]=bounds.tolist()
   assert abs(bounds[0,2])<.001 and bounds[1,2]<256 and bounds[:,:2].min()>5 and bounds[:,:2].max()<251,(name,'bed bounds')
   # Undo the saved source-centering transform, then compare against the actual repository STL.
   matrix=np.array([float(x) for x in pm['matrix'].split()]).reshape(4,4)
   restored=(np.c_[v,np.ones(len(v))]@matrix.T)[:,:3]
   em=trimesh.Trimesh(vertices=restored,faces=f,process=True);source=trimesh.load(source_dir/(name+'.stl'))
   assert em.is_watertight and em.is_winding_consistent and len(em.split())==1,(name,'embedded mesh')
   assert source.is_watertight and source.is_winding_consistent and len(source.split())==1,(name,'source mesh')
   assert len(em.faces)==len(source.faces),(name,'triangle count')
   deviation=max(max_nearest(em.vertices,source.vertices),max_nearest(source.vertices,em.vertices))
   assert deviation<.0001,(name,'embedded mesh differs from STL',deviation)
   assert abs(em.volume-source.volume)<.01,(name,'embedded volume differs')
   stats=part.find('mesh_stat').attrib
   assert all(int(stats.get(k,'0'))==0 for k in ['edges_fixed','degenerate_facets','facets_removed','facets_reversed','backwards_edges']),(name,'slicer repaired the source mesh',stats)
   embedded[name]={'triangles':len(em.faces),'watertight':True,'max_vertex_deviation_mm':deviation,'volume_delta_mm3':float(em.volume-source.volume),'slicer_repairs':0}
  assert set(embedded)==set(expected)
  if not any(n.endswith('.png') for n in z.namelist()):notices.append('No native thumbnail from the headless slicer; open the project and reslice in Bambu Studio to generate its preview.')
 pos=np.zeros(3);layer=None;feature='';oid=None;absolute=True;relative_e=True;segments=[];zs=[];features=[];object_ids=[]
 for line in gcode.splitlines():
  if line.startswith('; Z_HEIGHT:'):layer=float(line.split(':',1)[1])
  if line.startswith('; FEATURE:'):feature=line.split(':',1)[1].strip()
  if line.startswith('; OBJECT_ID:'):oid=line.split(':',1)[1].strip()
  if line.startswith('; start printing object'):oid=line.rsplit(':',1)[1].strip()
  if line.startswith('; stop printing object'):oid=None
  raw=line.split(';',1)[0].strip()
  if raw=='G90':absolute=True
  if raw=='G91':absolute=False
  if raw=='M83':relative_e=True
  if raw=='M82':relative_e=False
  if re.match(r'^G[23]\s',raw) and re.search(r'E[\d.-]+',raw):raise AssertionError('Unexpected extrusion arcs need explicit verification')
  if raw.startswith('G92 '):
   for k,value in re.findall(r'([XYZ])\s*(-?\d*\.?\d+)',raw):pos['XYZ'.index(k)]=float(value)
  if not re.match(r'^G[01]\s',raw):continue
  values={k:float(v) for k,v in re.findall(r'([XYZEF])\s*(-?\d*\.?\d+)',raw)};previous=pos.copy()
  for i,k in enumerate('XYZ'):
   if k in values:pos[i]=values[k] if absolute else pos[i]+values[k]
  if layer is not None and feature!='Custom' and values.get('E',0)>0 and np.linalg.norm(pos[:2]-previous[:2])>1e-5:
   assert absolute and relative_e
   segments.append([previous[:2].copy(),pos[:2].copy()]);zs.append(pos[2]);features.append(feature);object_ids.append(oid)
 segments=np.array(segments);zs=np.array(zs);features=np.array(features);object_ids=np.array(object_ids)
 assert len(segments)>1000 and segments.min()>5 and segments.max()<251
 layers=sorted(set(np.round(zs,2)));assert layers[0]==.2
 max_height=max(b[1][2] for b in bed_bounds.values());assert max_height-.2<layers[-1]<max_height+.05
 first={ids[x] for x in object_ids[zs<.25] if x in ids};assert first==set(expected)
 counts=collections.Counter(features);assert not any(n.startswith('Support') for n in counts)
 report={'status':'PASS','slicer':'Bambu Studio 02.08.02.61','printer':'Bambu Lab A1','printer_model_id':'N2S','nozzle_mm':.4,'material':'Generic PLA','bed':'Textured PEI Plate','layer_height_mm':.16,'first_layer_height_mm':.2,'wall_loops':walls,'infill':infill+' gyroid','support':'Disabled; short internal bridges remain','brim':'2 mm outside only','estimated_seconds':int(meta['prediction']),'estimated_filament_g':float(meta['weight']),'layers':len(layers),'parts':sorted(expected),'first_layer_parts':sorted(first),'extrusion_bounds_xy_mm':[segments.reshape(-1,2).min(0).tolist(),segments.reshape(-1,2).max(0).tolist()],'feature_segment_counts':dict(counts),'embedded_meshes':embedded,'bed_mesh_bounds_mm':bed_bounds,'gcode_md5_verified':True,'source_sha256':{n:hashlib.sha256((source_dir/(n+'.stl')).read_bytes()).hexdigest() for n in expected},'project_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'slicer_notices':notices+['Leave timelapse off.'],'physical_validation':'Builder printed the handle and reported a mirrored-cover fit failure. This corrected cover has not yet been printed. Digital checks do not establish hardware fit, grip, fatigue, or stop strength.'}
 out.mkdir(parents=True,exist_ok=True);(out/'slice-checks.json').write_text(json.dumps(report,indent=2)+'\n');(out/p.with_suffix('.gcode').name).write_bytes(gbytes)
 np.savez_compressed(out/'toolpaths.npz',segments=segments,zs=zs,features=features,object_ids=object_ids.astype(str))
 print(json.dumps({'project':str(p),'status':'PASS','seconds':report['estimated_seconds'],'grams':report['estimated_filament_g'],'parts':report['parts'],'max_embedded_mesh_error_mm':max(e['max_vertex_deviation_mm'] for e in embedded.values())},indent=2))
if __name__=='__main__':main()
