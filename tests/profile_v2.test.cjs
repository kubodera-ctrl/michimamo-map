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

let randomCalls=0;
let stable=profile.resolveGuestNameState('げんきなペンギン','generated_v2',()=>{randomCalls++;return 0;});
assert.equal(stable.name,'げんきなペンギン');
assert.equal(stable.source,'generated_v2');
assert.equal(stable.migrated,false);
assert.equal(randomCalls,0,'stable generated_v2 name is not regenerated');

let migrated=profile.resolveGuestNameState('青空ネコ12','generated',()=>0);
assert.equal(migrated.source,'generated_v2');
assert.equal(migrated.migrated,true);
assert.equal(profile.isGeneratedGuestName(migrated.name),true);

let protectedCustom=profile.resolveGuestNameState('青空ネコ12','',()=>0.5);
assert.equal(protectedCustom.name,'青空ネコ12','unknown provenance is never auto-renamed');
assert.equal(protectedCustom.source,'custom');

let explicitCustom=profile.resolveGuestNameState('まちまも太郎','custom',()=>0);
assert.equal(explicitCustom.name,'まちまも太郎');
assert.equal(explicitCustom.source,'custom');
