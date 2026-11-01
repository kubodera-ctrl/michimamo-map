'use strict';
const assert = require('node:assert/strict');
const {createSafetyAssist} = require('../safety-assist.js');
class Node {
 constructor(tag){this.tag=tag;this.textContent='';this.hidden=false;this.children=[];this.attributes={};this.handlers={};this.id='';this.className='';this.disabled=false;this.href='';this.type='';this.focused=false;}
 append(...x){this.children.push(...x)}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,fn){this.handlers[k]=fn}
 querySelector(q){ if(q.startsWith('.'))return walk(this).find(x=>x.className===q.slice(1))||null; return null;}
 focus(){this.focused=true}
}
function walk(n){return [n,...n.children.flatMap(walk)]}
const body=new Node('body'), previous=new Node('button');
const document={body,activeElement:previous,createElement:t=>new Node(t)};
let geoCalls=0, shares=0, copied=0, starts=0, stops=0, closed=0, timerCb;
const pos={coords:{latitude:35.62677,longitude:139.77633}};
const win={navigator:{geolocation:{getCurrentPosition(success){geoCalls++;success(pos)}},async share(data){shares++;assert.match(data.url,/35.62677,139.77633/);}},
 setTimeout(fn){timerCb=fn;return 1},clearTimeout(){timerCb=null},
 AudioContext:class {constructor(){this.currentTime=0;this.destination={};}createOscillator(){return {type:'',frequency:{value:0},start(){starts++},stop(){stops++},connect(){}}}createGain(){return {gain:{setValueAtTime(){}},connect(){}}}async close(){closed++}async resume(){}}};
const api=createSafetyAssist(document,win);
assert.equal(geoCalls,0);assert.equal(starts,0);
api.open();assert.deepEqual(api.getState(),{open:true,buzzerActive:false,locationReady:false});
const o=body.children[0], nodes=walk(o);
const byText=txt=>nodes.find(n=>n.textContent===txt);
assert.ok(byText('助けてください（画面表示）'));assert.ok(byText('痴漢被害を周囲に知らせる'));
assert.equal(nodes.find(n=>n.href==='tel:110')?.textContent,'110番へ電話');
assert.equal(nodes.find(n=>n.href==='tel:119')?.textContent,'119番へ電話');
assert.equal(geoCalls,0,'location must NOT be obtained on open');
assert.equal(shares,0,'never auto share');
byText('助けてください（画面表示）').handlers.click();
assert.equal(byText('助けてください。近くの方、110番へ連絡してください。').hidden,false);
byText('痴漢被害を周囲に知らせる').handlers.click();
assert.equal(byText('ちかんです。助けてください。').hidden,false);
byText('ブザー音を鳴らす').handlers.click();assert.equal(starts,1);assert.equal(api.getState().buzzerActive,true);
assert.equal(geoCalls,0);
byText('現在地を確認').handlers.click();assert.equal(geoCalls,1);assert.equal(api.getState().locationReady,true);assert.equal(shares,0);
(async()=>{
 await byText('取得した現在地を共有する').handlers.click();assert.equal(shares,1);
 api.close();assert.equal(api.getState().open,false);assert.equal(api.getState().locationReady,false);assert.equal(api.getState().buzzerActive,false);assert.ok(stops>=1);assert.equal(previous.focused,true);
 assert.equal(copied,0);
 // Callback after the dialog closes must never make a position ready.
 let callback;
 win.navigator.geolocation.getCurrentPosition=fn=>{geoCalls++;callback=fn};
 api.open();byText('現在地を確認').handlers.click();api.close();callback(pos);
 assert.equal(api.getState().locationReady,false);
 // Denied permission cannot disclose/share coordinates.
 win.navigator.geolocation.getCurrentPosition=(_,error)=>error({code:1});
 api.open();byText('現在地を確認').handlers.click();assert.equal(api.getState().locationReady,false);
 api.close();
 console.log('R17_SAFETY_ASSIST_NO_AUTOSEND: 24 focused checks PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
