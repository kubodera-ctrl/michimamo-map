const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const viewportCode = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const cleanupCode = html.match(/<script id="iosViewportCompensation">([\s\S]*?)<\/script>/)[1];
for (const mode of ['normal', 'private']) {
    let content;
    let refreshed = 0;
    const unavailableMetric = () => { throw new Error('iPhone must not inspect masked geometry'); };
    const screen = Object.defineProperties({}, { width: { get: unavailableMetric }, height: { get: unavailableMetric } });
    const root = { style: { zoom: '2', width: '780px', height: '50dvh' }, classList: { remove() {} } };
    const body = { style: { width: '780px' } }, app = { style: { maxHeight: '50dvh' } };
    const window = { refreshMapLayout: () => refreshed++ };
    Object.defineProperty(window, 'outerWidth', { get: unavailableMetric });
    const document = { documentElement: root, body, getElementById: () => app,
        querySelector: () => ({ setAttribute: (_, value) => { content = value; } }) };
    const context = { window, screen, document, navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', maxTouchPoints: mode === 'private' ? 0 : 5 }, setTimeout: fn => fn() };
    vm.runInNewContext(viewportCode, context);
    vm.runInNewContext(cleanupCode, context);
    assert.equal(content, 'width=device-width, initial-scale=1, viewport-fit=cover');
    assert.equal(root.style.zoom, '');
    assert.equal(root.style.height, '');
    assert.equal(body.style.width, '');
    assert.equal(app.style.maxHeight, '');
    assert.equal(refreshed, 1);
}
console.log('PASS: iPhone viewport avoids screen/outerWidth and CSS zoom, including masked touch metrics.');
