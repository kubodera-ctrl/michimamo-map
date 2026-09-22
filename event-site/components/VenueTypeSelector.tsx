'use client';

import {useState} from 'react';
import {VENUE_TYPE_OPTIONS} from '@/lib/events';
import type {VenueTypeKey} from '@/lib/types';

type Props={
  selected:VenueTypeKey[];
  active:boolean;
};

export function VenueTypeSelector({selected,active}:Props){
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
          <strong>場所タイプ</strong>
          <small>チェックした場所だけ検索結果に表示</small>
        </div>
        <div className="venue-filter-actions">
          <button type="button" onClick={()=>setChecked(all)}>すべて</button>
          <button type="button" onClick={()=>setChecked([])}>全解除</button>
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
            <span>{label}</span>
          </label>
        ))}
      </div>
      {checked.length===0 && <p className="venue-filter-empty">場所タイプが1つも選ばれていません。このまま検索すると0件になります。</p>}
    </div>
  );
}
