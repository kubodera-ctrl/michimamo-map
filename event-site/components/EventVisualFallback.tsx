import type {EventSummary,VenueTypeKey} from '@/lib/types';

type Visual={icon:string;label:string;key:string};

function byVenue(venues:VenueTypeKey[]):Visual|null{
  if(venues.includes('park_plaza'))return {icon:'🌳',label:'公園・広場',key:'park'};
  if(venues.includes('mall'))return {icon:'🛍',label:'モール・商業施設',key:'mall'};
  if(venues.includes('hotel'))return {icon:'🏨',label:'ホテル',key:'hotel'};
  if(venues.includes('amusement'))return {icon:'🎡',label:'レジャー',key:'amusement'};
  if(venues.includes('culture_public'))return {icon:'🏛',label:'文化・公共施設',key:'culture'};
  if(venues.includes('event_venue_indoor'))return {icon:'🏢',label:'屋内イベント',key:'indoor'};
  if(venues.includes('event_venue_outdoor'))return {icon:'🎪',label:'屋外イベント',key:'outdoor'};
  return null;
}

export function eventFallbackVisual(event:Pick<EventSummary,'category_keys'|'venue_type_keys'>):Visual{
  const keys=event.category_keys;
  if(keys.includes('festival'))return {icon:'🏮',label:'お祭り',key:'festival'};
  if(keys.includes('fireworks'))return {icon:'🎆',label:'花火',key:'fireworks'};
  if(keys.includes('experience')||keys.some((key)=>key.startsWith('experience_')))return {icon:'✋',label:'体験・ものづくり',key:'experience'};
  if(keys.includes('sports'))return {icon:'⚽',label:'スポーツ',key:'sports'};
  if(keys.includes('music')||keys.includes('entertainment'))return {icon:'✨',label:'エンタメ',key:'entertainment'};
  if(keys.includes('nature'))return {icon:'🌿',label:'自然',key:'nature'};
  if(keys.includes('food'))return {icon:'🍴',label:'グルメ',key:'food'};
  if(keys.includes('market'))return {icon:'🧺',label:'マルシェ',key:'market'};
  if(keys.includes('learning'))return {icon:'🔬',label:'学び',key:'learning'};
  if(keys.includes('art'))return {icon:'🎨',label:'アート・文化',key:'art'};
  if(keys.includes('family'))return {icon:'🎈',label:'親子・子ども',key:'family'};
  return byVenue(event.venue_type_keys)||{icon:'📍',label:'イベント',key:'event'};
}

export function EventVisualFallback({
  event,
  detail=false
}:{
  event:Pick<EventSummary,'title'|'category_keys'|'venue_type_keys'>;
  detail?:boolean;
}){
  const visual=eventFallbackVisual(event);
  return (
    <div
      className={'event-visual-fallback event-visual-'+visual.key+(detail?' detail-image':' event-card-image')}
      role="img"
      aria-label={event.title+'のカテゴリイメージ'}
    >
      <span className="event-visual-kicker">まちイベ CATEGORY VISUAL</span>
      <b aria-hidden="true">{visual.icon}</b>
      <strong>{visual.label}</strong>
      <small>カテゴリイメージ</small>
    </div>
  );
}
