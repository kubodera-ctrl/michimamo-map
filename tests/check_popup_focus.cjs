const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /function focusSelectedPopup\(marker, popup\)/);
assert.match(html, /map\.panTo\(marker\.getLatLng\(\)/);
assert.match(html, /function getMapPopupOptions\(\)/);
assert.match(html, /maxHeight: Math\.max\(220, Math\.min\(430/);
assert.match(html, /autoPanPaddingTopLeft: L\.point\(12, mobile \? 210 : 24\)/);
assert.match(html, /popup\._adjustPan\(\)/);
assert.match(html, /map\.on\('popupopen'/);
assert.match(html, /performance\.now\(\) < popupFocusPanUntil/);

console.log('popup focus checks passed');
