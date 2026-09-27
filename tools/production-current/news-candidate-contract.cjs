'use strict';

const SERVICE_ID = 'machimamo';
const CANDIDATE_SCHEMA_VERSION = 'machimamo-news-candidate-v1';
const INFORMATION_KINDS = Object.freeze(['POLICE_OFFICIAL', 'LOCAL_ANOMALY']);
const SOURCE_STATES = Object.freeze(['verified', 'needs_review', 'stale', 'withdrawn']);
const FACTS_STATES = Object.freeze(['verified', 'needs_review', 'blocked']);
const RIGHTS_STATES = Object.freeze(['cleared', 'needs_review', 'blocked']);
const CORRECTION_STATES = Object.freeze(['current', 'unknown', 'withdrawn']);
const ALLOWED_RIGHTS = new Set(['SELF_OWNED','EXPLICIT_PERMISSION','PUBLIC_LICENSE','CC_BY','PUBLIC_DOMAIN']);
const DISALLOWED_MEDIA = new Set(['LINK_ONLY','DO_NOT_USE']);
const PREFECTURES = new Set([
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県'
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
function httpsUrl(value) {
  return nonEmpty(value) && /^https:\/\/[^\s]+$/i.test(value.trim());
}
function isoDate(value) {
  if (!nonEmpty(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}
function stringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmpty);
}
function validateCanonicalCandidate(candidate) {
  const errors = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { valid:false, publishEligible:false, errors:['candidate must be an object'] };
  }
  if (candidate.service !== SERVICE_ID) errors.push('service must be machimamo');
  if (candidate.schemaVersion !== CANDIDATE_SCHEMA_VERSION) errors.push('schemaVersion mismatch');
  if (!nonEmpty(candidate.candidateId)) errors.push('candidateId is required');
  if (!INFORMATION_KINDS.includes(candidate.informationKind)) errors.push('informationKind must be POLICE_OFFICIAL or LOCAL_ANOMALY');
  if (!nonEmpty(candidate.headline)) errors.push('headline is required');
  if (!PREFECTURES.has(candidate.prefecture)) errors.push('prefecture must be one of the 47 prefectures');
  if (!nonEmpty(candidate.newsDate) || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.newsDate)) errors.push('newsDate must be YYYY-MM-DD');
  if (!SOURCE_STATES.includes(candidate.sourceStatus)) errors.push('sourceStatus unsupported');
  if (!FACTS_STATES.includes(candidate.factsStatus)) errors.push('factsStatus unsupported');
  if (!RIGHTS_STATES.includes(candidate.rightsStatus)) errors.push('rightsStatus unsupported');
  if (!CORRECTION_STATES.includes(candidate.correctionStatus)) errors.push('correctionStatus unsupported');
  if (!stringArray(candidate.verifiedFacts)) errors.push('verifiedFacts must contain at least one verified fact');

  const source = candidate.source;
  if (!source || typeof source !== 'object') errors.push('source is required');
  else {
    if (!nonEmpty(source.name)) errors.push('source.name is required');
    if (!httpsUrl(source.url)) errors.push('source.url must be HTTPS');
    if (!isoDate(source.publishedAt)) errors.push('source.publishedAt must be a valid date');
    if (!isoDate(source.checkedAt)) errors.push('source.checkedAt must be a valid date');
    if (!/^[0-9a-f]{64}$/.test(source.sourceHash || '')) errors.push('source.sourceHash must be sha256 hex');
  }

  const rights = candidate.rights;
  if (!rights || typeof rights !== 'object') errors.push('rights is required');
  else {
    if (!ALLOWED_RIGHTS.has(rights.rightsLevel)) errors.push('rights.rightsLevel is not publishable');
    if (DISALLOWED_MEDIA.has(rights.mediaUseMode)) errors.push('rights.mediaUseMode is not publishable');
    if (rights.commercialUseAllowed !== true) errors.push('rights.commercialUseAllowed must be true');
    if (!isoDate(rights.rightsCheckedAt)) errors.push('rights.rightsCheckedAt must be a valid date');
    if (!httpsUrl(rights.rightsEvidenceUrl)) errors.push('rights.rightsEvidenceUrl must be HTTPS');
    if (rights.rightsLevel === 'CC_BY' && !nonEmpty(rights.attributionText)) errors.push('rights.attributionText is required for CC_BY');
  }

  const gatePass =
    candidate.sourceStatus === 'verified' &&
    candidate.factsStatus === 'verified' &&
    candidate.rightsStatus === 'cleared' &&
    candidate.correctionStatus === 'current';

  return {
    valid: errors.length === 0,
    publishEligible: errors.length === 0 && gatePass,
    errors
  };
}

module.exports = {
  SERVICE_ID,
  CANDIDATE_SCHEMA_VERSION,
  INFORMATION_KINDS,
  SOURCE_STATES,
  FACTS_STATES,
  RIGHTS_STATES,
  CORRECTION_STATES,
  validateCanonicalCandidate
};
