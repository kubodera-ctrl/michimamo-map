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
  const tags=[...(input.hashtags||[]),'まちイベ']
    .map((tag)=>clean(tag.replace(/^#/,'').replace(/\s+/g,'')))
    .filter(Boolean)
    .filter((tag,index,array)=>array.indexOf(tag)===index)
    .slice(0,3)
    .map((tag)=>`#${tag}`)
    .join(' ');

  const lines=[
    truncateWeighted(input.prefix,16),
    truncateWeighted(input.placeText,24),
    truncateWeighted(input.title,50),
    truncateWeighted(input.conditionText,30),
    input.dateText ? truncateWeighted(`開催日：${clean(input.dateText)}`,34) : '',
    input.timeText ? truncateWeighted(`時間：${clean(input.timeText)}`,24) : '',
    truncateWeighted(input.summary,32),
    ...(input.ctaLines||[]).slice(0,2).map((line)=>truncateWeighted(line,38)),
    truncateWeighted(tags,24)
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildXShareUrl(input:XShareInput) {
  const url=new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text',buildXShareText(input));
  url.searchParams.set('url',input.pageUrl);
  return url.toString();
}
