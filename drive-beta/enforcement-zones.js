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
    const primaryWithException=values.length>1&&/\([^)]*\d[^)]*\)/.test(speedLimitText);
    const ambiguous=values.length>1&&!primaryWithException;
    return {
      speedKmh:ambiguous?null:values[0],
      speedLimitText,
      speedLimitKind:values.length===1?'EXACT':(primaryWithException?'PRIMARY_WITH_EXCEPTION':'MULTIPLE_OR_RANGE'),
      speedLimitValuesKmh:Object.freeze(values),
      alternateSpeedKmh:Object.freeze(primaryWithException?values.slice(1):[])
    };
  }

  function normalizeBundle(bundle){
    if(!bundle?.source||!Array.isArray(bundle.records))throw new Error('invalid_bundle');
    if(bundle.source.freshnessStatus!=='CURRENT')return [];
    const endpoints=bundle.geometryCandidates||{};
    const records=bundle.records.flatMap(raw=>{
      const segments=Array.isArray(raw?.segments)?raw.segments:[];
      if(!segments.length)return [raw];
      if(raw.speedLimitText||raw.segmentStartText||raw.segmentEndText){
        throw new Error('segmented_parent_must_not_define_geometry:'+raw.externalId);
      }
      return segments.map((segment,index)=>({
        ...raw,
        ...segment,
        externalId:clean(segment.externalId),
        sourceRecordKey:clean(raw.sourceRecordKey)||raw.externalId,
        sourceSubrecordKey:clean(segment.sourceSubrecordKey)||String(index+1),
        segments:undefined
      }));
    });
    const seen=new Set();
    return records.map(raw=>{
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
        endpointVerified:pair?.endpointVerification?.status==='CROSS_CHECKED',
        routeMatchTokens:Object.freeze([...(pair?.routeMatchTokens||[])].map(clean).filter(Boolean)),
        geometryQuality:pair
          ?(pair?.endpointVerification?.status==='CROSS_CHECKED'?'road_route_endpoint_crosschecked':'road_routed_beta_candidate')
          :null,
        geometryStatus:pair
          ?(pair?.endpointVerification?.status==='CROSS_CHECKED'?'ENDPOINTS_CROSSCHECKED':'ENDPOINTS_CANDIDATE')
          :'UNRESOLVED',
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
        endpointVerified:event.endpointVerified===true,
        routeMatchTokens:Object.freeze([...(event.routeMatchTokens||[])].map(clean).filter(Boolean)),
        geometryQuality:Array.isArray(event.routeEndpoints)
          ?(event.endpointVerified===true?'road_route_endpoint_crosschecked':'road_routed_beta_candidate')
          :null,
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

  function normalizeRoadToken(value){
    return clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
  }

  function osrmRouteSignature(payload){
    const values=[];
    for(const route of Array.isArray(payload?.routes)?payload.routes:[]){
      for(const leg of Array.isArray(route?.legs)?route.legs:[]){
        for(const step of Array.isArray(leg?.steps)?leg.steps:[]){
          for(const value of [step?.name,step?.ref]){
            const normalized=normalizeRoadToken(value);
            if(normalized)values.push(normalized);
          }
        }
      }
    }
    return Object.freeze([...new Set(values)]);
  }

  function roadValueMatchesExpected(value,expected){
    const normalized=normalizeRoadToken(value);
    return normalized?expected.includes(normalized):false;
  }

  function routeStepMatchesExpected(step,expected){
    const candidates=[];
    const name=normalizeRoadToken(step?.name);
    if(name)candidates.push(name);
    for(const part of clean(step?.ref).split(/[;,/／|]+/)){
      const normalized=normalizeRoadToken(part);
      if(normalized)candidates.push(normalized);
    }
    if(!candidates.length)return false;
    return candidates.some(value=>expected.includes(value));
  }

  function routeMatchesExpected(payload,expectedTokens){
    const expected=[...new Set((Array.isArray(expectedTokens)?expectedTokens:[])
      .map(normalizeRoadToken).filter(Boolean))];
    if(!expected.length)return false;

    const routes=Array.isArray(payload?.routes)?payload.routes:[];
    if(!routes.length)return false;
    let sawStep=false;
    for(const route of routes){
      for(const leg of Array.isArray(route?.legs)?route.legs:[]){
        for(const step of Array.isArray(leg?.steps)?leg.steps:[]){
          sawStep=true;
          if(!routeStepMatchesExpected(step,expected))return false;
        }
      }
    }
    if(!sawStep)return false;

    const waypoints=Array.isArray(payload?.waypoints)?payload.waypoints:[];
    if(waypoints.length<2)return false;
    const first=waypoints[0],last=waypoints[waypoints.length-1];
    return roadValueMatchesExpected(first?.name,expected)&&roadValueMatchesExpected(last?.name,expected);
  }

  return Object.freeze({
    clean,parseClock,parseSpeed,normalizeBundle,normalizeSnapshot,
    minutesInTokyo,isMinuteInWindow,isZoneActive,formatWindow,
    distanceMeters,distancePointToSegmentMeters,distanceToPolylineMeters,
    normalizeRoadToken,osrmRouteSignature,routeMatchesExpected
  });
});
