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
assert.match(html, /const markerLatLng = marker\.getLatLng\(\)/);
assert.match(html, /Number\.isFinite\(markerLatLng\?\.lat\)/);
assert.match(html, /map\.invalidateSize\(\{ animate: false, pan: false \}\)/);
assert.match(html, /map\.panTo\(markerLatLng, \{ animate: false \}\)/);
assert.doesNotMatch(html, /const desired = L\.point/);
assert.doesNotMatch(html, /map\.panBy\(\[current\.x - desired\.x/);
assert.match(html, /map\.on\('popupopen'/);
assert.match(html, /function goToCurrentLocation\(\) \{/);
assert.match(html, /map\.stop\(\)/);
assert.match(html, /gpsMarkerObj\?\.getLatLng\?\.\(\)/);
assert.match(html, /map\.invalidateSize\(\{ animate: false, pan: false \}\)/);
assert.match(html, /map\.flyTo\(\[targetLat, targetLng\], 15, \{ animate: true, duration: 0\.7 \}\)/);
assert.doesNotMatch(html, /function goToCurrentLocation\(\)[\s\S]*?map\.closePopup\(\)[\s\S]*?\n    \}/);
assert.match(html, /performance\.now\(\) < popupFocusPanUntil/);
assert.match(html, /map\._popup\?\.isOpen\?\.\(\)/);
assert.match(html, /map\.on\('popupclose'/);
assert.match(html, /\.leaflet-popup-content-wrapper,[\s\S]*pointer-events: none/);
assert.match(html, /\.leaflet-popup-close-button,[\s\S]*pointer-events: auto/);

console.log('popup focus checks passed');
