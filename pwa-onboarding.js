(function machimamoPwaOnboarding(){
'use strict';

const VERSION='v2';
const KEY_INSTALL=`machimamo_a2hs_hint_seen_${VERSION}`;
const KEY_TUTORIAL=`machimamo_tutorial_seen_${VERSION}`;
const ICON_180='/apple-touch-icon.png?v=31-iosicon1';
const MANIFEST='/manifest.webmanifest?v=31-iosicon1';

const safeGet=key=>{try{return localStorage.getItem(key);}catch(_){return null;}};
const safeSet=(key,value='1')=>{try{localStorage.setItem(key,value);}catch(_){}};

function upsertMeta(name,content){
  let el=document.head.querySelector(`meta[name="${name}"]`);
  if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el);}
  el.content=content;
}
function upsertLink(rel,href,sizes){
  let el=document.head.querySelector(`link[rel="${rel}"]`);
  if(!el){el=document.createElement('link');el.rel=rel;document.head.appendChild(el);}
  el.href=href;
  if(sizes)el.sizes=sizes;
}
function installPwaHead(){
  upsertMeta('apple-mobile-web-app-capable','yes');
  upsertMeta('apple-mobile-web-app-status-bar-style','black-translucent');
  upsertMeta('apple-mobile-web-app-title','まちまも MAP');
  upsertMeta('theme-color','#2563eb');
  upsertLink('manifest',MANIFEST);
  upsertLink('apple-touch-icon',ICON_180,'180x180');
  upsertLink('apple-touch-icon-precomposed',ICON_180,'180x180');
}

const ua=navigator.userAgent||'';
const isIOS=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isSafari=/Safari/i.test(ua)&&!/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA)/i.test(ua);
const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;

const slides=[
  {emoji:'🛡️',title:'まちまもMAPへようこそ',body:'AED・交番など、街の安全情報をひとつの地図で確認できる地域参加型の安全MAPです。',note:'まずは地図を動かして、身近な場所の情報を見てみましょう。'},
  {emoji:'🗺️',title:'街の安全情報をひとつに',body:'AED、交番・駐在所、危険箇所、交通安全、地域の事件・注意情報などを分かりやすくまとめていきます。',note:'表示切替を使えば、今見たい情報だけに絞れます。'},
  {emoji:'📍',title:'マーカーを見て、情報を投稿',body:'地図上のマーカーをタップすると詳細を確認できます。見つけた情報は投稿して、地域のみんなに共有できます。',note:'投稿内容によっては、運営確認後に地図へ反映されます。'},
  {emoji:'⭐',title:'活動がスタンプ・ポイントになる',body:'クイズやAED情報など、対象の活動でスタンプやポイントを獲得できます。',note:'付与条件や上限は各画面に表示されるルールを確認してください。'},
  {emoji:'🤝',title:'みんなで育てるMAP',body:'投稿や確認が増えるほど、街の情報は新しく・正確になっていきます。',note:'地域の困りごとを集約し、将来的には行政への共有にもつなげていきます。'}
];

function injectStyles(){
  if(document.getElementById('machimamo-onboarding-style'))return;
  const style=document.createElement('style');
  style.id='machimamo-onboarding-style';
  style.textContent=`
  .mm-ob-overlay{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.62);display:flex;align-items:flex-end;justify-content:center;padding-top:env(safe-area-inset-top);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif}
  .mm-ob-sheet{width:100%;max-width:560px;max-height:94dvh;overflow:auto;background:#fff;border-radius:26px 26px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -14px 50px rgba(15,23,42,.2);color:#17212b}
  .mm-ob-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.mm-ob-brand{display:flex;align-items:center;gap:10px;font-weight:900;font-size:15px}.mm-ob-brand img{width:42px;height:42px;border-radius:11px;object-fit:cover;box-shadow:0 3px 10px rgba(15,23,42,.15)}
  .mm-ob-skip{border:0;background:#eef2f7;color:#475569;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:800;cursor:pointer}
  .mm-ob-progress{display:flex;gap:6px;margin:12px 0 18px}.mm-ob-dot{height:5px;flex:1;background:#dbe4ee;border-radius:999px}.mm-ob-dot.active{background:#2563eb}
  .mm-ob-hero{text-align:center;padding:4px 4px 10px}.mm-ob-emoji{font-size:52px;line-height:1;margin:8px 0 16px}.mm-ob-title{font-size:24px;line-height:1.35;font-weight:950;margin:0 0 12px}.mm-ob-body{font-size:15px;line-height:1.8;color:#334155;margin:0 auto;max-width:430px}.mm-ob-note{margin:16px 0 0;padding:13px 14px;border-radius:15px;background:#eff6ff;color:#1e40af;font-size:13px;line-height:1.65;font-weight:700;text-align:left}
  .mm-ob-actions{display:grid;grid-template-columns:1fr 1.6fr;gap:10px;margin-top:22px}.mm-ob-btn{border:0;border-radius:14px;padding:14px 12px;font:inherit;font-weight:900;cursor:pointer}.mm-ob-back{background:#eef2f7;color:#334155}.mm-ob-next{background:#2563eb;color:#fff;box-shadow:0 7px 18px rgba(37,99,235,.22)}.mm-ob-back[disabled]{opacity:.35;cursor:default}
  .mm-install-title{font-size:23px;font-weight:950;line-height:1.35;margin:14px 0 10px}.mm-install-copy{color:#334155;line-height:1.75;font-size:15px;margin:0}.mm-install-steps{display:grid;gap:9px;margin:18px 0}.mm-install-step{display:flex;align-items:center;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:15px;padding:12px 13px;font-size:14px;font-weight:800}.mm-install-num{width:28px;height:28px;display:grid;place-items:center;background:#2563eb;color:#fff;border-radius:50%;font-size:13px;flex:none}.mm-install-later{width:100%;border:0;border-radius:14px;padding:14px;background:#eef2f7;color:#475569;font-weight:900;font-size:14px;cursor:pointer}
  .mm-guide-replay{margin:10px 0 16px}.mm-guide-replay button{width:100%;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:14px;padding:13px 14px;font:inherit;font-weight:900;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:8px}.mm-guide-replay small{display:block;color:#64748b;font-weight:600;margin-top:3px}
  @media (min-width:600px){.mm-ob-overlay{align-items:center;padding:24px}.mm-ob-sheet{border-radius:26px;max-height:88vh;padding-bottom:22px}}
  `;
  document.head.appendChild(style);
}

function removeOverlay(){document.getElementById('machimamo-onboarding-overlay')?.remove();}
function makeOverlay(){
  removeOverlay();
  const overlay=document.createElement('div');
  overlay.id='machimamo-onboarding-overlay';
  overlay.className='mm-ob-overlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  document.body.appendChild(overlay);
  return overlay;
}

function showInstallGuide(){
  injectStyles();
  const overlay=makeOverlay();
  overlay.innerHTML=`<div class="mm-ob-sheet" aria-labelledby="mm-install-title">
    <div class="mm-ob-top"><div class="mm-ob-brand"><img src="${ICON_180}" alt=""><span>まちまも MAP</span></div></div>
    <div class="mm-ob-hero"><div class="mm-ob-emoji" aria-hidden="true">📲</div><h2 class="mm-install-title" id="mm-install-title">ホーム画面に追加してご利用ください</h2><p class="mm-install-copy">まちまもの機能を十分に使うには、ホーム画面に追加して、そこからご利用ください。</p></div>
    <div class="mm-install-steps"><div class="mm-install-step"><span class="mm-install-num">1</span><span>Safariの共有ボタンをタップ</span></div><div class="mm-install-step"><span class="mm-install-num">2</span><span>「ホーム画面に追加」をタップ</span></div><div class="mm-install-step"><span class="mm-install-num">3</span><span>右上の「追加」をタップ</span></div></div>
    <button type="button" class="mm-install-later" id="mm-install-later">あとで</button>
  </div>`;
  document.getElementById('mm-install-later')?.addEventListener('click',()=>{safeSet(KEY_INSTALL);removeOverlay();});
}

let slideIndex=0;
function renderTutorial(overlay){
  const slide=slides[slideIndex];
  const final=slideIndex===slides.length-1;
  overlay.innerHTML=`<div class="mm-ob-sheet" aria-labelledby="mm-ob-title">
    <div class="mm-ob-top"><div class="mm-ob-brand"><img src="${ICON_180}" alt=""><span>はじめてガイド</span></div><button type="button" class="mm-ob-skip" id="mm-ob-skip">スキップ</button></div>
    <div class="mm-ob-progress" aria-label="${slideIndex+1}/${slides.length}">${slides.map((_,i)=>`<span class="mm-ob-dot ${i<=slideIndex?'active':''}"></span>`).join('')}</div>
    <div class="mm-ob-hero"><div class="mm-ob-emoji" aria-hidden="true">${slide.emoji}</div><h2 class="mm-ob-title" id="mm-ob-title">${slide.title}</h2><p class="mm-ob-body">${slide.body}</p><div class="mm-ob-note">${slide.note}</div></div>
    <div class="mm-ob-actions"><button type="button" class="mm-ob-btn mm-ob-back" id="mm-ob-back" ${slideIndex===0?'disabled':''}>前へ</button><button type="button" class="mm-ob-btn mm-ob-next" id="mm-ob-next">${final?'まちまもをはじめる':'次へ'}</button></div>
  </div>`;
  document.getElementById('mm-ob-skip')?.addEventListener('click',()=>{safeSet(KEY_TUTORIAL);removeOverlay();});
  document.getElementById('mm-ob-back')?.addEventListener('click',()=>{if(slideIndex>0){slideIndex--;renderTutorial(overlay);}});
  document.getElementById('mm-ob-next')?.addEventListener('click',()=>{if(final){safeSet(KEY_TUTORIAL);removeOverlay();return;}slideIndex++;renderTutorial(overlay);});
}
function showTutorial(){injectStyles();slideIndex=0;renderTutorial(makeOverlay());}

function addReplayButton(){
  const guide=document.getElementById('usageGuide');
  if(!guide||document.getElementById('machimamo-tutorial-replay'))return;
  const wrap=document.createElement('div');
  wrap.id='machimamo-tutorial-replay';
  wrap.className='mm-guide-replay';
  wrap.innerHTML='<button type="button"><span>▶ はじめてガイドを見る<small>最初の5ステップをもう一度確認できます</small></span><span aria-hidden="true">›</span></button>';
  wrap.querySelector('button').addEventListener('click',showTutorial);
  const title=document.getElementById('usageGuideTitle');
  if(title)title.insertAdjacentElement('afterend',wrap);else guide.prepend(wrap);
}

function boot(){
  installPwaHead();
  injectStyles();
  addReplayButton();
  window.MachimamoOnboarding={showTutorial,showInstallGuide,isStandalone};
  if(isIOS&&isSafari&&!isStandalone()&&!safeGet(KEY_INSTALL)){setTimeout(showInstallGuide,250);return;}
  if(isStandalone()&&!safeGet(KEY_TUTORIAL))setTimeout(showTutorial,350);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
