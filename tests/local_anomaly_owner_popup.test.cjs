const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
assert.match(html, /class="spot-owner-delete" onclick="deleteSpot\(\$\{Number\(spot\.id\)\}\)"/);
assert.match(html, /function syncSpotPopupControls\(marker\)/);
assert.match(html, /currentAuthUserId === marker\._machimamoSpot\.createdBy/);
assert.match(html, /marker\.instance\?\._popup\?\.isOpen\?\.\(\)\) syncSpotPopupControls/);
assert.match(html, /no-image-post \.spot-popup-comment[\s\S]*overflow-wrap: anywhere/);
assert.match(html, /function getMapPopupOptions\(\{ noImage = false \} = \{\}\)/);
assert.match(html, /getMapPopupOptions\(\{ noImage: !spot\.image_url \}\)/);
assert.match(html, /marker\._machimamoSpot\?\.hasImage === false/);
assert.match(html, /const imgTag = spot\.image_url \? `\<img src="\$\{escapeHtml\(spot\.image_url\)\}"/);
console.log('post owner deletion synchronizes auth state; image-less popup has readable responsive typography');
