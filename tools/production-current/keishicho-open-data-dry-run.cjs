#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { dryRun } = require('./keishicho-open-data-adapter.cjs');

const inputPath = process.argv[2] || path.join(__dirname, 'fixtures', 'keishicho-events-verified-20260924.json');
const checkedAtArg = process.argv[3] || '2026-09-27T14:30:00Z';

const parsed = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const records = Array.isArray(parsed) ? parsed : parsed.records;
if (!Array.isArray(records)) throw new TypeError('fixture must be an array or contain records[]');

const results = dryRun(records, { checkedAt: new Date(checkedAtArg) });
const summary = {
  sourceFile: path.basename(inputPath),
  records: results.length,
  valid: results.filter(x => x.validation.valid).length,
  publishEligible: results.filter(x => x.validation.publishEligible).length,
  selected: results.filter(x => x.selection?.include).length,
  productionEligible: results.filter(x => x.productionEligible === true).length,
  productionWrite: false,
  candidates: results.map(x => ({
    candidateId: x.candidate?.candidateId || null,
    sourceEventId: x.candidate?.sourceEventId || null,
    municipality: x.candidate?.municipality || null,
    category: x.candidate?.category || null,
    sourceHash: x.candidate?.source?.sourceHash || null,
    valid: x.validation.valid,
    publishEligible: x.validation.publishEligible,
    productionEligible: x.productionEligible === true,
    selection: x.selection
  }))
};
process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
if (summary.valid !== summary.records) process.exitCode = 1;
