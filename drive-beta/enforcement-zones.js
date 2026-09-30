(function(root,factory){
  const api=factory(root.MachimamoDriveTokyoSnapshot);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MachimamoDriveZones=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(snapshot){
  'use strict';

  const SOURCE_INDEX='https://www.keishicho.metro.tokyo.lg.jp/kotsu/jikoboshi/torikumi/sokudokanri/torishimari.html';
  const SOURCE_PDF='https://www.keishicho.metro.tokyo.lg.jp/sokudo_sisin/1/tokyowangan_sokudo.pdf';

  const ID_BY_ROUTE=Object.freeze({
    '国道357号':'wangan-r357',
    '晴海通り':'wangan-harumi',
    '明治通り':'wangan-meiji',
    '三ツ目通り':'wangan-mitsume',
    '環二通り':'wangan-kan2',
    '臨港道路':'wangan-rinko',
    '都橋通り':'wangan-miyako'
  });

  // Geometry is deliberately separate from official-source facts.
  // These endpoint coordinates are PREVIEW candidates that are road-routed at runtime.
  // They are not part of the police source and must not be promoted as verified geometry
  // until map/road QA confirms the official start/end labels resolve correctly.
  const GEOMETRY_CANDIDATES=Object.freeze({
    'wangan-r357':Object.freeze({
      routeEndpoints:Object.freeze([[35.647526,139.845068],[35.575405,139.748282]]),
      geometryQuality:'road_routed_beta_candidate',
      geometryVerified:false
    }),
    'wangan-kan2':Object.freeze({
      routeEndpoints:Object.freeze([[35.642054,139.787168],[35.6352293,139.7926317]]),
      geometryQuality:'road_routed_beta_candidate',
      geometryVerified:false
    })
  });

  const sourceEvents=Array.isArray(snapshot?.events)?snapshot.events:[];
  const TOKYO_WANGAN_ZONES=Object.freeze(sourceEvents.map(event=>{
    const id=ID_BY_ROUTE[event.routeName];
    if(!id)throw new Error('unknown_tokyo_wangan_route');
    const geometry=GEOMETRY_CANDIDATES[id]||{};
    return Object.freeze({
      id,
      eventId:event.eventId,
      route:event.routeName,
      kind:event.enforcementClass==='STATION_FOCUS'?'station':'metropolitan',
      speedKmh:event.speedLimitKmh,
      speedText:event.speedLimitText,
      alternateSpeedKmh:Object.freeze([...(event.alternateSpeedKmh||[])]),
      startLabel:event.segmentStartText,
      endLabel:event.segmentEndText,
      startMinute:event.startMinute,
      endMinute:event.endMinute,
      agency:event.agency,
      policeStation:event.policeStation,
      sourceVerifiedAt:event.sourceVerifiedAt,
      sourceIndex:SOURCE_INDEX,
      sourcePdf:event.sourceUrl||SOURCE_PDF,
      geoPrecision:event.geoPrecision,
      timePrecision:event.timePrecision,
      displayMode:event.displayMode,
      freshnessStatus:event.freshnessStatus,
      ...geometry
    });
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
    SOURCE_INDEX,SOURCE_PDF,TOKYO_WANGAN_ZONES,GEOMETRY_CANDIDATES,
    minutesInTokyo,isMinuteInWindow,isZoneActive,formatWindow,distanceMeters,distancePointToSegmentMeters,distanceToPolylineMeters
  });
});
