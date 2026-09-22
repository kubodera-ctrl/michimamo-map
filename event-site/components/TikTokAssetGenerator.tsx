'use client';

import { useEffect, useRef, useState } from 'react';
import {MACHIIBE_SOCIAL_MASTER} from '@/lib/machiibe-social-master';

type Props={
  slug:string;
  title:string;
  location:string;
  dateText:string;
  timeText:string;
  venueName:string;
  tags:string[];
  caption:string;
};

function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  const radius=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+radius,y);
  ctx.arcTo(x+w,y,x+w,y+h,radius);
  ctx.arcTo(x+w,y+h,x,y+h,radius);
  ctx.arcTo(x,y+h,x,y,radius);
  ctx.arcTo(x,y,x+w,y,radius);
  ctx.closePath();
}

function wrapLines(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,maxLines:number){
  const chars=Array.from(text);
  const lines:string[]=[];
  let current='';
  let index=0;

  while(index<chars.length && lines.length<maxLines){
    const char=chars[index];
    const next=current+char;
    if(!current || ctx.measureText(next).width<=maxWidth){
      current=next;
      index+=1;
      continue;
    }
    lines.push(current);
    current='';
  }

  if(lines.length<maxLines && current) lines.push(current);

  if(index<chars.length && lines.length){
    const lastIndex=lines.length-1;
    const lastChars=Array.from(lines[lines.length-1]);
    while(lastChars.length && ctx.measureText(lastChars.join('')+'…').width>maxWidth) lastChars.pop();
    lines[lastIndex]=lastChars.length ? lastChars.join('')+'…' : '…';
  }

  return lines;
}

const {left:SAFE_LEFT,right:SAFE_RIGHT,bottom:SAFE_BOTTOM}=MACHIIBE_SOCIAL_MASTER.tiktok.safeArea;
const {width:MASTER_WIDTH,height:MASTER_HEIGHT}=MACHIIBE_SOCIAL_MASTER.tiktok.format;

function fitText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){
  if(ctx.measureText(text).width<=maxWidth) return text;
  const chars=Array.from(text);
  while(chars.length && ctx.measureText(chars.join('')+'…').width>maxWidth) chars.pop();
  return chars.length ? chars.join('')+'…' : '…';
}

function pillText(ctx:CanvasRenderingContext2D,text:string){
  ctx.font='800 28px system-ui, -apple-system, "Noto Sans JP", sans-serif';
  const fitted=fitText(ctx,text,SAFE_RIGHT-SAFE_LEFT-44);
  return {text:fitted,width:Math.ceil(ctx.measureText(fitted).width)+44};
}

function drawPill(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number){
  roundRect(ctx,x,y,width,54,27);
  ctx.fillStyle='rgba(255,255,255,.82)';
  ctx.fill();
  ctx.strokeStyle='rgba(23,79,120,.10)';
  ctx.lineWidth=1;
  ctx.stroke();
  ctx.fillStyle='#31546d';
  ctx.font='800 28px system-ui, -apple-system, "Noto Sans JP", sans-serif';
  ctx.fillText(text,x+22,y+36);
}

export function TikTokAssetGenerator(props:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [caption,setCaption]=useState(props.caption);
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext('2d');
    if(!ctx) return;

    const draw=(icon:HTMLImageElement|null)=>{
      const w=MASTER_WIDTH,h=MASTER_HEIGHT;
      ctx.clearRect(0,0,w,h);

      const bg=ctx.createLinearGradient(0,0,w,h);
      bg.addColorStop(0,'#e7f7ff');
      bg.addColorStop(.48,'#f8fcff');
      bg.addColorStop(1,'#fff5df');
      ctx.fillStyle=bg;
      ctx.fillRect(0,0,w,h);

      const glow1=ctx.createRadialGradient(155,210,20,155,210,430);
      glow1.addColorStop(0,'rgba(41,168,239,.35)');
      glow1.addColorStop(1,'rgba(41,168,239,0)');
      ctx.fillStyle=glow1;
      ctx.fillRect(0,0,w,h);

      const glow2=ctx.createRadialGradient(940,140,20,940,140,390);
      glow2.addColorStop(0,'rgba(255,201,40,.42)');
      glow2.addColorStop(1,'rgba(255,201,40,0)');
      ctx.fillStyle=glow2;
      ctx.fillRect(540,0,540,700);

      const glow3=ctx.createRadialGradient(930,1660,20,930,1660,420);
      glow3.addColorStop(0,'rgba(255,138,0,.20)');
      glow3.addColorStop(1,'rgba(255,138,0,0)');
      ctx.fillStyle=glow3;
      ctx.fillRect(500,1250,580,670);

      ctx.strokeStyle='rgba(23,79,120,.045)';
      ctx.lineWidth=1;
      for(let x=0;x<=w;x+=54){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
      for(let y=0;y<=h;y+=54){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}

      roundRect(ctx,56,56,968,1808,56);
      ctx.fillStyle='rgba(255,255,255,.72)';
      ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.9)';
      ctx.lineWidth=2;
      ctx.stroke();

      if(icon){
        roundRect(ctx,86,86,132,132,38);
        ctx.save();
        ctx.clip();
        ctx.drawImage(icon,86,86,132,132);
        ctx.restore();
      }else{
        roundRect(ctx,86,86,132,132,38);
        ctx.fillStyle='#29a8ef';ctx.fill();
      }

      ctx.fillStyle='#173f61';
      ctx.font='950 50px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillText('まちイベ',244,145);
      ctx.font='800 22px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillStyle='#698095';
      ctx.fillText('EVENT GUIDE',246,184);

      ctx.font='900 30px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      const locationText=fitText(ctx,props.location || '全国',SAFE_RIGHT-120-30);
      const locationWidth=Math.min(SAFE_RIGHT-86,Math.max(260,Math.ceil(ctx.measureText(locationText).width)+80));
      roundRect(ctx,86,270,locationWidth,68,34);
      ctx.fillStyle='rgba(23,79,120,.92)';
      ctx.fill();
      ctx.fillStyle='#fff';
      ctx.fillText(locationText,120,315);

      let titleSize=80;
      if(Array.from(props.title).length>24) titleSize=70;
      if(Array.from(props.title).length>40) titleSize=62;
      ctx.font=`950 ${titleSize}px system-ui, -apple-system, "Noto Sans JP", sans-serif`;
      ctx.fillStyle='#163d5b';
      const titleLines=wrapLines(ctx,props.title,SAFE_RIGHT-SAFE_LEFT,4);
      let titleY=430;
      const lineHeight=titleSize*1.25;
      for(const line of titleLines){ctx.fillText(line,92,titleY);titleY+=lineHeight;}

      const infoY=Math.max(810,titleY+45);
      roundRect(ctx,86,infoY,SAFE_RIGHT-86,370,38);
      ctx.fillStyle='rgba(255,255,255,.86)';
      ctx.fill();
      ctx.strokeStyle='rgba(41,168,239,.13)';
      ctx.stroke();

      ctx.font='900 25px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillStyle='#29a8ef';
      ctx.fillText('DATE',126,infoY+64);
      ctx.fillText('TIME',126,infoY+166);
      ctx.fillText('PLACE',126,infoY+268);

      ctx.font='900 37px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillStyle='#173f61';
      const detailWidth=SAFE_RIGHT-260-28;
      const dateLines=wrapLines(ctx,props.dateText,detailWidth,2);
      dateLines.forEach((line,i)=>ctx.fillText(line,260,infoY+65+i*46));
      ctx.fillText(fitText(ctx,props.timeText || '時間未定',detailWidth),260,infoY+167);
      const venueLines=wrapLines(ctx,props.venueName || '会場は公式情報をご確認ください',detailWidth,2);
      venueLines.forEach((line,i)=>ctx.fillText(line,260,infoY+269+i*46));

      let tagX=SAFE_LEFT,tagY=infoY+425;
      for(const tag of props.tags.slice(0,5)){
        const measured=pillText(ctx,tag);
        if(tagX+measured.width>SAFE_RIGHT){tagX=SAFE_LEFT;tagY+=72;}
        if(tagY+54>SAFE_BOTTOM-145) break;
        drawPill(ctx,measured.text,tagX,tagY,measured.width);
        tagX+=measured.width+14;
      }

      const ctaY=1450;
      ctx.fillStyle='#087fc5';
      ctx.font='950 40px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillText('イベント案内はこちら！',SAFE_LEFT,ctaY);
      ctx.font='950 58px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillStyle='#173f61';
      ctx.fillText('「まちイベ」でチェック',SAFE_LEFT,ctaY+74);

      // TikTok's right-side actions and lower caption/navigation cover part of a
      // 9:16 post. Keep everything below SAFE_BOTTOM decorative only.
      const safeFade=ctx.createLinearGradient(0,SAFE_BOTTOM,0,h);
      safeFade.addColorStop(0,'rgba(41,168,239,.04)');
      safeFade.addColorStop(1,'rgba(255,138,0,.11)');
      ctx.fillStyle=safeFade;
      ctx.fillRect(56,SAFE_BOTTOM,968,h-SAFE_BOTTOM-56);

      ctx.save();
      ctx.globalAlpha=.1;
      ctx.fillStyle='#173f61';
      ctx.font='950 86px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillText('MACHI IBE',SAFE_LEFT,1770);
      ctx.restore();

      ctx.fillStyle='#ff8a00';
      ctx.beginPath();ctx.arc(760,1715,22,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffc928';
      ctx.beginPath();ctx.arc(800,1680,13,0,Math.PI*2);ctx.fill();
    };

    const icon=new Image();
    icon.onload=()=>draw(icon);
    icon.onerror=()=>draw(null);
    icon.src='/machiibe-icon.svg';
  },[props.dateText,props.location,props.tags,props.timeText,props.title,props.venueName]);

  const download=()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    canvas.toBlob((blob)=>{
      if(!blob) return;
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=`machiibe-${props.slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
    },'image/png');
  };

  const copy=async()=>{
    let ok=false;
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(caption);
        ok=true;
      }
    }catch{}

    if(!ok){
      try{
        const fallback=document.createElement('textarea');
        fallback.value=caption;
        fallback.setAttribute('readonly','');
        fallback.style.position='fixed';
        fallback.style.opacity='0';
        document.body.appendChild(fallback);
        fallback.select();
        ok=document.execCommand('copy');
        document.body.removeChild(fallback);
      }catch{}
    }

    setCopied(ok);
    if(ok) window.setTimeout(()=>setCopied(false),1600);
  };

  return (
    <div className="tiktok-generator">
      <section className="tiktok-preview-card">
        <div className="tiktok-preview-head">
          <div><span>9:16 / 1080×1920</span><strong>まちイベ TikTok投稿画像</strong></div>
          <button type="button" onClick={download}>PNGを保存</button>
        </div>
        <div className="tiktok-canvas-wrap">
          <canvas ref={canvasRef} width={MASTER_WIDTH} height={MASTER_HEIGHT} aria-label="TikTok投稿画像プレビュー" />
        </div>
        <p className="tiktok-brand-note">正式まちイベアイコンは全テンプレートに必ず入ります。右側の操作ボタン・下部キャプションに重要情報が重ならない9:16安全配置です。イベント写真は使用していません。</p>
      </section>

      <section className="tiktok-caption-card">
        <div className="tiktok-preview-head">
          <div><span>CAPTION</span><strong>TikTok投稿文</strong></div>
          <button type="button" onClick={copy}>{copied?'コピーしました':'コピー'}</button>
        </div>
        <textarea value={caption} onChange={(e)=>setCaption(e.target.value)} rows={14} />
        <p>投稿前に内容を確認して、必要ならここで編集してからコピーしてください。</p>
      </section>
    </div>
  );
}
