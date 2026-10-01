'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import type {CarouselEventInput,CarouselInput} from '@/lib/machiibe-production-master';
import {buildMachiibeRenderPages,deriveVerifiedHighlightLabels,renderPageFileName,type MachiibeRenderPage} from '@/lib/machiibe-carousel-render-plan';
import {buildMachiibeMediaManifest,hashMachiibeMediaManifest,type MachiibeMediaManifest} from '@/lib/machiibe-media-manifest';

const W=1080;
const H=1920;
const NAVY='#0d3556';
const PINK='#ff3d78';
const SKY='#38bdf8';
const YELLOW='#ffc928';
const SOFT_BLUE='#e7f7ff';
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
function outlinedWrapped(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,maxWidth:number,size:number,lineHeight:number,maxLines=4,weight=900,fill='#fff',stroke=NAVY){
  ctx.font=String(weight)+' '+size+'px '+FONT;ctx.textAlign='left';ctx.textBaseline='top';ctx.lineJoin='round';ctx.lineWidth=Math.max(5,Math.round(size*.09));
  const lines:string[]=[];let line='';
  for(const ch of Array.from(value||'')){
    if(ch==='\n'){lines.push(line);line='';if(lines.length>=maxLines)break;continue;}
    const next=line+ch;
    if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=ch;}else line=next;
    if(lines.length>=maxLines)break;
  }
  if(line&&lines.length<maxLines)lines.push(line);
  lines.forEach((row,index)=>{ctx.strokeStyle=stroke;ctx.strokeText(row,x,y+index*lineHeight);ctx.fillStyle=fill;ctx.fillText(row,x,y+index*lineHeight);});
}
function periodPill(ctx:CanvasRenderingContext2D,value:string){
  const right=70,maxWidth=500,minWidth=280,padding=56,maxSize=26,minSize=18;
  let size=maxSize;
  const measure=()=>{
    ctx.font=String(850)+' '+size+'px '+FONT;
    return ctx.measureText(value).width;
  };
  let textWidth=measure();
  while(size>minSize&&textWidth>maxWidth-padding){
    size-=1;
    textWidth=measure();
  }
  const width=Math.min(maxWidth,Math.max(minWidth,Math.ceil(textWidth+padding)));
  const x=W-right-width;
  rounded(ctx,x,105,width,82,38,'rgba(255,255,255,.92)');
  label(ctx,value,x+width/2,128,size,850,NAVY,'center');
}
function accentRays(ctx:CanvasRenderingContext2D,x:number,y:number,scale=1){
  ctx.save();ctx.strokeStyle=YELLOW;ctx.lineWidth=10*scale;ctx.lineCap='round';
  [[-52,-15,-90,-30],[-45,12,-84,18],[-22,38,-46,74],[52,-15,90,-30],[45,12,84,18],[22,38,46,74]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x+x1*scale,y+y1*scale);ctx.lineTo(x+x2*scale,y+y2*scale);ctx.stroke();});
  ctx.restore();
}
function verifiedChips(event:CarouselEventInput){
  const chips:string[]=[];
  if(event.indoorOutdoor==='indoor')chips.push('屋内');
  else if(event.indoorOutdoor==='outdoor')chips.push('屋外');
  else if(event.indoorOutdoor==='mixed')chips.push('屋内・屋外');
  if(/無料/.test(event.priceLabel))chips.push('無料情報あり');
  if(/不要/.test(event.reservationLabel))chips.push('予約不要');
  if(event.ageLabel&&/(未就学|小学生|子ども|ファミリー)/.test(event.ageLabel))chips.push('家族向け');
  if(event.rainPolicy&&event.rainPolicy!=='公式情報を確認')chips.push('雨天情報あり');
  return chips.slice(0,3);
}
function pageBadge(ctx:CanvasRenderingContext2D,page:MachiibeRenderPage){
  rounded(ctx,0,0,142,80,0,NAVY);label(ctx,String(page.pageNumber)+'/'+String(page.pageCount),24,12,44,900,'#fff');
}
async function brand(ctx:CanvasRenderingContext2D,x:number,y:number,scale=1){
  const logo=await loadImage('/machiibe-logo.svg');
  if(logo){
    ctx.drawImage(logo,x,y,258*scale,75*scale);
    return;
  }
  // Asset load failure fallback only. Normal Preview/PNG must use the approved Golden wordmark.
  const pink='#ff2e78';
  ctx.fillStyle=pink;
  ctx.beginPath();ctx.arc(x+28*scale,y+27*scale,24*scale,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(x+11*scale,y+43*scale);ctx.lineTo(x+28*scale,y+72*scale);ctx.lineTo(x+45*scale,y+43*scale);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+28*scale,y+27*scale,9*scale,0,Math.PI*2);ctx.fill();
  label(ctx,'まち',x+70*scale,y+7*scale,42*scale,900,'#111827');
  label(ctx,'イベ',x+151*scale,y+7*scale,42*scale,900,pink);
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
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(13,53,86,.03)');g.addColorStop(.52,'rgba(13,53,86,.08)');g.addColorStop(1,'rgba(13,53,86,.68)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  pageBadge(ctx,page);

  periodPill(ctx,input.period.periodLabel);

  accentRays(ctx,98,300,.75);
  outlinedWrapped(ctx,'今週どこ行く？\n'+input.area.prefecture+'で\nおでかけ発見',62,235,890,78,94,4,900,'#fff',NAVY);

  rounded(ctx,690,575,300,170,78,'rgba(255,255,255,.96)');
  ctx.fillStyle='rgba(255,255,255,.96)';ctx.beginPath();ctx.moveTo(812,735);ctx.lineTo(847,802);ctx.lineTo(883,735);ctx.closePath();ctx.fill();
  wrapped(ctx,input.area.prefecture+(input.area.municipalityName?'\n'+input.area.municipalityName:''),737,610,210,38,47,2,900,PINK);

  ctx.save();ctx.translate(540,1510);ctx.rotate(-0.025);
  rounded(ctx,-470,-98,940,196,26,'rgba(255,247,210,.97)');
  outlinedWrapped(ctx,'家族で楽しむ おでかけ候補',-420,-58,820,49,60,2,900,'#111','rgba(255,255,255,.85)');
  label(ctx,String(events.length)+'件の検証済みイベントを掲載',-410,15,27,750,NAVY);
  ctx.restore();

  rounded(ctx,0,1680,1080,240,0,'rgba(255,255,255,.98)');
  await brand(ctx,110,1730,1.45);
  label(ctx,'見つけよう、みんなのおでかけ',560,1830,30,780,INK,'center');
  disclaimer(ctx,hero,62,1370,535);
}
async function drawHighlights(ctx:CanvasRenderingContext2D,page:Extract<MachiibeRenderPage,{kind:'highlights'}>,input:CarouselInput){
  const hero=page.events.find((e)=>approvedUrl(e))||page.events[0];
  const second=page.events.find((e)=>e!==hero&&approvedUrl(e))||page.events[1];
  imageFill(ctx,await loadImage(approvedUrl(hero)),0,0,W,H);
  ctx.fillStyle='rgba(8,35,53,.18)';ctx.fillRect(0,0,W,H);
  pageBadge(ctx,page);

  accentRays(ctx,118,230,.65);
  outlinedWrapped(ctx,'見つける、\n比べる、\n出かける。',72,145,820,76,92,3,900,'#fff','rgba(8,35,53,.85)');

  const tags=deriveVerifiedHighlightLabels(page.events).slice(0,4);
  rounded(ctx,75,720,610,330,52,'rgba(255,255,255,.95)');
  ctx.fillStyle='rgba(255,255,255,.95)';ctx.beginPath();ctx.moveTo(555,1020);ctx.lineTo(635,1115);ctx.lineTo(665,1010);ctx.closePath();ctx.fill();
  label(ctx,'今週の見どころ',120,770,38,900,INK);
  tags.forEach((tag,index)=>{
    const y=840+index*50;
    ctx.fillStyle=index%2?SKY:PINK;ctx.beginPath();ctx.arc(135,y+17,10,0,Math.PI*2);ctx.fill();
    wrapped(ctx,tag,165,y,455,29,36,1,850,INK);
  });

  const imgA=await loadImage(approvedUrl(hero));
  const imgB=await loadImage(approvedUrl(second));
  ctx.save();ctx.translate(250,1355);ctx.rotate(-0.075);
  rounded(ctx,-150,-170,390,310,8,'#fff');
  imageFill(ctx,imgA,-130,-150,350,230);
  label(ctx,'家族で楽しむ',45,95,27,850,INK,'center');ctx.restore();
  ctx.save();ctx.translate(765,1360);ctx.rotate(0.085);
  rounded(ctx,-205,-165,390,310,8,'#fff');
  imageFill(ctx,imgB,-185,-145,350,230);
  label(ctx,'気になる体験をチェック',-10,100,24,850,INK,'center');ctx.restore();

  rounded(ctx,175,1680,730,105,42,'rgba(255,255,255,.95)');
  label(ctx,'どんなイベントに出会えるかな？',540,1707,34,900,INK,'center');
  accentRays(ctx,942,1712,.46);
  await brand(ctx,70,1845,.7);
  disclaimer(ctx,hero,520,620,500);
}

async function drawEventCard(ctx:CanvasRenderingContext2D,event:CarouselEventInput,x:number,y:number,w:number,h:number){
  rounded(ctx,x,y,w,h,34,'#fff',SKY);ctx.fillStyle=SKY;ctx.fillRect(x+34,y,w-68,12);const ih=390,img=await loadImage(approvedUrl(event));
  ctx.save();ctx.beginPath();ctx.roundRect(x+20,y+20,w-40,ih,28);ctx.clip();imageFill(ctx,img,x+20,y+20,w-40,ih);ctx.restore();
  disclaimer(ctx,event,x+35,y+ih-48,w-70);wrapped(ctx,event.title,x+40,y+ih+48,w-80,w>700?46:36,w>700?56:45,3,900,INK);
  const f=facts(event),base=y+ih+220;factRow(ctx,'開催日',f.date,x+40,base,w-80);factRow(ctx,'時間',f.time,x+40,base+110,w-80);factRow(ctx,'会場',f.place,x+40,base+220,w-80);
  factRow(ctx,'料金',event.priceLabel,x+40,base+350,w-80);factRow(ctx,'対象',f.age,x+40,base+460,w-80);factRow(ctx,'予約',event.reservationLabel,x+40,base+570,w-80);
  factRow(ctx,'環境',f.env+' / 雨天: '+f.rain,x+40,base+680,w-80);
  const chips=verifiedChips(event);
  if(chips.length){
    label(ctx,'ここをチェック',x+40,y+h-138,22,850,PINK);
    let chipX=x+205;
    chips.forEach((chip,index)=>{
      const chipW=Math.min(w>700?190:118,58+chip.length*(w>700?24:18));
      if(chipX+chipW>x+w-35||index>1&&w<700)return;
      rounded(ctx,chipX,y+h-148,chipW,50,22,index%2?'#eefaff':'#fff0f5',index%2?SKY:PINK);
      label(ctx,chip,chipX+chipW/2,y+h-135,w>700?20:17,800,index%2?NAVY:PINK,'center');
      chipX+=chipW+10;
    });
  }
  label(ctx,'※詳細は公式情報をご確認ください',x+40,y+h-55,22,650,'#72879a');
}
async function drawEvents(ctx:CanvasRenderingContext2D,page:Extract<MachiibeRenderPage,{kind:'events'}>){
  ctx.fillStyle='#f1f8fc';ctx.fillRect(0,0,W,H);pageBadge(ctx,page);brand(ctx,760,22,.62);
  if(page.events.length===1)await drawEventCard(ctx,page.events[0],44,110,992,1725);
  else{await drawEventCard(ctx,page.events[0],44,110,482,1725);await drawEventCard(ctx,page.events[1],554,110,482,1725);}
  rounded(ctx,0,1850,W,70,0,NAVY);label(ctx,'詳しくはプロフィールから',38,1868,28,800,'#fff');
}
async function drawCta(ctx:CanvasRenderingContext2D,page:MachiibeRenderPage,input:CarouselInput){
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#fff4f7');g.addColorStop(.58,'#fff');g.addColorStop(1,SOFT_BLUE);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);pageBadge(ctx,page);
  label(ctx,'おでかけイベントを探すなら',540,105,42,900,PINK,'center');await brand(ctx,315,195,1.18);
  accentRays(ctx,935,265,.48);

  // Phone-like search UI: visualises the real search hierarchy without implying a live screenshot.
  rounded(ctx,90,360,610,900,76,'#101820');
  rounded(ctx,122,405,546,825,48,'#fff');
  label(ctx,'イベントを探す',160,475,38,900,INK);
  rounded(ctx,160,548,470,72,22,'#f5f8fb','#d8e5ee');label(ctx,'地域・イベント名・キーワード',185,570,22,650,'#8aa0b1');
  ['今日','今週末','雨の日','体験','子ども向け','推し活'].forEach((v,i)=>{
    const x=160+(i%3)*158,y=665+Math.floor(i/3)*88;
    rounded(ctx,x,y,142,62,20,i%2?'#eefaff':'#fff0f5',i%2?SKY:PINK);
    label(ctx,v,x+71,y+17,21,800,i%2?NAVY:PINK,'center');
  });
  rounded(ctx,160,865,470,84,42,PINK);label(ctx,'イベントを検索',395,885,29,900,'#fff','center');
  rounded(ctx,160,995,470,130,28,'#f9fbfd','#e2edf4');label(ctx,input.area.prefecture+'の'+String(input.events.filter((e)=>e.includedInPost!==false).length)+'件をチェック',395,1030,25,850,INK,'center');

  const events=input.events.filter((e)=>e.includedInPost!==false);
  const heroA=events.find((e)=>approvedUrl(e))||events[0];
  const heroB=events.find((e,index)=>index>0&&approvedUrl(e))||events[1];
  const imgA=await loadImage(approvedUrl(heroA));
  const imgB=await loadImage(approvedUrl(heroB));
  // Approved event media is used when available; otherwise imageFill keeps a deterministic brand fallback.
  ctx.save();ctx.translate(840,610);ctx.rotate(.075);rounded(ctx,-145,-180,290,330,7,'#fff');imageFill(ctx,imgA,-125,-160,250,235);label(ctx,'見つけた！',0,90,25,850,INK,'center');ctx.restore();
  ctx.save();ctx.translate(820,975);ctx.rotate(-.06);rounded(ctx,-145,-165,290,310,7,'#fff');imageFill(ctx,imgB,-125,-145,250,215);label(ctx,'家族に共有',0,85,23,850,INK,'center');ctx.restore();

  rounded(ctx,0,1320,W,430,0,'#e8f7ff');
  label(ctx,'行く前・当日の安心は',72,1375,34,850,INK);
  label(ctx,'まちまも',72,1430,60,900,'#111');
  const safety=[['暑さ指数','WBGT'],['AED','AED'],['交番・警察署','POLICE'],['周辺MAP','MAP']];
  safety.forEach(([name,short],i)=>{
    const x=440+i*148;
    rounded(ctx,x,1375,132,154,28,'#fff','#91dbff');
    ctx.fillStyle=i===1?PINK:SKY;ctx.beginPath();ctx.arc(x+66,1425,28,0,Math.PI*2);ctx.fill();
    label(ctx,short.slice(0,3),x+66,1409,15,900,'#fff','center');
    wrapped(ctx,name,x+16,1473,100,18,22,2,800,INK);
  });
  label(ctx,'保存して、家族に共有。安心して楽しいおでかけを。',540,1630,25,750,NAVY,'center');

  rounded(ctx,0,1750,W,170,0,NAVY);label(ctx,'詳しくはプロフィールから  >>>',540,1795,35,900,'#fff','center');
}
async function render(canvas:HTMLCanvasElement,page:MachiibeRenderPage,input:CarouselInput){
  canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas unavailable');ctx.clearRect(0,0,W,H);
  if(page.kind==='cover')await drawCover(ctx,page,input);else if(page.kind==='highlights')await drawHighlights(ctx,page,input);else if(page.kind==='events')await drawEvents(ctx,page);else await drawCta(ctx,page,input);
}
function asPng(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('PNG encode failed')),'image/png'));}
async function sha256(blob:Blob){const hash=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return Array.from(new Uint8Array(hash)).map((b)=>b.toString(16).padStart(2,'0')).join('');}

export default function MachiibeFinalCarouselRenderer({input,pageCount,postSetId,revisionId}:{input:CarouselInput;pageCount:number;postSetId:string;revisionId:string}){
  const pages=useMemo(()=>buildMachiibeRenderPages(input,pageCount),[input,pageCount]);const refs=useRef<Array<HTMLCanvasElement|null>>([]);
  const [busy,setBusy]=useState(true),[error,setError]=useState('');const [files,setFiles]=useState<Array<{pageNumber:number;pageCount:number;name:string;hash:string;bytes:number;url:string}>>([]);const [manifest,setManifest]=useState<MachiibeMediaManifest|null>(null);const [manifestHash,setManifestHash]=useState('');
  useEffect(()=>{let alive=true;(async()=>{setBusy(true);try{if(document.fonts?.ready)await document.fonts.ready;for(let i=0;i<pages.length;i++){const c=refs.current[i];if(c)await render(c,pages[i],input);}}catch(e){if(alive)setError(e instanceof Error?e.message:'render failed');}finally{if(alive)setBusy(false);}})();return()=>{alive=false;};},[pages,input]);
  useEffect(()=>()=>{files.forEach((f)=>URL.revokeObjectURL(f.url));},[files]);
  async function generate(){
    setBusy(true);setError('');setManifest(null);setManifestHash('');
    try{
      files.forEach((f)=>URL.revokeObjectURL(f.url));
      const next:Array<{pageNumber:number;pageCount:number;name:string;hash:string;bytes:number;url:string}>=[];
      for(let i=0;i<pages.length;i++){
        const c=refs.current[i];if(!c)throw new Error('canvas missing');
        await render(c,pages[i],input);
        const blob=await asPng(c);
        next.push({
          pageNumber:pages[i].pageNumber,
          pageCount:pages[i].pageCount,
          name:renderPageFileName(input,pages[i].pageNumber,pages[i].pageCount),
          hash:await sha256(blob),
          bytes:blob.size,
          url:URL.createObjectURL(blob)
        });
      }
      const built=buildMachiibeMediaManifest(postSetId,revisionId,next.map((file)=>({
        pageNumber:file.pageNumber,
        pageCount:file.pageCount,
        fileName:file.name,
        sha256:file.hash,
        bytes:file.bytes
      })));
      setFiles(next);
      setManifest(built);
      setManifestHash(await hashMachiibeMediaManifest(built));
    }catch(e){
      setError(e instanceof Error?e.message:'PNG generation failed');
    }finally{
      setBusy(false);
    }
  }

  return <div><div className="admin-panel-head"><div><h2>Final PNG Renderer</h2><p>Golden原典を基準に、Previewと1080×1920 PNGを同じCanvas描画から生成します。権利未承認画像は使いません。</p></div><button className="admin-primary" type="button" onClick={generate} disabled={busy}>{busy?'描画中…':'PNGセットを生成'}</button></div>
    {error&&<div className="admin-warning">{error}</div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:18}}>
      {pages.map((page,index)=><article key={page.pageNumber}><canvas ref={(node)=>{refs.current[index]=node;}} style={{display:'block',width:'100%',aspectRatio:'9 / 16',borderRadius:18,boxShadow:'0 8px 24px rgba(13,53,86,.14)',background:'#eef7fb'}}/><div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:8,fontSize:12}}><span>{page.pageNumber}/{page.pageCount} {page.kind.toUpperCase()}</span>{files[index]&&<a href={files[index].url} download={files[index].name}>PNG</a>}</div>{files[index]&&<small style={{display:'block',overflowWrap:'anywhere'}}>sha256: {files[index].hash}<br/>{files[index].bytes.toLocaleString()} bytes</small>}</article>)}
    </div>{files.length===pages.length&&<div style={{marginTop:14}}>
      <p>mediaManifest準備: {files.length} files / 各PNGのSHA-256算出済み。R2保存API接続前のためDB/R2にはまだ書き込みません。</p>
      {manifest&&<small style={{display:'block',overflowWrap:'anywhere'}}>manifest: {manifest.version}<br/>mediaHash: {manifestHash}<br/>R2 prefix: production/machiibe/{postSetId}/{revisionId}/</small>}
    </div>}</div>;
}
