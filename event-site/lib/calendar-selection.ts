export type CalendarOccurrenceLike={
  date:string;
  start_time:string|null;
  end_time:string|null;
  status:string;
};

export function occurrenceKey(item:Pick<CalendarOccurrenceLike,'date'|'start_time'>){
  return `${item.date}|${item.start_time||''}`;
}

export function findOccurrenceByKey<T extends CalendarOccurrenceLike>(items:T[],key:string):T|undefined{
  return items.find((item)=>occurrenceKey(item)===key);
}

export function findOccurrenceForRequest<T extends CalendarOccurrenceLike>(
  items:T[],
  date:string|null,
  time:string|null
):T|undefined{
  if(!date) return undefined;
  return items.find((item)=>
    item.status!=='cancelled'
    && item.date===date
    && (!time || item.start_time===time)
  );
}

export function uniqueOccurrenceDates(items:CalendarOccurrenceLike[]){
  return [...new Set(items.filter((item)=>item.status!=='cancelled').map((item)=>item.date))];
}


export function activeOccurrencesForDate<T extends CalendarOccurrenceLike>(items:T[],date:string){
  return items.filter((item)=>item.status!=='cancelled'&&item.date===date);
}
