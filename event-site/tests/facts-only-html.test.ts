import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFactsOnlyHtml} from '../../shared/machiibe-ingestion/facts-only-html';

test('Kyoto Pref keeps month/day-only facts without inventing a year',()=>{
  const html='<ul><li>10月26日迄 <a href="/event/detail-a.html">文化体験募集</a></li></ul>';
  const parsed=parseFactsOnlyHtml('kyoto-pref-current-events',html,'https://www.pref.kyoto.jp/event/');
  assert.equal(parsed.items.length,1);
  assert.equal(parsed.items[0].title,'文化体験募集');
  assert.equal(parsed.items[0].startAt,null);
  assert.equal(parsed.items[0].dateText,'10月26日');
  assert.equal(parsed.items[0].officialUrl,'https://www.pref.kyoto.jp/event/detail-a.html');
});

test('Ibaraki facility schedule maps explicit row facts only',()=>{
  const html='<h2>2026年度</h2><table><tr><td>10月3日</td><td>土</td><td>自然観察</td><td>募集中</td><td><a href="/soshiki/x/event-a.htm">湖畔観察会</a></td><td>環境学習館</td><td>親子</td></tr></table>';
  const parsed=parseFactsOnlyHtml('ibaraki-kasumigaura-esc-events',html,'https://www.pref.ibaraki.jp/soshiki/seikatsukankyo/kasumigauraesc/03_event/event_schedule2026.htm');
  assert.equal(parsed.items.length,1);
  assert.equal(parsed.items[0].startAt,'2026-10-03');
  assert.equal(parsed.items[0].venueName,'環境学習館');
  assert.equal(parsed.items[0].statusFact,'募集中');
  assert.equal(parsed.items[0].category,'自然観察');
});

test('Kyoto Station accepts only event detail paths and explicit date evidence',()=>{
  const html='<ul><li><span>2026年10月5日</span><a href="/events/autumn-stage/">駅ビルステージ</a></li><li><a href="/events/">一覧</a></li></ul>';
  const parsed=parseFactsOnlyHtml('kyoto-station-building-events',html,'https://www.kyoto-station-building.co.jp/events/');
  assert.equal(parsed.items.length,1);
  assert.equal(parsed.items[0].startAt,'2026-10-05');
  assert.equal(parsed.items[0].officialUrl,'https://www.kyoto-station-building.co.jp/events/autumn-stage/');
});

test('Yamaguchi calendar maps labeled venue, status and date from one event block',()=>{
  const html='<ul><li><a href="/cms/a/event-a.html">県民講座</a><p>事前申込必要 開催時間 2026年10月10日 10:00 開催場所 県民会館 開催期間 2026年10月10日 お問い合わせ 担当課</p></li></ul>';
  const parsed=parseFactsOnlyHtml('yamaguchi-pref-event-calendar',html,'https://www.pref.yamaguchi.lg.jp/calendar/');
  assert.equal(parsed.items.length,1);
  assert.equal(parsed.items[0].startAt,'2026-10-10');
  assert.equal(parsed.items[0].venueName,'県民会館');
  assert.equal(parsed.items[0].statusFact,'事前申込必要');
});

test('Tochigi calendar combines explicit page year/month with day cell',()=>{
  const html='<h1>2026年10月</h1><table><tr><td>12 <a href="https://www.pref.tochigi.lg.jp/a01/event-a.html">親子講座</a></td></tr></table>';
  const parsed=parseFactsOnlyHtml('tochigi-pref-event-calendar',html,'https://www.event.pref.tochigi.lg.jp/cgi-bin/event_cal/calendar.cgi');
  assert.equal(parsed.items.length,1);
  assert.equal(parsed.items[0].startAt,'2026-10-12');
  assert.equal(parsed.items[0].officialUrl,'https://www.pref.tochigi.lg.jp/a01/event-a.html');
});

test('Fukui event table maps period and venue from event_cod row',()=>{
  const html='<h1>2026年10月</h1><table><tr><td><a href="/event/view.php?event_cod=ABC123">秋の体験会</a></td><td>10月2日 ～ 10月12日</td><td>交流広場</td></tr></table>';
  const parsed=parseFactsOnlyHtml('fukui-pref-odekake-events',html,'https://www2.pref.fukui.lg.jp/event/view.php?year=2026&month=10');
  assert.equal(parsed.items.length,1);
  assert.equal(parsed.items[0].startAt,'2026-10-02');
  assert.equal(parsed.items[0].endAt,'2026-10-12');
  assert.equal(parsed.items[0].venueName,'交流広場');
  assert.match(parsed.items[0].officialUrl,/event_cod=ABC123/);
});
