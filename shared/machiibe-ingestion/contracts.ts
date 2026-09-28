export const SOURCE_FETCH_METHODS=[
  'OPEN_DATA','RSS','ICS','JSON_API','JSON_LD','HTML_STRUCTURED','MANUAL'
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
