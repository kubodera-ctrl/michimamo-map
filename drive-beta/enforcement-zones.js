(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MachimamoDriveZones=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SOURCE_INDEX='https://www.keishicho.metro.tokyo.lg.jp/kotsu/jikoboshi/torikumi/sokudokanri/torishimari.html';
  const SOURCE_PDF='https://www.keishicho.metro.tokyo.lg.jp/sokudo_sisin/1/tokyowangan_sokudo.pdf';

  const TOKYO_WANGAN_ZONES=[
    {id:'wangan-r357',route:'国道357号',kind:'metropolitan',speedKmh:60,startLabel:'荒川河口橋上',endLabel:'京浜大橋上',startMinute:360,endMinute:1440},
    {id:'wangan-harumi',route:'晴海通り',kind:'metropolitan',speedKmh:50,startLabel:'東雲交差点',endLabel:'東雲橋上',startMinute:840,endMinute:1320},
    {id:'wangan-meiji',route:'明治通り',kind:'metropolitan',speedKmh:50,startLabel:'夢の島交差点',endLabel:'夢の島大橋上',startMinute:720,endMinute:960},
    {id:'wangan-mitsume',route:'三ツ目通り',kind:'metropolitan',speedKmh:50,startLabel:'辰巳交差点',endLabel:'七枝橋上',startMinute:840,endMinute:1080},
    {
      id:'wangan-kan2',route:'環二通り',kind:'metropolitan',speedKmh:60,startLabel:'有明北橋上',endLabel:'有明中央橋南交差点',startMinute:1200,endMinute:1440,
      geometryQuality:'approximate_beta',
      geometry:[
        [35.6443,139.7859],[35.6424,139.7886],[35.6399,139.7918],[35.6372,139.7939],[35.6346,139.7954]
      ]
    },
    {id:'wangan-rinko',route:'臨港道路',kind:'metropolitan',speedKmh:50,startLabel:'京浜大橋北交差点',endLabel:'中央防波堤交差点',startMinute:360,endMinute:1200,note:'東京ゲートブリッジ上は60km/h表記あり'},
    {
      id:'wangan-miyako',route:'都橋通り',kind:'station',speedKmh:50,startLabel:'東雲1丁目交差点',endLabel:'台場駅前交差点',startMinute:420,endMinute:960,
      geometryQuality:'approximate_beta',
      geometry:[
        [35.6454,139.8027],[35.6423,139.7984],[35.6381,139.7936],[35.6340,139.7877],[35.6301,139.7815],[35.6268,139.7768]
      ]
    }
  ].map(zone=>Object.freeze({
    agency:'警視庁',
    policeStation:'東京湾岸警察署',
    sourceIndexUpdatedAt:'2026-07-30',
    sourceIndex:SOURCE_INDEX,
    sourcePdf:SOURCE_PDF,
    ...zone
  }));

  function minutesInTokyo(date=new Date()){
    const parts=new Intl.DateTimeFormat('en-GB',{
      timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false
    }).formatToParts(date);
    const hour=Number(parts.find(p=>p.type==='hour')?.value||0)%24;
    const minute=Number(parts.find(p=>p.type==='minute')?.value||0);
    return hour*60+minute;
  }

  function isMinuteInWindow(minute,startMinute,endMinute){
    if(startMinute===endMinute)return true;
    if(endMinute===1440)return minute>=startMinute;
    if(endMinute>startMinute)return minute>=startMinute&&minute<endMinute;
    return minute>=startMinute||minute<endMinute;
  }

  function isZoneActive(zone,date=new Date()){
    return isMinuteInWindow(minutesInTokyo(date),zone.startMinute,zone.endMinute);
  }

  function formatMinute(minute){
    if(minute===1440)return '24:00';
    const h=Math.floor(minute/60),m=minute%60;
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
  }

  function formatWindow(zone){
    return formatMinute(zone.startMinute)+'〜'+formatMinute(zone.endMinute);
  }

  function distanceMeters(a,b){
    const R=6371000;
    const p1=a[0]*Math.PI/180,p2=b[0]*Math.PI/180;
    const dp=(b[0]-a[0])*Math.PI/180,dl=(b[1]-a[1])*Math.PI/180;
    const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  }

  function distancePointToSegmentMeters(point,a,b){
    const R=6371000;
    const originLat=((point[0]+a[0]+b[0])/3)*Math.PI/180;
    const project=p=>[
      p[1]*Math.PI/180*R*Math.cos(originLat),
      p[0]*Math.PI/180*R
    ];
    const p=project(point),pa=project(a),pb=project(b);
    const vx=pb[0]-pa[0],vy=pb[1]-pa[1],wx=p[0]-pa[0],wy=p[1]-pa[1];
    const len2=vx*vx+vy*vy;
    if(len2===0)return Math.hypot(wx,wy);
    const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/len2));
    return Math.hypot(p[0]-(pa[0]+t*vx),p[1]-(pa[1]+t*vy));
  }

  function distanceToPolylineMeters(point,geometry){
    if(!Array.isArray(geometry)||geometry.length===0)return Infinity;
    if(geometry.length===1)return distanceMeters(point,geometry[0]);
    let best=Infinity;
    for(let i=1;i<geometry.length;i++){
      best=Math.min(best,distancePointToSegmentMeters(point,geometry[i-1],geometry[i]));
    }
    return best;
  }

  return Object.freeze({
    SOURCE_INDEX,SOURCE_PDF,TOKYO_WANGAN_ZONES,
    minutesInTokyo,isMinuteInWindow,isZoneActive,formatWindow,distanceMeters,distancePointToSegmentMeters,distanceToPolylineMeters
  });
});
