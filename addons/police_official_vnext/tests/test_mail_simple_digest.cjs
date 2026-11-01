'use strict';
// Purely synthetic R16 group counts. No real police payloads or network.
const assert=require('node:assert/strict');
const api=require('../official-police-hub.js');
const now=Date.parse('2026-10-20T19:00:00+09:00');
const make=()=>({
 schema_version:1,kind:'police_mail_official_distribution_digest',
 source_url:api.SOURCE_PAGES.opendata,policy_url:api.SOURCE_PAGES.opendata+'policy',
 license:'CC-BY-4.0',identity_scope:'delivered_messages_not_incidents',
 publication_enabled:true,raw_subjects_or_bodies_included:false,
 personal_locations_included:false,official_event_id_present:false,
 independent_case_deduplication:false,source_export_sha256:'a'.repeat(64),
 export_window_start:'2026-10-20',export_window_end_exclusive:'2026-10-21',
 checked_at:'2026-10-20T18:59:00+09:00',expires_at:'2026-10-21T18:59:00+09:00',
 total_deliveries:3,classification_basis:'locally_classified_delivery_count_not_official_crime_type',
 topic_groups:[
  {topic:'子ども関連の配信',deliveries:1,basis:'locally_classified_delivery_count_not_official_crime_type'},
  {topic:'特殊詐欺関連の配信',deliveries:1,basis:'locally_classified_delivery_count_not_official_crime_type'},
  {topic:'訂正・取消等の配信',deliveries:1,basis:'locally_classified_delivery_count_not_official_crime_type'}
 ],points_awarded:false,database_changed:false
});
let checks=0;
const item=api.validateOfficialMailDigest(make(),now);
assert.equal(item.total,3);checks++;
assert.equal(item.day,'2026-10-20');checks++;
assert.deepEqual(Object.keys(item.groups[0]),['topic','deliveries']);checks++;
assert.equal(item.groups.length,3);checks++;
for(const change of [
 d=>d.publication_enabled=false,
 d=>d.source_url='https://example.org',
 d=>d.policy_url='https://example.org',
 d=>d.source_export_sha256='incomplete',
 d=>d.license='unknown',
 d=>d.identity_scope='crime_events',
 d=>d.raw_subjects_or_bodies_included=true,
 d=>d.personal_locations_included=true,
 d=>d.independent_case_deduplication=true,
 d=>d.official_event_id_present=true,
 d=>d.points_awarded=true,
 d=>d.database_changed=true,
 d=>d.message='RAW_PRIVATE',
 d=>d.export_window_end_exclusive='2026-10-22',
 d=>d.checked_at='2026-10-21T20:00:00+09:00',
 d=>d.expires_at='2026-11-01T18:59:00+09:00',
 d=>d.total_deliveries=4,
 d=>d.topic_groups[0].deliveries=0,
 d=>d.topic_groups[0].topic='個人情報を含む原文',
 d=>d.topic_groups[0].message='秘密',
 d=>d.topic_groups.push({...d.topic_groups[0]}),
 d=>d.classification_basis='official-crime-count'
]){
 const x=make();change(x);assert.throws(()=>api.validateOfficialMailDigest(x,now));checks++;
}
assert.throws(()=>api.validateOfficialMailDigest(make(),now+25*3600000));checks++;
class Node{
 constructor(tag='div'){this.tag=tag;this.children=[];this.textContent='';this.hidden=false;this.attributes={};this.style={display:'block'};this.handlers={};this.classList={toggle(){}};}
 append(...items){this.children.push(...items)}
 prepend(...items){this.children.unshift(...items)}
 replaceChildren(...items){this.children=[...items]}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,fn){this.handlers[k]=fn}
 focus(){}
}
const setup=()=>{
 const bar=new Node('div'),container=new Node('div');
 const doc={createElement:t=>new Node(t),querySelector:q=>q==='#filterWrapper .filter-content'?bar:null,
 getElementById:id=>id==='map-container'?container:null};
 return {bar,container,doc};
};
(async()=>{
 const a=setup();const requests=[];
 const opts={doc:a.doc,sourceOnly:true,enabled:true,location:{origin:'https://isolated.test',href:'https://isolated.test/map'},
  fetcher:async (path,options)=>{requests.push({path,options});return {ok:true,json:async()=>make()};}};
 const off=api.mount(opts);
 await assert.rejects(()=>off.refreshOfficialMailDigest(),/disabled/);checks++;
 assert.equal(requests.length,0);checks++;
 const b=setup(), hub=api.mount({...opts,doc:b.doc,officialDigestEnabled:true});
 let state=await hub.refreshOfficialMailDigest();
 // Synthetic feed's checked_at is in the past relative to actual wall clock.
 // Current time validation must hide it, not claim success from a fake old feed.
 assert.equal(state.visible,0);checks++;
 const now2=Date.now();
 const isoJst=t=>new Date(t+9*3600000).toISOString().slice(0,19)+'+09:00';
 const currentDay=isoJst(now2).slice(0,10);
 const nextDay=isoJst(now2+86400000).slice(0,10);
 const fresh={...make(),export_window_start:currentDay,export_window_end_exclusive:nextDay,
  checked_at:isoJst(now2-60000),expires_at:isoJst(now2+3600000)};
 const c=setup(), req=[];
 const active=api.mount({...opts,doc:c.doc,officialDigestEnabled:true,
  fetcher:async(path,options)=>{req.push({path,options});return {ok:true,json:async()=>fresh}}});
 state=await active.refreshOfficialMailDigest();
 assert.equal(state.visible,3);checks++;
 assert.equal(req.length,1);checks++;
 assert.equal(req[0].path,'/data/police-official-mail-digest.json');checks++;
 assert.equal(req[0].options.cache,'no-store');checks++;
 c.bar.children[0].handlers.click();
 const text=JSON.stringify(c.container.children.map(p=>p.children.map(x=>x.textContent)));
 assert.ok(text.includes('警視庁'));checks++;
 assert.ok(text.includes('配信'));checks++;
 assert.ok(!text.includes('PRIVATE_PERSONAL'));checks++;
 let rpcCalls=0;
 await active.loadAdmin({password:'synthetic',rpc:()=>{rpcCalls++;return {}}});
 assert.equal(rpcCalls,0);checks++;
 console.log('R16_SIMPLE_OFFICIAL_DELIVERY_DIGEST: '+checks+' focused checks PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
