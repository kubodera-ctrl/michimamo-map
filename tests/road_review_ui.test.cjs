const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function node(tag,text=''){return {tag,textContent:text,children:[],value:'',checked:false,disabled:false,append(...n){this.children.push(...n);},replaceChildren(...n){this.children=n;},setAttribute(){},querySelectorAll(tag){return walk(this).filter(n=>n.tag===tag);}};}
function walk(n){return [n,...n.children.flatMap(walk)];}
const mount=node('section'),document={createElement:node,getElementById:()=>mount},window={};
vm.runInNewContext(fs.readFileSync(require.resolve('../road-parking-summary.js'),'utf8'),{window});
vm.runInNewContext(fs.readFileSync(require.resolve('../road-review.js'),'utf8'),{window,document});
const view=window.MachimamoRoadReview;
const snapshot={fromMs:100,toMs:1000,nowMs:1000,periodId:'p',roads:[{id:'road-a',label:'道路A',boundaries:'始点から終点',code:'a'}],records:[],queueTotal:1,
 queue:[{id:'1',title:'<img src=x onerror=alert(1)>',comment:'テスト',created_at:'2026-09-16T00:00:00Z',lat:35,lng:139,source_version:'version1',review_status:'pending'}]};
let calls=[],valid=true,hold=null;
const ctx={password:'fixture-not-real',isCurrent:()=>valid,rpc:async(name,args)=>{calls.push(args);if(hold)return new Promise(r=>hold.push(r));return {data:structuredClone(snapshot)};}};
const text=()=>walk(mount).map(n=>n.textContent).join(' ');
const button=label=>walk(mount).find(n=>n.tag==='button'&&n.textContent===label);
(async()=>{
 await view.load(ctx);assert.match(text(),/未確認/);assert.match(text(),/<img src=x/);assert.equal(walk(mount).some(n=>n.tag==='img'),false,'user content is text');
 button('確認して集計対象にする').onclick();assert.equal(calls.length,1,'no review without required checks');
 await button('集計対象外にする').onclick();await new Promise(r=>setImmediate(r));
 assert.equal(calls.find(x=>x.p_action==='review').p_payload.decision,'rejected');
 const controls=walk(mount),selects=controls.filter(n=>n.tag==='select');selects[0].value='road-a';selects[0].onchange();
 const checks=controls.filter(n=>n.tag==='input' && n.type==='checkbox').slice(1);checks[0].checked=checks[1].checked=checks[2].checked=true;
 controls.find(n=>n.type==='datetime-local').value='2026-09-16T00:00';
 button('確認して集計対象にする').onclick();await new Promise(r=>setImmediate(r));
 const accepted=calls.filter(x=>x.p_action==='review').at(-1).p_payload;
 assert.equal(accepted.decision,'accepted');assert.equal(accepted.source_version,'version1');assert.equal(accepted.road_id,'road-a');
 assert.equal(accepted.checks.obstruction,false,'obstruction is not inferred from approval');

 hold=[];const old=view.load(ctx);view.reset();hold[0]({data:snapshot});await old;assert.equal(mount.children.length,0,'late read cannot restore after close');
 hold=null;await view.load(ctx);valid=false;await button('再読込').onclick();assert.equal(calls.at(-1).p_action,'list');
 valid=true;hold=[];const a=view.load(ctx);hold[0]({data:snapshot});await a;
 const r1=button('再読込').onclick(); // while loading there is no further button; stale generation tested above
 view.reset();hold[1]({data:snapshot});await r1;assert.equal(mount.children.length,0);
 assert.equal(view.dateLocal('invalid'),'');
 console.log('PASS: real shared aggregator in UI, safe text rendering, review gates, exclusion action, stale read/close and invalid-session guards. No browser rendering or real admin login claimed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
