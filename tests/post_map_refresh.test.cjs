const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
test('successful post refreshes map and enables its category even if photo upload failed',async()=>{
 const start=html.indexOf('        if (!error && data && data.length > 0) {',html.indexOf('async function handlePostSubmit'));
 const end=html.indexOf('\n        else {',start);
 for(const fails of [false,true]){
  const calls=[],visible=new Set();
  const ctx={error:null,data:[{id:42}],cat:'danger',cameraPostDraft:{width:640,height:480},uploadedImageFile:{},
   window:{MachimamoCameraEvidence:{saveBlob:async()=>{if(fails)throw Error('offline');}}},actionLimits:{postCount:0},
   saveLimits(){},loadAuthenticatedProfile:async()=>{},showToast:t=>calls.push(t),closePostModal:()=>calls.push('close'),
   visibleMapCategories:visible,syncFilterChips:()=>calls.push('filters'),loadSpots:async()=>calls.push('reload')};
  await vm.runInNewContext('(async()=>{'+html.slice(start,end)+'})()',ctx);
  assert.ok(visible.has('danger'));assert.equal(calls.at(-1),'reload');
  if(fails)assert.match(calls[0],/画像の送信に失敗/);
 }
});
