(function(root,factory){
  const value=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=value;
  root.MachimamoDriveTokyoSnapshot=value;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  return Object.freeze({
    sourceId:'tokyo-wangan-speed-guideline',
    sourceHash:'PREVIEW_GENERATED_BY_CONTRACT_TEST',
    verifiedAt:'2026-09-30',
    events:Object.freeze([
      {eventId:'tokyo-wangan-speed-guideline-01',routeName:'国道357号',enforcementClass:'METROPOLITAN_FOCUS',segmentStartText:'荒川河口橋上',segmentEndText:'京浜大橋上',speedLimitKmh:60,speedLimitText:'60km',alternateSpeedKmh:[],startMinute:360,endMinute:1440,timeStart:'06:00',timeEnd:'24:00'},
      {eventId:'tokyo-wangan-speed-guideline-02',routeName:'晴海通り',enforcementClass:'METROPOLITAN_FOCUS',segmentStartText:'東雲交差点',segmentEndText:'東雲橋上',speedLimitKmh:50,speedLimitText:'50km',alternateSpeedKmh:[],startMinute:840,endMinute:1320,timeStart:'14:00',timeEnd:'22:00'},
      {eventId:'tokyo-wangan-speed-guideline-03',routeName:'明治通り',enforcementClass:'METROPOLITAN_FOCUS',segmentStartText:'夢の島交差点',segmentEndText:'夢の島大橋上',speedLimitKmh:50,speedLimitText:'50km',alternateSpeedKmh:[],startMinute:720,endMinute:960,timeStart:'12:00',timeEnd:'16:00'},
      {eventId:'tokyo-wangan-speed-guideline-04',routeName:'三ツ目通り',enforcementClass:'METROPOLITAN_FOCUS',segmentStartText:'辰巳交差点',segmentEndText:'七枝橋上',speedLimitKmh:50,speedLimitText:'50km',alternateSpeedKmh:[],startMinute:840,endMinute:1080,timeStart:'14:00',timeEnd:'18:00'},
      {eventId:'tokyo-wangan-speed-guideline-05',routeName:'環二通り',enforcementClass:'METROPOLITAN_FOCUS',segmentStartText:'有明北橋上',segmentEndText:'有明中央橋南交差点',speedLimitKmh:60,speedLimitText:'60km',alternateSpeedKmh:[],startMinute:1200,endMinute:1440,timeStart:'20:00',timeEnd:'24:00'},
      {eventId:'tokyo-wangan-speed-guideline-06',routeName:'臨港道路',enforcementClass:'METROPOLITAN_FOCUS',segmentStartText:'京浜大橋北交差点',segmentEndText:'中央防波堤交差点',speedLimitKmh:50,speedLimitText:'50km (東京ゲートブリッジ上60km)',alternateSpeedKmh:[60],startMinute:360,endMinute:1200,timeStart:'06:00',timeEnd:'20:00'},
      {eventId:'tokyo-wangan-speed-guideline-07',routeName:'都橋通り',enforcementClass:'STATION_FOCUS',segmentStartText:'東雲1丁目交差点',segmentEndText:'台場駅前交差点',speedLimitKmh:50,speedLimitText:'50km',alternateSpeedKmh:[],startMinute:420,endMinute:960,timeStart:'07:00',timeEnd:'16:00'}
    ].map(x=>Object.freeze({
      sourceId:'tokyo-wangan-speed-guideline',
      sourceUrl:'https://www.keishicho.metro.tokyo.lg.jp/sokudo_sisin/1/tokyowangan_sokudo.pdf',
      sourceVerifiedAt:'2026-09-30',
      agency:'警視庁',
      policeStation:'東京湾岸警察署',
      infoType:'SPEED_FOCUS',
      geoPrecision:'EXACT_SEGMENT',
      timePrecision:'EXACT_TIME',
      displayMode:'EXACT_SEGMENT_TIMED',
      freshnessStatus:'CURRENT',
      isOfficial:true,
      ...x
    })))
  });
});
