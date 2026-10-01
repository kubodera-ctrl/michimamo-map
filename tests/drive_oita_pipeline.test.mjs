import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseOitaPublicEnforcementCsv,normalizeOitaDate} from '../scripts/drive_oita_schedule_parser.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bytes=new Uint8Array(fs.readFileSync(path.join(root,'evidence/machidora5/oita-parser-contract-sample.csv')));
const source={sourceKey:'oita:public-enforcement:half-month',sourceFamily:'PUBLIC_SCHEDULE',sourceVersionKey:'2026-10-01_2026-10-15',sourceVersionDate:'2026-10-01',prefectureCode:'44',policeOrg:'大分県警察',stationName:null,sourceUrl:'https://www.pref.oita.jp/uploaded/life/2354647_4838648_misc.csv',sourceIndexUrl:'https://www.pref.oita.jp/site/keisatu/torishimarijouhou2.html',verifiedAt:'2026-09-30',freshnessStatus:'CURRENT',termsStatus:'PENDING',schemaBindingApproved:true,periodStart:'2026-10-01',periodEnd:'2026-10-15'};
const parsed=parseOitaPublicEnforcementCsv({source,bytes,mode:'preview'});
assert.equal(parsed.parserVersion,'oita_public_schedule_csv_v1');
assert.deepEqual(parsed.headers,['日','曜日','時間帯','場所','取締種別']);
assert.equal(parsed.sourceRecordCount,2);
assert.equal(parsed.gate.publishable,true);
assert.equal(parsed.events.length,2);
assert.deepEqual(parsed.events.map(e=>[e.validDate,e.timeText,e.localityText,e.routeName,e.geoPrecision,e.displayMode]),[
 ['2026-10-01','午前','大分市内',null,'LOCALITY','LOCALITY_SCHEDULED'],
 ['2026-10-02','午後','佐伯市鶴岡町',null,'LOCALITY','LOCALITY_SCHEDULED']
]);
assert.equal(parsed.events[0].sourceRecordKey,'oita:public-enforcement:half-month:2026-10-01_2026-10-15:row-2');
assert.equal(parseOitaPublicEnforcementCsv({source,bytes,mode:'production'}).gate.publishable,false);
assert.deepEqual(parseOitaPublicEnforcementCsv({source,bytes,mode:'production'}).gate.reasons,['terms_not_allowed']);
assert.equal(normalizeOitaDate('2026/10/1'),'2026-10-01');
const bad=Buffer.from('日,曜日,時間帯,場所,取締種別\r\n2026/10/1,金,午前,大分市内,速度\r\n','utf8');
assert.throws(()=>parseOitaPublicEnforcementCsv({source,bytes:new Uint8Array(bad)}),/(oita_header_mismatch|oita_weekday_mismatch|cp932_decode_failed)/);
console.log('PASS: Oita CP932/date/weekday/daypart/locality parser contract');
