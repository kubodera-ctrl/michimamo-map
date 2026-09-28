'use client';

import {useState} from 'react';
import type {EventSummary} from '@/lib/types';
import {EventVisualFallback} from './EventVisualFallback';

export function EventMedia({
  event,
  detail=false,
  eager=false
}:{
  event:EventSummary;
  detail?:boolean;
  eager?:boolean;
}){
  const [failed,setFailed]=useState(false);
  if(!event.image_url||failed)return <EventVisualFallback event={event} detail={detail}/>;
  return (
    <img
      className={detail?'detail-image':'event-card-image'}
      src={event.image_url}
      alt={event.title+'のイベント画像'}
      loading={eager?'eager':'lazy'}
      onError={()=>setFailed(true)}
    />
  );
}
