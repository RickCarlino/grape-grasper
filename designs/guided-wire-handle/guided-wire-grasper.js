// Guided-wire lever grasper — 6 mm stroke / through-wire revision, dimensions in mm.
// Lever drives a captive linear carriage; the wire stays aligned with a fixed guide.
const j = require('@jscad/modeling')
const {circle,cuboid,cylinder,polygon,sphere}=j.primitives
const {union,subtract,hull}= {...j.booleans,...j.hulls}
const {extrudeLinear}=j.extrusions
const {translate,rotateY,rotateZ,rotateX,mirrorZ}=j.transforms
const {colorize}=j.colors
const P={tubeOD:6.35,tubeID:5.64,tubeY:-2.14,pin:3.25,linkPin:2.25}
const H={outer:4.7,inner:2.3,jawHalf:2.0,wireSlot:1.5,clampY:6}
const D={crank:15,finger:65,stroke:6,wireZ:6.5,
 tubeStart:10,tubeLength:116,headX:138,pivotX:-13,guideStart:8.2,limit:3.2,backlash:.3,driveSide:1,
 tongueEnd:13.6,tongueWidth:3.4,carriageBottom:4.8,driveTip:8.8,legacyStroke:7*Math.sin(20*Math.PI/180)}
const C={'frame':[.21,.31,.55],'lever':[.95,.55,.16],'carriage':[.10,.65,.58],'cover':[.65,.52,.84],
 'nose-a':[.13,.54,.8],'nose-b':[.11,.68,.60],'jaw-a':[.92,.37,.39],'jaw-b':[.93,.78,.24],'fixed-jaw':[.7,.31,.62]}
const HEAD_NAMES=['nose-a','nose-b','jaw-a','jaw-b','fixed-jaw']
const HANDLE_NAMES=['frame','lever','carriage','cover']
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
const hex=(af,phase=30)=>polygon({points:Array.from({length:6},(_,i)=>{const a=(phase+60*i)*Math.PI/180;return [af/Math.sqrt(3)*Math.cos(a),af/Math.sqrt(3)*Math.sin(a)]})})
const rect=(x1,x2,y1,y2)=>polygon({points:[[x1,y1],[x2,y1],[x2,y2],[x1,y2]]})
const h2=(x,y,r)=>circle({center:[x,y],radius:r,segments:48})
const at2=(x,y,s)=>translate([x,y],s)
const CAP_POINTS=[[-27.5,-8.3],[-27.5,8.3],[17.2,-8.3],[17.2,8.3]]
const mountHoles=()=>union(...CAP_POINTS.map(([x,y])=>h2(x,y,1.625)))
// Public motion parameter is millimetres of wire advance, independent of any head.
const q=travel=>travel-D.stroke/2
const angle=a=>Math.asin((q(a)+D.driveSide*D.backlash/2)/D.crank)
const leverPose=(g,a)=>translate([-13,15,0],rotateZ(angle(a),translate([13,-15,0],g)))
const carriagePose=(g,a)=>translate([q(a),0,0],g)
// Shared planar layers provide identical, repair-free CAD and printable meshes.
function partsPlan(){
 const grip=union(link([-13,15],[-33,-29],5),link([-33,-29],[-42,-50],5),disk(-42,-50,13.5),disk(-13,15,8))
 const frameBase=subtract(union(grip,rect(-32,26.2,-11.5,11.5)),h2(-42,-50,10),h2(-13,15,1.625),mountHoles())
 const ring=subtract(grip,h2(-42,-50,10),h2(-13,15,1.625),mountHoles(),rect(-21.2,8.2,-5.25,5.25))
 const rails=subtract(union(rect(-32,10,-11.5,-5.25),rect(-32,10,5.25,11.5),rect(-32,-21.2,-5.25,5.25)),mountHoles())
 const stop=rect(8.2,10,-5.25,5.25)
 const channelFloor=rect(-21.2,8.2,-5.25,5.25)
 const coverFront=subtract(rect(10.05,26.2,-11.5,11.5),mountHoles())
 const front=subtract(rect(10,26.2,-11.5,11.5),mountHoles())
 const pivot=subtract(disk(-13,15,7),h2(-13,15,1.625))
 const pivotNut=at2(-13,15,hex(5.8))
 const coverShape=subtract(union(rect(-32,10,-11.5,-3.5),rect(-32,10,3.5,11.5),rect(-32,-21.7,-3.5,3.5),rect(10,26.2,-11.5,11.5)),mountHoles(),h2(-13,15,7.3))
 const leverOutline=subtract(union(disk(-13,15,7),link([-13,15],[-13,-42],4),disk(-13,-50,12),disk(-13,0,4.5)),h2(-13,15,1.625),h2(-13,-50,9),h2(-13,0,1.15))
 const leverExtra=subtract(union(link([-13,-12],[-13,-42],4),disk(-13,-50,12)),h2(-13,-50,9))
 const driveNut=at2(-13,0,union(hex(4.2,0),rect(-7,0,-2.1,2.1)))
 const slide=rect(-18,5,-5,5),boss=rect(-4,4,-3,3)
 const tongue=rect(4,13.6,-1.7,1.7),driveBoss=rect(-17,-9,-3,3)
 const leverDriveTop=subtract(disk(-13,0,4.5),h2(-13,0,1.15))
 const driveSlot=hull(h2(-13,-1.5,1.15),h2(-13,1.5,1.15))
 const wirePassage=rect(-18.1,13.7,-.7,.7),clampBore=h2(0,0,1.15)
 const clampNut=union(hex(4.2),rect(-2.1,2.1,0,6))
 const s={frameBase,ring,rails,stop,front,coverFront,pivot,pivotNut,coverShape,leverOutline,leverExtra,driveNut,slide,boss,driveSlot,wirePassage,clampBore,clampNut,channelFloor,tongue,driveBoss,leverDriveTop}
 // Overlapping extrusions avoid coplanar layer-union seams in JSCAD.
 const plans={frame:[{add:['frameBase'],z:0,h:8},{add:['rails','stop'],z:0,h:10.1},{add:['pivot'],z:0,h:13}],
 cover:[{add:['coverFront'],z:6.55,h:3.6},{add:['coverShape'],z:10.15,h:2.85}],
 lever:[{add:['leverOutline'],z:13.5,h:1},{add:['leverOutline'],cut:['driveNut'],z:14.5,h:1.8},{add:['leverOutline'],z:16.3,h:1.2},{add:['leverExtra'],z:17.5,h:2},{add:['leverDriveTop'],z:17.5,h:3.3}],
 carriage:[{add:['slide','tongue'],z:4.8,h:1},
 {add:['slide','tongue'],cut:['wirePassage'],z:5.8,h:1.2},
 {add:['slide','tongue'],cut:['wirePassage','clampBore'],z:7,h:.2},
 {add:['slide','tongue'],cut:['clampBore'],z:7.2,h:1},
 {add:['slide'],cut:['clampBore','clampNut'],z:8.2,h:.1},
 {add:['slide'],cut:['driveSlot','clampBore','clampNut'],z:8.3,h:1.5},
 {add:['boss','driveBoss'],cut:['driveSlot','clampBore','clampNut'],z:9.8,h:.2},
 {add:['boss','driveBoss'],cut:['driveSlot','clampBore'],z:10,h:2.3}]}

 return {sections:s,plans}
}
function buildPart(name){const {sections:s,plans}=partsPlan();let g=union(...plans[name].map(p=>{
 let t=union(...p.add.map(n=>s[n]));if(p.cut)t=subtract(t,...p.cut.map(n=>s[n]));return plate(t,p.z,p.h)
 }));
 if(name==='frame'||name==='cover')g=subtract(g,tubeAlongX(10,26.3,0,D.wireZ,3.325))
 if(name==='frame')g=subtract(g,plate(partsPlan().sections.pivotNut,-.1,2.8),
  box([29.4,10.5,30],[-6.5,0,19.5]),box([16.4,24,30],[18.2,0,21.5]),
  box([18.3,4,12],[17.25,0,10.5]),box([12,1.5,1.5],[-26.6,0,D.wireZ]))
 return g
}
const frame=()=>buildPart('frame'),lever=()=>buildPart('lever'),carriage=()=>buildPart('carriage'),cover=()=>buildPart('cover')
function clampHardware(){
 const screw=union(cylinder({radius:1,height:12,center:[0,0,13],segments:40}),subtract(cylinder({radius:1.9,height:2,center:[0,0,20],segments:40}),plate(hex(1.5),20,2)))
 const nut=subtract(plate(hex(4),8.3,1.6),hole(0,0,1))
 return [screw,nut].map(g=>colorize([.55,.58,.62],g))
}
function driveHardware(){
 const screw=union(cylinder({radius:1,height:12,center:[-13,0,14.8],segments:40}),subtract(cylinder({radius:1.9,height:2,center:[-13,0,21.8],segments:40}),translate([-13,0,0],plate(hex(1.5),21.8,2))))
 const nut=translate([-13,0,0],subtract(plate(hex(4,0),14.6,1.6),hole(0,0,1)))
 return [screw,nut].map(g=>colorize([.55,.58,.62],g))
}
function washer(x,y,z){return colorize([.65,.67,.70],subtract(cylinder({radius:3.5,height:.5,center:[x,y,z+.25],segments:40}),hole(x,y,1.6)))}
function bolt(x,y,underHead,nutZ){return [
 union(cylinder({radius:1.5,height:20,center:[x,y,underHead-10],segments:40}),subtract(cylinder({radius:2.75,height:3,center:[x,y,underHead+1.5],segments:40}),translate([x,y,0],plate(hex(2.5),underHead+1.5,2)))),
 translate([x,y,0],subtract(plate(hex(5.5),nutZ,2.4),hole(0,0,1.5)))].map(g=>colorize([.55,.58,.62],g))}
function staticHardware(){return [washer(-13,15,13),washer(-13,15,17.5),...bolt(-13,15,18,.1),...CAP_POINTS.flatMap(([x,y])=>[...bolt(x,y,13.5,-2.9),washer(x,y,13),washer(x,y,-.5)])]}
function tube(){return colorize([.65,.69,.73],subtract(tubeAlongX(D.tubeStart,D.tubeStart+116,0,D.wireZ,3.175),tubeAlongX(D.tubeStart-.1,D.tubeStart+116.1,0,D.wireZ,2.82)))}
// The free rear tail passes under the drive pin and through the rear frame wall.
function wire(travel){return colorize([.87,.20,.27],tubeAlongX(-36+q(travel),D.tubeStart+D.tubeLength,0,D.wireZ,.5))}
// Head geometry is unchanged. The full assembly is a closed reference; the
// measured 6 mm handle travel does not establish a wire-travel-to-jaw-angle curve.
function assemblyWire(travel){
 const a=Math.asin(travel/7),x=q(travel),hx=D.headX+travel,cy=3-7*Math.cos(a)+2.14;
 const pts=[[-36+x,0,D.wireZ],[D.tubeStart+D.tubeLength,0,D.wireZ],[hx,cy+1.65,D.wireZ]];
 const spans=pts.slice(1).map((p,i)=>hull(sphere({radius:.5,center:pts[i],segments:12}),sphere({radius:.5,center:p,segments:12})));
 const eye=plate(subtract(disk(hx,cy,2.15),disk(hx,cy,1.15)),D.wireZ-.5,1);
 return colorize([.87,.20,.27],union(...spans,eye));
}
function headParts(a){return [noseHalf(),mirrorZ(noseHalf()),pose(jawHalf(),a),pose(mirrorZ(jawHalf()),a),fixedJaw()].map((g,i)=>paint(HEAD_NAMES[i],g))}
function handleParts(a){return [paint('frame',frame()),paint('cover',cover()),paint('carriage',carriagePose(carriage(),a)),paint('lever',leverPose(lever(),a)),...clampHardware().map(g=>carriagePose(g,a)),...driveHardware().map(g=>leverPose(g,a)),...staticHardware()]}
function assembly(){const travel=0;const a=Math.asin(travel/7)*180/Math.PI,shift=[D.headX,2.14,D.wireZ];return [...handleParts(travel),tube(),assemblyWire(travel),...headParts(a).map(g=>translate(shift,g)),...[[0,3,1.5,17],[-18,P.tubeY-6,1.5,17],[-18,P.tubeY+6,1.5,17],[6,-8.5,1,14],[11,-4,1,14],[7*Math.sin(a*Math.PI/180),3-7*Math.cos(a*Math.PI/180),1,10]].map(([x,y,r,h])=>colorize([.5,.53,.56],translate(shift,hole(x,y,r,h))))]}
function normalize(g){const b=j.measurements.measureBoundingBox(g);return translate(b[0].map(v=>-v),g)}
// Turn the cover over with a rigid rotation. A Z reflection reverses its
// handedness and moves the pivot relief to the wrong side after assembly.
function printParts(){return HANDLE_NAMES.map(n=>normalize(n==='cover'?rotateX(Math.PI,cover()):buildPart(n)))}
function layout(){return printParts().map((g,i)=>paint(HANDLE_NAMES[i],translate([[0,0,0],[100,0,0],[140,0,0],[140,28,0]][i],g)))}
function main(p={}){const a=Math.max(0,Math.min(D.stroke,Number(p.travel??D.stroke))),v=p.view||'handle';D.driveSide=Number(p.driveSide??1);
 if(HANDLE_NAMES.includes(v))return paint(v,printParts()[HANDLE_NAMES.indexOf(v)])
 if(v==='layout')return layout()
 if(v==='assembly')return assembly(a)
 if(v==='cutaway')return [...handleParts(a).filter((g,i)=>i!==1),colorize([.65,.69,.73],subtract(tube(),box([300,50,50],[120,-25,20]))),wire(a)].map(g=>colorize(g.color,subtract(g,box([300,300,80],[182,0,20])))).filter(g=>j.geometries.geom3.toPolygons(g).length)
 return [...handleParts(a),tube(),wire(a)].map(g=>colorize(g.color,subtract(g,box([300,300,80],[182,0,20])))).filter(g=>j.geometries.geom3.toPolygons(g).length)
}
function getParameterDefinitions(){return [{name:'view',type:'choice',values:['assembly','handle','cutaway','layout',...HANDLE_NAMES],captions:['Full assembly — closed reference','6 mm guided-wire handle','Cover removed','Four handle parts for printing','Fixed frame','Squeeze lever','Wire clamp carriage','Tube cap and guide cover'],initial:'handle'},{name:'travel',type:'slider',min:0,max:6,step:.1,initial:6,caption:'Wire advance (mm)'},{name:'driveSide',type:'choice',values:[1,-1],captions:['Pushing / opening contact','Pulling / closing contact'],initial:1}]}
module.exports={main,getParameterDefinitions,D,C,P,H,HANDLE_NAMES,HEAD_NAMES,CAP_POINTS,partsPlan,buildPart,frame,lever,carriage,cover,clampHardware,driveHardware,staticHardware,tube,wire,assemblyWire,headParts,handleParts,assembly,leverPose,carriagePose,q,angle,printParts,layout,noseHalf,jawHalf,fixedJaw}
