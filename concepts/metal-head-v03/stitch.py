import numpy as np, trimesh, json
from pathlib import Path
out=Path(__file__).resolve().parent/'stl'
report={}
for name in ['cheek-a','cheek-b','moving-jaw','fixed-jaw','insert']:
 m=trimesh.load(out/(name+'.stl'),force='mesh')
 m.merge_vertices(digits_vertex=5)
 m.update_faces(m.nondegenerate_faces());m.update_faces(m.unique_faces());m.remove_unreferenced_vertices()
 before=float(m.volume)
 for iteration in range(12):
  edges=m.edges_sorted; u,counts=np.unique(edges,axis=0,return_counts=True)
  boundary=u[counts==1]
  if not len(boundary):break
  bverts=np.unique(boundary); pts=m.vertices[bverts]
  replacements={}
  for a,b in boundary:
   av,bv=m.vertices[a],m.vertices[b];ab=bv-av;length2=np.dot(ab,ab)
   t=(pts-av)@ab/length2
   dist=np.linalg.norm(pts-av-t[:,None]*ab,axis=1)
   select=(dist<0.0006)&(t>0.00001)&(t<0.99999)
   ids=bverts[select];tt=t[select]
   if len(ids):replacements[(a,b)]=list(ids[np.argsort(tt)])
  if not replacements:break
  faces=[];did=0
  # Split one marked edge per triangle per pass. Preserve triangle winding.
  for tri in m.faces:
   for k in range(3):
    a,b,c=map(int,[tri[k],tri[(k+1)%3],tri[(k+2)%3]])
    key=(min(a,b),max(a,b))
    if key in replacements:
     ids=replacements[key]
     if a>b:ids=ids[::-1]
     seq=[a]+ids+[b]
     faces.extend([[seq[q],seq[q+1],c] for q in range(len(seq)-1)]);did+=1;break
   else:faces.append(tri)
  m=trimesh.Trimesh(vertices=m.vertices,faces=np.array(faces),process=False)
  m.update_faces(m.nondegenerate_faces(height=1e-9));m.remove_unreferenced_vertices()
 info={'watertight':bool(m.is_watertight),'winding_consistent':bool(m.is_winding_consistent),'bodies':len(m.split(only_watertight=False,repair=False)),'volume_mm3':round(float(m.volume),3),'volume_change_mm3':round(float(m.volume)-before,5),'min_z':round(float(m.bounds[0,2]),5),'bounds_mm':np.round(m.bounds,3).tolist(),'triangles':len(m.faces)}
 report[name]=info;print(name,info)
 if not m.is_watertight:raise RuntimeError(name+' did not close')
 m.export(out/(name+'.stl'))
(out/'mesh-checks.json').write_text(json.dumps(report,indent=2))
