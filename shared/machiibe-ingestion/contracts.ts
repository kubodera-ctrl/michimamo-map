export const SOURCE_FETCH_METHODS=[
  'OPEN_DATA','RSS','ICS','JSON_API','JSON_LD','HTML_STRUCTURED','MANUAL','PARTNER'
] as const;
export type SourceFetchMethod=typeof SOURCE_FETCH_METHODS[number];

export type SourcePolicySnapshot={
  sourceId:number;
  sourceName:string;
  sourceType:string;
  prefecture:string|null;
  municipality:string|null;
  baseUrl:string;
  feedUrl:string|null;
  fetchMethod:SourceFetchMethod;
  termsStatus:'pending'|'reviewed_facts_only'|'reviewed_allowed'|'reviewed_restricted'|'contact_required';
  robotsStatus:'pending'|'allowed'|'disallowed'|'not_applicable';
  commercialUseStatus:'unknown'|'allowed'|'conditional'|'disallowed';
  attributionRequirement:string|null;
  updateFrequencyMinutes:number;
  lastCheckedAt:string|null;
  lastSuccessAt:string|null;
  failureCount:number;
  active:boolean;
  priority:number;
  automatedFetchAllowed:boolean;
  etag:string|null;
  lastModified:string|null;
};

export type ConditionalFetchState={
  etag?:string|null;
  lastModified?:string|null;
};

export type FetchPlan={
  sourceId:number;
  url:string;
  method:'GET';
  headers:Record<string,string>;
  dryRun:boolean;
};

export type RawSourceItem={
  sourceId:number;
  sourceEventId:string|null;
  sourceUrl:string;
  sourceUpdatedAt:string|null;
  sourceHash:string;
  payload:unknown;
};

export type NormalizedEventCandidate={
  sourceId:number;
  sourceEventId:string|null;
  sourceUrl:string;
  sourceUpdatedAt:string|null;
  sourceHash:string;
  title:string|null;
  description:string|null;
  startAt:string|null;
  endAt:string|null;
  timezone:string;
  prefecture:string|null;
  municipality:string|null;
  address:string|null;
  lat:number|null;
  lng:number|null;
  venueName:string|null;
  venueType:string|null;
  category:string|null;
  tags:string[];
  ageMin:number|null;
  ageMax:number|null;
  family:boolean|null;
  childFocused:boolean|null;
  indoor:boolean|null;
  rainOk:boolean|null;
  accessibility:string[];
  priceType:'free'|'partly_free'|'paid'|'unknown';
  priceMin:number|null;
  priceMax:number|null;
  imageUrl:string|null;
  imageRightsStatus:'unknown'|'display_only'|'cache_allowed'|'sns_allowed'|'commercial_allowed'|'blocked';
  officialUrl:string|null;
  verifiedAt:string|null;
  expiresAt:string|null;
  status:'candidate'|'verified'|'changed'|'postponed'|'cancelled'|'expired'|'needs_review';
};

export type DuplicateSignals={
  sourceEventId:boolean;
  officialUrl:boolean;
  normalizedTitle:number;
  venue:number;
  timeOverlap:number;
  municipality:boolean;
  distanceMeters:number|null;
  organizer:number;
};

export interface SourceAdapter{
  readonly method:SourceFetchMethod;
  planFetch(source:SourcePolicySnapshot,state:ConditionalFetchState,dryRun:boolean):FetchPlan;
  extract(responseBody:unknown,source:SourcePolicySnapshot):RawSourceItem[];
  normalize(item:RawSourceItem,source:SourcePolicySnapshot):NormalizedEventCandidate;
}

export function sourceAutomationAllowed(source:SourcePolicySnapshot){
  return source.active
    && source.automatedFetchAllowed
    && source.termsStatus==='reviewed_allowed'
    && source.robotsStatus!=='disallowed'
    && source.commercialUseStatus!=='disallowed'
    && source.fetchMethod!=='MANUAL';
}

export function conditionalHeaders(state:ConditionalFetchState){
  const headers:Record<string,string>={accept:'*/*'};
  if(state.etag)headers['if-none-match']=state.etag;
  if(state.lastModified)headers['if-modified-since']=state.lastModified;
  return headers;
}

export function validateNormalizedCandidate(candidate:NormalizedEventCandidate){
  const errors:string[]=[];
  if(!candidate.title)errors.push('title_missing');
  if(!candidate.sourceUrl.startsWith('https://'))errors.push('source_url_invalid');
  if(candidate.startAt&&candidate.endAt&&candidate.endAt<candidate.startAt)errors.push('date_range_invalid');
  if((candidate.lat===null)!==(candidate.lng===null))errors.push('partial_coordinate');
  if(candidate.lat!==null&&(candidate.lat<-90||candidate.lat>90))errors.push('latitude_invalid');
  if(candidate.lng!==null&&(candidate.lng<-180||candidate.lng>180))errors.push('longitude_invalid');
  if(candidate.imageRightsStatus==='unknown'&&candidate.imageUrl)errors.push('image_rights_unverified');
  return {ok:errors.length===0,errors};
}

export function duplicateReviewRequired(score:number){
  return !Number.isFinite(score)||score<0||score>1||score<0.97;
}


export type ImageRightsContract={
  displayAllowed:boolean|null;
  cacheAllowed:boolean|null;
  commercialAllowed:boolean|null;
  snsAllowed:boolean|null;
  attributionRequired:boolean|null;
  attributionText:string|null;
  rightsSourceUrl:string|null;
  reviewedAt:string|null;
};

export type MediaCandidate={
  id:string;
  subjectType:'event'|'venue'|'category'|'generic';
  role:'event_official'|'venue_official'|'place_photo'|'category_visual'|'generic_fallback';
  url:string|null;
  rights:ImageRightsContract;
  machiibeOwned:boolean;
};

export function canDisplayMedia(candidate:MediaCandidate){
  return candidate.machiibeOwned || candidate.rights.displayAllowed===true;
}
export function canCacheMedia(candidate:MediaCandidate){
  return candidate.machiibeOwned || candidate.rights.cacheAllowed===true;
}
export function canUseMediaForSns(candidate:MediaCandidate){
  return candidate.machiibeOwned || (
    candidate.rights.displayAllowed===true
    && candidate.rights.snsAllowed===true
    && candidate.rights.commercialAllowed===true
  );
}

const MEDIA_ROLE_ORDER:Record<MediaCandidate['role'],number>={
  event_official:1,
  venue_official:2,
  place_photo:3,
  category_visual:4,
  generic_fallback:5
};

export function selectDisplayMedia(candidates:MediaCandidate[]){
  return candidates
    .filter(canDisplayMedia)
    .slice()
    .sort((a,b)=>MEDIA_ROLE_ORDER[a.role]-MEDIA_ROLE_ORDER[b.role])[0]||null;
}

function normalized(value:string|null|undefined){
  return (value||'').normalize('NFKC').toLowerCase().replace(/[\s\u3000・･,，.。!！?？「」『』()（）\[\]【】_-]+/g,'');
}
function similarity(a:string|null|undefined,b:string|null|undefined){
  const left=normalized(a),right=normalized(b);
  if(!left||!right)return 0;
  if(left===right)return 1;
  const grams=(value:string)=>{
    const out=new Set<string>();
    if(value.length<2){out.add(value);return out;}
    for(let i=0;i<value.length-1;i++)out.add(value.slice(i,i+2));
    return out;
  };
  const x=grams(left),y=grams(right);
  let intersection=0;
  for(const item of x)if(y.has(item))intersection++;
  return (2*intersection)/(x.size+y.size);
}

export type DedupeComparable={
  sourceEventId:string|null;
  officialUrl:string|null;
  title:string|null;
  startAt:string|null;
  endAt:string|null;
  venueName:string|null;
  municipality:string|null;
  lat:number|null;
  lng:number|null;
  organizer:string|null;
};

function distanceMeters(a:DedupeComparable,b:DedupeComparable){
  if(a.lat===null||a.lng===null||b.lat===null||b.lng===null)return null;
  const rad=Math.PI/180;
  const lat1=a.lat*rad,lat2=b.lat*rad,dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

export function duplicateSignals(a:DedupeComparable,b:DedupeComparable):DuplicateSignals{
  const distance=distanceMeters(a,b);
  const overlap=Boolean(a.startAt&&b.startAt&&a.endAt&&b.endAt&&a.startAt<=b.endAt&&b.startAt<=a.endAt);
  return {
    sourceEventId:Boolean(a.sourceEventId&&b.sourceEventId&&a.sourceEventId===b.sourceEventId),
    officialUrl:Boolean(a.officialUrl&&b.officialUrl&&a.officialUrl===b.officialUrl),
    normalizedTitle:similarity(a.title,b.title),
    venue:similarity(a.venueName,b.venueName),
    timeOverlap:overlap?1:0,
    municipality:Boolean(a.municipality&&b.municipality&&a.municipality===b.municipality),
    distanceMeters:distance,
    organizer:similarity(a.organizer,b.organizer)
  };
}

export function duplicateConfidence(signals:DuplicateSignals){
  if(signals.sourceEventId&&signals.officialUrl)return 1;
  if(signals.officialUrl&&signals.normalizedTitle>=.8)return .995;
  let score=0;
  score+=signals.normalizedTitle*.38;
  score+=signals.venue*.16;
  score+=signals.timeOverlap*.18;
  score+=signals.municipality?.10:0;
  score+=signals.organizer*.08;
  if(signals.distanceMeters!==null)score+=signals.distanceMeters<=100?.10:signals.distanceMeters<=500?.05:0;
  return Math.min(.99,Number(score.toFixed(4)));
}

export type ChangeComparable={
  sourceHash:string;
  title:string|null;
  startAt:string|null;
  endAt:string|null;
  venueName:string|null;
  priceType:string|null;
  priceMin:number|null;
  priceMax:number|null;
  status:string;
};

export function detectEventChanges(before:ChangeComparable,after:ChangeComparable){
  if(before.sourceHash===after.sourceHash)return {changed:false,kinds:[] as string[],fields:[] as string[]};
  const fields:string[]=[];
  for(const key of ['title','startAt','endAt','venueName','priceType','priceMin','priceMax','status'] as const){
    if(before[key]!==after[key])fields.push(key);
  }
  const kinds:string[]=[];
  if(before.startAt!==after.startAt||before.endAt!==after.endAt)kinds.push('date_changed');
  if(before.venueName!==after.venueName)kinds.push('venue_changed');
  if(before.priceType!==after.priceType||before.priceMin!==after.priceMin||before.priceMax!==after.priceMax)kinds.push('price_changed');
  if(after.status==='cancelled'&&before.status!=='cancelled')kinds.push('cancelled');
  else if(after.status==='postponed'&&before.status!=='postponed')kinds.push('postponed');
  else if(after.status==='expired'&&before.status!=='expired')kinds.push('expired');
  if(fields.length&&!kinds.length)kinds.push('content_changed');
  return {changed:fields.length>0,kinds,fields};
}
