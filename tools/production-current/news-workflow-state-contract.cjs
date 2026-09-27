'use strict';

const SERVICE_ID = 'machimamo';

const STATES = Object.freeze({
  production: Object.freeze(['NOT_CONNECTED','DRAFT','FROZEN']),
  render: Object.freeze(['RENDERER_BLOCKED_BY_EXACT_V7_SOURCE','NOT_STARTED','PROCESSING','SUCCEEDED','FAILED']),
  qc: Object.freeze(['NOT_CONNECTED','PENDING','PASSED','FAILED']),
  approval: Object.freeze(['NOT_CONNECTED','PENDING','APPROVED','REJECTED']),
  publishingPreview: Object.freeze(['NOT_CONNECTED','PENDING','READY']),
  platform: Object.freeze(['CONNECTION_REQUIRED','NOT_STARTED','PROCESSING','POSTED','FAILED'])
});

function stateIn(group, value) {
  return STATES[group].includes(value);
}

function validateWorkflowState(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {valid:false,errors:['workflow state must be an object']};
  if (input.service !== SERVICE_ID) errors.push('service must be machimamo');
  for (const group of ['production','render','qc','approval','publishingPreview']) {
    if (!stateIn(group,input[group])) errors.push(`${group} state is invalid`);
  }
  const platforms = input.platforms || {};
  for (const platform of ['X','TIKTOK']) {
    if (!stateIn('platform',platforms[platform])) errors.push(`${platform} platform state is invalid`);
  }

  // Prerequisites are explicit domain facts. UI visibility never advances a state.
  if (input.render === 'SUCCEEDED' && input.production !== 'FROZEN') errors.push('render SUCCEEDED requires production FROZEN');
  if (input.qc === 'PASSED' && input.render !== 'SUCCEEDED') errors.push('QC PASSED requires render SUCCEEDED');
  if (input.approval === 'APPROVED' && input.qc !== 'PASSED') errors.push('approval APPROVED requires QC PASSED');
  if (input.publishingPreview === 'READY' && input.approval !== 'APPROVED') errors.push('publishing preview READY requires approval APPROVED');
  const anyPosted = ['X','TIKTOK'].some(p=>platforms[p] === 'POSTED');
  if (anyPosted && input.publishingPreview !== 'READY') errors.push('platform POSTED requires publishing preview READY');
  if (anyPosted && !input.revisionId) errors.push('platform POSTED requires revisionId');
  if (anyPosted && !input.renderId) errors.push('platform POSTED requires renderId');

  return {valid:errors.length===0,errors:[...new Set(errors)]};
}

function readOnlyProjection(input) {
  const validation = validateWorkflowState(input);
  return Object.freeze({
    service: SERVICE_ID,
    valid: validation.valid,
    errors: Object.freeze(validation.errors),
    candidate: input?.candidate || 'UNKNOWN',
    production: input?.production || 'NOT_CONNECTED',
    render: input?.render || 'NOT_STARTED',
    qc: input?.qc || 'NOT_CONNECTED',
    approval: input?.approval || 'NOT_CONNECTED',
    publishingPreview: input?.publishingPreview || 'NOT_CONNECTED',
    platforms: Object.freeze({
      X: input?.platforms?.X || 'CONNECTION_REQUIRED',
      TIKTOK: input?.platforms?.TIKTOK || 'CONNECTION_REQUIRED'
    }),
    revisionId: input?.revisionId || null,
    renderId: input?.renderId || null
  });
}

module.exports = Object.freeze({ SERVICE_ID, STATES, validateWorkflowState, readOnlyProjection });
