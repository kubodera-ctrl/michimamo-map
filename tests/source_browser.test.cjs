const {test}=require('node:test');
const assert=require('node:assert/strict');
const {groups,fetchAll,mount}=require('../source-browser.js');
const row=(prefecture,municipality,extra={})=>({prefecture,municipality,facility_type:'aed',source_name:'公共データ',spot_count:1,...extra});
test('stored prefecture disambiguates municipalities; multi-word/full-width search and unknown region',()=>{
 const rows=[row('広島県','府中市'),row('東京都','府中市'),row(null,'不明'),row('北海道','札幌市')];
 assert.deepEqual(groups(rows).map(g=>g[0]),['北海道','東京都','広島県','地域未分類']);
 assert.equal(groups(rows,'東京都　府中 ＡＥＤ')[0][1].length,1);
 assert.equal(groups(rows,'存在しない地域').length,0);
});
test('fetches beyond old 1000 limit, rejects partial/error/changed results',async()=>{
 const rows=Array.from({length:1123},(_,id)=>({id})),offsets=[];
 const actual=await fetchAll({rpc:async(name,p)=>{assert.equal(name,'get_safety_source_summary_v2');offsets.push(p.p_offset);return {data:{total:rows.length,items:rows.slice(p.p_offset,p.p_offset+p.p_limit)}};}});
 assert.deepEqual(actual,rows);assert.deepEqual(offsets,[0,500,1000]);
 await assert.rejects(fetchAll({rpc:async()=>({data:{total:2,items:[{}]}})}));
 await assert.rejects(fetchAll({rpc:async()=>({error:new Error('offline')})}));
 let n=0;await assert.rejects(fetchAll({rpc:async()=>({data:{total:n++?501:1000,items:Array(500).fill({})}})}));
 assert.deepEqual(await fetchAll({rpc:async()=>({data:{total:0,items:[]}})}),[]);
});
// Small DOM double: validates generated nodes/attributes and event behavior, not browser layout.
class Node{
 constructor(tag,doc){this.tag=tag;this.ownerDocument=doc;this.children=[];this.events={};this.attrs={};this.style={};this.value='';this.textContent='';}
 append(...xs){this.children.push(...xs);} replaceChildren(...xs){this.children=xs;}
 get lastChild(){return this.children.at(-1);} setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,f){this.events[k]=f;} focus(){this.focused=true;}
}
const all=n=>[n,...n.children.flatMap(all)];
test('collapsed prefectures, 20-row progressive reveal, search opens matches, safe source links and clear',()=>{
 const doc={createElement(tag){return new Node(tag,doc);}},container=new Node('div',doc);
 const rows=Array.from({length:25},()=>row('東京都','府中市',{source_name:'<img src=x onerror=alert(1)>',source_url:'javascript:alert(1)',source_license:'CC BY',source_date:'2026-01-01'}));rows.push(row('広島県','府中市',{source_url:'https://example.org/data'}));
 mount(container,rows);
 let details=all(container).filter(n=>n.tag==='details');assert.equal(details.length,2);assert.ok(details.every(d=>!d.open));
 details[0].open=true;details[0].events.toggle();assert.equal(all(details[0]).filter(n=>n.className==='source-item').length,20);
 const more=all(details[0]).find(n=>n.className==='source-load-more');more.events.click();assert.equal(all(details[0]).filter(n=>n.className==='source-item').length,25);assert.equal(more.hidden,true);
 assert.equal(all(details[0]).filter(n=>n.tag==='a'||n.tag==='img').length,0);
 const input=all(container).find(n=>n.id==='sourceRegionSearch');input.value='広島 府中';input.events.input();details=all(container).filter(n=>n.tag==='details');assert.equal(details.length,1);assert.equal(details[0].open,true);
 const link=all(details[0]).find(n=>n.tag==='a');assert.equal(link.href,'https://example.org/data');assert.equal(link.rel,'noopener noreferrer');
 input.value='xxxxx';input.events.input();assert.equal(all(container).filter(n=>n.tag==='details').length,0);
 all(container).find(n=>n.textContent==='クリア').events.click();assert.equal(input.value,'');assert.equal(all(container).filter(n=>n.tag==='details').length,2);
});
