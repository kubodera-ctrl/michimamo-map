import { getEvent } from '@/lib/events';

function escapeIcs(value: string) {
  return value
    .replaceAll('\\','\\\\')
    .replaceAll('\n','\\n')
    .replaceAll(',','\\,')
    .replaceAll(';','\\;');
}

function compact(date: string, time: string | null) {
  if (!time) return date.replaceAll('-','');
  return `${date.replaceAll('-','')}T${time.replaceAll(':','').slice(0,6)}`;
}

function addDays(date: string, days: number) {
  const [y,m,d] = date.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10);
}

export async function GET(_: Request, { params }: { params: Promise<{slug:string}> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return new Response('Not found', { status: 404 });

  const timed = Boolean(event.start_time || event.end_time);
  const dtStart = compact(event.start_date, event.start_time);
  const allDayEnd = addDays(event.end_date, 1);
  const dtEnd = compact(timed ? event.end_date : allDayEnd, event.end_time);
  const location = [event.venue_name,event.prefecture,event.municipality,event.address].filter(Boolean).join(' ');
  const now = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Machi Ibe//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(event.slug)}@machi-ibe`,
    `DTSTAMP:${now}`,
    timed ? `DTSTART;TZID=Asia/Tokyo:${dtStart}` : `DTSTART;VALUE=DATE:${dtStart}`,
    timed
      ? (event.end_time ? `DTEND;TZID=Asia/Tokyo:${dtEnd}` : null)
      : `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `LOCATION:${escapeIcs(location)}`,
    `URL:${escapeIcs(event.official_url)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`
    }
  });
}
