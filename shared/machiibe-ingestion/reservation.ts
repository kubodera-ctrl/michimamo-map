export const RESERVATION_MODES=[
  'unknown','not_required','required','lottery','first_come','same_day'
] as const;
export type ReservationMode=typeof RESERVATION_MODES[number];

export const RESERVATION_STATES=[
  'unknown','upcoming','open','closed','full','cancelled'
] as const;
export type ReservationState=typeof RESERVATION_STATES[number];

export type ReservationSnapshot={
  mode:ReservationMode;
  state:ReservationState;
  opensAt:string|null;
  closesAt:string|null;
  checkedAt:string|null;
  sourceUrl:string|null;
  reservationUrl:string|null;
  stateUpdatedAt:string|null;
};

export function inferReservationSnapshot(text:string):Pick<ReservationSnapshot,'mode'|'state'>{
  const value=text.normalize('NFKC');
  let mode:ReservationMode='unknown';
  let state:ReservationState='unknown';
  if(/予約不要|事前予約不要|自由参加/.test(value))mode='not_required';
  else if(/抽選/.test(value))mode='lottery';
  else if(/先着/.test(value))mode='first_come';
  else if(/当日券|当日受付|当日整理券/.test(value))mode='same_day';
  else if(/要予約|事前予約|予約が必要|申込が必要/.test(value))mode='required';

  if(/中止|開催中止|受付中止|予約中止/.test(value))state='cancelled';
  else if(/受付終了|申込終了|募集終了/.test(value))state='closed';
  else if(/完売|満席|定員に達/.test(value))state='full';
  else if(/受付中|申込受付中|予約受付中/.test(value))state='open';
  else if(/受付開始|予約開始/.test(value))state='upcoming';
  return {mode,state};
}
