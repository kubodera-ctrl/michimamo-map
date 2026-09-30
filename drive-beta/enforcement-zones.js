(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MachimamoDriveZones=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function clean(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}

  function parseClock(value){
    const v=clean(value),m=/^(\d{1,2}):(\d{2})$/.exec(v);
    if(!m)throw new Error('invalid_time:'+v);
    const h=Number(m[1]),min=Number(m[2]);
    if((h<0||h>24)||min<0||min>59||(h===24&&min!==0))throw new Error('invalid_time:'+v);
    return h*60+min;
  }

  function parseSpeed(value){
    const speedLimitText=clean(value);
    const values=[...speedLimitText.matchAll(/(\d+)/g)].map(m=>Number(m[1]));
    if(!values.length)throw new Error('invalid_speed:'+speedLimitText);
    return {
      speedKmh:values[0],
      speedLimitText,
      alternateSpeedKmh:Object.freeze(values.slice(1))
    };
  }

  function normalizeBundle(bundle){
    if(!bundle?.source||!Array.isArray(bundle.records))throw new Error('invalid_bundle');
    if(bundle.source.freshnessStatus!=='CURRENT')return [];
    const endpoints=bundle.geometryCandidates||{};
    const seen=new Set();
    return bundle.records.map(raw=>{
      if(!raw.externalId||seen.has(raw.externalId))throw new Error('duplicate_or_missing_event');
      seen.add(raw.externalId);
      const pair=endpoints[raw.externalId];
      const speed=parseSpeed(raw.speedLimitText);
      const startMinute=parseClock(raw.timeStart),endMinute=parseClock(raw.timeEnd);
      if(endMinute<=startMinute&&endMinute!==1440)throw new Error('invalid_time_window');
      return Object.freeze({
        id:raw.externalId,
        route:clean(raw.routeName),
        focusType:raw.focusType,
        ...speed,
        startLabel:clean(raw.segmentStartText),
        endLabel:clean(raw.segmentEndText),
        startMinute,
        endMinute,
        roadScope:raw.roadScope,
        geoPrecision:raw.segmentStartText&&raw.segmentEndText?'EXACT_SEGMENT':'ROAD_AREA',
        displayMode:raw.segmentStartText&&raw.segmentEndText?'EXACT_SEGMENT_TIMED':'ROAD_AREA_TIMED',
        routeEndpoints:pair?Object.freeze([pair.start,pair.end]):null,
        geometryQuality:pair?'road_routed_beta_candidate':null,
        geometryVerified:false,
        agency:bundle.source.policeOrg,
        policeStation:bundle.source.stationName,
        sourceVerifiedAt:bundle.source.verifiedAt,
        sourceIndex:bundle.source.sourceIndexUrl,
        sourcePdf:bundle.source.sourceUrl,
        parserVersion:bundle.source.parserVersion,
        freshnessStatus:bundle.source.freshnessStatus,
        note:clean(raw.note)||null
      });
    });
  }

  function normalizeSnapshot(snapshot){
    if(!snapshot||!Array.isArray(snapshot.events))throw new Error('invalid_snapshot');
    if(snapshot.freshnessStatus!=='CURRENT')return [];
    const seen=new Set();
    return snapshot.events.map(event=>{
      if(!event.id||seen.has(event.id))throw new Error('duplicate_or_missing_event');
      seen.add(event.id);
      if(event.geoPrecision!=='EXACT_SEGMENT'||event.timePrecision!=='EXACT_TIME')throw new Error('unsupported_preview_precision');
      const startMinute=Number(event.timeStartMinutes),endMinute=Number(event.timeEndMinutes);
      if(!Number.isInteger(startMinute)||!Number.isInteger(endMinute)||startMinute<0||endMinute>1440||endMinute<=startMinute)throw new Error('invalid_snapshot_time');
      return Object.freeze({
        id:event.id,
        route:clean(event.routeName),
        focusType:event.focusType,
        speedKmh:Number(event.speedLimitKmh),
        speedLimitText:clean(event.speedLimitText),
        alternateSpeedKmh:Object.freeze([...(event.alternateSpeedKmh||[])]),
        startLabel:clean(event.segmentStartText),
        endLabel:clean(event.segmentEndText),
        startMinute,
        endMinute,
        roadScope:'SEGMENT',
        geoPrecision:event.geoPrecision,
        displayMode:event.displayMode,
        routeEndpoints:Array.isArray(event.routeEndpoints)?Object.freeze(event.routeEndpoints.map(point=>Object.freeze([...point]))):null,
        geometryQuality:Array.isArray(event.routeEndpoints)?'road_routed_beta_candidate':null,
        geometryStatus:event.geometryStatus,
        geometryVerified:event.geometryVerified===true,
        agency:event.agency,
        policeStation:event.policeStation,
        sourceVerifiedAt:event.sourceVerifiedAt,
        sourceIndex:snapshot.sourceIndexUrl,
        sourcePdf:event.sourceUrl||snapshot.sourceUrl,
        parserVersion:null,
        freshnessStatus:event.freshnessStatus,
        note:null
      });
    });
  }

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
    clean,parseClock,parseSpeed,normalizeBundle,normalizeSnapshot,
    minutesInTokyo,isMinuteInWindow,isZoneActive,formatWindow,
    distanceMeters,distancePointToSegmentMeters,distanceToPolylineMeters
  });
});
