import test from 'node:test';
import assert from 'node:assert/strict';
import {searchGapKey,shouldEscalateSourceDiscovery,sourceDiscoveryDemandScore} from '../../shared/machiibe-ingestion/demand';

test('search gap keys use structured dimensions instead of raw query text',()=>{
  const key=searchGapKey({prefecture:'東京都',municipality:null,entityKeys:['chiikawa'],eventTypes:['collab_cafe'],dateMode:'weekend'});
  assert.match(key,/chiikawa/);
  assert.doesNotMatch(key,/rawQuery/);
});

test('repeated zero-result demand escalates source discovery priority',()=>{
  const signal={dimension:{prefecture:'東京都',municipality:null,entityKeys:['chiikawa'],eventTypes:['collab_cafe'],dateMode:'weekend' as const},searches:5,zeroResultSearches:4,lowResultSearches:1,resultCountSum:1,lastSeenAt:'2026-09-29T12:00:00Z'};
  assert.ok(sourceDiscoveryDemandScore(signal)>30);
  assert.equal(shouldEscalateSourceDiscovery(signal),true);
});