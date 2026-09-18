(function(root){
'use strict';

// Supabase/PostgREST responses are capped per request. Fetch map posts in
// deterministic ID pages so newer reports are never dropped after the table
// grows beyond the API row limit.
const PAGE_SIZE=750;
const MAX_PAGES=20;
const SELECT_COLUMNS='id,created_at,lat,lng,category,title,comment,confirm_count,like_count,report_count,image_url,address,is_hidden,created_by';
let loadSequence=0;

async function fetchAllVisibleSpots(sequence){
  const rows=[];
  let lastId=0;
  for(let page=0;page<MAX_PAGES;page++){
    let query=db.from('spots')
      .select(SELECT_COLUMNS)
      .order('id',{ascending:true})
      .limit(PAGE_SIZE);
    if(lastId>0)query=query.gt('id',lastId);
    const {data,error}=await query;
    if(sequence!==loadSequence)return null;
    if(error)throw error;
    const chunk=Array.isArray(data)?data:[];
    rows.push(...chunk);
    if(chunk.length<PAGE_SIZE)break;
    lastId=Number(chunk[chunk.length-1]?.id)||lastId;
    if(!lastId)break;
  }
  return rows;
}

function clearReportLayers(){
  activeMarkers.forEach(item=>{
    try{if(item.instance&&map.hasLayer(item.instance))map.removeLayer(item.instance);}catch(_){}
    try{if(item.circle&&map.hasLayer(item.circle))map.removeLayer(item.circle);}catch(_){}
  });
  activeMarkers=[];
  heatCircles.forEach(circle=>{try{if(circle&&map.hasLayer(circle))map.removeLayer(circle);}catch(_){}});
  heatCircles=[];
}

function renderSpot(spot,now){
  if(!spot||spot.is_hidden)return;
  const lat=Number(spot.lat),lng=Number(spot.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  if(spot.category==='patrol'&&now-new Date(spot.created_at).getTime()>10*60*1000)return;
  if((Number(spot.report_count)||0)>=3)return;

  let color='#ef4444',fill='#f87171';
  if(spot.category==='danger'){color='#2563eb';fill='#60a5fa';}
  else if(spot.category==='patrol'){color='#10b981';fill='#34d399';}
  else if(spot.category==='abandoned'){color='#9333ea';fill='#c084fc';}
  else if(spot.category==='reckless'){color='#f59e0b';fill='#fbbf24';}
  else if(spot.category==='official'){color='#059669';fill='#34d399';}

  const circle=L.circle([lat,lng],{color,fillColor:fill,fillOpacity:.35,radius:80,stroke:false}).addTo(map);
  heatCircles.push(circle);
  createSpotPin({...spot,lat,lng},circle);
}

async function pagedLoadSpots(){
  const sequence=++loadSequence;
  try{
    const rows=await fetchAllVisibleSpots(sequence);
    if(!rows||sequence!==loadSequence)return false;
    clearReportLayers();
    const now=Date.now();
    rows.forEach(spot=>renderSpot(spot,now));
    root.MachimamoSpotLoaderState={loaded:rows.length,at:new Date().toISOString()};
    return true;
  }catch(error){
    console.error('Paged spot load failed',error);
    return false;
  }
}

// Replace the legacy single-request loader before the window load handler and
// realtime callbacks invoke it. Existing callbacks resolve this binding at run time.
loadSpots=pagedLoadSpots;
root.MachimamoSpotLoader={reload:pagedLoadSpots,state:()=>root.MachimamoSpotLoaderState||null};

// If this patch is loaded after the original first load, refresh once so recent
// posts appear without requiring the user to reload the page again.
if(document.readyState==='complete')setTimeout(pagedLoadSpots,0);
})(window);

(function loadPwaOnboarding(){
'use strict';
const script=document.createElement('script');
script.src='pwa-onboarding.js?v=35-fixedviewport';
script.async=false;
script.onerror=()=>console.error('PWA onboarding could not be loaded.');
document.head.appendChild(script);
})();
