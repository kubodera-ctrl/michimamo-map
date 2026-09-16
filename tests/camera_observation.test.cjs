const assert=require('node:assert/strict');
require('../camera-observation.js');
require('../camera-detection.js');
const Policy=globalThis.MachimamoObservationPolicy;
const vehicle={trackId:'local-1',visible:true,occluded:false,identityReliable:true,stationary:true,confidence:.95};
const frame=(at,extra={})=>({at,mode:'walk',foreground:true,detectorValidated:true,frameValid:true,cameraStable:true,trackerValidated:true,vehicles:[{...vehicle}],...extra});
const p=new Policy();let captures=[],stops=[];
for(let at=0;at<=1201000;at+=1000)for(const e of p.step(frame(at))){
    if(e.type==='capture_request'){assert.equal(p.acknowledge(e),true);assert.equal(p.acknowledge(e),false);captures.push(e.thresholdMs);}
    else stops.push(e.observedMs);
}
assert.deepEqual(captures,[300000,600000,1200000]);assert.deepEqual(stops,[180000]);
for(const extra of [{foreground:false},{cameraStable:false},{vehicles:[]},{trackerValidated:false},{frameValid:false},
    {vehicles:[{...vehicle,occluded:true}]},{vehicles:[{...vehicle,identityReliable:false}]},{vehicles:[{...vehicle,stationary:false}]},
    {vehicles:[{...vehicle,confidence:NaN}]},{vehicles:[vehicle,vehicle]}]){
    const p=new Policy();for(let at=0;at<299000;at+=1000)p.step(frame(at));
    p.step(frame(299000,extra));assert.equal(p.step(frame(300000)).length,0,'interruption must discard elapsed time');
}
const gap=new Policy();gap.step(frame(0));assert.equal(gap.step(frame(300000)).length,0);
assert.equal(gap.step(frame(299999)).length,0,'out-of-order frame resets');
assert.equal(gap.step(frame(300001)).length,0);
const retry=new Policy();let request;
for(let at=0;at<=300000;at+=1000)request=retry.step(frame(at)).find(e=>e.type==='capture_request')||request;
assert.ok(request);const replacement=retry.step(frame(301000)).find(e=>e.type==='capture_request');
assert.ok(replacement,'failed capture is retried on the next valid frame');
assert.equal(retry.acknowledge(request),false,'stale frames cannot be acknowledged');assert.equal(retry.acknowledge(replacement),true);
const d=new Policy();
const road={...vehicle,eventId:'local-event',hazard:'crosswalk_blocked',blocksPassage:true,stoppedEvidence:true,relationConfidence:.95};
const drive=(at,vehicles=[road],extra={})=>frame(at,{mode:'drive',roadDetectorValidated:true,vehicles,...extra});
assert.equal(d.step(drive(0,[vehicle])).length,0,'vehicle alone is not a road hazard');
assert.equal(d.step(drive(1000,[{...road,blocksPassage:false}])).length,0);
assert.equal(d.step(drive(2000,[{...road,stoppedEvidence:false}])).length,0);
assert.equal(d.step(drive(3000,[road],{roadDetectorValidated:false})).length,0);
const event=d.step(drive(4000))[0];assert.equal(event.review,'after_stopping');assert.equal(d.acknowledge({...event}),false);assert.equal(d.acknowledge(event),true);
for(let at=5000;at<64000;at+=1000)assert.equal(d.step(drive(at)).length,0,'deduplicate pass event');
assert.equal(d.step(drive(64000)).length,1);
assert.equal(d.step(frame(65000)).length,0,'mode switch starts a fresh observation');
const masks=globalThis.MachimamoCameraDetection.faceRegions;
const boxes=masks([{boundingBox:{x:0,y:0,width:20,height:20}}],100,100);
assert.deepEqual(boxes,[{x:0,y:0,width:.25,height:.25,kind:'mosaic'}]);
for(const b of [{x:NaN,y:0,width:10,height:10},{x:0,y:0,width:-1,height:10},{x:101,y:0,width:1,height:1}])assert.throws(()=>masks([{boundingBox:b}],100,100));
assert.throws(()=>masks(Array(101).fill({}),100,100));assert.deepEqual(masks([],100,100),[]);
console.log('PASS: 3/5/10/20-minute decisions, interruption/gap/identity resets, retries/acks, drive evidence and deduplication, face bounds. Synthetic input only; no real tracking or road detection claimed.');
