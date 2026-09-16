(function (root) {
    'use strict';
    // Informational only. No checkout, affiliate tracking or premium entitlement is active.
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="cameraGuideDialog" aria-labelledby="cameraGuideTitle">
        <div class="camera-guide-header">
          <h2 id="cameraGuideTitle">カメラのQ&amp;A</h2>
          <button type="button" class="camera-guide-close" aria-label="Q&Aを閉じる" autofocus>×</button>
        </div>
        <div id="cameraGuideContent" class="camera-guide-content" tabindex="0" role="region" aria-label="カメラの説明">
          <p class="camera-guide-intro">無料で使える機能と、これから登場する有料版をご案内します。</p>
          <section class="camera-guide-section" aria-labelledby="cameraFreeTitle">
            <span class="camera-guide-tag">通常は無料版</span>
            <h3 id="cameraFreeTitle">無料カメラでできること</h3>
            <p><strong>現在使えるのは、カメラ映像の確認です。</strong>起動するだけで料金は発生しません。</p>
            <ul>
              <li>端末のカメラ映像を画面に表示します。</li>
              <li>現在は録画・写真保存・画像送信を行いません。</li>
              <li>終了や画面切り替えでカメラを停止します。</li>
            </ul>
            <details>
              <summary>無料版のAI機能は使える？</summary>
              <p>車両の検知・停止時間の計測・顔やナンバーのモザイクは開発予定です。現在はまだ使えません。</p>
              <p>無料版は端末内での処理を基本に開発します。対応する機種や性能は、検証後にご案内します。</p>
            </details>
            <details>
              <summary>カメラを使うときの注意は？</summary>
              <p>運転中は操作せず、安全な場所で停車してから操作してください。撮影のために車へ近づいたり、運転者へ声をかけたりしないでください。私有地や住宅内部などの不適切な撮影は禁止です。</p>
            </details>
          </section>
          <section class="camera-guide-section camera-guide-premium" aria-labelledby="cameraPremiumTitle">
            <span class="camera-guide-tag">有料版の場合・提供準備中</span>
            <h3 id="cameraPremiumTitle">AIカメラの新しい機能を体験しよう！</h3>
            <p class="camera-guide-price">月額150円</p>
            <p class="camera-guide-note">提供予定価格です。現在は申し込み・課金を開始していません。</p>
            <p><strong>無料版に加える機能の候補</strong></p>
            <ul>
              <li>撮影した危険候補の画像を、追加のAIでチェック。</li>
              <li>横断歩道や自転車の通行空間を塞いでいる可能性など、状況の説明を補助。</li>
              <li>顔・ナンバーの写り込みを追加チェックし、見落としの確認を補助。</li>
            </ul>
            <p class="camera-guide-note">上記は開発予定の候補です。正式な機能・対応端末・利用回数は、性能と費用を確認して公開します。無制限のAI解析ではありません。</p>
            <p class="camera-guide-note">AIは危険の見落としや誤判定があり、違法駐車を確定するものではありません。</p>
            <button type="button" class="camera-guide-button" disabled>月150円で解放する（準備中）</button>
          </section>
          <section class="camera-guide-section" aria-labelledby="cameraRewardTitle">
            <span class="camera-guide-tag">広告利用の特典・準備中</span>
            <h3 id="cameraRewardTitle">対象サービスの利用で<br>有料カメラを2か月解放</h3>
            <p>対象広告の条件を満たした方に、有料カメラの利用特典を提供する予定です。</p>
            <p class="camera-guide-note">無料になるのは、カメラの利用料です。広告先の契約・購入・年会費などが別途必要な場合があります。</p>
            <button id="cameraRewardButton" type="button" class="camera-guide-button" aria-expanded="false" aria-controls="cameraRewardOffers">無料で解放する（条件を見る）</button>
            <div id="cameraRewardOffers" class="camera-guide-offers" hidden>
              <p role="status"><strong>対象案件は準備中です</strong></p>
              <p>現在申し込める対象広告はありません。このボタンでは解放されません。</p>
              <ol>
                <li>対象広告の費用・成果条件・特典の開始時期を確認する。</li>
                <li>専用リンクから利用し、広告ごとの条件を満たす。</li>
                <li>成果承認と運営側の入金・特典準備が完了した後、2か月の利用を開始する。</li>
              </ol>
              <p class="camera-guide-note">登録だけでは条件を満たさない場合があります。審査や確認に時間がかかることがあります。開始日と終了日は解放時に表示します。</p>
              <p class="camera-guide-note">特典終了後に自動で有料契約へ切り替わることはありません。</p>
            </div>
          </section>
        </div>
        <div class="camera-guide-footer"><button id="cameraGuideTopButton" type="button" class="camera-guide-button" aria-controls="cameraGuideContent">▲ 一番上へ</button></div>
      </dialog>`);
    const dialog = document.getElementById('cameraGuideDialog');
    const trigger = document.getElementById('cameraHelpButton');
    const reward = document.getElementById('cameraRewardButton');
    const offers = document.getElementById('cameraRewardOffers');
    const content = document.getElementById('cameraGuideContent');
    const topButton = document.getElementById('cameraGuideTopButton');
    // Match the visible viewport in pre-zoom layout pixels, including the existing
    // iPhone desktop-view compensation. Header/footer never enter the scroll area.
    function fitViewport() {
        if (!dialog.open) return;
        const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
        const viewport = root.visualViewport;
        const width = (viewport ? viewport.width : root.innerWidth) / zoom;
        const height = (viewport ? viewport.height : root.innerHeight) / zoom;
        const inset = Math.min(12, width / 20, height / 20);
        const panelWidth = Math.min(580, width - inset * 2);
        dialog.style.width = panelWidth + 'px';
        dialog.style.height = Math.max(1, height - inset * 2) + 'px';
        dialog.style.left = ((viewport?.offsetLeft || 0) / zoom + (width - panelWidth) / 2) + 'px';
        dialog.style.top = ((viewport?.offsetTop || 0) / zoom + inset) + 'px';
    }
    const scrollBehavior = () => root.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    root.addEventListener('resize', fitViewport);
    root.visualViewport?.addEventListener('resize', fitViewport);
    root.visualViewport?.addEventListener('scroll', fitViewport);
    new MutationObserver(fitViewport).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    topButton.onclick = () => {
        content.scrollTo({ top: 0, behavior: scrollBehavior() });
        content.focus({ preventScroll: true });
    };
    function close() { if (dialog.open) dialog.close(); }
    root.MachimamoCameraGuide = {
        open() {
            if (dialog.open) return;
            offers.hidden = true;
            reward.setAttribute('aria-expanded', 'false');
            dialog.showModal();
            fitViewport();
            content.scrollTop = 0;
            trigger?.setAttribute('aria-expanded', 'true');
        },
        close
    };
    dialog.querySelector('.camera-guide-close').onclick = close;
    dialog.addEventListener('close', () => trigger?.setAttribute('aria-expanded', 'false'));
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    reward.onclick = () => {
        offers.hidden = !offers.hidden;
        reward.setAttribute('aria-expanded', String(!offers.hidden));
        if (!offers.hidden) {
            const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
            const top = content.scrollTop + (offers.getBoundingClientRect().top - content.getBoundingClientRect().top) / zoom;
            content.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior() });
        }
    };
})(window);
