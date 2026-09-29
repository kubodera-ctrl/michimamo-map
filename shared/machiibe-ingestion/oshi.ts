export const OSHI_ENTITY_TYPES=[
  'work','franchise','character','talent','idol','voice_actor',
  'youtuber','tiktoker','vtuber','influencer','creator','group'
] as const;
export type OshiEntityType=typeof OSHI_ENTITY_TYPES[number];

export const OSHI_EVENT_TYPES=[
  'talk_show','stage_greeting','fan_meeting','live','mini_live','greeting',
  'character_show','popup_store','limited_shop','collab_cafe','collab_food',
  'exhibition','original_art_exhibition','handover','signing','photo_session',
  'workshop','experience'
] as const;
export type OshiEventType=typeof OSHI_EVENT_TYPES[number];

export type OshiEntity={
  id:string;
  type:OshiEntityType;
  canonicalName:string;
  aliases:string[];
  parentEntityIds:string[];
  relatedEntityIds:string[];
  officialUrls:string[];
  active:boolean;
};

export type EventEntityLink={
  eventId:string;
  entityId:string;
  relation:'featured'|'appearing'|'collaboration'|'subject'|'host';
  confidence:'verified'|'needs_review';
  sourceUrl:string;
};

function normalized(value:string){
  return value.normalize('NFKC').toLowerCase()
    .replace(/[\s\u3000・･,，.。!！?？「」『』()（）\[\]【】_\-:：/]+/g,'');
}

export function entityMatchesQuery(entity:OshiEntity,query:string){
  const needle=normalized(query);
  if(!needle)return false;
  return [entity.canonicalName,...entity.aliases].some((value)=>normalized(value).includes(needle));
}

export function classifyOshiEventType(text:string):OshiEventType[]{
  const value=text.normalize('NFKC').toLowerCase();
  const out=new Set<OshiEventType>();
  const add=(type:OshiEventType,patterns:RegExp[])=>{if(patterns.some((p)=>p.test(value)))out.add(type);};
  add('talk_show',[/トークショー|トークイベント|\btalk\b/]);
  add('stage_greeting',[/舞台挨拶/]);
  add('fan_meeting',[/ファンミーティング|ファンミ|fan ?meeting/]);
  add('mini_live',[/ミニライブ|mini ?live/]);
  add('live',[/\blive\b|ライブ/]);
  add('greeting',[/グリーティング|greeting/]);
  add('character_show',[/キャラクターショー|ヒーローショー/]);
  add('popup_store',[/pop ?up|ポップアップ/]);
  add('limited_shop',[/期間限定ショップ|オンリーショップ/]);
  add('collab_cafe',[/コラボカフェ|collab(?:oration)? cafe|gratte/]);
  add('collab_food',[/コラボフード|コラボ飲食/]);
  add('original_art_exhibition',[/原画展/]);
  add('exhibition',[/展覧会|展示会|展覧|ミュージアム/]);
  add('handover',[/お渡し会/]);
  add('signing',[/サイン会/]);
  add('photo_session',[/撮影会|チェキ会|写メ会/]);
  add('workshop',[/ワークショップ|workshop/]);
  add('experience',[/体験イベント|体験会|体験型/]);
  return [...out];
}

export function isEventLikeLimitedRetail(input:{
  limited:boolean;
  destinationPurpose:boolean;
  hasExperienceOrExhibition:boolean;
  ordinarySale:boolean;
}){
  if(input.ordinarySale)return false;
  return input.limited&&(input.destinationPurpose||input.hasExperienceOrExhibition);
}
