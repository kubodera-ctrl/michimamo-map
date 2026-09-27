'use strict';

const crypto = require('node:crypto');
const { validateCanonicalCandidate, CANDIDATE_SCHEMA_VERSION } = require('./news-candidate-contract.cjs');
const { classifyCandidate } = require('./news-selection-policy.cjs');

const SERVICE_ID = 'machimamo';
const SOURCE_NAME = '警視庁 メールけいしちょう OPEN DATA';
const SOURCE_URL = 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/';
const RIGHTS_EVIDENCE_URL = 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy';
const ATTRIBUTION_TEXT = '出典：警視庁「メールけいしちょう」';

const CATEGORY_MAP = Object.freeze({
  'ひったくり': 'ROBBERY_SNATCH',
  '子供に対する犯罪等': 'CHILD_SAFETY',
  '強盗': 'ROBBERY',
  '声かけ等': 'APPROACH_OR_SUSPICIOUS',
  '公然わいせつ': 'INDECENT_EXPOSURE',
  '多発事件': 'SERIAL_INCIDENT',
  '特捜・共捜事件': 'SPECIAL_INVESTIGATION',
  'その他の犯罪発生情報': 'OTHER_CRIME',
  '防犯情報': 'SAFETY_INFORMATION',
  '交通情報': 'TRAFFIC_INFORMATION',
  '各種イベント情報・お知らせ': 'NOTICE',
  '特殊詐欺犯人からの架電情報': 'SPECIAL_FRAUD_CALL',
  '防災情報': 'DISASTER_INFORMATION'
});

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function canonicalSourceHash(record) {
  const frozen = {
    sourceEventId: String(record.sourceEventId || '').trim(),
    publishedAt: String(record.publishedAt || '').trim(),
    occurredAt: String(record.occurredAt || '').trim(),
    sourceCategory: String(record.sourceCategory || '').trim(),
    municipality: String(record.municipality || '').trim(),
    headline: String(record.headline || '').trim(),
    body: String(record.body || '').trim(),
    correctionStatus: String(record.correctionStatus || 'current').trim()
  };
  return sha256Hex(JSON.stringify(frozen));
}

function newsDateFrom(record) {
  const candidate = record.occurredAt || record.publishedAt;
  const date = new Date(candidate || '');
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function normalizeCorrection(value) {
  if (value === 'current' || value === 'withdrawn') return value;
  return 'unknown';
}

function sourceCategoryToCanonical(value) {
  const source = String(value || '').trim();
  return CATEGORY_MAP[source] || 'OTHER';
}

function verifiedFactsFrom(record) {
  if (Array.isArray(record.verifiedFacts) && record.verifiedFacts.every(nonEmpty) && record.verifiedFacts.length > 0) {
    return record.verifiedFacts.map(x => x.trim());
  }
  const facts = [];
  if (nonEmpty(record.headline)) facts.push(record.headline.trim());
  if (nonEmpty(record.body) && record.body.trim() !== record.headline?.trim()) facts.push(record.body.trim());
  return facts;
}

function normalizeLocalityEvidence(record) {
  if (!nonEmpty(record.municipality)) return null;
  const type = nonEmpty(record.localityType) ? record.localityType.trim() : 'occurred';
  if (!['occurred','arrested','searched','protected','found','base','impact'].includes(type)) return null;
  return Object.freeze({
    type,
    confirmed: record.localityConfirmed !== false,
    prefecture: '東京都',
    municipality: record.municipality.trim(),
    evidence: nonEmpty(record.localityEvidenceText) ? record.localityEvidenceText.trim() : '警視庁OPEN DATAの地域情報'
  });
}

function buildCanonicalCandidate(record, { checkedAt = new Date(), classify = true } = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { candidate: null, validation: { valid:false, publishEligible:false, errors:['record must be an object'] }, selection: null };
  }

  const sourceEventId = String(record.sourceEventId || '').trim();
  const publishedAt = String(record.publishedAt || '').trim();
  const correctionStatus = normalizeCorrection(record.correctionStatus);
  const verifiedFacts = verifiedFactsFrom(record);
  const sourceHash = canonicalSourceHash(record);
  const municipality = String(record.municipality || '').trim();
  const headline = String(record.headline || '').trim();
  const category = sourceCategoryToCanonical(record.sourceCategory);
  const localityEvidence = normalizeLocalityEvidence(record);
  const checkedIso = checkedAt instanceof Date ? checkedAt.toISOString() : new Date(checkedAt).toISOString();

  const candidate = {
    service: SERVICE_ID,
    schemaVersion: CANDIDATE_SCHEMA_VERSION,
    candidateId: sourceEventId ? `keishicho-open-data:${sourceEventId}` : '',
    sourceEventId,
    informationKind: 'POLICE_OFFICIAL',
    headline,
    prefecture: '東京都',
    municipality,
    newsDate: newsDateFrom(record),
    category,
    verifiedFacts,
    sourceStatus: sourceEventId && publishedAt ? 'verified' : 'needs_review',
    factsStatus: verifiedFacts.length ? 'verified' : 'needs_review',
    rightsStatus: 'cleared',
    correctionStatus,
    source: {
      name: SOURCE_NAME,
      url: SOURCE_URL,
      publishedAt,
      checkedAt: checkedIso,
      sourceHash
    },
    rights: {
      rightsLevel: 'CC_BY',
      mediaUseMode: 'ATTRIBUTION_REQUIRED',
      commercialUseAllowed: true,
      modificationAllowed: true,
      attributionRequired: true,
      attributionText: ATTRIBUTION_TEXT,
      rightsCheckedAt: checkedIso,
      rightsEvidenceUrl: RIGHTS_EVIDENCE_URL
    },
    localityEvidence,
    lastVerifiedAt: checkedIso,
    rawSourceCategory: String(record.sourceCategory || '').trim()
  };

  const validation = validateCanonicalCandidate(candidate);
  const selection = classify ? classifyCandidate(candidate, new Date(checkedIso)) : null;
  return { candidate: Object.freeze(candidate), validation, selection };
}

function dryRun(records, options = {}) {
  const rows = Array.isArray(records) ? records : [];
  return rows.map(record => buildCanonicalCandidate(record, options));
}

module.exports = {
  SERVICE_ID,
  SOURCE_NAME,
  SOURCE_URL,
  RIGHTS_EVIDENCE_URL,
  ATTRIBUTION_TEXT,
  CATEGORY_MAP,
  canonicalSourceHash,
  buildCanonicalCandidate,
  dryRun
};
