// PRECISION GRASPER v0.1 - benchtop prototype, dimensions in mm.
// Six unique printed parts, including mirrored stationary halves.
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
function getParameterDefinitions () { return [
  { name:'view', type:'choice', values:['assembly','printed','layout','nose-a','nose-b','trigger','jaw','handle-a','handle-b'], captions:['Working assembly (hardware shown)','Printed parts only','Print layout - six parts','Nose A','Nose B','Trigger','Moving jaw','Handle A','Handle B'], initial:'assembly' },
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
  // Side cheek carries hinge; the lower finger bridges around the crank.
  const cheek=union(link([-17,P.tubeY],[0,3],5.5),disk(0,3,5))
  const finger=union(link([-18,-9],[6,-10.5],2.5),link([6,-10.5],[10,-2],2),link([10,-2],[16,-2],2))
  let g=union(collar(-18),plate(cheek,3.2,3),plate(finger,0,3.2),plate(link([-18,P.tubeY],[-18,-9],4),0,P.half))
  g=subtract(g,tubeAlongX(-28,-10,P.tubeY,0,(P.tubeOD+0.3)/2),hole(0,3,P.pin/2),hole(-18,P.tubeY-7,P.pin/2),hole(-18,P.tubeY+7,P.pin/2))
  // Narrow the last 8 mm to a 3 mm total tip width.
  g=subtract(g,box([12,12,10],[17,-2,6.5]))
  return subtract(g,linkAccess(),tubeAlongX(-28,31,P.tubeY,0,1.2))
}
function crankSlot(g){return subtract(g,hole(0,3,P.pin/2),hole(0,-4,P.linkPin/2),box([18,8,1.5],[0,-3.8,0]))}
function trigger(){
  const shape=union(link([0,3],[0,-34],4.8),disk(0,-47,12),link([0,-34],[0,-47],6),disk(0,3,8.5))
  const stopSlot=union(...Array.from({length:21},(_,i)=>{const a=(70+i)*Math.PI/180;return hole(6*Math.cos(a),3+6*Math.sin(a),P.pin/2)}))
  return crankSlot(subtract(plate(shape,-3,6),hole(0,-47,9),stopSlot))
}
function jaw(){
  const outline=union(link([0,3],[0,-4],3.4),hull(disk(1,2,2),disk(16,1.5,1.5)))
  let g=crankSlot(plate(outline,-3,6))
  g=subtract(g,box([12,12,10],[17,2,6.5]),box([12,12,10],[17,2,-6.5]))
  return g
}
function flatHalf(g){return translate([0,0,P.half],rotateX(Math.PI,g))}
function printParts(){
  const a=flatHalf(handleHalf()), b=flatHalf(noseHalf()), ar=translate([0,0,P.half],mirrorZ(handleHalf())), br=translate([0,0,P.half],mirrorZ(noseHalf()))
  return [translate([32,15,0],a),translate([112,68,0],ar),translate([169,68,3],trigger()),
    translate([35,100,0],b),translate([98,96,0],br),translate([169,100,3],jaw())]
}
function hardware(angle){
  const a=angle*Math.PI/180, dx=7*Math.sin(a), cy=3-7*Math.cos(a), wireY=cy+1.65
  const tube=subtract(tubeAlongX(12,128,P.tubeY,0,P.tubeOD/2),tubeAlongX(11,129,P.tubeY,0,P.tubeID/2))
  const rod=tubeAlongX(dx,140+dx,wireY,0,0.5)
  const eye=x=>plate(subtract(disk(x,cy,2.15),disk(x,cy,1.15)),-0.5,1)
  const pins=[hole(0,9,1.5,17),hole(0,3,1.5,17),hole(140,3,1.5,17),hole(dx,cy,1,10),hole(140+dx,cy,1,10)]
  const bolts=[[18,P.tubeY-7],[18,P.tubeY+7],[-20,-28],[122,P.tubeY-7],[122,P.tubeY+7]].map(([x,y])=>hole(x,y,1.5,17))
  return [colorize([0.66,0.7,0.74],tube),colorize([0.94,0.72,0.24],union(rod,eye(dx),eye(140+dx))),...pins.concat(bolts).map(g=>colorize([0.48,0.5,0.53],g))]
}
function main(params={}){
  const view=params.view||'assembly', opening=Number(params.opening===undefined?20:params.opening)
  if(view==='layout')return printParts().map((g,i)=>colorize(i===2||i===5?[1,0.5,0.18]:[0.21,0.45,0.48],g))
  if(view==='handle-a')return flatHalf(handleHalf())
  if(view==='handle-b')return translate([0,0,P.half],mirrorZ(handleHalf()))
  if(view==='nose-a')return flatHalf(noseHalf())
  if(view==='nose-b')return translate([0,0,P.half],mirrorZ(noseHalf()))
  if(view==='trigger')return translate([0,0,3],trigger())
  if(view==='jaw')return translate([0,0,3],jaw())
  const h=handleHalf(), n=noseHalf()
  const parts=[colorize([0.18,0.39,0.43],h),colorize([0.25,0.48,0.5],mirrorZ(h)),
    colorize([1,0.48,0.16],pose(trigger(),opening)),
    colorize([0.18,0.39,0.43],translate([140,0,0],n)),colorize([0.25,0.48,0.5],translate([140,0,0],mirrorZ(n))),
    colorize([1,0.48,0.16],pose(jaw(),opening,140))]
  return view==='printed'?parts:parts.concat(hardware(opening))
}
module.exports={main,getParameterDefinitions,P,handleHalf,noseHalf,trigger,jaw,pose,printParts}
