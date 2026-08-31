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
        except Exception as e:
            print(f"⚠️ アグリゲーター抽出エラー: {e}")

        print("📡 [フェーズ2] Google News エリア別絨毯爆撃＆警察特化検索を開始...")
        
        # ★ ここが復活！ 47都道府県を網羅する最強の検索レーン
        crime_kws = "不審者 OR 声かけ OR 痴漢 OR 公然わいせつ OR つきまとい OR 強盗 OR 窃盗 OR 不審車両"
        police_kws = "メールけいしちょう OR ピーポくん OR 防犯メール OR 安全安心メール OR 犯罪情報 OR 不審者情報"
        
        search_lanes = [
            {"query": f"(北海道 OR 青森 OR 岩手 OR 宮城 OR 秋田 OR 山形 OR 福島) ({crime_kws})", "limit": 10},
            {"query": f"(茨城 OR 栃木 OR 群馬 OR 埼玉 OR 千葉 OR 東京 OR 神奈川) ({crime_kws})", "limit": 15},
            {"query": f"(新潟 OR 富山 OR 石川 OR 福井 OR 山梨 OR 長野 OR 岐阜 OR 静岡 OR 愛知) ({crime_kws})", "limit": 10},
            {"query": f"(三重 OR 滋賀 OR 京都 OR 大阪 OR 兵庫 OR 奈良 OR 和歌山) ({crime_kws})", "limit": 10},
            {"query": f"(鳥取 OR 島根 OR 岡山 OR 広島 OR 山口 OR 徳島 OR 香川 OR 愛媛 OR 高知) ({crime_kws})", "limit": 8},
            {"query": f"(福岡 OR 佐賀 OR 長崎 OR 熊本 OR 大分 OR 宮崎 OR 鹿児島 OR 沖縄) ({crime_kws})", "limit": 10},
            {"query": f"({police_kws}) ({crime_kws})", "limit": 20},
            {"query": "クマ出没 OR サル出没", "limit": 5}
        ]
        
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
                    # 都道府県＋市区町村を正確に抜き出す正規表現
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
            
    print(f"🎉 処理完了: 新たに {added_count} 件の【究極防犯データ】を全国マップに反映しました。")
