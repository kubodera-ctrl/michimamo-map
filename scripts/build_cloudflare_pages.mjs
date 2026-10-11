import { cp, mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = path.join(ROOT, '.cloudflare-pages-dist')

const rootFiles = [
  'index.html',
  'terms.html',
  'privacy.html',
  'manifest.webmanifest',
  'apple-touch-icon.png',
  'apple-touch-icon-precomposed.png',
  'apple-touch-icon-180x180.png',
  'accident-hotspots.js',
  'aed-image-ai.js',
  'aed-review.css',
  'aed-review.js',
  'beta-error-bootstrap.js',
  'beta-usage-analytics.js',
  'camera-capture.css',
  'camera-capture.js',
  'camera-detection.js',
  'camera-drive-mvp.js',
  'camera-evidence.js',
  'camera-guide.css',
  'camera-guide.js',
  'camera-observation.js',
  'camera-safe-ui.css',
  'camera-safe-ui.js',
  'drive-test-log.js',
  'exchange-service.js',
  'identity-ui.css',
  'identity-ui.js',
  'map-menu.css',
  'map-menu.js',
  'map-viewport.js',
  'mypage-guide.css',
  'mypage-guide.js',
  'nearby-safety.css',
  'nearby-safety.js',
  'point-exchange.css',
  'point-exchange.js',
  'post-outbox.js',
  'profile-v2.css',
  'profile-v2.js',
  'pwa-onboarding.js',
  'road-parking-summary.js',
  'road-review.css',
  'road-review.js',
  'source-browser.js',
  'spot-loader.js',
  'wbgt.js'
]

async function copyRequired(relativePath) {
  const src = path.join(ROOT, relativePath)
  const dest = path.join(OUT, relativePath)
  await stat(src)
  await mkdir(path.dirname(dest), { recursive: true })
  await cp(src, dest, { recursive: true })
}

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

for (const file of rootFiles) await copyRequired(file)
await copyRequired('assets')
await copyRequired('hosting/cloudflare/_headers')
await copyRequired('hosting/cloudflare/_redirects')

await cp(path.join(OUT, 'hosting/cloudflare/_headers'), path.join(OUT, '_headers'))
await cp(path.join(OUT, 'hosting/cloudflare/_redirects'), path.join(OUT, '_redirects'))
await rm(path.join(OUT, 'hosting'), { recursive: true, force: true })

console.log('CLOUDFLARE_PAGES_DIST_READY', OUT)
