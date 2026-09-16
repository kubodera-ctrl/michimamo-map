(function (root) {
    'use strict';
    function bounds(box, width, height) {
        if (!box || ![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.x < 0 || box.y < 0 || box.width <= 0 || box.height <= 0 || box.x + box.width > 1.001 || box.y + box.height > 1.001) throw new Error('invalid_region');
        const x = Math.max(0, Math.floor((box.x - box.width * .15) * width));
        const y = Math.max(0, Math.floor((box.y - box.height * .15) * height));
        return { x, y, width: Math.min(width - x, Math.ceil(box.width * 1.3 * width)), height: Math.min(height - y, Math.ceil(box.height * 1.3 * height)) };
    }
    function mount({ db, getPassword, submissionId, image, target, alive }) {
        const make = (tag, text) => { const el = document.createElement(tag); if (text) el.textContent = text; return el; };
        const panel = make('section'); panel.className = 'aed-image-ai';
        const status = make('p', 'AI事前チェック：未実施'); status.setAttribute('role', 'status'); status.className = 'aed-review-note';
        const info = make('p', 'AIは確認補助です。顔・ナンバーの見落としや位置のずれがあり得るため、必ず目視確認してください。'); info.className = 'aed-review-note';
        const run = make('button', 'AIで事前チェック'); run.type = 'button'; run.className = 'aed-review-button';
        const settings = make('button', 'AI接続状態を確認'); settings.type = 'button'; settings.className = 'aed-review-button';
        const preview = make('button', 'マスク画像を作成・確認'); preview.type = 'button'; preview.className = 'aed-review-button';
        const editor = make('div'); editor.hidden = true;
        const canvas = make('canvas'); canvas.style.cssText = 'width:100%;height:auto;touch-action:none;background:#e2e8f0';
        const hint = make('p', '画像をドラッグすると隠す範囲を追加できます。加工画像はこの画面で確認・保存するだけで、地図へは公開されません。'); hint.className = 'aed-review-note';
        const undo = make('button', '追加した範囲を1つ戻す'); undo.type = 'button'; undo.className = 'aed-review-button';
        const confirmLabel = make('label'); const checked = make('input'); checked.type = 'checkbox';
        confirmLabel.append(checked, make('span', '顔・ナンバーの見落としがないか加工画像を確認した'));
        const save = make('button', '加工画像を保存'); save.type = 'button'; save.disabled = true; save.className = 'aed-review-button';
        checked.onchange = () => { save.disabled = !checked.checked; };
        editor.append(hint, canvas, undo, confirmLabel, save);
        panel.append(make('h4', 'AI事前チェック・画像保護'), status, info, settings, run, preview, editor); target.append(panel);
        let result = null, busy = false, original = null, manual = [], start = null, previewVersion = 0;
        const labels = { likely: '候補あり', not_visible: '検出されず（見落としの可能性あり）', uncertain: '判断困難' };
        function display(value) {
            result = value;
            status.textContent = `AI参考結果：AED本体 ${labels[value.aed] || '未確認'} / 顔 ${labels[value.faces] || '未確認'} / ナンバー ${labels[value.plates] || '未確認'} / 画質 ${value.quality === 'usable' ? '確認可能の候補' : '不鮮明・要確認'}`;
            if (original) draw();
        }
        async function invoke(action) {
            if (busy || !alive()) return;
            const password = getPassword(); if (!password) return;
            if (action === 'analyze' && !root.confirm('AI事前チェックのため、この投稿写真をOpenAI APIへ送信します。最終判断は管理者が行います。実行しますか？')) return;
            busy = true; run.disabled = settings.disabled = true; status.textContent = 'AI接続を確認中…';
            try {
                const { data, error } = await db.functions.invoke('aed-image-check', { body: { action, password, submissionId } });
                if (!alive()) return;
                let body = data;
                if (error?.context?.json) { try { body = await error.context.json(); } catch (_) {} }
                if (!alive()) return;
                if (error || body?.error) {
                    const messages = { ai_not_configured: 'AIは未有効です。管理者がサーバーのAPIキーと有効化設定を確認してください。', ai_daily_limit: '本日のAI実行上限に達しました。目視審査は続けられます。', ai_retry_later: '実行中、または再試行待ちです。2分ほど待って再確認してください。', admin_validation_failed: '管理者権限または管理者パスワードを確認してください。' };
                    status.textContent = messages[body?.error] || 'AI判定に失敗しました。未判定として目視確認してください。'; return;
                }
                if (action === 'status') status.textContent = body.enabled && body.configured ? 'AI接続設定あり。実行ボタンから判定できます（接続成功・精度は実行時に確認）。' : 'AIは未有効です。管理者がサーバーのAPIキーと有効化設定を確認してください。';
                else if (body?.result) display(body.result);
            } catch (_) { if (alive()) status.textContent = 'AIへ接続できません。目視確認を続けてください。'; }
            finally { busy = false; if (alive()) run.disabled = settings.disabled = false; }
        }
        run.onclick = () => invoke('analyze'); settings.onclick = () => invoke('status');
        async function cached() {
            try {
                const { data, error } = await db.from('aed_image_checks').select('status,result').eq('submission_id', submissionId).maybeSingle();
                if (alive() && !busy && !error && data?.status === 'completed' && data.result) display(data.result);
            } catch (_) { /* Cache failure is not a successful AI check. */ }
        }
        function draw() {
            if (!original || !alive()) return;
            checked.checked = false; save.disabled = true;
            const context = canvas.getContext('2d'); context.drawImage(original, 0, 0, canvas.width, canvas.height);
            const regions = [...(Array.isArray(result?.regions) ? result.regions : []), ...manual];
            for (const region of regions) {
                const b = bounds(region, canvas.width, canvas.height);
                const small = document.createElement('canvas'); small.width = Math.max(1, Math.floor(b.width / 28)); small.height = Math.max(1, Math.floor(b.height / 28));
                small.getContext('2d').drawImage(original, b.x, b.y, b.width, b.height, 0, 0, small.width, small.height);
                context.imageSmoothingEnabled = false; context.drawImage(small, 0, 0, small.width, small.height, b.x, b.y, b.width, b.height);
            }
        }
        preview.onclick = async () => {
            const version = ++previewVersion;
            if (!image.src || image.hidden) { status.textContent = '先に投稿写真を読み込んでください。'; return; }
            preview.disabled = true;
            try {
                const loaded = new Image(); loaded.crossOrigin = 'anonymous'; loaded.referrerPolicy = 'no-referrer';
                await new Promise((resolve, reject) => { loaded.onload = resolve; loaded.onerror = reject; loaded.src = image.src; });
                if (!alive() || version !== previewVersion) return;
                original = loaded;
                const scale = Math.min(1, 1600 / Math.max(loaded.naturalWidth, loaded.naturalHeight));
                canvas.width = Math.round(loaded.naturalWidth * scale); canvas.height = Math.round(loaded.naturalHeight * scale);
                manual = []; draw(); editor.hidden = false;
                if (!result) status.textContent = 'AI未判定です。画像上で隠す範囲を手動追加してください。';
            } catch (_) { if (alive()) { editor.hidden = true; status.textContent = '加工画像を作れません。投稿写真を再取得してください。'; } }
            finally { if (alive()) preview.disabled = false; }
        };
        function point(event) { const rect = canvas.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }; }
        canvas.onpointerdown = event => { if (!original) return; start = point(event); canvas.setPointerCapture(event.pointerId); };
        canvas.onpointerup = event => {
            if (!start) return;
            const end = point(event), width = Math.abs(end.x - start.x), height = Math.abs(end.y - start.y);
            if (width > .002 && height > .002) manual.push({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width, height });
            start = null; draw();
        };
        canvas.onpointercancel = () => { start = null; };
        undo.onclick = () => { manual.pop(); draw(); };
        save.onclick = () => {
            if (!checked.checked || !alive()) return;
            try { canvas.toBlob(blob => {
                if (!blob || !alive()) return;
                const url = URL.createObjectURL(blob), link = make('a'); link.href = url; link.download = `aed-masked-${submissionId}.jpg`; link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }, 'image/jpeg', .9); } catch (_) { status.textContent = '加工画像を保存できません。写真を再取得してください。'; }
        };
        cached();
    }
    root.MachimamoAedImageAI = { mount, bounds };
})(typeof window !== 'undefined' ? window : globalThis);
