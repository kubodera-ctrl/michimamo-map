import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {summarizeParserMatrix,dynamicProviderGate} from '../scripts/drive_national_parser_matrix.mjs';
import {parseCsv,normalizeStructuredScheduleRows,structuredPublicationGate} from '../scripts/drive_structured_schedule_adapter.mjs';
import {buildParserTrace} from '../scripts/drive_parser_trace.mjs';
import {buildSnapshot} from '../scripts/drive_enforcement_pipeline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const load=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));

const matrix=load('data/drive/national-parser-representatives-v1.json');
const summary=summarizeParserMatrix(matrix);
assert.equal(summary.representativeCount,9);
assert.equal(summary.commonEventPassCount,5);
assert.equal(summary.provenancePassCount,5);
assert.equal(summary.pendingCount,4);
assert.deepEqual(summary.formats,['CSV_STRUCTURED','HTML','PDF','WEBMAP']);
for(const mode of ['EXACT_SEGMENT','ROAD_AREA','LOCALITY','PREFECTURE'])assert.equal(summary.geoModes.includes(mode),true);
for(const cadence of ['WEEKLY_FRIDAY','OPEN_DATA_HALF_MONTH','MONTHLY_BOUNDARY','HALF_YEAR','ANNUAL_CHANGE_DETECT','HTML_CHANGE_DETECT'])assert.equal(summary.cadences.includes(cadence),true);

const okayama=matrix.representatives.find(row=>row.id==='okayama_webmap_dynamic');
const webmapGate=dynamicProviderGate(okayama);
assert.equal(webmapGate.parseAllowed,false);
assert.equal(webmapGate.automatedFetchAllowed,false);
assert.deepEqual(webmapGate.reasons,['provider_api_schema_unapproved','provider_terms_unapproved','provider_use_unapproved']);

const oita=matrix.representatives.find(row=>row.id==='oita_halfmonth_csv_structured');
assert.equal(oita.parserState,'PARSER_IMPLEMENTED_RAW_FIXTURE_ARCHIVE_PENDING');
assert.equal(oita.commonEventPass,false);
assert.equal(oita.structuredFetchAllowed,false);
const aomori=matrix.representatives.find(row=>row.id==='aomori_halfyear_pdf_area');
assert.equal(aomori.parserState,'PARSER_IMPLEMENTED_RAW_FIXTURE_ARCHIVE_PENDING');
assert.deepEqual(aomori.timeModes,['UNSPECIFIED']);
assert.equal(aomori.commonEventPass,false);
const kumamoto=matrix.representatives.find(row=>row.id==='kumamoto_weekly_html_schedule');
assert.equal(kumamoto.parserState,'BLOCKED_SOURCE_404');
assert.equal(kumamoto.commonEventPass,false);

const csv='日付,時間帯,場所,取締種別,路線\n2026-09-16,午前,テスト市A地区,速度違反,国道X号\n2026-09-17,午後,テスト市B地区,横断歩行者妨害,県道Y号\n';
const parsed=parseCsv(csv);
assert.deepEqual(parsed.headers,['日付','時間帯','場所','取締種別','路線']);
assert.equal(parsed.records.length,2);
const syntheticSource={
  sourceKey:'fixture:oita-like:structured-schedule',
  sourceFamily:'PUBLIC_SCHEDULE',
  prefectureCode:'44',
  policeOrg:'大分県警察',
  stationName:null,
  sourceUrl:'https://www.pref.oita.jp/site/keisatu/torishimarijouhou2.html',
  sourceIndexUrl:'https://www.pref.oita.jp/site/keisatu/torishimarijouhou2.html',
  sourceVersionDate:null,
  verifiedAt:'2026-09-30',
  freshnessStatus:'CURRENT',
  termsStatus:'PENDING',
  schemaBindingApproved:false
};
const structured=normalizeStructuredScheduleRows({
  source:syntheticSource,
  records:parsed.records,
  columnMap:{validDate:'日付',timeText:'時間帯',localityText:'場所',enforcementType:'取締種別',routeName:'路線'},
  defaults:{geoPrecision:'LOCALITY',timePrecision:'DAYPART',displayMode:'LOCALITY_SCHEDULED'}
});
assert.equal(structured.length,2);
assert.equal(structured[0].sourceVersionDate,null);
assert.equal(structured[0].sourceRecordKey,'row-2');
assert.equal(structured[0].localityText,'テスト市A地区');
assert.equal(structuredPublicationGate(syntheticSource,{mode:'preview'}).publishable,false);
assert.deepEqual(structuredPublicationGate(syntheticSource,{mode:'production'}).reasons,['terms_not_allowed','source_schema_binding_unapproved']);

const structuredTrace=buildParserTrace({
  source:{sourceKey:syntheticSource.sourceKey,termsStatus:'PENDING',active:true},
  sourceVersion:{contentHash:'fixture-sha256',versionDate:null,parserVersion:'structured_contract_v1',fetchedAt:'2026-09-30T00:00:00Z',validationPassed:true},
  sourceRecord:{sourceRecordKey:'row-2',rawLocator:'csv:row:2',validationPassed:true},
  event:structured[0],
  sourceFamily:'PUBLIC_SCHEDULE',
  mode:'preview'
});
assert.equal(structuredTrace.provenance.sourceVersionDate,null);
assert.equal(structuredTrace.publishGate.eventFactsPublishable,true);
assert.equal(structuredTrace.publishGate.lineGeometryPublishable,false);
assert.deepEqual(structuredTrace.publishGate.lineGeometryReasons,['not_exact_segment']);

const tokyo=load('data/drive/tokyo-wangan-source-v1.json');
const tokyoSnapshot=buildSnapshot(tokyo,{mode:'preview'});
const rinko=tokyoSnapshot.events.find(event=>event.externalId==='wangan-rinko-chuboh-shinkiba');
assert.ok(rinko);
const tokyoTrace=buildParserTrace({
  source:{sourceKey:tokyo.source.sourceKey,termsStatus:tokyo.source.termsStatus,active:true},
  sourceVersion:{contentHash:tokyoSnapshot.sourceHash,versionDate:tokyo.source.sourceVersionDate,parserVersion:tokyo.source.parserVersion,fetchedAt:tokyo.source.verifiedAt,validationPassed:true},
  sourceRecord:{sourceRecordKey:'wangan-rinko',rawLocator:'official-row:rinko',validationPassed:true},
  event:rinko,
  sourceFamily:'SPEED_GUIDELINE',
  mode:'preview'
});
assert.equal(tokyoTrace.provenance.sourceRecordKey,'wangan-rinko');
assert.equal(tokyoTrace.provenance.sourceSubrecordKey,'60kmh');
assert.equal(tokyoTrace.provenance.sourceVersionDate,'2026-07-30');
assert.equal(tokyoTrace.commonEvent.geometry.routeMatchTokens.includes('東京ゲートブリッジ'),true);
assert.equal(tokyoTrace.publishGate.eventFactsPublishable,true);
assert.equal(tokyoTrace.publishGate.lineGeometryPublishable,false);
assert.deepEqual(tokyoTrace.publishGate.lineGeometryReasons,['geometry_not_verified']);

const tokyoProd=buildParserTrace({
  source:{sourceKey:tokyo.source.sourceKey,termsStatus:'PENDING',active:true},
  sourceVersion:{contentHash:tokyoSnapshot.sourceHash,versionDate:tokyo.source.sourceVersionDate,parserVersion:tokyo.source.parserVersion,fetchedAt:tokyo.source.verifiedAt,validationPassed:true},
  sourceRecord:{sourceRecordKey:'wangan-rinko',rawLocator:'official-row:rinko',validationPassed:true},
  event:rinko,
  sourceFamily:'SPEED_GUIDELINE',
  mode:'production'
});
assert.equal(tokyoProd.publishGate.eventFactsPublishable,false);
assert.equal(tokyoProd.publishGate.eventReasons.includes('terms_not_allowed'),true);

const stale={...structured[0],freshnessStatus:'STALE'};
const staleTrace=buildParserTrace({
  source:{sourceKey:syntheticSource.sourceKey,termsStatus:'ALLOWED',active:true},
  sourceVersion:{contentHash:'fixture-stale',versionDate:null,parserVersion:'structured_contract_v1',validationPassed:true},
  sourceRecord:{sourceRecordKey:'row-2',rawLocator:'csv:row:2',validationPassed:true},
  event:stale,
  sourceFamily:'PUBLIC_SCHEDULE',
  mode:'preview'
});
assert.equal(staleTrace.publishGate.eventFactsPublishable,false);
assert.deepEqual(staleTrace.publishGate.eventReasons,['source_not_current']);

console.log('PASS: nationwide representative parser matrix / structured adapter / provenance trace / dynamic-provider fail-closed contract');
