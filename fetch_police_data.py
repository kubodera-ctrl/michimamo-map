import os
import re
import urllib.parse
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = "https://ckftozjhdszlwqnylmxv.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY is missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. 60日経過したデータのクリーンアップ
def cleanup_old_official_spots():
    try:
        two_months_ago = (datetime.now() - timedelta(days=60)).isoformat()
        supabase.table("spots").delete().in_("category", ["official", "accident"]).lt("created_at", two_months_ago).execute()
        print("🧹 60日経過した古い公的情報をクリーンアップしました。")
    except Exception as e:
        print(f"クリーンアップエラー: {e}")

# 2. 住所 -> 緯度経度変換（国土地理院/OSM API）
def geocode_address(address):
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(address)}&countrycodes=jp"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        res = requests.get(url, headers=headers, timeout=10).json()
        if res and len(res) > 0:
            return float(res[0]["lat"]), float(res[0]["lon"])
    except Exception as e:
        print(f"位置変換エラー ({address}): {e}")
    return None, None

# 3. 警視庁・自治体防犯ポータルのリアルタイムRSS自動巡回
def fetch_real_official_rss():
    fetched_data = []
    
    # 巡回先RSSリスト（正しい公的ドメイン）
    rss_sources = [
        {"name": "東京都防犯ポータル", "url": "https://www.anzen.metro.tokyo.jp/rss/index.xml"}
    ]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    for source in rss_sources:
        try:
            res = requests.get(source["url"], headers=headers, timeout=10)
            if res.status_code == 200:
                root = ET.fromstring(res.content)
                for item in root.findall(".//item")[:15]:
                    title = item.find("title").text if item.find("title") is not None else ""
                    comment = item.find("description").text if item.find("description") is not None else ""
                    
                    full_text = title + " " + comment
                    
                    # 本文・タイトルから正規表現で日本の住所（市区町村・町名）を検出
                    match = re.search(r'(東京都)?([一-龠]+区[一-龠]+[0-9丁目-]*)', full_text)
                    if match:
                        raw_addr = match.group(0)
                        addr = raw_addr if raw_addr.startswith("東京都") else "東京都" + raw_addr
                        
                        lat, lng = geocode_address(addr)
                        
                        if lat and lng:
                            fetched_data.append({
                                "title": f"【公的発表】{title[:22]}",
                                "comment": comment[:100] if comment else title,
                                "address": addr,
                                "lat": lat,
                                "lng": lng,
                                "category": "official"
                            })
                            print(f"🔍 リアルタイムデータ検出: {title[:15]}... ({addr})")
        except Exception as e:
            print(f"RSS取得失敗 ({source['name']}): {e}")

    return fetched_data

if __name__ == "__main__":
    cleanup_old_official_spots()
    real_spots = fetch_real_official_rss()
    
    added_count = 0
    for spot in real_spots:
        existing = supabase.table("spots").select("id").eq("title", spot["title"]).execute()
        if not existing.data:
            supabase.table("spots").insert(spot).execute()
            added_count += 1
            print(f"✅ DB自動登録: {spot['title']}")
            
    print(f"🎉 処理完了: 新たに {added_count} 件の公的防犯情報を反映しました。")
