const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /function focusSelectedPopup\(marker, popup\)/);
assert.match(html, /function getMapPopupOptions\(\)/);
assert.match(html, /maxHeight: Math\.max\(220, Math\.min\(430/);
assert.match(html, /autoPan: false/);
assert.match(html, /keepInView: false/);
assert.match(html, /closeOnClick: false/);
assert.doesNotMatch(html, /popup\._adjustPan\(\)/);
assert.match(html, /const desired = L\.point\(size\.x \/ 2, size\.y \* 0\.78\)/);
assert.match(html, /map\.panBy\(\[current\.x - desired\.x, current\.y - desired\.y\]/);
assert.match(html, /map\.on\('popupopen'/);
assert.match(html, /function goToCurrentLocation\(\) \{/);
assert.match(html, /map\.closePopup\(\)/);
assert.match(html, /map\.stop\(\)/);
assert.match(html, /map\.setView\(\[userLat, userLng\], 15\)/);
assert.match(html, /performance\.now\(\) < popupFocusPanUntil/);
assert.match(html, /map\._popup\?\.isOpen\?\.\(\)/);
assert.match(html, /map\.on\('popupclose'/);

console.log('popup focus checks passed');
