import test from 'node:test';
import assert from 'node:assert/strict';
import { geoloniaResult } from '../scripts/geolonia_result.mjs';
test('a parsed house number must not promote a town-centre coordinate to level 8', () => {
  const result=geoloniaResult('fixture',{level:8,point:{level:3,lat:35,lng:139}});
  assert.equal(result.normalization_level,8);
  assert.equal(result.level,3);
});
test('missing point precision fails closed despite complete address parsing', () => {
  assert.equal(geoloniaResult('fixture',{level:8,point:{lat:35,lng:139}}).level,null);
  assert.equal(geoloniaResult('fixture',{level:8}).level,null);
});
test('address-level coordinates remain eligible', () => {
  const result=geoloniaResult('fixture',{level:8,point:{level:8,lat:35,lng:139}});
  assert.equal(result.level,8);
  assert.equal(result.lat,35);
  assert.equal(result.lon,139);
});
