'use client';

import {useEffect} from 'react';

const PREFIX='machiibe:scroll:';

export function SearchScrollRestorer({stateKey}:{stateKey:string}){
  useEffect(()=>{
    try{
      const raw=sessionStorage.getItem(PREFIX+stateKey);
      if(!raw)return;
      const parsed=JSON.parse(raw) as {y?:number;at?:number};
      sessionStorage.removeItem(PREFIX+stateKey);
      if(typeof parsed.y!=='number'||typeof parsed.at!=='number')return;
      if(Date.now()-parsed.at>30*60*1000)return;
      requestAnimationFrame(()=>window.scrollTo({top:parsed.y,behavior:'auto'}));
    }catch{}
  },[stateKey]);
  return null;
}

export function rememberSearchScroll(stateKey:string){
  try{
    sessionStorage.setItem(PREFIX+stateKey,JSON.stringify({y:window.scrollY,at:Date.now()}));
  }catch{}
}
