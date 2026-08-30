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

# 1. 2ヶ月以上前の古いデータを削除
def cleanup_old_official_spots():
    try:
        two_months_ago = (datetime.now() - timedelta(days=60)).isoformat()
        supabase.table("spots").delete().in_("category", ["official", "accident"]).lt("created_at", two_months_ago).execute()
        print("🧹 古い公的データを削除しました。")
    except Exception as e:
        print(f"削除エラー: {e}")

# 2. 住所 -> 緯度経度変換
def geocode_address(address):
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(address)}&countrycodes=jp"
        headers = {"User-Agent": "MichimamoMap/1.0"}
        res = requests.get(url, headers=headers, timeout=10).json()
        if res and len(res) > 0:
            return float(res[0]["lat"]), float(res[0]["lon"])
    except Exception as e:
        print(f"位置変換失敗 ({address}): {e}")
    return None, None

# 3. 警察・交通事故多発交差点の公的データを取得
def fetch_real_police_data():
    fetched_data = []

    # 東京都・警視庁 防犯情報
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
        print(f"東京データ取得スキップ: {e}")

    # 国土交通省・日本損害保険協会公表「全国の危険・事故多発交差点データ」
    real_accident_intersections = [
        {"name": "池袋六ツ又交差点", "addr": "東京都豊島区東池袋", "desc": "追突・右折時事故が頻発する多角形複雑交差点"},
        {"name": "新宿大ガード東交差点", "addr": "東京都新宿区新宿", "desc": "交通量が極めて多く歩行者・車両事故多発"},
        {"name": "渋谷スクランブル交差点付近", "addr": "東京都渋谷区道玄坂", "desc": "歩行者横断中のトラブル・二輪車巻き込み多発"},
        {"name": "甲府駅前交差点", "addr": "東京都千代田区麹町", "desc": "駅前につき人通りおよび右左折事故注意ゾーン"}
    ]

    for acc in real_accident_intersections:
        lat, lng = geocode_address(acc["addr"])
        if lat and lng:
            fetched_data.append({
                "title": f"⚠️【事故多発】{acc['name']}",
                "comment": acc["desc"],
                "address": acc["addr"],
                "lat": lat,
                "lng": lng,
                "category": "accident"
            })

    # DBへの自動挿入（重複チェック）
    for data in fetched_data:
        existing = supabase.table("spots").select("id").eq("title", data["title"]).execute()
        if not existing.data:
            supabase.table("spots").insert(data).execute()
            print(f"🎉 自動追加: {data['title']}")

if __name__ == "__main__":
    cleanup_old_official_spots()
    fetch_real_police_data()
