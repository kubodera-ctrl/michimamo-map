(function(root){
'use strict';
const view=document.getElementById('cameraView');
const video=document.getElementById('videoElement');
const shutter=document.getElementById('cameraShutter');
const controls=view?.querySelector('.camera-capture-controls');
const help=document.getElementById('cameraHelpButton');
if(!view||!video||!controls)return;

const layer=document.createElement('div');
layer.className='camera-scope-layer';
layer.setAttribute('aria-hidden','true');
view.insertBefore(layer,view.firstChild.nextSibling);
const counter=document.createElement('div');
counter.className='camera-detection-count';
counter.setAttribute('role','status');
counter.setAttribute('aria-live','polite');
counter.innerHTML='<span aria-hidden="true"></span>検知台数 0台';
view.appendChild(counter);

const oldNote=controls.querySelector('p');
const notice=document.createElement('div');
notice.className='camera-start-notice';
notice.innerHTML='<span>試験運用中です。走行中は画面を操作せず、確認は安全な場所に停車してから行ってください。</span><button type="button" aria-label="案内を閉じる">×</button>';
oldNote?.replaceWith(notice);
notice.querySelector('button').addEventListener('click',()=>{notice.hidden=true;});

if(shutter)shutter.textContent='手動撮影';
if(help){
  help.onclick=event=>{
    event.preventDefault();
    root.MachimamoCameraGuide?.open();
  };
}

let heat='normal';
function syncRunning(){
  const active=view.classList.contains('active');
  document.body.classList.toggle('camera-running',active);
  if(active){notice.hidden=false;}else{clearScopes();}
}
new MutationObserver(syncRunning).observe(view,{attributes:true,attributeFilter:['class']});
syncRunning();

function displayedVideoRect(sourceWidth,sourceHeight){
  const rect=video.getBoundingClientRect();
  if(!rect.width||!rect.height||!sourceWidth||!sourceHeight)return null;
  const scale=Math.max(rect.width/sourceWidth,rect.height/sourceHeight);
  const width=sourceWidth*scale,height=sourceHeight*scale;
  return {left:rect.left-view.getBoundingClientRect().left+(rect.width-width)/2,top:rect.top-view.getBoundingClientRect().top+(rect.height-height)/2,scale};
}
function renderScopes(items,sourceWidth,sourceHeight){
  if(!view.classList.contains('active'))return;
  const shown=(Array.isArray(items)?items:[]).slice(0,heat==='strong'?1:heat==='medium'?2:3);
  const fit=displayedVideoRect(sourceWidth,sourceHeight);
  if(!fit){clearScopes();return;}
  while(layer.children.length<shown.length){const box=document.createElement('div');box.className='camera-scope';layer.appendChild(box);}
  [...layer.children].forEach((box,index)=>{
    const item=shown[index];
    if(!item){box.hidden=true;return;}
    const [x,y,w,h]=item.bbox;
    box.hidden=false;box.dataset.state=item.state||'vehicle';
    box.style.transform=`translate3d(${fit.left+x*fit.scale}px,${fit.top+y*fit.scale}px,0)`;
    box.style.width=Math.max(24,w*fit.scale)+'px';box.style.height=Math.max(24,h*fit.scale)+'px';
  });
}
function clearScopes(){layer.replaceChildren();}
function setDetectionCount(value){
  const count=Math.max(0,Number(value)||0);
  counter.innerHTML=`<span aria-hidden="true"></span>検知台数 ${count}台`;
}
function setHeatMode(next){
  heat=['medium','strong'].includes(next)?next:'normal';
  document.body.classList.toggle('camera-heat-medium',heat==='medium');
  document.body.classList.toggle('camera-heat-strong',heat==='strong');
}
root.MachimamoCameraSafeUi={renderScopes,clearScopes,setDetectionCount,setHeatMode};
})(window);
