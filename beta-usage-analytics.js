(function(root){
'use strict';
if(!root.supabase?.createClient)return;

const SUPABASE_URL='https://ckftozjhdszlwqnylmxv.supabase.co';
const SUPABASE_KEY='sb_publishable_NpF8BeMCuhcjxu4b-eey7w_xxvimWJ8';
const STORAGE_KEY='sb-ckftozjhdszlwqnylmxv-auth-token';
const client=root.machimamoBetaAnalyticsDb||root.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storageKey:STORAGE_KEY}
});
root.machimamoBetaAnalyticsDb=client;

let lastTouchAt=0;
let touching=false;
let adminRefreshing=false;
let lastAdminRefresh=0;

async function touchPresence(force=false){
  if(touching||(!force&&document.hidden)||!navigator.onLine)return;
  const now=Date.now();
  if(!force&&now-lastTouchAt<45000)return;
  touching=true;
  try{
    const {data}=await client.auth.getSession();
    if(!data?.session?.user?.id)return;
    const {error}=await client.rpc('touch_user_presence');
    if(!error)lastTouchAt=now;
  }catch(_){
    // Presence is non-critical. Never block normal app use.
  }finally{
    touching=false;
  }
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function formatDateTime(value){
  if(!value)return 'まだ計測なし';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '—';
  const diff=Math.max(0,Date.now()-date.getTime());
  if(diff<60000)return 'たった今';
  if(diff<3600000)return `${Math.floor(diff/60000)}分前`;
  if(diff<86400000)return `${Math.floor(diff/3600000)}時間前`;
  return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
}

function ensureAdminUsagePanel(){
  const anchor=document.getElementById('adminStatsSubline');
  if(!anchor)return null;
  let panel=document.getElementById('adminBetaUsageStats');
  if(panel)return panel;
  panel=document.createElement('section');
  panel.id='adminBetaUsageStats';
  panel.setAttribute('aria-label','ベータ利用状況');
  panel.style.cssText='margin:0 0 14px;padding:10px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;';
  panel.innerHTML='\
    <div style="font-size:.78rem;font-weight:900;color:#1d4ed8;margin-bottom:8px;">ベータ利用状況</div>\
    <div id="adminBetaUsageCards" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;text-align:center;"></div>\
    <div id="adminBetaRecentUsers" style="margin-top:9px;font-size:.7rem;color:#334155;"></div>\
    <div style="margin-top:7px;font-size:.61rem;color:#64748b;line-height:1.45;">オンライン＝直近2分以内に認証済み状態でまちまもを利用。利用状況はこの機能の計測開始以降を集計します。</div>';
  anchor.insertAdjacentElement('afterend',panel);
  return panel;
}

function renderAdminUsage(stats){
  const panel=ensureAdminUsagePanel();
  if(!panel)return;
  const summary=stats?.summary||{};
  const cards=[
    ['本日利用',Number(summary.todayUsers||0).toLocaleString()+'人'],
    ['7日アクティブ',Number(summary.activeUsers7d||0).toLocaleString()+'人'],
    ['オンライン',Number(summary.onlineUsers||0).toLocaleString()+'人'],
    ['最終アクセス',formatDateTime(summary.latestSeenAt)]
  ];
  const cardsEl=document.getElementById('adminBetaUsageCards');
  if(cardsEl)cardsEl.innerHTML=cards.map(([label,value])=>`<div style="background:white;padding:8px 4px;border-radius:8px;border:1px solid #dbeafe;"><strong style="display:block;font-size:.96rem;color:#1e3a8a;">${escapeHtml(value)}</strong><div style="font-size:.6rem;color:#64748b;">${escapeHtml(label)}</div></div>`).join('');

  const recent=Array.isArray(stats?.recentUsers)?stats.recentUsers:[];
  const recentEl=document.getElementById('adminBetaRecentUsers');
  if(!recentEl)return;
  if(!recent.length){
    recentEl.innerHTML='<div style="padding:6px 2px;color:#64748b;">直近アクセスはまだありません。</div>';
    return;
  }
  recentEl.innerHTML='<div style="font-weight:900;color:#1e3a8a;margin-bottom:4px;">直近アクセス</div>'+recent.map(user=>{
    const dot=user.online?'#16a34a':'#94a3b8';
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 2px;border-top:1px solid #dbeafe;"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><span aria-hidden="true" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dot};margin-right:5px;"></span>${escapeHtml(user.name||'ユーザー')}</span><span style="flex-shrink:0;color:#64748b;">${escapeHtml(formatDateTime(user.last_seen_at))}</span></div>`;
  }).join('');
}

function adminVisible(){
  const area=document.getElementById('adminDashboardArea');
  if(!area)return false;
  const style=getComputedStyle(area);
  return style.display!=='none'&&style.visibility!=='hidden';
}

async function refreshAdminUsage(force=false){
  if(adminRefreshing||!adminVisible())return;
  const password=document.getElementById('adminExportPassword')?.value||'';
  if(!password)return;
  const now=Date.now();
  if(!force&&now-lastAdminRefresh<12000)return;
  adminRefreshing=true;
  try{
    const {data,error}=await client.rpc('admin_get_statistics',{p_password:password});
    if(!error&&data){
      lastAdminRefresh=now;
      renderAdminUsage(data);
    }
  }catch(_){
    // Existing admin dashboard remains usable even if this optional panel fails.
  }finally{
    adminRefreshing=false;
  }
}

function activate(){
  touchPresence(true);
  setInterval(()=>touchPresence(false),60000);
  setInterval(()=>refreshAdminUsage(false),15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){touchPresence(true);refreshAdminUsage(true);}});
  root.addEventListener('focus',()=>touchPresence(false));
  root.addEventListener('pageshow',()=>touchPresence(true));
  document.addEventListener('click',()=>{if(adminVisible())setTimeout(()=>refreshAdminUsage(false),450);},{passive:true});
  setTimeout(()=>refreshAdminUsage(true),1200);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate,{once:true});
else activate();

root.MachimamoBetaAnalytics={touch:()=>touchPresence(true),refreshAdmin:()=>refreshAdminUsage(true)};
})(window);
