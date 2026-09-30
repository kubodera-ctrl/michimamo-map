'use strict';
const assert=require('node:assert/strict');
const c=require('../tools/points/point-reason-contract.cjs');

for(const reason of [
  'spot_post','weekly_quiz_stamp_reward','aed_stamp_reward','point_exchange',
  'point_exchange_reversal','asp_reward','asp_reward_reversal','vehicle_reward'
]) assert.equal(c.isContractReason(reason),true,reason);

assert.equal(c.isDatabaseAllowedAfterMigration('point_exchange'),true);
for(const reason of ['point_exchange_reversal','asp_reward','asp_reward_reversal','vehicle_reward']) {
  assert.equal(c.isDatabaseAllowedAfterMigration(reason),false,reason+' must stay inactive until a later migration');
}
assert.equal(c.isBetaEnabledReason('spot_post'),true);
assert.equal(c.isBetaEnabledReason('weekly_quiz_stamp_reward'),true);
assert.equal(c.isBetaEnabledReason('aed_stamp_reward'),true);
assert.equal(c.isBetaEnabledReason('point_exchange'),false);
assert.equal(c.isBetaEnabledReason('asp_reward'),false);
console.log('PASS point reason contract: definitions are separated from feature enablement');
