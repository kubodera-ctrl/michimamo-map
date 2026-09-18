import { EventCard } from './EventCard';
import { getPickupEvents } from '@/lib/events';

export async function PickupEvents(){
  const events=await getPickupEvents(6);
  if(!events.length) return null;
  return (
    <section className="pickup-section" aria-labelledby="pickup-title">
      <div className="pickup-heading">
        <div><p className="eyebrow">PICK UP</p><h2 id="pickup-title">いま注目のイベント</h2></div>
        <p>サイト内の人気傾向と運営確認をもとに掲載しています。</p>
      </div>
      <div className="event-grid pickup-grid">
        {events.map((event)=><EventCard key={event.id} event={event} />)}
      </div>
    </section>
  );
}
