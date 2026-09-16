(function(root){
'use strict';
// Offline aggregation over reviewed, canonical observations. No DB, OCR, network,
// scheduler or browser registration. Upstream deduplication must supply eventId.
function summarizeRoads(records, {fromMs, toMs, nowMs, periodId, roadIds}) {
    if (![fromMs,toMs,nowMs].every(Number.isSafeInteger) || fromMs<0 || toMs<=fromMs || toMs>nowMs
        || typeof periodId!=='string' || !periodId || !Array.isArray(roadIds) || !Array.isArray(records)) throw Error('invalid_summary_input');
    const roads=new Set(roadIds), events=new Map(), ids=new Map(), badEvents=new Set();
    const id=x=>typeof x==='string' && x.length>0 && x.length<=128;
    const diagnostics={excludedRows:0, unresolvedRows:0, conflictingEvents:0};
    for (const r of records) {
        if (!r || r.review!=='accepted' || r.analyticsEligible!==true || !Number.isSafeInteger(r.expiresAtMs) || r.expiresAtMs<=nowMs) {
            diagnostics.excludedRows++;continue;
        }
        if (!id(r.observationId) || !id(r.eventId) || !roads.has(r.roadId) || r.dedupResolved!==true
            || !['observation','continuous_stop'].includes(r.eventKind) || !Number.isSafeInteger(r.observedAtMs) || r.observedAtMs<0
            || r.observedAtMs>nowMs || r.expiresAtMs<=r.observedAtMs) { diagnostics.unresolvedRows++;continue; }
        // Cross-road and inconsistent group identities quarantine the entire event,
        // including observations outside the selected reporting interval.
        const key=r.identityVerified===true && r.identityRoadId===r.roadId && r.identityPeriodId===periodId && id(r.vehicleKey)
            ? r.vehicleKey : null;
        const row={eventId:r.eventId,roadId:r.roadId,eventKind:r.eventKind,observedAtMs:r.observedAtMs,vehicleKey:key,obstruction:r.obstructionReview==='confirmed'};
        const signature=JSON.stringify(row), prior=ids.get(r.observationId);
        if (prior) {
            if (prior.signature!==signature) {badEvents.add(prior.eventId);badEvents.add(r.eventId);}
            continue;
        }
        ids.set(r.observationId,{signature,eventId:r.eventId});
        let event=events.get(r.eventId);
        if (!event) {event={roadId:r.roadId,kind:r.eventKind,keys:new Set(),rows:[]};events.set(r.eventId,event);}
        if (event.roadId!==r.roadId || event.kind!==r.eventKind)badEvents.add(r.eventId);
        if (key)event.keys.add(key);
        if(event.keys.size>1)badEvents.add(r.eventId);
        event.rows.push(row);
    }
    const summaries=new Map();
    for (const [eventId,event] of events) {
        if (badEvents.has(eventId))continue;
        const included=event.rows.filter(r=>r.observedAtMs>=fromMs && r.observedAtMs<toMs);
        if(!included.length)continue;
        let road=summaries.get(event.roadId);
        if(!road){road={roadId:event.roadId,observedEvents:0,confirmedStopEvents:0,confirmedObstructionEvents:0,identifiedEvents:0,keys:new Map()};summaries.set(event.roadId,road);}
        road.observedEvents++;
        if(event.kind==='continuous_stop')road.confirmedStopEvents++;
        if(included.some(r=>r.obstruction))road.confirmedObstructionEvents++;
        // Only identity evidence inside this interval contributes to vehicle counts.
        const key=included.find(r=>r.vehicleKey)?.vehicleKey;
        if(key){road.identifiedEvents++;road.keys.set(key,(road.keys.get(key)||0)+1);}
    }
    diagnostics.conflictingEvents=badEvents.size;
    const internal=Array.from(summaries.values()).map(r=>({
        roadId:r.roadId,observedEvents:r.observedEvents,confirmedStopEvents:r.confirmedStopEvents,
        confirmedObstructionEvents:r.confirmedObstructionEvents,identifiedEvents:r.identifiedEvents,
        unidentifiedEvents:r.observedEvents-r.identifiedEvents,
        knownVehicles:r.identifiedEvents ? r.keys.size : null,
        repeatObservedVehicles:r.identifiedEvents ? [...r.keys.values()].filter(n=>n>1).length : null,
        repeatObservations:r.identifiedEvents ? [...r.keys.values()].reduce((n,count)=>n+Math.max(0,count-1),0) : null
    })).sort((a,b)=>b.observedEvents-a.observedEvents || (a.roadId<b.roadId?-1:a.roadId>b.roadId?1:0));
    // Public projection is an explicit whitelist; no plates, vehicle keys, per-car
    // histories, exact observation timestamps, photo URLs or reporter IDs.
    const publicSummary={title:'駐停車の報告が多い道路',fromMs,toMs,
        note:'確認済み・重複整理済みの観測件数です。投稿量に左右され、違反件数や実際の駐停車総数を示しません。',
        roads:internal.map(({roadId,observedEvents,confirmedObstructionEvents})=>({roadId,observedEvents,confirmedObstructionEvents}))};
    return {internal,publicSummary,diagnostics};
}
if(typeof module!=='undefined' && module.exports)module.exports={summarizeRoads};
else root.MachimamoRoadSummary={summarizeRoads};

})(typeof window!=='undefined'?window:globalThis);
