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

export async function GET(request: Request, { params }: { params: Promise<{slug:string}> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return new Response('Not found', { status: 404 });

  const requestedDate=new URL(request.url).searchParams.get('date');
  const occurrence=requestedDate
    ? (event.occurrences || []).find((item)=>item.date===requestedDate && item.status!=='cancelled')
    : null;
  const continuousDateValid=Boolean(
    requestedDate
    && event.schedule_type==='continuous'
    && requestedDate>=event.start_date
    && requestedDate<=event.end_date
  );
  if(requestedDate && !occurrence && !continuousDateValid) {
    return new Response('Invalid occurrence date',{status:400});
  }

  const startDate=occurrence?.date || (continuousDateValid ? requestedDate! : event.start_date);
  const endDate=occurrence?.date || (continuousDateValid ? requestedDate! : event.end_date);
  const startTime=occurrence?.start_time ?? event.start_time;
  const endTime=occurrence?.end_time ?? event.end_time;
  const timed = Boolean(startTime || endTime);
  const dtStart = compact(startDate, startTime);
  const allDayEnd = addDays(endDate, 1);
  const dtEnd = compact(timed ? endDate : allDayEnd, endTime);
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
      ? (endTime ? `DTEND;TZID=Asia/Tokyo:${dtEnd}` : null)
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
