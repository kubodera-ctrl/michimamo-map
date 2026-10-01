'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {localePath,type Locale} from '@/lib/i18n-config';

export function BrandNav({locale,tagline}:{locale:Locale;tagline:string}){
  const router=useRouter();
  const tapTimes=useRef<number[]>([]);
  const [logoFailed,setLogoFailed]=useState(false);

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
      <Link href={localePath('/',locale)} className="brand brand-copy" aria-label="まちイベ ホーム">
        {logoFailed
          ? (
            <span className="brand-wordmark-fallback" aria-hidden="true">
              <svg viewBox="0 0 76 96" focusable="false">
                <path d="M38 3C19.2 3 4 18.2 4 37c0 25.7 34 56 34 56s34-30.3 34-56C72 18.2 56.8 3 38 3z" fill="#ff2e78"/>
                <circle cx="38" cy="37" r="13" fill="#fff"/>
              </svg>
              <strong><span>まち</span><b>イベ</b></strong>
            </span>
          )
          : <img className="brand-logo-image" src="/machiibe-logo.svg" alt="まちイベ" onError={()=>setLogoFailed(true)} />}
        <small>{tagline}</small>
      </Link>
      <button
        type="button"
        className="brand-secret-button"
        onClick={secretTap}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
