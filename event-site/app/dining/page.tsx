import { CHILD_PRICE_OPTIONS, DINING_ACCESSIBILITY_OPTIONS, DINING_GENRES } from '@/lib/dining';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';

export default async function DiningPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const event = one(params.event);
  const lat = one(params.lat);
  const lng = one(params.lng);
  const genre = one(params.genre);
  const preschool = one(params.preschool);
  const elementary = one(params.elementary);
  const accessibility = one(params.accessibility);

  return (
    <main className="content-wrap dining-page">
      <p className="eyebrow">AFTER EVENT</p>
      <h1>遊んだあとの、ごはんを探す</h1>
      <p className="area-copy">
        {event ? `「${event}」の周辺` : 'イベント会場の周辺'}から、子連れ条件まで含めて探せる飲食店検索です。
      </p>

      <form className="search-panel dining-search-panel" method="get">
        {event && <input type="hidden" name="event" value={event} />}
        {lat && <input type="hidden" name="lat" value={lat} />}
        {lng && <input type="hidden" name="lng" value={lng} />}

        <div className="advanced-grid">
          <label>
            <span>ジャンル</span>
            <select name="genre" defaultValue={genre}>
              {DINING_GENRES.map(([key,label]) => <option key={key} value={key === 'all' ? '' : key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>未就学児</span>
            <select name="preschool" defaultValue={preschool}>
              {CHILD_PRICE_OPTIONS.map(([key,label]) => <option key={key || 'none'} value={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>小学生</span>
            <select name="elementary" defaultValue={elementary}>
              {CHILD_PRICE_OPTIONS.map(([key,label]) => <option key={key || 'none'} value={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>障害者向け・配慮</span>
            <select name="accessibility" defaultValue={accessibility}>
              <option value="">指定なし</option>
              {DINING_ACCESSIBILITY_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>

        <div className="toggle-row">
          <label className="check-chip"><input type="checkbox" name="kidsMenu" value="1" />キッズメニュー</label>
          <label className="check-chip"><input type="checkbox" name="highChair" value="1" />ベビーチェア</label>
          <label className="check-chip"><input type="checkbox" name="stroller" value="1" />ベビーカー</label>
          <label className="check-chip"><input type="checkbox" name="privateRoom" value="1" />個室</label>
          <label className="check-chip"><input type="checkbox" name="nonSmoking" value="1" />禁煙</label>
          <button className="search-button" type="submit">この条件で探す</button>
        </div>
      </form>

      <section className="dining-foundation-note">
        <strong>子ども料金まで検索できるように設計済みです</strong>
        <p>
          「未就学無料」「未就学半額」「小学生半額」などは一般的な店舗検索APIだけでは足りないため、
          公式情報で確認できた料金条件を、まちまも独自の補助データとして重ねます。
          条件・有効期限・出典・最終確認日も一緒に表示します。
        </p>
        <p className="muted-note">現在はデータ提供元を接続する前の基盤画面です。実在店舗を推測で表示しません。</p>
      </section>
    </main>
  );
}
