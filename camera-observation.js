(function (root) {
    'use strict';
    // Decision layer only, NOT a vehicle tracker or road detector. Not loaded in the
    // public page until real upstream evidence and device performance are validated.
    const thresholds = [300000,600000,1200000];
    const hazards = new Set(['crosswalk_blocked','intersection_blocked','cycle_space_blocked']);
    class ObservationPolicy {
        constructor() { this.reset(); }
        reset() { this.mode=null; this.last=null; this.walk=new Map(); this.drive=new Map(); this.lastCapture=-Infinity; this.pending=new Set(); }
        step(frame) {
            const events=[]; this.pending.clear();
            const valid = frame && Number.isFinite(frame.at) && frame.at >= 0 && ['walk','drive'].includes(frame.mode)
                && frame.foreground === true && frame.detectorValidated === true && frame.frameValid === true
                && Array.isArray(frame.vehicles) && frame.vehicles.length <= 64;
            if (!valid) { this.reset(); return events; }
            if (this.last !== null && frame.at <= this.last) { this.reset(); return events; }
            if (this.mode !== frame.mode || (this.last !== null && frame.at-this.last > 1500)) this.reset();
            this.mode=frame.mode; this.last=frame.at;
            if (frame.mode === 'walk') {
                if (frame.cameraStable !== true || frame.trackerValidated !== true) { this.walk.clear(); return events; }
                const seen=new Set();
                const counts=new Map();
                for (const v of frame.vehicles) counts.set(v?.trackId,(counts.get(v?.trackId)||0)+1);
                for (const v of frame.vehicles) {
                    const id=v?.trackId;
                    if (typeof id !== 'string' || !id || id.length>128 || counts.get(id)!==1 || v.visible!==true || v.occluded!==false
                        || v.identityReliable!==true || v.stationary!==true || !Number.isFinite(v.confidence) || (v.confidence<.9 || v.confidence>1)) continue;
                    seen.add(id);
                    let track=this.walk.get(id);
                    if (!track) { track={since:frame.at, stopped:false, captured:new Set()}; this.walk.set(id,track); }
                    const elapsed=frame.at-track.since;
                    if (elapsed>=180000 && !track.stopped) { track.stopped=true; events.push({type:'stop_candidate',trackId:id,observedMs:elapsed}); }
                    for (const threshold of thresholds) if (elapsed>=threshold && !track.captured.has(threshold) && frame.at-this.lastCapture>=2000) {
                        // A request must be acknowledged only after its exact frame is retained.
                        events.push({type:'capture_request',mode:'walk',trackId:id,thresholdMs:threshold,observedMs:elapsed,at:frame.at,since:track.since});
                        break;
                    }
                }
                for (const id of this.walk.keys()) if (!seen.has(id)) this.walk.delete(id);
            } else {
                if (frame.roadDetectorValidated!==true) { this.drive.clear(); return events; }
                for (const [key,at] of this.drive) if (frame.at-at>=60000) this.drive.delete(key);
                for (const v of frame.vehicles) {
                    // Requires an upstream local event identity AND road/vehicle relation.
                    // A plain vehicle bbox or proximity to a crossing is insufficient.
                    if (typeof v?.eventId!=='string' || !v.eventId || v.eventId.length>128 || v.visible!==true || v.occluded!==false
                        || !hazards.has(v.hazard) || v.blocksPassage!==true || v.stoppedEvidence!==true
                        || !Number.isFinite(v.confidence) || (v.confidence<.9 || v.confidence>1) || !Number.isFinite(v.relationConfidence) || (v.relationConfidence<.9 || v.relationConfidence>1)
                        || this.drive.has(v.eventId) || this.drive.size>=64 || frame.at-this.lastCapture<2000) continue;
                    events.push({type:'capture_request',mode:'drive',eventId:v.eventId,hazard:v.hazard,at:frame.at,review:'after_stopping'});
                }
            }
            for (const event of events) if (event.type==='capture_request') this.pending.add(event);
            return events;
        }
        acknowledge(event) {
            if (!this.pending.has(event) || !event || event.type!=='capture_request' || event.mode!==this.mode || event.at!==this.last || event.at-this.lastCapture<2000) return false;
            if (event.mode==='walk') {
                const track=this.walk.get(event.trackId);
                if (!track || track.since!==event.since || !thresholds.includes(event.thresholdMs) || event.at-track.since<event.thresholdMs || track.captured.has(event.thresholdMs)) return false;
                track.captured.add(event.thresholdMs);
            } else {
                if (!hazards.has(event.hazard) || typeof event.eventId!=='string' || this.drive.has(event.eventId) || this.drive.size>=64) return false;
                this.drive.set(event.eventId,event.at);
            }
            this.pending.delete(event); this.lastCapture=event.at;
            return true;
        }
    }
    root.MachimamoObservationPolicy=ObservationPolicy;
})(typeof window !== 'undefined' ? window : globalThis);
