export type PublishingPlatform='x'|'tiktok';
export type PlatformPostStatus='not_requested'|'queued'|'uploading'|'sent'|'posting'|'posted'|'failed'|'cancelled';
export type OverallPostState='未'|'一部済'|'済'|'失敗'|'投稿処理中';
export type PlatformDisplayState='未'|'接続設定必要'|'投稿準備中'|'queued'|'uploading'|'送信済 / 投稿未完了'|'posting'|'済'|'失敗';

export type PlatformPostSnapshot={
  platform:PublishingPlatform;
  status:PlatformPostStatus;
  externalStatus?:string|null;
  externalPostId?:string|null;
  publishId?:string|null;
};

export function publishingIdempotencyKey(input:{
  postSetId:string;
  revisionId:string;
  platform:PublishingPlatform;
  repostSequence?:number;
}){
  const seq=input.repostSequence??0;
  return `${input.postSetId}:${input.revisionId}:${input.platform}:${seq}`;
}

export function mapTikTokExternalStatus(status:string):PlatformPostStatus{
  switch(status){
    case 'PUBLISH_COMPLETE': return 'posted';
    case 'FAILED': return 'failed';
    case 'SEND_TO_USER_INBOX': return 'sent';
    case 'PROCESSING_UPLOAD': return 'uploading';
    case 'PROCESSING_DOWNLOAD': return 'posting';
    default: return 'posting';
  }
}

export function isTikTokFinalPosted(status:string){
  return status==='PUBLISH_COMPLETE';
}

export function isXCreateComplete(httpStatus:number,externalPostId:string|null|undefined){
  return httpStatus===201 && Boolean(externalPostId);
}

export function platformDisplayState(input:{
  connected:boolean;
  publishEligible:boolean;
  status?:PlatformPostStatus|null;
}):PlatformDisplayState{
  if(!input.connected) return '接続設定必要';
  const status=input.status||'not_requested';
  if(status==='not_requested'||status==='cancelled') return input.publishEligible?'投稿準備中':'未';
  if(status==='queued') return 'queued';
  if(status==='uploading') return 'uploading';
  if(status==='sent') return '送信済 / 投稿未完了';
  if(status==='posting') return 'posting';
  if(status==='posted') return '済';
  return '失敗';
}

export function deriveOverallPostState(posts:PlatformPostSnapshot[]):OverallPostState{
  const byPlatform=new Map(posts.map((post)=>[post.platform,post]));
  const x=byPlatform.get('x');
  const tiktok=byPlatform.get('tiktok');
  const values=[x,tiktok].filter(Boolean) as PlatformPostSnapshot[];

  if(values.some((post)=>post.status==='failed')) return '失敗';

  const postedCount=values.filter((post)=>post.status==='posted').length;
  if(x?.status==='posted' && tiktok?.status==='posted') return '済';
  if(postedCount>0) return '一部済';

  if(values.some((post)=>['queued','uploading','sent','posting'].includes(post.status))) return '投稿処理中';
  return '未';
}

export function canRequestPlatformPost(input:{
  publishEligible:boolean;
  approvalStatus:'pending'|'approved'|'rejected';
  platform:PublishingPlatform;
  existing?:PlatformPostSnapshot|null;
  explicitRepost?:boolean;
}){
  if(!input.publishEligible || input.approvalStatus!=='approved') return false;
  if(!input.existing) return true;
  if(input.existing.status==='posted') return input.explicitRepost===true;
  if(['queued','uploading','sent','posting'].includes(input.existing.status)) return false;
  return true;
}

export const PLATFORM_CAPABILITIES={
  x:{
    createEndpoint:'https://api.x.com/2/tweets',
    enabledByDefault:false,
    reason:'Official X API is pay-per-use. Keep disabled until credentials and spend are explicitly approved.'
  },
  tiktok:{
    creatorInfoEndpoint:'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
    photoInitEndpoint:'https://open.tiktokapis.com/v2/post/publish/content/init/',
    videoInitEndpoint:'https://open.tiktokapis.com/v2/post/publish/video/init/',
    statusEndpoint:'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
    requiredScope:'video.publish',
    enabledByDefault:false,
    reason:'Requires TikTok app OAuth, verified media URL/domain and API audit for public Direct Post.'
  }
} as const;
