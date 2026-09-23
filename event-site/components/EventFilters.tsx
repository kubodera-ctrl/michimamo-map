import {
  ACCESSIBILITY_OPTIONS,
  AGE_OPTIONS,
  CATEGORY_OPTIONS,
  DURATION_OPTIONS,
  EXPERIENCE_OPTIONS,
  FANDOM_GROUPS,
  PRICE_OPTIONS,
  SORT_OPTIONS
} from '@/lib/events';
import type {VenueTypeKey} from '@/lib/types';
import { PREFECTURES } from '@/lib/prefectures';
import Link from 'next/link';
import { SaveSearchButton } from './SaveSearchButton';
import {VenueTypeSelector} from './VenueTypeSelector';
import {eventLabels} from '@/lib/event-labels';
import {localePath,type Locale} from '@/lib/i18n-config';

type Props = {
  locale?:Locale;
  values: {
    dateMode: string; customStart:string; customEnd:string; prefecture: string; keyword: string; excludeWords: string;
    category: string; experience:string; age: string; duration: string; fandom: string; fandomKeyword: string; price: string;
    accessibilityOnly: boolean; accessibilityFeature: string; childFocusOnly: boolean;
    familyFriendlyOnly: boolean; rainyDayOnly:boolean; excludeAdultOriented: boolean; indoorOnly: boolean; venueTypes:VenueTypeKey[]; venueFilterActive:boolean; sort: string;
  };
};

export function EventFilters({ values, locale='ja' }: Props) {
  const labels=eventLabels(locale);
  const g=labels.generic;
  const advancedCount=[
    values.excludeWords,values.duration,values.price,values.fandom,values.fandomKeyword,
    values.accessibilityFeature,values.sort!=='recommended' ? values.sort : '',
    values.accessibilityOnly?'1':'',values.excludeAdultOriented?'1':''
  ].filter(Boolean).length;
  const advancedOpen=advancedCount>0;

  return (
    <form className="search-panel" action={localePath('/',locale)} method="get">
      <div className="date-tabs" role="radiogroup" aria-label={g.date}>
        {[
          ['today',g.today],['tomorrow',g.tomorrow],['weekend',g.weekend],['30days',g.within30],['custom',g.customDate]
        ].map(([value,label]) => (
          <label className={`date-chip ${values.dateMode === value ? 'active' : ''}`} key={value}>
            <input type="radio" name="when" value={value} defaultChecked={values.dateMode === value} />
            {label}
          </label>
        ))}
      </div>

      <div className="custom-date-range">
        <label>
          <span>{g.startDate}</span>
          <input type="date" name="from" defaultValue={values.customStart} />
        </label>
        <label>
          <span>{g.endDate}</span>
          <input type="date" name="to" defaultValue={values.customEnd} />
        </label>
        <small>{g.dateHelp}</small>
      </div>

      <div className="search-grid">
        <label><span>{g.area}</span><select name="prefecture" defaultValue={values.prefecture}>
          <option value="">{g.nationwide}</option>{PREFECTURES.map(([slug,name]) => <option key={slug} value={name}>{name}</option>)}
        </select></label>
        <label className="keyword-field"><span>{g.keyword}</span><input name="q" defaultValue={values.keyword} maxLength={100} placeholder={g.keywordPlaceholder} /></label>
        <label><span>{g.category}</span><select name="category" defaultValue={values.category}>
          <option value="">すべて</option>{CATEGORY_OPTIONS.map(([key,label]) => <option key={key} value={key}>{labels.category[key] || label}</option>)}
        </select></label>
        <label><span>{g.experienceGenre}</span><select name="experience" defaultValue={values.experience}>
          <option value="">{g.none}</option>
          <option value="experience">{labels.experience.experience}</option>
          {EXPERIENCE_OPTIONS.map(([key,label]) => <option key={key} value={key}>{labels.experience[key] || label}</option>)}
        </select></label>
        <label><span>{g.target}</span><select name="age" defaultValue={values.age}>
          <option value="">{g.none}</option>{AGE_OPTIONS.map(([key,label]) => <option key={key} value={key}>{labels.age[key] || label}</option>)}
        </select></label>
      </div>

      <VenueTypeSelector selected={values.venueTypes} active={values.venueFilterActive} locale={locale} />

      <div className="quick-filter-block">
        <div className="quick-filter-title"><strong>{g.quick}</strong><small>{g.quickHelp}</small></div>
        <div className="toggle-row quick-toggle-row">
          <label className="check-chip check-chip-rainy"><input type="checkbox" name="rainy" value="1" defaultChecked={values.rainyDayOnly} />{g.rainy}</label>
          <label className="check-chip"><input type="checkbox" name="indoor" value="1" defaultChecked={values.indoorOnly} />🏠 {g.indoor}</label>
          <label className="check-chip"><input type="checkbox" name="childFocus" value="1" defaultChecked={values.childFocusOnly} />🧒 {g.childCentered}</label>
          <label className="check-chip"><input type="checkbox" name="family" value="1" defaultChecked={values.familyFriendlyOnly} />👨‍👩‍👧 {g.familyFriendly}</label>
        </div>
      </div>

      <details className="advanced-search" open={advancedOpen}>
        <summary>
          <span><strong>{g.advanced}</strong><small>{g.advancedHelp}</small></span>
          {advancedCount>0 && <b>{locale==='ja'?`${advancedCount}${g.settingsActive}`:`${advancedCount}${g.settingsActive}`}</b>}
        </summary>
        <div className="advanced-grid">
          <label className="exclude-field"><span>{g.excludeWords}</span>
            <input name="exclude" defaultValue={values.excludeWords} maxLength={500} placeholder={g.excludePlaceholder} />
            <small>{g.excludeHelp}</small>
          </label>
          <label><span>{g.duration}</span><select name="duration" defaultValue={values.duration}>
            <option value="">{g.none}</option>{DURATION_OPTIONS.map(([key,label]) => <option key={key} value={key}>{labels.duration[key] || label}</option>)}
          </select></label>
          <label><span>{g.price}</span><select name="price" defaultValue={values.price}>
            <option value="">{g.none}</option>{PRICE_OPTIONS.map(([key,label]) => <option key={key} value={key}>{labels.price[key] || label}</option>)}
          </select></label>
          <label><span>{g.fandomField}</span><select name="oshi" defaultValue={values.fandom}>
            <option value="">{g.none}</option>
            {FANDOM_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>
              {group.items.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
            </optgroup>)}
          </select></label>
          <label className="oshi-keyword-field"><span>{g.fandomKeyword}</span>
            <input name="oshiKeyword" defaultValue={values.fandomKeyword} maxLength={80} placeholder={g.fandomPlaceholder} />
            <small>{g.fandomHelp}</small>
          </label>
          <label><span>{g.accessibilityField}</span><select name="accessibilityFeature" defaultValue={values.accessibilityFeature}>
            <option value="">指定なし</option>{ACCESSIBILITY_OPTIONS.map(([key,label]) => <option key={key} value={key}>{labels.accessibility[key] || label}</option>)}
          </select></label>
          <label><span>{g.sort}</span><select name="sort" defaultValue={values.sort}>
            {SORT_OPTIONS.map(([key,label]) => <option key={key} value={key}>{labels.sort[key] || label}</option>)}
          </select></label>
        </div>
        <div className="advanced-toggle-row">
          <label className="check-chip check-chip-accessibility"><input type="checkbox" name="accessibility" value="1" defaultChecked={values.accessibilityOnly} />{g.accessibilityAvailable}</label>
          <label className="check-chip"><input type="checkbox" name="excludeAdult" value="1" defaultChecked={values.excludeAdultOriented} />{g.excludeAdult}</label>
        </div>
      </details>

      <div className="search-submit-row">
        <Link className="clear-search-link" href={localePath('/',locale)}>{g.clearConditions}</Link>
        <button className="search-button" type="submit">{g.search}</button>
      </div>
      <SaveSearchButton />
    </form>
  );
}
