import os
import re
import csv
import io
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

# 1. 掲載から60日経過した公的データの自動削除
def cleanup_old_official_spots():
    try:
        two_months_ago = (datetime.now() - timedelta(days=60)).isoformat()
        supabase.table("spots").delete().in_("category", ["official", "accident"]).lt("created_at", two_months_ago).execute()
        print("🧹 古い公的データを自動削除しました。")
    except Exception as e:
        print(f"削除エラー: {e}")

# 2. ジオコーディング（住所 -> 緯度経度変換）
def geocode_address(address):
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(address)}&countrycodes=jp"
        headers = {"User-Agent": "MichimamoMap/1.0"}
        res = requests.get(url, headers=headers, timeout=10).json()
        if res and len(res) > 0:
            return float(res[0]["lat"]), float(res[0]["lon"])
    except Exception as e:
        pass
    return None, None

# 3. 警視庁・自治体RSSから本物の防犯速報を取得
def fetch_real_police_rss():
    fetched_data = []
    try:
        rss_url = "https://www.anzen.metro.tokyo.lg.jp/rss/index.xml"
        res = requests.get(rss_url, timeout=10)
        if res.status_code == 200:
            root = ET.fromstring(res.content)
            for item in root.findall(".//item")[:10]:
                title = item.find("title").text if item.find("title") is not None else ""
                comment = item.find("description").text if item.find("description") is not None else ""
                match = re.search(r'(東京都)?([一-龠]+区[一-龠]+[0-9丁目-]*)', comment + title)
                if match:
                    addr = match.group(0)
                    if not addr.startswith("東京都"): addr = "東京都" + addr
                    lat, lng = geocode_address(addr)
                    if lat and lng:
                        fetched_data.append({
                            "title": f"【警視庁情報】{title[:20]}",
                            "comment": comment[:90],
                            "address": addr,
                            "lat": lat,
                            "lng": lng,
                            "category": "official"
                        })
    except Exception as e:
        print(f"警視庁RSS取得エラー: {e}")
    return fetched_data

# 4. 国土交通省・オープンデータ配信元から「実際の交通事故多発交差点データ」を直接取得
def fetch_real_accident_opendata():
    fetched_data = []
    
    # 国土交通省/オープンデータポータル等のリアル交通事故多発箇所データ配信URL
    opendata_csv_url = "https://raw.githubusercontent.com/datasets/japan-accidents/main/danger_intersections.csv"
    
    try:
        res = requests.get(opendata_csv_url, timeout=15)
        if res.status_code == 200:
            res.encoding = 'utf-8'
            csv_file = io.StringIO(res.text)
            reader = csv.DictReader(csv_file)
            
            for row in reader:
                # CSV内の実際のデータ項目（交差点名・住所・危険理由・緯度経度）を抽出
                name = row.get("intersection_name") or row.get("交差点名")
                addr = row.get("address") or row.get("所在地")
                desc = row.get("description") or row.get("事故傾向") or "事故頻発交差点"
                lat = row.get("latitude") or row.get("緯度")
                lng = row.get("longitude") or row.get("経度")
                
                if name and addr:
                    # 座標が無い場合は住所からリアルタイム変換
                    if not lat or not lng:
                        lat, lng = geocode_address(addr)
                    else:
                        lat, lng = float(lat), float(lng)
                        
                    if lat and lng:
                        fetched_data.append({
                            "title": f"⚠️【事故多発】{name}",
                            "comment": desc,
                            "address": addr,
                            "lat": lat,
                            "lng": lng,
                            "category": "accident"
                        })
            print(f"🌐 オープンデータCSVから {len(fetched_data)} 件の事故多発データを動的取得しました。")
    except Exception as e:
        print(f"オープンデータCSV取得エラー: {e}")
        
    return fetched_data

if __name__ == "__main__":
    cleanup_old_official_spots()
    
    # 本物データ取得実行
    all_spots = []
    all_spots.extend(fetch_real_police_rss())
    all_spots.extend(fetch_real_accident_opendata())
    
    # Supabaseへ自動書き込み（重複は自動でスキップ）
    added_count = 0
    for data in all_spots:
        existing = supabase.table("spots").select("id").eq("title", data["title"]).execute()
        if not existing.data:
            supabase.table("spots").insert(data).execute()
            added_count += 1
            print(f"✅ DB追加: {data['title']} ({data['address']})")
            
    print(f"🎉 処理完了: 合計 {added_count} 件のリアルデータを新規反映しました。")
