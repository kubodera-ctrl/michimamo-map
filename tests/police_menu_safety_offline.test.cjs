'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(dir,'map-menu.js'),'utf8');
for(const existing of ['wbgt','aed','police','camera'])assert.match(source,new RegExp(`data-map-action="${existing}"`));
assert.match(source,/data-map-action="official-safety"/);
assert.match(source,/data-map-action="safety-assist"/);
assert.doesNotMatch(source,/fetch_police_data\.py|police_cron\.yml|supabase\.rpc/);
const modal={handlers:{},inert:true,attributes:{},classList:{add(){},remove(){}},
 setAttribute(k,v){this.attributes[k]=v},querySelector(){return {focus(){}}},querySelectorAll(){return []},addEventListener(k,v){this.handlers[k]=v}};
const trigger={attributes:{},setAttribute(k,v){this.attributes[k]=v},focus(){}};
const head={append(el){if(el.tag==='script')Promise.resolve().then(()=>{if(el.src.startsWith('official-police-hub'))win.MachimamoPoliceHub={mount:opts=>{assert.equal(opts.sourceOnly,true);return {refresh:async config=>{assert.equal(config.national,'official_source_registry.json')}}}};
 else if(el.src.startsWith('safety-assist'))win.MachimamoSafetyAssist={open:()=>calls.push('sos_open')};el.onload()})}};
const dom={createElement(tag){return {tag,id:'',href:'',rel:'',src:'',async:false}},getElementById(id){return ({mapMenuModal:modal,mapMenuBtn:trigger,policeOfficialHubToggle:{getAttribute:()=> 'false',click:()=>calls.push('hub_open')}})[id]||null},
 body:{insertAdjacentHTML(){calls.push('menu_dom')}},head};
const calls=[];
const win={fetch(){calls.push('fetch');return Promise.resolve()},openWbgtModal:()=>calls.push('wbgt'),
 openNearbySafety:k=>calls.push('nearby_'+k),alert:()=>calls.push('error_alert')};
const ctx={document:dom,window:win,Map,Promise,console,startAIPatrol:()=>calls.push('camera')};
vm.runInNewContext(source,ctx,{filename:'map-menu.js'});
function fire(action){modal.handlers.click({target:{closest:()=>({dataset:{mapAction:action}})}})}
(async()=>{
 const prior=['wbgt','aed','police','camera'];prior.forEach(fire);
 assert.ok(calls.includes('wbgt')&&calls.includes('nearby_aed')&&calls.includes('nearby_police')&&calls.includes('camera'));
 assert.equal(calls.includes('fetch'),false);
 fire('safety-assist');fire('official-safety');
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(calls.includes('sos_open'));
 assert.ok(calls.includes('hub_open'));
 assert.equal(calls.includes('fetch'),false,'menu must not directly send data');
 assert.equal(calls.includes('error_alert'),false);
 console.log('R17_EXISTING_MAP_MENU_REUSE_NO_DB: 18 focused checks PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
