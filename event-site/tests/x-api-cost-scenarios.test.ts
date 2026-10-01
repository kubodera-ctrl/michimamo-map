import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('X API cost scenarios stay design-only, resource-billed and approval-gated',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/x_api_cost_scenarios_v1.json',import.meta.url),'utf8'));
  assert.equal(data.status,'design_only_no_api_connection');
  assert.equal(data.pricing_snapshot.post_read_usd_per_returned_resource,0.005);
  assert.equal(data.pricing_snapshot.user_read_usd_per_returned_resource,0.01);
  assert.equal(data.pricing_snapshot.same_resource_24h_deduplication,'soft_guarantee');
  assert.equal(data.scenario_assumptions.timeline_primary,'GET /2/users/{id}/tweets');
  assert.equal(data.scenario_assumptions.timeline_poll_max_results,5);
  assert.equal(data.scenarios.length,16);
  assert.deepEqual(new Set(data.scenarios.map((row:any)=>row.verified_accounts)),new Set([10,25,50,100]));
  assert.deepEqual(new Set(data.scenarios.map((row:any)=>row.polls_per_day)),new Set([1,2,4,6]));
  const tenTwice=data.scenarios.find((row:any)=>row.verified_accounts===10&&row.polls_per_day===2);
  assert.equal(tenTwice.monthly_post_read_usd_no_dedup,15);
  assert.equal(tenTwice.monthly_post_read_usd_dedup_no_new_posts,7.5);
  assert.equal(data.current_registry_pilot_proposal.proposed_monthly_spending_limit_usd,20);
  assert.equal(data.current_registry_pilot_proposal.approval_state,'not_approved');
  assert.match(data.current_registry_pilot_proposal.auto_recharge_policy,/owner_approval/);
});
