const assert=require('node:assert/strict'),fs=require('node:fs');
const loader=fs.readFileSync('mypage-guide.js','utf8');

assert.match(
  loader,
  /script\.src='camera-drive-mvp\.js\?v=30-drive-loader1'/,
  'the hardened drive detector bundle is loaded'
);
assert.match(
  loader,
  /script\.onload=\(\)=>\{[\s\S]*view\?\.classList\.contains\('active'\)[\s\S]*driveSelected[\s\S]*video\?\.srcObject[\s\S]*MachimamoDriveMvp\?\.start\(video\)/,
  'a delayed detector load restarts drive detection when the camera is already active'
);

console.log('PASS: delayed drive detector startup is recovered.');
