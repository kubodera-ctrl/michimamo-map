'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export function BrandNav(){
  const router=useRouter();
  const tapTimes=useRef<number[]>([]);

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
        <span className="brand-mark brand-icon-wrap">
          <img className="brand-icon-image" src="/machiibe-icon.svg" alt="" />
        </span>
      </button>
      <Link href="/" className="brand brand-copy">
        <span>
          <strong>まちイベ</strong>
          <small>by まちまも｜全国のおでかけを、もっと見つけやすく。</small>
        </span>
      </Link>
    </div>
  );
}
