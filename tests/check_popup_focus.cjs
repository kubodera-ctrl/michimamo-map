const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /function focusSelectedPopup\(marker, popup\)/);
assert.match(html, /map\.panTo\(marker\.getLatLng\(\)/);
assert.match(html, /popupElement\.getBoundingClientRect\(\)/);
assert.match(html, /mobile \? 210 : 24/);
assert.match(html, /map\.on\('popupopen'/);
assert.match(html, /performance\.now\(\) < popupFocusPanUntil/);

console.log('popup focus checks passed');
