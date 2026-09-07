// Precision Grasper — direct-clamp lever handle, dimensions in mm.
// Three printed handle pieces. The wire clamps directly in the moving lever.
const j = require('@jscad/modeling')
const {circle,cuboid,cylinder,polygon,sphere}=j.primitives
const {union,subtract,hull}= {...j.booleans,...j.hulls}
const {extrudeLinear}=j.extrusions
const {translate,rotateY,rotateZ,rotateX,mirrorZ}=j.transforms
const {colorize}=j.colors
const P={tubeOD:6.35,tubeID:5.64,tubeY:-2.14,pin:3.25,linkPin:2.25}
const H={outer:4.7,inner:2.3,jawHalf:2.0,wireSlot:1.5,clampY:6}
const D={crank:15,finger:65,stroke:7*Math.sin(20*Math.PI/180),wireZ:7.4,
 base:5,gap:.5,lever:6,tubeStart:40,tubeLength:116,headX:168,screwLength:12}
const C={'fixed-grip':[.21,.31,.55],'squeeze-lever':[.95,.55,.16],'tube-cap':[.65,.52,.84],
 'nose-a':[.13,.54,.8],'nose-b':[.11,.68,.60],'jaw-a':[.92,.37,.39],'jaw-b':[.93,.78,.24],'fixed-jaw':[.7,.31,.62]}
const HEAD_NAMES=['nose-a','nose-b','jaw-a','jaw-b','fixed-jaw']
const HANDLE_NAMES=['fixed-grip','squeeze-lever','tube-cap']
const disk=(x,y,r)=>circle({center:[x,y],radius:r,segments:48})
const link=(a,b,r)=>hull(disk(...a,r),disk(...b,r))
const plate=(s,z,h)=>translate([0,0,z],extrudeLinear({height:h},s))
const box=(size,center)=>cuboid({size,center})
const hole=(x,y,r,h=50)=>cylinder({radius:r,height:h,center:[x,y,0],segments:40})
const paint=(n,g)=>colorize(C[n],g)
function tubeAlongX(a,b,y,z,r){return translate([(a+b)/2,y,z],rotateY(Math.PI/2,cylinder({height:b-a,radius:r,segments:64})))}
const pose=(g,a)=>translate([0,3,0],rotateZ(a*Math.PI/180,translate([0,-3,0],g)))
const linkAccess=()=>plate(hull(disk(0,-4,3.2),disk(2.395,-3.578,3.2)),-15,30)
// Shared v0.2 head geometry follows. No original handle geometry is retained.
function noseHalf(){
  // Every point in this cheek has an outer face at H.outer: no floating finger.
  const cheek=link([-17,P.tubeY],[0,3],4.2)
  const rail=union(link([-18,-6],[6,-8.5],2.4),link([6,-8.5],[11,-4],2.4))
  const clamp=box([14,18,H.outer],[-18,P.tubeY,H.outer/2])
  // Fill the rear triangular window in the 2.4 mm cheek plate on both sides.
  // Keep the central rod passage and swept linkage-fastener access below.
  const web=polygon({points:[[-14,-7],[0,-9],[0,3],[-14,1]]})
  let g=union(plate(union(cheek,rail,web),H.inner,H.outer-H.inner),clamp)
  g=subtract(g,tubeAlongX(-26,-10,P.tubeY,0,(P.tubeOD+0.3)/2),hole(0,3,P.pin/2),
    hole(-18,P.tubeY-H.clampY,P.pin/2),hole(-18,P.tubeY+H.clampY,P.pin/2),
    hole(6,-8.5,P.linkPin/2),hole(11,-4,P.linkPin/2))
  return subtract(g,linkAccess(),tubeAlongX(-28,7,P.tubeY,0,1.2))
}
function fixedJaw(){
  // Separate full-thickness insert bridges the cheeks after printing, not in air.
  const tip=polygon({points:[[10,-6],[17,-4.8],[18,-3.8],[18,-1],[17,0],[12,0],[10,-2]]})
  const shape=union(link([6,-8.5],[11,-4],2.4),tip)
  return subtract(plate(shape,-H.inner,2*H.inner),hole(6,-8.5,P.linkPin/2),hole(11,-4,P.linkPin/2))
}
function jawHalf(){
  const tip=polygon({points:[[10,0],[16,0],[17,1],[17,2],[16,3],[10,3]]})
  const outline=union(link([0,3],[0,-4],3.4),hull(disk(1,2,2),tip))
  // Two halves meet at Z=0; their open top pockets create the wire slot.
  return subtract(plate(outline,0,H.jawHalf),hole(0,3,P.pin/2),hole(0,-4,P.linkPin/2),
    box([18,8,H.wireSlot],[0,-3.8,0]))
}
function jaw(){return union(jawHalf(),mirrorZ(jawHalf()))}
const hex=(af,phase=30)=>polygon({points:Array.from({length:6},(_,i)=>{
 const a=(phase+60*i)*Math.PI/180;return [af/Math.sqrt(3)*Math.cos(a),af/Math.sqrt(3)*Math.sin(a)]})})
function stroke(a){return 7*Math.sin(a*Math.PI/180)}
function leverAngle(a){return Math.asin((stroke(a)-D.stroke/2)/D.crank)}
function leverPose(g,a){return translate([0,D.crank,D.gap-.4],rotateZ(leverAngle(a),translate([0,-D.crank,0],g)))}
function leverShape(){return union(disk(0,D.crank,7),link([0,D.crank],[0,-42],4),disk(0,-50,12),disk(0,0,5))}
function leverSections(){
 const pivotHole=circle({center:[0,D.crank],radius:1.625,segments:40})
 const fingerHole=circle({center:[0,-50],radius:9,segments:40})
 const base=subtract(leverShape(),pivotHole,fingerHole)
 const bore=circle({radius:1.15,segments:48})
 const passage=polygon({points:[[-7,-1.1],[-1.1,-.65],[1.1,-.65],[7,-1.1],[7,1.1],[1.1,.65],[-1.1,.65],[-7,1.1]]})
 // Side entry reaches beyond the lever edge; the nut slides along X.
 const nutSlot=union(hex(4.2,0),polygon({points:[[-7,-2.1],[0,-2.1],[0,2.1],[-7,2.1]]}))
 const pivotRing=subtract(disk(0,D.crank,7),pivotHole)
 return {base,passage,bore,nutSlot,pivotRing,clampRing:subtract(disk(0,0,5),bore)}
}
const LEVER_LAYERS=[
 {add:['base'],cut:[],z:5.4,h:1.5},
 {add:['base'],cut:['passage'],z:6.9,h:1},
 {add:['base'],cut:['passage','bore'],z:7.9,h:.3},
 {add:['base'],cut:['bore'],z:8.2,h:.1},
 {add:['base'],cut:['nutSlot','bore'],z:8.3,h:1.8},
 {add:['base'],cut:['bore'],z:10.1,h:1.3},
 {add:['pivotRing','clampRing'],cut:[],z:11.4,h:3},
 {add:['pivotRing'],cut:[],z:14.4,h:1}]
function leverLayers(){const s=leverSections();return LEVER_LAYERS.map(p=>{
 let shape=p.add.length===1?s[p.add[0]]:union(...p.add.map(n=>s[n]))
 if(p.cut.length)shape=subtract(shape,...p.cut.map(n=>s[n]))
 return {...p,shape}
})}
function squeezeLever(){return union(...leverLayers().map(p=>plate(p.shape,p.z,p.h)))}

function stopX(){const cy=15-Math.sqrt(225-(D.stroke/2)**2);return D.stroke/2+Math.sqrt(25-(3-cy)**2)}
function fixedGrip(){
 const outline=union(link([0,15],[-23,-28],5),link([-23,-28],[-34,-50],5),disk(-34,-50,13.5),disk(0,15,8),link([0,15],[49,0],5),link([0,15],[0,3],5),polygon({points:[[-9,0],[9,0],[9,6],[-9,6]]}))
 let g=union(plate(outline,0,5),box([18,21,7.4],[49,0,3.7]))
 // Two integral stops contact the lever's circular clamp boss at the end of travel.
 for(const s of [-1,1])g=union(g,box([3,2,5],[s*(stopX()+1.5),4,7.5]))
 return subtract(g,hole(-34,-50,10),hole(0,15,1.625),hole(49,-7,1.625),hole(49,7,1.625),tubeAlongX(39,59,0,D.wireZ,3.325))
}
function tubeCap(){return subtract(box([18,21,7.4],[49,0,11.1]),tubeAlongX(39,59,0,D.wireZ,3.325),hole(49,-7,1.625),hole(49,7,1.625))}
function clampHardware(){
 const bottom=7.9,under=bottom+D.screwLength
 const screw=union(cylinder({radius:1,height:D.screwLength,center:[0,0,bottom+D.screwLength/2],segments:40}),
 subtract(cylinder({radius:1.9,height:2,center:[0,0,under+1],segments:40}),translate([0,0,under+1],extrudeLinear({height:2},hex(1.5)))))
 const nut=subtract(plate(hex(4,0),8.4,1.6),hole(0,0,1))
 return [colorize([.38,.41,.45],screw),colorize([.65,.67,.7],nut)]
}
function m3Bolt(x,y,top){
 const washer=z=>subtract(cylinder({radius:3.5,height:.5,center:[x,y,z],segments:40}),hole(x,y,1.6))
 const screw=union(cylinder({radius:1.5,height:20,center:[x,y,top-10],segments:40}),cylinder({radius:2.75,height:3,center:[x,y,top+1.5],segments:40}))
 const nut=translate([x,y,0],subtract(plate(hex(5.5),-2.9,2.4),hole(0,0,1.5)))
 return [screw,nut,washer(-.25),washer(top-.25)].map(g=>colorize([.54,.57,.6],g))
}
function pivotWasher(){return colorize([.65,.67,.7],subtract(cylinder({radius:3.5,height:D.gap,center:[0,D.crank,D.base+D.gap/2],segments:40}),hole(0,D.crank,1.6)))}
function wirePoints(a){
 const t=leverAngle(a),sx=D.crank*Math.sin(t),sy=D.crank-D.crank*Math.cos(t)
 const hx=D.headX+stroke(a),hy=3-7*Math.cos(a*Math.PI/180)+1.65+2.14
 const m=(hy-sy)/(hx-sx),endY=sy+m*(D.tubeStart-sx),L=D.tubeStart-sx
 // A conservative illustration: the short free wire bends between lever and tube.
 // Physical springback/fatigue are unvalidated; the open mouths allow some angular relief.
 const pts=[]
 for(let i=0;i<=24;i++){const u=i/24,h00=2*u**3-3*u*u+1,h10=u**3-2*u*u+u,h01=-2*u**3+3*u*u,h11=u**3-u*u
  // Keep the wire level in the clamp; begin vertical flex outside the lever.
  const zu=Math.max(0,(sx+u*L-8)/(D.tubeStart-8))
  pts.push([sx+u*L,h00*sy+h10*L*Math.tan(t)+h01*endY+h11*L*m,D.wireZ+(1-zu*zu*(3-2*zu))*(D.gap-.4)])}
 pts.push([hx,hy,D.wireZ]);return pts
}
function wire(a){
 const pts=wirePoints(a),t=leverAngle(a),sx=D.crank*Math.sin(t),sy=D.crank-D.crank*Math.cos(t)
 pts.unshift([sx-7*Math.cos(t),sy-7*Math.sin(t),D.wireZ+D.gap-.4])
 const segments=pts.slice(1).map((p,i)=>hull(sphere({radius:.5,center:pts[i],segments:12}),sphere({radius:.5,center:p,segments:12})))
 const cx=D.headX+stroke(a),cy=3-7*Math.cos(a*Math.PI/180)+2.14
 const eye=plate(subtract(disk(cx,cy,2.15),disk(cx,cy,1.15)),D.wireZ-.5,1)
 return colorize([.87,.34,.30],union(...segments,eye))
}
function headParts(a){return [noseHalf(),mirrorZ(noseHalf()),pose(jawHalf(),a),pose(mirrorZ(jawHalf()),a),fixedJaw()].map((g,i)=>paint(HEAD_NAMES[i],g))}
function assembly(a=20){
 const shift=[D.headX,2.14,D.wireZ]
 const parts=[paint('fixed-grip',fixedGrip()),paint('squeeze-lever',leverPose(squeezeLever(),a)),paint('tube-cap',tubeCap()),...clampHardware().map(g=>leverPose(g,a)),pivotWasher(),...m3Bolt(0,15,16),...m3Bolt(49,-7,15.3),...m3Bolt(49,7,15.3),wire(a)]
 parts.push(colorize([.65,.69,.73],subtract(tubeAlongX(40,156,0,D.wireZ,3.175),tubeAlongX(39,157,0,D.wireZ,2.82))))
 parts.push(...headParts(a).map(g=>translate(shift,g)))
 const hardware=[[0,3,1.5,17],[-18,P.tubeY-6,1.5,17],[-18,P.tubeY+6,1.5,17],[6,-8.5,1,14],[11,-4,1,14],[stroke(a),3-7*Math.cos(a*Math.PI/180),1,10]]
 parts.push(...hardware.map(([x,y,r,h])=>colorize([.5,.53,.56],translate(shift,hole(x,y,r,h)))))
 return parts
}
function handlePrintParts(){return [fixedGrip(),translate([0,0,-5.4],squeezeLever()),translate([0,0,14.8],mirrorZ(tubeCap()))]}
function headPrintParts(){return [translate([27,12,H.outer],rotateX(Math.PI,noseHalf())),translate([75,10,H.outer],mirrorZ(noseHalf())),translate([13,43,H.jawHalf],rotateX(Math.PI,jawHalf())),translate([42,46,H.jawHalf],mirrorZ(jawHalf())),translate([67,48,H.inner],fixedJaw())]}
function normalize(g){const b=j.measurements.measureBoundingBox(g);return translate(b[0].map(v=>-v),g)}
function layout(){const parts=handlePrintParts().map(normalize);return [translate([0,0,0],parts[0]),translate([115,0,0],parts[1]),translate([150,0,0],parts[2])]}
function main(p={}){
 const view=p.view||'assembly',a=Number(p.opening??20);D.screwLength=Number(p.screwLength||12)
 if(view==='layout')return layout().map((g,i)=>paint(HANDLE_NAMES[i],g))
 if(view==='head-layout')return headPrintParts().map((g,i)=>paint(HEAD_NAMES[i],g))
 if(HANDLE_NAMES.includes(view))return paint(view,normalize(handlePrintParts()[HANDLE_NAMES.indexOf(view)]))
 if(HEAD_NAMES.includes(view))return paint(view,normalize(headPrintParts()[HEAD_NAMES.indexOf(view)]))
 if(view==='head')return headParts(a)
 if(view==='clamp'){
 const body=subtract(squeezeLever(),box([40,100,40],[0,58,10]),box([40,100,40],[0,-58,10]),box([40,10,40],[0,-5,10]))
 return [paint('squeeze-lever',body),...clampHardware().map(g=>colorize(g.color,subtract(g,box([40,10,40],[0,-5,10])))),colorize([.87,.34,.30],tubeAlongX(-7,12,0,D.wireZ,.5))]
 }
 const parts=assembly(a)
 if(view==='handle')return parts.map(g=>{const c=g.color||[.5,.5,.5];return colorize(c,subtract(g,box([300,200,100],[212,0,10])))}).filter(g=>j.geometries.geom3.toPolygons(g).length)
 return parts
}
function getParameterDefinitions(){return [
 {name:'view',type:'choice',values:['assembly','handle','clamp','layout','head','head-layout',...HANDLE_NAMES,...HEAD_NAMES],captions:['Full assembly','Lever handle','Direct screw clamp — section','Three handle parts for printing','Existing v2 head','Head print layout','Fixed grip','Squeeze lever','Tube cap','Nose A','Nose B','Jaw A','Jaw B','Fixed jaw'],initial:'handle'},
 {name:'opening',type:'slider',min:0,max:20,step:1,initial:20,caption:'Jaw opening (degrees)'},
 {name:'screwLength',type:'choice',values:[8,12],captions:['M2 × 8 mm clamp screw','M2 × 12 mm clamp screw — existing kit'],initial:12}]}
module.exports={main,getParameterDefinitions,D,C,P,H,HANDLE_NAMES,HEAD_NAMES,noseHalf,jawHalf,fixedJaw,headPrintParts,handlePrintParts,layout,leverSections,LEVER_LAYERS,leverLayers,fixedGrip,squeezeLever,tubeCap,leverPose,leverAngle,stroke,wirePoints,wire,clampHardware,pivotWasher,headParts,tubeAlongX,m3Bolt,pose,assembly}
