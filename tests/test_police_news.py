import unittest
from datetime import datetime, timezone

from fetch_police_data import CRIME_KEYWORDS, build_search_lanes, extract_address, parse_rss

RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item><title>東京都新宿区で痴漢事案</title><description>新宿区西新宿2丁目で発生しました</description></item>
  <item><title>大阪市北区で不審者</title><description>声かけ事案が発生</description></item>
  <item><title>防犯対策キャンペーン</title><description>イベントのお知らせ</description></item>
</channel></rss>"""


class PoliceNewsTests(unittest.TestCase):
    def test_chikan_is_a_crime_keyword(self):
        self.assertIn("痴漢", CRIME_KEYWORDS)

    def test_extracts_address_with_hiragana(self):
        self.assertEqual(extract_address("埼玉県さいたま市浦和区で発生"), "埼玉県さいたま市浦和区")

    def test_parses_crime_items_and_filters_campaign(self):
        results = parse_rss(RSS, 10, "【防犯ニュース】")
        self.assertEqual(len(results), 2)
        self.assertTrue(results[0]["title"].startswith("【防犯ニュース】"))

    def test_each_regional_limit_is_increased_by_ten(self):
        lanes = build_search_lanes()
        self.assertEqual(lanes[0]["limit"], 25)
        self.assertEqual(next(lane for lane in lanes if lane["query"].startswith("北海道 "))["limit"], 25)
        self.assertEqual(next(lane for lane in lanes if lane["query"].startswith("大阪 "))["limit"], 30)

    def test_ignores_articles_older_than_fourteen_days(self):
        old_rss = """<rss><channel><item>
          <title>東京都新宿区で不審者</title>
          <description>声かけ事案</description>
          <pubDate>Sat, 01 Aug 2026 00:00:00 GMT</pubDate>
        </item></channel></rss>"""
        results = parse_rss(
            old_rss,
            10,
            "【防犯ニュース】",
            now=datetime(2026, 9, 14, tzinfo=timezone.utc),
        )
        self.assertEqual(results, [])


if __name__ == "__main__":
    unittest.main()
