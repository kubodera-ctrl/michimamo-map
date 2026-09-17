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
