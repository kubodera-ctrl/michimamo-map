const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /function focusSelectedPopup\(marker, popup\)/);
assert.match(html, /map\.panTo\(marker\.getLatLng\(\)/);
assert.match(html, /function getMapPopupOptions\(\)/);
assert.match(html, /maxHeight: Math\.max\(220, Math\.min\(430/);
assert.match(html, /autoPan: false/);
assert.match(html, /closeOnClick: false/);
assert.match(html, /map\.panTo\(marker\.getLatLng\(\), \{ animate: false \}\)/);
assert.match(html, /'#accidentAreaToggle'/);
assert.match(html, /const safeTop = Math\.max\(mapRect\.top \+ 18, \.\.\.overlayBottoms\) \+ 12/);
assert.match(html, /if \(popupRect\.top < safeTop\) panY = safeTop - popupRect\.top/);
assert.doesNotMatch(html, /popup\._adjustPan\(\)/);
assert.match(html, /const markerPoint = map\.latLngToContainerPoint\(marker\.getLatLng\(\)\)/);
assert.match(html, /const panX = \(map\.getSize\(\)\.x \/ 2\) - markerPoint\.x/);
assert.match(html, /map\.panBy\(\[panX, panY\]/);
assert.match(html, /map\.on\('popupopen'/);
assert.match(html, /function goToCurrentLocation\(\) \{/);
assert.match(html, /map\.closePopup\(\)/);
assert.match(html, /gpsMarkerObj\?\.getLatLng\?\.\(\)/);
assert.match(html, /navigator\.geolocation\.getCurrentPosition/);
assert.match(html, /maximumAge: 0, timeout: 15000/);
assert.match(html, /gpsMarkerObj\.setLatLng\(\[userLat, userLng\]\)/);
assert.match(html, /map\.flyTo\(\[userLat, userLng\], 15, \{ animate: true, duration: 0\.65 \}\)/);
assert.match(html, /performance\.now\(\) < popupFocusPanUntil/);
assert.match(html, /map\._popup\?\.isOpen\?\.\(\)/);
assert.match(html, /map\.on\('popupclose'/);

console.log('popup focus checks passed');
