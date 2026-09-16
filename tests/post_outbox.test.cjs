const test=require('node:test'),assert=require('node:assert/strict');
const {run,timed}=require('../post-outbox.js');
function fixture(kind='camera'){
 const job={id:'request',userId:'owner',kind,file:{},path:'owner/request.jpg',width:640,height:480,payload:{title:'same'}};
 let inserts=0,points=0,images=0,saved,server,lose=false,failImage=false,auth='owner';
 const db={auth:{getSession:async()=>({data:{session:{user:{id:auth}}}})},rpc:async()=>{if(!server){server={id:42,awarded:10};inserts++;points+=10;}if(lose){lose=false;throw Error('lost response');}return {data:server};},
 from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:server})})})}),insert:()=>({select:()=>({single:async()=>{server={id:'request',status:'pending'};inserts++;if(lose){lose=false;throw Error('lost response');}return {data:server};}})})}),
 storage:{from:()=>({upload:async()=>{images++;return images>1?{error:{statusCode:409}}:{};}})}};
 const evidence={saveBlob:async(...args)=>{images++;assert.equal(args[4],'request');if(failImage)throw Error('offline');}};
 return {job,deps:{db,evidence,save:async j=>{saved=structuredClone(j);}},lose:()=>lose=true,fail:v=>failImage=v,auth:v=>auth=v,state:()=>({inserts,points,images,saved,server})};
}
test('lost successful post response retries the same request; awards once',async()=>{const f=fixture();f.lose();await assert.rejects(run(f.job,f.deps));assert.equal(f.state().points,10);await run(f.job,f.deps);assert.equal(f.state().inserts,1);assert.equal(f.state().points,10);});
test('image failure retains successful post; resume only image',async()=>{const f=fixture();f.fail(true);await assert.rejects(run(f.job,f.deps));assert.equal(f.state().saved.result.id,42);f.fail(false);await run(f.state().saved,f.deps);assert.equal(f.state().inserts,1);});
test('AED lost insert response reconciles ID without deleting/uploading image again',async()=>{const f=fixture('aed');f.lose();await assert.rejects(run(f.job,f.deps));await run(f.state().saved,f.deps);assert.equal(f.state().inserts,1);assert.equal(f.state().images,1);});
test('account switch refuses before any mutation',async()=>{const f=fixture();f.auth('someone-else');await assert.rejects(run(f.job,f.deps),/login_required/);assert.equal(f.state().inserts,0);});
test('durable checkpoint failure does not invent a new request',async()=>{const f=fixture();f.deps.save=async()=>{throw Error('disk full');};await assert.rejects(run(f.job,f.deps));f.deps.save=async()=>{};await run(f.job,f.deps);assert.equal(f.state().inserts,1);});
test('bounded timeout marks result unknown',async()=>{await assert.rejects(timed(new Promise(()=>{}),5),/result_unknown/);});
test('consented original resumes as private evidence and never creates a public post',async()=>{const f=fixture('original');f.deps.evidence.saveBlob=async(...args)=>{assert.equal(args[3],null);assert.equal(args[4],'request');return 'private-id';};const r=await run(f.job,f.deps);assert.equal(r.id,'private-id');assert.equal(f.state().inserts,0);assert.equal(f.state().points,0);});
