import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildApprovedFetchPlan,buildDryRunFetchPlan,normalizeCommonItem,parseCsv,parseHtmlStructured,
  parseIcs,parseJsonApi,parseRssAtom
} from '../../shared/machiibe-ingestion/adapters';
import type {SourcePolicySnapshot} from '../../shared/machiibe-ingestion/contracts';

function source(patch:Partial<SourcePolicySnapshot>={}):SourcePolicySnapshot{
  return {
    sourceId:1,sourceName:'Official',sourceType:'open_data',prefecture:'東京都',municipality:null,
    baseUrl:'https://official.test/',feedUrl:'https://official.test/events',fetchMethod:'OPEN_DATA',
    termsStatus:'pending',robotsStatus:'pending',commercialUseStatus:'unknown',
    reuseStatus:'unknown',redistributionStatus:'unknown',cacheStatus:'unknown',
    imageUseStatus:'unknown',snsUseStatus:'unknown',attributionRequirement:null,
    sourceStage:'CANDIDATE',lastTermsCheckedAt:null,
    updateFrequencyMinutes:1440,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,active:true,priority:50,
    automatedFetchAllowed:false,etag:'"abc"',lastModified:'Mon, 28 Sep 2026 00:00:00 GMT',...patch
  };
}

test('dry-run plans are available while actual fetch stays fail-closed until every source gate is approved',()=>{
  assert.equal(buildDryRunFetchPlan(source())?.dryRun,true);
  assert.equal(buildApprovedFetchPlan(source()),null);
  assert.equal(buildApprovedFetchPlan(source({
    termsStatus:'reviewed_allowed',robotsStatus:'allowed',commercialUseStatus:'allowed',reuseStatus:'allowed',sourceStage:'FETCH_ALLOWED',automatedFetchAllowed:true
  }))?.dryRun,false);
});

test('OPEN_DATA CSV adapter keeps source facts and does not infer missing canonical fields',()=>{
  const s=source();
  const parsed=parseCsv('event_id,イベント名,開始日,終了日,市区郡,URL\n1,親子体験,2026-10-01,2026-10-01,港区,https://official.test/e/1',s);
  assert.equal(parsed.items.length,1);
  const normalized=normalizeCommonItem(parsed.items[0],s);
  assert.equal(normalized.title,'親子体験');
  assert.equal(normalized.municipality,'港区');
  assert.equal(normalized.indoor,null);
  assert.equal(normalized.imageUrl,null);
});

test('OPEN_DATA CSV adapter tolerates quoted commas and embedded newlines',()=>{
  const s=source();
  const csv=`event_id,イベント名,内容,開始日,終了日,市区郡,URL
1,"親子,体験","1行目
2行目",2026-10-01,2026-10-01,港区,https://official.test/e/1`;
  const parsed=parseCsv(csv,s);
  assert.equal(parsed.items.length,1);
  assert.deepEqual(parsed.warnings,[]);
  const normalized=normalizeCommonItem(parsed.items[0],s);
  assert.equal(normalized.title,'親子,体験');
  assert.equal(normalized.description,`1行目
2行目`);
  assert.equal(normalized.officialUrl,'https://official.test/e/1');
});

test('current municipal ODS event fields normalize without weakening rights gates',()=>{
  const s=source();
  const csv='ID,地方公共団体名,イベント名,コンテンツURL,開始日,終了日,場所名称,所在地_連結表記,所在地_都道府県,所在地_市区町村,緯度,経度,イベント種類,料金種別,URL\n1,岡崎市,親子体験,https://official.test/content/1,2026/10/10,2026/10/10,中央公園,愛知県岡崎市,愛知県,岡崎市,34.95,137.17,体験,無料,https://official.test/event/1';
  const parsed=parseCsv(csv,s);
  const normalized=normalizeCommonItem(parsed.items[0],s);
  assert.equal(normalized.title,'親子体験');
  assert.equal(normalized.officialUrl,'https://official.test/event/1');
  assert.equal(normalized.venueName,'中央公園');
  assert.equal(normalized.address,'愛知県岡崎市');
  assert.equal(normalized.prefecture,'愛知県');
  assert.equal(normalized.municipality,'岡崎市');
  assert.equal(normalized.lat,34.95);
  assert.equal(normalized.lng,137.17);
  assert.equal(normalized.category,'体験');
  assert.equal(normalized.priceType,'free');
  assert.equal(normalized.imageUrl,null);
  assert.equal(normalized.imageRightsStatus,'unknown');
});

test('JSON API, RSS, ICS and HTML JSON-LD adapters discover event records without network access',()=>{
  const json=parseJsonApi({events:[{id:'a',name:'JSON event',url:'https://official.test/a'}]},source({fetchMethod:'JSON_API'}));
  assert.equal(json.items.length,1);

  const rss=parseRssAtom('<rss><channel><item><guid>b</guid><title>RSS event</title><link>https://official.test/b</link></item></channel></rss>',source({fetchMethod:'RSS'}));
  assert.equal(rss.items.length,1);

  const ics=parseIcs('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:c\nSUMMARY:ICS event\nDTSTART:20261001T100000\nURL:https://official.test/c\nEND:VEVENT\nEND:VCALENDAR',source({fetchMethod:'ICS'}));
  assert.equal(ics.items.length,1);

  const html=parseHtmlStructured('<script type="application/ld+json">{"@context":"https://schema.org","@type":"Event","name":"LD event","url":"https://official.test/d","startDate":"2026-10-01"}</script>',source({fetchMethod:'HTML_STRUCTURED'}));
  assert.equal(html.items.length,1);
  const normalized=normalizeCommonItem(html.items[0],source());
  assert.equal(normalized.title,'LD event');
  assert.equal(normalized.startAt,'2026-10-01');
  assert.equal(normalized.imageRightsStatus,'unknown');
});


test('Mie documented open-data headers normalize without inventing rights or price facts',()=>{
  const s=source({
    sourceName:'三重県 お知らせ・イベント情報一覧 Open Data CSV',
    prefecture:'三重県',
    baseUrl:'https://www.pref.mie.lg.jp/EVENTS/opendata.htm',
    feedUrl:'https://www.pref.mie.lg.jp/EVENTS/eventsdata.csv',
    termsStatus:'reviewed_allowed',robotsStatus:'not_applicable',
    commercialUseStatus:'allowed',reuseStatus:'allowed',
    redistributionStatus:'allowed',cacheStatus:'allowed',
    imageUseStatus:'not_applicable',snsUseStatus:'allowed',
    sourceStage:'FETCH_ALLOWED',lastTermsCheckedAt:'2026-09-29',
    automatedFetchAllowed:true
  });
  const csv=fs.readFileSync(new URL('../../data/machiibe/fixtures/mie_open_data_schema_fixture.csv',import.meta.url),'utf8');
  const parsed=parseCsv(csv,s);
  assert.equal(parsed.items.length,1);
  const normalized=normalizeCommonItem(parsed.items[0],s);
  assert.equal(normalized.title,'テストイベント');
  assert.equal(normalized.description,'テスト本文');
  assert.equal(normalized.startAt,'2026-10-10');
  assert.equal(normalized.endAt,'2026-10-10');
  assert.equal(normalized.municipality,'津市');
  assert.equal(normalized.venueName,'テスト会場');
  assert.equal(normalized.category,'文化');
  assert.equal(normalized.priceType,'unknown');
  assert.equal(normalized.imageUrl,null);
  assert.equal(normalized.imageRightsStatus,'unknown');
  // The feed URL is a source URL, not an event-specific official URL.
  assert.equal(normalized.officialUrl,null);
  assert.equal(buildApprovedFetchPlan(s)?.url,'https://www.pref.mie.lg.jp/EVENTS/eventsdata.csv');
});
