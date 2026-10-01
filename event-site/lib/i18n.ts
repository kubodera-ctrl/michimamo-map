import type {Locale} from './i18n-config';

export type Messages = {
  skipToContent:string;
  userMenu:string;
  saved:string;
  savedSearches:string;
  plan:string;
  safeMap:string;
  brandTagline:string;
  footerNotice:string;
  about:string;
  policies:string;
  terms:string;
  privacy:string;
  corrections:string;
  operator:string;
  savedList:string;
  safeInfo:string;
  language:string;
  homeTitle:string;
  homeDescription:string;
  heroTitleLine1:string;
  heroTitleLine2:string;
  heroCopy:string;
  events:string;
  displayed:string;
  page:string;
  noResultsTitle:string;
  noResultsCopy:string;
  translationNotice:string;
};

const ja:Messages={
  skipToContent:'本文へ移動',
  userMenu:'ユーザーメニュー',
  saved:'♡ 行きたい',
  savedSearches:'☆ 保存検索',
  plan:'📅 予定',
  safeMap:'まちまも 安全MAP',
  brandTagline:'by まちまも｜全国のおでかけを、もっと見つけやすく。',
  footerNotice:'掲載内容は変更される場合があります。来場前に必ず主催者・公式サイトの最新情報をご確認ください。',
  about:'まちイベについて',
  policies:'ポリシー・規約',
  terms:'利用規約',
  privacy:'プライバシー',
  corrections:'訂正・掲載停止',
  operator:'運営者情報',
  savedList:'行きたい一覧',
  safeInfo:'まちまもで安全情報を見る',
  language:'言語',
  homeTitle:'まちイベ｜全国の今日・週末イベント検索',
  homeDescription:'全国のイベントを日付・エリア・家族向け・雨の日・推し活・体験などから探せるイベント検索。',
  heroTitleLine1:'今日、どこ行く？',
  heroTitleLine2:'全国のイベントをひとつに。',
  heroCopy:'地域の小さなお祭りから大型イベントまで。見たいものを残し、見たくないものは除外できるイベント検索を目指します。',
  events:'のイベント',
  displayed:'件表示',
  page:'ページ目',
  noResultsTitle:'条件に合う公開イベントはまだありません',
  noResultsCopy:'条件を少し緩めるか、除外ワード・開催期間を見直してください。出典と利用条件を確認できたイベントだけを順次公開します。',
  translationNotice:'翻訳表示の場合も、開催条件は必ず主催者・公式サイトの最新情報をご確認ください。'
};

const en:Messages={
  skipToContent:'Skip to content',
  userMenu:'User menu',
  saved:'♡ Want to go',
  savedSearches:'☆ Saved searches',
  plan:'📅 Plans',
  safeMap:'Machimamo Safety Map',
  brandTagline:'by Machimamo | Find things to do across Japan more easily.',
  footerNotice:'Event details may change. Always check the organizer or official website before visiting.',
  about:'About Machi-Ibe',
  policies:'Policies',
  terms:'Terms',
  privacy:'Privacy',
  corrections:'Corrections / removal',
  operator:'Operator',
  savedList:'Saved events',
  safeInfo:'View safety information on Machimamo',
  language:'Language',
  homeTitle:'Machi-Ibe | Find events across Japan',
  homeDescription:'Find events in Japan by date, area, family-friendly options, rainy days, fandoms and hands-on experiences.',
  heroTitleLine1:'Where should we go today?',
  heroTitleLine2:'Events across Japan, in one place.',
  heroCopy:'From neighborhood festivals to major events. Keep what you want to see and filter out what you do not.',
  events:' events',
  displayed:' shown',
  page:'page',
  noResultsTitle:'No published events match these filters yet',
  noResultsCopy:'Try broadening your filters. Machi-Ibe publishes events after checking sources and usage conditions.',
  translationNotice:'When viewing translations, always confirm the latest event conditions on the organizer or official website.'
};

const zhCn:Messages={
  skipToContent:'跳到正文',
  userMenu:'用户菜单',
  saved:'♡ 想去',
  savedSearches:'☆ 已保存搜索',
  plan:'📅 行程',
  safeMap:'Machimamo 安全地图',
  brandTagline:'by Machimamo｜更轻松地发现日本各地的出游活动。',
  footerNotice:'活动内容可能发生变化。出发前请务必查看主办方或官方网站的最新信息。',
  about:'关于 Machi-Ibe',
  policies:'政策与条款',
  terms:'使用条款',
  privacy:'隐私',
  corrections:'更正・下架',
  operator:'运营方信息',
  savedList:'想去列表',
  safeInfo:'在 Machimamo 查看安全信息',
  language:'语言',
  homeTitle:'Machi-Ibe｜日本全国活动搜索',
  homeDescription:'可按日期、地区、亲子、雨天、兴趣IP和体验活动等条件搜索日本各地活动。',
  heroTitleLine1:'今天去哪里？',
  heroTitleLine2:'日本全国活动，一站查找。',
  heroCopy:'从社区小型庆典到大型活动。保留想看的内容，也能排除不想看的内容。',
  events:'的活动',
  displayed:'条显示',
  page:'第',
  noResultsTitle:'暂时没有符合条件的已发布活动',
  noResultsCopy:'请尝试放宽筛选条件。仅在确认信息来源和使用条件后才会逐步发布活动。',
  translationNotice:'翻译页面仅供参考，活动条件请务必以主办方或官方网站的最新信息为准。'
};

const zhTw:Messages={
  skipToContent:'跳至正文',
  userMenu:'使用者選單',
  saved:'♡ 想去',
  savedSearches:'☆ 已儲存搜尋',
  plan:'📅 行程',
  safeMap:'Machimamo 安全地圖',
  brandTagline:'by Machimamo｜更容易找到日本各地的出遊活動。',
  footerNotice:'活動內容可能變更。出發前請務必查看主辦單位或官方網站的最新資訊。',
  about:'關於 Machi-Ibe',
  policies:'政策與條款',
  terms:'使用條款',
  privacy:'隱私',
  corrections:'更正・下架',
  operator:'營運者資訊',
  savedList:'想去清單',
  safeInfo:'在 Machimamo 查看安全資訊',
  language:'語言',
  homeTitle:'Machi-Ibe｜日本全國活動搜尋',
  homeDescription:'可依日期、地區、親子、雨天、喜愛作品與體驗活動等條件搜尋日本各地活動。',
  heroTitleLine1:'今天去哪裡？',
  heroTitleLine2:'日本全國活動，一站搜尋。',
  heroCopy:'從地方小型祭典到大型活動。保留想看的內容，也能排除不想看的內容。',
  events:'的活動',
  displayed:'筆顯示',
  page:'第',
  noResultsTitle:'目前沒有符合條件的已發布活動',
  noResultsCopy:'請嘗試放寬篩選條件。活動會在確認資訊來源與使用條件後逐步發布。',
  translationNotice:'翻譯頁面僅供參考，活動條件請務必以主辦單位或官方網站的最新資訊為準。'
};

const ko:Messages={
  skipToContent:'본문으로 이동',
  userMenu:'사용자 메뉴',
  saved:'♡ 가고 싶어요',
  savedSearches:'☆ 저장한 검색',
  plan:'📅 일정',
  safeMap:'Machimamo 안전 지도',
  brandTagline:'by Machimamo | 일본 전국의 나들이 정보를 더 쉽게.',
  footerNotice:'행사 내용은 변경될 수 있습니다. 방문 전 주최자 또는 공식 사이트의 최신 정보를 반드시 확인해 주세요.',
  about:'Machi-Ibe 소개',
  policies:'정책・약관',
  terms:'이용약관',
  privacy:'개인정보',
  corrections:'정정・게시 중단',
  operator:'운영자 정보',
  savedList:'가고 싶은 행사',
  safeInfo:'Machimamo에서 안전 정보 보기',
  language:'언어',
  homeTitle:'Machi-Ibe | 일본 전국 이벤트 검색',
  homeDescription:'날짜, 지역, 가족, 비 오는 날, 좋아하는 콘텐츠, 체험 등으로 일본 전국의 이벤트를 검색할 수 있습니다.',
  heroTitleLine1:'오늘 어디 갈까?',
  heroTitleLine2:'일본 전국 이벤트를 한곳에서.',
  heroCopy:'동네 축제부터 대형 이벤트까지. 보고 싶은 것은 남기고 원하지 않는 것은 제외할 수 있습니다.',
  events:'의 이벤트',
  displayed:'건 표시',
  page:'페이지',
  noResultsTitle:'조건에 맞는 공개 이벤트가 아직 없습니다',
  noResultsCopy:'검색 조건을 조금 완화해 보세요. 출처와 이용 조건을 확인한 이벤트부터 순차적으로 공개합니다.',
  translationNotice:'번역 화면에서도 행사 조건은 반드시 주최자 또는 공식 사이트의 최신 정보를 확인해 주세요.'
};

const dictionaries:Record<Locale,Messages>={
  ja,
  en,
  'zh-cn':zhCn,
  'zh-tw':zhTw,
  ko
};

export function getMessages(locale:Locale):Messages {
  return dictionaries[locale] || ja;
}
