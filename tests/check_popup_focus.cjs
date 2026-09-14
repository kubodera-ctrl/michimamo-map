const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /function focusSelectedPopup\(marker, popup\)/);
assert.match(html, /function getMapPopupOptions\(\)/);
assert.match(html, /maxHeight: Math\.max\(220, Math\.min\(430/);
assert.match(html, /autoPan: true/);
assert.match(html, /keepInView: true/);
assert.match(html, /closeOnClick: false/);
assert.match(html, /autoPanPaddingTopLeft: L\.point\(12, mobile \? 150 : 20\)/);
assert.doesNotMatch(html, /popup\._adjustPan\(\)/);
assert.match(html, /map\.panTo\(marker\.getLatLng\(\), \{ animate: false \}\)/);
assert.match(html, /map\.on\('popupopen'/);
assert.match(html, /function goToCurrentLocation\(\) \{/);
assert.match(html, /if \(userLat && userLng\) map\.setView\(\[userLat, userLng\], 15\)/);
assert.match(html, /performance\.now\(\) < popupFocusPanUntil/);
assert.match(html, /map\._popup\?\.isOpen\?\.\(\)/);
assert.match(html, /map\.on\('popupclose'/);

console.log('popup focus checks passed');
