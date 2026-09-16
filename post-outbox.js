(function(root){
'use strict';
// One durable, immutable request per account. No automatic background publishing.
const DB='machimamo-post-outbox-v1';
let busy=false;
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('jobs',{keyPath:'userId'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function access(mode,action){const d=await database();try{return await new Promise((resolve,reject)=>{const t=d.transaction('jobs',mode),r=action(t.objectStore('jobs'));t.oncomplete=()=>resolve(r?.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('local_save_failed'));});}finally{d.close();}}
const store={get:u=>access('readonly',s=>s.get(u)),put:j=>access('readwrite',s=>s.put(j)),add:j=>access('readwrite',s=>s.add(j)),remove:u=>access('readwrite',s=>s.delete(u))};
async function timed(p,ms=20000){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('result_unknown')),ms);})]);}finally{clearTimeout(timer);}}
async function run(job,{db,evidence,save}){
 const check=async()=>{const {data,error}=await timed(db.auth.getSession());if(error||data?.session?.user?.id!==job.userId)throw Error('login_required');};
 await check();
 if(job.kind==='original'){
  if(!job.result){const id=await timed(evidence.saveBlob(job.file,job.width,job.height,null,job.id),45000);job.result={id};await save(job);}
  return job.result;
 }
 if(job.kind==='aed'){
  // A successful insert with a lost response must never cause photo removal.
  let found=await timed(db.from('aed_submissions').select('id,status').eq('id',job.id).eq('user_id',job.userId).maybeSingle());
  if(found.error)throw found.error;
  if(found.data){job.result=found.data;await save(job);return job.result;}
 }
 if(job.file && job.kind!=='camera' && !job.uploaded){
  await check();
  const bucket=job.kind==='aed'?'aed-submission-images':'spot-images';
  const response=await timed(db.storage.from(bucket).upload(job.path,job.file,{contentType:'image/jpeg',upsert:false}));
  // The random path is persisted before upload, so a duplicate is our previous attempt.
  if(response.error && !['409','Duplicate'].includes(String(response.error.statusCode||response.error.code)))throw response.error;
  job.uploaded=true;await save(job);
 }
 if(!job.result){
  await check();
  const result=job.kind==='aed'
    ? await timed(db.from('aed_submissions').insert(job.payload).select('id,status').single())
    : await timed(db.rpc('submit_spot_once',{p_request_id:job.id,p_payload:job.payload}));
  if(result.error)throw result.error;
  if(!result.data?.id)throw Error('result_unknown');
  job.result=result.data;await save(job);
 }
 if(job.kind==='camera'&&!job.evidenceSaved){
  await check();
  await timed(evidence.saveBlob(job.file,job.width,job.height,job.result.id,job.id),45000);
  job.evidenceSaved=true;await save(job);
 }
 return job.result;
}
async function exclusive(fn){if(busy)throw Error('submission_busy');busy=true;try{return root.navigator?.locks?await root.navigator.locks.request('machimamo-post-outbox',fn):await fn();}finally{busy=false;}}
async function currentUser(){const {data,error}=await db.auth.getSession();if(error||!data.session)throw Error('login_required');return data.session.user;}
async function pending(){const u=await currentUser();return store.get(u.id);}
async function send(job){if(job.file?.size>10*1024*1024)throw Error('image_too_large');return exclusive(async()=>{const u=await currentUser();if(u.id!==job.userId)throw Error('login_required');await store.add(job);return resumeJob(job);});}
async function resumeJob(job){const result=await run(job,{db,evidence:root.MachimamoCameraEvidence,save:store.put});await store.remove(job.userId);return result;}
async function resume(){return exclusive(async()=>{const job=await pending();if(!job)throw Error('no_pending_post');return {job,result:await resumeJob(job)};});}
async function refresh(){
 const box=document.getElementById('postRetryArea');if(!box)return;
 try{const job=await pending();box.hidden=!job;if(job)box.querySelector('p').textContent=job.result?(job.kind==='original'?'元画像の保存結果を確認できます。':'投稿は受付済みです。画像送信の続きだけを再開できます。'):'未完了の送信があります。結果を確認して同じ投稿として再送します。';}catch(_){box.hidden=true;}
}
async function retry(){try{const {job,result}=await resume();root.showToast?.(job.kind==='original'?'元画像を非公開で保存しました。':job.kind==='aed'?'AED投稿を受け付けました。審査結果をお待ちください。':`投稿を確認しました（付与 ${result.awarded}pt）。`);if(['spot','camera'].includes(job.kind)){visibleMapCategories.add(job.payload.category);syncFilterChips();await loadSpots();}await loadAuthenticatedProfile();}catch(_){root.showToast?.('送信は未完了です。通信とログインを確認して再開してください。');}finally{refresh();}}
async function discard(){if(!confirm('端末の再送データを破棄します。サーバーで受付済みの投稿は削除されません。必要な場合は活動履歴から削除してください。'))return;try{await exclusive(async()=>{const u=await currentUser();await store.remove(u.id);});refresh();}catch(_){root.showToast?.('送信中は破棄できません。');}}
root.MachimamoPostOutbox={send,pending,resume,refresh,retry,discard};
if(typeof module!=='undefined')module.exports={run,timed};
if(typeof document!=='undefined'){
 document.body.insertAdjacentHTML('beforeend','<aside id="postRetryArea" hidden style="position:fixed;bottom:80px;left:12px;right:12px;z-index:30000;background:white;border:2px solid #2563eb;border-radius:12px;padding:12px;max-width:460px;margin:auto;font-size:14px"><p style="margin:0 0 8px"></p><button type="button" onclick="MachimamoPostOutbox.retry()">送信を再開</button> <button type="button" onclick="MachimamoPostOutbox.discard()">端末の再送データを破棄</button><small style="display:block;margin-top:6px">送信完了まで画像をこのブラウザーに保持します。共用端末では破棄してください。</small></aside>');
 setTimeout(refresh,1000);
}
})(typeof window!=='undefined'?window:globalThis);
