import type { Metadata } from 'next';
import {
  CHILD_PRICE_OPTIONS,
  DINING_ACCESSIBILITY_OPTIONS,
  DINING_GENRES,
  diningRuleLabel,
  distanceKm,
  getDiningOverlays
} from '@/lib/dining';

export const metadata:Metadata={
  title:'イベント後のごはん検索',
  description:'イベント会場周辺の飲食店を、子ども料金・キッズ設備・配慮情報から探せます。',
  robots:{index:false,follow:true},
  alternates:{canonical:'/dining'}
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';
const bool=(v:string)=>v==='1';

export default async function DiningPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const event = one(params.event);
  const location=one(params.location);
  const latRaw = one(params.lat);
  const lngRaw = one(params.lng);
  const lat=Number(latRaw);
  const lng=Number(lngRaw);
  const hasCoords=Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  const genre = one(params.genre);
  const preschool = one(params.preschool);
  const elementary = one(params.elementary);
  const accessibility = one(params.accessibility);
  const kidsMenu=bool(one(params.kidsMenu));
  const highChair=bool(one(params.highChair));
  const stroller=bool(one(params.stroller));
  const privateRoom=bool(one(params.privateRoom));
  const nonSmoking=bool(one(params.nonSmoking));

  const overlays=await getDiningOverlays({preschool,elementary,accessibility,limit:200});
  const matched=overlays
    .filter((row)=>!kidsMenu || row.kids_menu===true)
    .filter((row)=>!highChair || row.high_chair===true)
    .filter((row)=>!stroller || row.stroller_ok===true)
    .filter((row)=>!privateRoom || row.private_room===true)
    .filter((row)=>!nonSmoking || row.non_smoking===true)
    .map((row)=>({
      ...row,
      distance:hasCoords && row.latitude!=null && row.longitude!=null ? distanceKm(lat,lng,row.latitude,row.longitude) : null
    }))
    .filter((row)=>row.distance==null || row.distance<=15)
    .sort((a,b)=>(a.distance??999)-(b.distance??999))
    .slice(0,30);

  const genreLabel=DINING_GENRES.find(([key])=>key===genre)?.[1] || '';
  const mapQuery=[genreLabel==='指定なし'?'':genreLabel,'レストラン',location||event].filter(Boolean).join(' ');
  const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery || 'レストラン')}`;

  return (
    <main className="content-wrap dining-page">
      <p className="eyebrow">AFTER EVENT</p>
      <h1>遊んだあとの、ごはんを探す</h1>
      <p className="area-copy">{event ? `「${event}」の周辺` : 'イベント会場の周辺'}から、一般検索に加えて「未就学無料・半額」などの確認済み情報も探せます。</p>

      <form className="search-panel dining-search-panel" method="get">
        {event && <input type="hidden" name="event" value={event} />}
        {location && <input type="hidden" name="location" value={location} />}
        {hasCoords && <><input type="hidden" name="lat" value={String(lat)} /><input type="hidden" name="lng" value={String(lng)} /></>}
        <div className="advanced-grid">
          <label><span>ジャンル</span><select name="genre" defaultValue={genre}>
            {DINING_GENRES.map(([key,label]) => <option key={key} value={key === 'all' ? '' : key}>{label}</option>)}
          </select></label>
          <label><span>未就学児</span><select name="preschool" defaultValue={preschool}>
            {CHILD_PRICE_OPTIONS.map(([key,label]) => <option key={key || 'none'} value={key}>{label}</option>)}
          </select></label>
          <label><span>小学生</span><select name="elementary" defaultValue={elementary}>
            {CHILD_PRICE_OPTIONS.map(([key,label]) => <option key={key || 'none'} value={key}>{label}</option>)}
          </select></label>
          <label><span>障害者向け・配慮</span><select name="accessibility" defaultValue={accessibility}>
            <option value="">指定なし</option>{DINING_ACCESSIBILITY_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
        </div>
        <div className="toggle-row">
          <label className="check-chip"><input type="checkbox" name="kidsMenu" value="1" defaultChecked={kidsMenu} />キッズメニュー</label>
          <label className="check-chip"><input type="checkbox" name="highChair" value="1" defaultChecked={highChair} />ベビーチェア</label>
          <label className="check-chip"><input type="checkbox" name="stroller" value="1" defaultChecked={stroller} />ベビーカー</label>
          <label className="check-chip"><input type="checkbox" name="privateRoom" value="1" defaultChecked={privateRoom} />個室</label>
          <label className="check-chip"><input type="checkbox" name="nonSmoking" value="1" defaultChecked={nonSmoking} />禁煙</label>
          <button className="search-button" type="submit">この条件で探す</button>
        </div>
      </form>

      <section className="dining-general-search">
        <div><strong>一般の飲食店もまとめて探す</strong><p>通常の飲食店検索はGoogle Mapsを開きます。子ども料金など、まちイベ独自条件は下の「確認済み情報」で確認できます。</p></div>
        <a href={mapsUrl} target="_blank" rel="noreferrer">周辺の飲食店を地図で探す</a>
      </section>

      <section className="dining-results">
        <div className="section-heading"><div><span className="result-kicker">VERIFIED FAMILY INFO</span><h2>子連れ条件の確認済み情報</h2></div><span className="result-count">{matched.length}件</span></div>
        {matched.length ? (
          <div className="dining-result-grid">
            {matched.map((shop)=>(
              <article className="dining-result-card" key={shop.identity_key}>
                <div className="dining-card-head"><h3>{shop.name}</h3>{shop.distance!=null && <span>{shop.distance.toFixed(1)}km</span>}</div>
                <p>{[shop.prefecture,shop.municipality,shop.address].filter(Boolean).join(' ')}</p>
                <div className="tag-row">
                  {shop.kids_menu && <span className="tag">キッズメニュー</span>}
                  {shop.high_chair && <span className="tag">ベビーチェア</span>}
                  {shop.stroller_ok && <span className="tag">ベビーカー</span>}
                  {shop.private_room && <span className="tag">個室</span>}
                  {shop.non_smoking && <span className="tag">禁煙</span>}
                  {shop.barrier_free && <span className="tag tag-accessibility">バリアフリー</span>}
                </div>
                {shop.child_price_rules.length>0 && <div className="child-price-box">
                  {shop.child_price_rules.map((rule,index)=><p key={index}><strong>{diningRuleLabel(rule)}</strong>{rule.condition_text && <span> — {rule.condition_text}</span>}</p>)}
                </div>}
                <p className="verified-at">最終確認：{shop.last_verified_at ? new Date(shop.last_verified_at).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'}) : '確認日不明'}</p>
                <div className="dining-links">{shop.official_url && <a href={shop.official_url} target="_blank" rel="noreferrer">店舗公式</a>}<a href={shop.source_url} target="_blank" rel="noreferrer">情報源</a></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><h2>この条件の確認済み店舗情報はまだありません</h2><p>一般店舗検索は上の地図検索を利用できます。未就学無料・半額などは、公式情報で確認できた店舗から順次追加します。</p></div>
        )}
      </section>

      <section className="dining-foundation-note">
        <strong>料金条件は推測しません</strong>
        <p>「未就学無料」「未就学半額」「小学生半額」などは、条件・有効期限・出典・最終確認日をセットで扱います。古い情報は確認済み扱いから外します。</p>
      </section>
    </main>
  );
}
