export const MACHIIBE_SOCIAL_MASTER_VERSION='2026-09-22-v1' as const;

export const MACHIIBE_SOCIAL_MASTER={
  brand:{service:'まちイベ',parent:'まちまも',logoRequired:true,layoutLocked:true,aiMayChangeLayout:false,aiRole:'verified_copy_only'},
  tiktok:{
    format:{width:1080,height:1920,aspect:'9:16',fps:30},
    safeArea:{left:92,right:840,bottom:1580},
    frames:[
      {id:'hook',number:1,purpose:'scroll_stop',required:['brand','location','hook','event_title'],maxPoints:0},
      {id:'visual_summary',number:2,purpose:'understand_event',required:['date','location','event_title','summary'],maxPoints:3},
      {id:'facts',number:3,purpose:'decision_facts',required:['date','time','venue','price'],maxPoints:6},
      {id:'why_go',number:4,purpose:'fit_and_value',required:['verified_highlights'],maxPoints:3},
      {id:'end_card',number:5,purpose:'action',required:['machiibe_cta','save_share_cta','machimamo_cta','profile_cta'],layout:'separate_end_card',maxPoints:0}
    ],
    mediaPriority:['licensed_official_video','licensed_official_image','operator_supplied_media','brand_category_visual'],
    short:{minSeconds:20,maxSeconds:40},
    long:{minSeconds:60,maxSeconds:90,onlyWhenEnoughVerifiedSource:true}
  },
  x:{maxHashtags:3,maxVerifiedPoints:3,autoPost:false,composeOnly:true},
  media:{defaultImageUsage:'not_used',requireUsagePermission:true,neverInferPermission:true,fallback:'brand_category_visual'},
  copy:{neverInventFacts:true,unknownStaysUnknown:true,cta:{machiibe:'詳細・条件検索は「まちイベ」',saveShare:'保存して、一緒に行く人へ共有',machimamo:'行く前・当日の周辺確認は「まちまも」',profile:'リンクはプロフィールから'}}
} as const;

export type MachiibeSocialFrameId=typeof MACHIIBE_SOCIAL_MASTER.tiktok.frames[number]['id'];
