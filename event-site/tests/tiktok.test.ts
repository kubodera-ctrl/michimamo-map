import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTikTokCaption } from '../lib/tiktok';

test('TikTok caption uses confirmed event fields and brand hashtags',()=>{
  const text=buildTikTokCaption({
    title:'親子フェス',
    prefecture:'東京都',
    municipality:'港区',
    venueName:'お台場広場',
    dateText:'2026年9月21日',
    timeText:'10:00〜17:00',
    audienceLabel:'ファミリー向け',
    priceLabel:'完全無料',
    indoor:false,
    fandomLabels:[],
    categoryLabels:['親子・子ども']
  });
  assert.match(text,/【東京都 港区】/);
  assert.match(text,/親子フェス/);
  assert.match(text,/開催日：2026年9月21日/);
  assert.match(text,/会場：お台場広場/);
  assert.match(text,/#まちイベ/);
  assert.match(text,/#東京イベント/);
  assert.match(text,/#親子イベント/);
});

test('TikTok caption adds oshi hashtag only for confirmed fandom links',()=>{
  const text=buildTikTokCaption({
    title:'推しイベント',
    prefecture:'大阪府',
    dateText:'2026年9月22日',
    fandomLabels:['ちいかわ']
  });
  assert.match(text,/#推し活/);
  assert.match(text,/#大阪イベント/);
});
