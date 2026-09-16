(function (root) {
    'use strict';
    // Pure decision layer. It never opens the camera, stores pixels, uploads data or
    // claims a traffic violation. Real vehicle/road detectors must supply the inputs.
    const hazards = new Set(['roadside_stop','crosswalk_blocked','intersection_blocked','cycle_space_blocked','bus_stop_blocked','double_parking','road_obstruction']);
    const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
    const finite01 = value => Number.isFinite(value) && value >= 0 && value <= 1;

    class ThermalPolicy {
        update(state) {
            if (!['nominal','fair','serious','critical'].includes(state)) state='serious';
            if (state==='nominal') return {sampleIntervalMs:1000,lightweightDetection:true,camera:true,paused:false};
            if (state==='fair') return {sampleIntervalMs:2000,lightweightDetection:true,camera:true,paused:false};
            if (state==='serious') return {sampleIntervalMs:4000,lightweightDetection:false,camera:true,paused:false};
            return {sampleIntervalMs:null,lightweightDetection:false,camera:false,paused:true};
        }
    }

    class ObservationPolicy {
        constructor() { this.reset(); }
        reset() { this.mode=null;this.last=null;this.walk=new Map();this.drive=new Map();this.lastCapture=-Infinity;this.pending=new Set();this.driveFrames=[]; }
        validFrame(frame) {
            return frame && Number.isFinite(frame.at) && frame.at >= 0 && validId(frame.frameId)
                && ['walk','drive'].includes(frame.mode) && frame.foreground===true && frame.detectorValidated===true
                && frame.frameValid===true && Array.isArray(frame.vehicles) && frame.vehicles.length<=64;
        }
        step(frame) {
            const events=[];this.pending.clear();
            if (!this.validFrame(frame)) { this.reset();return events; }
            if (this.last!==null && frame.at<=this.last) { this.reset();return events; }
            if (this.mode!==frame.mode || (this.last!==null && frame.at-this.last>2500)) this.reset();
            this.mode=frame.mode;this.last=frame.at;
            if (frame.mode==='walk') this.walkStep(frame,events); else this.driveStep(frame,events);
            for (const event of events) if (event.type==='capture_request') this.pending.add(event);
            return events;
        }
        walkStep(frame,events) {
            if (frame.cameraStable!==true || frame.trackerValidated!==true) { this.walk.clear();return; }
            const seen=new Set(),counts=new Map();
            for (const v of frame.vehicles) counts.set(v?.trackId,(counts.get(v?.trackId)||0)+1);
            for (const v of frame.vehicles) {
                const id=v?.trackId;
                const usable=validId(id) && counts.get(id)===1 && v.visible===true && v.occluded===false && v.identityReliable===true
                    && finite01(v.confidence) && v.confidence>=.75 && finite01(v.sharpness) && v.sharpness>=.45
                    && finite01(v.exposure) && v.exposure>=.25 && finite01(v.coverage) && v.coverage>=.08 && v.coverage<=.9;
                if (!usable) continue;
                seen.add(id);
                let track=this.walk.get(id);
                if (!track) { track={since:frame.at,frames:[],recognized:false,requested:false};this.walk.set(id,track); }
                if (frame.at-track.since>5000) { this.walk.delete(id);continue; }
                track.frames.push({frameId:frame.frameId,score:v.sharpness*.45+v.exposure*.2+v.coverage*.2+v.confidence*.15});
                if (track.frames.length>4) track.frames.shift();
                const elapsed=frame.at-track.since;
                if (!track.recognized && elapsed>=500) { track.recognized=true;events.push({type:'vehicle_recognized',mode:'walk',trackId:id,at:frame.at}); }
                if (!track.requested && elapsed>=500 && track.frames.length>=2 && frame.at-this.lastCapture>=2000) {
                    const selected=track.frames.slice().sort((a,b)=>b.score-a.score).slice(0,2).map(item=>item.frameId);
                    events.push({type:'capture_request',mode:'walk',trackId:id,at:frame.at,since:track.since,frameIds:selected,review:'before_upload'});
                    track.requested=true;
                }
            }
            for (const id of this.walk.keys()) if (!seen.has(id)) this.walk.delete(id);
        }
        driveStep(frame,events) {
            if (frame.roadDetectorValidated!==true || frame.thermalPaused===true) { this.drive.clear();this.driveFrames=[];return; }
            this.driveFrames.push(frame.frameId);if (this.driveFrames.length>10)this.driveFrames.shift();
            for (const [key,at] of this.drive) if (frame.at-at>=1800000)this.drive.delete(key);
            for (const v of frame.vehicles) {
                if (!validId(v?.eventId) || v.visible!==true || v.occluded!==false || !hazards.has(v.hazard) || v.stoppedEvidence!==true
                    || !finite01(v.confidence) || v.confidence<.8 || !finite01(v.relationConfidence) || v.relationConfidence<.8
                    || this.drive.has(v.eventId) || this.drive.size>=64 || frame.at-this.lastCapture<2000) continue;
                events.push({type:'capture_request',mode:'drive',eventId:v.eventId,hazard:v.hazard,at:frame.at,
                    frameIds:this.driveFrames.slice(-10),review:'after_stopping',classification:'candidate'});
            }
        }
        acknowledge(event) {
            if (!this.pending.has(event) || !event || event.type!=='capture_request' || event.mode!==this.mode || event.at!==this.last || event.at-this.lastCapture<2000) return false;
            if (event.mode==='walk') {
                const track=this.walk.get(event.trackId);
                if (!track || track.since!==event.since || !Array.isArray(event.frameIds) || event.frameIds.length<1 || event.frameIds.length>2) return false;
            } else {
                if (!hazards.has(event.hazard) || !validId(event.eventId) || this.drive.has(event.eventId) || this.drive.size>=64) return false;
                this.drive.set(event.eventId,event.at);
            }
            this.pending.delete(event);this.lastCapture=event.at;return true;
        }
    }
    root.MachimamoObservationPolicy=ObservationPolicy;
    root.MachimamoThermalPolicy=ThermalPolicy;
})(typeof window !== 'undefined' ? window : globalThis);
