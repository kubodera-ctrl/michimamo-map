'use strict';

// Narrow adapter for VIDEO_INPUT_SCHEMA_CURRENT.json (CURRENT_20260927).
// This validates provenance and facts before rendering; it never creates facts.
const TEMPLATE_VERSION = 'CURRENT_20260927';
const SOURCE_TYPES = Object.freeze(['LOCAL_ANOMALY', 'POLICE_OFFICIAL']);
const ALLOWED_RIGHTS = new Set([
  'SELF_OWNED', 'EXPLICIT_PERMISSION', 'PUBLIC_LICENSE', 'CC_BY', 'PUBLIC_DOMAIN'
]);
const DISALLOWED_MEDIA_MODES = new Set(['DO_NOT_USE']);

function validateProductionInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, publishEligible: false, errors: ['input must be an object'] };
  }

  if (!['SINGLE', 'WEEKLY'].includes(input.mode)) errors.push('mode must be SINGLE or WEEKLY');
  if (input.mode === 'SINGLE') {
    if (!SOURCE_TYPES.includes(input.sourceType)) errors.push('sourceType must be LOCAL_ANOMALY or POLICE_OFFICIAL');
    validateSource(input.source, input.sourceType, 'source', errors);
    validateRights(input.rights, 'rights', errors);
    validateSingle(input.single, errors);
  }
  if (input.mode === 'WEEKLY') {
    validateSource(input.source, undefined, 'source', errors);
    validateRights(input.rights, 'rights', errors);
    validateWeekly(input.weekly, errors);
  }

  return {
    valid: errors.length === 0,
    publishEligible: errors.length === 0,
    templateVersion: TEMPLATE_VERSION,
    errors
  };
}

function validateSingle(single, errors) {
  if (!single || typeof single !== 'object') {
    errors.push('single is required for SINGLE');
    return;
  }
  for (const key of ['prefecture', 'municipality', 'category', 'headline']) {
    if (!nonEmpty(single[key])) errors.push(`single.${key} is required`);
  }
  if (!nonEmptyArray(single.verifiedFacts)) errors.push('single.verifiedFacts must contain verified facts');
  if (single.timeline != null && (!Array.isArray(single.timeline) || single.timeline.some(row => !nonEmpty(row?.label) || !nonEmpty(row?.date)))) {
    errors.push('single.timeline entries require label and date');
  }
  if (single.mapRepresentative != null) validateMapRepresentative(single.mapRepresentative, 'single.mapRepresentative', errors);
}

function validateSource(source, sourceType, path, errors) {
  if (!source || typeof source !== 'object') {
    errors.push(`${path} is required`);
    return;
  }
  if (!nonEmpty(source.name)) errors.push(`${path}.name is required`);
  if (!nonEmpty(source.publishedAt)) errors.push(`${path}.publishedAt is required`);
  if (sourceType === 'POLICE_OFFICIAL' && !validHttpsUrl(source.url)) errors.push(`${path}.url must be HTTPS for POLICE_OFFICIAL`);
  if (source.url != null && !validHttpsUrl(source.url)) errors.push(`${path}.url must be HTTPS or null`);
}

function validateRights(rights, path, errors) {
  if (!rights || typeof rights !== 'object') {
    errors.push(`${path} is required`);
    return;
  }
  if (!ALLOWED_RIGHTS.has(rights.rightsLevel)) errors.push(`${path}.rightsLevel is not publishable`);
  if (rights.mediaUseMode != null && !['FULL_VIDEO', 'VIDEO_EXCERPT', 'STILL_ONLY', 'AUDIO_DISABLED', 'ATTRIBUTION_REQUIRED', 'LINK_ONLY', 'DO_NOT_USE'].includes(rights.mediaUseMode)) {
    errors.push(`${path}.mediaUseMode is unsupported`);
  }
  if (DISALLOWED_MEDIA_MODES.has(rights.mediaUseMode)) errors.push(`${path}.mediaUseMode prohibits use`);
  if (rights.commercialUseAllowed === false) errors.push(`${path}. commercial use is not allowed`);
}

function validateWeekly(weekly, errors) {
  if (!weekly || typeof weekly !== 'object') {
    errors.push('weekly is required for WEEKLY');
    return;
  }
  if (!nonEmpty(weekly.prefecture)) errors.push('weekly.prefecture is required');
  if (!nonEmpty(weekly.periodLabel)) errors.push('weekly.periodLabel is required');
  // The Drive CURRENT input schema has one shared source/rights object for a
  // weekly render. The app integration adds item-level provenance because a
  // weekly set can mix user anomalies and official police information. Do not
  // treat the render-level fields as clearance for every item.
  if (!Array.isArray(weekly.newsItems) || weekly.newsItems.length === 0) {
    errors.push('weekly.newsItems must contain at least one real news item');
    return;
  }
  weekly.newsItems.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`weekly.newsItems[${index}] must be an object`);
      return;
    }
    for (const key of ['municipality', 'headline']) {
      if (!nonEmpty(item[key])) errors.push(`weekly.newsItems[${index}].${key} is required`);
    }
    if (!SOURCE_TYPES.includes(item.sourceType)) errors.push(`weekly.newsItems[${index}].sourceType must be LOCAL_ANOMALY or POLICE_OFFICIAL`);
    validateSource(item.source, item.sourceType, `weekly.newsItems[${index}].source`, errors);
    validateRights(item.rights, `weekly.newsItems[${index}].rights`, errors);
    if (!nonEmptyArray(item.verifiedFacts)) errors.push(`weekly.newsItems[${index}].verifiedFacts must contain verified facts`);
    const hasLat = item.representativeLat != null;
    const hasLon = item.representativeLon != null;
    if (hasLat !== hasLon) errors.push(`weekly.newsItems[${index}] representative coordinates must be paired`);
    if (hasLat && (!Number.isFinite(item.representativeLat) || !Number.isFinite(item.representativeLon))) {
      errors.push(`weekly.newsItems[${index}] representative coordinates must be finite`);
    }
  });
  if (!nonEmptyArray(weekly.safetyPoints)) errors.push('weekly.safetyPoints must contain verified/general approved guidance');
}

function validateMapRepresentative(point, path, errors) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) errors.push(`${path} requires finite lat/lon`);
  if (!['prefecture', 'municipality', 'exact_public'].includes(point.precision)) errors.push(`${path}.precision is unsupported`);
}

function validHttpsUrl(value) {
  if (!nonEmpty(value)) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }
function nonEmptyArray(value) { return Array.isArray(value) && value.length > 0 && value.every(nonEmpty); }

module.exports = { TEMPLATE_VERSION, SOURCE_TYPES, validateProductionInput };
