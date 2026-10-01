import type { MetadataRoute } from 'next';

export default function manifest():MetadataRoute.Manifest {
  return {
    name:'まちイベ by まちまも',
    short_name:'まちイベ',
    description:'全国のイベントを今日・明日・今週末、子ども向け、推し活などから探せるイベント検索。',
    start_url:'/',
    display:'standalone',
    background_color:'#f7f8fa',
    theme_color:'#2fa7ee',
    icons:[
      {src:'/machiibe-icon-approved.png',sizes:'256x256',type:'image/png',purpose:'any'}
    ]
  };
}
