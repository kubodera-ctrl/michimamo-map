'use strict';

const SERVICE_ID = 'machimamo';
const SCHEMA_VERSION = 'machimamo-news-production-preview-v1';
const MODES = Object.freeze(['SINGLE', 'WEEKLY']);

function sha256(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function candidateBlockers(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return ['candidate is required'];
  const blockers = [];
  if (candidate.service !== SERVICE_ID) blockers.push('service must be machimamo');
  if (candidate.informationKind === 'LEGACY_UNVERIFIED' || candidate.legacy === true) blockers.push('LEGACY_UNVERIFIED cannot enter Production Preview');
  if (candidate.publishEligible !== true) blockers.push('candidate publishEligible must be true');
  if (!nonEmpty(candidate.candidateId)) blockers.push('candidateId is required');
  if (!nonEmpty(candidate.sourceEventId)) blockers.push('sourceEventId is required');
  const sourceHash = candidate?.source?.sourceHash || candidate.sourceHash;
  if (!sha256(sourceHash || '')) blockers.push('sourceHash must be SHA-256');
  if (!Array.isArray(candidate.verifiedFacts) || candidate.verifiedFacts.length === 0) blockers.push('verifiedFacts are required');
  if (candidate.selection?.include === false) blockers.push(candidate.selection.reason || 'selection excluded candidate');
  if (candidate.selection?.retention?.active === false) blockers.push('active retention is required for Production Preview');
  return unique(blockers);
}

function buildProductionPreview(candidate, { mode = 'SINGLE' } = {}) {
  if (!MODES.includes(mode)) throw new TypeError('mode must be SINGLE or WEEKLY');
  const blockers = candidateBlockers(candidate);
  const ready = blockers.length === 0;
  const sourceHash = candidate?.source?.sourceHash || candidate?.sourceHash || null;

  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    service: SERVICE_ID,
    mode,
    readOnly: true,
    connected: false,
    status: ready ? 'READY_FOR_PRODUCTION_PREVIEW' : 'BLOCKED',
    candidateId: candidate?.candidateId || null,
    sourceEventId: candidate?.sourceEventId || null,
    sourceHash,
    headline: candidate?.headline || null,
    prefecture: candidate?.prefecture || null,
    municipality: candidate?.municipality || null,
    newsDate: candidate?.newsDate || null,
    verifiedFacts: Array.isArray(candidate?.verifiedFacts) ? Object.freeze([...candidate.verifiedFacts]) : Object.freeze([]),
    blockers: Object.freeze(blockers),
    downstream: Object.freeze({
      productionRecord: 'NOT_CONNECTED',
      render: 'RENDERER_BLOCKED_BY_EXACT_V7_SOURCE',
      qc: 'NOT_CONNECTED',
      approval: 'NOT_CONNECTED',
      publishingPreview: 'NOT_CONNECTED',
      externalPublishing: 'CONNECTION_REQUIRED'
    })
  });
}

module.exports = Object.freeze({
  SERVICE_ID,
  SCHEMA_VERSION,
  MODES,
  candidateBlockers,
  buildProductionPreview
});
