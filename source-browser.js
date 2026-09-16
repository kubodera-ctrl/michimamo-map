(function(root){
'use strict';
const prefectures='北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県'.split(' ');
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
function groups(rows,query=''){
 const words=normalize(query).split(' ').filter(Boolean),map=new Map();
 for(const row of rows){const pref=row.prefecture||'地域未分類',text=normalize([pref,row.municipality,row.source_name,row.facility_type==='aed'?'AED':'警察署 交番 駐在所'].join(' '));if(!words.every(w=>text.includes(w)))continue;if(!map.has(pref))map.set(pref,[]);map.get(pref).push(row);}
 const rank=p=>prefectures.includes(p)?prefectures.indexOf(p):99;
 return [...map].sort((a,b)=>rank(a[0])-rank(b[0])||a[0].localeCompare(b[0],'ja'));
}
async function fetchAll(db){
 async function page(offset){
  const {data,error}=await db.rpc('get_safety_source_summary_v2',{p_limit:500,p_offset:offset});
  if(error||!data||!Array.isArray(data.items)||!Number.isInteger(data.total)||data.total<0||data.total>100000)throw new Error('出典情報を取得できませんでした。');
  return data;
 }
 const first=await page(0),total=first.total,rows=[];
 function append(data,offset){
  if(data.total!==total)throw new Error('出典情報が更新されました。再読み込みしてください。');
  if(data.items.length!==Math.min(500,total-offset))throw new Error('出典情報の一部を取得できませんでした。');
  rows.push(...data.items);
 }
 append(first,0);
 // Fetch independent pages in small batches; preserve deterministic page order.
 for(let start=500;start<total;start+=2000){
  const offsets=[];for(let offset=start;offset<Math.min(start+2000,total);offset+=500)offsets.push(offset);
  const pages=await Promise.all(offsets.map(page));pages.forEach((data,i)=>append(data,offsets[i]));
 }
 return rows;
}
function mount(container,rows){
 const doc=container.ownerDocument;
 const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 container.replaceChildren();container.className='source-browser';container.style.fontSize='';
 const search=el('div',undefined,'source-search'),label=el('label','都道府県・市区町村・出典名で探す');label.htmlFor='sourceRegionSearch';
 const field=el('input');field.id='sourceRegionSearch';field.type='search';field.placeholder='例：東京都、横浜市、AED';
 const clear=el('button','クリア');clear.type='button';const searchRow=el('div',undefined,'guide-search-row');searchRow.append(field,clear);search.append(label,searchRow);
 const status=el('p',undefined,'source-meta');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const list=el('div');
 container.append(search,status,el('p','都道府県をタップすると出典が開きます。検索はこの出典一覧を絞り込みます（地図の移動はしません）。','source-meta'),list);
 function render(){
  list.replaceChildren();const grouped=groups(rows,field.value),count=grouped.reduce((s,g)=>s+g[1].length,0);
  status.textContent=grouped.length?`${grouped.length}地域・出典 ${count.toLocaleString('ja-JP')}件`:'一致する出典はありません。都道府県名など短い言葉で検索してください。掲載がなくても、施設が存在しないとは限りません。';
  for(const [pref,items] of grouped){
   const details=el('details'),summary=el('summary',pref);summary.append(el('small',`出典 ${items.length}件`));const body=el('div',undefined,'source-region-body'),entries=el('div'),more=el('button','さらに20件表示','source-load-more');more.type='button';let shown=0;
   function add(){const end=Math.min(shown+20,items.length);for(;shown<end;shown++){
    const row=items[shown],item=el('div',undefined,'source-item'),name=[row.municipality,row.source_name].filter(Boolean).join('｜')||'公開情報';let link=el('span',name);
    try{const url=new URL(row.source_url);if(url.protocol==='https:'){link=el('a',name);link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';}}catch(_){}
    item.append(el('strong',row.facility_type==='aed'?'AED':'警察署・交番・駐在所'),el('div'));item.lastChild.append(link);
    item.append(el('p',`${row.source_date?String(row.source_date).slice(0,10).replace(/-/g,'/')+'現在':'基準日不明'}｜掲載施設 ${Number(row.spot_count||0).toLocaleString('ja-JP')}件${row.source_license?'｜'+row.source_license:''}`));entries.append(item);
   }more.hidden=shown>=items.length;}
   more.addEventListener('click',add);body.append(entries,more);details.append(summary,body);details.addEventListener('toggle',()=>{if(details.open&&!shown)add();});
   if(normalize(field.value)){details.open=true;add();}list.append(details);
  }
 }
 field.addEventListener('input',render);clear.addEventListener('click',()=>{field.value='';render();field.focus();});render();
}
const api={groups,fetchAll,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SourceBrowser=api;
})(typeof window!=='undefined'?window:globalThis);
