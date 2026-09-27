'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'news-publishing-admin.js'), 'utf8');
assert.match(html, /id="adminNewsPublishingSection"/);
assert.match(html, /単体ニュース \/ TikTok SHORT・SINGLE（43秒）/);
assert.match(html, /ウィークリー投稿 \/ TikTok LONG・WEEKLY（CURRENT尺）/);
assert.match(html, /id="adminSocialPostArea"/);
assert.ok(html.indexOf('id="adminNewsPublishingSection"') < html.indexOf('SNS投稿素材（直近の公開投稿）'));
assert.match(html, /id="adminWeeklyWeek" type="week" required/);
assert.match(html, /id="adminWeeklyPrefecture" required/);
assert.match(html, /<option value="12">12件<\/option>/);
assert.match(html, /id="adminNewsShowPosted" type="checkbox"/);
assert.match(html, /Xへ投稿（接続設定必要）/);
assert.match(html, /TikTokへ投稿（接続設定必要）/);
assert.match(html, /body\.admin-dashboard-open \.ad-banner \{ display: none !important;/);
assert.match(script, /'地域の異変|LOCAL_ANOMALY/);
assert.match(script, /'POLICE_OFFICIAL'/);
assert.match(script, /prefectureCount: PREFECTURES.length/);
assert.match(script, /connected: false/);
assert.match(script, /MutationObserver/);

const prefectures = [...script.matchAll(/'([^']+[都道府県])'/g)].map((match) => match[1]);
assert.equal(prefectures.length, 47);
assert.equal(new Set(prefectures).size, 47);
process.stdout.write('news publishing admin UI contract: PASS (47 prefectures, fail-closed connection, legacy assets retained)\n');
