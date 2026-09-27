const assert=require('node:assert/strict');
const {planTimeline}=require('./timeline.cjs');
assert.deepEqual(planTimeline('SINGLE',1).pages.map(p=>[p.kind,p.startSec,p.endSec]),[['TOP',0,3],['MAP',3,10],['NEWS',10,22],['MAP_INFO',22,30],['LOGIC',30,38],['END',38,43]]);
for(const [n,d] of [[1,50],[3,50],[4,62],[6,62],[9,74],[12,86],[15,98]]) {
 const p=planTimeline('WEEKLY',n); assert.equal(p.durationSec,d);
 assert.equal(p.pages.filter(x=>x.kind==='NEWS').reduce((s,x)=>s+x.newsCount,0),n);
 assert(p.pages.filter(x=>x.kind==='NEWS').every(x=>x.durationSec===12&&x.animationSec===10&&x.holdSec===2));
 assert.equal(p.pages.at(-1).durationSec,5);
}
for(const n of [0,-1,1.5,NaN,Infinity,'6']) assert.throws(()=>planTimeline('WEEKLY',n));
assert.throws(()=>planTimeline('SINGLE',2)); assert.throws(()=>planTimeline('TRIAL15',1));
console.log('PASS CURRENT SINGLE/WEEKLY timeline, pagination boundaries and invalid inputs');
