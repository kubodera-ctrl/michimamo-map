'use strict';
const assert=require('node:assert/strict');
const api=require('../api/drive-focus-tokyo.js');

const POLICE_CSV='https://www.keishicho.metro.tokyo.lg.jp/kotsu/torishimari/kokai_juten/jutentorishimari.files/juten.csv';

(async()=>{
  const response=await fetch(POLICE_CSV,{headers:{'User-Agent':'machidora-ci/1.0','Accept':'text/csv,*/*;q=0.8'}});
  assert.equal(response.ok,true,'official Tokyo focus CSV must be fetchable');
  const bytes=await response.arrayBuffer();
  const text=new TextDecoder('shift_jis').decode(bytes);
  const rows=api.rowsFromCsv(text);
  assert.ok(rows.length>=100,'official focus CSV should contain 100+ concrete rows');
  const events=await api.buildAllTokyoEvents(rows);
  assert.ok(events.length>=80,'all-Tokyo preview should geocode at least 80 focus rows');
  assert.ok(events.length/rows.length>=0.55,'geocoding coverage must be at least 55%');
  for(const name of ['晴海三丁目交差点','三原橋交差点','木場五丁目交差点','豊洲駅前交差点']){
    assert.equal(events.some(e=>e.placeName===name),true,'known focus place must be included: '+name);
  }
  assert.equal(events.every(e=>e.locationApproximate===true&&e.coordinatePrecision==='TOWN_REPRESENTATIVE'),true);
  const publishedKeys=new Set(events.map(e=>[e.policeStation||'',e.localityText,e.placeName].join('|')));
  const unresolved=rows.filter(row=>!publishedKeys.has([row.policeStation||'',row.localityText,row.placeName].join('|')));
  console.log('TOKYO_FOCUS_UNRESOLVED='+JSON.stringify(unresolved.map(row=>({
    municipality:row.municipality,
    policeStation:row.policeStation,
    localityText:row.localityText,
    placeName:row.placeName
  }))));
  console.log('TOKYO_FOCUS_SOURCE_ROWS='+rows.length);
  console.log('TOKYO_FOCUS_PUBLISHED='+events.length);
  console.log('TOKYO_FOCUS_COVERAGE='+(events.length/rows.length).toFixed(3));
  console.log('PASS: Tokyo all-area focus live fetch + geocode contract');
})().catch(error=>{console.error(error);process.exit(1);});
