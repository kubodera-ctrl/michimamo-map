const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const viewportSetup = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1] || '';
const compensation = html.match(/<script id="iosViewportCompensation">([\s\S]*?)<\/script>/)?.[1] || '';

assert.match(viewportSetup, /iPhone\|iPod[\s\S]*?width=device-width/);
const iphoneBranch = viewportSetup.match(/if \(\/iPhone\|iPod\/i\.test\(ua\)\) \{([\s\S]*?)\n\s*\}/)?.[1] || '';
assert.match(iphoneBranch, /width=device-width/);
assert.doesNotMatch(iphoneBranch, /screen\.width|screen\.height|outerWidth/);
assert.doesNotMatch(compensation, /screen\.width|screen\.height|outerWidth|innerWidth|visualViewport\.scale/);
assert.match(compensation, /root\.style\.zoom\s*=\s*''/);
console.log('Safari Private viewport uses width=device-width without geometry inference or CSS zoom');

assert.match(viewportSetup, /visualViewport\?\.height/);
assert.match(viewportSetup, /--machimamo-app-height/);
assert.match(html, /#app \{[^}]*height: var\(--machimamo-app-height, 100svh\)/);
