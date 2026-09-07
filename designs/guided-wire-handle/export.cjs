// Emit source-derived sections and colored views for the build script.
const fs=require('fs'),path=require('path'),j=require('@jscad/modeling'),m=require('./guided-wire-grasper');
const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
const p=m.partsPlan();
fs.writeFileSync(path.join(out,'recipe.json'),JSON.stringify({dimensions:m.D,sections:Object.fromEntries(Object.entries(p.sections).map(([k,g])=>[k,j.geometries.geom2.toOutlines(g)])),plans:p.plans,parts:m.HANDLE_NAMES.map((n,i)=>({name:n,volume:j.measurements.measureVolume(m.buildPart(n)),bounds:j.measurements.measureBoundingBox(m.printParts()[i])}))}));
const meshes=geoms=>geoms.filter(g=>j.geometries.geom3.toPolygons(g).length).map(g=>({color:g.color||[.5,.5,.5],triangles:j.geometries.geom3.toPolygons(g).flatMap(p=>p.vertices.slice(2).map((v,i)=>[p.vertices[0],p.vertices[i+1],v]))}));
let views={assembly:m.main({view:'assembly',travel:0}),handle:m.main({view:'handle'}),layout:m.main({view:'layout'}),uncovered:m.main({view:'cutaway'})};
// Actual CAD section: cut away front wall and half of the clamp to expose the wire.
for(const a of [0,6]){
 const groups=[...m.handleParts(a).filter((g,i)=>i!==1),m.tube(),m.wire(a)];
 views['section-'+a]=groups.map(g=>j.colors.colorize(g.color,j.booleans.subtract(g,
 j.primitives.cuboid({size:[90,150,90],center:[40,-75,20]}),
 j.primitives.cuboid({size:[200,100,100],center:[0,-64,20]}),
 j.primitives.cuboid({size:[200,100,100],center:[0,77,20]}),
 j.primitives.cuboid({size:[200,200,100],center:[132,0,20]}))));
}
fs.writeFileSync(path.join(out,'views.json'),JSON.stringify(Object.fromEntries(Object.entries(views).map(([n,g])=>[n,meshes(g)]))));
console.log('Exported source sections and six CAD views.');
