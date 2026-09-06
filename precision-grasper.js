// PRECISION GRASPER v0.2 - benchtop prototype, dimensions in mm.
// Reinforced cheek webs; eight distinct preview colors identify the printed parts.
// Tube: 6.35 OD x >=4.8 ID x 116 long. Rod: 1 mm wire, 140 mm eye centres.
const j = require('@jscad/modeling')
const { circle, cuboid, cylinder, polygon } = j.primitives
const { union, subtract } = j.booleans
const { hull } = j.hulls
const { extrudeLinear } = j.extrusions
const { translate, rotateX, rotateY, rotateZ, mirrorZ } = j.transforms
const { colorize } = j.colors
const P = { span:140, tubeOD:6.35, tubeID:5.0, tubeY:-2.14, half:6.2,
  moving:6, sideGap:0.2, pin:3.25, linkPin:2.25, crank:7, maxAngle:20 }
const H = { outer:4.7, inner:2.3, jawHalf:2.0, wireSlot:1.5, clampY:6.0 }
// Preview colors only: the print package still uses a single PLA filament.
const C = {
  'handle-a':[0.21,0.31,0.55], 'handle-b':[0.65,0.52,0.84],
  trigger:[0.95,0.55,0.16], 'nose-a':[0.13,0.54,0.80],
  'nose-b':[0.11,0.68,0.60], 'jaw-a':[0.92,0.37,0.39],
  'jaw-b':[0.93,0.78,0.24], 'fixed-jaw':[0.70,0.31,0.62]
}
const HEAD_NAMES=['nose-a','nose-b','jaw-a','jaw-b','fixed-jaw']
const PART_NAMES=['handle-a','handle-b','trigger',...HEAD_NAMES]
const paint=(name,g)=>colorize(C[name],g)
function getParameterDefinitions () { return [
  { name:'view', type:'choice', values:['assembly','head','printed','layout','head-layout','nose-a','nose-b','jaw-a','jaw-b','fixed-jaw','trigger','handle-a','handle-b'], captions:['Working assembly (hardware shown)','Head close-up','Printed parts only','Print layout - all eight parts','Print only the new head - five parts','Nose A','Nose B','Jaw A','Jaw B','Fixed tip insert','Trigger (unchanged)','Handle A (unchanged)','Handle B (unchanged)'], initial:'assembly' },
  { name:'opening', type:'slider', min:0, max:20, step:1, initial:20, caption:'Jaw opening angle (degrees)' }
] }
const disk=(x,y,r)=>circle({radius:r,center:[x,y],segments:48})
const link=(a,b,r)=>hull(disk(...a,r),disk(...b,r))
const plate=(shape,z,h)=>translate([0,0,z],extrudeLinear({height:h},shape))
const box=(size,center)=>cuboid({size,center})
const hole=(x,y,r,h=30)=>cylinder({radius:r,height:h,center:[x,y,0],segments:40})
function tubeAlongX(x1,x2,y,z,r){return translate([(x1+x2)/2,y,z],rotateY(Math.PI/2,cylinder({radius:r,height:x2-x1,segments:64})))}
function pose(g,angle,x=0){return translate([x,3,0],rotateZ(angle*Math.PI/180,translate([0,-3,0],g)))}
function linkAccess(){return plate(hull(disk(0,-4,3.2),disk(2.395,-3.578,3.2)),-15,30)}
function collar(x){return box([18,20,P.half],[x,P.tubeY,P.half/2])}
function handleHalf(){
  const outline=union(link([0,3],[-24,-34],7),disk(-27,-47,13),link([-24,-34],[-27,-47],7),disk(0,9,3.5))
  let g=union(plate(outline,0,P.half),collar(20),plate(link([0,3],[17,P.tubeY],5.5),0,P.half))
  // Local fork pocket: 0.2 mm clearance each side of trigger.
  g=subtract(g,union(box([19,30,6.4],[-0.5,2,0]),box([44,64,6.4],[12,-45,0])),hole(-27,-47,9.5),hole(0,9,P.pin/2),hole(0,3,P.pin/2),
    tubeAlongX(10,31,P.tubeY,0,(P.tubeOD+0.3)/2),hole(18,P.tubeY-7,P.pin/2),hole(18,P.tubeY+7,P.pin/2),hole(-20,-28,P.pin/2))
  return subtract(g,linkAccess(),tubeAlongX(-28,31,P.tubeY,0,1.2))
}
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
function crankSlot(g){return subtract(g,hole(0,3,P.pin/2),hole(0,-4,P.linkPin/2),box([18,8,1.5],[0,-3.8,0]))}
function trigger(){
  const shape=union(link([0,3],[0,-34],4.8),disk(0,-47,12),link([0,-34],[0,-47],6),disk(0,3,8.5))
  const stopSlot=union(...Array.from({length:21},(_,i)=>{const a=(70+i)*Math.PI/180;return hole(6*Math.cos(a),3+6*Math.sin(a),P.pin/2)}))
  return crankSlot(subtract(plate(shape,-3,6),hole(0,-47,9),stopSlot))
}
function flatHalf(g){return translate([0,0,P.half],rotateX(Math.PI,g))}
function flatHead(g,h){return translate([0,0,h],rotateX(Math.PI,g))}
function headPrintParts(){return [
  translate([27,12,0],flatHead(noseHalf(),H.outer)),
  translate([75,10,0],translate([0,0,H.outer],mirrorZ(noseHalf()))),
  translate([13,43,0],flatHead(jawHalf(),H.jawHalf)),
  translate([42,46,0],translate([0,0,H.jawHalf],mirrorZ(jawHalf()))),
  translate([67,48,H.inner],fixedJaw())]}
function printParts(){
  return [translate([32,15,0],flatHalf(handleHalf())),
    translate([112,68,0],translate([0,0,P.half],mirrorZ(handleHalf()))),
    translate([169,68,3],trigger()),...headPrintParts().map(g=>translate([10,100,0],g))]
}
function hardware(angle){
  const a=angle*Math.PI/180, dx=7*Math.sin(a), cy=3-7*Math.cos(a), wireY=cy+1.65
  const tube=subtract(tubeAlongX(12,128,P.tubeY,0,P.tubeOD/2),tubeAlongX(11,129,P.tubeY,0,P.tubeID/2))
  const rod=tubeAlongX(dx,140+dx,wireY,0,0.5)
  const eye=x=>plate(subtract(disk(x,cy,2.15),disk(x,cy,1.15)),-0.5,1)
  const pins=[hole(0,9,1.5,17),hole(0,3,1.5,17),hole(140,3,1.5,17),hole(dx,cy,1,10),hole(140+dx,cy,1,10)]
  const bolts=[[18,P.tubeY-7],[18,P.tubeY+7],[-20,-28],[122,P.tubeY-H.clampY],[122,P.tubeY+H.clampY]].map(([x,y])=>hole(x,y,1.5,17))
  bolts.push(hole(146,-8.5,1,14),hole(151,-4,1,14))
  return [colorize([0.66,0.7,0.74],tube),colorize([0.94,0.72,0.24],union(rod,eye(dx),eye(140+dx))),...pins.concat(bolts).map(g=>colorize([0.48,0.5,0.53],g))]
}
function main(params={}){
  const view=params.view||'assembly', opening=Number(params.opening===undefined?20:params.opening)
  if(view==='layout')return printParts().map((g,i)=>paint(PART_NAMES[i],g))
  if(view==='head-layout')return headPrintParts().map((g,i)=>paint(HEAD_NAMES[i],g))
  if(view==='handle-a')return paint(view,flatHalf(handleHalf()))
  if(view==='handle-b')return paint(view,translate([0,0,P.half],mirrorZ(handleHalf())))
  if(view==='trigger')return paint(view,translate([0,0,3],trigger()))
  if(view==='nose-a')return paint(view,flatHead(noseHalf(),H.outer))
  if(view==='nose-b')return paint(view,translate([0,0,H.outer],mirrorZ(noseHalf())))
  if(view==='jaw-a')return paint(view,flatHead(jawHalf(),H.jawHalf))
  if(view==='jaw-b')return paint(view,translate([0,0,H.jawHalf],mirrorZ(jawHalf())))
  if(view==='fixed-jaw')return paint(view,translate([0,0,H.inner],fixedJaw()))
  const h=handleHalf(),n=noseHalf(),q=jawHalf()
  const head=[n,mirrorZ(n),pose(q,opening),pose(mirrorZ(q),opening),fixedJaw()]
    .map((g,i)=>paint(HEAD_NAMES[i],g))
  const parts=[paint('handle-a',h),paint('handle-b',mirrorZ(h)),
    paint('trigger',pose(trigger(),opening)),...head.map(g=>translate([140,0,0],g))]
  const hw=hardware(opening)
  if(view==='head')return [...head,...hw.slice(2).filter(g=>j.measurements.measureBoundingBox(g)[0][0]>110).map(g=>translate([-140,0,0],g))]
  return view==='printed'?parts:parts.concat(hw)
}
module.exports={C,HEAD_NAMES,PART_NAMES,main,getParameterDefinitions,P,H,handleHalf,noseHalf,trigger,jaw,jawHalf,fixedJaw,pose,printParts,headPrintParts,hardware}
