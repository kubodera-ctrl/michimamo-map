const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const store=new Map();let success,cleared=false;
const context={console,Date,JSON,Math,crypto:{randomUUID:()=> 'test-id'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
 navigator:{geolocation:{watchPosition:fn=>{success=fn;return 7;},clearWatch:id=>{assert.equal(id,7);cleared=true;}},getBattery:async()=>({level:.8})},
 document:{getElementById:()=>null}};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('drive-test-log.js','utf8'),context);
(async()=>{const log=context.MachimamoDriveTestLog;assert.equal(await log.start('都心テスト'),true);assert.equal(await log.start('二重'),false);
 success({coords:{latitude:35.68,longitude:139.76,accuracy:10},timestamp:1000});success({coords:{latitude:35.681,longitude:139.761,accuracy:10},timestamp:2000});
 log.increment('candidates',3);log.increment('valid',2);log.increment('duplicate');log.category('crosswalk_blocked',2);log.bytes('temporary',1048576);log.bytes('server',524288);log.thermal('fair');log.thermal('serious');
 await log.recordEvent({classification:'congestion',reason:'low_ego_group_stop',lat:35.68,lng:139.76,at:2000},null);
 const result=await log.end();assert.equal(cleared,true);assert.equal(result.counters.candidates,3);assert.equal(result.categories.crosswalk_blocked,2);assert.ok(result.distanceKm>0);assert.equal(result.thermalMax,'serious');
 assert.equal(result.classifications.congestion,1);assert.equal(result.events.length,1);
 const history=log.history();assert.equal(history.length,1);assert.equal(history[0].validPerKm>0,true);assert.equal(history[0].mobileBytes,null);assert.equal(log.active(),null);
 console.log('PASS: repeatable drive-test sessions, GPS distance, counters/categories, byte metrics, thermal maximum and local history.');
})().catch(e=>{console.error(e);process.exitCode=1;});
