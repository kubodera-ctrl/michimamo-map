const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

assert.match(
  html,
  /if \(cameraMode === 'drive' && document\.getElementById\('cameraView'\)\?\.classList\.contains\('active'\)\) return;/,
  'abandoned-vehicle proximity prompts are suppressed while the drive camera is active'
);
assert.match(
  html,
  /if \(mode === 'drive'\)[\s\S]*proximityToast\?\.classList\.remove\('show'\)/,
  'an already visible proximity prompt is dismissed when drive mode starts'
);
assert.doesNotMatch(
  html,
  /<script src="camera-drive-mvp\.js\?v=25-mvp2"><\/script>/,
  'the legacy drive detector is not loaded in parallel with the current detector'
);
console.log('PASS: drive mode suppresses proximity prompts and uses one detector runtime.');
