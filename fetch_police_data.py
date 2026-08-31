import os
import re
import time
import random
import urllib.parse
import requests
import html
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = "https://ckftozjhdszlwqnylmxv.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY is missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ランダムなUser-Agentでボット判定を回避
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
]

def get_headers():
    return {"User-Agent": random.choice(USER_AGENTS)}

# 1. 古い公的データのクリーンアップ
def cleanup_old_official_spots():
    try:
        two_months_ago = (datetime.now() - timedelta(days=60)).isoformat()
        supabase.table("spots").delete().in_("category", ["official"]).lt("created_at", two_months_ago).execute()
        print("🧹 古い公的情報をクリーンアップしました。")
    except Exception as e:
        print(f"クリーンアップエラー: {e}")

# 2. 住所 -> 緯度経度変換（APIブロック回避＆自動リトライ付き）
def geocode_address(address, retries=2):
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(address)}&countrycodes=jp"
    
    for attempt in range(retries):
        try:
            res = requests.get(url, headers={"User-Agent": f"MichimamoApp/5.0_{random.randint(1,1000)}"}, timeout=10)
            time.sleep(1.5) # API制限を絶対守る
            if res.status_code == 200:
                data = res.json()
                if data and len(data) > 0:
                    return float(data[0]["lat"]), float(data[0]["lon"])
        except Exception:
            time.sleep(2) # エラー時は少し待ってリトライ
    return None, None

# 3. HTMLタグや特殊文字を極限まで綺麗に掃除する
def clean_text(raw_text):
    text = html.unescape(raw_text)
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('<![CDATA[', '').replace(']]>', '').replace(' - Yahoo!ニュース', '')
    return text.strip()

# 4. 最上級スクレイパー本体
def fetch_ultimate_safety_data():
    fetched_data = []

    # ① 警察情報集約メディアの深掘り（1〜5ページ目まで根こそぎ）
    print("📡 [フェーズ1] 警察情報集約メディアの深掘りを開始...")
    for page in range(1, 6):
        try:
            res = requests.get(f"https://mcap.jp/feed/safety?paged={page}", headers=get_headers(), timeout=15)
            if res.status_code == 200:
                items = re.findall(r'<item>(.*?)</item>', res.text, re.DOTALL)
                for item_str in items:
                    t_match = re.search(r'<title>(.*?)</title>', item_str, re.DOTALL)
                    d_match = re.search(r'<description>(.*?)</description>', item_str, re.DOTALL)
                    
                    if t_match:
                        t = clean_text(t_match.group(1))
                        d = clean_text(d_match.group(1)) if d_match else t
                        
                        addr_match = re.search(r'([一-龠]+(?:都|道|府|県))?([一-龠]+(?:区|市|郡|町|村)[一-龠0-9丁目-]*)', t + " " + d)
                        if addr_match:
                            fetched_data.append({
                                "title": f"【警察アラート】{t[:22]}",
                                "comment": d[:90] + "...",
                                "address": addr_match.group(0),
                                "category": "official"
                            })
        except Exception as e:
            pass
        time.sleep(1.5)

    # ② Google Newsの「エリア別・絨毯爆撃 ＆ 警察直通キーワード」
    print("📡 [フェーズ2] Google News エリア別絨毯爆撃＆警察特化検索を開始...")
    
    crime_kws = "不審者 OR 声かけ OR 痴漢 OR 公然わいせつ OR つきまとい OR 強盗 OR 窃盗 OR 不審車両"
    police_kws = "メールけいしちょう OR ピーポくん OR 防犯メール OR 安全安心メール OR 犯罪情報 OR 不審者情報"
    
    search_lanes = [
        # 全国を細かく分割してローカルニュースを強制発掘
        {"query": f"(北海道 OR 青森 OR 岩手 OR 宮城 OR 秋田 OR 山形 OR 福島) ({crime_kws})", "limit": 10},
        {"query": f"(茨城 OR 栃木 OR 群馬 OR 埼玉 OR 千葉 OR 東京 OR 神奈川) ({crime_kws})", "limit": 15},
        {"query": f"(新潟 OR 富山 OR 石川 OR 福井 OR 山梨 OR 長野 OR 岐阜 OR 静岡 OR 愛知) ({crime_kws})", "limit": 10},
        {"query": f"(三重 OR 滋賀 OR 京都 OR 大阪 OR 兵庫 OR 奈良 OR 和歌山) ({crime_kws})", "limit": 10},
        {"query": f"(鳥取 OR 島根 OR 岡山 OR 広島 OR 山口 OR 徳島 OR 香川 OR 愛媛 OR 高知) ({crime_kws})", "limit": 8},
        {"query": f"(福岡 OR 佐賀 OR 長崎 OR 熊本 OR 大分 OR 宮崎 OR 鹿児島 OR 沖縄) ({crime_kws})", "limit": 10},
        
        # 警察・自治体直結キーワード（ニュース以外の行政アラートを拾う）
        {"query": f"({police_kws}) ({crime_kws})", "limit": 20},
        
        # 動物枠
        {"query": "クマ出没 OR サル出没", "limit": 5}
    ]
    
    for lane in search_lanes:
        try:
            query_encoded = urllib.parse.quote(lane["query"])
            google_url = f"https://news.google.com/rss/search?q={query_encoded}&hl=ja&gl=JP&ceid=JP:ja"
            res = requests.get(google_url, headers=get_headers(), timeout=15)
            
            if res.status_code == 200:
                items = re.findall(r'<item>(.*?)</item>', res.text, re.DOTALL)
                
                for item_str in items[:lane["limit"]]:
                    t_match = re.search(r'<title>(.*?)</title>', item_str, re.DOTALL)
                    if t_match:
                        t = clean_text(t_match.group(1))
                        addr_match = re.search(r'([一-龠]+(?:都|道|府|県))?([一-龠]+(?:区|市|郡|町|村))', t)
                        if addr_match:
                            prefix = "【野生動物】" if "出没" in lane["query"] else "【防犯ニュース】"
                            fetched_data.append({
                                "title": f"{prefix}{t[:22]}",
                                "comment": "報道メディア・自治体発表に基づく地域の安全情報です。",
                                "address": addr_match.group(0),
                                "category": "official"
                            })
        except Exception:
            pass
        time.sleep(1.5)

    # 重複の完全排除（タイトルの一部が一致したらスキップ）
    unique_data = []
    seen_titles = set()
    for d in fetched_data:
        # タイトルの特徴的な最初の12文字で厳格に重複チェック
        short_title = d["title"][7:19] 
        if short_title not in seen_titles:
            seen_titles.add(short_title)
            unique_data.append(d)

    return unique_data

if __name__ == "__main__":
    cleanup_old_official_spots()
    
    raw_spots = fetch_ultimate_safety_data()
    print(f"🔍 合計 {len(raw_spots)} 件の強力な事案候補を検出。座標変換を開始します...")
    
    added_count = 0
    for spot in raw_spots:
        # DB上の既存データとタイトル前方一致で重複チェック
        search_title = spot['title'][:15]
        existing = supabase.table("spots").select("id").ilike("title", f"{search_title}%").execute()
        
        if existing.data:
            continue
            
        lat, lng = geocode_address(spot["address"])
        if lat and lng:
            spot["lat"] = lat
            spot["lng"] = lng
            
            try:
                supabase.table("spots").insert(spot).execute()
                added_count += 1
                print(f"✅ 登録成功: {spot['title'][:20]}... ({spot['address']})")
            except Exception as e:
                pass
            
    print(f"🎉 処理完了: 新たに {added_count} 件の【最上級防犯データ】を全国マップに反映しました。")
