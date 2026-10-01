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
        <span className="brand-lockup" aria-hidden="true">
          {logoFailed
            ? (
              <span className="brand-wordmark-fallback">
                <span className="brand-icon-fallback">★</span>
                <strong className="brand-wordmark">
                  <span className="brand-wordmark-machi">まち</span><span className="brand-wordmark-ibe">イベ</span>
                </strong>
              </span>
            )
            : (
              <>
                <span className="brand-icon-crop">
                  <img className="brand-icon-image" src="/machiibe-icon-approved.png" alt="" onError={()=>setLogoFailed(true)} />
                </span>
                <strong className="brand-wordmark">
                  <span className="brand-wordmark-machi">まち</span><span className="brand-wordmark-ibe">イベ</span>
                </strong>
              </>
            )}
        </span>
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
