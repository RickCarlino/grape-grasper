#!/usr/bin/env python3
"""Render first-layer and all-layer extrusion paths saved by verify_bambu.py."""
import argparse,json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('directory',type=Path);ap.add_argument('title');args=ap.parse_args()
d=np.load(args.directory/'toolpaths.npz');report=json.loads((args.directory/'slice-checks.json').read_text());segments=d['segments'];zs=d['zs'];features=d['features']
fig,axes=plt.subplots(1,2,figsize=(14,7),layout='constrained')
for ax,title,mask in [(axes[0],'First layer · every part starts on the bed',zs<.25),(axes[1],'All layers · '+str(len(report['parts']))+' printed parts',np.ones(len(zs),dtype=bool))]:
 brim=features=='Brim'
 for selected,color in [(mask&~brim,'#287d8e'),(mask&brim,'#889096')]:ax.add_collection(LineCollection(segments[selected],colors=color,linewidths=.35,rasterized=True))
 xy=segments.reshape(-1,2);ax.set(xlim=(xy[:,0].min()-22,xy[:,0].max()+25),ylim=(xy[:,1].min()-10,xy[:,1].max()+10),aspect='equal',title=title,xlabel='X · mm',ylabel='Y · mm');ax.grid(alpha=.13)
 for name,b in report['bed_mesh_bounds_mm'].items():
  lo,hi=np.array(b);y=(lo[1]+hi[1])/2
  point=((lo[0]+hi[0])/2,lo[1]) if name=='carriage' else (hi[0],y)
  label=(point[0],point[1]-5) if name=='carriage' else (hi[0]+3,y)
  ax.annotate(name,xy=point,xytext=label,ha='center' if name=='carriage' else 'left',va='center',fontsize=8,color='#343c42',arrowprops={'arrowstyle':'-','color':'#899497','lw':.6})
fig.suptitle(args.title+' · Bambu A1 · PLA\nTeal: part extrusion     Grey: removable brims     Supports: off',fontsize=15)
fig.savefig(args.directory/'toolpath-preview.png',dpi=160);plt.close(fig)
