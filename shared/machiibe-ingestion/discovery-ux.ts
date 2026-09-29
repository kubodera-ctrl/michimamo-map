export const DISCOVERY_LANES=[
  'for_you','oshi_new','today','tomorrow','weekend','nearby','ending_soon',
  'free','rainy_day','limited_shop','collab_cafe','character_anime','appearance'
] as const;
export type DiscoveryLane=typeof DISCOVERY_LANES[number];

export type DiscoveryEventFeatures={
  newSinceLastVisit:boolean;
  matchesSavedOshi:boolean;
  startsToday:boolean;
  startsTomorrow:boolean;
  overlapsWeekend:boolean;
  nearby:boolean;
  endingSoon:boolean;
  free:boolean;
  indoor:boolean;
  eventTypes:string[];
  hasAppearance:boolean;
};

export function discoveryLaneMatches(lane:DiscoveryLane,event:DiscoveryEventFeatures){
  if(lane==='for_you')return event.matchesSavedOshi||event.nearby||event.newSinceLastVisit;
  if(lane==='oshi_new')return event.matchesSavedOshi&&event.newSinceLastVisit;
  if(lane==='today')return event.startsToday;
  if(lane==='tomorrow')return event.startsTomorrow;
  if(lane==='weekend')return event.overlapsWeekend;
  if(lane==='nearby')return event.nearby;
  if(lane==='ending_soon')return event.endingSoon;
  if(lane==='free')return event.free;
  if(lane==='rainy_day')return event.indoor;
  if(lane==='limited_shop')return event.eventTypes.includes('limited_shop')||event.eventTypes.includes('popup_store');
  if(lane==='collab_cafe')return event.eventTypes.includes('collab_cafe')||event.eventTypes.includes('collab_food');
  if(lane==='character_anime')return event.matchesSavedOshi;
  return event.hasAppearance;
}
