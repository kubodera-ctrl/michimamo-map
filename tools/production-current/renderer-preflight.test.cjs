'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspectRendererBundle } = require('./renderer-preflight.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'machimamo-renderer-'));
try {
  const missingResult = inspectRendererBundle(root);
  assert.equal(missingResult.ready, false);
  assert.ok(missingResult.missing.includes('machimamo_reference_v13/package/machimamo_reference_v13.py'));
  assert.ok(missingResult.missing.includes('machimamo_reference_v16_3/overlays/news_short.png'));

  const manifestPath = path.join(root, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    sourceMaster: 'fixture',
    primaryRenderer: 'entry.py',
    requiredFiles: ['source/entry.py'],
  }));
  fs.mkdirSync(path.join(root, 'source'));
  fs.writeFileSync(path.join(root, 'source/entry.py'), '# fixture renderer');
  assert.deepEqual(inspectRendererBundle(root, manifestPath), {
    ready: true,
    sourceMaster: 'fixture',
    renderer: 'entry.py',
    missing: [],
  });

  const traversalPath = path.join(root, 'escape.py');
  fs.writeFileSync(traversalPath, '# must not satisfy a path outside bundle root');
  fs.writeFileSync(manifestPath, JSON.stringify({
    sourceMaster: 'fixture',
    primaryRenderer: '../escape.py',
    requiredFiles: ['../escape.py'],
  }));
  assert.equal(inspectRendererBundle(root, manifestPath).ready, false);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.stdout.write('CURRENT renderer bundle preflight: PASS\n');
