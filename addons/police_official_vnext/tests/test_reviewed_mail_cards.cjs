'use strict';
// Synthetic-only R14 safety tests. No real police records or external network.
const assert=require('node:assert/strict');
const api=require('../official-police-hub.js');
const now=Date.now();
const jst=t=>new Date(t+9*3600000).toISOString().slice(0,19)+'+09:00';
const good=()=>({
 schema_version:1,kind:'police_mail_delivery_messages_manual_review',
 source_url:api.SOURCE_PAGES.opendata,policy_url:api.SOURCE_PAGES.opendata+'policy',
 license:'CC-BY-4.0',identity_scope:'delivery_message_not_incident',
 publication_enabled:true,human_review_completed:true,privacy_review_completed:true,
 correction_check_completed:true,original_export_sha256:'a'.repeat(64),
 reviewed_at:jst(now-60000),expires_at:jst(now+3600000),
 cards:[{local_card_ref:'local-'+'b'.repeat(24),headline:'【架空】安全啓発のお知らせ',
 summary:'画面試験専用の架空説明です。',category:'子どもの安全',
 delivered_at:jst(now-180000),delivery_time_reviewed:true,
 display_area:'港区',area_reviewed:true,manual_review_status:'approved',
 privacy_review_status:'approved',correction_review_status:'checked'}]
});
let checks=0;
const clean=api.validateReviewedMailCards(good(),now);
assert.equal(clean.length,1);checks++;
assert.deepEqual(Object.keys(clean[0]).sort(),['category','delivered_at','display_area','headline','summary']);checks++;
for(const mutate of [
 f=>f.publication_enabled=false,
 f=>f.human_review_completed=false,
 f=>f.privacy_review_completed=false,
 f=>f.correction_check_completed=false,
 f=>f.license='unknown',f=>f.source_url='https://evil.example.test',
 f=>f.original_export_sha256='no',
 f=>f.cards[0].message='RAW_PERSONAL_DATA',
 f=>f.cards[0].latitude=35.5,
 f=>f.cards[0].official_id='invented',
 f=>f.cards[0].display_area='detail-1-2-3',
 f=>f.cards[0].area_reviewed=false,
 f=>f.cards[0].manual_review_status='pending',
 f=>f.cards[0].correction_review_status='unconfirmed',
 f=>f.cards[0].delivered_at=jst(now-32*86400000),
 f=>f.reviewed_at=jst(now+3600000),
 f=>f.expires_at=jst(now+7*86400000),
 f=>f.cards.push({...f.cards[0]})
]){const f=good();mutate(f);assert.throws(()=>api.validateReviewedMailCards(f,now));checks++;}
assert.throws(()=>api.validateReviewedMailCards(good(),now+2*3600000));checks++;
class Node{
 constructor(){this.children=[];this.attributes={};this.style={display:'block'};this.hidden=false;this.textContent='';this.handlers={};this.classList={toggle(){}};}
 append(...a){this.children.push(...a)}
 prepend(...a){this.children.unshift(...a)}
 replaceChildren(...a){this.children=[...a]}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,f){this.handlers[k]=f}
 focus(){}
}
const make=()=>{const bar=new Node(),map=new Node();return {bar,map,doc:{createElement:()=>new Node(),querySelector:q=>q==='#filterWrapper .filter-content'?bar:null,getElementById:id=>id==='map-container'?map:null}}};
(async()=>{
 const a=make(),requests=[];
 const base={doc:a.doc,sourceOnly:true,enabled:true,location:{origin:'https://isolated.test',href:'https://isolated.test/map'},
 fetcher:async (p)=>{requests.push(p);return {ok:true,json:async()=>good()}}};
 const off=api.mount(base);
 await assert.rejects(()=>off.refreshReviewedMailCards(),/disabled/);checks++;
 assert.equal(requests.length,0);checks++;
 const b=make(),hub=api.mount({...base,doc:b.doc,reviewedCardsEnabled:true});
 b.bar.children[0].handlers.click();
 const got=await hub.refreshReviewedMailCards();
 assert.equal(got.visible,1);checks++;
 assert.deepEqual(requests,['/data/police-reviewed-mail-cards.json']);checks++;
 let admin=0;await hub.loadAdmin({password:'test',rpc:()=>admin++});
 assert.equal(admin,0);checks++;
 console.log('R14_REVIEWED_DELIVERY_CARDS_CI: '+checks+' focused checks PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
