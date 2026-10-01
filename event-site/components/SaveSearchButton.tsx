'use client';

import { useState } from 'react';
import { saveCurrentSearch } from '@/lib/client-prefs';
import {eventLabels} from '@/lib/event-labels';
import {localePath,type Locale} from '@/lib/i18n-config';

function selectedText(form:HTMLFormElement,name:string) {
  const el=form.elements.namedItem(name);
  if(el instanceof HTMLSelectElement) return el.selectedOptions[0]?.textContent || '';
  if(el instanceof RadioNodeList) return el.value;
  return '';
}

const copy:Record<Locale,{button:string;saved:string;fallback:string}>={
  ja:{button:'☆ この検索条件を保存',saved:'保存しました',fallback:'保存した検索'},
  en:{button:'☆ Save these filters',saved:'Saved',fallback:'Saved search'},
  'zh-cn':{button:'☆ 保存此搜索条件',saved:'已保存',fallback:'已保存搜索'},
  'zh-tw':{button:'☆ 儲存此搜尋條件',saved:'已儲存',fallback:'已儲存搜尋'},
  ko:{button:'☆ 이 검색 조건 저장',saved:'저장했습니다',fallback:'저장한 검색'}
};

export function SaveSearchButton({locale='ja'}:{locale?:Locale}) {
  const [message,setMessage]=useState('');
  const labels=eventLabels(locale);
  const g=labels.generic;
  const t=copy[locale] || copy.ja;

  const save=()=>{
    const form=document.querySelector('form.search-panel');
    if(!(form instanceof HTMLFormElement)) return;
    const data=new FormData(form);
    const params=new URLSearchParams();
    for(const [key,value] of data.entries()) {
      const text=String(value).trim();
      if(!text) continue;
      if(key==='venue') params.append(key,text);
      else params.set(key,text);
    }
    params.delete('page');
    params.delete('since');
    const ignored=new Set([g.nationwide,g.all,g.none,'全国','すべて','指定なし']);
    const pieces=[
      selectedText(form,'prefecture'),
      selectedText(form,'category'),
      selectedText(form,'experience'),
      selectedText(form,'age'),
      selectedText(form,'price'),
      selectedText(form,'oshi')
    ].filter((v)=>v && !ignored.has(v));
    const venueLabels=[...form.querySelectorAll<HTMLInputElement>('input[name="venue"]:checked')]
      .map((input)=>input.closest('label')?.textContent?.trim()||'')
      .filter(Boolean);
    const venueTotal=form.querySelectorAll('input[name="venue"]').length;
    if(venueLabels.length>0 && venueLabels.length<venueTotal) pieces.push(venueLabels.slice(0,2).join('・'));
    const q=String(data.get('q')||'').trim();
    const oshiKeyword=String(data.get('oshiKeyword')||'').trim();
    if(oshiKeyword) pieces.unshift(oshiKeyword);
    if(q) pieces.unshift(q);
    const when=String(data.get('when')||'today');
    pieces.unshift(when==='tomorrow'?g.tomorrow:when==='weekend'?g.weekend:when==='30days'?g.within30:g.today);
    const label=pieces.slice(0,4).join('・') || t.fallback;
    const base=localePath('/',locale);
    const url=params.toString() ? `${base}?${params.toString()}` : base;
    saveCurrentSearch(label,url);
    setMessage(t.saved);
    window.setTimeout(()=>setMessage(''),1600);
  };

  return (
    <div className="save-search-wrap">
      <button type="button" className="save-search-button" onClick={save}>{t.button}</button>
      <span className="save-search-message" aria-live="polite">{message}</span>
    </div>
  );
}
