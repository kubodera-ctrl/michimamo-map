import type {MachimamoVideoProps} from './types';

export const shortDefault:MachimamoVideoProps={
  templateVersion:'machimamo-card-v2',
  format:'short',
  durationSeconds:42,
  endCardSeconds:4.5,
  publishedAtLabel:'2026.9.23（水）',
  newsSourceName:'国土交通省',
  newsSourceURL:'https://www.mlit.go.jp/saigai/saigai_260920.html',
  mediaSourceName:'気象庁/JAXA・CSU/CIRA',
  rightsEvidenceURL:'https://commons.wikimedia.org/wiki/File:Typhoon_Dujuan_Passes_South_of_Japan_(CIRA_2026-09-22_-_nolabels_portrait).webm',
  headline1:'台風25号　関東で大雨被害',
  headline2:'千葉県で道路・堤防対応続く',
  locationLabel:'関東・千葉',
  summaryPhases:[
    {fromSeconds:0,label:'速報',text:'台風25号の影響で関東では大雨による道路・河川への影響が発生しました。'},
    {fromSeconds:12,label:'何が起きた？',text:'国土交通省は被害状況を公表。千葉県では道路や河川の復旧・交通対応が続いています。'},
    {fromSeconds:25,label:'安全行動',text:'冠水道路や河川・崖など危険な場所を避け、最新の公式情報を確認してください。'}
  ],
  safetyPoints:[
    {title:'冠水道路に\n入らない',detail:'水深不明の道・アンダーパスを避ける',icon:'rain'},
    {title:'危険箇所に\n近づかない',detail:'河川・崖・決壊箇所から離れる',icon:'car'},
    {title:'公式情報を\n確認',detail:'気象庁・自治体・道路情報を確認',icon:'info'}
  ],
  media:[{
    url:'https://satlib.cira.colostate.edu/wp-content/uploads/sites/23/2026/09/20260920213000-20260922151000_g18_ahi_fd_geocolor_Typhoon-Dujuan-passes-Japan_nolabels_portrait.mp4',
    durationSeconds:8.541867,
    startAtSeconds:0,
    useDurationSeconds:8.541867,
    fit:'contain'
  }],
  mediaLabel:'台風25号 ドゥージェン',
  mediaSubLabel:'9月22日　ひまわり9号',
  rightsLevel:'PUBLIC_LICENSE',
  mediaUseMode:['VIDEO_EXCERPT','AUDIO_DISABLED','ATTRIBUTION_REQUIRED'],
  commercialUseAllowed:true,
  modificationAllowed:true,
  audioAllowed:false,
  attributionRequired:true,
  attributionText:'映像：気象庁/JAXA・CSU/CIRA｜JMA Public Data License / CC BY 4.0互換',
  sourceUiFree:true,
  mapCtaTitle:'近くで何が起きてる？',
  mapCtaText:'まちまもMAPで確認',
  profileCta:'詳しくはプロフィールから'
};

export const longDefault:MachimamoVideoProps={
  ...shortDefault,
  format:'long',
  durationSeconds:72,
  endCardSeconds:5,
  summaryPhases:[
    {fromSeconds:0,label:'概要',text:'台風25号の影響で関東では大雨被害が発生。国や自治体による復旧対応が続いています。'},
    {fromSeconds:12,label:'道路への影響',text:'千葉県では道路の土砂災害や通行規制への対応が行われています。'},
    {fromSeconds:25,label:'復旧支援',text:'河川・道路の被害確認と緊急復旧に向けた対応が進められています。'},
    {fromSeconds:39,label:'安全行動',text:'冠水道路や増水河川、崖には近づかず、安全を優先してください。'},
    {fromSeconds:54,label:'最新情報',text:'規制や被害状況は変わります。気象庁・国土交通省・自治体の公式発表を確認してください。'}
  ]
};
