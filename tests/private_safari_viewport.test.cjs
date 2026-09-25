const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

test('phone viewport uses a single non-zoom strategy',()=>{
  assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
  assert.match(html,/function configurePhoneViewport\(\)/);
  assert.match(html,/clearLegacyViewportCompensation/);
  assert.doesNotMatch(html,/id="iosViewportCompensation"/);
  assert.doesNotMatch(html,/root\.style\.zoom = String/);
  assert.doesNotMatch(html,/visibleVh = 100 \/ zoomFactor/);
  assert.doesNotMatch(html,/html\.ios-desktop-viewport header/);
});

test('app shell keeps bottom navigation inside the dynamic phone viewport',()=>{
  assert.match(html,/#app \{[^}]*height: 100svh; height: 100dvh;/);
  assert.match(html,/nav \{ position:relative;[^}]*flex-shrink: 0;/);
});
