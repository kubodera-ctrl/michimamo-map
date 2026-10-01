export const EXPLICIT_EVENT_STATES=[
  'unknown','active','changed','cancelled','postponed','sold_out','registration_closed'
] as const;
export type ExplicitEventState=typeof EXPLICIT_EVENT_STATES[number];

export type ExplicitEventStateSnapshot={
  state:ExplicitEventState;
  explicit:boolean;
  sourceUrl:string|null;
  checkedAt:string|null;
  stateUpdatedAt:string|null;
  rawStatus:string|null;
};

export function mapExplicitEventState(
  rawStatus:unknown,
  mapping:Readonly<Record<string,ExplicitEventState>>,
  sourceUrl:string|null,
  checkedAt:string|null,
  stateUpdatedAt:string|null
):ExplicitEventStateSnapshot{
  const raw=typeof rawStatus==='string'?rawStatus.trim():rawStatus==null?'':String(rawStatus).trim();
  if(!raw||!Object.prototype.hasOwnProperty.call(mapping,raw)){
    return {state:'unknown',explicit:false,sourceUrl,checkedAt,stateUpdatedAt,rawStatus:raw||null};
  }
  return {state:mapping[raw],explicit:true,sourceUrl,checkedAt,stateUpdatedAt,rawStatus:raw};
}

export function explicitEventStateBlockers(snapshot:ExplicitEventStateSnapshot){
  const blockers:string[]=[];
  if(!snapshot.explicit)blockers.push('explicit_status_missing');
  if(!snapshot.sourceUrl)blockers.push('source_url_missing');
  if(!snapshot.checkedAt)blockers.push('checked_at_missing');
  if(!snapshot.stateUpdatedAt)blockers.push('state_updated_at_missing');
  return blockers;
}
