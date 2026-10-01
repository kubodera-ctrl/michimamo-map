import test from 'node:test';
import assert from 'node:assert/strict';
import {rankSourcePriority,scoreSourcePriority} from '../../shared/machiibe-ingestion/priority';

const highYield={
  observedPotentialEventsMin:400,prefectureGap:true,regionCoverage:'prefecture' as const,
  categoryBreadth:'very_high' as const,familyRelevance:'high' as const,
  acquisitionDifficulty:'medium' as const,termsDifficulty:'medium' as const,
  maintenanceCost:'medium' as const,freshnessConfidence:'high' as const
};
const lowYield={
  observedPotentialEventsMin:2,prefectureGap:false,regionCoverage:'facility' as const,
  categoryBreadth:'low' as const,familyRelevance:'low' as const,
  acquisitionDifficulty:'high' as const,termsDifficulty:'high' as const,
  maintenanceCost:'high' as const,freshnessConfidence:'low' as const
};

test('source priority favors high-yield gap-filling sources over costly low-yield sources',()=>{
  assert.ok(scoreSourcePriority(highYield)>scoreSourcePriority(lowYield));
  const ranked=rankSourcePriority([{id:'low',...lowYield},{id:'high',...highYield}]);
  assert.equal(ranked[0].id,'high');
});

test('unknown terms are penalized but not treated as blocked',()=>{
  const unknown={...highYield,termsDifficulty:'unknown' as const};
  assert.ok(scoreSourcePriority(unknown)<scoreSourcePriority(highYield));
});
