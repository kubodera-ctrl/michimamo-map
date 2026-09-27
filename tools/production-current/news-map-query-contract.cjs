'use strict';

const SERVICE_ID = 'machimamo';
const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 500;
const MAX_WINDOW_DAYS = 60;
const MAX_MUNICIPALITIES = 25;
const PREFECTURES = Object.freeze([
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県',
  '三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'
]);

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(new Date(value + 'T00:00:00Z').getTime());
}

function daysBetween(from, to) {
  return Math.floor((new Date(to + 'T00:00:00Z') - new Date(from + 'T00:00:00Z')) / 86400000);
}

function validBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') return false;
  const { south, west, north, east } = bounds;
  if (![south,west,north,east].every(Number.isFinite)) return false;
  if (south < -90 || north > 90 || west < -180 || east > 180) return false;
  return south < north && west < east;
}

function normalizeMunicipalities(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()))];
}

function validateNewsMapQuery(query) {
  const errors = [];
  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    return { valid:false, errors:['query must be an object'] };
  }
  if (query.service !== SERVICE_ID) errors.push('service must be machimamo');
  if (!validDate(query.from)) errors.push('from must be YYYY-MM-DD');
  if (!validDate(query.to)) errors.push('to must be YYYY-MM-DD');
  if (validDate(query.from) && validDate(query.to)) {
    const days = daysBetween(query.from, query.to);
    if (days < 0) errors.push('from must be on or before to');
    if (days > MAX_WINDOW_DAYS) errors.push('query window must not exceed 60 days');
  }
  const hasBounds = query.bounds != null;
  const prefecture = typeof query.prefecture === 'string' ? query.prefecture.trim() : '';
  const hasRegion = prefecture.length > 0;
  if (!hasBounds && !hasRegion) errors.push('viewport bounds or prefecture is required');
  if (hasBounds && !validBounds(query.bounds)) errors.push('bounds are invalid');
  if (hasRegion && !PREFECTURES.includes(prefecture)) errors.push('prefecture must be one of the 47 prefectures');

  const municipalities = normalizeMunicipalities(query.municipalities);
  if (municipalities.length > MAX_MUNICIPALITIES) errors.push(`municipalities must contain at most ${MAX_MUNICIPALITIES} values`);
  if (municipalities.length && !hasRegion) errors.push('municipalities require an explicit prefecture scope');

  const limit = query.limit == null ? DEFAULT_LIMIT : query.limit;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) errors.push('limit must be an integer between 1 and 500');
  if (query.cursor != null && (typeof query.cursor !== 'string' || !query.cursor.trim())) errors.push('cursor must be a non-empty opaque string');
  return {
    valid: errors.length === 0,
    errors,
    normalized: errors.length ? null : {
      service:SERVICE_ID,
      from:query.from,
      to:query.to,
      scope:hasBounds ? 'viewport' : 'prefecture',
      bounds:hasBounds ? Object.freeze({...query.bounds}) : null,
      prefecture:hasRegion ? prefecture : null,
      municipalities:Object.freeze(municipalities),
      limit,
      cursor:query.cursor || null,
      sort:'newsDate_desc_candidateId_desc'
    }
  };
}

function publicMapProjection(candidate) {
  const rep = candidate?.mapRepresentative || candidate?.representativeLocation || null;
  if (!candidate || typeof candidate !== 'object' || !rep) return null;
  if (candidate.service && candidate.service !== SERVICE_ID) return null;
  if (candidate.informationKind === 'LEGACY_UNVERIFIED') return null;
  // MAP admission is intionally independent from SNS publishEligible.
  // The domain/API layer must explicitly decide that this candidate may be shown on the public map.
  if (candidate.mapDisplayEligible !== true) return null;
  if (!Number.isFinite(rep.lat) || !Number.isFinite(rep.lon)) return null;
  if (rep.lat < -90 || rep.lat > 90 || rep.lon < -180 || rep.lon > 180) return null;
  if (!['prefecture','municipality','exact_public'].includes(rep.precision)) return null;
  return Object.freeze({
    candidateId:candidate.candidateId,
    informationKind:candidate.informationKind,
    headline:candidate.headline,
    prefecture:candidate.prefecture,
    municipality:candidate.municipality,
    newsDate:candidate.newsDate,
    category:candidate.category || null,
    representativeLocation:{lat:rep.lat,lon:rep.lon,precision:rep.precision},
    // Deliberately omit sourceHash, verifiedFacts, rights evidence, audit and publishing state.
  });
}

function validateMapPage(page, query) {
  const q = validateNewsMapQuery(query);
  const errors = [...q.errors];
  if (!page || typeof page !== 'object' || Array.isArray(page)) return {valid:false,errors:[...errors,'page must be an object']};
  if (!Array.isArray(page.items)) errors.push('items must be an array');
  const items = Array.isArray(page.items) ? page.items : [];
  const limit = q.normalized?.limit || query?.limit || DEFAULT_LIMIT;
  if (items.length > limit) errors.push('page items exceed requested limit');
  const ids = new Set();
  for (const item of items) {
    const projection = publicMapProjection(item);
    if (!projection) errors.push('page contains a non-public-map-eligible item');
    if (item?.candidateId && ids.has(item.candidateId)) errors.push('page contains duplicate candidateId');
    if (item?.candidateId) ids.add(item.candidateId);
  }
  if (page.nextCursor != null && (typeof page.nextCursor !== 'string' || !page.nextCursor.trim())) errors.push('nextCursor must be a non-empty opaque string or null');
  if (typeof page.truncated !== 'boolean') errors.push('truncated must be boolean');
  return {valid:errors.length===0,errors:[...new Set(errors)]};
}

module.exports={
  SERVICE_ID,DEFAULT_LIMIT,MAX_LIMIT,MAX_WINDOW_DAYS,MAX_MUNICIPALITIES,PREFECTURES,
  validateNewsMapQuery,publicMapProjection,validateMapPage
};
