import {CURRENT_PUBLISHING_CAPABILITIES} from './publishing-adapter-plan';

export type PublishingRequestPlan={
  platform:'x'|'tiktok';
  purpose:'creator_info'|'photo_init'|'create_post';
  method:'POST';
  url:string;
  contentType:'application/json; charset=UTF-8'|'application/json';
  authorization:'oauth_user_access_token_required';
  body:Record<string,unknown>;
  externalRequestSent:false;
};

const httpsUrl=/^https:\/\/[^\s]+$/i;
const mediaId=/^[A-Za-z0-9._:-]{1,160}$/;

function bounded(value:string,max:number,label:string){
  const result=value.trim();
  if(!result||result.length>max) throw new Error(label+' is invalid');
  return result;
}

export function buildTikTokCreatorInfoRequestPlan():PublishingRequestPlan{
  return {
    platform:'tiktok',
    purpose:'creator_info',
    method:'POST',
    url:CURRENT_PUBLISHING_CAPABILITIES.tiktok.creatorInfoEndpoint,
    contentType:'application/json; charset=UTF-8',
    authorization:'oauth_user_access_token_required',
    body:{},
    externalRequestSent:false
  };
}

export function buildTikTokPhotoInitRequestPlan(input:{
  title:string;
  description:string;
  photoUrls:string[];
  privacyLevel:string;
  disableComment:boolean;
  autoAddMusic:boolean;
  brandContentToggle:boolean;
  brandOrganicToggle:boolean;
  contentGuidelineApproved:boolean;
}):PublishingRequestPlan{
  if(!input.contentGuidelineApproved) throw new Error('tiktok content sharing guideline review required');
  if(!Array.isArray(input.photoUrls)||input.photoUrls.length<1||input.photoUrls.length>CURRENT_PUBLISHING_CAPABILITIES.tiktok.maxPhotosPerPost){
    throw new Error('tiktok photo count is invalid');
  }
  const urls=input.photoUrls.map((url)=>{
    if(!httpsUrl.test(url)) throw new Error('tiktok photo URL must use https');
    return url;
  });
  const privacy=bounded(input.privacyLevel,80,'privacy level');
  return {
    platform:'tiktok',
    purpose:'photo_init',
    method:'POST',
    url:CURRENT_PUBLISHING_CAPABILITIES.tiktok.photoInitEndpoint,
    contentType:'application/json; charset=UTF-8',
    authorization:'oauth_user_access_token_required',
    body:{
      post_info:{
        title:input.title.trim().slice(0,150),
        description:input.description.trim().slice(0,2200),
        privacy_level:privacy,
        disable_comment:Boolean(input.disableComment),
        auto_add_music:Boolean(input.autoAddMusic),
        brand_content_toggle:Boolean(input.brandContentToggle),
        brand_organic_toggle:Boolean(input.brandOrganicToggle)
      },
      source_info:{
        source:'PULL_FROM_URL',
        photo_cover_index:0,
        photo_images:urls
      },
      post_mode:'DIRECT_POST',
      media_type:'PHOTO'
    },
    externalRequestSent:false
  };
}

export function buildXCreatePostRequestPlan(input:{
  text:string;
  mediaIds:string[];
}):PublishingRequestPlan{
  if(!Array.isArray(input.mediaIds)||input.mediaIds.length<1||input.mediaIds.length>CURRENT_PUBLISHING_CAPABILITIES.x.maxPhotosPerPost){
    throw new Error('x media count is invalid');
  }
  const ids=input.mediaIds.map((id)=>{
    const value=id.trim();
    if(!mediaId.test(value)) throw new Error('x media id is invalid');
    return value;
  });
  return {
    platform:'x',
    purpose:'create_post',
    method:'POST',
    url:CURRENT_PUBLISHING_CAPABILITIES.x.createEndpoint,
    contentType:'application/json',
    authorization:'oauth_user_access_token_required',
    body:{
      text:input.text.trim().slice(0,1000),
      media:{media_ids:ids}
    },
    externalRequestSent:false
  };
}
