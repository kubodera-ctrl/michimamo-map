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
assert.deepEqual(api.locationParts('西多摩郡','西多摩郡奥多摩町丹三郎２４２番付近'),{city:'西多摩郡奥多摩町',full:'西多摩郡奥多摩町丹三郎242番',local:'丹三郎'});
assert.deepEqual(api.locationParts('西多摩郡','西多摩郡日の出町大字大久野１１００番付近'),{city:'西多摩郡日の出町',full:'西多摩郡日の出町大字大久野1100番',local:'大字大久野'});
assert.deepEqual(api.locationParts('西多摩郡','西多摩郡瑞穂町長岡１丁目付近'),{city:'西多摩郡瑞穂町',full:'西多摩郡瑞穂町長岡1丁目',local:'長岡1丁目'});
assert.deepEqual(api.locationParts('武蔵野市','武蔵野市本町１丁目付近'),{city:'武蔵野市',full:'武蔵野市本町1丁目',local:'吉祥寺本町1丁目'});
assert.deepEqual(api.locationParts('町田市','町田市南大谷１４２８番地付近'),{city:'町田市',full:'町田市南大谷1428番地',local:'南大谷一丁目'});
assert.deepEqual(api.matchTownPoint('大字大久野',[
  {oaza_cho:'大久野',point:[139.25,35.74]}
]),[35.74,139.25]);
assert.deepEqual(api.matchTownPoint('晴海1丁目',[
  {oaza_cho:'晴海',chome:'一丁目',point:[139.78,35.65]},
  {oaza_cho:'晴海',chome:'二丁目',point:[139.79,35.66]}
]),[35.65,139.78]);
assert.equal(api.matchTownPoint('未知町1丁目',[]),null);
console.log('drive Tokyo focus all-area API contract: PASS');
