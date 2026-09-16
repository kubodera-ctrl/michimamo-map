(function(root){
    'use strict';
    const VEHICLES=new Set(['car','truck','bus','motorcycle']);
    const center=box=>({x:box[0]+box[2]/2,y:box[1]+box[3]/2,w:box[2],h:box[3]});
    const delta=(a,b,w,h)=>Math.hypot((a.x-b.x)/w,(a.y-b.y)/h);
    class DriveDetectorCore{
        constructor(){this.tracks=[];this.nextId=1;}
        reset(){this.tracks=[];this.nextId=1;}
        process(predictions,width,height,at,telemetry={}){
            const all=Array.isArray(predictions)?predictions:[],trafficLight=all.some(p=>p?.class==='traffic light'&&p.score>=.45);
            const detections=all.filter(p=>VEHICLES.has(p?.class)&&Number.isFinite(p.score)&&p.score>=.5&&Array.isArray(p.bbox)&&p.bbox.length===4)
                .map(p=>{const point=center(p.bbox),area=point.w*point.h/(width*height);return {...p,point,side:point.x/width<.4||point.x/width>.6,area};})
                .filter(p=>(p.point.y+p.point.h/2)/height>.38&&p.area>=.006&&p.area<=.65);
            const used=new Set(),matched=[],newCandidates=[],duplicates=[];
            for(const detection of detections){
                let best=null,bestDistance=Infinity;
                for(const track of this.tracks){if(used.has(track.id)||track.class!==detection.class)continue;const d=delta(track.point,detection.point,width,height);if(d<.14&&d<bestDistance){best=track;bestDistance=d;}}
                if(!best){best={id:this.nextId++,class:detection.class,point:detection.point,lastAt:at,hits:1,stableHits:0,emittedAt:null,side:detection.side};this.tracks.push(best);used.add(best.id);continue;}
                used.add(best.id);const scale=Math.max(Math.abs(detection.point.w-best.point.w)/Math.max(best.point.w,1),Math.abs(detection.point.h-best.point.h)/Math.max(best.point.h,1));
                const stable=bestDistance<=.08&&scale<=.25&&at-best.lastAt<=2500;
                best.hits++;best.stableHits=stable?best.stableHits+1:0;best.point=detection.point;best.lastAt=at;best.side=detection.side;
                matched.push({track:best,detection,movement:bestDistance,scale,stable});
            }
            const surrounding=matched.length,stopped=matched.filter(x=>x.stable).length,stoppedRate=surrounding?stopped/surrounding:null;
            const central=matched.filter(x=>!x.detection.side),centralMoving=central.filter(x=>!x.stable).length;
            const egoSpeed=Number.isFinite(telemetry.egoSpeedKmh)?telemetry.egoSpeedKmh:null;
            for(const match of matched){
                if(!match.detection.side||match.track.stableHits<1)continue;
                let classification='indeterminate',reason='insufficient_flow_evidence';
                if(egoSpeed!==null&&egoSpeed<=5&&surrounding>=2&&stoppedRate>=.6){
                    classification=trafficLight?'signal_wait':'congestion';reason=trafficLight?'low_ego_group_stop_with_signal':'low_ego_group_stop';
                }else if(egoSpeed!==null&&egoSpeed>=8&&central.length>=1&&centralMoving/central.length>=.5){
                    classification='roadside';reason='ego_and_central_traffic_flowing_edge_target_stable';
                }
                const item={trackId:'drive-'+match.track.id,class:match.track.class,score:match.detection.score,bbox:match.detection.bbox,at,classification,reason,
                    egoSpeedKmh:egoSpeed,surroundingVehicles:surrounding,stoppedRate,trafficLight};
                if(match.track.emittedAt===null||at-match.track.emittedAt>=30000){match.track.emittedAt=at;newCandidates.push(item);}else duplicates.push(item);
            }
            let invalidExpired=0;
            this.tracks=this.tracks.filter(track=>{const keep=used.has(track.id)||at-track.lastAt<=4000;if(!keep&&track.emittedAt===null)invalidExpired++;return keep;});
            return {roadsideDetections:detections.filter(x=>x.side).length,newCandidates,duplicates,invalidExpired,trafficLight,surroundingVehicles:surrounding,stoppedRate};
        }
    }

    let running=false,timer=null,model=null,core=new DriveDetectorCore(),canvas=null,ring=[],lastLoop=0;
    const log=()=>root.MachimamoDriveTestLog;
    const setStatus=text=>{const el=document.getElementById('cameraStatus');if(el)el.textContent=text;};
    const schedule=ms=>{clearTimeout(timer);if(running)timer=setTimeout(loop,ms);};
    function retainFrame(source){
        try{
            if(!canvas)canvas=document.createElement('canvas');const scale=Math.min(1,320/source.videoWidth);canvas.width=Math.max(1,Math.round(source.videoWidth*scale));canvas.height=Math.max(1,Math.round(source.videoHeight*scale));
            canvas.getContext('2d',{alpha:false}).drawImage(source,0,0,canvas.width,canvas.height);
            canvas.toBlob(blob=>{if(!running||!blob)return;ring.push({at:Date.now(),blob});log()?.bytes('temporary',blob.size);while(ring.length>10)ring.shift();},'image/jpeg',.55);
            return canvas;
        }catch(_){log()?.increment('ringFailure');return source;}
    }
    const makeBlob=source=>new Promise(resolve=>{try{source.toBlob(blob=>resolve(blob||null),'image/jpeg',.55);}catch(_){resolve(null);}});
    const loadScript=(id,src,ready)=>new Promise((resolve,reject)=>{
        if(ready())return resolve();const existing=document.getElementById(id);if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
        const script=document.createElement('script');script.id=id;script.src=src;script.crossOrigin='anonymous';script.onload=resolve;script.onerror=()=>reject(Error('detector_library_unavailable'));document.head.append(script);
    });
    async function ensureModel(){
        if(model)return model;
        await loadScript('machimamoTfjs','https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',()=>!!root.tf);
        await loadScript('machimamoCocoSsd','https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js',()=>!!root.cocoSsd);
        if(!root.tf||!root.cocoSsd)throw Error('detector_library_unavailable');
        // iOS 26 has known external-texture orientation issues on WebGPU. Prefer the
        // established WebGL path for this measured MVP and fall back to CPU.
        try{await root.tf.setBackend('webgl');await root.tf.ready();}catch(_){await root.tf.setBackend('cpu');await root.tf.ready();}
        model=await root.cocoSsd.load({base:'lite_mobilenet_v2'});return model;
    }
    async function loop(){
        if(!running)return;const video=document.getElementById('videoElement');if(!video||video.readyState<2||document.hidden){schedule(1500);return;}
        const began=performance.now();
        try{
            const detector=await ensureModel();if(!running)return;const input=retainFrame(video);const predictions=await detector.detect(input,20,.5);if(!running)return;
            const activeBefore=log()?.active(),location=activeBefore?.lastPosition||null;
            const result=core.process(predictions,input.width||video.videoWidth,input.height||video.videoHeight,Date.now(),{egoSpeedKmh:location?.speedKmh});
            const candidates=result.newCandidates.length+result.duplicates.length;
            if(candidates)log()?.increment('candidates',candidates);
            if(result.newCandidates.length){
                log()?.increment('valid',result.newCandidates.length);
                const roadside=result.newCandidates.filter(x=>x.classification==='roadside').length;if(roadside)log()?.category('roadside_stop',roadside);
            }
            if(result.duplicates.length)log()?.increment('duplicate',result.duplicates.length);
            if(candidates){const thumb=await makeBlob(input);if(!thumb)log()?.increment('imageFailure');for(const item of result.newCandidates)await log()?.recordEvent({...item,duplicate:false,lat:location?.lat,lng:location?.lng},thumb);for(const item of result.duplicates)await log()?.recordEvent({...item,duplicate:true,lat:location?.lat,lng:location?.lng},thumb);}
            if(result.invalidExpired)log()?.increment('invalid',result.invalidExpired);
            const active=log()?.active();setStatus(`車載MVP検知中・候補 ${active?.counters?.candidates||0}件（約1fps）`);
        }catch(error){log()?.increment('aiPaused');setStatus('車載MVP検出器を開始できません。通信と端末性能を確認してください。');running=false;return;}
        const elapsed=performance.now()-began;if(elapsed>900)log()?.increment('fpsDrop');lastLoop=elapsed;
        schedule(elapsed>1800?3000:Math.max(250,1000-elapsed));
    }
    async function start(video){if(running)return true;if(!video)return false;running=true;core.reset();ring=[];setStatus('車載MVP検出器を準備中…');schedule(0);return true;}
    function stop(){running=false;clearTimeout(timer);timer=null;core.reset();ring=[];if(canvas){canvas.width=canvas.height=1;}}
    root.MachimamoDriveDetectorCore=DriveDetectorCore;
    root.MachimamoDriveMvp={start,stop,isRunning:()=>running,lastInferenceMs:()=>lastLoop};
})(typeof window!=='undefined'?window:globalThis);
