export function buildXShareUrl(input:{
  title:string;
  pageUrl:string;
  dateText?:string;
  placeText?:string;
  prefix?:string;
}) {
  const parts=[
    input.prefix,
    input.title,
    input.dateText,
    input.placeText,
    '#まちイベ'
  ].filter(Boolean);
  const text=parts.join('\n').slice(0,220);
  const url=new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text',text);
  url.searchParams.set('url',input.pageUrl);
  return url.toString();
}
