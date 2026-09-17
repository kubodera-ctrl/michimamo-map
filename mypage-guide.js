(function(){
'use strict';
const guide=document.getElementById('usageGuide');if(!guide)return;
const input=document.getElementById('usageGuideSearch'),chapters=[...guide.querySelectorAll('#usageGuideChapters > details')];
const normalize=s=>String(s).normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g,' ').trim();
const texts=new Map(chapters.map(x=>[x,normalize(x.textContent)]));
function filter(){const words=normalize(input.value).split(' ').filter(Boolean);let count=0;for(const chapter of chapters){const match=words.every(w=>texts.get(chapter).includes(w));chapter.hidden=!match;chapter.open=!!words.length&&match;if(match)count++;}document.getElementById('usageGuideSearchStatus').textContent=words.length?`${count}件の説明が見つかりました。`:'気になる見出しをタップすると説明が開きます。';document.getElementById('usageGuideEmpty').hidden=count!==0;}
input.addEventListener('input',filter);
document.getElementById('usageGuideClear').addEventListener('click',()=>{input.value='';filter();input.focus();});
guide.querySelectorAll('[data-guide-jump]').forEach(button=>button.addEventListener('click',()=>{input.value='';filter();const target=document.getElementById(button.dataset.guideJump);target.open=true;target.scrollIntoView({block:'start'});target.querySelector('summary').focus({preventScroll:true});}));
document.getElementById('usageGuideTop').addEventListener('click',()=>{guide.scrollIntoView({block:'start'});document.getElementById('usageGuideTitle').focus({preventScroll:true});});
})();

// Compatibility patch for the currently deployed quiz engine. EXTRA questions
// get ten real seconds and the visible countdown uses the same duration.
(function useTenSecondExtraTimer(){
'use strict';
const nativeNow=Date.now.bind(Date);
const nativeSetInterval=window.setInterval.bind(window);
let extraSession=false;
document.addEventListener('click',event=>{
const trigger=event.target.closest?.('[onclick*="startQuizSession"]');
if(!trigger)return;
extraSession=/startQuizSession\(['"]extra['"]\)/.test(trigger.getAttribute('onclick')||'');
},true);
const intro=document.getElementById('quizIntroArea');
if(intro){
const walker=document.createTreeWalker(intro,NodeFilter.SHOW_TEXT);let node;
while((node=walker.nextNode()))node.nodeValue=node.nodeValue.replace('100問・1問5秒','100問・1問10秒');
}
const result=document.getElementById('quizResultArea');
if(result)new MutationObserver(()=>{if(result.style.display&&result.style.display!=='none')extraSession=false;}).observe(result,{attributes:true,attributeFilter:['style']});
window.setInterval=function(callback,delay,...args){
const timer=document.getElementById('quizTimer');
if(!extraSession||delay!==100||!timer||timer.style.display==='none'||typeof callback!=='function')return nativeSetInterval(callback,delay,...args);
const realStart=nativeNow();
return nativeSetInterval(function(...callbackArgs){
const originalNow=Date.now,realNow=nativeNow();Date.now=()=>realStart+(realNow-realStart)/2;
try{callback.apply(this,callbackArgs);}finally{Date.now=originalNow;}
if(timer.style.display!=='none')timer.textContent=timer.textContent.replace(/残り\s*([\d.]+)秒/,(_,seconds)=>`残り ${(Number(seconds)*2).toFixed(1)}秒`);
},delay,...args);
};
})();

// Quiz road signs are loaded separately so a large index.html update is not
// required when official assets change.
(function loadOfficialQuizSigns(){
'use strict';
const script=document.createElement('script');
script.src='assets/road-signs/sign-map.js?v=27-official2';
script.onload=()=>{
const catalog=window.MACHIMAMO_SIGN_ASSETS;
if(!catalog?.map)return;
const escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
window.renderTrafficSign=function(type){
const name=escape(type||'道路標識'),items=catalog.map[type];
if(!items?.length)return '<div role="img" aria-label="画像を確認できません" style="padding:18px;color:#64748b;font-weight:800;">標識画像を確認できません</div>';
const hasSupplement=items.some(item=>item.supplement);
const images=items.map(item=>{
const transform=item.mirror?'transform:scaleX(-1);':'';
const size=item.supplement?'width:112px;height:40px;':item.tall?'width:72px;height:150px;':'width:132px;height:132px;';
return `<img src="${catalog.base}${encodeURIComponent(item.file)}" alt="" style="${size}object-fit:contain;${transform}" loading="eager">`;
}).join('');
return `<div role="img" aria-label="${name}" style="min-height:146px;display:flex;${hasSupplement?'flex-direction:column;':''}align-items:center;justify-content:center;gap:${hasSupplement?'2px':'10px'};flex-wrap:wrap;">${images}</div>`;
};
};
script.onerror=()=>console.error('Official quiz sign catalog could not be loaded.');
document.head.appendChild(script);
})();

(function loadOfficialAccidentHotspots(){
'use strict';
const script=document.createElement('script');
script.src='accident-hotspots.js?v=28-npa2';
script.onerror=()=>{
const button=document.getElementById('accidentAreaToggle');
if(button){button.style.display='none';button.removeAttribute('onclick');}
console.error('Official accident hotspot layer could not be loaded.');
};
document.head.appendChild(script);
})();

(function loadDriveMvpV2(){
'use strict';
const script=document.createElement('script');
script.src='camera-drive-mvp.js?v=28-mvp2';
script.onerror=()=>console.error('Drive MVP v2 could not be loaded.');
document.head.appendChild(script);
})();
