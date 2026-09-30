const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const viewportSetup = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1] || '';
const compensation = html.match(/<script id="iosViewportCompensation">([\s\S]*?)<\/script>/)?.[1] || '';

assert.match(viewportSetup, /iPhone\|iPod[\s\S]*?width=device-width/);
assert.match(viewportSetup, /const isIPhone = \/iPhone\|iPod\/i\.test\(ua\)/);
const iphoneBranch = viewportSetup.match(/if \(isIPhone\) \{([\s\S]*?)\n\s*\} else \{/i)?.[1] || '';
assert.match(iphoneBranch, /width=device-width/);
assert.doesNotMatch(iphoneBranch, /screen\.width|screen\.height|outerWidth/);
assert.doesNotMatch(compensation, /screen\.width|screen\.height|outerWidth|innerWidth|visualViewport\.scale/);
assert.match(compensation, /root\.style\.zoom\s*=\s*''/);
console.log('Safari Private viewport uses width=device-width without geometry inference or CSS zoom');

assert.match(viewportSetup, /const vv = window\.visualViewport/);
assert.match(viewportSetup, /vv\?\.height/);
assert.match(viewportSetup, /--machimamo-app-height/);
assert.match(html, /#app \{[^}]*height: var\(--machimamo-app-height, 100svh\)/);

assert.match(html, /--machimamo-bottom-nav-height/);
assert.match(html, /--machimamo-browser-bottom/);
assert.match(html, /#app \{[^}]*padding-bottom: var\(--machimamo-bottom-nav-height\)/);
assert.match(viewportSetup, /layoutHeight - visibleBottom/);
assert.match(viewportSetup, /--machimamo-browser-bottom/);
assert.match(viewportSetup, /visualViewport\?\.addEventListener\('scroll', updatePhoneVisibleHeight/);

assert.match(html, /<nav id="bottomNav" aria-label="メインメニュー">/);
assert.doesNotMatch(html, /#app > nav \{/);
assert.match(html, /#bottomNav \{[\s\S]*position: fixed !important;[\s\S]*bottom: 0 !important;[\s\S]*display: grid !important;[\s\S]*visibility: visible !important;/);
assert.match(html, /#bottomNav button \{[\s\S]*display: flex !important;[\s\S]*visibility: visible !important;/);
assert.match(html, /mypage-guide\.js\?v=42-safari-nav4/);
