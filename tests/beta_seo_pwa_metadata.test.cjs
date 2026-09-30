const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8');
const onboarding = fs.readFileSync(path.join(__dirname, '..', 'pwa-onboarding.js'), 'utf8');

assert(/<meta\s+name="description"\s+content="[^"]+"/i.test(html), 'meta description is required');
assert(html.includes('<meta name="theme-color" content="#2563eb">'), 'theme-color must match the app theme');
assert(html.includes('<link rel="manifest" href="/manifest.webmanifest">'), 'manifest must be linked from index.html');
assert.doesNotThrow(() => JSON.parse(manifest), 'manifest.webmanifest must remain valid JSON');
assert(onboarding.includes('touch-action:manipulation'), 'install guide later button must avoid delayed tap handling');
assert(/addEventListener\('pointerdown',dismiss/.test(onboarding), 'install guide later button must dismiss on pointerdown');
assert(/removeOverlay\(\);\s*safeSet\(KEY_INSTALL\)/.test(onboarding), 'install guide must disappear before persistence work');

console.log('beta SEO/PWA metadata gate: PASS');
