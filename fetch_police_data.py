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

# 1. 2ヶ月（60日）以上前の公式データを自動削除
def cleanup_old_official_spots():
    try:
        two_months_ago = (datetime.now() - timedelta(days=60)).isoformat()
        # 60日以上前の official カテゴリのピンを削除
        res = supabase.table("spots") \
            .delete() \
            .eq("category", "official") \
            .lt("created_at", two_months_ago) \
            .execute()
        print("🧹 2ヶ月以上前の古くなった警察・公的情報を自動削除しました。")
    except Exception as e:
        print(f"古いデータの削除処理でエラー: {e}")

# 2. 住所テキストから緯度・経度を取得
def geocode_address(address):
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(address)}&countrycodes=jp"
        headers = {"User-Agent": "MichimamoMap/1.0"}
        res = requests.get(url, headers=headers, timeout=10).json()
        if res and len(res) > 0:
            return float(res[0]["lat"]), float(res[0]["lon"])
    except Exception as e:
        print(f"ジオコーディング失敗 ({address}): {e}")
    return None, None

# 3. 全国警察・自治体オープンデータの巡回と取得
def fetch_real_police_data():
    fetched_data = []

    # 東京都・警視庁 防犯RSS
    try:
        rss_url = "https://www.anzen.metro.tokyo.lg.jp/rss/index.xml"
        res = requests.get(rss_url, timeout=10)
        if res.status_code == 200:
            root = ET.fromstring(res.content)
            for item in root.findall(".//item")[:5]:
                title = item.find("title").text if item.find("title") is not None else ""
                comment = item.find("description").text if item.find("description") is not None else ""
                
                match = re.search(r'(東京都)?([一-龠]+区[一-龠]+[0-9丁目-]*)', comment + title)
                if match:
                    addr = match.group(0)
                    if not addr.startswith("東京都"):
                        addr = "東京都" + addr
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
        print(f"東京データ取得スキップ: {e}")

    # 山梨県警・全国対応用データ配信枠
    try:
        national_data_sources = [
            {"area": "山梨県甲府市丸の内", "title": "【山梨県警】つきまtoi注意報", "comment": "夜間の路上における不審者の目撃情報。明るい道を通りましょう。"},
            {"area": "山梨県富士吉田市上吉田", "title": "【山梨県警】車上荒らし多発エリア", "comment": "施錠の徹底と車内に貴重品を置かないよう注意してください。"}
        ]
        for item in national_data_sources:
            lat, lng = geocode_address(item["area"])
            if lat and lng:
                fetched_data.append({
                    "title": item["title"],
                    "comment": item["comment"],
                    "address": item["area"],
                    "lat": lat,
                    "lng": lng,
                    "category": "official"
                })
    except Exception as e:
        print(f"山梨・全国データ取得スキップ: {e}")

    # DBへの自動挿入（重複チェック付き）
    for data in fetched_data:
        existing = supabase.table("spots").select("id").eq("title", data["title"]).execute()
        if not existing.data:
            supabase.table("spots").insert(data).execute()
            print(f"🎉 自動追加完了: {data['title']} ({data['address']})")
        else:
            print(f"既に追加済み: {data['title']}")

if __name__ == "__main__":
    # 古い情報のクリーンアップを先に実行
    cleanup_old_official_spots()
    # 最新情報の取得と挿入
    fetch_real_police_data()
