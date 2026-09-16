const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
function setup(){
 const el={}, requests=[], alerts=[]; let callback;
 const context=vm.createContext({document:{getElementById(id){return el[id] ||= {value:id==='postCategory'?'abandoned':'',checked:true,style:{},addEventListener(_,fn){callback=fn}};}},
  normalizeAedPhoto:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),
  FileReader:class{readAsDataURL(file){this.onload({target:{result:file.name}})}},alert:x=>alerts.push(x)});
 vm.runInContext('let uploadedImageFile=null,aedPhotoMeta=null,photoSelectionRequest=0;'+html.slice(html.indexOf("    document.getElementById('postImageInput').addEventListener('change'"),html.indexOf('    function closePostModal()')),context);
 return {context,requests,alerts,el,change:files=>callback({target:{files}})};
}
test('newer photo wins even when old conversion finishes late',async()=>{
 const s=setup(), old=s.change([{}]), newer=s.change([{}]);
 s.requests[1].resolve({file:{name:'new'}});await newer;
 s.requests[0].resolve({file:{name:'old'}});await old;
 assert.equal(vm.runInContext('uploadedImageFile.name',s.context),'new');
 assert.equal(s.el.imagePreview.src,'new');
 assert.equal(s.el.spotPhotoPrivacyConfirmed.checked,false);
});
test('failed replacement clears the old photo and confirmation',async()=>{
 const s=setup(); vm.runInContext('uploadedImageFile={name:"old"}',s.context);
 const pending=s.change([{}]);s.requests[0].reject(new Error('bad'));await pending;
 assert.equal(vm.runInContext('uploadedImageFile',s.context),null);
 assert.equal(s.el.imagePreview.style.display,'none');assert.equal(s.alerts.length,1);
});
test('closing or clearing invalidates in-flight conversion',async()=>{
 const s=setup(), pending=s.change([{}]);await s.change([]);
 s.requests[0].resolve({file:{name:'cancelled'}});await pending;
 assert.equal(vm.runInContext('uploadedImageFile',s.context),null);
 assert.equal(s.el.imagePreview.style.display,'none');
});
