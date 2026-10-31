'use strict';
// Public link-only integration into the ORIGINAL MAP filter. Absolutely no real DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../official-police-hub.js');
class Node {
  constructor(tag) {
    this.tag=tag;this.children=[];this.attributes={};this.style={display:'block'};
    this.hidden=false;this.textContent='';this.handlers={};
    this.classList={toggle(){}};
  }
  append(...n){this.children.push(...n)}
  prepend(...n){this.children.unshift(...n)}
  replaceChildren(...n){this.children=[...n]}
  setAttribute(k,v){this.attributes[k]=v}
  addEventListener(k,f){this.handlers[k]=f}
}
const bar=new Node('div'),mapHost=new Node('div'),admin=new Node('section');
const doc={createElement:t=>new Node(t),querySelector:q=>q==='#filterWrapper .filter-content'?bar:null,
 getElementById:id=>id==='map-container'?mapHost:id==='adminDashboardArea'?admin:null};
const calls=[];
const loc={href:'https://isolated.example.test/index.html',origin:'https://isolated.example.test'};
const registry=JSON.parse(fs.readFileSync(path.join(__dirname,'../official_source_registry.json'),'utf8'));
const hub=api.mount({doc,location:loc,sourceOnly:true,enabled:true,fetcher:async (relative,options)=>{
 calls.push({relative,options});return {ok:true,json:async()=>registry};}});
assert.equal(hub.getState().sourceOnly,true);
assert.equal(bar.children.length,1);
assert.equal(bar.children[0].textContent,'公式防犯・データ');
assert.equal(mapHost.children[0].attributes['data-source-only'],'true');
assert.equal(mapHost.children[0].hidden,true);
(async()=>{
 const res=await hub.refresh({national:'official_source_registry.json'});
 assert.equal(res.retained_previous,false);
 assert.equal(calls.length,1);
 assert.equal(calls[0].relative,'/official_source_registry.json');
 assert.equal(hub.getState().directory,true);
 await assert.rejects(hub.refresh({precursor:'data/precursor.json'}),/source-only/);
 await assert.rejects(hub.refresh({town_stats:'data/town.json'}),/source-only/);
 assert.equal(calls.length,1,'unreviewed source records must never be fetched');
 assert.throws(()=>hub.setSyntheticBundle({registry}),/source-only/);
 let adminCalled=0;
 await hub.loadAdmin({password:'fake-only',rpc:()=>{adminCalled++;return {};}});
 assert.equal(adminCalled,0,'source link-only must never access any admin API');
 assert.equal(api.isSafeSourceUrl(api.SOURCE_PAGES.opendata),true);
 assert.equal(api.isSafeSourceUrl(api.SOURCE_PAGES.precursor),true);
 assert.equal(api.isSafeSourceUrl(api.SOURCE_PAGES.town_stats),true);
 assert.equal(api.isSafeSourceUrl(api.SOURCE_PAGES.fraud),true);
 assert.equal(api.isSafeSourceUrl(api.SOURCE_PAGES.national),true);
 assert.equal(api.visibleDirectory(registry).length,47);
 assert.equal(hub.getState().stats,false);
 assert.equal(hub.getState().precursor,false);
 console.log('SOURCE_ONLY_ORIGINAL_MAP_NO_DB_47_LINKS_PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
