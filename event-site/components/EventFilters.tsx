import { AGE_OPTIONS, CATEGORY_OPTIONS } from '@/lib/events';
import { PREFECTURES } from '@/lib/prefectures';

type Props = {
  values: {
    dateMode: string;
    prefecture: string;
    keyword: string;
    category: string;
    age: string;
    freeOnly: boolean;
    indoorOnly: boolean;
  };
};

export function EventFilters({ values }: Props) {
  return (
    <form className="search-panel" action="/" method="get">
      <div className="date-tabs" aria-label="開催日">
        {[
          ['today','今日'],
          ['tomorrow','明日'],
          ['weekend','今週末'],
          ['30days','30日以内']
        ].map(([value,label]) => (
          <label className={`date-chip ${values.dateMode === value ? 'active' : ''}`} key={value}>
            <input type="radio" name="when" value={value} defaultChecked={values.dateMode === value} />
            {label}
          </label>
        ))}
      </div>

      <div className="search-grid">
        <label>
          <span>エリア</span>
          <select name="prefecture" defaultValue={values.prefecture}>
            <option value="">全国</option>
            {PREFECTURES.map(([slug,name]) => <option key={slug} value={name}>{name}</option>)}
          </select>
        </label>

        <label className="keyword-field">
          <span>キーワード</span>
          <input name="q" defaultValue={values.keyword} placeholder="花火、マルシェ、科学館…" />
        </label>

        <label>
          <span>カテゴリ</span>
          <select name="category" defaultValue={values.category}>
            <option value="">すべて</option>
            {CATEGORY_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>

        <label>
          <span>対象</span>
          <select name="age" defaultValue={values.age}>
            <option value="">指定なし</option>
            {AGE_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="toggle-row">
        <label className="check-chip"><input type="checkbox" name="free" value="1" defaultChecked={values.freeOnly} />無料だけ</label>
        <label className="check-chip"><input type="checkbox" name="indoor" value="1" defaultChecked={values.indoorOnly} />屋内だけ</label>
        <button className="search-button" type="submit">イベントを探す</button>
      </div>
    </form>
  );
}
