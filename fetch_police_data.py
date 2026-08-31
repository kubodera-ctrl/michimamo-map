import os
import re
import time
import random
import urllib.parse
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from supabase import create_client, Client

SUPABASE_URL = "https://ckftozjhdszlwqnylmxv.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY is missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
]

def cleanup_old_official_spots():
    try:
        two_months_ago = (datetime.now() - timedelta(days=60)).isoformat()
        supabase.table("spots").delete().in_("category", ["official"]).lt("created_at", two_months_ago).execute()
        print("🧹 古い公的情報をクリーンアップしました。")
    except Exception as e:
        print(f"クリーンアップエラー: {e}")

def geocode_address(address):
    import requests
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(address)}&countrycodes=jp"
    try:
        res = requests.get(url, headers={"User-Agent": f"Michimamo-Enterprise/{random.randint(1,100)}"}, timeout=10)
        time.sleep(1.5)
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None, None

def fetch_data_via_ghost_browser():
    fetched_data = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
            java_script_enabled=True
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        print("📡 [フェーズ1] 警察情報集約メディアの深掘りを開始...")
        try:
            page.goto("https://mcap.jp/feed/safety", wait_until="networkidle", timeout=20000)
            time.sleep(2)
            content = page.content()
            soup = BeautifulSoup(content, 'xml')
            
            for item in soup.find_all('item'):
                title = item.title.text if item.title else ""
                desc = item.description.text if item.description else title
                
                addr_match = re.search(r'([一-龠]+(?:都|道|府|県))?([一-龠]+(?:区|市|郡|町|村)[一-龠0-9丁目-]*)', title + " " + desc)
                if addr_match and ("声かけ" in title or "不審者" in title or "公然わいせつ" in title or "つきまとい" in title):
                    fetched_data.append({
                        "title": f"【警察アラート】{title[:22]}",
                        "comment": desc[:90].replace('<p>', '').replace('</p>', '') + "...",
                        "address": addr_match.group(0),
                        "category": "official"
                    })
        except Exception:
            pass

        print("📡 [フェーズ2] 東京23区＆全国46道府県の超精密スキャンを開始...")
        
        # 46道府県（東京以外）
        prefectures = [
            "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
            "茨城", "栃木", "群馬", "埼玉", "千葉", "神奈川",
            "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知",
            "三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
            "鳥取", "島根", "岡山", "広島", "山口", "徳島", "香川", "愛媛", "高知",
            "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"
        ]
        
        # 東京23区
        tokyo_23_wards = [
            "千代田区", "中央区", "港区", "新宿区", "文京区", "台東区", "墨田区", "江東区",
            "品川区", "目黒区", "大田区", "世田谷区", "渋谷区", "中野区", "杉並区", "豊島区",
            "北区", "荒川区", "板橋区", "練馬区", "足立区", "葛飾区", "江戸川区"
        ]
        
        crime_kws = "不審者 OR 声かけ OR 公然わいせつ OR つきまとい OR 強盗 OR 不審車両"
        search_lanes = []
        
        # 1. 東京23区（各区 15件ずつ確実に確保）
        for ward in tokyo_23_wards:
            search_lanes.append({"query": f"東京都{ward} ({crime_kws})", "limit": 15})
            
       for article in articles[:lane["limit"]]:
                    t = article.text.strip()
                    
                    # ▼ここから追加（NGワードフィルター）▼
                    ng_words = ["熱中症", "プロジェクト", "キャンペーン", "映画", "ドラマ", "対策", "イベント", "アウト？", "コラム", "週間", "パトロール", "呼びかけ", "講座"]
                    if any(ng in t for ng in ng_words):
                        continue
                    # ▲ここまで追加▲
                    
                    addr_match = re.search(r'([一-龠]+(?:都|道|府|県))?([一-龠]+(?:区|市|郡|町|村))', t)
        
        # 2. 東京多摩 ＆ 46道府県（大都市20件、その他15件）
        big_cities = ["神奈川", "埼玉", "千葉", "愛知", "大阪", "兵庫", "福岡"]
        search_lanes.append({"query": f"東京都多摩 ({crime_kws})", "limit": 15})
        
        for pref in prefectures:
            limit_num = 20 if pref in big_cities else 15
            search_lanes.append({"query": f"{pref} ({crime_kws})", "limit": limit_num})
        
        # 3. 警察直通＆野生動物レーン
        police_kws = "メールけいしちょう OR ピーポくん OR 防犯メール OR 安全安心メール OR 犯罪情報 OR 不審者情報"
        search_lanes.append({"query": f"({police_kws}) ({crime_kws})", "limit": 30})
        search_lanes.append({"query": "クマ出没 OR サル出没", "limit": 20})
        
        for lane in search_lanes:
            try:
                query_encoded = urllib.parse.quote(lane["query"])
                page.goto(f"https://news.google.com/search?q={query_encoded}&hl=ja&gl=JP&ceid=JP:ja", wait_until="domcontentloaded")
                
                page.evaluate("window.scrollBy(0, 500)")
                time.sleep(1.5)
                
                html_content = page.content()
                soup = BeautifulSoup(html_content, 'html.parser')
                
                articles = soup.find_all('a', class_='JtKRv')
                for article in articles[:lane["limit"]]:
                    t = article.text.strip()
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
            time.sleep(1)

        browser.close()

    unique_data = []
    seen_titles = set()
    for d in fetched_data:
        short_title = d["title"][7:19] 
        if short_title not in seen_titles:
            seen_titles.add(short_title)
            unique_data.append(d)

    return unique_data

if __name__ == "__main__":
    cleanup_old_official_spots()
    
    raw_spots = fetch_data_via_ghost_browser()
    print(f"🔍 [Ghost Browser] 合計 {len(raw_spots)} 件の強力な事案を抽出。座標変換を開始します...")
    
    added_count = 0
    for spot in raw_spots:
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
            except Exception:
                pass
            
    print(f"🎉 処理完了: 新たに {added_count} 件の【超精密データ】を全国マップに反映しました。")
