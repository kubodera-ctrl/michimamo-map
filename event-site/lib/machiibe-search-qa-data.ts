import type {EventDetail,EventSearchInput,PriceType,VenueTypeKey} from './types';
import {QA_VERIFIED_SEED_SNAPSHOTS} from './machiibe-search-qa-seed.generated';

export type QaEvent=EventDetail&{
  fixtureOnly:true;
  qaKind:'verified_ci'|'synthetic';
  qaNote:string;
};

const dayMs=86400000;
function addDays(value:string,days:number){
  const parts=value.split('-').map(Number);
  const date=new Date(Date.UTC(parts[0],parts[1]-1,parts[2]+days,12));
  return date.toISOString().slice(0,10);
}
function duration(start:string,end:string){
  return Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/dayMs)+1;
}
function makeEvent(input:Partial<QaEvent>&Pick<QaEvent,'id'|'slug'|'title'|'start_date'|'end_date'|'prefecture'|'municipality'|'official_url'|'source_name'|'source_url'|'qaKind'|'qaNote'>):QaEvent{
  const now='2026-09-28T09:00:00+09:00';
  const base:QaEvent={
    id:input.id,slug:input.slug,title:input.title,summary:null,
    start_date:input.start_date,end_date:input.end_date,duration_days:duration(input.start_date,input.end_date),
    start_time:null,end_time:null,all_day:true,schedule_type:'continuous',event_status:'scheduled',status_note:null,
    venue_name:null,prefecture:input.prefecture,municipality:input.municipality,address:null,venue_type_keys:['other'],
    latitude:null,longitude:null,location_precision:'unknown',location_verified:false,
    price_text:null,price_type:'unknown',is_free:null,reservation_required:null,organizer_name:null,
    official_url:input.official_url,category_keys:[],age_group_keys:[],indoor:null,audience_intent:'general',
    fandom_slugs:[],accessibility_keys:[],accessibility_notes:null,image_url:null,image_role:null,image_attribution:null,image_license_url:null,
    source_name:input.source_name,source_url:input.source_url,source_updated_at:null,last_verified_at:now,
    created_at:now,updated_at:now,timezone:'Asia/Tokyo',postal_code:null,status_updated_at:null,
    occurrences:[],place_external_id:null,reservation_text:null,ticket_url:null,image_source_url:null,image_license:null,
    fetched_at:now,fixtureOnly:true,qaKind:input.qaKind,qaNote:input.qaNote
  };
  return {...base,...input,duration_days:duration(input.start_date,input.end_date),fixtureOnly:true};
}

export function buildQaEvents(anchor:string):QaEvent[]{
  const verified:QaEvent[]=QA_VERIFIED_SEED_SNAPSHOTS.map((snapshot)=>makeEvent({
    ...snapshot,
    venue_type_keys:[...snapshot.venue_type_keys] as VenueTypeKey[],
    category_keys:[...snapshot.category_keys],
    age_group_keys:[...snapshot.age_group_keys],
    accessibility_keys:[...snapshot.accessibility_keys],
    fandom_slugs:[...snapshot.fandom_slugs],
    qaKind:'verified_ci',
    qaNote:'verified production seed factual snapshot / fixtureOnly=true / image not used'
  }));

  const synthetic:QaEvent[]=[
    makeEvent({
      id:91001,slug:'qa-synthetic-today-free-park',title:'QA 今日・無料・公園 親子体験',
      start_date:anchor,end_date:anchor,prefecture:'東京都',municipality:'港区',venue_name:'QA公園・広場',
      venue_type_keys:['park_plaza','event_venue_outdoor'],price_text:'QA: 完全無料',price_type:'free',is_free:true,
      category_keys:['family','experience','experience_outdoor'],age_group_keys:['preschool','elementary','family'],
      indoor:false,audience_intent:'child_centered',summary:'検索UXの「今日・無料・子ども主役・公園」を確認するsynthetic fixture。',
      official_url:'https://example.test/qa/today-free-park',source_name:'Synthetic QA Fixture',source_url:'https://example.test/qa/today-free-park',
      qaKind:'synthetic',qaNote:'fixtureOnly=true / Production・SNS・SEO・ASP対象外'
    }),
    makeEvent({
      id:91002,slug:'qa-synthetic-tomorrow-mall-rain',title:'QA 明日・雨の日・モール ワークショップ',
      start_date:addDays(anchor,1),end_date:addDays(anchor,1),prefecture:'東京都',municipality:'江東区',venue_name:'QAモール',
      venue_type_keys:['mall','event_venue_indoor'],price_text:'QA: 一部体験有料',price_type:'partly_free',
      category_keys:['family','experience','experience_craft'],age_group_keys:['preschool','elementary','family'],
      indoor:true,audience_intent:'family_friendly',summary:'雨の日・屋内・ファミリー検索のsynthetic fixture。',
      official_url:'https://example.test/qa/tomorrow-mall',source_name:'Synthetic QA Fixture',source_url:'https://example.test/qa/tomorrow-mall',
      qaKind:'synthetic',qaNote:'fixtureOnly=true / Production・SNS・SEO・ASP対象外'
    }),
    makeEvent({
      id:91003,slug:'qa-synthetic-weekend-hotel',title:'QA ホテル内 ファミリー科学体験',
      start_date:addDays(anchor,4),end_date:addDays(anchor,6),prefecture:'千葉県',municipality:'浦安市',venue_name:'QAホテル',
      venue_type_keys:['hotel','event_venue_indoor'],price_text:'QA: 有料',price_type:'paid',
      category_keys:['learning','experience','experience_science'],age_group_keys:['elementary','family'],indoor:true,audience_intent:'family_friendly',
      accessibility_keys:['wheelchair','accessible_toilet'],accessibility_notes:'QA用の配慮情報。',
      official_url:'https://example.test/qa/hotel',source_name:'Synthetic QA Fixture',source_url:'https://example.test/qa/hotel',
      qaKind:'synthetic',qaNote:'fixtureOnly=true / hotel・accessibility coverage'
    }),
    makeEvent({
      id:91004,slug:'qa-synthetic-5-10-amusement',title:'QA 7日間 アミューズメント体験',
      start_date:addDays(anchor,2),end_date:addDays(anchor,8),prefecture:'埼玉県',municipality:'さいたま市',venue_name:'QAアミューズメント',
      venue_type_keys:['amusement'],price_type:'unknown',category_keys:['entertainment','experience','experience_sports'],
      age_group_keys:['teen','family'],indoor:true,audience_intent:'general',
      official_url:'https://example.test/qa/amusement',source_name:'Synthetic QA Fixture',source_url:'https://example.test/qa/amusement',
      qaKind:'synthetic',qaNote:'fixtureOnly=true / 5〜10日・料金不明 coverage'
    }),
    makeEvent({
      id:91005,slug:'qa-synthetic-long-other',title:'QA 長期開催 その他会場マーケット',
      start_date:addDays(anchor,3),end_date:addDays(anchor,33),prefecture:'東京都',municipality:'渋谷区',venue_name:'QAその他会場',
      venue_type_keys:['other'],price_type:'free',is_free:true,category_keys:['market','food'],indoor:null,audience_intent:'general',
      official_url:'https://example.test/qa/long',source_name:'Synthetic QA Fixture',source_url:'https://example.test/qa/long',
      qaKind:'synthetic',qaNote:'fixtureOnly=true / 31日以上・other coverage'
    }),
    makeEvent({
      id:91006,slug:'qa-synthetic-outdoor-event',title:'QA 屋外イベント会場 フェス',
      start_date:addDays(anchor,5),end_date:addDays(anchor,6),prefecture:'神奈川県',municipality:'横浜市',venue_name:'QA屋外イベント会場',
      venue_type_keys:['event_venue_outdoor'],price_type:'paid',category_keys:['festival'],indoor:false,audience_intent:'family_friendly',
      official_url:'https://example.test/qa/outdoor',source_name:'Synthetic QA Fixture',source_url:'https://example.test/qa/outdoor',
      qaKind:'synthetic',qaNote:'fixtureOnly=true / outdoor venue coverage'
    }),
    makeEvent({
      id:91007,slug:'qa-synthetic-indoor-event',title:'QA 屋内イベント会場 宝石・鉱物体験',
      start_date:addDays(anchor,2),end_date:addDays(anchor,4),prefecture:'東京都',municipality:'新宿区',venue_name:'QA屋内イベントホール',
      venue_type_keys:['event_venue_indoor'],price_type:'paid',category_keys:['experience','experience_gem','learning'],
      age_group_keys:['elementary','family'],indoor:true,audience_intent:'child_centered',
      accessibility_keys:['wheelchair'],official_url:'https://example.test/qa/gem',source_name:'Synthetic QA Fixture',source_url:'https://example.test/qa/gem',
      qaKind:'synthetic',qaNote:'fixtureOnly=true / experience_gem coverage'
    }),
    makeEvent({
      id:91008,slug:'qa-synthetic-adult-exclude',title:'QA 大人向け除外確認イベント',
      start_date:anchor,end_date:addDays(anchor,2),prefecture:'東京都',municipality:'中央区',venue_name:'QA会場',
      venue_type_keys:['event_venue_indoor'],price_type:'paid',category_keys:['food'],indoor:true,audience_intent:'adult_oriented',
      official_url:'https://example.test/qa/adult',source_name:'Synthetic QA Fixture',source_url:'https://example.test/qa/adult',
      qaKind:'synthetic',qaNote:'fixtureOnly=true / excludeAdult QA'
    })
  ];
  return verified.concat(synthetic);
}

export type QaSearchInput=Pick<EventSearchInput,
  'startDate'|'endDate'|'prefecture'|'keyword'|'excludeTerms'|'categories'|'ageGroups'|'durationBuckets'|
  'accessibilityOnly'|'accessibilityKeys'|'audienceIntents'|'fandomSlugs'|'fandomKeyword'|'priceTypes'|'excludeAdultOriented'|'indoorOnly'|
  'venueTypes'|'venueFilterActive'|'sort'
>&{municipality?:string};

function dateMatches(item:QaEvent,start:string,end:string){
  if(item.schedule_type==='irregular'||item.schedule_type==='recurring'){
    return item.occurrences.some((row)=>row.status==='scheduled'&&row.date>=start&&row.date<=end);
  }
  return item.start_date<=end&&item.end_date>=start;
}
function durationMatches(days:number,buckets:string[]|undefined){
  if(!buckets||!buckets.length)return true;
  return buckets.some((key)=>key==='single'?days===1:key==='2_4'?days>=2&&days<=4:key==='5_10'?days>=5&&days<=10:key==='11_30'?days>=11&&days<=30:key==='31_plus'?days>=31:false);
}
export function searchQaEvents(events:QaEvent[],input:QaSearchInput){
  const keyword=(input.keyword||'').trim().toLowerCase();
  const excluded=(input.excludeTerms||[]).map((v)=>v.trim().toLowerCase()).filter(Boolean);
  let rows=events.filter((item)=>{
    if(!dateMatches(item,input.startDate,input.endDate))return false;
    if(input.prefecture&&item.prefecture!==input.prefecture)return false;
    if(input.municipality&&!(item.municipality||'').includes(input.municipality))return false;
    const hay=[item.title,item.summary,item.venue_name,item.municipality,item.organizer_name,item.price_text,...item.fandom_slugs].filter(Boolean).join(' ').toLowerCase();
    if(keyword&&!hay.includes(keyword))return false;
    if(excluded.some((term)=>hay.includes(term)))return false;
    if(input.categories&&input.categories.length&&!item.category_keys.some((key)=>input.categories!.includes(key)))return false;
    if(input.ageGroups&&input.ageGroups.length&&!item.age_group_keys.some((key)=>input.ageGroups!.includes(key)))return false;
    if(!durationMatches(item.duration_days,input.durationBuckets))return false;
    if(input.accessibilityOnly&&!item.accessibility_keys.length)return false;
    if(input.accessibilityKeys&&input.accessibilityKeys.length&&!input.accessibilityKeys.every((key)=>item.accessibility_keys.includes(key)))return false;
    if(input.audienceIntents&&input.audienceIntents.length&&!input.audienceIntents.includes(item.audience_intent))return false;
    if(input.fandomSlugs&&input.fandomSlugs.length&&!item.fandom_slugs.some((slug)=>input.fandomSlugs!.includes(slug)))return false;
    if(input.fandomKeyword&& !hay.includes(input.fandomKeyword.trim().toLowerCase()))return false;
    if(input.priceTypes&&input.priceTypes.length&&!input.priceTypes.includes(item.price_type as PriceType))return false;
    if(input.excludeAdultOriented&&item.audience_intent==='adult_oriented')return false;
    if(input.indoorOnly&&item.indoor!==true)return false;
    if(input.venueFilterActive){
      if(!input.venueTypes||!input.venueTypes.length)return false;
      if(!item.venue_type_keys.some((key)=>input.venueTypes!.includes(key as VenueTypeKey)))return false;
    }
    return true;
  });
  if(input.sort==='start_date')rows=rows.slice().sort((a,b)=>a.start_date.localeCompare(b.start_date)||a.title.localeCompare(b.title));
  else if(input.sort==='short_first')rows=rows.slice().sort((a,b)=>a.duration_days-b.duration_days||a.start_date.localeCompare(b.start_date));
  else if(input.sort==='newest')rows=rows.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at));
  else rows=rows.slice().sort((a,b)=>a.start_date.localeCompare(b.start_date)||a.title.localeCompare(b.title));
  return rows;
}

export function qaEventBySlug(events:QaEvent[],slug:string){
  return events.find((item)=>item.slug===slug)||null;
}
