import html
import os
import random
import re
import time
from datetime import datetime, timedelta, timezone
from xml.etree import ElementTree

SUPABASE_URL = "https://ckftozjhdszlwqnylmxv.supabase.co"
MCAP_FEED_URL = "https://mcap.jp/feed/safety"
GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search"
CRIME_KEYWORDS = ("不審者", "声かけ", "公然わいせつ", "つきまとい", "痴漢", "盗撮", "露出", "強盗", "不審車両")
NG_WORDS = ("熱中症", "プロジェクト", "キャンペーン", "映画", "ドラマ", "対策", "イベント", "アウト？", "コラム", "週間", "パトロール", "呼びかけ", "講座")
HEADERS = {"User-Agent": "Michimamo-Safety-News/2.0 (+https://machimamo-map.vercel.app/)"}


def get_supabase():
    from supabase import create_client

    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is missing")
    return create_client(SUPABASE_URL, key)


def cleanup_old_official_spots(supabase) -> None:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    supabase.table("spots").delete().in_("category", ["official"]).lt("created_at", cutoff).execute()
    print("🧹 古い公的情報をクリーンアップしました。")


def clean_text(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html.unescape(value or ""))
    return re.sub(r"\s+", " ", text).strip()


def extract_address(text: str) -> str | None:
    chars = r"一-龠ぁ-んァ-ヶー"
    patterns = (
        rf"[{chars}]+(?:都|道|府|県)[{chars}]+市[{chars}]+区",
        rf"[{chars}]+(?:都|道|府|県)[{chars}]+(?:区|市|郡|町|村)",
        rf"[{chars}]+市[{chars}]+区",
        rf"[{chars}]+(?:区|市|郡|町|村)",
    )
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return None


def parse_rss(xml: str, limit: int, prefix: str) -> list[dict]:
    results = []
    root = ElementTree.fromstring(xml)
    for item in root.findall(".//item"):
        title = clean_text(item.findtext("title", default=""))
        description = clean_text(item.findtext("description", default=""))
        combined = f"{title} {description}"
        if not any(keyword in combined for keyword in CRIME_KEYWORDS):
            continue
        if any(word in title for word in NG_WORDS):
            continue
        address = extract_address(combined)
        if not address:
            continue
        results.append({
            "title": f"{prefix}{title[:36]}",
            "comment": (description or "報道メディア・自治体発表に基づく地域の安全情報です。")[:160],
            "address": address,
            "category": "official",
        })
        if len(results) >= limit:
            break
    return results


def fetch_rss(url: str, params: dict | None = None) -> str:
    import requests

    response = requests.get(url, params=params, headers=HEADERS, timeout=20)
    response.raise_for_status()
    return response.text


def build_search_lanes() -> list[dict]:
    prefectures = ["北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島", "茨城", "栃木", "群馬", "埼玉", "千葉", "神奈川", "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口", "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"]
    wards = ["千代田区", "中央区", "港区", "新宿区", "文京区", "台東区", "墨田区", "江東区", "品川区", "目黒区", "大田区", "世田谷区", "渋谷区", "中野区", "杉並区", "豊島区", "北区", "荒川区", "板橋区", "練馬区", "足立区", "葛飾区", "江戸川区"]
    crime_query = " OR ".join(CRIME_KEYWORDS)
    lanes = [{"query": f"東京都{ward} ({crime_query})", "limit": 15} for ward in wards]
    lanes.append({"query": f"東京都多摩 ({crime_query})", "limit": 15})
    big = {"神奈川", "埼玉", "千葉", "愛知", "大阪", "兵庫", "福岡"}
    lanes.extend({"query": f"{pref} ({crime_query})", "limit": 20 if pref in big else 15} for pref in prefectures)
    lanes.append({"query": f"(メールけいしちょう OR 防犯メール OR 安全安心メール OR 犯罪情報 OR 不審者情報) ({crime_query})", "limit": 30})
    return lanes


def fetch_safety_news() -> list[dict]:
    fetched, failures = [], []
    successful_sources = 0
    try:
        fetched.extend(parse_rss(fetch_rss(MCAP_FEED_URL), 100, "【警察アラート】"))
        successful_sources += 1
    except Exception as exc:
        failures.append(str(exc))
        print(f"⚠️ mcap取得失敗: {exc}")
    for lane in build_search_lanes():
        try:
            xml = fetch_rss(GOOGLE_NEWS_RSS_URL, {"q": lane["query"], "hl": "ja", "gl": "JP", "ceid": "JP:ja"})
            fetched.extend(parse_rss(xml, lane["limit"], "【防犯ニュース】"))
            successful_sources += 1
        except Exception as exc:
            failures.append(str(exc))
            print(f"⚠️ Google News取得失敗 ({lane['query'][:20]}): {exc}")
    print(f"📡 RSS取得成功: {successful_sources}レーン / 失敗: {len(failures)}レーン")
    if successful_sources == 0:
        raise RuntimeError("すべての防犯ニュース取得元への接続に失敗しました")
    unique, seen = [], set()
    for spot in fetched:
        key = re.sub(r"\s+", "", spot["title"])
        if key not in seen:
            seen.add(key)
            unique.append(spot)
    return unique


def geocode_address(address: str):
    import requests

    try:
        response = requests.get("https://nominatim.openstreetmap.org/search", params={"format": "json", "q": address, "countrycodes": "jp", "limit": 1}, headers={"User-Agent": f"Michimamo-Enterprise/{random.randint(1, 100)}"}, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as exc:
        print(f"⚠️ 座標変換失敗 ({address}): {exc}")
    finally:
        time.sleep(1.5)
    return None, None


def main() -> None:
    supabase = get_supabase()
    cleanup_old_official_spots(supabase)
    raw_spots = fetch_safety_news()
    print(f"🔍 合計 {len(raw_spots)} 件の事案を抽出。座標変換を開始します...")
    added_count = insert_errors = 0
    for spot in raw_spots:
        existing = supabase.table("spots").select("id").eq("title", spot["title"]).limit(1).execute()
        if existing.data:
            continue
        lat, lng = geocode_address(spot["address"])
        if lat is None or lng is None:
            continue
        spot["lat"], spot["lng"] = lat, lng
        try:
            supabase.table("spots").insert(spot).execute()
            added_count += 1
            print(f"✅ 登録成功: {spot['title'][:30]} ({spot['address']})")
        except Exception as exc:
            insert_errors += 1
            print(f"❌ 登録失敗: {spot['title'][:30]}: {exc}")
    print(f"🎉 処理完了: 新規 {added_count} 件 / 登録失敗 {insert_errors} 件")
    if insert_errors:
        raise RuntimeError(f"{insert_errors}件のデータベース登録に失敗しました")


if __name__ == "__main__":
    main()
