// Run with Playwright installed and a Chromium browser available.
// Optional: CHROMIUM_PATH, LEAFLET_JS, LEAFLET_CSS for an offline local run.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.route('https://photos.example/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="#e2e8f0"/><rect x="140" y="40" width="200" height="240" fill="white"/><text x="180" y="150" font-size="48" fill="red">AED</text><text x="130" y="310" font-size="16">TEST IMAGE - NOT A SUBMISSION</text></svg>' }));
        await page.route('https://*.tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }));
        await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;margin:12px}*{box-sizing:border-box}</style><div id="target"></div>');
        await page.addStyleTag(process.env.LEAFLET_CSS ? { path: process.env.LEAFLET_CSS } : { url: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' });
        await page.addScriptTag(process.env.LEAFLET_JS ? { path: process.env.LEAFLET_JS } : { url: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js' });
        await page.addStyleTag({ path: path.join(root, 'aed-review.css') });
        await page.addScriptTag({ path: path.join(root, 'aed-review.js') });
        await page.evaluate(() => {
            window.mock = { photoFail: false, nearbyFail: false, hold: false, calls: 0, decisions: [] };
            window.row = { id: 'test-id', facility_name: '<img src=x onerror=alert(1)>検証施設', address: '東京都・検証用住所', installation_location: '入口付近', latitude: 35.68, longitude: 139.76, gps_accuracy_m: 15, photo_object_path: 'test.jpg', status: 'pending', fraud_flags: ['duplicate_photo'], created_at: '2026-09-16' };
            const db = { storage: { from: () => ({ createSignedUrl: async () => mock.photoFail ? { error: true } : { data: { signedUrl: 'https://photos.example/test.svg' } } }) }, rpc: async () => {
                mock.calls++;
                if (mock.hold) await new Promise(resolve => { mock.release = resolve; });
                return mock.nearbyFail ? { error: true } : { data: [{ id: 7, name: '掲載済み検証AED', address: '検証用住所', lat: 35.681, lng: 139.761, distance_m: 140, installation_location: '1階', source_name: 'テスト出典' }] };
            } };
            window.controller = MachimamoAedReview.create({ db, L, target: document.getElementById('target'), formatDate: x => x, review: async (...args) => mock.decisions.push(args) });
            controller.render([row]);
        });
        assert.equal(await page.evaluate(() => mock.calls), 0, 'details fetched only on open');
        await page.locator('summary').click();
        await page.waitForFunction(() => document.querySelector('.aed-review-photo').hidden === false);
        await page.getByText('掲載済み検証AED', { exact: false }).last().waitFor();
        assert.equal(await page.locator('summary img').count(), 0, 'user text is not HTML');
        assert.equal(await page.getByRole('button', { name: '新規承認 +30pt', exact: true }).isDisabled(), true);
        for (const check of await page.locator('input[type=checkbox]').all()) await check.check();
        assert.equal(await page.getByRole('button', { name: '新規承認 +30pt', exact: true }).isEnabled(), true);
        await page.locator('input[type=radio]').check();
        assert.equal(await page.getByRole('button', { name: '新規承認 +30pt', exact: true }).isDisabled(), true);
        await page.getByRole('button', { name: '掲載済み 0pt', exact: true }).click();
        assert.deepEqual(await page.evaluate(() => mock.decisions[0]), ['test-id', 'approved_existing', 7]);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'mobile fits viewport');
        await page.screenshot({ path: '/tmp/dev23_aed_review_mobile.png', fullPage: true });
        await page.evaluate(() => { mock.nearbyFail = true; });
        await page.getByRole('button', { name: '2kmまで広げる' }).click();
        await page.getByText('照合に失敗しました。', { exact: false }).waitFor();
        assert.equal(await page.getByRole('button', { name: '新規承認 +30pt', exact: true }).isDisabled(), true);
        await page.evaluate(() => { mock.photoFail = true; });
        await page.getByRole('button', { name: '写真を再取得', exact: true }).click();
        await page.getByText('写真を取得できません。', { exact: false }).waitFor();
        assert.equal(await page.locator('.aed-review-photo').isHidden(), true);
        await page.evaluate(() => { mock.nearbyFail = false; mock.hold = true; });
        await page.getByRole('button', { name: '500m以内を確認' }).click();
        await page.waitForFunction(() => !!mock.release);
        await page.evaluate(() => { controller.clear(); mock.release(); });
        await page.waitForTimeout(30);
        assert.equal(await page.locator('#target').innerHTML(), '', 'logout/refresh discards pending responses');
        assert.deepEqual(errors, []);
        console.log('PASS: mobile layout, safe text, lazy photo, checklist, candidate selection, failures, stale response and cleanup');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
