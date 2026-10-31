'use strict';
// Exact existing MAP controller: isolated DOM/RPC test, no browser or network.
const assert=require('node:assert/strict');
const hublib=require('../official-police-hub.js');
class Node {
  constructor(tag){ this.tag=tag;this.children=[];this.hidden=false;this.style={display:'block'};
    this.textContent='';this.attributes={};this.checked=false;this.disabled=false;
    this.classList={toggle:()=>{}};this.handlers={};}
  append(...xs){this.children.push(...xs)}
  prepend(...xs){this.children.unshift(...xs)}
  replaceChildren(...xs){this.children=[...xs]}
  setAttribute(k,v){this.attributes[k]=v}
  addEventListener(k,fn){this.handlers[k]=fn}
}
const admin=new Node('section'), filter=new Node('div'), map=new Node('div');
const doc={createElement:tag=>new Node(tag),querySelector:()=>filter,
  getElementById:id=>id==='adminDashboardArea'?admin:id==='map-container'?map:null,
  defaultView:{confirm:()=>{throw new Error('unexpected confirm')}}};
function nodes(node,tag){return (node.tag===tag?[node]:[]).concat(...node.children.map(n=>nodes(n,tag)))}
async function main(){
  const opts={doc,map:{},leaflet:{},fetcher:()=>{throw new Error('network forbidden')},
    location:{href:'https://isolated.example.test/',origin:'https://isolated.example.test'}};
  assert.equal(hublib.mount({...opts,enabled:false}),null);
  assert.equal(filter.children.length,0);
  const hub=hublib.mount({...opts,enabled:true});
  assert.ok(hub);
  let calls=0;
  const unidentified={id:9,title:'架空公式メール',dataset:'mail',source_id_verified:false,
    source_status:'active',content_hash:'a'.repeat(64),source_file_sha256:'b'.repeat(64),
    source_url:'https://mail.keishicho.metro.tokyo.lg.jp/opendata/',is_fixture:false,
    requires_review:true,review_status:'pending'};
  const rpc=async(name)=>{calls++; assert.equal(name,'admin_get_police_official_review');
    return {data:{scope:'police_official_review',pending:1,queue:[unidentified]}}};
  admin.style.display='none';
  await hub.loadAdmin({password:'synthetic',rpc,isCurrent:()=>true});
  assert.equal(calls,0,'admin hidden must not issue RPC');
  admin.style.display='block';
  await hub.loadAdmin({password:'synthetic',rpc,isCurrent:()=>true});
  assert.equal(calls,1);
  assert.equal(nodes(admin,'button').length,0,'unidentified mail must have no approval');
  assert.equal(nodes(admin,'input').length,0,'unidentified mail must not present rights checkbox');
  const warning=nodes(admin,'p').map(n=>n.textContent).join(' ');
  assert.ok(warning.includes('公式事案ID未確認'));
  assert.ok(warning.includes('非公開'));
  assert.ok(!warning.includes('自動承認できます'));
  // Stale admin response after logout must not cause a privileged review write.
  await hub.loadAdmin({password:'synthetic',rpc,isCurrent:()=>false});
  assert.equal(nodes(admin,'button').length,0);
  const authFail=async()=>({error:{message:'admin_required'}});
  await hub.loadAdmin({password:'synthetic',rpc:authFail,isCurrent:()=>true});
  assert.ok(nodes(admin,'p').some(x=>x.textContent.includes('RPCは未接続')));
  assert.equal(nodes(admin,'button').length,0);
  console.log('MAIL_IDENTITY_ADMIN_SAFE: focused role and no-identity UI checks PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1});
