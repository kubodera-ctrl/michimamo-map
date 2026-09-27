const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const code = html.match(/<script id="iosViewportCompensation">([\s\S]*?)<\/script>/)[1];
function setup(innerWidth, scale) {
    const root = { style: {}, classList: { add() {}, remove() {} } }, body = { style: {} }, app = { style: {} };
    const handlers = {};
    const window = { innerWidth, outerWidth: 390, matchMedia: () => ({ matches: false }), addEventListener() {}, visualViewport: { scale } };
    vm.runInNewContext(code, { window, navigator: { userAgent: 'iPhone' }, document: { documentElement: root, body, getElementById: () => app }, setTimeout: fn => fn() });
    return { root, window, handlers };
}
const desktop = setup(780, .5);
assert.equal(desktop.root.style.zoom, '');
assert.equal(desktop.root.style.width, '', 'iPhone viewport must not depend on privacy-sensitive metrics');
const mobile = setup(390, 1);
assert.equal(mobile.root.style.zoom, '', 'normal phone must not acquire CSS zoom');
assert.ok(html.includes('font-size: 16px !important;'));
assert.ok(html.includes('input[type="password"] { width: 100%;'));
console.log('PASS: iPhone viewport stays unscaled under masked metrics; password input sizing');
