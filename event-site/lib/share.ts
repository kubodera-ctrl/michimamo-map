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
};

function clean(value:string|undefined,max:number){
  return (value||'').replace(/\s+/g,' ').trim().slice(0,max);
}

function compactSummary(value:string|undefined,max=88){
  const text=clean(value,max+20);
  if(text.length<=max) return text;
  return text.slice(0,max-1).trimEnd()+'…';
}

export function buildXShareText(input:XShareInput){
  const tags=[...(input.hashtags||[]),'まちイベ']
    .map((tag)=>clean(tag.replace(/^#/,'').replace(/\s+/g,''),24))
    .filter(Boolean)
    .filter((tag,index,array)=>array.indexOf(tag)===index)
    .slice(0,3)
    .map((tag)=>`#${tag}`)
    .join(' ');

  return [
    clean(input.prefix,30),
    clean(input.placeText,70),
    clean(input.title,100),
    clean(input.conditionText,70),
    input.dateText ? `開催日：${clean(input.dateText,70)}` : '',
    input.timeText ? `時間：${clean(input.timeText,40)}` : '',
    compactSummary(input.summary),
    tags
  ].filter(Boolean).join('\n');
}

export function buildXShareUrl(input:XShareInput) {
  const url=new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text',buildXShareText(input));
  url.searchParams.set('url',input.pageUrl);
  return url.toString();
}
