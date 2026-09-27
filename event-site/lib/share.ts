export type XShareInput={
  title:string;
  pageUrl:string;
  dateText?:string;
  timeText?:string;
  placeText?:string;
  conditionText?:string;
  summary?:string;
  prefix?:string;
  hashtags?:string[];
  ctaLines?:string[];
};

function clean(value:string|undefined){
  return (value||'').replace(/\s+/g,' ').trim();
}

function xCharWeight(char:string){
  const cp=char.codePointAt(0) || 0;
  return cp <= 0x10ff ? 1 : 2;
}

export function xWeightedLength(value:string){
  return Array.from(value).reduce((total,char)=>total+xCharWeight(char),0);
}

function truncateWeighted(value:string|undefined,maxWeight:number){
  const text=clean(value);
  if(!text || maxWeight<=0) return '';
  if(xWeightedLength(text)<=maxWeight) return text;

  const ellipsis='…';
  const reserve=xCharWeight(ellipsis);
  let out='';
  let used=0;
  for(const char of Array.from(text)){
    const weight=xCharWeight(char);
    if(used+weight+reserve>maxWeight) break;
    out+=char;
    used+=weight;
  }
  return out.trimEnd()+ellipsis;
}

export function buildXShareText(input:XShareInput){
  const tagNames=[...(input.hashtags||[])]
    .map((tag)=>clean(tag.replace(/^#/,'').replace(/\s+/g,'')))
    .filter(Boolean)
    .filter((tag,index,array)=>array.indexOf(tag)===index);
  const extraTags=tagNames.filter((tag)=>tag!=='まちイベ').slice(0,2);
  const hashtagTokens=[...extraTags,'まちイベ'].map((tag)=>`#${tag}`);
  const hasCta=Boolean(input.ctaLines?.length);
  const lines:Array<{key:string;text:string}>=[
    {key:'prefix',text:clean(input.prefix)},
    {key:'place',text:clean(input.placeText)},
    {key:'title',text:clean(input.title)},
    {key:'condition',text:clean(input.conditionText)},
    {key:'date',text:input.dateText ? truncateWeighted(`開催日：${clean(input.dateText)}`,44) : ''},
    {key:'time',text:input.timeText ? truncateWeighted(`時間：${clean(input.timeText)}`,30) : ''},
    {key:'summary',text:hasCta ? '' : truncateWeighted(input.summary,28)},
    ...(input.ctaLines||[]).slice(0,2).map((line,index)=>({key:`cta-${index}`,text:truncateWeighted(line,48)})),
    {key:'hashtags',text:hashtagTokens.join(' ')}
  ];

  const maxWeight=245;
  const totalWeight=()=>{
    const active=lines.map((line)=>line.text).filter(Boolean);
    return active.reduce((total,line)=>total+xWeightedLength(line),0)+Math.max(0,active.length-1);
  };
  const shrink=(key:string,minWeight:number)=>{
    const line=lines.find((item)=>item.key===key);
    if(!line?.text) return;
    const excess=totalWeight()-maxWeight;
    if(excess<=0) return;
    const current=xWeightedLength(line.text);
    const target=Math.max(minWeight,current-excess);
    line.text=target<=0?'':truncateWeighted(line.text,target);
  };

  // Preserve dates, time, CTA and the brand hashtag; shorten descriptive copy first.
  for(const [key,min] of [['summary',0],['condition',16],['title',30],['place',14],['prefix',12]] as const){
    shrink(key,min);
  }

  const tagsLine=lines.find((line)=>line.key==='hashtags');
  while(totalWeight()>maxWeight && hashtagTokens.length>1){
    let removable=-1;
    for(let index=hashtagTokens.length-1;index>=0;index-=1){
      if(hashtagTokens[index]!=='#まちイベ'){removable=index;break;}
    }
    if(removable<0) break;
    hashtagTokens.splice(removable,1);
    if(tagsLine) tagsLine.text=hashtagTokens.join(' ');
  }

  // Formal CTA copy is short, but keep a final bounded fallback for unexpected operator input.
  if(totalWeight()>maxWeight){
    for(const key of ['prefix','place','condition'] as const) shrink(key,0);
    shrink('title',20);
  }

  return lines.map((line)=>line.text).filter(Boolean).join('\n');
}

export function buildXShareUrl(input:XShareInput) {
  const url=new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text',buildXShareText(input));
  url.searchParams.set('url',input.pageUrl);
  return url.toString();
}
