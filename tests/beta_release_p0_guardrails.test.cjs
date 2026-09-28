'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

assert.doesNotMatch(html,/let dummies = \{\}/);
assert.doesNotMatch(html,/areaCount = dummies/);
assert.doesNotMatch(html,/東京都 新宿区':142/);
assert.match(html,/利用者投稿の実件数のみを表示します。件数が少ない場合も架空データで補完しません/);

assert.doesNotMatch(html,/＋10,000 pt/);
assert.doesNotMatch(html,/＋500,000 pt/);
assert.match(html,/β版ではASPポイント還元を停止しています/);
assert.match(html,/\.beta-release-legacy-asp \{ display:none !important; \}/);

const poikatsu=html.match(/<section id="poikatsuView"[\s\S]*?<\/section>/)?.[0]||'';
const unsafePoikatsu=[...poikatsu.matchAll(/<a(?![^>]*beta-release-legacy-asp)[^>]+href="[^"]*(?:px\.a8\.net|valuecommerce\.com)[^"]*"/g)];
assert.equal(unsafePoikatsu.length,0,'all direct legacy poikatsu affiliate links must be fail-closed');

const parking=html.match(/id="parkingModal"[\s\S]*?<!-- 暑さ指数/)?.[0]||'';
const unsafeParking=[...parking.matchAll(/<a(?![^>]*beta-release-legacy-asp)[^>]+href="[^"]*(?:px\.a8\.net|valuecommerce\.com)[^"]*"/g)];
assert.equal(unsafeParking.length,0,'all direct parking affiliate links must be fail-closed');

assert.match(html,/ad-banner beta-release-legacy-asp/);
console.log('PASS beta P0 guardrails: real-only rankings and fail-closed legacy ASP/reward claims');
