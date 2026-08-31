import os
import re
import time
import urllib.parse
import requests
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = "https://ckftozjhdszlwqnylmxv.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY is missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. 古い公的データのクリーンアップ
def cleanup_old_official_spots():
    try:
        two_months_ago = (datetime.now() - timedelta(days=60)).isoformat()
        supabase.table("spots").delete().in_("category", ["official"]).lt("created_at", two_months_ago).execute()
        print("🧹 古い公的情報をクリーンアップしました。")
    except Exception as e:
        print(f"クリーンアップエラー: {e}")

# 2. 住所 -> 緯度経度変換（API制限を厳守）
def geocode_address(address):
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(address)}&countrycodes=jp"
        headers = {"User-Agent": "MichimamoMap-SafetyApp/3.0"}
        res = requests.get(url, headers=headers, timeout=10).json()
        time.sleep(1.2) # OSMのAPIブロックを防ぐため必ず1秒以上待機
        if res and len(res) > 0:
            return float(res[0]["lat"]), float(res[0]["lon"])
    except Exception:
        pass
    return None, None

# 3. 集約メディアとニュースからのハイブリッド大量取得
def fetch_aggregator_and_news():
    fetched_data = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    # ① 警察情報集約メディア（mcap.jp）からの取得
    print("📡 警察情報集約メディア（全国防犯メール）へアクセス中...")
    for page in range(1, 4):
        try:
            mcap_url = f"https://mcap.jp/feed/safety?paged={page}"
            res = requests.get(mcap_url, headers=headers, timeout=15)
            if res.status_code == 200:
                items = re.findall(r'<item>(.*?)</item>', res.text, re.DOTALL)
                for item_str in items:
                    title_match = re.search(r'<title>(.*?)</title>', item_str, re.DOTALL)
                    desc_match = re.search(r'<description>(.*?)</description>', item_str, re.DOTALL)
                    
                    if title_match:
                        t = re.sub(r'<[^>]+>', '', title_match.group(1).replace('<![CDATA[', '').replace(']]>', '')).strip()
                        d = re.sub(r'<[^>]+>', '', desc_match.group(1).replace('<![CDATA[', '').replace(']]>', '')).strip() if desc_match else t
                        
                        addr_match = re.search(r'([一-龠]+(?:都|道|府|県))?([一-龠]+(?:区|市|郡|町|村)[一-龠0-9丁目-]*)', t + " " + d)
                        if addr_match:
                            fetched_data.append({
                                "title": f"【警察アラート】{t[:25]}",
                                "comment": d[:90] + "...",
                                "address": addr_match.group(0),
                                "category": "official"
                            })
        except Exception as e:
            print(f"⚠️ 集約メディア取得エラー (page {page}): {e}")
        time.sleep(1)

    # ② Google Newsの検索レーン分離（対人トラブル枠とクマ枠を分ける）
    print("📡 Google News 防犯特化フィードへアクセス中...")
    
    # 検索クエリと、それぞれの取得上限件数を独立して設定
    search_lanes = [
        {"query": "不審者 OR 声かけ OR 痴漢 OR 公然わいせつ OR つきまとい OR 不審車両", "limit": 20}, # 対人トラブル（メイン）
        {"query": "クマ出没", "limit": 5} # クマ枠（マップを埋め尽くさないよう控えめに）
    ]
    
    for lane in search_lanes:
        try:
            query_encoded = urllib.parse.quote(lane["query"])
            google_url = f"https://news.google.com/rss/search?q={query_encoded}&hl=ja&gl=JP&ceid=JP:ja"
            res = requests.get(google_url, headers=headers, timeout=15)
            if res.status_code == 200:
                items = re.findall(r'<item>(.*?)</item>', res.text, re.DOTALL)
                
                # 指定した上限件数（limit）までしか取得しない
                for item_str in items[:lane["limit"]]:
                    title_match = re.search(r'<title>(.*?)</title>', item_str, re.DOTALL)
                    if title_match:
                        t = re.sub(r'<[^>]+>', '', title_match.group(1)).replace(' - Yahoo!ニュース', '').strip()
                        addr_match = re.search(r'([一-龠]+(?:都|道|府|県))?([一-龠]+(?:区|市|郡|町|村))', t)
                        if addr_match:
                            prefix = "【野生動物】" if "クマ出没" in lane["query"] else "【防犯ニュース】"
                            fetched_data.append({
                                "title": f"{prefix}{t[:25]}",
                                "comment": "報道メディア・自治体発表に基づく地域の安全情報です。",
                                "address": addr_match.group(0),
                                "category": "official"
                            })
        except Exception as e:
            print(f"⚠️ Google News取得エラー ({lane['query']}): {e}")
        time.sleep(1)

    # 重複排除
    unique_data = []
    seen_titles = set()
    for d in fetched_data:
        short_title = d["title"][:15]
        if short_title not in seen_titles:
            seen_titles.add(short_title)
            unique_data.append(d)

    return unique_data

if __name__ == "__main__":
    cleanup_old_official_spots()
    
    raw_spots = fetch_aggregator_and_news()
    print(f"🔍 合計 {len(raw_spots)} 件の事案候補を検出しました。座標変換を開始します...")
    
    added_count = 0
    for spot in raw_spots:
        existing = supabase.table("spots").select("id").ilike("title", f"{spot['title'][:15]}%").execute()
        if existing.data:
            continue
            
        lat, lng = geocode_address(spot["address"])
        if lat and lng:
            spot["lat"] = lat
            spot["lng"] = lng
            supabase.table("spots").insert(spot).execute()
            added_count += 1
            print(f"✅ 登録成功: {spot['title'][:20]}... ({spot['address']})")
            
    print(f"🎉 処理完了: 新たに {added_count} 件の【本物防犯データ】を全国マップに反映しました。")
