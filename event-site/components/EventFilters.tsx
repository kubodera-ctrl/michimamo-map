import {
  ACCESSIBILITY_OPTIONS,
  AGE_OPTIONS,
  CATEGORY_OPTIONS,
  DURATION_OPTIONS,
  FANDOM_GROUPS,
  PRICE_OPTIONS,
  SORT_OPTIONS
} from '@/lib/events';
import { PREFECTURES } from '@/lib/prefectures';
import { SaveSearchButton } from './SaveSearchButton';

type Props = {
  values: {
    dateMode: string; customStart:string; customEnd:string; prefecture: string; keyword: string; excludeWords: string;
    category: string; age: string; duration: string; fandom: string; fandomKeyword: string; price: string;
    accessibilityOnly: boolean; accessibilityFeature: string; childFocusOnly: boolean;
    familyFriendlyOnly: boolean; rainyDayOnly:boolean; excludeAdultOriented: boolean; indoorOnly: boolean; sort: string;
  };
};

export function EventFilters({ values }: Props) {
  return (
    <form className="search-panel" action="/" method="get">
      <div className="date-tabs" role="radiogroup" aria-label="開催日">
        {[
          ['today','今日'],['tomorrow','明日'],['weekend','今週末'],['30days','30日以内'],['custom','日付指定']
        ].map(([value,label]) => (
          <label className={`date-chip ${values.dateMode === value ? 'active' : ''}`} key={value}>
            <input type="radio" name="when" value={value} defaultChecked={values.dateMode === value} />
            {label}
          </label>
        ))}
      </div>

      <div className="custom-date-range">
        <label>
          <span>開始日</span>
          <input type="date" name="from" defaultValue={values.customStart} />
        </label>
        <label>
          <span>終了日</span>
          <input type="date" name="to" defaultValue={values.customEnd} />
        </label>
        <small>1日だけ探す場合は開始日だけ選択。期間で探す場合は終了日も指定できます。</small>
      </div>

      <div className="search-grid">
        <label><span>エリア</span><select name="prefecture" defaultValue={values.prefecture}>
          <option value="">全国</option>{PREFECTURES.map(([slug,name]) => <option key={slug} value={name}>{name}</option>)}
        </select></label>
        <label className="keyword-field"><span>キーワード</span><input name="q" defaultValue={values.keyword} maxLength={100} placeholder="花火、マルシェ、科学館…" /></label>
        <label><span>カテゴリ</span><select name="category" defaultValue={values.category}>
          <option value="">すべて</option>{CATEGORY_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label><span>対象</span><select name="age" defaultValue={values.age}>
          <option value="">指定なし</option>{AGE_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </div>

      <div className="advanced-title">
        <span>検索を細かく調整</span>
        <small>長期イベントや不要な候補に埋もれにくくする絞り込みです</small>
      </div>

      <div className="advanced-grid">
        <label className="exclude-field"><span>除外ワード</span>
          <input name="exclude" defaultValue={values.excludeWords} maxLength={500} placeholder="例：アフタヌーンティー、ビュッフェ、ディナー" />
          <small>「、」またはカンマ区切り。タイトル・説明・会場・主催者・料金文などを対象に除外します。</small>
        </label>
        <label><span>開催期間</span><select name="duration" defaultValue={values.duration}>
          <option value="">指定なし</option>{DURATION_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label><span>料金</span><select name="price" defaultValue={values.price}>
          <option value="">指定なし</option>{PRICE_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label><span>推し活・作品/キャラ</span><select name="oshi" defaultValue={values.fandom}>
          <option value="">指定なし</option>
          {FANDOM_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>
            {group.items.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
          </optgroup>)}
        </select></label>
        <label className="oshi-keyword-field"><span>推し活キーワード（任意）</span>
          <input name="oshiKeyword" defaultValue={values.fandomKeyword} maxLength={80} placeholder="例：コナン、ちいかわ、ヒロアカ、しなこ" />
          <small>一覧にない作品名・キャラ名・出演者名など。確認済み関連情報または掲載本文の文字一致で探します。</small>
        </label>
        <label><span>障害者向け・配慮内容</span><select name="accessibilityFeature" defaultValue={values.accessibilityFeature}>
          <option value="">指定なし</option>{ACCESSIBILITY_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label><span>並び順</span><select name="sort" defaultValue={values.sort}>
          {SORT_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </div>

      <div className="toggle-row">
        <label className="check-chip check-chip-rainy"><input type="checkbox" name="rainy" value="1" defaultChecked={values.rainyDayOnly} />☔ 雨の日の室内遊び</label>\n        <label className="check-chip"><input type="checkbox" name="indoor" value="1" defaultChecked={values.indoorOnly} />屋内だけ</label>
        <label className="check-chip check-chip-accessibility"><input type="checkbox" name="accessibility" value="1" defaultChecked={values.accessibilityOnly} />障害者向け・配慮情報あり</label>
        <label className="check-chip"><input type="checkbox" name="childFocus" value="1" defaultChecked={values.childFocusOnly} />子どもが主役</label>
        <label className="check-chip"><input type="checkbox" name="family" value="1" defaultChecked={values.familyFriendlyOnly} />ファミリー向け</label>
        <label className="check-chip"><input type="checkbox" name="excludeAdult" value="1" defaultChecked={values.excludeAdultOriented} />大人向けを除く</label>
        <button className="search-button" type="submit">この条件で探す</button>
      </div>
      <SaveSearchButton />
    </form>
  );
}
