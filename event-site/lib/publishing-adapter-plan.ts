import type {PublishingPlatform} from './publishing-state';

export type PublishingReadinessInput={
  platform:PublishingPlatform;
  productionType:'CAROUSEL'|'VIDEO';
  mediaCount:number;
  publishEligible:boolean;
  approvalStatus:'pending'|'approved'|'rejected';
  credentialsConfigured:boolean;
  publicMediaReady:boolean;
  verifiedMediaDomain:boolean;
  xMultiPostStrategyApproved?:boolean;
};

export type PublishingReadiness={
  allowed:boolean;
  mode:'x_single_post'|'tiktok_photo_direct'|'tiktok_video_direct'|'blocked';
  blockers:string[];
  externalConnectionRequired:boolean;
};

export const PUBLISHING_ADAPTER_IMPLEMENTED={x:false,tiktok:false} as const;

export const CURRENT_PUBLISHING_CAPABILITIES={
  verifiedAt:'2026-09-28',
  x:{
    maxPhotosPerPost:4,
    createEndpoint:'https://api.x.com/2/tweets',
    mediaUploadEndpoint:'https://api.x.com/2/media/upload',
    payPerUse:true
  },
  tiktok:{
    maxPhotosPerPost:35,
    creatorInfoEndpoint:'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
    photoInitEndpoint:'https://open.tiktokapis.com/v2/post/publish/content/init/',
    videoInitEndpoint:'https://open.tiktokapis.com/v2/post/publish/video/init/',
    statusEndpoint:'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
    requiredDirectPostScope:'video.publish',
    photoSource:'PULL_FROM_URL',
    requiresVerifiedMediaDomain:true
  }
} as const;

export function planPublishingReadiness(input:PublishingReadinessInput):PublishingReadiness{
  const blockers:string[]=[];
  if(!input.publishEligible) blockers.push('revision_not_publish_eligible');
  if(input.approvalStatus!=='approved') blockers.push('revision_not_admin_approved');
  if(!Number.isInteger(input.mediaCount)||input.mediaCount<1) blockers.push('media_missing');

  if(input.platform==='x'){
    if(!input.credentialsConfigured) blockers.push('x_oauth_not_configured');
    if(input.productionType==='CAROUSEL'&&input.mediaCount>CURRENT_PUBLISHING_CAPABILITIES.x.maxPhotosPerPost){
      blockers.push('x_carousel_exceeds_single_post_media_limit');
      if(!input.xMultiPostStrategyApproved) blockers.push('x_multi_post_strategy_not_approved');
    }
    if(input.productionType==='VIDEO'&&!input.publicMediaReady) blockers.push('video_media_not_ready');
    return {
      allowed:blockers.length===0,
      mode:blockers.length===0?'x_single_post':'blocked',
      blockers,
      externalConnectionRequired:true
    };
  }

  if(!input.credentialsConfigured) blockers.push('tiktok_oauth_not_configured');
  if(input.productionType==='CAROUSEL'){
    if(input.mediaCount>CURRENT_PUBLISHING_CAPABILITIES.tiktok.maxPhotosPerPost) blockers.push('tiktok_photo_count_exceeded');
    if(!input.publicMediaReady) blockers.push('tiktok_public_media_urls_not_ready');
    if(!input.verifiedMediaDomain) blockers.push('tiktok_media_domain_not_verified');
    return {
      allowed:blockers.length===0,
      mode:blockers.length===0?'tiktok_photo_direct':'blocked',
      blockers,
      externalConnectionRequired:true
    };
  }

  if(!input.publicMediaReady) blockers.push('tiktok_video_media_not_ready');
  if(!input.verifiedMediaDomain) blockers.push('tiktok_media_domain_not_verified');
  return {
    allowed:blockers.length===0,
    mode:blockers.length===0?'tiktok_video_direct':'blocked',
    blockers,
    externalConnectionRequired:true
  };
}
