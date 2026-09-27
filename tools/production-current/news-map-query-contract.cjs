'use strict';

const SERVICE_ID = 'machimamo';
const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 500;
const MAX_WINDOW_DAYS = 60;

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
  const hasRegion = typeof query.prefecture === 'string' && query.prefecture.trim().length > 0;
  if (!hasBounds && !hasRegion) errors.push('viewport bounds or prefecture is required');
  if (hasBounds && !validBounds(query.bounds)) errors.push('bounds are invalid');
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
      bounds:hasBounds ? query.bounds : null,
      prefecture:hasRegion ? query.prefecture.trim() : null,
      municipalities:Array.isArray(query.municipalities) ? query.municipalities.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()) : [],
      limit,
      cursor:query.cursor || null
    }
  };
}

function publicMapProjection(candidate) {
  const rep = candidate?.mapRepresentative || candidate?.representativeLocation || null;
  if (!candidate || typeof candidate !== 'object' || !rep) return null;
  if (!Number.isFinite(rep.lat) || !Number.isFinite(rep.lon)) return null;
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

module.exports={
  SERVICE_ID,DEFAULT_LIMIT,MAX_LIMIT,MAX_WINDOW_DAYS,
  validateNewsMapQuery,publicMapProjection
};
