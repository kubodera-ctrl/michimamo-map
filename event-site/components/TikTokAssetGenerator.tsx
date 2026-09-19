'use client';

import { useEffect, useRef, useState } from 'react';

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
  for(const char of chars){
    const next=current+char;
    if(ctx.measureText(next).width>maxWidth && current){
      lines.push(current);
      current=char;
      if(lines.length===maxLines-1) break;
    }else{
      current=next;
    }
  }
  if(lines.length<maxLines && current) lines.push(current);
  const used=lines.join('');
  if(used.length<text.length && lines.length){
    let last=lines[lines.length-1];
    while(last && ctx.measureText(last+'…').width>maxWidth) last=last.slice(0,-1);
    lines[lines.length-1]=last+'…';
  }
  return lines;
}

function drawPill(ctx:CanvasRenderingContext2D,text:string,x:number,y:number){
  ctx.font='800 28px system-ui, -apple-system, "Noto Sans JP", sans-serif';
  const width=Math.ceil(ctx.measureText(text).width)+44;
  roundRect(ctx,x,y,width,54,27);
  ctx.fillStyle='rgba(255,255,255,.82)';
  ctx.fill();
  ctx.strokeStyle='rgba(23,79,120,.10)';
  ctx.lineWidth=1;
  ctx.stroke();
  ctx.fillStyle='#31546d';
  ctx.fillText(text,x+22,y+36);
  return width;
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
      const w=1080,h=1920;
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

      roundRect(ctx,86,270,Math.min(760,Math.max(260,ctx.measureText(props.location).width+80)),68,34);
      ctx.fillStyle='rgba(23,79,120,.92)';
      ctx.fill();
      ctx.fillStyle='#fff';
      ctx.font='900 30px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillText(props.location || '全国',120,315);

      let titleSize=86;
      if(props.title.length>32) titleSize=74;
      if(props.title.length>52) titleSize=64;
      ctx.font=`950 ${titleSize}px system-ui, -apple-system, "Noto Sans JP", sans-serif`;
      ctx.fillStyle='#163d5b';
      const titleLines=wrapLines(ctx,props.title,860,5);
      let titleY=440;
      const lineHeight=titleSize*1.25;
      for(const line of titleLines){ctx.fillText(line,92,titleY);titleY+=lineHeight;}

      const infoY=Math.max(850,titleY+70);
      roundRect(ctx,86,infoY,908,390,38);
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
      const dateLines=wrapLines(ctx,props.dateText,690,2);
      dateLines.forEach((line,i)=>ctx.fillText(line,260,infoY+65+i*46));
      ctx.fillText(props.timeText || '時間未定',260,infoY+167);
      const venueLines=wrapLines(ctx,props.venueName || '会場は公式情報をご確認ください',690,2);
      venueLines.forEach((line,i)=>ctx.fillText(line,260,infoY+269+i*46));

      let tagX=92,tagY=infoY+445;
      for(const tag of props.tags.slice(0,5)){
        const width=drawPill(ctx,tag,tagX,tagY);
        if(tagX+width>950){tagX=92;tagY+=72;}
        else tagX+=width+14;
      }

      const footerY=1680;
      ctx.fillStyle='#087fc5';
      ctx.font='950 44px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillText('イベント詳細は',92,footerY);
      ctx.font='950 62px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillStyle='#173f61';
      ctx.fillText('「まちイベ」でチェック',92,footerY+78);
      ctx.font='700 24px system-ui, -apple-system, "Noto Sans JP", sans-serif';
      ctx.fillStyle='#7a8997';
      ctx.fillText('掲載内容は変更される場合があります。来場前に公式情報をご確認ください。',92,footerY+137);

      ctx.fillStyle='#ff8a00';
      ctx.beginPath();ctx.arc(950,1740,22,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffc928';
      ctx.beginPath();ctx.arc(986,1712,13,0,Math.PI*2);ctx.fill();
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
    try{
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(()=>setCopied(false),1600);
    }catch{
      setCopied(false);
    }
  };

  return (
    <div className="tiktok-generator">
      <section className="tiktok-preview-card">
        <div className="tiktok-preview-head">
          <div><span>9:16 / 1080×1920</span><strong>まちイベ TikTok投稿画像</strong></div>
          <button type="button" onClick={download}>PNGを保存</button>
        </div>
        <div className="tiktok-canvas-wrap">
          <canvas ref={canvasRef} width={1080} height={1920} aria-label="TikTok投稿画像プレビュー" />
        </div>
        <p className="tiktok-brand-note">正式まちイベアイコンは全テンプレートに必ず入ります。イベント写真は使用していません。</p>
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
