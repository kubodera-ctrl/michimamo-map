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
assert(/onpointerdown=dismiss/.test(onboarding), 'install guide later button must dismiss on pointerdown');
assert(/ontouchstart=dismiss/.test(onboarding), 'install guide later button must dismiss on Safari touchstart');
assert(/removeOverlay\(\);\s*safeSet\(KEY_INSTALL\)/.test(onboarding), 'install guide must disappear before persistence work');

console.log('beta SEO/PWA metadata gate: PASS');

const spotLoader = fs.readFileSync(path.join(__dirname, '..', 'spot-loader.js'), 'utf8');
const mypageGuide = fs.readFileSync(path.join(__dirname, '..', 'mypage-guide.js'), 'utf8');
assert(spotLoader.includes('pwa-onboarding.js?v=42-safari-nav5'), 'Safari must fetch the latest onboarding bundle');
assert(mypageGuide.includes('spot-loader.js?v=42-safari-nav5'), 'Safari must fetch the latest spot/onboarding loader');

assert(onboarding.includes('runWhenInitialLoadReady'), 'onboarding must wait until initial app work is complete');
assert(onboarding.includes("machimamo:initial-ready"), 'onboarding must use the app-ready signal');
assert(html.includes('window.MachimamoInitialLoadReady = true'), 'app must publish initial-ready state');
