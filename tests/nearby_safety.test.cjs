const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(){
 const elements={}, requests=[], gps=[];
 function element(id){return elements[id] ||= {innerHTML:'',textContent:'',hidden:false,inert:false,classList:{values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)},contains(x){return this.values.has(x)}},setAttribute(){},querySelector(){return {focus(){}}},querySelectorAll(){return []},addEventListener(){}};}
 const context=vm.createContext({window:{},document:{body:{insertAdjacentHTML(){}},activeElement:{focus(){}},getElementById:element},navigator:{geolocation:{getCurrentPosition(ok,error){gps.push({ok,error})}}},map:{getCenter:()=>({lat:35,lng:139})},db:{rpc(name,args){return new Promise(resolve=>requests.push({name,args,resolve}))}},buildSafetyNavigationUrl:()=> 'https://www.google.com/maps/dir/?api=1',setTimeout,clearTimeout,Intl,Date});
 vm.runInContext(fs.readFileSync('nearby-safety.js','utf8'),context);
 return {api:context.window,elements,requests,gps};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const spot=name=>({name,facility_type:'aed',distance_m:142,lat:35,lng:139});
test('map-center choice invalidates late GPS and labels the correct origin',async()=>{
 const s=setup();s.api.openNearbySafety();s.api.searchNearbyMapCenter();
 s.gps[0].ok({coords:{latitude:36,longitude:140,accuracy:5}});
 assert.equal(s.requests.length,1);
 s.requests[0].resolve({data:[spot('地図の候補')]});await flush();
 assert.match(s.elements.nearbySafetyResults.innerHTML,/地図の中心から/);
 assert.match(s.elements.nearbySafetyResults.innerHTML,/地図の候補/);
});
test('stale category response cannot replace the newer category',async()=>{
 const s=setup();s.api.openNearbySafety();s.api.searchNearbyMapCenter();s.api.selectNearbyCategory('police');
 s.requests[1].resolve({data:[spot('最新の候補')]});await flush();
 s.requests[0].resolve({data:[spot('古い候補')]});await flush();
 assert.match(s.elements.nearbySafetyResults.innerHTML,/最新の候補/);assert.doesNotMatch(s.elements.nearbySafetyResults.innerHTML,/古い候補/);
});
test('closing ignores pending results; denial offers explicit map fallback',async()=>{
 const s=setup();s.api.openNearbySafety();s.gps[0].error({code:1});
 assert.match(s.elements.nearbySafetyResults.innerHTML,/許可されていません/);
 s.api.searchNearbyMapCenter();s.api.closeNearbySafety();s.requests[0].resolve({data:[spot('late')]});await flush();
 assert.doesNotMatch(s.elements.nearbySafetyResults.innerHTML,/late/);
});
test('untrusted facility text is escaped and failed searches do not retain old candidates',async()=>{
 const s=setup();s.api.openNearbySafety();s.api.searchNearbyMapCenter();s.requests[0].resolve({data:[spot('<img onerror=bad>')]});await flush();
 assert.match(s.elements.nearbySafetyResults.innerHTML,/&lt;img onerror=bad&gt;/);
 s.api.selectNearbyCategory('police');s.requests[1].resolve({error:{message:'fail'}});await flush();
 assert.match(s.elements.nearbySafetyResults.innerHTML,/取得できません/);assert.doesNotMatch(s.elements.nearbySafetyResults.innerHTML,/onerror/);
});
