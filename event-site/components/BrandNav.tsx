'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {localePath,type Locale} from '@/lib/i18n-config';

export function BrandNav({locale,tagline}:{locale:Locale;tagline:string}){
  const router=useRouter();
  const tapTimes=useRef<number[]>([]);
  const [iconFailed,setIconFailed]=useState(false);

  const secretTap=()=>{
    const now=Date.now();
    tapTimes.current=[...tapTimes.current.filter((time)=>now-time<=5000),now];
    if(tapTimes.current.length>=5){
      tapTimes.current=[];
      router.push('/admin');
    }
  };

  return (
    <div className="brand-shell">
      <button
        type="button"
        className="brand-secret-button"
        onClick={secretTap}
        aria-hidden="true"
        tabIndex={-1}
      >
        <span className="brand-mark brand-icon-wrap" aria-hidden="true">
          {iconFailed
            ? <span className="brand-icon-fallback">ま</span>
            : <img className="brand-icon-image" src="/machiibe-icon.svg" alt="" onError={()=>setIconFailed(true)} />}
        </span>
      </button>
      <Link href={localePath('/',locale)} className="brand brand-copy">
        <span>
          <strong>まちイベ</strong>
          <small>{tagline}</small>
        </span>
      </Link>
    </div>
  );
}
