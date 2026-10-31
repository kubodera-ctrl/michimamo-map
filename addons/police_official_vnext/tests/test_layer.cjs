'use strict';
const assert = require('node:assert/strict');
const api = require('../official-police-layer.js');
const base = {schema_version: 1, source_id: api.SOURCE_ID, last_success_at:'2026-10-31T00:00:00Z', records:[]};
const event = {source_id: api.SOURCE_ID, id: 'official1', title:'【架空】声かけ事案',
 summary: '<script>alert(1)</script> これは架空の単体テスト', area_label:'東京都の架空地域',
 source_status:'active', review_status:'approved', rights_status:'verified', identity_verified:true, is_fixture:false,
 location_precision:'municipality', location_source:'geocoder_centroid', latitude:35.69, longitude:139.76,
 published_at:'2026-10-31', occurred_at:null, recognized_at:null,
 source_url:'https://not-authorized.example.org/bad'};
assert.deepEqual(api.validateSnapshot({...base,records:[event]}),[event]);
assert.equal(api.exactPoint(event),false,'Municipality centroid must not pin');
assert.equal(api.exactPoint({...event,location_precision:'exact'}),false,'Geocoded exact is not sufficient');
assert.equal(api.exactPoint({...event,location_precision:'exact',location_source:'police_explicit_coordinates'}),true);
assert.equal(api.visible({...event, review_status:'pending'}),false);
assert.equal(api.visible({...event, rights_status:'unverified'}),false,'unverified rights must not render');
assert.equal(api.visible({...event, is_fixture:true}),false);
assert.equal(api.visible({...event, source_status:'withdrawn'}),false);
assert.equal(api.visible({...event, source_status:'corrected'}),true);
assert.throws(()=>api.validateSnapshot({...base,records:[event,event]}),/重複/);
assert.throws(()=>api.validateSnapshot({...base,source_id:'local_anomaly'}),/形式/);

class FakeNode {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.handlers={};this.textContent='';this.hidden=false;
  this.classList={toggle:(n,t)=>this.attrs[n]=t};}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=[...nodes]}
 addEventListener(name,fn){this.handlers[name]=fn}
 setAttribute(name,value){this.attrs[name]=value}
}
const bar=new FakeNode(),mapContainer=new FakeNode(),nodes={};
const doc={createElement:(tag)=>new FakeNode(tag),querySelector:()=>bar,
 getElementById:(id)=>nodes[id]|| (id==='map-container'?mapContainer:null)};
let add=0, clear=0;
const layer={addTo(){return this},clearLayers(){clear++}};
const leaflet={layerGroup:()=>layer,marker:()=>({bindPopup(popup){this.popup=popup;return this},addTo(){add++;return this}})};
let response={ok:true,json:async()=>({...base,records:[event]})};
const ctrl=api.createController({doc,map:{},leaflet,fetcher:async(path)=>{assert.equal(path,'/police.json');return response},
 location:{href:'https://machimamo.sumion.net/',origin:'https://machimamo.sumion.net'},enabled:true});
assert.equal(ctrl.getState().visible,0);
assert.equal(ctrl.setSnapshot({...base,records:[event]}).visible,1);
assert.equal(ctrl.getState().exact_markers,0);
assert.equal(add,0);
// No raw HTML injection is ever used: content is only textContent.
const detail=api.detail(doc,event);
assert.equal(detail.children[4].textContent.includes('<script>alert(1)</script>'),true);
assert.equal(detail.children[detail.children.length-1].href, 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/');
ctrl.setSnapshot({...base,records:[{...event,location_precision:'exact',location_source:'police_explicit_coordinates'}]});
assert.equal(add,1);
(async()=>{
 response={ok:false,json:async()=>null};
 let r=await ctrl.refresh('/police.json');assert.equal(r.error,true);assert.equal(r.preserved,1);
 assert.equal(ctrl.getState().exact_markers,1);
 await assert.rejects(()=>ctrl.refresh('https://evil.example.com/records'),/同一オリジン/);
 response={ok:true,json:async()=>({...base,records:[{...event,source_status:'withdrawn'}]})};
 r=await ctrl.refresh('/police.json');assert.equal(r.visible,0);assert.equal(ctrl.getState().exact_markers,0);
 console.log('official-police-layer: 17 targeted assertions PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
