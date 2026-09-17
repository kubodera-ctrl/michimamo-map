const assert = require('node:assert/strict');
class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.style = {}; this.hidden = false; this.checked = false; this.disabled = false; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; }
    setAttribute(name, value) { this[name] = value; }
    removeAttribute(name) { delete this[name]; }
    querySelectorAll(selector) { return walk(this).filter(x => x.tagName === selector); }
}
function walk(el) { return el.children.flatMap(x => [x, ...walk(x)]); }
global.document = { createElement: tag => new Element(tag) };
require('../aed-review.js');
const tick = () => new Promise(resolve => setImmediate(resolve));
const target = new Element('div');
let photoFail = false, nearbyFail = false, hold = false, resolveNearby, calls = 0, removed = 0;
const decisions = [];
const chain = () => ({ addTo() { return this; }, bindPopup() { return this; }, clearLayers() {} });
const L = { map: () => ({ setView() { return this; }, fitBounds() {}, invalidateSize() {}, remove() { removed++; } }), tileLayer: chain, circle: chain, circleMarker: chain, layerGroup: chain };
const db = {
    storage: { from: () => ({ createSignedUrl: async () => photoFail ? { error: true } : { data: { signedUrl: 'https://example.test/photo.jpg' } } }) },
    rpc: async () => {
        calls++;
        if (hold) await new Promise(resolve => { resolveNearby = resolve; });
        return nearbyFail ? { error: true } : { data: [{ id: 7, name: '<img onerror=bad()>検証AED', lat: 35.681, lng: 139.761, distance_m: 100 }] };
    }
};
const row = { id: 'fixture', facility_name: '検証施設', latitude: 35.68, longitude: 139.76, gps_accuracy_m: 15, status: 'pending', fraud_flags: ['duplicate_photo'] };
const view = MachimamoAedReview.create({ db, L, target, review: async (...args) => { decisions.push(args); }, formatDate: () => '検証日時' });
const button = text => walk(target).find(x => x.tagName === 'button' && x.textContent === text);
const checks = () => walk(target).filter(x => x.type === 'checkbox');
async function open() { const card = walk(target).find(x => x.tagName === 'details'); card.open = true; card.ontoggle(); await tick(); }
(async () => {
    assert.equal(MachimamoAedReview.coordinates(null, 139), false);
    assert.equal(MachimamoAedReview.coordinates(91, 139), false);
    view.render([row]); assert.equal(calls, 0);
    await open();
    assert.equal(button('新規承認・AEDスタンプ1個').disabled, true);
    const photo = walk(target).find(x => x.tagName === 'img'); photo.onload();
    for (const input of checks()) { input.checked = true; input.onchange(); }
    assert.equal(button('新規承認・AEDスタンプ1個').disabled, false);
    const radio = walk(target).find(x => x.type === 'radio'); radio.checked = true; radio.onchange();
    assert.equal(button('新規承認・AEDスタンプ1個').disabled, true);
    assert.equal(button('掲載済み・スタンプ対象外').disabled, false);
    await button('掲載済み・スタンプ対象外').onclick();
    assert.deepEqual(decisions[0], ['fixture', 'approved_existing', 7]);
    nearbyFail = true; await button('2kmまで広げる').onclick();
    assert.equal(button('掲載済み・スタンプ対象外').disabled, true);
    assert.equal(button('新規承認・AEDスタンプ1個').disabled, true);
    assert.ok(walk(target).some(x => x.textContent?.includes('照合に失敗しました')));
    photoFail = true; await button('写真を再取得').onclick();
    assert.equal(photo.hidden, true); assert.equal(photo.src, undefined);
    nearbyFail = false; hold = true;
    const pending = button('500m以内を確認').onclick();
    view.clear(); resolveNearby(); await pending;
    assert.deepEqual(target.children, []); assert.equal(removed, 1);
    hold = false; photoFail = false;
    view.render([{ ...row, latitude: null }]); await open();
    walk(target).find(x => x.tagName === 'img').onload();
    for (const input of checks()) { input.checked = true; input.onchange(); }
    assert.equal(button('新規承認・AEDスタンプ1個').disabled, true, 'invalid coordinates never enable approval');
    await button('要修正').onclick(); assert.equal(decisions[1][1], 'needs_changes');
    view.clear();
    console.log('PASS: lazy loading, photo and checklist gates, candidate binding, failed search, failed photo, stale responses, map cleanup, invalid coordinates');
})().catch(error => { console.error(error); process.exitCode = 1; });
