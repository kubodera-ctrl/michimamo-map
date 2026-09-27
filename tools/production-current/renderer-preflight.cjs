#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function inspectRendererBundle(bundleRoot, manifestPath = path.join(__dirname, 'renderer-bundle.json')) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const root = path.resolve(bundleRoot);
  const required = manifest.requiredExistingFiles || manifest.requiredFiles || [];
  const missing = required.filter((relativePath) => {
    const resolved = path.resolve(root, relativePath);
    return !resolved.startsWith(`${root}${path.sep}`) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile();
  });
  const codeDependencies = manifest.missingCodeDependencies || [];
  const missingCode = codeDependencies.filter((relativePath) => {
    const resolved = path.resolve(root, relativePath);
    return !resolved.startsWith(`${root}${path.sep}`) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile();
  });
  return {
    ready: missing.length === 0 && missingCode.length === 0,
    sourceMaster: manifest.sourceMaster,
    renderer: manifest.primaryRenderer,
    missing,
    missingCode,
    fontPolicy: manifest.runtimeFontPolicy || 'Resolve Japanese-capable font at runtime.',
  };
}

if (require.main === module) {
  const root = process.argv[2];
  if (!root) {
    process.stderr.write('Usage: node renderer-preflight.cjs <ASSET_ROOT>\n');
    process.exitCode = 2;
  } else {
    const result = inspectRendererBundle(root);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ready) process.exitCode = 1;
  }
}

module.exports = { inspectRendererBundle };
