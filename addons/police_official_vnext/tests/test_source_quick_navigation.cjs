'use strict';
// Nonproduction fixture-only tests. Reuses existing MAP components, no network or Supabase.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../official-police-hub.js');
class N {
  constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={display:'block'};this.hidden=false;this.textContent='';this.handlers={};this.classList={toggle(){}};}
  append(...nodes){this.children.push(...nodes)}
  prepend(...nodes){this.children.unshift(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes]}
  setAttribute(key,val){this.attributes[key]=String(val)}
  addEventListener(key,fn){this.handlers[key]=fn}
  focus(){this.focused=true}
}
function locate(parent,pred){
  if(pred(parent))return parent;
  for(const child of (parent?.children||[])){
    const found=locate(child,pred);if(found)return found;
  }
  return null;
}
function matches(parent,pred){return pred(parent)?[parent]:parent.children.flatMap(x=>matches(x,pred))}
const bar=new N('div'),host=new N('main');
const doc={createElement:tag=>new N(tag),querySelector:sel=>sel==='#filterWrapper .filter-content'?bar:null,
 getElementById:id=>id==='map-container'?host:id==='adminDashboardArea'?new N('section'):null};
const n=[];let fetches=0,adminCalls=0;
const registry=JSON.parse(fs.readFileSync(path.join(__dirname,'../official_source_registry.json'),'utf8'));
const hub=api.mount({doc,sourceOnly:true,location:{href:'https://offline.example.test/',origin:'https://offline.example.test'},
 fetcher:async url=>{fetches++;assert.equal(url,'/official_source_registry.json');return {ok:true,json:async()=>registry}},
 openNearby:(type)=>n.push(type)});
(async()=>{
  assert.equal(hub.getState().sourceOnly,true);
  const panel=host.children[0],toggle=bar.children[0];
  assert.equal(panel.hidden,true);
  const quick=locate(panel,n=>n.tag==='nav'&&n.attributes['aria-label']==='調べたい防犯情報から探す');
  assert.ok(quick,'same MAP panel must contain the scenario navigation');
  const quickButtons=matches(quick,n=>n.attributes['data-police-topic']);
  assert.equal(quickButtons.length,5);
  const mapButtons=matches(quick,n=>n.attributes['data-police-map-action']);
  assert.equal(mapButtons.length,2);
  toggle.handlers.click();assert.equal(panel.hidden,false);
  quickButtons.find(x=>x.attributes['data-police-topic']==='fraud').handlers.click();
  assert.equal(quickButtons.find(x=>x.attributes['data-police-topic']==='fraud').attributes['aria-pressed'],'true');
  assert.equal(matches(panel,n=>n.tag==='a'&&n.textContent.includes('犯罪情報マップ')).length,1);
  quickButtons.find(x=>x.attributes['data-police-topic']==='national').handlers.click();
  assert.equal(fetches,0,'no unreviewed or external data fetched by clicking');
  await hub.refresh({national:'official_source_registry.json'});
  assert.equal(fetches,1);
  assert.equal(matches(panel,n=>n.tag==='a'&&n.textContent.includes('の公式データ公開元')).length,47);
  const input=locate(panel,n=>n.tag==='input'&&n.type==='search');assert.ok(input);
  input.value='東京';input.handlers.input();
  assert.equal(matches(panel,n=>n.tag==='a'&&n.textContent.includes('の公式データ公開元')).length,1);
  assert.equal(matches(panel,n=>n.tag==='p'&&n.textContent==='1 / 47 都道府県の公開元').length,1);
  input.value='一致しない地名';input.handlers.input();
  assert.equal(matches(panel,n=>n.tag==='a'&&n.textContent.includes('の公式データ公開元')).length,0);
  const reset=locate(panel,n=>n.tag==='button'&&n.textContent==='クリア');reset.handlers.click();
  assert.equal(matches(panel,n=>n.tag==='a'&&n.textContent.includes('の公式データ公開元')).length,47);
  assert.equal(input.value,'');
  input.value='神奈川';input.handlers.input();
  const navigation=quickButtons.find(x=>x.attributes['data-police-topic']==='fraud');navigation.handlers.click();
  quickButtons.find(x=>x.attributes['data-police-topic']==='national').handlers.click();
  const input2=locate(panel,n=>n.tag==='input'&&n.type==='search');
  assert.equal(input2.value,'神奈川','search choice persists while navigating within same MAP panel');
  assert.equal(matches(panel,n=>n.tag==='a'&&n.textContent.includes('の公式データ公開元')).length,1);
  mapButtons.find(x=>x.attributes['data-police-map-action']==='police').handlers.click();
  assert.equal(panel.hidden,true);assert.deepEqual(n,['police']);
  toggle.handlers.click();
  mapButtons.find(x=>x.attributes['data-police-map-action']==='aed').handlers.click();
  assert.deepEqual(n,['police','aed']);assert.equal(panel.hidden,true);
  await hub.loadAdmin({password:'TEST_ONLY',rpc:()=>{adminCalls++;return Promise.resolve({})}});
  assert.equal(adminCalls,0);
  await assert.rejects(hub.refresh({town_stats:'private.json'}),/source-only/);
  assert.equal(fetches,1);
  assert.throws(()=>hub.setSyntheticBundle({registry}),/source-only/);
  const source=fs.readFileSync(path.join(__dirname,'../official-police-hub.js'),'utf8');
  for(const bad of ['point_transactions','admin_adjust_points','supabase.auth.signIn','navigator.geolocation'])assert.ok(!source.includes(bad));
  console.log('R13_SOURCE_QUICK_LINKS_PREFECTURE_SEARCH_MAP_REUSE_PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
