const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const code = html.match(/<script id="iosViewportCompensation">([\s\S]*?)<\/script>/)[1];
function setup(innerWidth, scale) {
    const root = { style: {}, classList: { add() {}, remove() {} } }, body = { style: {} }, app = { style: {} };
    const handlers = {};
    const window = { innerWidth, outerWidth: 390, matchMedia: () => ({ matches: false }),
        addEventListener: (name, fn) => { handlers[name] = fn; },
        visualViewport: { scale, addEventListener: (name, fn) => { handlers['visual-' + name] = fn; } } };
    vm.runInNewContext(code, { window, document: { documentElement: root, body, getElementById: () => app }, setTimeout: fn => fn() });
    return { root, window, handlers };
}
const desktop = setup(780, .5);
assert.equal(desktop.root.style.zoom, '2');
desktop.window.visualViewport.scale = .8;
desktop.handlers['visual-resize']();
assert.equal(desktop.root.style.zoom, '2', 'input focus must not remove desktop compensation');
desktop.window.visualViewport.scale = .5;
desktop.handlers.resize();
assert.equal(desktop.root.style.zoom, '2');
const mobile = setup(390, 1);
mobile.window.visualViewport.scale = 1.3;
mobile.handlers['visual-resize']();
assert.equal(mobile.root.style.zoom, '', 'normal phone must not acquire CSS zoom');
assert.ok(html.includes('font-size: 16px !important;'));
assert.ok(html.includes('input[type="password"] { width: 100%;'));
console.log('PASS: desktop compensation survives keyboard zoom; regular phone stays unscaled; password input sizing');
