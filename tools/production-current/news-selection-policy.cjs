'use strict';

const ACTIVE_RETENTION_DAYS = 60;
const DISPLAY_PURGE_DAYS = 90;

const PRIORITIES = Object.freeze({
  HIGH: 'high',
  NORMAL: 'normal',
  CONDITIONAL: 'conditional',
  EXCLUDE: 'exclude'
});

const TOPICS = Object.freeze({
  PERSON_SAFETY: 'PERSON_SAFETY',
  CHILD_SAFETY: 'CHILD_SAFETY',
  MISSING_PERSON: 'MISSING_PERSON',
  FRAUD_LOCAL: 'FRAUD_LOCAL',
  ORGANIZED_LOCAL: 'ORGANIZED_LOCAL',
  TRAFFIC_WRONG_WAY: 'TRAFFIC_WRONG_WAY',
  TRAFFIC_MAJOR: 'TRAFFIC_MAJOR',
  PUBLIC_SAFETY: 'PUBLIC_SAFETY',
  IMMIGRATION_LOCAL_ARREST: 'IMMIGRATION_LOCAL_ARREST',
  SELF_HARM_PUBLIC_IMPACT: 'SELF_HARM_PUBLIC_IMPACT',
  CUSTOMS_LOW_RELEVANCE: 'CUSTOMS_LOW_RELEVANCE',
  OVERSEAS_NO_LOCALITY: 'OVERSEAS_NO_LOCALITY',
  GENERAL: 'GENERAL'
});

const PERSON_TERMS = [
  '痴漢','つきまとい','声かけ','公然わいせつ','盗撮','不審者',
  '暴行','傷害','強盗','脅迫','刃物','連れ去り','誘拐'
];
const CHILD_TERMS = [
  '子ども','子供','児童','園児','小学生','中学生','迷子','行方不明',
  '捜索','保護要請','連れ去り','誘拐'
];
const FRAUD_TERMS = ['詐欺','特殊詐欺','闇バイト'];
const ORGANIZED_PROPERTY_TERMS = ['万引きグループ','窃盗グループ','組織的窃盗','組織犯罪'];
const WRONG_WAY_TERMS = ['逆走','逆走車'];
const EXPRESSWAY_TERMS = ['高速道路','高速','自動車専用道路','本線','ジャンクション','JCT','インターチェンジ','IC','料金所'];
const MAJOR_TRAFFIC_TERMS = ['多重事故','重大事故','通行止め','通行規制','車線規制','交通規制','事故通行止め'];
const PUBLIC_SAFETY_TERMS = ['火災','爆発','危険物','逃走','立てこもり','避難','通行規制'];
const IMMIGRATION_TERMS = ['出入国管理法','入管法','不法残留','不法滞在','不法入国'];
const SELF_HARM_TERMS = ['自殺','飛び降り','飛び込み'];
const CUSTOMS_TERMS = ['税関','密輸','違法物','覚醒剤','麻薬','大麻'];
const AIRPORT_PORT_TERMS = ['空港','羽田','成田','関西空港','関空','港湾','税関'];

function asText(candidate) {
  const facts = Array.isArray(candidate?.verifiedFacts) ? candidate.verifiedFacts.join(' ') : '';
  const tags = Array.isArray(candidate?.tags) ? candidate.tags.join(' ') : '';
  return [candidate?.headline, candidate?.summary, candidate?.category, facts, tags]
    .filter(Boolean).join(' ');
}

function hasAny(text, terms) {
  return terms.some(term => text.includes(term));
}

function hasLocality(candidate) {
  const locality = candidate?.localityEvidence;
  if (locality && typeof locality === 'object') {
    return ['occurred','arrested','searched','protected','found','base','impact'].includes(locality.type) &&
      locality.confirmed === true;
  }
  return typeof candidate?.municipality === 'string' && candidate.municipality.trim().length > 0;
}

function retentionState(newsDate, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(newsDate || ''))) {
    return { active:false, display:false, ageDays:null, state:'date_unknown' };
  }
  const date = new Date(String(newsDate) + 'T00:00:00Z');
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!Number.isFinite(date.getTime())) return { active:false, display:false, ageDays:null, state:'date_invalid' };
  const ageDays = Math.floor((current.getTime() - date.getTime()) / 86400000);
  if (ageDays < 0) return { active:false, display:false, ageDays, state:'future' };
  if (ageDays <= ACTIVE_RETENTION_DAYS) return { active:true, display:true, ageDays, state:'active_60d' };
  if (ageDays <= DISPLAY_PURGE_DAYS) return { active:false, display:true, ageDays, state:'inactive_61_90d' };
  return { active:false, display:false, ageDays, state:'expired_over_90d' };
}

function classifyCandidate(candidate, now = new Date()) {
  const text = asText(candidate);
  const locality = hasLocality(candidate);
  const retention = retentionState(candidate?.newsDate, now);

  let topic = TOPICS.GENERAL;
  let priority = PRIORITIES.NORMAL;
  let include = locality;
  let reason = locality ? '地域との具体的接点あり' : '地域との具体的接点を確認できない';

  if (hasAny(text, WRONG_WAY_TERMS) && (hasAny(text, EXPRESSWAY_TERMS) || candidate?.category === 'WRONG_WAY_DRIVING')) {
    topic = TOPICS.TRAFFIC_WRONG_WAY;
    priority = PRIORITIES.HIGH;
    include = locality;
    reason = locality ? '高速道路等の逆走は重大な交通安全事案' : '逆走事案だが地域接点の確認が必要';
  } else if (hasAny(text, CHILD_TERMS)) {
    topic = hasAny(text, ['迷子','行方不明','捜索','保護要請']) ? TOPICS.MISSING_PERSON : TOPICS.CHILD_SAFETY;
    priority = PRIORITIES.HIGH;
    include = locality;
    reason = locality ? '子ども・捜索・保護に関する地域安全情報' : '子ども関連だが地域接点の確認が必要';
  } else if (hasAny(text, PERSON_TERMS)) {
    topic = TOPICS.PERSON_SAFETY;
    priority = PRIORITIES.HIGH;
    include = locality;
    reason = locality ? '対人安全に関する地域事案' : '対人事案だが地域接点の確認が必要';
  } else if (hasAny(text, FRAUD_TERMS)) {
    topic = TOPICS.FRAUD_LOCAL;
    priority = locality ? PRIORITIES.HIGH : PRIORITIES.EXCLUDE;
    include = locality;
    reason = locality ? '地域内の詐欺・特殊詐欺事案' : '地域接点のない詐欺ニュース';
  } else if (hasAny(text, ORGANIZED_PROPERTY_TERMS)) {
    topic = TOPICS.ORGANIZED_LOCAL;
    priority = locality ? PRIORITIES.HIGH : PRIORITIES.EXCLUDE;
    include = locality;
    reason = locality ? '地域拠点・地域内活動の組織犯罪' : '地域接点のない組織犯罪';
  } else if (hasAny(text, MAJOR_TRAFFIC_TERMS)) {
    topic = TOPICS.TRAFFIC_MAJOR;
    priority = PRIORITIES.HIGH;
    include = locality;
    reason = locality ? '交通への重大な影響がある地域安全情報' : '重大交通情報だが地域接点の確認が必要';
  } else if (hasAny(text, IMMIGRATION_TERMS)) {
    topic = TOPICS.IMMIGRATION_LOCAL_ARREST;
    priority = locality ? PRIORITIES.NORMAL : PRIORITIES.EXCLUDE;
    include = locality && candidate?.officialSource === true;
    reason = include ? '地域接点があり一次情報で確認された出入国管理法等の事案' : '地域接点または一次情報確認が不足';
  } else if (hasAny(text, SELF_HARM_TERMS)) {
    topic = TOPICS.SELF_HARM_PUBLIC_IMPACT;
    priority = PRIORITIES.CONDITIONAL;
    include = locality && candidate?.publicSafetyImpact === true;
    reason = include ? '交通・救助・規制等の公共安全上の影響あり' : '自傷関連は公共安全上の影響がある場合のみ';
  } else if (hasAny(text, CUSTOMS_TERMS) && hasAny(text, AIRPORT_PORT_TERMS)) {
    topic = TOPICS.CUSTOMS_LOW_RELEVANCE;
    priority = candidate?.publicSafetyImpact === true && locality ? PRIORITIES.CONDITIONAL : PRIORITIES.EXCLUDE;
    include = candidate?.publicSafetyImpact === true && locality;
    reason = include ? '空港・港湾事案だが地域の公共安全への具体的影響あり' : '一般的な税関・違法物摘発は通常除外';
  } else if (hasAny(text, PUBLIC_SAFETY_TERMS)) {
    topic = TOPICS.PUBLIC_SAFETY;
    priority = PRIORITIES.HIGH;
    include = locality;
    reason = locality ? '避難・規制等に関わる地域公共安全情報' : '公共安全情報だが地域接点の確認が必要';
  }

  if (candidate?.overseasOnly === true && locality === false) {
    topic = TOPICS.OVERSEAS_NO_LOCALITY;
    priority = PRIORITIES.EXCLUDE;
    include = false;
    reason = '海外のみで完結し地域との具体的接点がない';
  }

  if (!retention.active) {
    include = false;
    reason = retention.state === 'inactive_61_90d'
      ? '60日を超えているためactive候補から除外'
      : retention.state === 'expired_over_90d'
      ? '90日を超えているため表示対象外'
      : '日付がactive retention条件を満たさない';
  }

  return Object.freeze({
    include,
    priority,
    topic,
    reason,
    localityConfirmed: locality,
    retention
  });
}

module.exports = {
  ACTIVE_RETENTION_DAYS,
  DISPLAY_PURGE_DAYS,
  PRIORITIES,
  TOPICS,
  retentionState,
  classifyCandidate
};
