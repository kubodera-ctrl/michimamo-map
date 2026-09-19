const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const roadmap = fs.readFileSync(path.join(__dirname, '..', 'ROADMAP.md'), 'utf8');

assert.match(html, /id="releaseVersionBadge"[^>]*data-release="dev31-20260920"/);
assert.match(html, /管理画面バージョン：開発31｜更新 2026年9月20日/);
const adminCardStart = html.indexOf('id="adminCsvCard"');
const adminCardEnd = html.indexOf('</div>', adminCardStart);
const badgePosition = html.indexOf('id="releaseVersionBadge"');
assert.ok(adminCardStart >= 0 && badgePosition > adminCardStart && badgePosition < adminCardEnd, 'version badge must stay inside hidden admin card');
assert.doesNotMatch(html.slice(html.indexOf('id="profileTab"'), adminCardStart), /id="releaseVersionBadge"/, 'version badge must not be public in settings');
assert.match(html, /profileTab\.prepend\(csvCard\)/);
assert.match(html, /switchTab\('profileTab', profileTabButton\)/);
assert.match(html, /data-filter="local_anomaly"/);
assert.match(html, /id="adminSocialCanvas" width="1080" height="1920"/);
assert.match(html, /twitter\.com\/intent\/tweet/);
assert.match(html, /自動投稿はせず/);
assert.match(roadmap, /# 開発31：地域の異変・管理者SNS素材・公開版判別/);
assert.match(roadmap, /投稿再送、非公開画像削除、退会E2E/);

console.log('PASS: development 31 release badge, admin-first placement, anomaly and social assets are documented and wired.');
