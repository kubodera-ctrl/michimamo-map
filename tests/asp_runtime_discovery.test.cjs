'use strict';
const assert=require('node:assert/strict');
const d=require('../asp-runtime-discovery.js');

assert.equal(d.deriveActionType('無料会員登録で成果'),'free_registration');
assert.equal(d.deriveActionType('アプリをインストール後に起動'),'app_install');
assert.equal(d.deriveActionType('資料請求完了'),'document_request');
assert.equal(d.deriveActionType('口座開設完了'),'bank_account_opening');
assert.equal(d.deriveActionType('購入不要・問い合わせ完了'),'application');
assert.equal(d.deriveActionType('条件要確認'),null);

const rows=[
 {offer_id:'a',offer_name:'A',category:'通信',tracking_url:'https://example.invalid/a',reward_enabled:true,reward_fixed_points:5000,action_type:'service_contract',cost_type:'paid',purchase_required:false,estimated_available_days:30,source_added_at:'2026-09-20',recommendation_rank:2,placement_sort_order:2,popularity_count:0,conversion_conditions:'新規契約'},
 {offer_id:'b',offer_name:'B',category:'通信',tracking_url:'https://example.invalid/b',reward_enabled:true,reward_fixed_points:1000,action_type:'free_registration',cost_type:'free',purchase_required:false,estimated_available_days:3,source_added_at:'2026-09-27',recommendation_rank:1,placement_sort_order:1,popularity_count:0,conversion_conditions:'無料会員登録'},
 {offer_id:'c',offer_name:'C',category:'生活',tracking_url:'https://example.invalid/c',reward_enabled:false,reward_fixed_points:999999,conversion_conditions:'資料請求完了',placement_sort_order:3,popularity_count:0}
];

assert.deepEqual(d.queryOffers(rows,{filterKey:'all',sortKey:'placement'}).map(x=>x.offer_id),['b','a','c']);
assert.deepEqual(d.queryOffers(rows,{filterKey:'all',sortKey:'points_high'}).map(x=>x.offer_id),['a','b','c']);
assert.deepEqual(d.queryOffers(rows,{filterKey:'fast',sortKey:'availability_fast'}).map(x=>x.offer_id),['b','a']);
assert.deepEqual(d.queryOffers(rows,{filterKey:'easy',sortKey:'recommended'}).map(x=>x.offer_id),['b','c']);
assert.deepEqual(d.queryOffers(rows,{filterKey:'free'}).map(x=>x.offer_id),['b']);
assert.deepEqual(d.queryOffers(rows,{filterKey:'no_purchase'}).map(x=>x.offer_id),['b','a','c']);
assert.deepEqual(d.queryOffers(rows,{category:'通信',filterKey:'all',sortKey:'added_new'}).map(x=>x.offer_id),['b','a']);
assert.equal(d.normalizeOffer(rows[2]).reward_fixed_points,null,'points stay hidden when reward_enabled=false');
const caps=d.capabilities(rows);
assert.equal(caps.popular,false);
assert.equal(caps.recommended,true);
assert.equal(caps.points,true);
assert.equal(caps.availability,true);
console.log('PASS: ASP discovery uses source-backed metadata, composable filters/sorts, and hides unapproved point values');
