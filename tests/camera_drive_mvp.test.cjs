const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={console,setTimeout,clearTimeout,performance:{now:()=>0},Date,document:undefined};context.globalThis=context;
vm.createContext(context);vm.runInContext(fs.readFileSync('camera-drive-mvp.js','utf8'),context);
const Core=context.MachimamoDriveDetectorCore,w=1000,h=600;
const car=(x,y=300,score=.8)=>({class:'car',score,bbox:[x,y,180,160]});

const core=new Core();
let result=core.process([car(20),car(410)],w,h,0,{egoSpeedKmh:20});
assert.equal(result.newCandidates.length,1,'a high-confidence edge vehicle is retained from one drive frame');
assert.equal(result.newCandidates[0].reason,'edge_vehicle_single_frame');
assert.equal(result.newlyCounted,2,'drive mode counts visible vehicles on the first usable frame');
assert.equal(result.visuals.length,2);
assert.equal(result.visuals[0].state,'recorded','a one-frame roadside candidate immediately receives the recorded scope');
result=core.process([car(30),car(510)],w,h,500,{egoSpeedKmh:20});
assert.equal(result.newCandidates.length,0,'the one-frame shoulder vehicle is not recorded twice on the next inference');
assert.equal(result.duplicates[0].class,'car');
assert.equal(result.duplicates[0].classification,'roadside','flowing ego and central traffic keeps the roadside classification');
assert.equal(result.newlyCounted,0,'second sighting is context/duplicate handling, not a confirmation requirement');
assert.equal(result.visuals.length,2);

const stopped=new Core();result=stopped.process([car(20)],w,h,0,{egoSpeedKmh:0});
assert.equal(result.newCandidates.length,1,'a single high-confidence roadside vehicle is retained even while ego is stopped');
assert.equal(result.newCandidates[0].classification,'roadside');
assert.equal(result.newlyCounted,1);

const noSpeed=new Core();result=noSpeed.process([car(20)],w,h,0,{});
assert.equal(result.newCandidates.length,1,'missing speed does not prevent one-frame drive detection');
assert.equal(result.newCandidates[0].classification,'indeterminate');
assert.equal(result.newCandidates[0].reason,'edge_vehicle_single_frame_no_speed');

const braking=new Core();result=braking.process([{...car(20),brakeLightsLikely:true}],w,h,0,{egoSpeedKmh:20});
assert.equal(result.newCandidates[0].classification,'indeterminate');
assert.equal(result.newCandidates[0].reason,'paired_bright_brake_lights_single_frame');
assert.equal(result.visuals[0].state,'traffic','brake-light suppression uses the traffic scope immediately');

const jam=new Core();result=jam.process([car(20),car(410)],w,h,0,{egoSpeedKmh:2});
assert.equal(result.newCandidates[0].classification,'congestion','low-speed multi-vehicle context is retained without waiting for a second frame');
assert.equal(result.newlyCounted,2);
result=jam.process([car(25),car(415)],w,h,500,{egoSpeedKmh:2});
assert.equal(result.duplicates[0].classification,'congestion','second inference stays duplicate/context only');

const signal=new Core(),light={class:'traffic light',score:.8,bbox:[480,40,30,70]};
result=signal.process([car(20),light],w,h,0,{egoSpeedKmh:0});
assert.equal(result.newCandidates[0].classification,'signal_wait','low-speed signal context is retained on the first frame');

const close=new Core();result=close.process([{class:'car',score:.9,bbox:[100,100,800,500]}],w,h,0,{egoSpeedKmh:0});
assert.equal(result.visuals.length,1,'a close vehicle may be scoped even when too large for roadside classification');
assert.equal(result.newCandidates.length,0,'oversized close vehicles do not become roadside candidates');

const dashboard=new Core();result=dashboard.process([{class:'car',score:.91,bbox:[430,535,120,60]}],w,h,0,{egoSpeedKmh:0});
assert.equal(result.visuals.length,0,'bottom-edge dashboard false positives are not rendered');
assert.equal(result.newlyCounted,0,'dashboard false positives do not increment the vehicle counter');

const low=new Core();result=low.process([car(20,300,.2)],w,h,0,{egoSpeedKmh:20});
assert.equal(result.newCandidates.length,0,'low confidence is rejected');
assert.equal(result.newlyCounted,0);

const cooldown=new Core();
result=cooldown.process([car(20)],w,h,0,{egoSpeedKmh:20});assert.equal(result.newCandidates.length,1);
result=cooldown.process([car(30)],w,h,500,{egoSpeedKmh:20});assert.equal(result.duplicates.length,1,'same tracked vehicle is duplicate within cooldown');
result=cooldown.process([car(35)],w,h,30500,{egoSpeedKmh:20});assert.equal(result.newCandidates.length,1,'same tracked vehicle can be recorded again after 30-second cooldown');

const passing=new Core();
result=passing.process([car(20)],w,h,0,{egoSpeedKmh:20});assert.equal(result.newCandidates[0].classification,'roadside');
result=passing.process([car(300)],w,h,500,{egoSpeedKmh:20});assert.equal(result.duplicates[0].classification,'roadside','fast edge transit remains the same roadside candidate');

console.log('PASS: one-frame drive detection, immediate counter/scope, traffic guards and 30-second duplicate cooldown.');
