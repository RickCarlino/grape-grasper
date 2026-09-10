const fs=require('fs'),crypto=require('crypto'),j=require('@jscad/modeling'),m=require('./guided-wire-grasper');
const old=require('../../scripts/fixtures/head-v02.json');
const {intersect,subtract}=j.booleans,{translate}=j.transforms;
const vol=g=>Math.abs(j.measurements.measureVolume(g)),over=(a,b)=>vol(intersect(a,b));
const failures=[],motion=[];
const ck=(name,v,at)=>{if(v>1e-3)failures.push({name,at,mm3:v})};
const frame=m.frame(),cover=m.cover(),lever=m.lever(),carriage=m.carriage(),tube=m.tube(),hw=m.staticHardware(),wireHs=m.clampHardware(),driveHs=m.driveHardware();
// Reassemble the printable cover using a physical half-turn, never a mirror.
// Its tube saddle faces down and the circular relief must clear the +Y pivot.
const printedCover=m.printParts()[m.HANDLE_NAMES.indexOf('cover')];
const assembledPrint=j.transforms.translate([-32,11.5,13],j.transforms.rotateX(Math.PI,printedCover));
const coverPrintOrientation={rotation_deg:[180,0,0],translation_mm:[-32,11.5,13],rotationDeterminant:1,
 symmetricDifference_mm3:vol(subtract(assembledPrint,cover))+vol(subtract(cover,assembledPrint)),
 frameOverlap_mm3:over(assembledPrint,frame),
 mirroredNegativeControlOverlap_mm3:over(j.transforms.mirrorY(cover),frame)};
// Fixed assembly datums differ from JSCAD's normalized bounds by <0.0001 mm.
// Allow 0.1 mm3 boolean residue (0.003% of this part); the mirror bug loses 196 mm3.
coverPrintOrientation.symmetricDifferenceTolerance_mm3=.1;
if(coverPrintOrientation.symmetricDifference_mm3>.1)failures.push({name:'printedCoverHandedness',...coverPrintOrientation});
ck('printedCoverFrameCollision',coverPrintOrientation.frameOverlap_mm3);
if(coverPrintOrientation.mirroredNegativeControlOverlap_mm3<80)failures.push({name:'coverOrientationTestLostSensitivity'});
const quick=process.argv.includes('--quick'),step=quick?1:.1;
for(const side of [-1,1]){m.D.driveSide=side;for(let i=0;i<=Math.round(m.D.stroke/step);i++){const a=i*step;
 const slide=m.carriagePose(carriage,a),arm=m.leverPose(lever,a),wire=m.wire(a),ws=wireHs.map(g=>m.carriagePose(g,a)),ds=driveHs.map(g=>m.leverPose(g,a));
 const stationary=[frame,cover,tube];
 const row={side,wireAdvance_mm:a,carriageFrame:Math.max(...stationary.map(g=>over(slide,g))),leverFrame:Math.max(...stationary.map(g=>over(arm,g))),leverCarriage:over(arm,slide),
 wireSolids:Math.max(...[...stationary,arm,slide].map(g=>over(wire,g))),
 clampHardware:Math.max(...ws.flatMap(g=>[...stationary,arm,slide].map(f=>over(g,f)))),driveHardware:Math.max(...ds.flatMap(g=>[...stationary,arm,slide,...ws].map(f=>over(g,f)))),
 staticHardware:Math.max(...hw.flatMap(g=>[...stationary,arm,slide,...ws,...ds].map(f=>over(g,f))))};
 for(const [n,v]of Object.entries(row))if(n!=='side'&&n!=='wireAdvance_mm')ck(n,v,[side,a]);motion.push(row)
}}
const insertion=[];
for(let y=9;y>=0;y-=.25){const v=over(translate([0,y,0],wireHs[1]),carriage);ck('clampNutInsertion',v,y);insertion.push({nut:'clamp',offset:y,mm3:v})}
for(let x=-9;x<=0;x+=.25){const v=over(translate([x,0,0],driveHs[1]),lever);ck('driveNutInsertion',v,x);insertion.push({nut:'drive',offset:x,mm3:v})}
for(const [name,body,parts]of [['clamp',carriage,wireHs],['drive',lever,driveHs]])for(let z=0;z<=10;z+=.5)ck(name+'ScrewInsertion',over(translate([0,0,z],parts[0]),body),z);
// Test the actual contact blocks at the limits, using carriage displacement directly.
const stops=[-1,1].map(s=>({displacement:s*(m.D.limit+.05),overlap:over(translate([s*(m.D.limit+.05),0,0],carriage),frame)}));for(const s of stops)if(s.overlap<.01)failures.push({name:'missingStop',...s});
// Confirm the driver actually bears on each slot flank rather than floating clear.
const driveContact=[];
for(const side of [-1,1]){m.D.driveSide=side;for(const a of [0,3,6]){
 const pin=m.leverPose(driveHs[0],a),slide=m.carriagePose(carriage,a);
 const bearing=over(translate([side*.02,0,0],pin),slide);
 driveContact.push({side,wireAdvance_mm:a,overlapAfter002mmTowardFlank:bearing});
 if(bearing<.001)failures.push({name:'missingDriveContact',side,a,bearing});
}}
// Assembly is possible with the cover and lever removed; no captive part must pass through a closed loop.
const assemblyAccess=[];
for(let z=0;z<=15;z+=.5){const mm3=over(translate([0,0,z],carriage),frame);ck('carriageDropIn',mm3,z);assemblyAccess.push({operation:'carriageDropIn',offset:z,mm3})}
// Tube slides over the projecting carriage tongue after the carriage is lowered in.
for(let x=0;x<=15;x+=.5){const mm3=over(translate([x,0,0],tube),carriage);ck('tubeInsertion',mm3,x);assemblyAccess.push({operation:'tubeInsertion',offset:x,mm3})}
const pivotNut=hw[3];
for(let z=-6;z<=0;z+=.25){const mm3=over(translate([0,0,z],pivotNut),frame);ck('pivotNutInsertion',mm3,z);assemblyAccess.push({operation:'pivotNutInsertion',offset:z,mm3})}
const headUnchanged=['noseHalf','jawHalf','fixedJaw'].map(n=>({name:n,delta:vol(subtract(m[n](),old[n]))+vol(subtract(old[n],m[n]()))}));for(const h of headUnchanged)ck('headChanged',h.delta,h.name);
for(const [n,g]of [['frameCover',intersect(frame,cover)]])ck(n,vol(g));
// The old head is checked only over its previously designed travel; it is not
// silently animated through 6 mm when its actual stroke is 2.39 mm.
const legacyHead=[];
for(let a=0;a<=20;a+=quick?5:.25){
 const h=m.headParts(a).map(g=>translate([m.D.headX,2.14,m.D.wireZ],g));
 const w=m.assemblyWire(7*Math.sin(a*Math.PI/180));
 const row={angle:a,headOverlap:Math.max(...[0,1,4].flatMap(i=>[2,3].map(k=>over(h[i],h[k])))),wireOverlap:Math.max(...h.map(g=>over(w,g)))};
 ck('legacyHeadOverlap',row.headOverlap,a);ck('legacyHeadWire',row.wireOverlap,a);legacyHead.push(row);
}
// Verify an extra-long straight wire can pass through the rear wall and below
// the drive screw at every pose, rather than merely stopping just before it.
const throughWire=[];
const bore=j.transforms.rotateY(Math.PI/2,j.primitives.cylinder({radius:.5,height:190,center:[0,0,0],segments:40}));
const straight=j.transforms.translate([40,0,m.D.wireZ],bore);
for(const side of [-1,1]){m.D.driveSide=side;for(const travel of [0,1,2,3,4,5,6]){
 const clear=Math.max(...[frame,cover,tube,m.carriagePose(carriage,travel),m.leverPose(lever,travel),...driveHs.map(g=>m.leverPose(g,travel)),...hw].map(g=>over(straight,g)));
 ck('throughWire',clear,[side,travel]);throughWire.push({side,travel,overlap_mm3:clear});
}}
const headExtensionDiagnostic=[];
for(let travel=3;travel<=6;travel+=.5){const a=Math.asin(travel/7)*180/Math.PI,h=m.headParts(a);
 const overlap=Math.max(...[0,1,4].flatMap(i=>[2,3].map(k=>over(h[i],h[k]))));
 headExtensionDiagnostic.push({assumedWireAdvance_mm:travel,assumedAngle_deg:a,headBodyOverlap_mm3:overlap});
}
const half=m.D.stroke/2;
if(Math.abs(m.q(6)-m.q(0)-6)>1e-9)failures.push({name:'incorrect6mmStroke'});
if(m.D.tongueEnd-m.D.limit-m.D.tubeStart<.3)failures.push({name:'lostTubeOverlapAtStop'});
const freeStops=[-1,1].map(side=>({displacement:side*(m.D.limit-.01),overlap:over(translate([side*(m.D.limit-.01),0,0],carriage),frame)}));
for(const row of freeStops)ck('atStop',row.overlap,row.displacement);
const report={status:failures.length?'FAIL':'PASS',scope:'New 6 mm handle, wire routing, and assembly access. Head identity and original 0–20 degree reference range checked separately; no full-stroke head clearance claim.',sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(__dirname+'/guided-wire-grasper.js')).digest('hex'),sampleCount:motion.length,
 revision:'6mm-cover-rotation-fix-2026-09-09',coverPrintOrientation,nominalMechanicalAdvantage:m.D.finger/m.D.crank,rodStroke_mm:m.D.stroke,driveSlotBacklash_mm:.3,stopToStopTravel_mm:2*m.D.limit,workingTravelMarginEachEnd_mm:m.D.limit-half,fingerTravel_mm:m.D.stroke*m.D.finger/m.D.crank,
 unsupportedHandleGap_mm:[0,0],tongueTubeOverlap_mm:[m.D.tongueEnd-half-m.D.tubeStart,m.D.tongueEnd+half-m.D.tubeStart],tongueCrossSection_mm:[3.4,3.4],tongueTubeRadialClearance_mm:m.P.tubeID/2-Math.sqrt(2)*1.7,driveTipAboveWire_mm:m.D.driveTip-(m.D.wireZ+.5),rearWirePassage_mm:[1.5,1.5],clampToTube_mm:[m.D.tubeStart-half,m.D.tubeStart+half],stationaryGuideLength_mm:m.D.tubeStart-m.D.guideStart,
 sliderClearanceEachSide_mm:.25,sliderVerticalClearance_mm:.35,drivePinEngagement_mm:12.3-m.D.driveTip,drivePinFloorClearance_mm:m.D.driveTip-8.3,motion,insertion,stops,driveContact,assemblyAccess,headUnchanged,legacyHead,legacyHeadMaxWireTravel_mm:m.D.legacyStroke,throughWire,freeStops,headExtensionDiagnostic,headCalibrationNote:"Builder measured 6 mm on the printed v2 head. The old ideal 7 mm crank model shows small body overlaps beyond its original range and does not establish the as-built jaw angle. Keep the assembled head, fit the wire to its real closed position, and check for rubbing without forcing it.",failures,
 limitations:'Prototype: dimensional collision checks, not force, buckling, wear, or friction tests. Printed guide fit and wire grip require a bench test. Tube ID is much larger than the wire; internal bowing remains possible.'};
if(!process.argv.includes('--quick'))fs.writeFileSync(__dirname+'/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,samples:motion.length,gap:report.unsupportedHandleGap_mm,failures},null,2));if(failures.length)process.exitCode=1;
