import type {EventSummary,VenueTypeKey} from '@/lib/types';

type Visual={symbol:string;label:string;key:string};

function byVenue(venues:VenueTypeKey[]):Visual|null{
  if(venues.includes('park_plaza'))return {symbol:'公',label:'公園・広場',key:'park'};
  if(venues.includes('mall'))return {symbol:'商',label:'モール・商業施設',key:'mall'};
  if(venues.includes('hotel'))return {symbol:'宿',label:'ホテル',key:'hotel'};
  if(venues.includes('amusement'))return {symbol:'遊',label:'レジャー',key:'amusement'};
  if(venues.includes('culture_public'))return {symbol:'文',label:'文化・公共施設',key:'culture'};
  if(venues.includes('event_venue_indoor'))return {symbol:'室',label:'屋内イベント',key:'indoor'};
  if(venues.includes('event_venue_outdoor'))return {symbol:'外',label:'屋外イベント',key:'outdoor'};
  return null;
}

export function eventFallbackVisual(event:Pick<EventSummary,'category_keys'|'venue_type_keys'>):Visual{
  const keys=event.category_keys;
  if(keys.includes('festival'))return {symbol:'祭',label:'お祭り',key:'festival'};
  if(keys.includes('fireworks'))return {symbol:'花',label:'花火',key:'fireworks'};
  if(keys.includes('experience')||keys.some((key)=>key.startsWith('experience_')))return {symbol:'体',label:'体験・ものづくり',key:'experience'};
  if(keys.includes('sports'))return {symbol:'運',label:'スポーツ',key:'sports'};
  if(keys.includes('music')||keys.includes('entertainment'))return {symbol:'音',label:'エンタメ',key:'entertainment'};
  if(keys.includes('nature'))return {symbol:'自',label:'自然',key:'nature'};
  if(keys.includes('food'))return {symbol:'食',label:'グルメ',key:'food'};
  if(keys.includes('market'))return {symbol:'市',label:'マルシェ',key:'market'};
  if(keys.includes('learning'))return {symbol:'学',label:'学び',key:'learning'};
  if(keys.includes('art'))return {symbol:'芸',label:'アート・文化',key:'art'};
  if(keys.includes('family'))return {symbol:'親',label:'親子・子ども',key:'family'};
  return byVenue(event.venue_type_keys)||{symbol:'イ',label:'イベント',key:'event'};
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
      <span className="event-visual-kicker">まちイベ</span>
      <b className="event-visual-symbol" aria-hidden="true">{visual.symbol}</b>
      <strong>{visual.label}</strong>
      <small>カテゴリイメージ</small>
    </div>
  );
}
