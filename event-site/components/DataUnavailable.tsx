import {eventLabels} from '@/lib/event-labels';
import type {Locale} from '@/lib/i18n-config';

export function DataUnavailable({locale='ja'}:{locale?:Locale}) {
  const g=eventLabels(locale).generic;
  return (
    <div className="empty-state data-unavailable" role="status">
      <div className="empty-icon">!</div>
      <h2>{g.dataUnavailableTitle}</h2>
      <p>{g.dataUnavailableCopy}</p>
    </div>
  );
}
