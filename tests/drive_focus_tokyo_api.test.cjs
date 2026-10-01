'use strict';
const assert=require('node:assert/strict');
const api=require('../api/drive-focus-tokyo.js');

const csv='行政区,所属,実施場所,交差点・路線名,取締理由\r\n'+
  '中央区,月島,中央区晴海１丁目付近,晴海三丁目交差点,事故抑止のため\r\n'+
  ',築地,中央区銀座４丁目付近,三原橋交差点,"事故多発,事故抑止"\r\n';
const rows=api.rowsFromCsv(csv);
assert.equal(rows.length,2);
assert.equal(rows[0].municipality,'中央区');
assert.equal(rows[0].placeName,'晴海三丁目交差点');
assert.equal(rows[1].municipality,'中央区');
assert.equal(rows[1].reason,'事故多発,事故抑止');

assert.deepEqual(api.locationParts('中央区','中央区晴海１丁目付近'),{city:'中央区',full:'中央区晴海1丁目',local:'晴海1丁目'});
assert.deepEqual(api.matchTownPoint('晴海1丁目',[
  {oaza_cho:'晴海',chome:'一丁目',point:[139.78,35.65]},
  {oaza_cho:'晴海',chome:'二丁目',point:[139.79,35.66]}
]),[35.65,139.78]);
assert.equal(api.matchTownPoint('未知町1丁目',[]),null);
console.log('drive Tokyo focus all-area API contract: PASS');
