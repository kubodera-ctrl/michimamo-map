'use client';

import {useState} from 'react';
import {VENUE_TYPE_OPTIONS} from '@/lib/events';
import type {VenueTypeKey} from '@/lib/types';
import {eventLabels} from '@/lib/event-labels';
import type {Locale} from '@/lib/i18n-config';

type Props={
  selected:VenueTypeKey[];
  active:boolean;
  locale?:Locale;
};

export function VenueTypeSelector({selected,active,locale='ja'}:Props){
  const labels=eventLabels(locale);
  const g=labels.generic;
  const all=VENUE_TYPE_OPTIONS.map(([key])=>key);
  const initial=active ? selected : all;
  const [checked,setChecked]=useState<VenueTypeKey[]>(initial);

  const toggle=(key:VenueTypeKey)=>{
    setChecked((current)=>current.includes(key)?current.filter((item)=>item!==key):[...current,key]);
  };

  return (
    <div className="venue-filter-block">
      <input type="hidden" name="venueFilter" value="1" />
      <div className="venue-filter-head">
        <div>
          <strong>{g.venueType}</strong>
          <small>{g.venueHelp}</small>
        </div>
        <div className="venue-filter-actions">
          <button type="button" onClick={()=>setChecked(all)}>{g.selectAll}</button>
          <button type="button" onClick={()=>setChecked([])}>{g.clearAll}</button>
        </div>
      </div>
      <div className="venue-filter-grid">
        {VENUE_TYPE_OPTIONS.map(([key,label])=>(
          <label className="venue-check-chip" key={key}>
            <input
              type="checkbox"
              name="venue"
              value={key}
              checked={checked.includes(key)}
              onChange={()=>toggle(key)}
            />
            <span>{labels.venue[key] || label}</span>
          </label>
        ))}
      </div>
      {checked.length===0 && <p className="venue-filter-empty">{g.venueEmpty}</p>}
    </div>
  );
}
