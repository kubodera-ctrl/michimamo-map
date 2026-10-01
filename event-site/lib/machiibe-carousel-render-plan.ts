import type {CarouselEventInput,CarouselInput} from './machiibe-production-master';

export type MachiibeRenderPage =
  | {kind:'cover';pageNumber:number;pageCount:number}
  | {kind:'highlights';pageNumber:number;pageCount:number;events:CarouselEventInput[]}
  | {kind:'events';pageNumber:number;pageCount:number;events:CarouselEventInput[]}
  | {kind:'cta';pageNumber:number;pageCount:number};

function selectedEvents(input:CarouselInput){
  return input.events.filter((event)=>event.includedInPost!==false);
}

export function buildMachiibeRenderPages(input:CarouselInput,pageCount:number):MachiibeRenderPage[]{
  const events=selectedEvents(input);
  const middleCount=pageCount-3;
  if(pageCount<5||pageCount>8) throw new Error('CURRENT carousel pageCount must be 5-8');
  if(events.length<3||events.length>10) throw new Error('CURRENT renderer accepts one Part with 3-10 events');
  if(middleCount!==Math.ceil(events.length/2)) throw new Error('pageCount does not match CURRENT event allocation');

  const pages:MachiibeRenderPage[]=[
    {kind:'cover',pageNumber:1,pageCount},
    {kind:'highlights',pageNumber:2,pageCount,events}
  ];
  for(let index=0;index<middleCount;index+=1){
    pages.push({
      kind:'events',
      pageNumber:index+3,
      pageCount,
      events:events.slice(index*2,index*2+2)
    });
  }
  pages.push({kind:'cta',pageNumber:pageCount,pageCount});
  return pages;
}

export function renderPageFileName(input:CarouselInput,pageNumber:number,pageCount:number){
  const raw=[
    'machiibe',
    input.area.prefectureCode||input.area.prefecture,
    input.period.periodStart,
    input.period.periodEnd,
    `p${String(pageNumber).padStart(2,'0')}-of-${String(pageCount).padStart(2,'0')}`
  ].join('_');
  return raw.replace(/[^A-Za-z0-9._-]+/g,'-')+'.png';
}

export function deriveVerifiedHighlightLabels(events:CarouselEventInput[]){
  const labels:string[]=[];
  const modes=new Set(events.map((event)=>event.indoorOutdoor));
  if(modes.has('indoor')) labels.push('屋内');
  if(modes.has('outdoor')) labels.push('屋外');
  if(events.some((event)=>event.priceLabel.trim())) labels.push('料金情報あり');
  if(events.some((event)=>event.reservationLabel.trim())) labels.push('予約情報あり');
  const municipalities=[...new Set(events.map((event)=>event.municipality.trim()).filter(Boolean))];
  labels.push(...municipalities.slice(0,2));
  return labels.slice(0,5);
}
