const fs=require('fs'),path=require('path'),j=require('@jscad/modeling'),stl=require('@jscad/stl-serializer'),m=require('./metal-head.js');
const root=__dirname;fs.mkdirSync(root+'/stl',{recursive:true});fs.mkdirSync(root+'/images',{recursive:true});
const names=['cheek-a','cheek-b','moving-jaw','fixed-jaw','insert'];
for(const name of names){const g=m.main({view:name});fs.writeFileSync(root+'/stl/'+name+'.stl',Buffer.concat(stl.serialize({binary:true},g).map(x=>Buffer.from(x))))}
for(const [name,view,opening] of [['head-open','head',35],['mechanism','mechanism',35],['head-closed','head',0]]){
 const objects=m.main({view,opening});const meshes=objects.map(g=>({color:g.color||[.5,.5,.5],triangles:j.geometries.geom3.toPolygons(g).flatMap(p=>p.vertices.slice(2).map((v,i)=>[p.vertices[0],p.vertices[i+1],v]))}));fs.writeFileSync(root+'/images/'+name+'.json',JSON.stringify(meshes));
}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="100mm" viewBox="0 0 120 100"><rect width="120" height="100" fill="white"/><g font-family="sans-serif" fill="#17232b"><text x="6" y="8" font-size="4">Metal head v0.3 — sheet templates</text><text x="6" y="14" font-size="2.6">Concept dimensions in mm. Print at 100%; verify the 20 mm line.</text>';
const reports=[];
for(let i=0;i<4;i++){
 const name=names[i],g=m.main({view:name}),shape=j.extrusions.project({},g),outlines=j.geometries.geom2.toOutlines(shape),bbox=j.measurements.measureBoundingBox(g),t=i<2?m.M.sheet:m.M.jaw;
 const area=j.measurements.measureArea(shape),volume=j.measurements.measureVolume(g);
 if(Math.abs(area*t-volume)>1e-3)throw Error('Projection volume mismatch '+name);
 const x=8,y=26+16*i,polypath=outlines.map(ps=>'M'+ps.map(p=>(x+p[0]).toFixed(5)+','+(y-p[1]).toFixed(5)).join(' L')+' Z').join(' ');
 svg+='<path d="'+polypath+'" fill="#e7ebee" fill-rule="evenodd" stroke="#111" stroke-width="0.12"/><text x="38" y="'+(y-1)+'" font-size="3">'+esc(name)+' · '+t.toFixed(2)+' mm thick</text><text x="38" y="'+(y+3)+'" font-size="2.3">'+(i<2?'Make one each; identical profiles':i===2?'Pivot Ø1.60; drive slot 1.20 wide':'Two holes Ø1.60')+'</text>';
 reports.push({name,contours:outlines.length,areaMM2:area,thicknessMM:t,projectionMatchesSolid:true,volumeDifferenceMM3:area*t-volume});
}
svg+='<path d="M8 89 H28 M8 87 V91 M28 87 V91" stroke="black" stroke-width="0.15" fill="none"/><text x="10" y="96" font-size="2.8">20 mm</text><text x="38" y="91" font-size="2.5">Allow for tool kerf and finish to the line.</text></g></svg>';
fs.writeFileSync(root+'/sheet-templates.svg',svg);fs.writeFileSync(root+'/template-checks.json',JSON.stringify(reports,null,2));
console.log('Exported 5 inspection STLs, 3 render scenes and a 1:1 sheet template.');
