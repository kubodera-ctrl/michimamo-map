export type FactsOnlyHtmlFact={
  title:string;
  officialUrl:string;
  startAt:string|null;
  endAt:string|null;
  venueName:string|null;
  category:string|null;
  statusFact:string|null;
  dateText:string|null;
};

export type FactsOnlyHtmlParseResult={
  items:FactsOnlyHtmlFact[];
  warnings:string[];
};

type LinkFact={title:string;url:string;index:number;endIndex:number};

function decodeEntities(value:string){
  return value
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&nbsp;/gi,' ')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
}

function plainText(value:string){
  return decodeEntities(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi,' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
      .replace(/<!--[\s\S]*?-->/g,' ')
      .replace(/<[^>]+>/g,' ')
      .replace(/\s+/g,' ')
      .trim()
  );
}

function canonicalUrl(value:string){
  const url=new URL(value);
  url.hash='';
  return url.toString();
}

function siteKey(hostname:string){
  const parts=hostname.toLowerCase().split('.').filter(Boolean);
  if(parts.length>=4&&parts.slice(-2).join('.')==='lg.jp')return parts.slice(-4).join('.');
  if(parts.length>=3&&parts.slice(-2).join('.')==='co.jp')return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}

function links(html:string,pageUrl:string){
  const page=new URL(pageUrl);
  const out:LinkFact[]=[];
  for(const match of html.matchAll(/<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)){
    const href=decodeEntities(match[2].trim());
    if(!href||href.startsWith('#')||/^(?:mailto|tel|javascript):/i.test(href))continue;
    let url:URL;
    try{url=new URL(href,pageUrl);}catch{continue;}
    if(url.protocol!=='https:')continue;
    const attrs=(match[1]||'')+(match[3]||'');
    const attrTitle=attrs.match(/\b(?:aria-label|title)=["']([^"']+)["']/i)?.[1]||'';
    const title=plainText(match[4])||decodeEntities(attrTitle).trim();
    if(!title)continue;
    const index=match.index||0;
    out.push({title,url:canonicalUrl(url.toString()),index,endIndex:index+match[0].length});
  }
  return out.filter(item=>{
    try{return siteKey(new URL(item.url).hostname)===siteKey(page.hostname);}catch{return false;}
  });
}

function wrappingContext(html:string,link:LinkFact){
  const tags=['li','article','tr'];
  let best:string|null=null;
  for(const tag of tags){
    const open=html.toLowerCase().lastIndexOf('<'+tag,link.index);
    if(open<0)continue;
    const close=html.toLowerCase().indexOf('</'+tag+'>',link.endIndex);
    if(close<0)continue;
    const end=close+tag.length+3;
    if(end-open>12_000)continue;
    const candidate=html.slice(open,end);
    if(!best||candidate.length<best.length)best=candidate;
  }
  return best||html.slice(Math.max(0,link.index-900),Math.min(html.length,link.endIndex+1500));
}

function lastMatch(text:string,pattern:RegExp){
  const flags=pattern.flags.includes('g')?pattern.flags:pattern.flags+'g';
  let result:RegExpExecArray|null=null;
  for(const match of text.matchAll(new RegExp(pattern.source,flags)))result=match;
  return result;
}

function pageYear(html:string,pageUrl:string){
  try{
    const fromUrl=new URL(pageUrl).searchParams.get('year');
    if(fromUrl&&/^20\d{2}$/.test(fromUrl))return Number(fromUrl);
  }catch{}
  const text=plainText(html.slice(0,80_000));
  const western=text.match(/\b(20\d{2})\s*年/);
  if(western)return Number(western[1]);
  const fiscal=text.match(/\b(20\d{2})\s*年度/);
  if(fiscal)return Number(fiscal[1]);
  const reiwa=text.match(/令和\s*(\d{1,2})\s*年/);
  if(reiwa)return 2018+Number(reiwa[1]);
  return null;
}

function pageYearMonth(prefix:string){
  const western=lastMatch(prefix,/(20\d{2})\s*年\s*(\d{1,2})\s*月/g);
  if(western)return {year:Number(western[1]),month:Number(western[2])};
  const reiwa=lastMatch(prefix,/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月/g);
  if(reiwa)return {year:2018+Number(reiwa[1]),month:Number(reiwa[2])};
  return null;
}

function iso(year:number,month:number,day:number){
  if(year<2000||year>2100||month<1||month>12||day<1||day>31)return null;
  const value=new Date(Date.UTC(year,month-1,day));
  if(value.getUTCFullYear()!==year||value.getUTCMonth()!==month-1||value.getUTCDate()!==day)return null;
  return String(year)+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
}

function explicitDates(text:string){
  const found:{index:number;value:string}[]=[];
  for(const match of text.matchAll(/\b(20\d{2})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})(?:日)?\b/g)){
    const value=iso(Number(match[1]),Number(match[2]),Number(match[3]));
    if(value)found.push({index:match.index||0,value});
  }
  for(const match of text.matchAll(/令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g)){
    const value=iso(2018+Number(match[1]),Number(match[2]),Number(match[3]));
    if(value)found.push({index:match.index||0,value});
  }
  return found.sort((a,b)=>a.index-b.index).map(item=>item.value);
}

function datesWithFallbackYear(text:string,fallbackYear:number|null){
  const explicit=explicitDates(text);
  if(explicit.length)return explicit;
  if(!fallbackYear)return [];
  const found:string[]=[];
  for(const match of text.matchAll(/(?:^|\D)(\d{1,2})月\s*(\d{1,2})日/g)){
    const value=iso(fallbackYear,Number(match[1]),Number(match[2]));
    if(value)found.push(value);
  }
  return found;
}

function firstDateText(text:string){
  const patterns=[
    /(?:20\d{2}年\s*)?\d{1,2}月\s*\d{1,2}日(?:\s*[～〜\-ー]\s*(?:(?:20\d{2}年\s*)?\d{1,2}月\s*\d{1,2}日))?/,
    /20\d{2}[\/.\-]\d{1,2}[\/.\-]\d{1,2}(?:\s*[～〜\-ー]\s*20\d{2}[\/.\-]\d{1,2}[\/.\-]\d{1,2})?/,
    /令和\s*\d{1,2}年\s*\d{1,2}月\s*\d{1,2}日(?:\s*[～〜\-ー]\s*(?:令和\s*\d{1,2}年\s*)?\d{1,2}月\s*\d{1,2}日)?/
  ];
  for(const pattern of patterns){
    const match=text.match(pattern);
    if(match)return match[0].replace(/\s+/g,' ').trim();
  }
  return null;
}

function statusFact(text:string){
  return text.match(/申込終了|募集終了|受付終了|募集中|受付中|事前申込必要|事前申込不要|開催中/)?.[0]||null;
}

function venueAfterLabel(text:string){
  const match=text.match(/開催場所\s*[:：]?\s*(.{1,100}?)(?=\s*(?:開催期間|開催時間|事前申込|お問い合わせ|問合せ|主催|$))/);
  return match?match[1].trim():null;
}

function unique(items:FactsOnlyHtmlFact[]){
  const seen=new Set<string>();
  return items.filter(item=>{
    const key=item.officialUrl+'|'+item.title+'|'+(item.startAt||item.dateText||'');
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function fact(title:string,url:string,context:string,fallbackYear:number|null,patch:Partial<FactsOnlyHtmlFact>={}):FactsOnlyHtmlFact{
  const text=plainText(context);
  const dates=datesWithFallbackYear(text,fallbackYear);
  return {
    title:title.trim(),
    officialUrl:url,
    startAt:patch.startAt??dates[0]??null,
    endAt:patch.endAt??(dates.length>1?dates[1]:null),
    venueName:patch.venueName??null,
    category:patch.category??null,
    statusFact:patch.statusFact??statusFact(text),
    dateText:patch.dateText??firstDateText(text)
  };
}

function parseIbaraki(html:string,pageUrl:string){
  const year=pageYear(html,pageUrl);
  const out:FactsOnlyHtmlFact[]=[];
  for(const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const row=rowMatch[1];
    const cells=[...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>m[1]);
    if(cells.length<5)continue;
    const eventLinks=links(cells[4],pageUrl);
    if(!eventLinks.length)continue;
    const date=plainText(cells[0]);
    const status=plainText(cells[3])||null;
    const venue=cells.length>5?plainText(cells[5])||null:null;
    const category=cells.length>2?plainText(cells[2])||null:null;
    const context=[date,status||'',venue||'',category||''].join(' ');
    for(const link of eventLinks){
      out.push(fact(link.title,link.url,context,year,{statusFact:status,venueName:venue,category,dateText:firstDateText(date)}));
    }
  }
  return out;
}

function parseFukui(html:string,pageUrl:string){
  const year=pageYear(html,pageUrl);
  const out:FactsOnlyHtmlFact[]=[];
  for(const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>m[1]);
    if(cells.length<3)continue;
    const eventLinks=links(cells[0],pageUrl).filter(link=>{
      const url=new URL(link.url);
      return url.pathname.endsWith('/event/view.php')&&url.searchParams.has('event_cod');
    });
    if(!eventLinks.length)continue;
    const period=plainText(cells[1]);
    const venue=plainText(cells[2])||null;
    for(const link of eventLinks){
      out.push(fact(link.title,link.url,period,year,{venueName:venue,dateText:firstDateText(period)}));
    }
  }
  return out;
}

function parseTochigi(html:string,pageUrl:string){
  const out:FactsOnlyHtmlFact[]=[];
  for(const tableMatch of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    const table=tableMatch[1];
    const prefix=plainText(html.slice(Math.max(0,(tableMatch.index||0)-2500),tableMatch.index||0));
    const ym=pageYearMonth(prefix);
    if(!ym)continue;
    for(const cellMatch of table.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)){
      const cell=cellMatch[1];
      const text=plainText(cell);
      const day=Number(text.match(/(?:^|\s)(\d{1,2})(?=\s|$)/)?.[1]||'');
      const date=day?iso(ym.year,ym.month,day):null;
      if(!date)continue;
      const eventLinks=links(cell,pageUrl).filter(link=>!/(イベント情報一覧|本日のイベント一覧|長期イベント一覧)/.test(link.title));
      for(const link of eventLinks){
        out.push(fact(link.title,link.url,text,null,{startAt:date,endAt:null,dateText:String(ym.year)+'年'+String(ym.month)+'月'+String(day)+'日'}));
      }
    }
  }
  return out;
}

function parseKyotoStation(html:string,pageUrl:string){
  const page=canonicalUrl(pageUrl);
  const out:FactsOnlyHtmlFact[]=[];
  for(const link of links(html,pageUrl)){
    const url=new URL(link.url);
    const path=url.pathname.toLowerCase();
    if(!path.startsWith('/events/')||path==='/events/'||path.startsWith('/events/news_pdf/'))continue;
    if(canonicalUrl(link.url)===page)continue;
    const context=wrappingContext(html,link);
    const text=plainText(context);
    if(!firstDateText(text)&&!explicitDates(text).length)continue;
    out.push(fact(link.title,link.url,context,null));
  }
  return out;
}

function parseKyotoPref(html:string,pageUrl:string){
  const page=canonicalUrl(pageUrl);
  const out:FactsOnlyHtmlFact[]=[];
  for(const link of links(html,pageUrl)){
    if(canonicalUrl(link.url)===page)continue;
    const context=wrappingContext(html,link);
    const text=plainText(context);
    const dateText=firstDateText(text);
    if(!dateText&&!/(開催|募集|申込|イベント)/.test(text))continue;
    // Month/day-only values deliberately remain non-canonical: the source list does not always state a year.
    const dates=explicitDates(text);
    out.push(fact(link.title,link.url,context,null,{
      startAt:dates[0]||null,
      endAt:dates.length>1?dates[1]:null,
      dateText
    }));
  }
  return out;
}

function parseYamaguchi(html:string,pageUrl:string){
  const out:FactsOnlyHtmlFact[]=[];
  for(const link of links(html,pageUrl)){
    const context=wrappingContext(html,link);
    const text=plainText(context);
    if(!/(開催場所|開催期間|開催時間|事前申込)/.test(text))continue;
    const venue=venueAfterLabel(text);
    out.push(fact(link.title,link.url,context,pageYear(html,pageUrl),{
      venueName:venue,
      statusFact:statusFact(text)
    }));
  }
  return out;
}

export function parseFactsOnlyHtml(sourceKey:string,html:string,pageUrl:string):FactsOnlyHtmlParseResult{
  let items:FactsOnlyHtmlFact[]=[];
  if(sourceKey==='ibaraki-kasumigaura-esc-events')items=parseIbaraki(html,pageUrl);
  else if(sourceKey==='fukui-pref-odekake-events')items=parseFukui(html,pageUrl);
  else if(sourceKey==='tochigi-pref-event-calendar')items=parseTochigi(html,pageUrl);
  else if(sourceKey==='kyoto-station-building-events')items=parseKyotoStation(html,pageUrl);
  else if(sourceKey==='kyoto-pref-current-events')items=parseKyotoPref(html,pageUrl);
  else if(sourceKey==='yamaguchi-pref-event-calendar')items=parseYamaguchi(html,pageUrl);
  else return {items:[],warnings:['unsupported_facts_only_source']};

  items=unique(items).filter(item=>item.title.length>=2&&item.officialUrl!==canonicalUrl(pageUrl));
  return {items,warnings:items.length?[]:['no_source_specific_fact_items']};
}
