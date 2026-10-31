'use strict';
const assert=require('node:assert/strict');
const lib=require('../official-police-hub.js');
class N{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={display:'block'};this.hidden=false;this.value='';this.checked=false;this.textContent='';this.handlers={};this.disabled=false;this.classList={toggle:()=>{}};}
 append(...n){this.children.push(...n)}
 prepend(...n){this.children.unshift(...n)}
 replaceChildren(...n){this.children=[...n]}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,v){this.handlers[k]=v}
}
const root=new N('div'),bar=new N('div'),mapHost=new N('div');
const nodes={adminDashboardArea:root,'map-container':mapHost};
let confirms=0;
const doc={createElement:t=>new N(t),querySelector:()=>bar,getElementById:id=>nodes[id]||null,defaultView:{confirm:()=>{confirms++;return true}}};
const hub=lib.mount({doc,map:{},leaflet:{},fetcher:()=>{throw new Error('network disabled')},location:{href:'https://machimamo.sumion.net',origin:'https://machimamo.sumion.net'},enabled:true});
let calls=[];
const record={id:4,dataset:'mail',source_status:'active',title:'架空テスト',content_hash:'a'.repeat(64),source_file_sha256:'b'.repeat(64),source_url:lib.SOURCE_PAGES.opendata,review_status:'pending',is_fixture:false,requires_review:false,source_id_verified:true};
async function rpc(method,args){calls.push({method,args});return method==='admin_get_police_official_review'?{data:{scope:'police_official_review',pending:1,queue:[record]}}:{data:{reviewed:true}};}
function find(node,tag){if(node.tag===tag)return [node];return node.children.flatMap(n=>find(n,tag))}
(async()=>{
 await hub.loadAdmin({password:'dummy-only',rpc,isCurrent:()=>true});
 const buttons=find(root,'button');
 assert.equal(buttons.length,2);
 const checkbox=find(root,'input')[0];
 await buttons[0].handlers.click();
 assert.equal(calls.filter(c=>c.method==='admin_review_police_official').length,0,'unchecked approval denied');
 checkbox.checked=true;await buttons[0].handlers.click();
 const approvals=calls.filter(c=>c.method==='admin_review_police_official');
 assert.equal(approvals.length,1);
 assert.equal(approvals[0].args.p_expected_hash,record.content_hash);
 assert.equal(approvals[0].args.p_verified_source_sha256,record.source_file_sha256);
 assert.equal(approvals[0].args.p_rights_evidence_url,'https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy');
 assert.equal(confirms,1);
 // An official URL is NOT rights evidence for the 2026 precursor CSV, and the
 // historical town-statistics CC BY catalog record does not cover R8 by itself.
 const stagedRights=[{...record,id:7,dataset:'precursor',title:'架空：前兆事案'},
     {...record,id:8,dataset:'town_stats',title:'架空：町丁目統計'}];
 async function rightsPendingRpc(method,args){
     if(method==='admin_get_police_official_review')return {data:{scope:'police_official_review',pending:2,queue:stagedRights}};
     throw new Error('Blocked by rights gate');
 }
 root.replaceChildren(); // The test DOM mock does not track dynamically-created IDs.
 await hub.loadAdmin({password:'dummy-only',rpc:rightsPendingRpc,isCurrent:()=>true});
 assert.equal(find(root,'button').length,0,'Unverified datasets must have no approval buttons');
 assert.equal(find(root,'input').length,0,'Unverified datasets must have no rights checkbox');
 assert.equal(find(root,'p').filter(n=>n.textContent.includes('現段階は承認不可')).length,2);
 console.log('admin-hub nonproduction targeted: 10 assertions PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
