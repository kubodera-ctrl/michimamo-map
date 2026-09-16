const assert=require('node:assert/strict');
const {summarizeRoads}=require('../scripts/road-parking-summary.cjs');
const options={fromMs:100,toMs:1000,nowMs:1000,periodId:'test-window',roadIds:['road-a','road-b']};
function row(n,extra={}){return {observationId:'photo-'+n,eventId:'event-'+n,roadId:'road-a',review:'accepted',analyticsEligible:true,
    dedupResolved:true,eventKind:'observation',observedAtMs:200,expiresAtMs:1100,obstructionReview:'unconfirmed',...extra};}
const identity={identityVerified:true,identityRoadId:'road-a',identityPeriodId:'test-window',vehicleKey:'opaque-test-key'};
const records=[row(1,identity),row(2,{...identity,eventId:'event-1'}),row(3,{...identity,observedAtMs:700,obstructionReview:'confirmed'}),
    row(4,{roadId:'road-b',eventKind:'continuous_stop'}),row(5,{review:'pending'}),row(6,{review:'rejected'}),row(7,{expiresAtMs:1000}),
    row(8,{dedupResolved:false}),row(9,{analyticsEligible:false}),row(10,{roadId:'unknown'})];
const result=summarizeRoads([...records,records[0]],options);
assert.equal(result.internal[0].observedEvents,2,'multiple photos/reporters and replayed rows count one canonical event');
assert.equal(result.internal[0].confirmedStopEvents,0,'repeat snapshots do not prove separate parking occurrences');
assert.equal(result.internal[0].knownVehicles,1);assert.equal(result.internal[0].repeatObservedVehicles,1);assert.equal(result.internal[0].repeatObservations,1);
assert.equal(result.internal[0].confirmedObstructionEvents,1);
assert.equal(result.internal[1].knownVehicles,null,'no OCR is unknown, not zero vehicles');
assert.equal(result.internal[1].confirmedStopEvents,1);
assert.equal(result.diagnostics.excludedRows,4);assert.equal(result.diagnostics.unresolvedRows,2);
assert.ok(!JSON.stringify(result).includes('opaque-test-key'),'no vehicle identifiers in either aggregate');
assert.deepEqual(Object.keys(result.publicSummary.roads[0]).sort(),['confirmedObstructionEvents','observedEvents','roadId']);
for(const extra of [{identityVerified:false},{identityRoadId:'road-b'},{identityPeriodId:'old-window'}]){
    const r=summarizeRoads([row(1,{...identity,...extra})],options);assert.equal(r.internal[0].knownVehicles,null);
}
const conflicts=summarizeRoads([row(1),row(2,{eventId:'event-1',roadId:'road-b'})],options);
assert.equal(conflicts.internal.length,0);assert.equal(conflicts.diagnostics.conflictingEvents,1);
assert.equal(summarizeRoads([row(1),row(1,{eventId:'event-2'})],options).internal.length,0,'conflicting observation IDs quarantine both events');
assert.equal(summarizeRoads([row(1,identity),row(2,{...identity,eventId:'event-1',vehicleKey:'different'})],options).internal.length,0);
const boundaries=summarizeRoads([row(1,{observedAtMs:99}),row(2,{observedAtMs:100}),row(3,{observedAtMs:1000})],options);
assert.equal(boundaries.internal[0].observedEvents,1,'half-open interval');
const otherRoad=summarizeRoads([row(1,identity),row(2,{...identity,roadId:'road-b',identityRoadId:'road-b'})],options);
assert.equal(otherRoad.internal.every(r=>r.repeatObservedVehicles===0),true,'no cross-road vehicle matching');
assert.deepEqual(summarizeRoads(records.toReversed(),options),summarizeRoads(records,options),'stable ordering');
assert.throws(()=>summarizeRoads([],{...options,toMs:1001}));
assert.deepEqual(summarizeRoads([],options).publicSummary.roads,[]);
console.log('PASS: deduplicated events, unknown identity, scoped repetition, human obstruction review, expiry/review exclusions, conflict quarantine, interval boundaries, public field whitelist. Synthetic records only.');
