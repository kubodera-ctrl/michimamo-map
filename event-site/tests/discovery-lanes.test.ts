import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryLaneMatches} from '../../shared/machiibe-ingestion/discovery-ux';

const event={newSinceLastVisit:true,matchesSavedOshi:true,startsToday:false,startsTomorrow:false,overlapsWeekend:true,nearby:false,endingSoon:false,free:false,indoor:true,eventTypes:['collab_cafe'],hasAppearance:false};

test('future Discovery lanes are data-driven without changing PR1 UI',()=>{
  assert.equal(discoveryLaneMatches('oshi_new',event),true);
  assert.equal(discoveryLaneMatches('weekend',event),true);
  assert.equal(discoveryLaneMatches('rainy_day',event),true);
  assert.equal(discoveryLaneMatches('collab_cafe',event),true);
  assert.equal(discoveryLaneMatches('appearance',event),false);
});