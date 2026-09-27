'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import type {CarouselEventInput,CarouselInput} from '@/lib/machiibe-production-master';
import {buildMachiibeRenderPages,renderPageFileName,type MachiibeRenderPage} from '@/lib/machiibe-carousel-render-plan';

const W=1080;
const H=1920;
const NAVY='#0d3556';
const PINK='#ff3d78';
const SKY='#38bdf8';
const INK='#102b46';
const PAPER='#fffdf9';
const FONT='"Noto Sans JP","Hiragino Sans","Yu Gothic",Meiryo,sans-serif';

function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string,stroke?:string){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}
}
function label(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number,weight=700,fill=INK,align:CanvasTextAlign='left'){
  ctx.font=String(weight)+' '+size+'px '+FONT;ctx.fillStyle=fill;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(value,x,y);
}
function wrapped(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,maxWidth:number,size:number,lineHeight:number,maxLines=4,weight=700,fill=INK){
  ctx.font=String(weight)+' '+size+'px '+FONT;ctx.fillStyle=fill;ctx.textAlign='left';ctx.textBaseline='top';
  const lines:string[]=[];let line='';
  for(const ch of Array.from(value||'')){
    if(ch==='\n'){lines.push(line);line='';if(lines.length>=maxLines)break;continue;}
    const next=line+ch;
    if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=ch;}else line=next;
    if(lines.length>=maxLines)break;
  }
  if(line&&lines.length<maxLines)lines.push(line);
  lines.forEach((row,index)=>ctx.fillText(row,x,y+index*lineHeight));
}
function pageBadge(ctx:CanvasRenderingContext2D,page:MachiibeRenderPage){
  rounded(ctx,0,0,142,80,0,NAVY);label(ctx,String(page.pageNumber)+'/'+String(page.pageCount),24,12,44,900,'#fff');
}
function brand(ctx:CanvasRenderingContext2D,x:number,y:number,scale=1){
  ctx.fillStyle=PINK;ctx.beginPath();ctx.arc(x+26*scale,y+24*scale,23*scale,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(x+11*scale,y+39*scale);ctx.lineTo(x+26*scale,y+66*scale);ctx.lineTo(x+41*scale,y+39*scale);ctx.closePath();ctx.fill();
  label(ctx,'まちイベ',x+60*scale,y,42*scale,900,'#111');
}
function approvedUrl(event?:CarouselEventInput){
  if(!event?.mediaUrl||event.mediaRightsStatus==='blocked') return null;
  if((event.imageMode==='official'||event.imageMode==='provided')&&event.mediaRightsStatus!=='approved') return null;
  return event.mediaUrl;
}
async function loadImage(url:string|null){
  if(!url)return null;
  return await new Promise<HTMLImageElement|null>((resolve)=>{
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{
      try{
        const probe=document.createElement('canvas');probe.width=1;probe.height=1;
        const p=probe.getContext('2d');if(!p){resolve(null);return;}
        p.drawImage(img,0,0,1,1);p.getImageData(0,0,1,1);resolve(img);
      }catch{resolve(null);}
    };
    img.onerror=()=>resolve(null);img.src=url;
  });
}
function imageFill(ctx:CanvasRenderingContext2D,img:HTMLImageElement|null,x:number,y:number,w:number,h:number){
  if(!img){
    const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,SKY);g.addColorStop(1,'#d8f6ff');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);return;
  }
  const s=Math.max(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*s,dh=img.naturalHeight*s;
  ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
function facts(event:CarouselEventInput){
  return {
    date:event.endDate&&event.endDate!==event.startDate?event.startDate+'〜'+event.endDate:event.startDate,
    time:event.startTime?(event.endTime?event.startTime+'〜'+event.endTime:event.startTime):'公式情報を確認',
    place:event.venueName+'（'+event.municipality+'）',
    age:event.ageLabel||'公式情報を確認',
    rain:event.rainPolicy||'公式情報を確認',
    env:event.indoorOutdoor==='indoor'?'屋内':event.indoorOutdoor==='outdoor'?'屋外':event.indoorOutdoor==='mixed'?'屋内・屋外':'公式情報を確認'
  };
}
function factRow(ctx:CanvasRenderingContext2D,name:string,value:string,x:number,y:number,w:number){
  ctx.fillStyle=PINK;ctx.beginPath();ctx.arc(x+22,y+22,22,0,Math.PI*2);ctx.fill();label(ctx,name.slice(0,1),x+22,y+7,22,900,'#fff','center');
  label(ctx,name,x+58,y,22,800,INK);wrapped(ctx,value,x+58,y+30,w-58,27,35,2,720,INK);
}
function disclaimer(ctx:CanvasRenderingContext2D,event:CarouselEventInput|undefined,x:number,y:number,w:number){
  if(!event||!event.imageDisclaimer||(event.imageMode!=='general'&&event.imageMode!=='ai_general'))return;
  rounded(ctx,x,y,w,52,18,'rgba(255,255,255,.92)');wrapped(ctx,event.imageDisclaimer,x+14,y+12,w-28,22,27,1,700,INK);
}
async function drawCover(ctx:CanvasRenderingContext2D,page:MachiibeRenderPage,input:CarouselInput){
  const events=input.events.filter((e)=>e.includedInPost!==false),hero=events.find((e)=>approvedUrl(e))||events[0];
  imageFill(ctx,await loadImage(approvedUrl(hero)),0,0,W,H);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(13,53,86,.05)');g.addColorStop(.6,'rgba(13,53,86,.12)');g.addColorStop(1,'rgba(13,53,86,.76)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  pageBadge(ctx,page);label(ctx,input.period.periodLabel,64,145,50,900,'#fff');
  wrapped(ctx,'今週どこ行く？\nおでかけイベント',64,235,880,82,98,3,900,'#fff');
  rounded(ctx,680,470,320,160,75,'rgba(255,255,255,.95)');wrapped(ctx,input.area.prefecture+(input.area.municipalityName?'\n'+input.area.municipalityName:''),730,505,220,42,50,2,900,PINK);
  rounded(ctx,44,1430,992,245,38,'rgba(255,248,219,.97)');wrapped(ctx,String(events.length)+'件の検証済みイベントから\n家族のおでかけ候補をチェック',78,1480,890,47,62,3,900,'#111');
  rounded(ctx,0,1680,1080,240,0,'rgba(255,255,255,.97)');brand(ctx,125,1735,1.35);label(ctx,'見つけよう、みんなのおでかけ',540,1830,29,700,INK,'center');
  disclaimer(ctx,hero,58,1358,520);
}
async function drawHighlights(ctx:CanvasRenderingContext2D,page:Extract<MachiibeRenderPage,{kind:'highlights'}>,input:CarouselInput){
  const hero=page.events.find((e)=>approvedUrl(e))||page.events[0];imageFill(ctx,await loadImage(approvedUrl(hero)),0,0,W,930);
  ctx.fillStyle='rgba(13,53,86,.34)';ctx.fillRect(0,0,W,930);pageBadge(ctx,page);wrapped(ctx,'見つける、\n比べる、\n出かける。',72,145,850,78,98,4,900,'#fff');
  ctx.fillStyle=PAPER;ctx.fillRect(0,900,W,1020);label(ctx,'今週の見どころ',70,980,56,900,INK);
  page.events.slice(0,5).forEach((event,index)=>{
    const y=1090+index*130;rounded(ctx,70,y,940,102,28,'#fff',index%2?SKY:PINK);
    ctx.fillStyle=index%2?SKY:PINK;ctx.beginPath();ctx.arc(120,y+51,18,0,Math.PI*2);ctx.fill();
    wrapped(ctx,event.title,160,y+20,800,31,39,2,850,INK);
  });
  label(ctx,'検証済みの事実だけを掲載。詳細は公式情報をご確認ください',70,1790,24,650,'#647a8c');brand(ctx,70,1845,.7);disclaimer(ctx,hero,520,830,500);
}
async function drawEventCard(ctx:CanvasRenderingContext2D,event:CarouselEventInput,x:number,y:number,w:number,h:number){
  rounded(ctx,x,y,w,h,34,'#fff','#d7e5ef');const ih=390,img=await loadImage(approvedUrl(event));
  ctx.save();ctx.beginPath();ctx.roundRect(x+20,y+20,w-40,ih,28);ctx.clip();imageFill(ctx,img,x+20,y+20,w-40,ih);ctx.restore();
  disclaimer(ctx,event,x+35,y+ih-48,w-70);wrapped(ctx,event.title,x+40,y+ih+48,w-80,w>700?46:36,w>700?56:45,3,900,INK);
  const f=facts(event),base=y+ih+220;factRow(ctx,'開催日',f.date,x+40,base,w-80);factRow(ctx,'時間',f.time,x+40,base+110,w-80);factRow(ctx,'会場',f.place,x+40,base+220,w-80);
  factRow(ctx,'料金',event.priceLabel,x+40,base+350,w-80);factRow(ctx,'対象',f.age,x+40,base+460,w-80);factRow(ctx,'予約',event.reservationLabel,x+40,base+570,w-80);
  factRow(ctx,'環境',f.env+' / 雨天: '+f.rain,x+40,base+680,w-80);label(ctx,'※詳細は公式情報をご確認ください',x+40,y+h-55,22,650,'#72879a');
}
async function drawEvents(ctx:CanvasRenderingContext2D,page:Extract<MachiibeRenderPage,{kind:'events'}>){
  ctx.fillStyle='#f1f8fc';ctx.fillRect(0,0,W,H);pageBadge(ctx,page);brand(ctx,760,22,.62);
  if(page.events.length===1)await drawEventCard(ctx,page.events[0],44,110,992,1725);
  else{await drawEventCard(ctx,page.events[0],44,110,482,1725);await drawEventCard(ctx,page.events[1],554,110,482,1725);}
  rounded(ctx,0,1850,W,70,0,NAVY);label(ctx,'詳しくはプロフィールから',38,1868,28,800,'#fff');
}
function drawCta(ctx:CanvasRenderingContext2D,page:MachiibeRenderPage){
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#fff7f9');g.addColorStop(1,'#e8f8ff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);pageBadge(ctx,page);
  label(ctx,'おでかけイベントを探すなら',540,110,42,900,PINK,'center');brand(ctx,325,200,1.2);
  rounded(ctx,190,365,700,760,70,'#101820');rounded(ctx,225,410,630,690,46,'#fff');label(ctx,'イベントを探す',270,490,42,900,INK);
  rounded(ctx,270,570,540,76,24,'#f4f8fb','#d8e5ee');label(ctx,'地域・イベント名・キーワード',302,592,24,650,'#8aa0b1');
  ['今日','今週末','雨の日','体験','子ども向け','推し活'].forEach((v,i)=>{const x=270+(i%3)*180,y=690+Math.floor(i/3)*90;rounded(ctx,x,y,160,66,22,i%2?'#eefaff':'#fff0f5',i%2?SKY:PINK);label(ctx,v,x+80,y+18,23,800,i%2?NAVY:PINK,'center');});
  rounded(ctx,270,890,540,86,43,PINK);label(ctx,'イベントを検索',540,910,30,900,'#fff','center');
  rounded(ctx,90,1200,900,180,36,'#fff','#ffd0dc');label(ctx,'保存',240,1240,28,850,INK,'center');label(ctx,'家族に共有',540,1240,28,850,INK,'center');label(ctx,'フォロー',840,1240,28,850,INK,'center');
  label(ctx,'行く前・当日の安心は',80,1470,34,850,INK);label(ctx,'まちまも',80,1520,58,900,'#111');
  ['WBGT','AED','交番','MAP'].forEach((v,i)=>{const x=440+i*145;rounded(ctx,x,1470,126,126,24,'#fff','#8bd8ff');label(ctx,v,x+63,1503,24,900,INK,'center');});
  rounded(ctx,0,1750,W,170,0,NAVY);label(ctx,'詳しくはプロフィールから  >>>',540,1795,35,900,'#fff','center');
}
async function render(canvas:HTMLCanvasElement,page:MachiibeRenderPage,input:CarouselInput){
  canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas unavailable');ctx.clearRect(0,0,W,H);
  if(page.kind==='cover')await drawCover(ctx,page,input);else if(page.kind==='highlights')await drawHighlights(ctx,page,input);else if(page.kind==='events')await drawEvents(ctx,page);else drawCta(ctx,page);
}
function asPng(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('PNG encode failed')),'image/png'));}
async function sha256(blob:Blob){const hash=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return Array.from(new Uint8Array(hash)).map((b)=>b.toString(16).padStart(2,'0')).join('');}

export default function MachiibeFinalCarouselRenderer({input,pageCount}:{input:CarouselInput;pageCount:number}){
  const pages=useMemo(()=>buildMachiibeRenderPages(input,pageCount),[input,pageCount]);const refs=useRef<Array<HTMLCanvasElement|null>>([]);
  const [busy,setBusy]=useState(true),[error,setError]=useState('');const [files,setFiles]=useState<Array<{name:string;hash:string;bytes:number;url:string}>>([]);
  useEffect(()=>{let alive=true;(async()=>{setBusy(true);try{if(document.fonts?.ready)await document.fonts.ready;for(let i=0;i<pages.length;i++){const c=refs.current[i];if(c)await render(c,pages[i],input);}}catch(e){if(alive)setError(e instanceof Error?e.message:'render failed');}finally{if(alive)setBusy(false);}})();return()=>{alive=false;};},[pages,input]);
  useEffect(()=>()=>{files.forEach((f)=>URL.revokeObjectURL(f.url));},[files]);
  async function generate(){setBusy(true);setError('');try{files.forEach((f)=>URL.revokeObjectURL(f.url));const next=[];for(let i=0;i<pages.length;i++){const c=refs.current[i];if(!c)throw new Error('canvas missing');await render(c,pages[i],input);const blob=await asPng(c);next.push({name:renderPageFileName(input,pages[i].pageNumber,pages[i].pageCount),hash:await sha256(blob),bytes:blob.size,url:URL.createObjectURL(blob)});}setFiles(next);}catch(e){setError(e instanceof Error?e.message:'PNG generation failed');}finally{setBusy(false);}}
  return <div><div className="admin-panel-head"><div><h2>Final PNG Renderer</h2><p>Golden原典を基準に、Previewと1080×1920 PNGを同じCanvas描画から生成します。権利未承認画像は使いません。</p></div><button className="admin-primary" type="button" onClick={generate} disabled={busy}>{busy?'描画中…':'PNGセットを生成'}</button></div>
    {error&&<div className="admin-warning">{error}</div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:18}}>
      {pages.map((page,index)=><article key={page.pageNumber}><canvas ref={(node)=>{refs.current[index]=node;}} style={{display:'block',width:'100%',aspectRatio:'9 / 16',borderRadius:18,boxShadow:'0 8px 24px rgba(13,53,86,.14)',background:'#eef7fb'}}/><div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:8,fontSize:12}}><span>{page.pageNumber}/{page.pageCount} {page.kind.toUpperCase()}</span>{files[index]&&<a href={files[index].url} download={files[index].name}>PNG</a>}</div>{files[index]&&<small style={{display:'block',overflowWrap:'anywhere'}}>sha256: {files[index].hash}<br/>{files[index].bytes.toLocaleString()} bytes</small>}</article>)}
    </div>{files.length===pages.length&&<p style={{marginTop:14}}>mediaManifest準備: {files.length} files / 各PNGのSHA-256算出済み。R2保存API接続前のためDB/R2にはまだ書き込みません。</p>}</div>;
}
