import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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


test('TikTok generator reserves overlay-safe space and wraps before drawing pills',()=>{
  const source=fs.readFileSync(new URL('../components/TikTokAssetGenerator.tsx',import.meta.url),'utf8');
  const master=fs.readFileSync(new URL('../lib/machiibe-social-master.ts',import.meta.url),'utf8');
  assert.match(source,/right:SAFE_RIGHT,bottom:SAFE_BOTTOM/);
  assert.match(source,/MACHIIBE_SOCIAL_MASTER\.tiktok\.safeArea/);
  assert.match(master,/safeArea:\{left:92,right:840,bottom:1580\}/);
  assert.match(source,/if\(tagX\+measured\.width>SAFE_RIGHT\)\{tagX=SAFE_LEFT;tagY\+=72;\}/);
  assert.match(source,/drawPill\(ctx,measured\.text,tagX,tagY,measured\.width\)/);
  assert.match(source,/イベント案内はこちら！/);
  assert.match(source,/右側の操作ボタン・下部キャプションに重要情報が重ならない9:16安全配置/);
});


test('TikTok generator keeps an iOS-safe caption copy fallback',()=>{
  const source=fs.readFileSync(new URL('../components/TikTokAssetGenerator.tsx',import.meta.url),'utf8');
  assert.match(source,/navigator\.clipboard\?\.writeText/);
  assert.match(source,/document\.execCommand\('copy'\)/);
});


test('TikTok admin page blocks unavailable event statuses even on direct URLs',()=>{
  const source=fs.readFileSync(new URL('../app/admin/tiktok/[slug]/page.tsx',import.meta.url),'utf8');
  assert.match(source,/cancelled/);
  assert.match(source,/postponed/);
  assert.match(source,/sold_out/);
  assert.match(source,/registration_closed/);
  assert.match(source,/redirect\('\/admin\?error=tiktok-unavailable'\)/);
});


test('wrapped TikTok title truncation never slices UTF-16 pairs',()=>{
  const source=fs.readFileSync(new URL('../components/TikTokAssetGenerator.tsx',import.meta.url),'utf8');
  assert.match(source,/const lastChars=Array\.from\(lines\[lines\.length-1\]\)/);
  assert.match(source,/lastChars\.pop\(\)/);
  assert.doesNotMatch(source,/last=last\.slice\(0,-1\)/);
});
