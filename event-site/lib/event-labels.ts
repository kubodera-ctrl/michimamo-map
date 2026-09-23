import type {Locale} from './i18n-config';
import type {EventStatus,LocationPrecision,PriceType,VenueTypeKey} from './types';

type Dict=Record<string,string>;

const dictionaries:Record<Locale,{
  category:Dict;
  experience:Dict;
  age:Dict;
  duration:Dict;
  accessibility:Dict;
  price:Record<PriceType,string>;
  venue:Record<VenueTypeKey,string>;
  status:Record<EventStatus,string>;
  location:Record<LocationPrecision,string>;
  sort:Dict;
  generic:Dict;
}> = {
  ja:{
    category:{family:'親子・子ども',festival:'お祭り',fireworks:'花火',food:'グルメ',market:'マルシェ',nature:'自然',learning:'学び',experience:'体験・ものづくり',entertainment:'遊び・エンタメ',sports:'スポーツ',art:'アート・文化'},
    experience:{experience:'体験をすべて見る',experience_gem:'宝石・鉱物・化石探し',experience_fishing:'釣り・魚つかみ',experience_glass:'ガラス細工',experience_ring:'指輪・アクセサリー作り',experience_pottery:'陶芸・焼き物',experience_craft:'工作・クラフト',experience_woodwork:'木工・DIY',experience_food:'料理・お菓子・食品づくり',experience_farm:'農業・収穫',experience_animal:'動物ふれあい・飼育',experience_science:'科学・実験',experience_traditional:'伝統文化・工芸',experience_factory:'工場見学・職業体験',experience_outdoor:'アウトドア・自然体験',experience_sports:'スポーツ体験',experience_other:'その他の体験'},
    age:{age_0_2:'0〜2歳',preschool:'未就学',elementary:'小学生',teen:'中高生',family:'親子'},
    duration:{single:'1日','2_4':'2〜4日','5_10':'5〜10日','11_30':'11〜30日','31_plus':'31日以上'},
    accessibility:{wheelchair:'車いす対応',accessible_toilet:'バリアフリートイレ',accessible_parking:'優先・障害者用駐車場',companion_support:'介助者・同伴者対応',sign_language:'手話対応',captions:'字幕・文字情報',audio_description:'音声案内・音声解説',sensory_friendly:'感覚過敏への配慮',assistance_dog:'補助犬対応',disability_discount:'障害者手帳等の割引'},
    price:{free:'完全無料',partly_free:'一部無料',paid:'有料',unknown:'料金不明'},
    venue:{park_plaza:'🌳 公園・広場',mall:'🛍 モール・商業施設・大型店',event_venue_indoor:'🏢 イベント会場（屋内）',event_venue_outdoor:'🎪 イベント会場（屋外）',hotel:'🏨 ホテル・宿泊施設',amusement:'🎡 レジャー・アミューズメント',culture_public:'🏛 文化・公共施設',other:'📍 その他'},
    status:{scheduled:'開催予定',changed:'内容変更あり',postponed:'延期',cancelled:'中止',sold_out:'完売',registration_closed:'受付終了'},
    location:{exact_venue:'会場位置確認済み',exact_address:'住所位置確認済み',street:'道路・街区付近',approximate:'おおよその位置',unknown:'位置精度未確認'},
    sort:{recommended:'おすすめ（短期・新規開催を優先）',start_date:'開催日が近い順',short_first:'開催期間が短い順',newest:'新着順'},
    generic:{all:'すべて',none:'指定なし',indoor:'屋内',childCentered:'子どもが主役',familyFriendly:'ファミリー向け',accessibilityAvailable:'配慮情報あり',recurring:'開催日指定あり',fandom:'推し活',new:'新着',viewed:'閲覧済み'}
  },
  en:{
    category:{family:'Family & kids',festival:'Festivals',fireworks:'Fireworks',food:'Food',market:'Markets',nature:'Nature',learning:'Learning',experience:'Hands-on experiences',entertainment:'Entertainment',sports:'Sports',art:'Arts & culture'},
    experience:{experience:'All experiences',experience_gem:'Gems, minerals & fossils',experience_fishing:'Fishing & fish catching',experience_glass:'Glass craft',experience_ring:'Rings & accessories',experience_pottery:'Pottery & ceramics',experience_craft:'Crafts',experience_woodwork:'Woodwork & DIY',experience_food:'Cooking & food making',experience_farm:'Farming & harvesting',experience_animal:'Animal experiences',experience_science:'Science & experiments',experience_traditional:'Traditional culture & crafts',experience_factory:'Factory tours & job experiences',experience_outdoor:'Outdoor & nature',experience_sports:'Sports experiences',experience_other:'Other experiences'},
    age:{age_0_2:'Ages 0–2',preschool:'Preschool',elementary:'Elementary school',teen:'Teens',family:'Families'},
    duration:{single:'1 day','2_4':'2–4 days','5_10':'5–10 days','11_30':'11–30 days','31_plus':'31+ days'},
    accessibility:{wheelchair:'Wheelchair access',accessible_toilet:'Accessible restroom',accessible_parking:'Accessible parking',companion_support:'Companion support',sign_language:'Sign-language support',captions:'Captions / text information',audio_description:'Audio guidance / description',sensory_friendly:'Sensory-friendly support',assistance_dog:'Assistance dogs',disability_discount:'Disability discount'},
    price:{free:'Free',partly_free:'Partly free',paid:'Paid',unknown:'Price unknown'},
    venue:{park_plaza:'🌳 Park / plaza',mall:'🛍 Mall / shopping / large store',event_venue_indoor:'🏢 Indoor event venue',event_venue_outdoor:'🎪 Outdoor event venue',hotel:'🏨 Hotel / lodging',amusement:'🎡 Leisure / amusement',culture_public:'🏛 Cultural / public facility',other:'📍 Other'},
    status:{scheduled:'Scheduled',changed:'Details changed',postponed:'Postponed',cancelled:'Cancelled',sold_out:'Sold out',registration_closed:'Registration closed'},
    location:{exact_venue:'Venue location verified',exact_address:'Address verified',street:'Street / block area',approximate:'Approximate location',unknown:'Location accuracy unverified'},
    sort:{recommended:'Recommended',start_date:'Soonest first',short_first:'Shorter events first',newest:'Newest first'},
    generic:{all:'All',none:'Any',indoor:'Indoor',childCentered:'Kids first',familyFriendly:'Family-friendly',accessibilityAvailable:'Accessibility info',recurring:'Specific dates',fandom:'Fandom',new:'New',viewed:'Viewed'}
  },
  'zh-cn':{
    category:{family:'亲子・儿童',festival:'节庆',fireworks:'烟花',food:'美食',market:'市集',nature:'自然',learning:'学习',experience:'体验・手作',entertainment:'娱乐',sports:'运动',art:'艺术・文化'},
    experience:{experience:'查看全部体验',experience_gem:'宝石・矿物・化石',experience_fishing:'钓鱼・抓鱼',experience_glass:'玻璃工艺',experience_ring:'戒指・饰品制作',experience_pottery:'陶艺',experience_craft:'手工・创作',experience_woodwork:'木工・DIY',experience_food:'料理・食品制作',experience_farm:'农作・采摘',experience_animal:'动物互动',experience_science:'科学・实验',experience_traditional:'传统文化・工艺',experience_factory:'工厂参观・职业体验',experience_outdoor:'户外・自然体验',experience_sports:'运动体验',experience_other:'其他体验'},
    age:{age_0_2:'0–2岁',preschool:'学龄前',elementary:'小学生',teen:'中学生・高中生',family:'亲子'},
    duration:{single:'1天','2_4':'2–4天','5_10':'5–10天','11_30':'11–30天','31_plus':'31天以上'},
    accessibility:{wheelchair:'轮椅无障碍',accessible_toilet:'无障碍卫生间',accessible_parking:'无障碍停车位',companion_support:'陪同・照护支持',sign_language:'手语支持',captions:'字幕・文字信息',audio_description:'语音导览・讲解',sensory_friendly:'感官友好',assistance_dog:'辅助犬',disability_discount:'残障优惠'},
    price:{free:'完全免费',partly_free:'部分免费',paid:'收费',unknown:'费用不明'},
    venue:{park_plaza:'🌳 公园・广场',mall:'🛍 商场・商业设施・大型店',event_venue_indoor:'🏢 室内活动会场',event_venue_outdoor:'🎪 户外活动会场',hotel:'🏨 酒店・住宿',amusement:'🎡 休闲・游乐设施',culture_public:'🏛 文化・公共设施',other:'📍 其他'},
    status:{scheduled:'计划举行',changed:'内容有变更',postponed:'延期',cancelled:'取消',sold_out:'售罄',registration_closed:'报名截止'},
    location:{exact_venue:'会场位置已确认',exact_address:'地址已确认',street:'道路・街区附近',approximate:'大致位置',unknown:'位置精度未确认'},
    sort:{recommended:'推荐',start_date:'按开始日期',short_first:'短期活动优先',newest:'最新优先'},
    generic:{all:'全部',none:'不限',indoor:'室内',childCentered:'儿童为主',familyFriendly:'亲子友好',accessibilityAvailable:'有无障碍信息',recurring:'指定举办日',fandom:'兴趣IP',new:'新',viewed:'已查看'}
  },
  'zh-tw':{
    category:{family:'親子・兒童',festival:'節慶',fireworks:'煙火',food:'美食',market:'市集',nature:'自然',learning:'學習',experience:'體驗・手作',entertainment:'娛樂',sports:'運動',art:'藝術・文化'},
    experience:{experience:'查看全部體驗',experience_gem:'寶石・礦物・化石',experience_fishing:'釣魚・抓魚',experience_glass:'玻璃工藝',experience_ring:'戒指・飾品製作',experience_pottery:'陶藝',experience_craft:'手作・創作',experience_woodwork:'木工・DIY',experience_food:'料理・食品製作',experience_farm:'農作・採收',experience_animal:'動物互動',experience_science:'科學・實驗',experience_traditional:'傳統文化・工藝',experience_factory:'工廠參觀・職業體驗',experience_outdoor:'戶外・自然體驗',experience_sports:'運動體驗',experience_other:'其他體驗'},
    age:{age_0_2:'0–2歲',preschool:'學齡前',elementary:'小學生',teen:'國高中生',family:'親子'},
    duration:{single:'1天','2_4':'2–4天','5_10':'5–10天','11_30':'11–30天','31_plus':'31天以上'},
    accessibility:{wheelchair:'輪椅無障礙',accessible_toilet:'無障礙洗手間',accessible_parking:'無障礙停車位',companion_support:'陪同・照護支援',sign_language:'手語支援',captions:'字幕・文字資訊',audio_description:'語音導覽・解說',sensory_friendly:'感官友善',assistance_dog:'輔助犬',disability_discount:'身心障礙優惠'},
    price:{free:'完全免費',partly_free:'部分免費',paid:'收費',unknown:'費用不明'},
    venue:{park_plaza:'🌳 公園・廣場',mall:'🛍 商場・商業設施・大型店',event_venue_indoor:'🏢 室內活動會場',event_venue_outdoor:'🎪 戶外活動會場',hotel:'🏨 飯店・住宿',amusement:'🎡 休閒・遊樂設施',culture_public:'🏛 文化・公共設施',other:'📍 其他'},
    status:{scheduled:'預定舉行',changed:'內容有變更',postponed:'延期',cancelled:'取消',sold_out:'售罄',registration_closed:'報名截止'},
    location:{exact_venue:'會場位置已確認',exact_address:'地址已確認',street:'道路・街區附近',approximate:'大致位置',unknown:'位置精度未確認'},
    sort:{recommended:'推薦',start_date:'依開始日期',short_first:'短期活動優先',newest:'最新優先'},
    generic:{all:'全部',none:'不限',indoor:'室內',childCentered:'兒童為主',familyFriendly:'親子友善',accessibilityAvailable:'有無障礙資訊',recurring:'指定舉辦日',fandom:'興趣IP',new:'新',viewed:'已查看'}
  },
  ko:{
    category:{family:'가족・어린이',festival:'축제',fireworks:'불꽃놀이',food:'먹거리',market:'마켓',nature:'자연',learning:'배움',experience:'체험・만들기',entertainment:'놀이・엔터테인먼트',sports:'스포츠',art:'예술・문화'},
    experience:{experience:'모든 체험 보기',experience_gem:'보석・광물・화석',experience_fishing:'낚시・물고기 잡기',experience_glass:'유리 공예',experience_ring:'반지・액세서리 만들기',experience_pottery:'도예',experience_craft:'공작・공예',experience_woodwork:'목공・DIY',experience_food:'요리・식품 만들기',experience_farm:'농업・수확',experience_animal:'동물 체험',experience_science:'과학・실험',experience_traditional:'전통문화・공예',experience_factory:'공장 견학・직업 체험',experience_outdoor:'야외・자연 체험',experience_sports:'스포츠 체험',experience_other:'기타 체험'},
    age:{age_0_2:'0–2세',preschool:'미취학',elementary:'초등학생',teen:'중고등학생',family:'가족'},
    duration:{single:'1일','2_4':'2–4일','5_10':'5–10일','11_30':'11–30일','31_plus':'31일 이상'},
    accessibility:{wheelchair:'휠체어 이용',accessible_toilet:'장애인 화장실',accessible_parking:'장애인 주차',companion_support:'동반・보조 지원',sign_language:'수어 지원',captions:'자막・문자 정보',audio_description:'음성 안내・해설',sensory_friendly:'감각 배려',assistance_dog:'보조견',disability_discount:'장애인 할인'},
    price:{free:'완전 무료',partly_free:'일부 무료',paid:'유료',unknown:'요금 미확인'},
    venue:{park_plaza:'🌳 공원・광장',mall:'🛍 쇼핑몰・상업시설・대형점',event_venue_indoor:'🏢 실내 행사장',event_venue_outdoor:'🎪 야외 행사장',hotel:'🏨 호텔・숙박',amusement:'🎡 레저・놀이시설',culture_public:'🏛 문화・공공시설',other:'📍 기타'},
    status:{scheduled:'개최 예정',changed:'내용 변경',postponed:'연기',cancelled:'취소',sold_out:'매진',registration_closed:'접수 종료'},
    location:{exact_venue:'행사장 위치 확인 완료',exact_address:'주소 확인 완료',street:'도로・블록 인근',approximate:'대략적 위치',unknown:'위치 정확도 미확인'},
    sort:{recommended:'추천',start_date:'가까운 날짜순',short_first:'짧은 행사 우선',newest:'최신순'},
    generic:{all:'전체',none:'지정 없음',indoor:'실내',childCentered:'어린이 중심',familyFriendly:'가족 친화',accessibilityAvailable:'접근성 정보 있음',recurring:'개최일 지정',fandom:'팬덤',new:'신규',viewed:'열람함'}
  }
};

export function eventLabels(locale:Locale){
  return dictionaries[locale] || dictionaries.ja;
}

export function formatEventDateLocalized(start:string,end:string,locale:Locale){
  const formatter=new Intl.DateTimeFormat(locale==='zh-cn'?'zh-CN':locale==='zh-tw'?'zh-TW':locale==='ko'?'ko-KR':locale==='en'?'en-US':'ja-JP',{
    timeZone:'Asia/Tokyo',year:'numeric',month:'short',day:'numeric'
  });
  const toDate=(value:string)=>{
    const [y,m,d]=value.split('-').map(Number);
    return new Date(Date.UTC(y,m-1,d,12));
  };
  const first=formatter.format(toDate(start));
  const last=formatter.format(toDate(end));
  return start===end?first:`${first} – ${last}`;
}

export function formatDurationLocalized(days:number,locale:Locale){
  if(locale==='ja') return days<=1?'1日開催':`${days}日間`;
  if(locale==='en') return days<=1?'1 day':`${days} days`;
  if(locale==='ko') return days<=1?'1일':`${days}일`;
  return days<=1?'1天':`${days}天`;
}
