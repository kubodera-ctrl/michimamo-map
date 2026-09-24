import React from 'react';
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import type {MachimamoVideoProps,MediaClip} from './types';

const C={
  blue:'#087CE8',
  blue2:'#0056C9',
  navy:'#102D49',
  ink:'#162E43',
  red:'#E51E2A',
  yellow:'#FFD633',
  muted:'#5F7385'
};

const baseFont='"Noto Sans JP","Hiragino Sans","Yu Gothic UI",system-ui,sans-serif';

const Shield=({size=58}:{size?:number})=>(
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
    <defs>
      <linearGradient id="shieldGrad" x1="0" x2="1">
        <stop stopColor="#2AA7FF"/>
        <stop offset="1" stopColor="#0872DE"/>
      </linearGradient>
    </defs>
    <path d="M32 4 55 12v18c0 15-9 24-23 30C18 54 9 45 9 30V12L32 4Z" fill="url(#shieldGrad)"/>
    <path d="M32 10 49 16v14c0 11-6 18-17 23-11-5-17-12-17-23V16l17-6Z" fill="#fff"/>
    <path d="M32 18c-6 0-11 5-11 11 0 8 11 18 11 18s11-10 11-18c0-6-5-11-11-11Zm0 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" fill="#FF5E36"/>
  </svg>
);

const MiniIcon=({kind}:{kind:'rain'|'car'|'info'|'alert'})=>{
  if(kind==='rain') return <div style={{fontSize:52}}>🌧️</div>;
  if(kind==='car') return <div style={{fontSize:52}}>🚙</div>;
  if(kind==='alert') return <div style={{fontSize:52}}>⚠️</div>;
  return <div style={{fontSize:52}}>ⓘ</div>;
};

const PhoneMap=()=>(
  <div style={{width:158,height:252,borderRadius:28,background:'#fff',padding:12,boxShadow:'0 15px 35px #004a9740'}}>
    <div style={{height:'100%',borderRadius:20,background:'linear-gradient(145deg,#dff3ff,#cde9d5)',position:'relative',overflow:'hidden'}}>
      {[30,80,132,182].map((y)=>(
        <div key={y} style={{position:'absolute',left:-20,top:y,width:180,height:7,background:'#fff9',transform:'rotate(-13deg)'}}/>
      ))}
      <div style={{position:'absolute',left:45,top:78}}><Shield size={62}/></div>
    </div>
  </div>
);

const buildClipPlan=(media:MediaClip[],totalFrames:number,fps:number)=>{
  const plan:Array<{from:number;duration:number;clip:MediaClip}>=[];
  let cursor=0;
  let index=0;
  while(cursor<totalFrames){
    const clip=media[index%media.length];
    const seconds=clip.useDurationSeconds??Math.max(0.1,clip.durationSeconds-clip.startAtSeconds);
    const duration=Math.min(totalFrames-cursor,Math.max(1,Math.round(seconds*fps)));
    plan.push({from:cursor,duration,clip});
    cursor+=duration;
    index+=1;
  }
  return plan;
};

const MediaWindow=({p,durationInFrames}:{p:MachimamoVideoProps;durationInFrames:number})=>{
  const {fps}=useVideoConfig();
  const plan=buildClipPlan(p.media,durationInFrames,fps);
  return (
    <div style={{position:'absolute',left:0,top:338,width:1080,height:640,background:'#06131E',overflow:'hidden'}}>
      {plan.map((item,i)=>(
        <Sequence key={i} from={item.from} durationInFrames={item.duration} premountFor={15}>
          <AbsoluteFill style={{overflow:'hidden',background:'#071725'}}>
            <OffthreadVideo
              src={item.clip.url}
              trimBefore={Math.round(item.clip.startAtSeconds*fps)}
              muted={!p.audioAllowed}
              style={{width:'100%',height:'100%',objectFit:'cover',filter:'blur(26px) brightness(.55)',transform:'scale(1.10)'}}
            />
            <OffthreadVideo
              src={item.clip.url}
              trimBefore={Math.round(item.clip.startAtSeconds*fps)}
              muted={!p.audioAllowed}
              style={{width:'100%',height:'100%',objectFit:item.clip.fit,position:'absolute',inset:0}}
            />
          </AbsoluteFill>
        </Sequence>
      ))}
      <div style={{position:'absolute',left:24,top:24,background:'#071725c9',color:'#fff',borderRadius:14,padding:'12px 18px'}}>
        <div style={{fontWeight:900,fontSize:24}}>{p.mediaLabel}</div>
        {p.mediaSubLabel?<div style={{fontSize:18,opacity:.88,marginTop:3}}>{p.mediaSubLabel}</div>:null}
      </div>
      <div style={{position:'absolute',right:24,bottom:18,background:'#071725c0',color:'#fff',borderRadius:12,padding:'9px 14px',fontSize:16,fontWeight:700}}>
        映像：{p.mediaSourceName}
      </div>
    </div>
  );
};

const currentSummary=(p:MachimamoVideoProps,seconds:number)=>{
  let selected=p.summaryPhases[0];
  for(const phase of p.summaryPhases){
    if(phase.fromSeconds<=seconds) selected=phase;
  }
  return selected;
};

const NewsCard=({p,mainFrames}:{p:MachimamoVideoProps;mainFrames:number})=>{
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const seconds=frame/fps;
  const phase=currentSummary(p,seconds);
  const phaseFrame=frame-Math.round(phase.fromSeconds*fps);
  const summaryOpacity=interpolate(phaseFrame,[0,7],[0,1],{
    extrapolateLeft:'clamp',
    extrapolateRight:'clamp',
    easing:Easing.out(Easing.cubic)
  });
  const h1=p.headline1.length>18?46:54;
  const h2=p.headline2.length>18?45:53;

  return (
    <AbsoluteFill style={{fontFamily:baseFont,background:'#EEF6FB',color:C.ink}}>
      <div style={{position:'absolute',top:0,left:0,width:1080,height:108,background:'linear-gradient(90deg,#1596F2,#0873D9 62%,#0455AF)',color:'#fff'}}>
        <div style={{position:'absolute',left:26,top:18,display:'flex',alignItems:'center',gap:10}}>
          <Shield size={70}/>
          <div style={{fontSize:35,fontWeight:900}}>まちまも</div>
          <div style={{background:C.yellow,color:C.navy,borderRadius:16,padding:'8px 18px',fontSize:27,fontWeight:900}}>速報</div>
        </div>
        <div style={{position:'absolute',left:452,top:18,fontSize:25,fontWeight:900}}>{p.publishedAtLabel}</div>
        <div style={{position:'absolute',left:452,top:60,fontSize:16,opacity:.88}}>情報：{p.newsSourceName}　｜　映像：{p.mediaSourceName}</div>
        <div style={{position:'absolute',right:30,top:24,textAlign:'right',fontSize:17,fontWeight:800,lineHeight:1.35}}>まちの安心を<br/>もっと身近に</div>
      </div>

      <div style={{position:'absolute',left:18,top:122,width:1044,height:200,borderRadius:20,background:'#fff',border:'2px solid #DCEBF6',boxSizing:'border-box',padding:'24px 34px'}}>
        <div style={{fontSize:h1,fontWeight:900,lineHeight:1.12,color:'#172D40',whiteSpace:'nowrap'}}>{p.headline1}</div>
        <div style={{fontSize:h2,fontWeight:900,lineHeight:1.12,color:C.red,marginTop:10,whiteSpace:'nowrap'}}>{p.headline2}</div>
      </div>

      <MediaWindow p={p} durationInFrames={mainFrames}/>

      <div style={{position:'absolute',left:20,top:994,width:1040,height:220,borderRadius:18,background:'#fff',border:'2px solid #D9EAF5',boxSizing:'border-box',padding:'18px 28px'}}>
        <div style={{display:'inline-block',background:'#E7F4FF',color:C.blue2,borderRadius:20,padding:'7px 22px',fontSize:23,fontWeight:900}}>{phase.label}</div>
        <div style={{opacity:summaryOpacity,fontSize:30,fontWeight:700,lineHeight:1.55,marginTop:16,color:C.ink}}>{phase.text}</div>
      </div>

      <div style={{position:'absolute',left:20,top:1230,width:1040,height:64,borderRadius:17,background:'#FFF1A9',border:'2px solid #FFDC55'}}>
        <div style={{position:'absolute',left:18,top:8,fontSize:38}}>⚠️</div>
        <div style={{position:'absolute',left:73,top:12,fontSize:31,fontWeight:900,color:C.navy}}>注意ポイント</div>
        <div style={{position:'absolute',right:28,top:17,fontSize:22,fontWeight:800,color:C.blue2}}>身の安全を最優先に行動しましょう</div>
      </div>

      <div style={{position:'absolute',left:20,top:1308,width:1040,height:242,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
        {p.safetyPoints.map((pt,i)=>(
          <div key={i} style={{position:'relative',borderRadius:17,background:'#fff',border:'2px solid #D1E6F5',padding:'20px 19px'}}>
            <div style={{position:'absolute',left:20,top:17}}><MiniIcon kind={pt.icon}/></div>
            <div style={{marginLeft:74,fontSize:27,fontWeight:900,lineHeight:1.25,whiteSpace:'pre-line'}}>{pt.title}</div>
            <div style={{position:'absolute',left:20,right:20,bottom:19,fontSize:18,lineHeight:1.35,color:C.muted,fontWeight:700}}>・{pt.detail}</div>
          </div>
        ))}
      </div>

      <div style={{position:'absolute',left:0,bottom:0,width:1080,height:352,background:'linear-gradient(100deg,#0B95F2,#0668D2 64%,#0556B7)',color:'#fff'}}>
        <div style={{position:'absolute',left:54,top:46}}><PhoneMap/></div>
        <div style={{position:'absolute',left:270,top:52,fontSize:39,fontWeight:900}}>{p.mapCtaTitle}</div>
        <div style={{position:'absolute',left:270,top:112,fontSize:52,fontWeight:900,color:C.yellow}}>{p.mapCtaText}</div>
        <div style={{position:'absolute',left:270,top:202,border:'2px solid #8FD2FF',borderRadius:35,padding:'13px 36px',fontSize:24,fontWeight:900}}>{p.profileCta} ›</div>
        <div style={{position:'absolute',right:50,top:66,width:180,height:180,borderRadius:90,background:'#fff',display:'grid',placeItems:'center',boxShadow:'0 16px 40px #003f8a55'}}>
          <Shield size={112}/>
        </div>
        <div style={{position:'absolute',right:42,bottom:28,fontSize:17,fontWeight:800,opacity:.92}}>いいね　保存　シェア　フォロー</div>
        {p.attributionRequired&&p.attributionText?(
          <div style={{position:'absolute',left:28,bottom:14,fontSize:11,opacity:.72,maxWidth:760}}>{p.attributionText}</div>
        ):null}
      </div>
    </AbsoluteFill>
  );
};

const EndCard=({p,fadeInFrames}:{p:MachimamoVideoProps;fadeInFrames:number})=>{
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const opacity=interpolate(frame,[0,fadeInFrames],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const pop=spring({frame,fps,config:{damping:15,mass:.7,stiffness:130}});
  const rise=interpolate(frame,[8,24],[30,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return (
    <AbsoluteFill style={{fontFamily:baseFont,background:'linear-gradient(155deg,#F7FCFF 0%,#E8F6FF 48%,#D9F0FF 100%)',opacity,color:C.ink}}>
      <div style={{position:'absolute',width:760,height:760,borderRadius:380,background:'#B7E4FF55',left:-300,top:-260}}/>
      <div style={{position:'absolute',width:680,height:680,borderRadius:340,background:'#94D7FF50',right:-280,bottom:-220}}/>

      <div style={{position:'absolute',top:170,left:0,right:0,textAlign:'center',transform:'scale(' + (.8+.2*pop) + ')'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:20}}>
          <Shield size={118}/>
          <span style={{fontSize:66,fontWeight:900,color:C.blue2}}>まちまも</span>
        </div>
        <div style={{fontSize:25,fontWeight:800,color:C.muted,marginTop:10}}>まちの安心を、みんなでつくる</div>
      </div>

      <div style={{position:'absolute',top:520,left:80,right:80,textAlign:'center',fontSize:58,lineHeight:1.3,fontWeight:900,color:C.navy,transform:'translateY(' + rise + 'px)'}}>
        最後まで見ていただき<br/><span style={{color:C.blue}}>ありがとうございます！</span>
      </div>

      <div style={{position:'absolute',top:820,left:55,right:55,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
        {[
          ['🔖','保存','あとで確認'],
          ['👨‍👩‍👧','家族に共有','大切な人にも'],
          ['＋','フォロー','最新情報を確認']
        ].map(([icon,title,sub])=>(
          <div key={title} style={{height:250,borderRadius:28,background:'#fff',border:'2px solid #D4E9F7',boxShadow:'0 16px 40px #1771a617',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <div style={{fontSize:62}}>{icon}</div>
            <div style={{fontSize:31,fontWeight:900,color:C.navy,marginTop:12}}>{title}</div>
            <div style={{fontSize:19,fontWeight:700,color:C.muted,marginTop:8}}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{position:'absolute',left:74,right:74,top:1180,height:320,borderRadius:36,background:'linear-gradient(100deg,#0C94EF,#0561C7)',boxShadow:'0 20px 50px #075c9b30',color:'#fff'}}>
        <div style={{position:'absolute',left:45,top:48}}><PhoneMap/></div>
        <div style={{position:'absolute',left:245,top:70,fontSize:35,fontWeight:900}}>{p.mapCtaTitle}</div>
        <div style={{position:'absolute',left:245,top:132,fontSize:49,fontWeight:900,color:C.yellow}}>{p.mapCtaText}</div>
        <div style={{position:'absolute',left:245,top:222,fontSize:22,fontWeight:800,border:'2px solid #8CD4FF',borderRadius:28,padding:'10px 24px'}}>{p.profileCta} ›</div>
      </div>

      <div style={{position:'absolute',bottom:165,left:0,right:0,textAlign:'center',fontSize:25,fontWeight:900,color:C.navy}}>保存して家族に共有　｜　リンクはプロフィールから</div>
      <div style={{position:'absolute',bottom:70,left:0,right:0,textAlign:'center',fontSize:20,fontWeight:700,color:C.muted}}>知ることで、守れるまちがある。</div>
    </AbsoluteFill>
  );
};

export const MachimamoVideo:React.FC<MachimamoVideoProps>=(p)=>{
  const {fps,durationInFrames}=useVideoConfig();
  const endFrames=Math.round(p.endCardSeconds*fps);
  const mainFrames=Math.max(1,durationInFrames-endFrames);
  const transition=8;

  return (
    <AbsoluteFill>
      <Sequence durationInFrames={mainFrames}>
        <NewsCard p={p} mainFrames={mainFrames}/>
      </Sequence>
      <Sequence from={Math.max(0,mainFrames-transition)} durationInFrames={endFrames+transition}>
        <EndCard p={p} fadeInFrames={transition}/>
      </Sequence>
    </AbsoluteFill>
  );
};
