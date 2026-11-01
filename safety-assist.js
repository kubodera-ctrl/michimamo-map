/* Machimamo MAP original emergency assistance. Non-production candidate.
 * Never calls police, shares a location, posts, or records data automatically.
 * Sound and geolocation require direct user gestures; position is cleared on close.
 */
(function (root) {
  'use strict';
  function createSafetyAssist(doc, win) {
    if (!doc || !win) throw new Error('browser required');
    let overlay = null, alertText = null, message = null, buzzer = null, positionBtn = null, shareBtn = null;
    let audio = null, oscillator = null, timer = null, locationUrl = null, geoGeneration = 0, lastFocus = null;
    const $ = (tag, value, className) => {
      const node = doc.createElement(tag);
      if (typeof value === 'string') node.textContent = value;
      if (className) node.className = className;
      return node;
    };
    function status(value) { if (message) message.textContent = value; }
    function stopBuzzer() {
      if (timer !== null) { win.clearTimeout(timer); timer = null; }
      if (oscillator) { try { oscillator.stop(); } catch (_) {} oscillator = null; }
      if (audio) { try { const pending = audio.close(); if (pending && pending.catch) pending.catch(()=>{}); } catch (_) {} audio = null; }
      if (buzzer) { buzzer.textContent = 'ブザー音を鳴らす'; buzzer.setAttribute('aria-pressed','false'); }
    }
    function startBuzzer() {
      if (oscillator) { stopBuzzer(); status('ブザー音を停止しました。'); return; }
      const Audio = win.AudioContext || win.webkitAudioContext;
      if (typeof Audio !== 'function') { status('このブラウザでは音を鳴らせません。画面表示や110番への電話をご利用ください。'); return; }
      try {
        audio = new Audio();
        const gain = audio.createGain(), tone = audio.createOscillator(), at = audio.currentTime;
        tone.type = 'sine'; tone.frequency.value = 880;
        // Sound amplitude is bounded. Independent audio scheduling guarantees a
        // 30-second maximum even if background JS timers are suspended.
        gain.gain.setValueAtTime(0.001, at);
        for (let t = at; t < at + 29.4; t += 0.62) {
          gain.gain.setValueAtTime(0.075, t);
          gain.gain.setValueAtTime(0.001, Math.min(t + 0.34, at + 30));
        }
        gain.gain.setValueAtTime(0, at + 30);
        tone.connect(gain); gain.connect(audio.destination);
        tone.start(); tone.stop(at + 30);
        oscillator = tone;
        buzzer.textContent = 'ブザー音を停止'; buzzer.setAttribute('aria-pressed','true');
        status('ブザー作動中。端末の音量・消音設定により聞こえない場合があります。30秒後に自動停止します。');
        timer = win.setTimeout(()=>{stopBuzzer();status('ブザーの30秒間の再生を終了しました。');}, 30050);
        const res = audio.resume?.(); if (res && res.catch) res.catch(()=>{stopBuzzer();status('音を再生できませんでした。');});
      } catch (_) { stopBuzzer(); status('音の再生に失敗しました。画面表示や110番への電話をご利用ください。'); }
    }
    function showHelp(kind) {
      if (kind === 'train') alertText.textContent = 'ちかんです。助けてください。';
      else alertText.textContent = '助けてください。近くの方、110番へ連絡してください。';
      alertText.hidden = false;
      alertText.focus();
      status('画面表示は周囲に助けを求めるためのものです。警察への通報は自動では行いません。');
    }
    function clearLocation() {
      geoGeneration += 1;
      locationUrl = null;
      if (shareBtn) shareBtn.hidden = true;
      if (positionBtn) positionBtn.disabled = false;
    }
    function requestLocation() {
      // No prompt, geolocation or network access until the user presses the button.
      const geo = win.navigator && win.navigator.geolocation;
      if (!geo || typeof geo.getCurrentPosition !== 'function') { status('この端末では位置情報を取得できません。'); return; }
      const generation = ++geoGeneration;
      positionBtn.disabled = true;
      locationUrl = null;
      shareBtn.hidden = true;
      status('位置情報の許可を確認しています。現在地は自動送信されません。');
      try {
        geo.getCurrentPosition(
          p => {
            if (!overlay || overlay.hidden || generation !== geoGeneration) return;
            positionBtn.disabled = false;
            const lat = p?.coords?.latitude, lon = p?.coords?.longitude;
            if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) {
              status('位置情報の形式を確認できませんでした。');return;
            }
            locationUrl = 'https://www.google.com/maps?q='+lat.toFixed(5)+','+lon.toFixed(5);
            shareBtn.hidden = false;
            status('現在地を取得しました。次の「共有する」を押して送信先を選ぶまで、どこにも送信しません。');
          },
          () => { if (generation !== geoGeneration || !overlay || overlay.hidden) return; positionBtn.disabled = false; status('位置情報を取得できませんでした。端末の位置情報設定をご確認ください。'); },
          { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 }
        );
      } catch (_) {positionBtn.disabled = false;status('位置情報の取得に失敗しました。');}
    }
    async function shareLocation() {
      // An explicit second click is required: no background or auto sharing.
      if (!locationUrl || overlay.hidden) return;
      const current = locationUrl;
      const nav = win.navigator || {};
      if (typeof nav.share === 'function') {
        try {
          await nav.share({title:'まちまもMAP｜現在地の共有',text:'現在地を共有します。',url:current});
          if (!overlay.hidden) status('共有操作を終了しました。受信者への到達状況は確認できません。');
          return;
        } catch (e) { if (e && e.name === 'AbortError') {status('共有をキャンセルしました。');return;} }
      }
      if (typeof nav.clipboard?.writeText === 'function') {
        try {await nav.clipboard.writeText(current);if (!overlay.hidden)status('地図リンクをコピーしました。メッセージ等に貼り付けて送信してください。');return;}
        catch (_) {}
      }
      status('共有機能が使えません。端末の位置情報・共有設定を確認してください。');
    }
    function close() {
      if (!overlay) return;
      overlay.hidden = true;
      stopBuzzer(); clearLocation();
      if (alertText) alertText.hidden = true;
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
      lastFocus = null;
    }
    function mount() {
      if (overlay) return;
      overlay = $('section', undefined, 'mm-sos-backdrop');
      overlay.id = 'machimamoSafetyAssist'; overlay.hidden = true;
      overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','mmSosTitle');
      const panel = $('div', undefined, 'mm-sos-panel');
      const heading = $('div', undefined, 'mm-sos-header');
      const title = $('h2','まちまも｜緊急サポート');title.id='mmSosTitle';
      const closeBtn = $('button','閉じる');closeBtn.type='button';closeBtn.className='mm-sos-close';closeBtn.addEventListener('click',close);
      heading.append(title,closeBtn);
      const notice=$('p','緊急時は110番・119番を優先してください。この画面だけでは通報・位置送信されません。','mm-sos-notice');
      const help=$('button','助けてください（画面表示）','mm-sos-help');help.type='button';help.addEventListener('click',()=>showHelp('general'));
      const train=$('button','痴漢被害を周囲に知らせる','mm-sos-secondary');train.type='button';train.addEventListener('click',()=>showHelp('train'));
      alertText=$('p','', 'mm-sos-big-message');alertText.hidden=true;alertText.tabIndex=-1;
      buzzer=$('button','ブザー音を鳴らす','mm-sos-buzzer');buzzer.type='button';buzzer.setAttribute('aria-pressed','false');buzzer.addEventListener('click',startBuzzer);
      const callGroup=$('div',undefined,'mm-sos-calls');
      const call110=$('a','110番へ電話');call110.href='tel:110';call110.className='mm-sos-call';
      const call119=$('a','119番へ電話');call119.href='tel:119';call119.className='mm-sos-call mm-sos-call-alt';
      callGroup.append(call110,call119);
      positionBtn=$('button','現在地を確認','mm-sos-location');positionBtn.type='button';positionBtn.addEventListener('click',requestLocation);
      shareBtn=$('button','取得した現在地を共有する','mm-sos-share');shareBtn.type='button';shareBtn.hidden=true;shareBtn.addEventListener('click',shareLocation);
      const privacy=$('p','位置情報は操作した時だけ取得します。自動記録・自動送信・ポイント加算は行いません。','mm-sos-privacy');
      message=$('p','必要な機能を選んでください。','mm-sos-status');message.setAttribute('role','status');
      panel.append(heading,notice,help,train,alertText,buzzer,callGroup,positionBtn,shareBtn,privacy,message);
      overlay.append(panel);doc.body.append(overlay);
      overlay.addEventListener('keydown', e => {if(e.key==='Escape'){e.preventDefault();close();}});
      overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    }
    function open() {
      mount();lastFocus=doc.activeElement||null;overlay.hidden=false;
      status('必要な機能を選んでください。');
      const closeBtn=overlay.querySelector('.mm-sos-close');closeBtn?.focus?.();
    }
    return {open,close,getState:()=>({open:!!overlay&&!overlay.hidden,buzzerActive:!!oscillator,locationReady:!!locationUrl})};
  }
  const api={createSafetyAssist};
  if (typeof module==='object' && module.exports) module.exports=api;
  else root.MachimamoSafetyAssist=createSafetyAssist(root.document,root);
})(typeof window!=='undefined'?window:globalThis);
