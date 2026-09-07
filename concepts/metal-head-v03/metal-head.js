// METAL GRASPER HEAD v0.3 — dimensional mechanism concept, mm.
// A filed slot in a 1 mm metal jaw is driven by the Z-bent end of the existing wire.
// Nominal geometry only: measure purchased stock and bench-test bends, pins and grip.
const j = require('@jscad/modeling')
const {circle, polygon, cylinder, cuboid, sphere} = j.primitives
const {union, subtract, intersect} = j.booleans
const {hull} = j.hulls
const {extrudeLinear} = j.extrusions
const {translate, rotateX, rotateY, rotateZ} = j.transforms
const {colorize} = j.colors
const {measureBoundingBox} = j.measurements
const M = {tubeOD:6.35, tubeID:5.64, insertOD:5.50, sheet:0.80,
  inside:1.90, jaw:1.00, pivotY:0.80, pin:1.50, pinHole:1.60,
  rod:1.00, rodY:-0.80, rodZ:-1.30, bend:0.70,
  slot:1.20, qClosed:-4.00, maxOpening:35, stroke:7*Math.sin(20*Math.PI/180),
  tubeEnd:-8.00, insertRear:-17.0, insertFront:-5.5, tip:14.0}
const COLORS={ 'cheek-a':[.20,.57,.78], 'cheek-b':[.19,.72,.62],
 'moving-jaw':[.95,.56,.16], 'fixed-jaw':[.66,.43,.81], insert:[.77,.65,.38],
 tube:[.66,.71,.76], rod:[.85,.33,.31], pivot:[.89,.79,.43], spacers:[.47,.54,.64] }
const rad=d=>d*Math.PI/180
const disk=(x,y,r)=>circle({center:[x,y],radius:r,segments:48})
const capsule=(a,b,r)=>hull(disk(...a,r),disk(...b,r))
const plate=(s,z,t)=>translate([0,0,z],extrudeLinear({height:t},s))
const zpin=(x,y,r,h,z=0)=>cylinder({radius:r,height:h,center:[x,y,z],segments:48})
const tubeX=(x1,x2,y,z,r)=>translate([(x1+x2)/2,y,z],rotateY(Math.PI/2,cylinder({radius:r,height:x2-x1,segments:64})))
const paint=(name,g)=>colorize(COLORS[name]||[.6,.6,.6],g)
const turnPoint=(p,a)=>[p[0]*Math.cos(a)-(p[1]-M.pivotY)*Math.sin(a),M.pivotY+p[0]*Math.sin(a)+(p[1]-M.pivotY)*Math.cos(a)]
const rotateJaw=(g,a)=>translate([0,M.pivotY,0],rotateZ(rad(a),translate([0,-M.pivotY,0],g)))
const SLOT_A=[M.qClosed,M.rodY]
const SLOT_B=turnPoint([M.qClosed+M.stroke,M.rodY],-rad(M.maxOpening))
// The pin intersects a straight slot rotated with the jaw. All views use this one constraint.
function pinX(opening){
 const a=turnPoint(SLOT_A,rad(opening)),b=turnPoint(SLOT_B,rad(opening))
 return a[0]+(M.rodY-a[1])*(b[0]-a[0])/(b[1]-a[1])
}
function openingForStroke(travel){let lo=0,hi=M.maxOpening;for(let k=0;k<45;k++){const mid=(lo+hi)/2;if(pinX(mid)<M.qClosed+travel)lo=mid;else hi=mid}return (lo+hi)/2}
function cheekOutline(){return union(
 capsule([-6.75,.80],[0,M.pivotY],1.10),
 capsule([-6.75,.80],[2.5,-1.05],1.05),
 capsule([2.5,-1.05],[5,-1.05],1.10))}
const PIN_CENTERS=[[-6.75,.80],[0,M.pivotY],[2.5,-1.05],[5,-1.05]]
function cheek(side=1){
 let g=plate(cheekOutline(),side>0?M.inside:-M.inside-M.sheet,M.sheet)
 return subtract(g,...PIN_CENTERS.map(([x,y])=>zpin(x,y,M.pinHole/2,12)))
}
function movingOutline(){
 const blade=polygon({points:[[0,.10],[3,0],[13.6,0],[14,.4],[14,.7],[13.6,1.1],[2,1.5],[0,1.9]]})
 return union(capsule(SLOT_A,SLOT_B,.95),hull(disk(...SLOT_B,.95),disk(0,M.pivotY,1.10)),blade)
}
function movingJaw(){
 const v=[SLOT_B[0]-SLOT_A[0],SLOT_B[1]-SLOT_A[1]],l=Math.hypot(...v)
 const a=SLOT_A.map((x,i)=>x-.12*v[i]/l),b=SLOT_B.map((x,i)=>x+.12*v[i]/l)
 return subtract(plate(movingOutline(),-M.jaw/2,M.jaw),zpin(0,M.pivotY,M.pinHole/2,10),plate(capsule(a,b,M.slot/2),-3,6))
}
function fixedOutline(){return union(capsule([2.5,-1.05],[5,-1.05],1.05),polygon({points:[[2,-1.3],[12.9,-1.3],[14.3,-.6],[14.3,-.25],[14.05,0],[3,0]]}))}
function fixedJaw(){return subtract(plate(fixedOutline(),-M.jaw/2,M.jaw),...[[2.5,-1.05],[5,-1.05]].map(([x,y])=>zpin(x,y,M.pinHole/2,8)))}
function insert(){
 let g=tubeX(M.insertRear,M.insertFront,0,0,M.insertOD/2)
 // File two parallel flats on the exposed 2.5 mm nose; flat sheet cheeks seat here.
 g=subtract(g,cuboid({size:[3.0,8,5],center:[-6.75,0,M.inside+2.5]}),cuboid({size:[3.0,8,5],center:[-6.75,0,-M.inside-2.5]}))
 return subtract(g,tubeX(-18,-5,M.rodY,M.rodZ,.60),zpin(-13,.80,M.pinHole/2,10),zpin(-6.75,.80,M.pinHole/2,10))
}
function shaft(length=26){return subtract(tubeX(M.tubeEnd-length,M.tubeEnd,0,0,M.tubeOD/2),tubeX(M.tubeEnd-length-1,M.tubeEnd+1,0,0,M.tubeID/2),zpin(-13,.80,M.pinHole/2,12))}
function segment3(a,b,r){
 const d=b.map((x,i)=>x-a[i]),len=Math.hypot(...d),az=Math.atan2(d[1],d[0]),pol=Math.acos(d[2]/len)
 return translate(a.map((x,i)=>(x+b[i])/2),rotateZ(az,rotateY(pol,cylinder({radius:r,height:len,segments:24}))))
}
function sweptWire(points){return union(...points.slice(1).map((b,i)=>segment3(points[i],b,M.rod/2)),...points.slice(1,-1).map(p=>sphere({radius:M.rod/2,center:p,segments:16})))}
function wire(opening,length=26){
 const q=pinX(opening),r=M.bend,z=M.rodZ,y=M.rodY
 // Z bend: two smooth 90-degree bends flank a 1.2 mm straight cam pin.
 const p=[[M.tubeEnd-length-2+(q-M.qClosed),y,z],[q-r,y,z]]
 for(let i=1;i<=12;i++){const a=-Math.PI/2+i*Math.PI/24;p.push([q-r+r*Math.cos(a),y,z+r+r*Math.sin(a)])}
 p.push([q,y,-z-r])
 for(let i=1;i<=12;i++){const a=Math.PI-i*Math.PI/24;p.push([q+r+r*Math.cos(a),y,-z-r+r*Math.sin(a)])}
 p.push([q+2.7,y,-z])
 return sweptWire(p)
}
function spacers(){return [0,1].flatMap(i=>{
 const [x,y]=[[2.5,-1.05],[5,-1.05]][i],t=M.inside-M.jaw/2
 return [-1,1].map(s=>subtract(zpin(x,y,1.05,t,s*(M.jaw/2+t/2)),zpin(x,y,M.pinHole/2,12)))
})}
function pivotSpacers(){const t=M.inside-M.jaw/2-.10;return [-1,1].map(s=>subtract(zpin(0,M.pivotY,1.05,t,s*(M.inside-t/2)),zpin(0,M.pivotY,M.pinHole/2,12)))}
function pins(){return [...PIN_CENTERS.map(([x,y])=>zpin(x,y,M.pin/2,2*(M.inside+M.sheet))),intersect(zpin(-13,.80,M.pin/2,8),tubeX(-14,-12,0,0,M.tubeOD/2))]}
function namedParts(opening=35,length=26){return [
 {name:'cheek-a',g:cheek(1)},{name:'cheek-b',g:cheek(-1)},
 {name:'moving-jaw',g:rotateJaw(movingJaw(),opening)},{name:'fixed-jaw',g:fixedJaw()},
 {name:'insert',g:insert()},{name:'tube',g:shaft(length)},{name:'rod',g:wire(opening,length)},
 ...pins().map((g,i)=>({name:'pivot',id:'pin-'+i,g})),
 ...spacers().concat(pivotSpacers()).map((g,i)=>({name:'spacers',id:'spacer-'+i,g}))]}
function flat(g){const b=measureBoundingBox(g);return translate([-b[0][0],-b[0][1],-b[0][2]],g)}
function layout(){return [cheek(1),cheek(-1),movingJaw(),fixedJaw()].map((g,i)=>paint(['cheek-a','cheek-b','moving-jaw','fixed-jaw'][i],translate([0,i*8,0],flat(g))))}
function getParameterDefinitions(){return [
 {name:'view',type:'choice',values:['head','mechanism','exploded','closed','stock-layout','cheek-a','cheek-b','moving-jaw','fixed-jaw','insert','full-shaft'],captions:['Metal head assembly','Mechanism — front cheek removed','Exploded head','Closed head + 8 mm hole gauge','Flat sheet parts','Side plate A — 0.8 mm','Side plate B — 0.8 mm','Slotted jaw — 1 mm','Fixed jaw — 1 mm','Filed metal tube insert','Head with full 116 mm shaft'],initial:'head'},
 {name:'opening',type:'slider',min:0,max:35,step:1,initial:35,caption:'Jaw opening (degrees)'}]}
function main(params={}){
 const v=params.view||'head',a=Math.max(0,Math.min(35,Number(params.opening??35)))
 if(v==='stock-layout')return layout()
 const individual={'cheek-a':()=>cheek(1),'cheek-b':()=>cheek(-1),'moving-jaw':movingJaw,'fixed-jaw':fixedJaw,insert}
 if(individual[v])return paint(v,flat(individual[v]()))
 let parts=namedParts(v==='closed'?0:a,v==='full-shaft'?116:26)
 if(v==='mechanism')parts=parts.filter(p=>!['cheek-a'].includes(p.name)&&!(p.name==='pivot'&&p.id!=='pin-4')&&p.name!=='spacers')
 if(v==='exploded')parts=parts.filter(p=>p.name!=='rod').map(p=>{
 let z=0,y=0;if(p.name==='cheek-a')z=8;if(p.name==='cheek-b')z=-8
 if(p.name==='moving-jaw')y=7;if(p.name==='fixed-jaw')y=-6
 if(p.name==='pivot')z=12;if(p.name==='spacers')z=Math.sign(measureBoundingBox(p.g)[0][2])*5
 return {...p,g:translate([0,y,z],p.g)}
 })
 const result=parts.map(p=>paint(p.name,p.g))
 if(v==='closed')result.push(colorize([.72,.77,.80,.25],subtract(tubeX(17,18.5,0,0,6),tubeX(16,20,0,0,4))))
 return result
}
module.exports={main,getParameterDefinitions,M,COLORS,SLOT_A,SLOT_B,pinX,openingForStroke,cheek,movingJaw,fixedJaw,insert,shaft,wire,rotateJaw,namedParts,layout,cheekOutline,movingOutline,fixedOutline,pins,spacers,pivotSpacers}
