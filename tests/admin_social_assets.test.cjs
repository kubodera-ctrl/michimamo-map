const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

assert.match(html,/id="adminSocialPostArea"/,'admin dashboard has a social-post section');
assert.match(html,/openAdminXPost\(\$\{Number\(row\.id\)\}\)/,'each recent public post has an X action');
assert.match(html,/openAdminTikTokAsset\(\$\{Number\(row\.id\)\}\)/,'each recent public post has a TikTok asset action');
assert.match(html,/https:\/\/twitter\.com\/intent\/tweet/,'X uses the compose screen instead of an automatic post API');
assert.match(html,/id="adminSocialCanvas" width="1080" height="1920"/,'TikTok asset is generated at 9:16 1080x1920');
assert.match(html,/SAFE_RIGHT=820,SAFE_BOTTOM=1580/,'TikTok asset reserves the right and lower platform UI safe zones');
assert.match(html,/assets\/machimamo-icon-512\.jpg/,'generated TikTok image contains the machimamo brand icon');
assert.match(html,/buildMachimamoXCaption/,'a compact X-specific caption is generated');
assert.match(html,/buildMachimamoSocialCaption/,'a TikTok caption is generated separately');
assert.match(html,/投稿者名・顔・ナンバー・車両識別情報はSNS素材に含めません/,'admin UI documents privacy exclusions');
assert.match(html,/\.filter\(row=>!row\.is_hidden && Number\(row\.report_count \|\| 0\)<3\)/,'hidden or heavily reported posts are excluded from SNS candidates');
assert.match(html,/local_anomaly:'地域の異変'/,'local anomaly posts are supported');

const xStart=html.indexOf('function buildMachimamoXCaption');
const xEnd=html.indexOf('function renderAdminSocialPosts',xStart);
const xBody=html.slice(xStart,xEnd);
assert.doesNotMatch(xBody,/spot\.title|spot\.comment/,'X auto-copy does not republish user-written title/comment');

const canvasStart=html.indexOf('function drawAdminSocialCanvas');
const canvasEnd=html.indexOf('function openAdminTikTokAsset',canvasStart);
const canvasBody=html.slice(canvasStart,canvasEnd);
assert.doesNotMatch(canvasBody,/spot\.title|spot\.comment/,'TikTok image does not republish user-written title/comment');

assert.doesNotMatch(html,/api\.tiktok\.com|open-api\.tiktok|POST[^\n]*tiktok/i,'no TikTok auto-post API is wired');

console.log('PASS: machimamo admin X/TikTok asset generation is manual, privacy-aware and mobile-safe.');
