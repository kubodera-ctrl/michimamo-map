(()=>{
'use strict';

const SUPABASE_URL='https://ckftozjhdszlwqnylmxv.supabase.co';
const SUPABASE_KEY='sb_publishable_NpF8BeMCuhcjxu4b-eey7w_xxvimWJ8';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const zonesApi=window.MachimamoDriveZones;
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView([35.6335,139.7875],14);
L.control.zoom({position:'bottomleft'}).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

const enforcementLayer=L.layerGroup().addTo(map);
const accidentLayer=L.layerGroup().addTo(map);
const zoneLines=new Map();
let enforcementVisible=true,accidentVisible=false,flashOn=true,userMarker=null,lastPosition=null,watchId=null;
let accidentRequest=0,lastAlert={id:null,at:0};

const enforcementToggle=document.getElementById('enforcementToggle');
const accidentToggle=document.getElementById('accidentToggle');
const locationBtn=document.getElementById('locationBtn');
const alertBox=document.getElementById('proximityAlert');
const alertTitle=document.getElementById('alertTitle');
const alertBody=document.getElementById('alertBody');
const statusTitle=document.getElementById('statusTitle');
const statusCopy=document.getElementById('statusCopy');
const stateDot=document.getElementById('stateDot');
const jstClock=document.getElementById('jstClock');

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function activeZones(){return zonesApi.TOKYO_WANGAN_ZONES.filter(z=>zonesApi.isZoneActive(z));}

function zonePopup(zone){
  const active=zonesApi.isZoneActive(zone);
  return '<div class="popup-title">🚓 '+esc(zone.route)+'</div>'+
    '<div class="popup-status '+(active?'on':'off')+'">'+(active?'現在、重点時間帯':'重点時間帯外')+'</div>'+
    '<div class="popup-line">'+esc(zone.startLabel)+' 〜 '+esc(zone.endLabel)+'</div>'+
    '<div class="popup-line">重点時間 '+esc(zonesApi.formatWindow(zone))+' ／ 規制速度 '+esc(zone.speedKmh)+'km/h</div>'+
    (zone.geometryQuality?'<div class="popup-note">道路線形はβ用の概略表示です。</div>':'')+
    '<div class="popup-note">警視庁が公表する速度取締重点路線・重点時間帯です。現在その場所で取締りを実施中であることを示すものではありません。</div>'+
    '<a class="popup-source" href="'+esc(zone.sourcePdf)+'" target="_blank" rel="noopener noreferrer">出典：警視庁 東京湾岸警察署速度取締指針</a>';
}

function renderEnforcement(){
  enforcementLayer.clearLayers();zoneLines.clear();
  if(!enforcementVisible)return;
  for(const zone of zonesApi.TOKYO_WANGAN_ZONES){
    if(!zone.geometry)continue;
    const active=zonesApi.isZoneActive(zone);
    const line=L.polyline(zone.geometry,{
      color:active?'#dc2626':'#f59e0b',
      weight:active?10:7,
      opacity:active?.9:.72,
      dashArray:active?null:'10 8',
      lineCap:'round'
    }).bindPopup(zonePopup(zone),{autoClose:false,closeOnClick:false});
    line.addTo(enforcementLayer);
    line.bindTooltip(
      '<div class="zone-label-title">'+esc(zone.route)+'</div>'+
      '<div class="zone-label-time">'+(active?'現在重点 '+esc(zonesApi.formatWindow(zone)):esc(zonesApi.formatWindow(zone)))+'</div>',
      {permanent:true,direction:'center',className:active?'drive-zone-label active':'drive-zone-label',opacity:1}
    );
    zoneLines.set(zone.id,{zone,line});
  }
  updateStatus();
}

function updateStatus(){
  const now=new Date();
  const fmt=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false});
  jstClock.textContent=fmt.format(now)+' JST';
  const active=activeZones();
  const mappedActive=active.filter(z=>z.geometry);
  enforcementToggle.classList.toggle('active-now',mappedActive.length>0);
  stateDot.classList.toggle('live',active.length>0);
  if(active.length){
    statusTitle.textContent='現在、'+active.length+'路線が警視庁の重点時間帯';
    statusCopy.textContent=active.map(z=>z.route+' '+zonesApi.formatWindow(z)).join(' ／ ')+'。実施中の断定ではありません。';
  }else{
    statusTitle.textContent='現在、収録路線は重点時間帯外';
    statusCopy.textContent='重点区間は橙色で表示します。実際の取締りは公表時間帯以外にも行われる場合があります。';
  }
}

function flashTick(){
  flashOn=!flashOn;
  for(const {zone,line} of zoneLines.values()){
    if(!zonesApi.isZoneActive(zone))continue;
    line.setStyle({opacity:flashOn?.95:.28,weight:flashOn?11:8});
  }
}

function renderUserPosition(coords){
  lastPosition=[coords.latitude,coords.longitude];
  if(!userMarker){
    userMarker=L.circleMarker(lastPosition,{radius:9,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1}).addTo(map);
  }else userMarker.setLatLng(lastPosition);
  checkProximity();
}

function checkProximity(){
  if(!lastPosition||!enforcementVisible)return;
  const candidates=zonesApi.TOKYO_WANGAN_ZONES
    .filter(z=>z.geometry&&zonesApi.isZoneActive(z))
    .map(z=>({zone:z,d:zonesApi.distanceToPolylineMeters(lastPosition,z.geometry)}))
    .filter(x=>x.d<=500)
    .sort((a,b)=>a.d-b.d);
  if(!candidates.length)return;
  const hit=candidates[0],now=Date.now();
  if(lastAlert.id===hit.zone.id&&now-lastAlert.at<10*60*1000)return;
  lastAlert={id:hit.zone.id,at:now};
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
locationBtn.addEventListener('click',()=>{
  startLocation();
  if(lastPosition)map.setView(lastPosition,16,{animate:true});
});
document.getElementById('alertClose').addEventListener('click',()=>alertBox.classList.remove('show'));
map.on('moveend',()=>{if(accidentVisible)loadAccidents();});

renderEnforcement();
accidentLayer.clearLayers();
startLocation();
updateStatus();
setInterval(()=>{renderEnforcement();checkProximity();},60000);
setInterval(flashTick,850);
})();
