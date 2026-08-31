import os
import re
import time
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

# 1. 古いデータのクリーンアップ（60日経過）
def cleanup_old_official_spots():
    try:
        two_months_ago = (datetime.now() - timedelta(days=60)).isoformat()
        supabase.table("spots").delete().in_("category", ["official", "accident"]).lt("created_at", two_months_ago).execute()
        print("🧹 古い情報をクリーンアップしました。")
    except Exception as e:
        print(f"クリーンアップエラー: {e}")

# 2. 住所 -> 緯度経度変換（OSM API / 制限回避のため1秒スリープ必須）
def geocode_address(address):
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(address)}&countrycodes=jp"
        headers = {"User-Agent": "MichimamoMap-SafetyApp/1.0"}
        res = requests.get(url, headers=headers, timeout=10).json()
        
        # OpenStreetMapのAPI制限（1秒に1回）を守るための待機時間
        time.sleep(1)
        
        if res and len(res) > 0:
            return float(res[0]["lat"]), float(res[0]["lon"])
    except Exception as e:
        pass
    return None, None

# 3. Google News RSSから「不審者・声かけ・痴漢」のみを厳選取得
def fetch_real_suspicious_data():
    fetched_data = []
    
    # 検索キーワードをURLエンコード（不審者 OR 声かけ OR 痴漢）
    query = urllib.parse.quote("不審者 OR 声かけ OR 痴漢 OR 公然わいせつ OR つきまとい OR 不審車両 OR クマ出没")
    google_news_url = f"https://news.google.com/rss/search?q={query}&hl=ja&gl=JP&ceid=JP:ja"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        res = requests.get(google_news_url, headers=headers, timeout=15)
        if res.status_code == 200:
            root = ET.fromstring(res.text)
            items = root.findall(".//item")
            
            for item in items[:40]:  # 最新40件を解析
                title = item.find("title").text if item.find("title") is not None else ""
                
                # ニュースサイト名などを除去し、純粋な記事タイトルにする
                clean_title = re.sub(r' - [^\-]+$', '', title)
                
                # 日本の住所（都道府県・市区町村）をタイトルから抽出
                # 例: "女子生徒に声かけ、不審な男逃走…横浜市" -> "横浜市"
                match = re.search(r'([一-龠]+(?:都|道|府|県))?([一-龠]+(?:市|区|町|村))', clean_title)
                
                if match:
                    addr = match.group(0)
                    
                    # ニュースから抽出した住所を緯度経度に変換
                    lat, lng = geocode_address(addr)
                    
                    if lat and lng:
                        fetched_data.append({
                            "title": f"【不審者/声かけ】{clean_title[:30]}",
                            "comment": "学校・地域周辺での安全情報。詳細は各ニュースサイト・自治体発表をご確認ください。",
                            "address": addr,
                            "lat": lat,
                            "lng": lng,
                            "category": "official"  # アプリ上の公式（青/緑ピン）として扱う
                        })
                        print(f"🔍 [検知] {addr}: {clean_title[:20]}...")
    except Exception as e:
        print(f"⚠️ RSS取得エラー: {e}")

    return fetched_data

if __name__ == "__main__":
    cleanup_old_official_spots()
    
    print("📡 Google News防犯フィードへアクセス中...")
    real_spots = fetch_real_suspicious_data()
    
    added_count = 0
    for spot in real_spots:
        # 重複チェック（同じタイトルの事案はスキップ）
        existing = supabase.table("spots").select("id").eq("title", spot["title"]).execute()
        if not existing.data:
            supabase.table("spots").insert(spot).execute()
            added_count += 1
            
    print(f"🎉 処理完了: 新たに {added_count} 件の【不審者・声かけデータ】を反映しました。")
