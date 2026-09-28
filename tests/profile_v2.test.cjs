const assert = require('node:assert/strict');
const profile = require('../profile-v2.js');
for (let i = 0; i < 100; i += 1) {
  let cursor = i;
  const name = profile.generateGuestName(() => ((cursor = (cursor * 9301 + 49297) % 233280) / 233280));
  assert.ok(Array.from(name).length <= 10, name);
  assert.ok(Array.from(name).length >= 6, name);
  assert.notEqual(name, '名無しドライバー');
  assert.equal(profile.isGeneratedGuestName(name), true, name);
}
assert.equal(profile.normalizeName(' 1234567890123 '), '1234567890');
assert.equal(profile.isGeneratedGuestName('げんきなペンギン'), true);
assert.equal(profile.isGeneratedGuestName('おだやかなカワウソ'), true);
assert.equal(profile.isGeneratedGuestName('ボス'), false);
assert.equal(profile.isLegacyGeneratedGuestName('青空ネコ12'), true);
assert.equal(profile.isLegacyGeneratedGuestName('まちまも太郎'), false);
assert.equal(profile.isImageAvatar('image:user/avatar.webp'), true);
assert.equal(profile.isImageAvatar('🐼'), false);
console.log('profile v2 tests passed');
