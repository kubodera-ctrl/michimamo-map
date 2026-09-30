(()=>{
'use strict';

const SUPABASE_URL='https://ckftozjhdszlwqnylmxv.supabase.co';
const SUPABASE_KEY='sb_publishable_NpF8BeMCuhcjxu4b-eey7w_xxvimWJ8';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const zonesApi=window.MachimamoDriveZones;
let enforcementZones=[];
let publicSchedule=null;
let focusLocations=null;
let scheduleTab='public';
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView([35.6335,139.7875],14);
L.control.zoom({position:'bottomleft'}).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

const enforcementLayer=L.layerGroup().addTo(map);
const accidentLayer=L.layerGroup().addTo(map);
const publicScheduleLayer=L.layerGroup().addTo(map);
const focusLocationLayer=L.layerGroup().addTo(map);
const zoneLines=new Map();
const publicTodayMarkers=[];
const resolvedGeometries=new Map();
let enforcementVisible=true,accidentVisible=false,flashOn=true,userMarker=null,lastPosition=null,watchId=null;
let accidentRequest=0,lastAlert={route:null,at:0};
let panelTouchStartY=null,panelSwipeConsumed=false;

const enforcementToggle=document.getElementById('enforcementToggle');
const accidentToggle=document.getElementById('accidentToggle');
const scheduleToggle=document.getElementById('scheduleToggle');
const schedulePanel=document.getElementById('schedulePanel');
const scheduleClose=document.getElementById('scheduleClose');
const scheduleList=document.getElementById('scheduleList');
const schedulePeriod=document.getElementById('schedulePeriod');
const scheduleSource=document.getElementById('scheduleSource');
const scheduleFootCopy=document.getElementById('scheduleFootCopy');
const schedulePublicTab=document.getElementById('schedulePublicTab');
const scheduleFocusTab=document.getElementById('scheduleFocusTab');
const scheduleDayBanner=document.getElementById('scheduleDayBanner');
const scheduleDayTitle=document.getElementById('scheduleDayTitle');
const scheduleDayCopy=document.getElementById('scheduleDayCopy');
const locationBtn=document.getElementById('locationBtn');
const alertBox=document.getElementById('proximityAlert');
const alertTitle=document.getElementById('alertTitle');
const alertBody=document.getElementById('alertBody');
const statusTitle=document.getElementById('statusTitle');
const statusCopy=document.getElementById('statusCopy');
const stateDot=document.getElementById('stateDot');
const jstClock=document.getElementById('jstClock');
const appRoot=document.getElementById('app');
const statusPanel=document.getElementById('statusPanel');
const statusPanelHandle=document.getElementById('statusPanelHandle');
const statusPanelDetails=document.getElementById('statusPanelDetails');

function setStatusPanelExpanded(expanded){
  const open=expanded===true;
  statusPanel.classList.toggle('collapsed',!open);
  statusPanel.dataset.state=open?'expanded':'collapsed';
  statusPanelHandle.setAttribute('aria-expanded',String(open));
  statusPanelHandle.setAttribute('aria-label',open?'詳細を閉じる':'詳細を表示');
  statusPanelDetails.setAttribute('aria-hidden',String(!open));
  appRoot.classList.toggle('status-panel-expanded',open);
}

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function activeZones(){return enforcementZones.filter(z=>zonesApi.isZoneActive(z));}

function enforcementLabelMode(zoom=map.getZoom()){
  if(zoom>=14)return 'detail';
  if(zoom>=13)return 'compact';
  return 'marker';
}

function enforcementLineWeights(zoom=map.getZoom()){
  if(zoom>=14)return Object.freeze({active:6,inactive:4,flashOn:6,flashOff:4});
  if(zoom>=13)return Object.freeze({active:4,inactive:3,flashOn:4,flashOff:3});
  return Object.freeze({active:3,inactive:2,flashOn:3,flashOff:2});
}

function zoneLabelHtml(zone,active,mode){
  if(mode==='compact'){
    return '<div class="zone-label-title">'+esc(zone.route)+'</div>';
  }
  if(mode!=='detail')return '';
  return '<div class="zone-label-title">'+esc(zone.route)+'</div>'+
    '<div class="zone-label-time">'+(active?'現在重点 '+esc(zonesApi.formatWindow(zone)):esc(zonesApi.formatWindow(zone)))+'</div>';
}

function zoneMarkerPoint(geometry){
  return geometry[Math.floor((geometry.length-1)/2)]||geometry[0];
}

function zonePopup(zone){
  const active=zonesApi.isZoneActive(zone);
  const routed=resolvedGeometries.has(zone.id);
  return '<div class="popup-title">🚓 '+esc(zone.route)+'</div>'+
    '<div class="popup-status '+(active?'on':'off')+'">'+(active?'現在、重点時間帯':'重点時間帯外')+'</div>'+
    '<div class="popup-line">'+esc(zone.startLabel)+' 〜 '+esc(zone.endLabel)+'</div>'+
    '<div class="popup-line">重点時間 '+esc(zonesApi.formatWindow(zone))+' ／ 規制速度 '+esc(zone.speedKmh)+'km/h</div>'+
    (routed?'<div class="popup-note">始終点を外部資料で照合し、実道路ルーティングへ追従させたQA前の候補線です。</div>':'')+
    '<div class="popup-note">警視庁が公表する速度取締重点路線・重点時間帯です。現在その場所で取締りを実施中であることを示すものではありません。</div>'+
    '<a class="popup-source" href="'+esc(zone.sourcePdf)+'" target="_blank" rel="noopener noreferrer">出典：警視庁 東京湾岸警察署速度取締指針</a>';
}

function renderEnforcement(){
  enforcementLayer.clearLayers();zoneLines.clear();
  if(!enforcementVisible)return;
  const labelMode=enforcementLabelMode();
  const lineWeights=enforcementLineWeights();
  for(const zone of enforcementZones){
    const geometry=resolvedGeometries.get(zone.id);
    if(!geometry)continue;
    const active=zonesApi.isZoneActive(zone);
    const popupHtml=zonePopup(zone);
    const line=L.polyline(geometry,{
      color:active?'#dc2626':'#f59e0b',
      weight:active?lineWeights.active:lineWeights.inactive,
      opacity:active?.9:.72,
      dashArray:active?null:'10 8',
      lineCap:'round'
    }).bindPopup(popupHtml,{autoClose:false,closeOnClick:false});
    line.addTo(enforcementLayer);

    let marker=null;
    if(labelMode==='marker'){
      marker=L.circleMarker(zoneMarkerPoint(geometry),{
        radius:active?6:5,
        color:'#fff',
        weight:2,
        fillColor:active?'#dc2626':'#f59e0b',
        fillOpacity:.96
      }).bindPopup(popupHtml,{autoClose:false,closeOnClick:false});
      marker.addTo(enforcementLayer);
    }else{
      const classes=['drive-zone-label'];
      if(active)classes.push('active');
      if(labelMode==='compact')classes.push('compact');
      line.bindTooltip(
        zoneLabelHtml(zone,active,labelMode),
        {permanent:true,direction:'center',className:classes.join(' '),opacity:1}
      );
    }
    zoneLines.set(zone.id,{zone,line,marker});
  }
  updateStatus();
}

async function resolveRoadGeometry(zone){
  if(!zone.endpointVerified||!zone.routeEndpoints||zone.routeEndpoints.length!==2)return null;
  if(!Array.isArray(zone.routeMatchTokens)||!zone.routeMatchTokens.length)return null;
  const [[lat1,lng1],[lat2,lng2]]=zone.routeEndpoints;
  const url='https://router.project-osrm.org/route/v1/driving/'+
    encodeURIComponent(lng1+','+lat1+';'+lng2+','+lat2)+
    '?overview=full&geometries=geojson&steps=true';
  try{
    const response=await fetch(url,{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('route_http_'+response.status);
    const payload=await response.json();
    if(!zonesApi.routeMatchesExpected(payload,zone.routeMatchTokens)){
      throw new Error('route_signature_mismatch');
    }
    const coords=payload?.routes?.[0]?.geometry?.coordinates;
    if(!Array.isArray(coords)||coords.length<2)throw new Error('route_geometry_missing');
    return coords.map(([lng,lat])=>[lat,lng]);
  }catch(error){
    console.warn('DRIVE beta road routing failed',zone.id,error);
    return null;
  }
}

async function hydrateRoadGeometries(){
  const routable=enforcementZones.filter(z=>
    z.endpointVerified===true&&Array.isArray(z.routeEndpoints)&&z.routeMatchTokens.length>0
  );
  const results=await Promise.all(routable.map(async zone=>[zone.id,await resolveRoadGeometry(zone)]));
  for(const [id,geometry] of results){
    if(Array.isArray(geometry)&&geometry.length>1)resolvedGeometries.set(id,geometry);
  }
  renderEnforcement();
  checkProximity();
}

function updateStatus(){
  const now=new Date();
  const fmt=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false});
  jstClock.textContent=fmt.format(now)+' JST';
  const active=activeZones();
  const mappedActive=active.filter(z=>resolvedGeometries.has(z.id));
  enforcementToggle.classList.toggle('active-now',mappedActive.length>0);
  stateDot.classList.toggle('live',active.length>0);
  if(active.length){
    statusTitle.textContent='現在、'+active.length+'重点区間が警視庁の重点時間帯';
    statusCopy.textContent=active.map(z=>z.route+' '+zonesApi.formatWindow(z)).join(' ／ ')+'。実施中の断定ではありません。';
  }else{
    statusTitle.textContent='現在、収録路線は重点時間帯外';
    statusCopy.textContent='重点区間は橙色で表示します。実際の取締りは公表時間帯以外にも行われる場合があります。';
  }
}

function flashTick(){
  flashOn=!flashOn;
  const lineWeights=enforcementLineWeights();
  for(const {zone,line} of zoneLines.values()){
    if(!zonesApi.isZoneActive(zone))continue;
    line.setStyle({opacity:flashOn?.92:.30,weight:flashOn?lineWeights.flashOn:lineWeights.flashOff});
  }
  for(const marker of publicTodayMarkers){
    marker.setStyle({opacity:flashOn?1:.35,fillOpacity:flashOn?.96:.18});
  }
}

function renderUserPosition(coords){
  lastPosition=[coords.latitude,coords.longitude];
  if(!userMarker){
    userMarker=L.circleMarker(lastPosition,{radius:9,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1}).addTo(map);
  }else userMarker.setLatLng(lastPosition);
  if(publicSchedule||focusLocations)renderSchedulePanel();
  checkProximity();
}

function checkProximity(){
  if(!lastPosition||!enforcementVisible)return;
  const candidates=enforcementZones
    .filter(z=>resolvedGeometries.has(z.id)&&zonesApi.isZoneActive(z))
    .map(z=>({zone:z,d:zonesApi.distanceToPolylineMeters(lastPosition,resolvedGeometries.get(z.id))}))
    .filter(x=>x.d<=500)
    .sort((a,b)=>a.d-b.d);
  if(!candidates.length)return;
  const hit=candidates[0],now=Date.now();
  if(lastAlert.route===hit.zone.route&&now-lastAlert.at<10*60*1000)return;
  lastAlert={route:hit.zone.route,at:now};
  alertTitle.textContent='この先、速度取締重点区間です';
  alertBody.textContent=hit.zone.route+'／重点時間 '+zonesApi.formatWindow(hit.zone)+'／約'+Math.max(50,Math.round(hit.d/50)*50)+'m以内。実際の取締実施を示すものではありません。';
  alertBox.classList.add('show');
}

function startLocation(){
  if(!navigator.geolocation){
    statusCopy.textContent='この端末では位置情報を利用できません。';
    return;
  }
  if(watchId!==null)return;
  watchId=navigator.geolocation.watchPosition(
    pos=>renderUserPosition(pos.coords),
    err=>{statusCopy.textContent='位置情報を取得できませんでした（'+esc(err.message)+'）。';},
    {enableHighAccuracy:true,maximumAge:5000,timeout:12000}
  );
}

function tokyoDateKey(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(date);
  const part=type=>parts.find(p=>p.type===type)?.value||'';
  return part('year')+'-'+part('month')+'-'+part('day');
}

function scheduleTimeLabel(event){
  if(event.validDate)return event.validDate;
  if(event.timeText)return event.timeText;
  if(event.timePrecision==='ALL_DAY')return '終日を含む公開方針';
  return event.validFrom&&event.validTo&&event.validFrom===event.validTo?event.validFrom:'公開期間内';
}

function hasConcreteLocation(event){
  const point=event?.locationPoint;
  return Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&event?.geoPrecision!=='PREFECTURE';
}

function scheduleDistanceMeters(event){
  if(!lastPosition||!hasConcreteLocation(event))return null;
  return zonesApi.distanceMeters(lastPosition,event.locationPoint);
}

function scheduleDistanceLabel(event){
  const distance=scheduleDistanceMeters(event);
  if(!Number.isFinite(distance))return null;
  if(distance<1000)return Math.max(50,Math.round(distance/50)*50)+'m先';
  return (distance/1000).toFixed(distance<10000?1:0)+'km先';
}

function sortedLocationEvents(events){
  return events.map((event,index)=>({event,index,distance:scheduleDistanceMeters(event)}))
    .sort((a,b)=>{
      const aLocated=Number.isFinite(a.distance),bLocated=Number.isFinite(b.distance);
      if(aLocated!==bLocated)return aLocated?-1:1;
      if(aLocated&&a.distance!==b.distance)return a.distance-b.distance;
      return a.index-b.index;
    })
    .map(item=>item.event);
}

function concretePublicEvents(){
  return Array.isArray(publicSchedule?.events)?publicSchedule.events.filter(hasConcreteLocation):[];
}

function concreteFocusEvents(){
  return Array.isArray(focusLocations?.events)?focusLocations.events.filter(hasConcreteLocation):[];
}

function setScheduleTab(tab){
  scheduleTab=tab==='focus'?'focus':'public';
  const isPublic=scheduleTab==='public';
  schedulePublicTab.classList.toggle('active',isPublic);
  scheduleFocusTab.classList.toggle('active',!isPublic);
  schedulePublicTab.setAttribute('aria-selected',String(isPublic));
  scheduleFocusTab.setAttribute('aria-selected',String(!isPublic));
  renderSchedulePanel();
}

function renderSchedulePanel(){
  const today=tokyoDateKey();
  const publicEvents=sortedLocationEvents(concretePublicEvents());
  const focusEvents=sortedLocationEvents(concreteFocusEvents());
  const selected=scheduleTab==='focus'?focusEvents:publicEvents;
  const source=scheduleTab==='focus'?focusLocations:publicSchedule;
  const titlePrefix=scheduleTab==='focus'?'重点取締場所':'公開取締予定';

  schedulePublicTab.textContent='公開取締予定（'+publicEvents.length+'）';
  scheduleFocusTab.textContent='重点取締場所（'+focusEvents.length+'）';
  schedulePeriod.textContent=titlePrefix+' ／ '+(lastPosition?'現在地から近い順':'現在地取得後に近い順');
  scheduleSource.href=source?.sourceUrl||'#';
  scheduleFootCopy.textContent=scheduleTab==='focus'
    ?'具体的な場所を確認できる重点取締場所のみ表示します。現在その場所で取締りを実施中であることを示しません。'
    :'具体的な場所を確認できる公開取締予定のみ表示します。本日の予定は地図上で赤点滅します。';

  if(!selected.length){
    scheduleList.innerHTML='<div class="schedule-empty">'+
      (scheduleTab==='focus'
        ?'位置を確認できる重点取締場所は現在ありません。'
        :'具体的な場所が公表され、位置を確認できる公開取締予定は現在ありません。')+
      '</div>';
  }else{
    scheduleList.innerHTML=selected.map(event=>{
      const todayClass=scheduleTab==='public'&&event.validDate===today?' today':'';
      const badge=event.validDate===today?'<span class="schedule-badge">本日</span>':'';
      const title=event.placeName||event.routeName||event.areaText||event.enforcementType;
      const detail=scheduleTab==='focus'
        ?[scheduleDistanceLabel(event),event.localityText,event.policeStation].filter(Boolean)
        :[scheduleDistanceLabel(event),event.enforcementType,event.routeName,event.areaText,scheduleTimeLabel(event)].filter(Boolean);
      return '<div class="schedule-item'+todayClass+'">'+
        '<strong>'+badge+esc(title)+'</strong>'+
        '<span>'+detail.map(esc).join(' ／ ')+'</span>'+
        '</div>';
    }).join('');
  }

  const todayEvents=publicEvents.filter(event=>event.validDate===today);
  if(todayEvents.length){
    scheduleDayBanner.hidden=false;
    scheduleDayTitle.textContent='本日の公開取締予定：'+todayEvents.map(event=>event.placeName||event.areaText||event.routeName).join(' ／ ');
    scheduleDayCopy.textContent='警視庁の公開予定です。現在その場所で取締りを実施中であることを示すものではありません。';
  }else{
    scheduleDayBanner.hidden=true;
    scheduleDayTitle.textContent='';
    scheduleDayCopy.textContent='';
  }
}

function scheduleMarkerRadius(zoom=map.getZoom()){
  if(zoom>=14)return 7;
  if(zoom>=13)return 5.5;
  return 4.5;
}

function publicLocationPopup(event){
  const today=event.validDate===tokyoDateKey();
  return '<div class="popup-title">📅 '+esc(event.placeName||event.routeName||event.areaText||'公開取締予定')+'</div>'+
    '<div class="popup-status '+(today?'on':'off')+'">'+(today?'本日の公開予定':'公開予定')+'</div>'+
    '<div class="popup-line">'+[event.enforcementType,event.routeName,event.areaText,scheduleTimeLabel(event)].filter(Boolean).map(esc).join(' ／ ')+'</div>'+
    '<div class="popup-note">公開予定であり、現在その場所で取締りを実施中であることを示すものではありません。</div>';
}

function focusLocationPopup(event){
  return '<div class="popup-title">📍 '+esc(event.placeName||event.areaText||'重点取締場所')+'</div>'+
    '<div class="popup-status focus">重点取締場所</div>'+
    '<div class="popup-line">'+[event.localityText,event.policeStation].filter(Boolean).map(esc).join(' ／ ')+'</div>'+
    (event.reason?'<div class="popup-note">'+esc(event.reason)+'</div>':'')+
    '<div class="popup-note">警視庁が公表する重点取締場所です。現在その場所で取締りを実施中であることを示すものではありません。</div>';
}

function renderScheduleMap(){
  publicScheduleLayer.clearLayers();
  focusLocationLayer.clearLayers();
  publicTodayMarkers.length=0;
  const today=tokyoDateKey();
  const radius=scheduleMarkerRadius();

  for(const event of concretePublicEvents()){
    const isToday=event.validDate===today;
    const marker=L.circleMarker(event.locationPoint,{
      radius,
      color:'#fff',
      weight:2,
      fillColor:'#dc2626',
      fillOpacity:isToday?.96:.80,
      opacity:1
    }).bindPopup(publicLocationPopup(event),{autoClose:false,closeOnClick:false});
    marker.addTo(publicScheduleLayer);
    if(isToday)publicTodayMarkers.push(marker);
  }

  for(const event of concreteFocusEvents()){
    L.circleMarker(event.locationPoint,{
      radius,
      color:'#fff',
      weight:2,
      fillColor:'#16a34a',
      fillOpacity:.92,
      opacity:1
    }).bindPopup(focusLocationPopup(event),{autoClose:false,closeOnClick:false})
      .addTo(focusLocationLayer);
  }
}

async function loadPublicSchedule(){
  try{
    const response=await fetch('/drive-beta/data/tokyo-public-enforcement-2026-10-preview-v1.json',{cache:'no-store'});
    if(!response.ok)throw new Error('schedule_http_'+response.status);
    const snapshot=await response.json();
    if(snapshot?.freshnessStatus!=='CURRENT'||!Array.isArray(snapshot?.events))throw new Error('schedule_not_current');
    publicSchedule=snapshot;
    renderSchedulePanel();
    renderScheduleMap();
  }catch(error){
    console.warn('DRIVE beta public schedule load failed',error);
    publicSchedule=null;
    scheduleToggle.disabled=true;
    scheduleToggle.textContent='📅 取締予定 取得失敗';
  }
}

async function loadFocusLocations(){
  try{
    const response=await fetch('/drive-beta/data/tokyo-focus-locations-wangan-preview-v1.json',{cache:'no-store'});
    if(!response.ok)throw new Error('focus_http_'+response.status);
    const snapshot=await response.json();
    if(snapshot?.freshnessStatus!=='CURRENT'||!Array.isArray(snapshot?.events))throw new Error('focus_not_current');
    focusLocations=snapshot;
    renderSchedulePanel();
    renderScheduleMap();
  }catch(error){
    console.warn('DRIVE beta focus locations load failed',error);
    focusLocations={sourceUrl:'https://www.keishicho.metro.tokyo.lg.jp/kotsu/torishimari/kokai_juten/jutentorishimari.html',events:[]};
    renderSchedulePanel();
    renderScheduleMap();
  }
}

function severity(item){
  const count=Number(item.accident_count||0),deaths=Number(item.death_count||0);
  if(deaths>0||count>=15)return{color:'#6d28d9',label:'特に注意'};
  if(count>=9)return{color:'#7c3aed',label:'多発'};
  return{color:'#8b5cf6',label:'注意'};
}

async function loadAccidents(){
  const token=++accidentRequest;
  accidentLayer.clearLayers();
  if(!accidentVisible||map.getZoom()<11)return;
  const b=map.getBounds();
  const {data,error}=await db.rpc('accident_hotspots_in_view',{
    p_min_lat:b.getSouth(),p_min_lng:b.getWest(),p_max_lat:b.getNorth(),p_max_lng:b.getEast(),p_limit:300
  });
  if(token!==accidentRequest||!accidentVisible)return;
  if(error){console.warn('drive beta accident hotspot load failed',error);return;}
  for(const item of Array.isArray(data)?data:[]){
    const risk=severity(item);
    L.circle([Number(item.lat),Number(item.lng)],{
      radius:Number(item.cell_size_m||250)/2,color:risk.color,weight:2,fillColor:risk.color,fillOpacity:.16
    }).bindPopup(
      '<div class="popup-title">⚠️ 人身事故 '+esc(risk.label)+'エリア</div>'+
      '<div class="popup-line">人身事故 '+esc(item.accident_count)+'件 ／ 死者 '+esc(item.death_count)+'人 ／ 負傷者 '+esc(item.injury_count)+'人</div>'+
      '<div class="popup-note">警察庁2022〜2024年公開データを約250m区画で集計した既存まちまもデータです。将来の事故を予測する表示ではありません。</div>'
    ).addTo(accidentLayer);
  }
}

statusPanelHandle.addEventListener('touchstart',event=>{
  panelTouchStartY=event.touches?.[0]?.clientY??null;
  panelSwipeConsumed=false;
},{passive:true});
statusPanelHandle.addEventListener('touchend',event=>{
  if(panelTouchStartY===null)return;
  const endY=event.changedTouches?.[0]?.clientY;
  const delta=Number.isFinite(endY)?endY-panelTouchStartY:0;
  panelTouchStartY=null;
  if(Math.abs(delta)<28)return;
  panelSwipeConsumed=true;
  setStatusPanelExpanded(delta<0);
},{passive:true});
statusPanelHandle.addEventListener('click',()=>{
  if(panelSwipeConsumed){
    panelSwipeConsumed=false;
    return;
  }
  setStatusPanelExpanded(statusPanel.classList.contains('collapsed'));
});
setStatusPanelExpanded(false);
schedulePublicTab.addEventListener('click',()=>setScheduleTab('public'));
scheduleFocusTab.addEventListener('click',()=>setScheduleTab('focus'));

enforcementToggle.addEventListener('click',()=>{
  enforcementVisible=!enforcementVisible;
  enforcementToggle.setAttribute('aria-pressed',String(enforcementVisible));
  if(enforcementVisible){enforcementLayer.addTo(map);renderEnforcement();}else{enforcementLayer.clearLayers();zoneLines.clear();}
});
accidentToggle.addEventListener('click',()=>{
  accidentVisible=!accidentVisible;
  accidentToggle.setAttribute('aria-pressed',String(accidentVisible));
  accidentToggle.textContent=accidentVisible?'⚠️ 事故多発 ON':'⚠️ 事故多発 OFF';
  if(accidentVisible){accidentLayer.addTo(map);loadAccidents();}else accidentLayer.clearLayers();
});
scheduleToggle.addEventListener('click',()=>{
  const open=schedulePanel.hidden;
  schedulePanel.hidden=!open;
  scheduleToggle.setAttribute('aria-pressed',String(open));
  scheduleToggle.setAttribute('aria-expanded',String(open));
});
scheduleClose.addEventListener('click',()=>{
  schedulePanel.hidden=true;
  scheduleToggle.setAttribute('aria-pressed','false');
  scheduleToggle.setAttribute('aria-expanded','false');
});
locationBtn.addEventListener('click',()=>{
  startLocation();
  if(lastPosition)map.setView(lastPosition,16,{animate:true});
});
document.getElementById('alertClose').addEventListener('click',()=>alertBox.classList.remove('show'));
map.on('moveend',()=>{if(accidentVisible)loadAccidents();});
map.on('zoomend',()=>{
  if(enforcementVisible)renderEnforcement();
  renderScheduleMap();
});

async function loadEnforcementSource(){
  statusTitle.textContent='警察公式データを読み込み中';
  statusCopy.textContent='検証済み公開snapshotから重点路線を読み込んでいます。';
  try{
    const response=await fetch('/drive-beta/data/tokyo-wangan-preview-v1.json',{cache:'no-store'});
    if(!response.ok)throw new Error('source_http_'+response.status);
    const snapshot=await response.json();
    enforcementZones=zonesApi.normalizeSnapshot(snapshot);
    await hydrateRoadGeometries();
    renderEnforcement();
    updateStatus();
  }catch(error){
    console.warn('DRIVE beta enforcement snapshot load failed',error);
    enforcementZones=[];
    enforcementLayer.clearLayers();
    statusTitle.textContent='警察公式データを読み込めませんでした';
    statusCopy.textContent='古い情報を代替表示せず、再読み込みしてください。';
  }
}

accidentLayer.clearLayers();
startLocation();
loadEnforcementSource();
loadPublicSchedule();
loadFocusLocations();
setInterval(()=>{renderEnforcement();checkProximity();},60000);
setInterval(flashTick,850);
})();
