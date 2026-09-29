import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyOshiEventType,entityMatchesQuery,isEventLikeLimitedRetail,type OshiEntity} from '../../shared/machiibe-ingestion/oshi';

test('oshi event taxonomy identifies compound event types',()=>{
  const types=classifyOshiEventType('キャラクターショー＆ミニライブ・撮影会');
  assert.ok(types.includes('character_show'));
  assert.ok(types.includes('mini_live'));
  assert.ok(types.includes('photo_session'));
});

test('entity aliases support normalized cross-search',()=>{
  const entity:OshiEntity={id:'e',type:'character',canonicalName:'シナモロール',aliases:['シナモン'],parentEntityIds:[],relatedEntityIds:[],officialUrls:[],active:true};
  assert.equal(entityMatchesQuery(entity,'シナモン'),true);
});

test('limited retail is an event only when visiting is itself a destination purpose',()=>{
  assert.equal(isEventLikeLimitedRetail({limited:true,destinationPurpose:true,hasExperienceOrExhibition:false,ordinarySale:false}),true);
  assert.equal(isEventLikeLimitedRetail({limited:false,destinationPurpose:false,hasExperienceOrExhibition:false,ordinarySale:true}),false);
});