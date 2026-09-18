import test from 'node:test';
import assert from 'node:assert/strict';
import { buildXShareText, buildXShareUrl } from '../lib/share';

test('operator X copy keeps the required event fields in readable order',()=>{
  const text=buildXShareText({
    prefix:'【新着イベント】',
    placeText:'東京都 港区',
    title:'まちイベ テストイベント',
    conditionText:'ファミリー向け・屋内・完全無料',
    dateText:'2026-09-20〜2026-09-21',
    timeText:'10:00〜17:00',
    summary:'親子で楽しめる体験イベントです。',
    pageUrl:'https://example.jp/events/test',
    hashtags:['イベント情報']
  });
  assert.equal(text,[
    '【新着イベント】',
    '東京都 港区',
    'まちイベ テストイベント',
    'ファミリー向け・屋内・完全無料',
    '開催日：2026-09-20〜2026-09-21',
    '時間：10:00〜17:00',
    '親子で楽しめる体験イベントです。',
    '#イベント情報 #まちイベ'
  ].join('\n'));
});

test('X URL keeps the machiibe detail URL separate from post copy',()=>{
  const href=buildXShareUrl({
    title:'テスト',
    placeText:'山梨県 甲府市',
    dateText:'2026-09-20',
    pageUrl:'https://events.example.jp/events/test'
  });
  const url=new URL(href);
  assert.equal(url.hostname,'twitter.com');
  assert.equal(url.searchParams.get('url'),'https://events.example.jp/events/test');
  assert.match(url.searchParams.get('text')||'',/山梨県 甲府市/);
  assert.match(url.searchParams.get('text')||'',/#まちイベ/);
});

test('X copy normalizes whitespace and truncates long summaries',()=>{
  const text=buildXShareText({
    title:'  テスト   イベント  ',
    pageUrl:'https://example.jp',
    summary:'あ'.repeat(200)
  });
  assert.match(text,/テスト イベント/);
  const summaryLine=text.split('\n').find((line)=>line.startsWith('あ'))||'';
  assert.ok(summaryLine.length<=88);
  assert.ok(summaryLine.endsWith('…'));
});
