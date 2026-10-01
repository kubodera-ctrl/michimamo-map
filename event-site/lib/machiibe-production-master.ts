export const MACHIIBE_CAROUSEL_MASTER_VERSION='machiibe-carousel-production-master-current-20260927' as const;
export const MACHIIBE_CAROUSEL_TEMPLATE_VERSION='machiibe-carousel-current-20260927' as const;
export const MACHIIBE_ENDCARD_VERSION='machiibe-endcard-current-20260927' as const;

export type MachiibeProductionType='CAROUSEL'|'VIDEO';
export type ProductionQcStatus='pending'|'pass'|'fail';

export type CarouselPartPlan={
  partIndex:number;
  partCount:number;
  eventCount:number;
  pageCount:5|6|7|8;
};

export type CarouselPlan={
  eligible:boolean;
  reason?:'event_count_below_current_master_minimum';
  eventCount:number;
  parts:CarouselPartPlan[];
};

export const MACHIIBE_CAROUSEL_CURRENT={
  productionType:'CAROUSEL' as const,
  width:1080,
  height:1920,
  aspect:'9:16' as const,
  output:'PNG' as const,
  masterVersion:MACHIIBE_CAROUSEL_MASTER_VERSION,
  templateVersion:MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
  endcardVersion:MACHIIBE_ENDCARD_VERSION,
  fixedPages:{
    first:'cover',
    second:'highlights',
    last:'cta'
  },
  pageRules:[
    {minEvents:3,maxEvents:4,pageCount:5},
    {minEvents:5,maxEvents:6,pageCount:6},
    {minEvents:7,maxEvents:8,pageCount:7},
    {minEvents:9,maxEvents:10,pageCount:8}
  ],
  maximumEventsPerPart:10,
  partSplitFrom:11,
  goldenUpdatePolicy:'manual_admin_approval_only' as const,
  factFieldsLocked:[
    'startDate','endDate','startTime','endTime','venueName','venueAddress',
    'municipality','priceLabel','ageLabel','reservationLabel','rainPolicy',
    'officialUrl','isCancelled','isPostponed','isEnded'
  ],
  rights:{
    approvedEventMediaOnly:true,
    blockedStatuses:['unknown','blocked'] as const,
    imageModes:['official','provided','general','ai_general','none'] as const
  },
  publishGate:['facts','rights','visual','golden','pageCount','disclaimer','adminApproval'] as const
};

function pageCountForPart(eventCount:number):5|6|7|8{
  if(eventCount>=3 && eventCount<=4) return 5;
  if(eventCount<=6) return 6;
  if(eventCount<=8) return 7;
  if(eventCount<=10) return 8;
  throw new Error('carousel part must contain 3-10 events');
}

/**
 * CURRENT only defines that 11+ events must be split into Parts.
 * The implementation balances events across Parts so no Part is forced below
 * the CURRENT minimum of 3 events and no Part exceeds 10.
 */
export function planMachiibeCarousel(eventCount:number):CarouselPlan{
  if(!Number.isInteger(eventCount) || eventCount<0) throw new Error('eventCount must be a non-negative integer');
  if(eventCount<3){
    return {eligible:false,reason:'event_count_below_current_master_minimum',eventCount,parts:[]};
  }

  const partCount=Math.ceil(eventCount/MACHIIBE_CAROUSEL_CURRENT.maximumEventsPerPart);
  const base=Math.floor(eventCount/partCount);
  const remainder=eventCount%partCount;
  const counts=Array.from({length:partCount},(_,index)=>base+(index<remainder?1:0));

  if(counts.some((count)=>count<3 || count>10)) throw new Error('unable to split event count safely');

  return {
    eligible:true,
    eventCount,
    parts:counts.map((count,index)=>({
      partIndex:index+1,
      partCount,
      eventCount:count,
      pageCount:pageCountForPart(count)
    }))
  };
}

export type CarouselEventInput={
  eventId:string;
  title:string;
  venueName:string;
  municipality:string;
  startDate:string;
  endDate?:string|null;
  startTime?:string|null;
  endTime?:string|null;
  priceLabel:string;
  ageLabel?:string|null;
  reservationLabel:string;
  indoorOutdoor:'indoor'|'outdoor'|'mixed'|'unknown';
  rainPolicy?:string|null;
  officialUrl:string;
  sourceName:string;
  sourceCheckedAt:string;
  mediaUrl?:string|null;
  mediaRightsStatus:'approved'|'unknown'|'blocked';
  imageMode:'official'|'provided'|'general'|'ai_general'|'none';
  imageDisclaimer?:string|null;
  isCancelled:boolean;
  isPostponed:boolean;
  isEnded:boolean;
  verified:boolean;
  includedInPost?:boolean;
};

export type CarouselInput={
  period:{
    periodType:'weekly'|'holiday'|'seasonal'|'custom';
    periodLabel:string;
    periodStart:string;
    periodEnd:string;
    holidayCampaignId?:string|null;
  };
  area:{
    prefecture:string;
    prefectureCode:string;
    municipalityName?:string|null;
    municipalityCode?:string|null;
    areaGroupName?:string|null;
    areaGroupId?:string|null;
  };
  events:CarouselEventInput[];
  production:{
    productionMasterVersion:string;
    templateVersion:string;
    endcardVersion?:string;
    requestedBy?:string|null;
    sourceHash?:string|null;
    forceRegenerate?:boolean;
  };
};

export type CarouselInputValidation={
  ok:boolean;
  errors:string[];
  selectedEventCount:number;
  plan:CarouselPlan;
};

const isoDate=/^\d{4}-\d{2}-\d{2}$/;
const isoDateTime=/^\d{4}-\d{2}-\d{2}T/;
const httpUrl=/^https?:\/\//i;

export function validateMachiibeCarouselInput(input:CarouselInput):CarouselInputValidation{
  const errors:string[]=[];
  const selected=input.events.filter((event)=>event.includedInPost!==false);

  if(input.production.productionMasterVersion!==MACHIIBE_CAROUSEL_MASTER_VERSION) errors.push('productionMasterVersion is not CURRENT');
  if(input.production.templateVersion!==MACHIIBE_CAROUSEL_TEMPLATE_VERSION) errors.push('templateVersion is not CURRENT');
  if(input.production.endcardVersion && input.production.endcardVersion!==MACHIIBE_ENDCARD_VERSION) errors.push('endcardVersion is not CURRENT');
  if(!input.period.periodLabel.trim()) errors.push('periodLabel is required');
  if(!isoDate.test(input.period.periodStart) || !isoDate.test(input.period.periodEnd) || input.period.periodEnd<input.period.periodStart) errors.push('period range is invalid');
  if(!input.area.prefecture.trim() || !input.area.prefectureCode.trim()) errors.push('prefecture is required');

  for(const event of selected){
    const prefix=`event:${event.eventId || 'unknown'}`;
    if(!event.eventId.trim() || !event.title.trim() || !event.venueName.trim() || !event.municipality.trim()) errors.push(`${prefix}: required fact missing`);
    if(!isoDate.test(event.startDate) || (event.endDate && (!isoDate.test(event.endDate) || event.endDate<event.startDate))) errors.push(`${prefix}: date invalid`);
    if(!event.priceLabel.trim() || !event.reservationLabel.trim()) errors.push(`${prefix}: price/reservation label required`);
    if(!httpUrl.test(event.officialUrl)) errors.push(`${prefix}: officialUrl invalid`);
    if(!event.sourceName.trim() || !isoDateTime.test(event.sourceCheckedAt)) errors.push(`${prefix}: source verification missing`);
    if(!event.verified) errors.push(`${prefix}: facts are not verified`);
    if(event.isCancelled || event.isPostponed || event.isEnded) errors.push(`${prefix}: event is not publishable`);

    const usesEventMedia=event.imageMode==='official' || event.imageMode==='provided';
    if(usesEventMedia && event.mediaRightsStatus!=='approved') errors.push(`${prefix}: event media rights are not approved`);
    if(event.mediaRightsStatus==='blocked') errors.push(`${prefix}: blocked media cannot be used`);
    if(event.mediaUrl && event.mediaRightsStatus!=='approved' && event.imageMode!=='general' && event.imageMode!=='ai_general') {
      errors.push(`${prefix}: unapproved mediaUrl cannot be used`);
    }
    if((event.imageMode==='general'||event.imageMode==='ai_general') && !event.imageDisclaimer?.trim()) {
      errors.push(`${prefix}: general/AI image requires disclaimer`);
    }
  }

  const plan=planMachiibeCarousel(selected.length);
  if(!plan.eligible) errors.push('CURRENT carousel requires at least 3 selected events');

  return {ok:errors.length===0,errors,selectedEventCount:selected.length,plan};
}

export function isPublishEligible(qc:{
  facts:ProductionQcStatus;
  rights:ProductionQcStatus;
  visual:ProductionQcStatus;
  golden:ProductionQcStatus;
  pageCount:ProductionQcStatus;
  disclaimer:ProductionQcStatus;
  adminApproval:boolean;
}){
  return qc.facts==='pass'
    && qc.rights==='pass'
    && qc.visual==='pass'
    && qc.golden==='pass'
    && qc.pageCount==='pass'
    && qc.disclaimer==='pass'
    && qc.adminApproval;
}

export const MACHIIBE_VIDEO_CURRENT={
  productionType:'VIDEO' as const,
  active:false,
  reason:'No Machiibe VIDEO CURRENT master was found in the formal Drive source as of 2026-09-27. Do not substitute the Machimamo news-video master.'
};
