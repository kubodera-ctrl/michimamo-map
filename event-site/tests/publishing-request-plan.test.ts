import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTikTokCreatorInfoRequestPlan,
  buildTikTokPhotoInitRequestPlan,
  buildXCreatePostRequestPlan
} from '../lib/publishing-request-plan';

test('TikTok request plans are pure and carry no credential value',()=>{
  const creator=buildTikTokCreatorInfoRequestPlan();
  assert.equal(creator.externalRequestSent,false);
  assert.equal(creator.authorization,'oauth_user_access_token_required');
  assert.match(creator.url,/creator_info\/query/);

  const photo=buildTikTokPhotoInitRequestPlan({
    title:'週末イベント',
    description:'確認済みイベント',
    photoUrls:['https://media.example.test/a.png','https://media.example.test/b.png'],
    privacyLevel:'SELF_ONLY',
    disableComment:false,
    autoAddMusic:false,
    brandContentToggle:false,
    brandOrganicToggle:true,
    contentGuidelineApproved:true
  });
  assert.equal(photo.externalRequestSent,false);
  assert.equal(photo.body.post_mode,'DIRECT_POST');
  assert.equal(photo.body.media_type,'PHOTO');
  assert.deepEqual((photo.body.source_info as any).photo_images,['https://media.example.test/a.png','https://media.example.test/b.png']);
  assert.equal((photo.body.source_info as any).source,'PULL_FROM_URL');
});

test('TikTok photo request plan fails closed before content guideline review',()=>{
  assert.throws(()=>buildTikTokPhotoInitRequestPlan({
    title:'週末イベント',
    description:'確認済みイベント',
    photoUrls:['https://media.example.test/a.png'],
    privacyLevel:'SELF_ONLY',
    disableComment:false,
    autoAddMusic:false,
    brandContentToggle:false,
    brandOrganicToggle:true,
    contentGuidelineApproved:false
  }),/guideline review required/);
});

test('X create plan never accepts more than four media ids',()=>{
  const plan=buildXCreatePostRequestPlan({text:'test',mediaIds:['1','2','3','4']});
  assert.equal(plan.externalRequestSent,false);
  assert.equal((plan.body.media as any).media_ids.length,4);
  assert.throws(()=>buildXCreatePostRequestPlan({text:'test',mediaIds:['1','2','3','4','5']}),/media count is invalid/);
});
