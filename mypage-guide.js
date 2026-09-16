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
