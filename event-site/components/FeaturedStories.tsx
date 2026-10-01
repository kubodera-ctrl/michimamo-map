import Link from 'next/link';
import {localePath,type Locale} from '@/lib/i18n-config';

const storyDefs=[
  {key:'weekend',eyebrow:'WEEKEND',href:'/?when=weekend',mark:'01',visual:'SAT / SUN',theme:'weekend'},
  {key:'indoor',eyebrow:'INDOOR',href:'/?when=today&rainy=1',mark:'02',visual:'INSIDE',theme:'indoor'},
  {key:'oshi',eyebrow:'OSHI KATSU',href:'/?when=30days',mark:'03',visual:'FANDOM',theme:'oshi'},
  {key:'free',eyebrow:'FREE',href:'/?when=30days&price=free',mark:'04',visual:'¥0',theme:'free'},
  {key:'experience',eyebrow:'EXPERIENCE',href:'/?when=30days&experience=experience',mark:'05',visual:'DO IT',theme:'experience'},
  {key:'kids',eyebrow:'FOR KIDS',href:'/?when=30days&childFocus=1',mark:'06',visual:'KIDS',theme:'kids'}
] as const;

const copy:Record<Locale,{heading:string;intro:string;view:string;stories:Record<string,{title:string;description:string}>}>={
  ja:{heading:'注目記事・おでかけ特集',intro:'イベント一覧とは別に、目的からおでかけ候補を見つける特集です。',view:'特集を見る →',stories:{
    weekend:{title:'今週末、どこ行く？',description:'土日のおでかけ候補を、全国のイベントからまとめて探す。'},
    indoor:{title:'雨の日も暑い日も。室内おでかけ',description:'天候に左右されにくい、親子向けの屋内イベントをチェック。'},
    oshi:{title:'推し活イベントを見つける',description:'作品・キャラ・クリエイター名から、確認済み情報を探す。'},
    free:{title:'完全無料のイベント',description:'入場・参加が完全無料と確認できたイベントに絞って探す。'},
    experience:{title:'作る・釣る・探す。体験から選ぶ',description:'宝石探し、釣り、ガラス細工、指輪作りなど参加型のおでかけ。'},
    kids:{title:'子どもが主役のおでかけ',description:'見るだけじゃなく、子ども自身が楽しみやすいイベントを探す。'}
  }},
  en:{heading:'Featured ideas',intro:'Browse events by purpose, not only from the full event list.',view:'View feature →',stories:{
    weekend:{title:'Where to go this weekend?',description:'Browse weekend ideas from events across Japan.'},
    indoor:{title:'Indoor ideas for rainy or hot days',description:'Find family-friendly indoor events that are less weather-dependent.'},
    oshi:{title:'Find fandom events',description:'Search verified events by title, character or creator.'},
    free:{title:'Completely free events',description:'Browse events confirmed to have free admission and participation.'},
    experience:{title:'Make, fish, discover',description:'Find hands-on activities such as gem hunting, fishing, glass craft and jewelry making.'},
    kids:{title:'Events where kids take the lead',description:'Find events designed for children to actively enjoy, not only watch.'}
  }},
  'zh-cn':{heading:'精选活动专题',intro:'除了活动列表，也可按出游目的快速找到候选活动。',view:'查看专题 →',stories:{
    weekend:{title:'这个周末去哪里？',description:'从日本全国活动中查找周末出游选择。'},
    indoor:{title:'雨天和炎热天气也能玩',description:'查看更不受天气影响的亲子室内活动。'},
    oshi:{title:'寻找兴趣IP活动',description:'按作品、角色、创作者名称查找已确认活动。'},
    free:{title:'完全免费的活动',description:'只查看已确认入场与参加均免费的活动。'},
    experience:{title:'制作、钓鱼、探索',description:'寻找宝石、钓鱼、玻璃工艺、饰品制作等参与型体验。'},
    kids:{title:'以儿童为主角的出游',description:'寻找更适合孩子主动参与和体验的活动。'}
  }},
  'zh-tw':{heading:'精選活動專題',intro:'除了活動清單，也可依出遊目的快速找到候選活動。',view:'查看專題 →',stories:{
    weekend:{title:'這個週末去哪裡？',description:'從日本全國活動中找週末出遊選擇。'},
    indoor:{title:'雨天和炎熱天氣也能玩',description:'查看較不受天氣影響的親子室內活動。'},
    oshi:{title:'尋找興趣IP活動',description:'依作品、角色、創作者名稱查找已確認活動。'},
    free:{title:'完全免費的活動',description:'只查看已確認入場與參加均免費的活動。'},
    experience:{title:'製作、釣魚、探索',description:'尋找寶石、釣魚、玻璃工藝、飾品製作等參與型體驗。'},
    kids:{title:'以兒童為主角的出遊',description:'尋找更適合孩子主動參與和體驗的活動。'}
  }},
  ko:{heading:'추천 나들이 특집',intro:'전체 이벤트 목록 외에도 목적별로 나들이 후보를 찾아보세요.',view:'특집 보기 →',stories:{
    weekend:{title:'이번 주말 어디 갈까?',description:'일본 전국 이벤트에서 주말 나들이 후보를 찾아보세요.'},
    indoor:{title:'비 오는 날과 더운 날에도 실내로',description:'날씨 영향을 덜 받는 가족용 실내 이벤트를 확인하세요.'},
    oshi:{title:'팬덤 이벤트 찾기',description:'작품, 캐릭터, 크리에이터 이름으로 확인된 이벤트를 찾습니다.'},
    free:{title:'완전 무료 이벤트',description:'입장과 참가가 모두 무료로 확인된 이벤트만 봅니다.'},
    experience:{title:'만들고, 낚고, 찾아보는 체험',description:'보석 찾기, 낚시, 유리 공예, 액세서리 만들기 등 참여형 체험을 찾습니다.'},
    kids:{title:'아이들이 주인공인 나들이',description:'보기만 하는 것이 아니라 아이가 직접 즐기기 좋은 이벤트를 찾습니다.'}
  }}
};

function localizedHref(href:string,locale:Locale){
  const [path,query='']=href.split('?');
  const base=localePath(path||'/',locale);
  return query ? `${base}?${query}` : base;
}

export function FeaturedStories({locale='ja'}:{locale?:Locale}){
  const t=copy[locale] || copy.ja;
  return (
    <section className="featured-stories" aria-labelledby="featured-stories-title">
      <div className="featured-stories-head">
        <div>
          <p className="eyebrow">FEATURE</p>
          <h2 id="featured-stories-title">{t.heading}</h2>
        </div>
        <p>{t.intro}</p>
      </div>
      <div className="featured-story-grid">
        {storyDefs.map((story)=>{
          const storyCopy=t.stories[story.key];
          return (
            <Link className={`featured-story-card featured-story-${story.theme}`} href={localizedHref(story.href,locale)} key={story.key}>
              <div className="featured-story-visual" aria-hidden="true">
                <div className="featured-story-visual-top">
                  <span className="featured-story-index">{story.mark}</span>
                  <span className="featured-story-signal"><i /><i /><i /></span>
                </div>
                <strong className="featured-story-word">{story.visual}</strong>
                <b>{story.eyebrow}</b>
              </div>
              <div className="featured-story-copy">
                <small>{story.eyebrow}</small>
                <strong>{storyCopy.title}</strong>
                <p>{storyCopy.description}</p>
                <span>{t.view}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
