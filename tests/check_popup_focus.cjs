const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /function focusSelectedPopup\(marker, popup\)/);
assert.match(html, /map\.panTo\(marker\.getLatLng\(\)/);
assert.match(html, /function getMapPopupOptions\(\)/);
assert.match(html, /maxHeight: Math\.max\(220, Math\.min\(430/);
assert.match(html, /autoPan: false/);
assert.match(html, /map\.panTo\(marker\.getLatLng\(\), \{ animate: false \}\)/);
assert.match(html, /'#accidentAreaToggle'/);
assert.match(html, /const safeTop = Math\.max\(mapRect\.top \+ 18, \.\.\.overlayBottoms\) \+ 12/);
assert.doesNotMatch(html, /popup\._adjustPan\(\)/);
assert.match(html, /map\.on\('popupopen'/);
assert.match(html, /performance\.now\(\) < popupFocusPanUntil/);

console.log('popup focus checks passed');
