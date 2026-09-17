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
                for(const track of this.tracks){if(used.has(track.id)||track.class!==detection.class)continue;const d=delta(track.point,detection.point,width,height);if(d<.34&&d<bestDistance){best=track;bestDistance=d;}}
                if(!best){best={id:this.nextId++,class:detection.class,point:detection.point,lastAt:at,hits:1,stableHits:0,transitHits:0,emittedAt:null,side:detection.side};this.tracks.push(best);used.add(best.id);continue;}
                used.add(best.id);const gap=at-best.lastAt,scale=Math.max(Math.abs(detection.point.w-best.point.w)/Math.max(best.point.w,1),Math.abs(detection.point.h-best.point.h)/Math.max(best.point.h,1));
                const stable=bestDistance<=.08&&scale<=.25&&gap<=2500;
                const fastTransit=bestDistance>.035&&bestDistance<=.34&&scale<=.9&&gap<=1400&&best.side&&detection.side;
                best.hits++;best.stableHits=stable?best.stableHits+1:0;best.transitHits=fastTransit?best.transitHits+1:0;best.point=detection.point;best.lastAt=at;best.side=detection.side;
                matched.push({track:best,detection,movement:bestDistance,scale,stable,fastTransit});
            }
            const surrounding=matched.length,stopped=matched.filter(x=>x.stable).length,stoppedRate=surrounding?stopped/surrounding:null;
            const central=matched.filter(x=>!x.detection.side),centralMoving=central.filter(x=>!x.stable).length;
            const egoSpeed=Number.isFinite(telemetry.egoSpeedKmh)?telemetry.egoSpeedKmh:null;
            for(const match of matched){
                if(!match.detection.side||(!match.track.stableHits&&!match.track.transitHits))continue;
                if(match.track.transitHits&&!match.track.stableHits&&!(egoSpeed!==null&&egoSpeed>=8))continue;
                let classification='indeterminate',reason='insufficient_flow_evidence';
                if(egoSpeed!==null&&egoSpeed<=5&&surrounding>=2&&stoppedRate>=.6){
                    classification=trafficLight?'signal_wait':'congestion';reason=trafficLight?'low_ego_group_stop_with_signal':'low_ego_group_stop';
                }else if(match.detection.brakeLightsLikely){
                    reason='paired_bright_brake_lights_suppressed';
                }else if(egoSpeed!==null&&egoSpeed>=8){
                    const roadsideScore=25+20+(match.fastTransit?20:0)+15+(central.length&&centralMoving/central.length>=.5?15:0);
                    if(roadsideScore>=60){classification='roadside';reason=match.fastTransit?'moving_ego_edge_vehicle_fast_transit':'moving_ego_edge_vehicle_repeated';}
                }
                const item={trackId:'drive-'+match.track.id,class:match.track.class,score:match.detection.score,bbox:match.detection.bbox,at,classification,reason,
                    egoSpeedKmh:egoSpeed,surroundingVehicles:surrounding,stoppedRate,trafficLight,brakeLightsLikely:!!match.detection.brakeLightsLikely};
                match.visual=item;
                if(match.track.emittedAt===null||at-match.track.emittedAt>=30000){match.track.emittedAt=at;item.justRecorded=true;newCandidates.push(item);}else duplicates.push(item);
            }
            let invalidExpired=0;
            this.tracks=this.tracks.filter(track=>{const keep=used.has(track.id)||at-track.lastAt<=4000;if(!keep&&track.emittedAt===null)invalidExpired++;return keep;});
            const visuals=matched.map(match=>{
                const item=match.visual;
                let state='vehicle';
                if(item?.classification==='roadside')state=item.justRecorded?'recorded':'roadside';
                else if(item?.classification==='signal_wait'||item?.classification==='congestion'||item?.brakeLightsLikely)state='traffic';
                else if(item?.classification==='indeterminate')state='indeterminate';
                return {bbox:match.detection.bbox,state};
            }).slice(0,3);
            return {roadsideDetections:detections.filter(x=>x.side).length,newCandidates,duplicates,visuals,invalidExpired,trafficLight,surroundingVehicles:surrounding,stoppedRate};
        }
    }

    function brakeLightsLikely(canvas,bbox){
        try{
            if(!canvas?.width||!canvas?.height||!Array.isArray(bbox)||bbox.length!==4)return false;
            const [bx,by,bw,bh]=bbox,x0=Math.max(0,Math.floor(bx)),y0=Math.max(0,Math.floor(by+bh*.2));
            const x1=Math.min(canvas.width,Math.ceil(bx+bw)),y1=Math.min(canvas.height,Math.ceil(by+bh*.72));
            if(x1-x0<10||y1-y0<6)return false;
            const pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(x0,y0,x1-x0,y1-y0).data,w=x1-x0;
            let left=0,right=0,leftTotal=0,rightTotal=0;
            for(let y=0;y<y1-y0;y+=2)for(let x=0;x<w;x+=2){
                const side=x/w<.45?'left':x/w>.55?'right':null;if(!side)continue;
                const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],brightRed=r>=210&&r>=g*1.55&&r>=b*1.35;
                if(side==='left'){leftTotal++;if(brightRed)left++;}else{rightTotal++;if(brightRed)right++;}
            }
            return left>=3&&right>=3&&left/Math.max(leftTotal,1)>=.012&&right/Math.max(rightTotal,1)>=.012;
        }catch(_){return false;}
    }
    let running=false,timer=null,model=null,core=new DriveDetectorCore(),canvas=null,lastLoop=0,startedAt=0;
    const log=()=>root.MachimamoDriveTestLog;
    const setStatus=text=>{const el=document.getElementById('cameraStatus');if(el)el.textContent=text;};
    const schedule=ms=>{clearTimeout(timer);if(running)timer=setTimeout(loop,ms);};
    function prepareFrame(source){
        try{
            if(!canvas)canvas=document.createElement('canvas');const scale=Math.min(1,256/source.videoWidth);canvas.width=Math.max(1,Math.round(source.videoWidth*scale));canvas.height=Math.max(1,Math.round(source.videoHeight*scale));
            canvas.getContext('2d',{alpha:false}).drawImage(source,0,0,canvas.width,canvas.height);
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
            const detector=await ensureModel();if(!running)return;const input=prepareFrame(video);let predictions=await detector.detect(input,20,.5);if(!running)return;
            predictions=predictions.map(item=>VEHICLES.has(item?.class)?{...item,brakeLightsLikely:brakeLightsLikely(input,item.bbox)}:item);
            const activeBefore=log()?.active(),location=activeBefore?.lastPosition||null;
            const result=core.process(predictions,input.width||video.videoWidth,input.height||video.videoHeight,Date.now(),{egoSpeedKmh:location?.speedKmh});
            root.MachimamoCameraSafeUi?.renderScopes(result.visuals,input.width||video.videoWidth,input.height||video.videoHeight);
            const candidates=result.newCandidates.length+result.duplicates.length;
            if(candidates)log()?.increment('candidates',candidates);
            if(result.newCandidates.length){
                log()?.increment('valid',result.newCandidates.length);
                const roadside=result.newCandidates.filter(x=>x.classification==='roadside').length;if(roadside)log()?.category('roadside_stop',roadside);
            }
            if(result.duplicates.length)log()?.increment('duplicate',result.duplicates.length);
            if(result.newCandidates.length){const thumb=await makeBlob(input);if(!thumb)log()?.increment('imageFailure');for(const item of result.newCandidates)await log()?.recordEvent({...item,duplicate:false,lat:location?.lat,lng:location?.lng},thumb);}
            if(result.invalidExpired)log()?.increment('invalid',result.invalidExpired);
            const active=log()?.active(),runMinutes=(Date.now()-startedAt)/60000,heatMode=runMinutes>=20?'strong':runMinutes>=12?'medium':'normal',heatLabel=runMinutes>=20?'・発熱抑制 強':runMinutes>=12?'・発熱抑制 中':'';
            root.MachimamoCameraSafeUi?.setHeatMode(heatMode);setStatus(active
                ? `車載・自動候補記録中 ${active.counters.candidates}件（重複含む）${heatLabel}／手動撮影は不要`
                : '車載・検出のみ／ログ保存なし。停車中に管理画面で「テスト開始」してください');
        }catch(error){log()?.increment('aiPaused');setStatus('車載MVP検出器を開始できません。通信と端末性能を確認してください。');running=false;return;}
        const elapsed=performance.now()-began;if(elapsed>900)log()?.increment('fpsDrop');lastLoop=elapsed;
        const currentSession=log()?.active(),speed=currentSession?.lastPosition?.speedKmh,runMs=Date.now()-startedAt;
        let target=Number.isFinite(speed)&&speed<=5?2500:Number.isFinite(speed)&&speed>=8?650:1200;
        if(runMs>=20*60000)target=Math.max(target,2000);
        else if(runMs>=12*60000)target=Math.max(target,1000);
        if(elapsed>1800)target=Math.max(target,3000);
        schedule(Math.max(100,target-elapsed));
    }
    async function start(video){if(running)return true;if(!video)return false;running=true;startedAt=Date.now();core.reset();setStatus('車載MVP第2版を準備中…');schedule(0);return true;}
    function stop(){running=false;clearTimeout(timer);timer=null;core.reset();root.MachimamoCameraSafeUi?.clearScopes();root.MachimamoCameraSafeUi?.setHeatMode('normal');if(canvas){canvas.width=canvas.height=1;}}
    root.MachimamoDriveDetectorCore=DriveDetectorCore;
    root.MachimamoBrakeLightHeuristic=brakeLightsLikely;
    root.MachimamoDriveMvp={start,stop,isRunning:()=>running,lastInferenceMs:()=>lastLoop};
})(typeof window!=='undefined'?window:globalThis);
