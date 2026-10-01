export type TikTokCaptionInput={
  title:string;
  prefecture:string;
  municipality?:string|null;
  venueName?:string|null;
  dateText:string;
  timeText?:string;
  audienceLabel?:string;
  priceLabel?:string;
  indoor?:boolean;
  fandomLabels?:string[];
  categoryLabels?:string[];
};

function clean(value:string|undefined|null){
  return (value||'').replace(/\s+/g,' ').trim();
}

function hashtag(value:string){
  return clean(value).replace(/[\s#・/／,，。]+/g,'');
}

export function buildTikTokCaption(input:TikTokCaptionInput){
  const location=clean([input.prefecture,input.municipality].filter(Boolean).join(' '));
  const tags=[
    'まちイベ',
    'イベント情報',
    input.prefecture==='北海道'?'北海道イベント':`${input.prefecture.replace(/[都府県]$/,'')}イベント`,
    input.audienceLabel?.includes('ファミリー') || input.audienceLabel?.includes('子ども') ? '親子イベント' : '',
    input.fandomLabels?.length ? '推し活' : ''
  ].map(hashtag).filter(Boolean).filter((tag,index,array)=>array.indexOf(tag)===index).slice(0,5);

  return [
    location ? `【${location}】` : '',
    clean(input.title),
    '',
    `開催日：${clean(input.dateText)}`,
    input.timeText ? `時間：${clean(input.timeText)}` : '',
    input.venueName ? `会場：${clean(input.venueName)}` : '',
    '',
    'イベント詳細は「まちイベ」でチェック',
    '',
    tags.map((tag)=>`#${tag}`).join(' ')
  ].filter((line,index,array)=>line!=='' || (index>0 && array[index-1]!=='' && index<array.length-1)).join('\n').trim();
}
