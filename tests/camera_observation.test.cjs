const assert=require('node:assert/strict');
require('../camera-observation.js');
require('../camera-detection.js');
const Policy=globalThis.MachimamoObservationPolicy;
const Thermal=globalThis.MachimamoThermalPolicy;
const vehicle={trackId:'local-1',visible:true,occluded:false,identityReliable:true,confidence:.9,sharpness:.8,exposure:.7,coverage:.3};
const frame=(at,extra={})=>({at,frameId:'f-'+at,mode:'walk',foreground:true,detectorValidated:true,frameValid:true,cameraStable:true,trackerValidated:true,vehicles:[{...vehicle}],...extra});

const p=new Policy();assert.equal(p.step(frame(0)).length,0);
const events=p.step(frame(600));assert.deepEqual(events.map(e=>e.type),['vehicle_recognized','capture_request']);
const request=events[1];assert.equal(request.frameIds.length,2);assert.equal(p.acknowledge(request),true);assert.equal(p.acknowledge(request),false);
for(const extra of [{foreground:false},{cameraStable:false},{vehicles:[]},{trackerValidated:false},{frameValid:false},
    {vehicles:[{...vehicle,occluded:true}]},{vehicles:[{...vehicle,identityReliable:false}]},{vehicles:[{...vehicle,sharpness:.1}]},
    {vehicles:[{...vehicle,exposure:.1}]},{vehicles:[vehicle,vehicle]}]){
    const q=new Policy();q.step(frame(0));q.step(frame(600,extra));assert.equal(q.step(frame(1200)).some(e=>e.type==='capture_request'),false,'interruption resets a short burst');
}
const timeout=new Policy();timeout.step(frame(0));assert.equal(timeout.step(frame(6000)).length,0,'gaps cannot become observation time');
assert.equal(timeout.step(frame(5900)).length,0,'out-of-order input resets');

const d=new Policy();
const road={...vehicle,eventId:'segment:event:vehicle',hazard:'crosswalk_blocked',stoppedEvidence:true,relationConfidence:.9};
const drive=(at,vehicles=[road],extra={})=>frame(at,{frameId:'d-'+at,mode:'drive',roadDetectorValidated:true,vehicles,...extra});
assert.equal(d.step(drive(0,[{...road,stoppedEvidence:false}])).length,0);
assert.equal(d.step(drive(1000,[road],{roadDetectorValidated:false})).length,0);
const event=d.step(drive(2000))[0];assert.equal(event.classification,'candidate');assert.equal(event.review,'after_stopping');assert.equal(d.acknowledge(event),true);
for(let at=3000;at<1802000;at+=2000)assert.equal(d.step(drive(at)).length,0,'same local event is deduplicated for 30 minutes');
assert.equal(d.step(drive(1802000)).length,1);assert.equal(d.step(drive(1803000,[road],{thermalPaused:true})).length,0);

const thermal=new Thermal();assert.equal(thermal.update('nominal').sampleIntervalMs,1000);assert.equal(thermal.update('fair').sampleIntervalMs,2000);
assert.equal(thermal.update('serious').lightweightDetection,false);assert.equal(thermal.update('critical').paused,true);
assert.equal(thermal.update('unknown').sampleIntervalMs,4000,'unknown thermal state fails toward lower load');

const masks=globalThis.MachimamoCameraDetection.faceRegions;
assert.deepEqual(masks([{boundingBox:{x:0,y:0,width:20,height:20}}],100,100),[{x:0,y:0,width:.25,height:.25,kind:'mosaic'}]);
for(const b of [{x:NaN,y:0,width:10,height:10},{x:0,y:0,width:-1,height:10},{x:101,y:0,width:1,height:1}])assert.throws(()=>masks([{boundingBox:b}],100,100));
assert.throws(()=>masks(Array(101).fill({}),100,100));assert.deepEqual(masks([],100,100),[]);
console.log('PASS: short walk burst, quality rejection, interruption resets, drive dedupe, thermal degradation, face bounds. Synthetic input only; no real detector claimed.');
