import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runAedRetention} from '../supabase/functions/aed-retention/worker.mjs';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',userId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',token='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const item={id,userId,token,path:`${userId}/${id}.jpg`};
function setup(options={}){
 const results=[],removals=[];
 const service={rpc:async(name,args)=>{
  if(name==='aed_retention_claim')return {data:[{...item,...options.item}],error:options.claimError};
  results.push(args);return options.saveError?{error:true}:{data:args.p_success?'deleted':'retry'};
 },storage:{from:bucket=>{assert.equal(bucket,'aed-submission-images');return {
  remove:async paths=>{removals.push(paths);return {error:options.removeError};},
  list:async(folder,opts)=>{assert.equal(folder,userId);assert.equal(opts.search,`${id}.jpg`);return {error:options.listError,data:options.remaining?[{name:`${id}.jpg`}]:[]};}
 };}}};return {service,results,removals};
}
test('removal plus verification before success; missing object retry remains idempotent',async()=>{
 const s=setup();assert.equal((await runAedRetention(s.service)).deleted,1);assert.equal(s.results[0].p_success,true);
 assert.equal((await runAedRetention(s.service)).deleted,1);
});
test('storage error, verification error, remaining object and malformed path cannot finalize success',async()=>{
 for(const options of [{removeError:true},{listError:true},{remaining:true},{item:{path:'someone-else/photo.jpg'}}]){
  const s=setup(options);assert.equal((await runAedRetention(s.service)).failed,1);assert.equal(s.results[0].p_success,false);
  if(options.item)assert.equal(s.removals.length,0);
 }
});
test('claim or result failure propagates instead of reporting completed',async()=>{
 for(const options of [{claimError:true},{saveError:true}])await assert.rejects(runAedRetention(setup(options).service));
});
