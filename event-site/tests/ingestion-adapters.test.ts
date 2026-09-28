import test from 'node:test';
import assert from 'node:assert/strict';
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
