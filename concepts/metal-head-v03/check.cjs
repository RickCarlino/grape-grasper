const fs=require('fs'),j=require('@jscad/modeling'),m=require('./metal-head.js');
const vol=g=>Math.abs(j.measurements.measureVolume(g));
const overlap=(a,b)=>vol(j.booleans.intersect(a,b));
const notes=[],failures=[];
const baseline=m.namedParts(0);
for(const p of baseline)if(!Number.isFinite(vol(p.g))||vol(p.g)<1e-8)failures.push({empty:p.name,id:p.id});
const fixed=baseline.filter(p=>!['moving-jaw','rod'].includes(p.name));
for(let a=0;a<=35;a++){
 const jaw=m.rotateJaw(m.movingJaw(),a),wire=m.wire(a);
 for(const p of fixed){for(const [name,g] of [['jaw',jaw],['wire',wire]]){const v=overlap(g,p.g);if(v>1e-4)failures.push({angle:a,a:name,b:p.id||p.name,volume:v})}}
 const v=overlap(jaw,wire);if(v>1e-4)failures.push({angle:a,a:'jaw',b:'wire',volume:v});
 const q=m.pinX(a),back=[q*Math.cos(-a*Math.PI/180)-(m.M.rodY-m.M.pivotY)*Math.sin(-a*Math.PI/180),m.M.pivotY+q*Math.sin(-a*Math.PI/180)+(m.M.rodY-m.M.pivotY)*Math.cos(-a*Math.PI/180)];
 const u=m.SLOT_B.map((v,i)=>v-m.SLOT_A[i]),length=Math.hypot(...u),dist=Math.abs(u[0]*(back[1]-m.SLOT_A[1])-u[1]*(back[0]-m.SLOT_A[0]))/length;
 if(dist>1e-7)failures.push({angle:a,slotError:dist});
}
for(let i=0;i<fixed.length;i++)for(let k=i+1;k<fixed.length;k++){const v=overlap(fixed[i].g,fixed[k].g);if(v>1e-4)failures.push({fixedA:fixed[i].id||fixed[i].name,fixedB:fixed[k].id||fixed[k].name,volume:v})}
const nose=baseline.filter(p=>p.name!=='tube'&&p.name!=='rod');
const vertices=nose.flatMap(p=>j.geometries.geom3.toPolygons(p.g).flatMap(p=>p.vertices));
const r=Math.max(...vertices.map(p=>Math.hypot(p[1],p[2]))),bb=[0,1].map(end=>[0,1,2].map(axis=>(end?Math.max:Math.min)(...vertices.map(p=>p[axis]))));
const report={status:failures.length?'FAIL':'PASS',samples:36,rodStroke:m.pinX(35)-m.pinX(0),handleStroke:m.M.stroke,closedHeadEnvelopeDiameter:2*r,closedHeadBounds:bb,tipOpeningAtX13:13*Math.sin(35*Math.PI/180)+m.M.pivotY*(1-Math.cos(35*Math.PI/180)),failures,limitations:['Nominal geometry; no strength, friction or wear validation.','Z bend in actual music wire needs a forming trial.','Flush rivet retention is a modeled envelope, not a proven assembly process.','Tube bore and sheet stock must be measured; handle end of wire must be re-formed.']};
report.sourceSHA256=require('crypto').createHash('sha256').update(fs.readFileSync(__dirname+'/metal-head.js')).digest('hex');fs.writeFileSync(__dirname+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
