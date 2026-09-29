'use client';

import {useState} from 'react';
import type {EventSummary} from '@/lib/types';
import {EventVisualFallback} from './EventVisualFallback';

function roleLabel(role:EventSummary['image_role']){
  if(role==='venue_official')return '会場イメージ';
  if(role==='place_photo')return '場所イメージ';
  return null;
}

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
  const visualLabel=roleLabel(event.image_role);

  return (
    <figure className={'event-media-shell'+(detail?' event-media-detail':'')}>
      <img
        className={detail?'detail-image':'event-card-image'}
        src={event.image_url}
        alt={event.title+(visualLabel?'の'+visualLabel:'のイベント画像')}
        loading={eager?'eager':'lazy'}
        onError={()=>setFailed(true)}
      />
      {visualLabel&&<span className="event-media-role">{visualLabel}</span>}
      {detail&&(event.image_attribution||event.image_license)&&(
        <figcaption className="event-media-credit">
          {event.image_source_url
            ? <a href={event.image_source_url} target="_blank" rel="noreferrer">{event.image_attribution||'画像出典'}</a>
            : <span>{event.image_attribution||'画像出典'}</span>}
          {event.image_license&&(
            event.image_license_url
              ? <a href={event.image_license_url} target="_blank" rel="noreferrer">{event.image_license}</a>
              : <span>{event.image_license}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
