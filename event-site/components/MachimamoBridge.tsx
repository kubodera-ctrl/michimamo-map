import {TrackedLink} from './TrackedLink';
import {machimamoMapUrl} from '@/lib/url-config';
import type {Locale} from '@/lib/i18n-config';

const copy:Record<Locale,{title:string;body:string;points:[string,string,string,string];small:string;cta:string}>={
  ja:{title:'行き先を決めたら、当日の安心は「まちまも」へ。',body:'まちイベでおでかけ先を探して、まちまもMAPで周辺の安全情報を確認。2つを行き来できるおでかけ導線です。',points:['🌡 暑さ指数','❤️ AED','👮 交番・警察署','🗺 周辺MAP'],small:'おでかけ前・当日に',cta:'まちまもMAPを開く →'},
  en:{title:'Once you pick a destination, check the area with Machimamo.',body:'Find where to go with Machi-Ibe, then use Machimamo Map to check nearby safety information.',points:['🌡 Heat index','❤️ AED','👮 Police','🗺 Nearby map'],small:'Before and during your outing',cta:'Open Machimamo Map →'},
  'zh-cn':{title:'决定目的地后，用 Machimamo 查看周边安全信息。',body:'先用 Machi-Ibe 找活动，再用 Machimamo 地图确认会场周边的安全信息。',points:['🌡 暑热指数','❤️ AED','👮 派出所・警察署','🗺 周边地图'],small:'出发前和当天',cta:'打开 Machimamo 地图 →'},
  'zh-tw':{title:'決定目的地後，用 Machimamo 查看周邊安全資訊。',body:'先用 Machi-Ibe 找活動，再用 Machimamo 地圖確認會場周邊的安全資訊。',points:['🌡 暑熱指數','❤️ AED','👮 派出所・警察署','🗺 周邊地圖'],small:'出發前和當天',cta:'開啟 Machimamo 地圖 →'},
  ko:{title:'목적지를 정했다면 Machimamo에서 주변 안전도 확인하세요.',body:'Machi-Ibe에서 나들이 장소를 찾고 Machimamo 지도에서 주변 안전 정보를 확인할 수 있습니다.',points:['🌡 더위 지수','❤️ AED','👮 파출소・경찰서','🗺 주변 지도'],small:'나들이 전과 당일',cta:'Machimamo 지도 열기 →'}
};

export function MachimamoBridge({locale='ja'}:{locale?:Locale}){
  const url=new URL(machimamoMapUrl());
  url.searchParams.set('from','machiibe');
  const t=copy[locale] || copy.ja;

  return (
    <section className="machimamo-bridge" aria-labelledby="machimamo-bridge-title">
      <div className="machimamo-bridge-copy">
        <p className="eyebrow">MACHI IBE × MACHI MAMO</p>
        <h2 id="machimamo-bridge-title">{t.title}</h2>
        <p>{t.body}</p>
        <div className="machimamo-bridge-points">
          {t.points.map((point)=><span key={point}>{point}</span>)}
        </div>
      </div>
      <div className="machimamo-bridge-action">
        <small>{t.small}</small>
        <TrackedLink href={url.toString()} metric="machimamo_map">{t.cta}</TrackedLink>
      </div>
    </section>
  );
}
