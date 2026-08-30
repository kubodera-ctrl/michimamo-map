import os
import requests
from supabase import create_client, Client

# 環境変数の読み込み
SUPABASE_URL = "https://ckftozjhdszlwqnylmxv.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY is missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_and_insert():
    # 23区・山梨県の公式情報データ（テスト用サンプルデータセット）
    sample_police_data = [
        {
            "title": "【警視庁情報】不審者の声かけ発生",
            "comment": "千代田区麹町付近で子供に対する不審な声かけ事案が発生。注意してください。",
            "address": "東京都千代田区麹町",
            "lat": 35.6842,
            "lng": 139.7370,
            "category": "official"
        },
        {
            "title": "【山梨県警情報】不審車両の目撃情報",
            "comment": "甲府市丸の内付近にて路上でのつきまとり事案が報告されています。",
            "address": "山梨県甲府市丸の内",
            "lat": 35.6638,
            "lng": 138.5684,
            "category": "official"
        }
    ]

    for item in sample_police_data:
        # 重複登録を避けるため既存確認
        res = supabase.table("spots").select("id").eq("title", item["title"]).execute()
        if not res.data:
            supabase.table("spots").insert(item).execute()
            print(f"追加成功: {item['title']}")
        else:
            print(f"スキップ（登録済み）: {item['title']}")

if __name__ == "__main__":
    fetch_and_insert()
