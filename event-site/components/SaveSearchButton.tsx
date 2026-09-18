'use client';

import { useState } from 'react';
import { saveCurrentSearch } from '@/lib/client-prefs';

function selectedText(form:HTMLFormElement,name:string) {
  const el=form.elements.namedItem(name);
  if(el instanceof HTMLSelectElement) return el.selectedOptions[0]?.textContent || '';
  if(el instanceof RadioNodeList) return el.value;
  return '';
}

export function SaveSearchButton() {
  const [message,setMessage]=useState('');

  const save=()=>{
    const form=document.querySelector('form.search-panel');
    if(!(form instanceof HTMLFormElement)) return;
    const data=new FormData(form);
    const params=new URLSearchParams();
    for(const [key,value] of data.entries()) {
      const text=String(value).trim();
      if(text) params.set(key,text);
    }
    params.delete('page');
    params.delete('since');
    const pieces=[
      selectedText(form,'prefecture'),
      selectedText(form,'category'),
      selectedText(form,'age'),
      selectedText(form,'price'),
      selectedText(form,'oshi')
    ].filter((v)=>v && !['全国','すべて','指定なし'].includes(v));
    const q=String(data.get('q')||'').trim();
    if(q) pieces.unshift(q);
    const when=String(data.get('when')||'today');
    pieces.unshift(when==='tomorrow'?'明日':when==='weekend'?'今週末':when==='30days'?'30日以内':'今日');
    const label=pieces.slice(0,4).join('・') || '保存した検索';
    const url=params.toString() ? `/?${params.toString()}` : '/';
    saveCurrentSearch(label,url);
    setMessage('保存しました');
    window.setTimeout(()=>setMessage(''),1600);
  };

  return (
    <div className="save-search-wrap">
      <button type="button" className="save-search-button" onClick={save}>☆ この検索条件を保存</button>
      <span className="save-search-message" aria-live="polite">{message}</span>
    </div>
  );
}
