// Check geometry, assembly access, and hardware clearances independently of preview views.
const fs=require('fs'),crypto=require('crypto'),j=require('@jscad/modeling'),m=require('../precision-grasper');
const old=require('./fixtures/head-v02.json');
const {subtract,intersect}=j.booleans,{translate}=j.transforms;
const vol=g=>Math.abs(j.measurements.measureVolume(g)),over=(a,b)=>vol(intersect(a,b));
const failures=[],motion=[],nutInsertion=[],clampScrews=[];
const assertClear=(name,mm3,at)=>{if(mm3>1e-3)failures.push({name,at,mm3})};
const fixed=m.fixedGrip(),cap=m.tubeCap(),lever=m.squeezeLever(),washer=m.pivotWasher();
const shift=[m.D.headX,2.14,m.D.wireZ];
const tube=subtract(m.tubeAlongX(40,156,0,m.D.wireZ,3.175),m.tubeAlongX(39,157,0,m.D.wireZ,2.82));
const fixedHardware=[...m.m3Bolt(0,15,16),...m.m3Bolt(49,-7,15.3),...m.m3Bolt(49,7,15.3),washer];
for(let a=0;a<=20;a+=.25){
 const moving=m.leverPose(lever,a),wire=m.wire(a),head=m.headParts(a).map(g=>translate(shift,g));
 const screws=m.clampHardware().map(g=>m.leverPose(g,a));
 const row={opening:a,
  leverFrame:Math.max(over(moving,fixed),over(moving,cap)),
  wireHandle:Math.max(...[fixed,cap,moving].map(g=>over(wire,g))),
  wireTube:over(wire,tube),wireHead:Math.max(...head.map(g=>over(wire,g))),
  headMovingFixed:Math.max(...[0,1,4].flatMap(i=>[2,3].map(k=>over(head[i],head[k])))),
  screwFrame:Math.max(...screws.flatMap(g=>[fixed,cap].map(f=>over(g,f)))),
  screwLever:Math.max(...screws.map(g=>over(g,moving))),
  pivotAndMountHardware:Math.max(...fixedHardware.flatMap(g=>[fixed,cap,moving].map(f=>over(g,f))))};
 for(const [name,v]of Object.entries(row))if(name!=='opening')assertClear(name,v,a);
 const clampX=m.D.crank*Math.sin(m.leverAngle(a));
 if(Math.abs(clampX-(m.stroke(a)-m.D.stroke/2))>1e-9)failures.push({name:'stroke',a});
 motion.push(row);
}
// Nut must be loadable from outside the lever, not merely fit once trapped inside.
const nut=m.clampHardware()[1];
for(let x=-10;x<=0;x+=.25){const mm3=over(translate([x,0,0],nut),lever);nutInsertion.push({x,mm3});assertClear('nutInsertion',mm3,x)}
for(const length of [8,12]){
 m.D.screwLength=length;let worst=0;
 for(let z=0;z<=6;z+=.5)worst=Math.max(worst,over(translate([0,0,z],m.clampHardware()[0]),lever));
 clampScrews.push({length_mm:length,insertion_overlap_mm3:worst});assertClear('clampScrewInsertion',worst,length);
}
m.D.screwLength=12;
const headUnchanged=['noseHalf','jawHalf','fixedJaw'].map(name=>({name,added:vol(subtract(m[name](),old[name])),removed:vol(subtract(old[name],m[name]()))}));
for(const h of headUnchanged)if(h.added+h.removed>1e-3)failures.push(h);
const layout=m.layout();for(let a=0;a<layout.length;a++)for(let b=a+1;b<layout.length;b++)assertClear('layout',over(layout[a],layout[b]),[a,b]);
const stops=[-1,21].map(a=>({opening:a,contact_mm3:over(m.leverPose(lever,a),fixed)}));
for(const stop of stops)if(stop.contact_mm3<.01)failures.push({stop});
const report={status:failures.length?'FAIL':'PASS',sampleStep_degrees:.25,nominalMechanicalAdvantage:m.D.finger/m.D.crank,rodTravel_mm:m.D.stroke,leverSwing_degrees:(m.leverAngle(20)-m.leverAngle(0))*180/Math.PI,fingerTravel_mm:m.D.stroke*m.D.finger/m.D.crank,freeWireLength_mm:[m.D.tubeStart-m.D.stroke/2,m.D.tubeStart+m.D.stroke/2],pivotWasher_mm:m.D.gap,stops,nutInsertion,clampScrews,motion,headUnchanged,failures,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(__dirname+'/../precision-grasper.js')).digest('hex'),physicalValidation:'Handle not printed. Hardware tolerances, wire grip, bending fatigue and stop strength remain untested. The curved wire is illustrative, not a structural simulation.'};
fs.writeFileSync(__dirname+'/../motion-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,samples:motion.length,nutInsertionPositions:nutInsertion.length,clampScrews,failures},null,2));if(failures.length)process.exitCode=1;
