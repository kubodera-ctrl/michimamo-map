"""Manual locally isolated Chromium DOM smoke; no external network, DB, real events.

Not a Cloudflare Hosted or Safari QA replacement. All visible event names are synthetic.
Not named test_* so CI never unexpectedly opens a browser or pulls dependencies.
"""
from __future__ import annotations
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = {
    "schema_version": 1, "source_id":"tokyo_mail_keishicho_opendata", "last_success_at":"2026-10-31T00:00:00Z",
    "records":[{
        "id":"fictional-doc-1","source_id":"tokyo_mail_keishicho_opendata",
        "title":"【架空】声かけの模擬表示", "summary":"UI試験専用の架空テキスト", "area_label":"架空市",
        "event_type":"模擬", "published_at":"2026-10-31T00:00:00Z", "occurred_at":None,
        "recognized_at":None,"source_status":"active","review_status":"approved","rights_status":"verified",
        "identity_verified":True,"is_fixture":False,"location_precision":"municipality","location_source":None,
        "latitude":None,"longitude":None,"source_url":"https://mail.keishicho.metro.tokyo.lg.jp/opendata/"
    }]
}
PREC = {
    "schema_version":1,"dataset":"precursor","publication_enabled":True,"releases":[{
        "year":2026,"through_month":9,"revision":1,"review_status":"approved","rights_status":"verified",
        "superseded":False,"requires_review":False,"records":[{"municipality":"架空市","area_label":"路上",
        "event_type":"架空の声かけ","recognized_count_cumulative":2,"record_count_basis":"official_csv_rows_cumulative_not_unique_incidents",
        "latitude":None,"longitude":None,"review_status":"approved","rights_status":"verified"}]
    }]
}
TOWN = {
    "schema_version":1,"dataset":"town_stats","publication_enabled":True,"releases":[{
        "year":2026,"through_month":9,"revision":1,"review_status":"approved","rights_status":"verified",
        "superseded":False,"requires_review":False,"records":[{"municipality":"架空東京都","town":"架空市一丁目",
        "crime_type":"架空の自転車盗","recognized_count_cumulative":3,"latitude":None,"longitude":None,
        "review_status":"approved","rights_status":"verified"}]
    }]
}

def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':390,'height':780})
        page.route('**/*', lambda route: route.abort())  # network 0; no Supabase, no police fetch, no fonts.
        page.set_content('''<!doctype html><html lang="ja"><head><meta charset="utf-8"></head><body>
            <section id="filterWrapper"><div class="filter-content"></div></section>
            <main id="map-container"></main><section id="adminDashboardArea" style="display:none"></section>
            </body></html>''')
        page.evaluate('''() => {
            window.__markerCount=0;
            window.fakeMap={};
            window.fakeLeaflet={
              layerGroup:()=>({addTo(){return this},clearLayers(){window.__markerCount=0}}),
              marker:()=>({bindPopup(){return this},addTo(){window.__markerCount++;return this}})
            };
            window.fakeLocation={href:'https://isolated.example.test/map',origin:'https://isolated.example.test'};
            window.safeFetcher=async ()=>{throw new Error('no network in local browser smoke')};
        }''')
        page.add_script_tag(path=str(ROOT/'official-police-layer.js'))
        page.add_script_tag(path=str(ROOT/'official-police-hub.js'))
        page.evaluate('''() => {
            window.__mail = window.MachimamoPoliceOfficial.createController({
              doc:document,map:window.fakeMap,leaflet:window.fakeLeaflet,
              fetcher:window.safeFetcher,location:window.fakeLocation,enabled:true
            });
            window.__hub = window.MachimamoPoliceHub.mount({
              doc:document,map:window.fakeMap,leaflet:window.fakeLeaflet,
              fetcher:window.safeFetcher,location:window.fakeLocation,enabled:true
            });
        }''')
        assert page.locator('#policeOfficialFilterToggle').count()==1
        assert page.locator('#policeOfficialHubToggle').count()==1
        # Alert shown in a list; municipality-level location must not generate an exact marker.
        res=page.evaluate('(s) => window.__mail.setSnapshot(s)',SNAPSHOT)
        assert res['visible']==1 and res['exact_markers']==0,res
        page.locator('#policeOfficialFilterToggle').click()
        assert '【架空】' in page.locator('#policeOfficialPanel').inner_text()
        page.locator('#policeOfficialPanel .police-official-close').click()
        assert page.locator('#policeOfficialPanel').is_hidden()
        # Independent original MAP filter and per-source tabs keep separate counts.
        reg=json.loads((ROOT/'official_source_registry.json').read_text())
        page.evaluate('([p,t,r]) => window.__hub.setSyntheticBundle({precursor:p,town_stats:t,registry:r})',[PREC,TOWN,reg])
        page.locator('#policeOfficialHubToggle').click()
        assert '2行' in page.locator('#policeOfficialHubPanel').inner_text()
        page.get_by_role('button',name='町丁目統計').click()
        assert '架空市一丁目' in page.locator('#policeOfficialHubPanel').inner_text()
        page.get_by_role('button',name='全国47都道府県').click()
        assert page.locator('#policeOfficialHubPanel .police-official-source-row').count()==47
        page.get_by_role('button',name='特殊詐欺・アポ電').click()
        assert '警視庁犯罪情報マップ' in page.locator('#policeOfficialHubPanel').inner_text()
        # Unknown/hostile URL prohibited, and old display survives failed fetch.
        r=page.evaluate("""async () => await window.__hub.refresh({precursor:'https://attacker.example.test/record.json'})""")
        assert r['retained_previous'] is True
        assert page.evaluate('window.__markerCount')==0
        # DOM-based admin status is initially hidden; no admin actions sent.
        assert page.locator('#adminPoliceOfficialSection').count()==0
        print('LOCAL_CHROMIUM_DOM_SMOKE_PASS: map filters, official mail list/no false pin, cumulative tabs, 47 sources, fraud link, blocked remote URL, network0')
        browser.close()

if __name__=='__main__': main()
