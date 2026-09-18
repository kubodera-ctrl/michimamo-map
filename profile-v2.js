(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.MachimamoProfileV2 = api;
    api.install(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const ADJECTIVES = ['青空','元気','ゆる','晴れ','森の','星空','にこ','すくすく'];
  const ANIMALS = ['ラッコ','クマ','パンダ','ネコ','リス','ウサギ','コアラ','カワウソ'];
  const EMOJIS = ['🐾','🐶','🐱','🐰','🐻','🐼','🦦','🐨','🐿️','🦊','🐧','🦉'];
  const LEGACY_NAME = '名無しドライバー';

  function pick(list, random) {
    return list[Math.floor(random() * list.length) % list.length];
  }

  function generateGuestName(random = Math.random) {
    const adjective = pick(ADJECTIVES, random);
    const animal = pick(ANIMALS, random);
    const number = 1 + Math.floor(random() * 99);
    return Array.from(adjective + animal + number).slice(0, 8).join('');
  }

  function normalizeName(value) {
    return Array.from(String(value || '').trim()).slice(0, 10).join('');
  }

  function isImageAvatar(value) {
    return typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('image:'));
  }

  function install(win) {
    if (!win.document || !win.localStorage || !win.MachimamoProfileState) return;
    const doc = win.document;
    const state = win.MachimamoProfileState;
    const originalLoad = win.loadAuthenticatedProfile;

    function ensureGuestDefaults() {
      let name = win.localStorage.getItem('michimamo_name') || '';
      let avatar = win.localStorage.getItem('michimamo_avatar') || '';
      if (!name || name === LEGACY_NAME) {
        name = generateGuestName();
        win.localStorage.setItem('michimamo_name', name);
      }
      if (!avatar || avatar === '👤') {
        avatar = pick(EMOJIS, Math.random);
        win.localStorage.setItem('michimamo_avatar', avatar);
      }
      state.apply({ name, avatar });
    }

    function avatarUrl(value) {
      if (!value) return null;
      if (value.startsWith('data:image/')) return value;
      if (value.startsWith('image:')) {
        const path = value.slice(6);
        return win.db.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl;
      }
      return null;
    }

    function renderAvatar(el, value) {
      if (!el) return;
      const url = avatarUrl(value);
      el.replaceChildren();
      if (url) {
        const img = doc.createElement('img');
        img.src = url;
        img.alt = '';
        img.decoding = 'async';
        el.appendChild(img);
      } else {
        el.textContent = value || '🐾';
      }
    }

    function mountProfileCard() {
      const row = doc.querySelector('#activityTab .profile-edit');
      if (!row || row.dataset.profileV2 === 'true') return;
      row.dataset.profileV2 = 'true';
      row.innerHTML =
        '<div class="profile-v2-avatar-wrap">' +
          '<div class="avatar-circle" id="myAvatarDisplay" aria-hidden="true"></div>' +
          '<button type="button" class="profile-v2-edit" onclick="MachimamoProfileV2.openEditor()">編集</button>' +
        '</div>' +
        '<div class="profile-v2-name-wrap">' +
          '<div class="profile-v2-name" id="myNameDisplay"></div>' +
          '<input type="hidden" id="myNameInput">' +
        '</div>';
      refresh();
    }

    function refresh() {
      const current = state.snapshot();
      const input = doc.getElementById('myNameInput');
      const name = doc.getElementById('myNameDisplay');
      if (input) input.value = current.name || '';
      if (name) name.textContent = current.name || generateGuestName();
      renderAvatar(doc.getElementById('myAvatarDisplay'), current.avatar);
    }

    function ensureModal() {
      if (doc.getElementById('profileV2Modal')) return;
      const modal = doc.createElement('div');
      modal.id = 'profileV2Modal';
      modal.className = 'modal profile-v2-modal';
      modal.innerHTML =
        '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="profileV2Title">' +
          '<div class="row"><div id="profileV2Title" class="profile-v2-title">プロフィールを編集</div>' +
          '<button type="button" class="close" data-profile-close aria-label="閉じる"><i class="fa-solid fa-xmark"></i></button></div>' +
          '<div id="profileV2Body"></div>' +
        '</div>';
      modal.addEventListener('click', function (event) {
        if (event.target === modal || event.target.closest('[data-profile-close]')) closeModal();
      });
      doc.body.appendChild(modal);
    }

    function showBody(title, html) {
      ensureModal();
      doc.getElementById('profileV2Title').textContent = title;
      doc.getElementById('profileV2Body').innerHTML = html;
      doc.getElementById('profileV2Modal').classList.add('open');
    }

    function closeModal() {
      doc.getElementById('profileV2Modal')?.classList.remove('open');
    }

    function openEditor() {
      showBody('プロフィールを編集',
        '<button type="button" class="profile-v2-choice" onclick="MachimamoProfileV2.openAvatarEditor()">アイコンを編集<i class="fa-solid fa-chevron-right"></i></button>' +
        '<button type="button" class="profile-v2-choice" onclick="MachimamoProfileV2.openNameEditor()">ニックネームを編集<i class="fa-solid fa-chevron-right"></i></button>');
    }

    function openNameEditor() {
      const value = state.snapshot().name || '';
      showBody('ニックネームを編集',
        '<label for="profileV2Name">ニックネーム（最大10文字）</label>' +
        '<input id="profileV2Name" maxlength="10" value="' + escapeHtml(value) + '" autocomplete="nickname">' +
        '<button type="button" class="primary" onclick="MachimamoProfileV2.commitName()">決定</button>');
      doc.getElementById('profileV2Name')?.focus();
    }

    function openAvatarEditor() {
      showBody('アイコンを編集',
        '<label class="profile-v2-photo"><input id="profileV2Photo" type="file" accept="image/*">写真から選ぶ</label>' +
        '<div class="profile-v2-divider">または</div><div id="profileV2EmojiGrid" class="emoji-grid"></div>');
      const grid = doc.getElementById('profileV2EmojiGrid');
      EMOJIS.forEach(function (emoji) {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'emoji-item';
        button.textContent = emoji;
        button.addEventListener('click', function () { commitAvatar(emoji); });
        grid.appendChild(button);
      });
      doc.getElementById('profileV2Photo').addEventListener('change', choosePhoto);
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, function (char) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char];
      });
    }

    async function confirmGuestSave(afterSave) {
      if (state.authId()) return afterSave();
      showBody('この端末に保存します',
        '<p>LINE未認証のため、プロフィールはこの端末に保存されます。</p>' +
        '<ul class="profile-v2-benefits"><li>別端末でもプロフィールを共有</li><li>ポイントを貯める</li><li>ポイント交換</li></ul>' +
        '<button type="button" id="profileV2LocalSave" class="primary">このまま保存</button>' +
        '<button type="button" id="profileV2LineSave" class="profile-v2-line">LINE認証する</button>');
      doc.getElementById('profileV2LocalSave').onclick = function () { afterSave(); closeModal(); };
      doc.getElementById('profileV2LineSave').onclick = function () { afterSave(); win.signInWithLine(); };
    }

    async function saveAuthenticated(patch) {
      const result = await state.persist(patch);
      state.apply({
        id: result.id,
        name: result.name,
        point: Number(result.point || 0),
        avatar: result.avatar
      });
      refresh();
    }

    function hasNgWord(value) {
      return ['ちんちん','うんこ','バカ','アホ','死ね','クソ','殺す','うざい','カス','マンコ']
        .some(function (word) { return value.includes(word); });
    }

    async function commitName() {
      const value = normalizeName(doc.getElementById('profileV2Name')?.value);
      if (!value) return win.showToast('ニックネームを入力してください');
      if (hasNgWord(value)) return win.showToast('使用できない言葉が含まれています');
      const previous = state.snapshot();
      const apply = async function () {
        state.apply({ name: value });
        refresh();
        if (state.authId()) {
          try { await saveAuthenticated({ name: value }); win.showToast('プロフィールを保存しました'); }
          catch (error) { console.error(error); state.apply(previous); refresh(); win.showToast('保存に失敗しました'); }
        } else {
          win.showToast('この端末に保存しました');
        }
        closeModal();
      };
      if (state.authId()) await apply(); else confirmGuestSave(apply);
    }

    async function commitAvatar(value) {
      const previous = state.snapshot();
      const apply = async function () {
        state.apply({ avatar: value });
        refresh();
        if (state.authId()) {
          try { await saveAuthenticated({ avatar: value }); win.showToast('アイコンを保存しました'); }
          catch (error) { console.error(error); state.apply(previous); refresh(); win.showToast('保存に失敗しました'); }
        } else {
          win.showToast('この端末に保存しました');
        }
        closeModal();
      };
      if (state.authId()) await apply(); else confirmGuestSave(apply);
    }

    function loadImageElement(file) {
      return new Promise(function (resolve, reject) {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = function () {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error('image_decode_failed'));
        };
        image.src = url;
      });
    }

    function canvasToBlob(canvas, type, quality) {
      return new Promise(function (resolve) {
        canvas.toBlob(resolve, type, quality);
      });
    }

    async function compressImage(file) {
      let source;
      let release = function () {};
      try {
        if (typeof win.createImageBitmap === 'function') {
          source = await win.createImageBitmap(file);
          release = function () { source.close?.(); };
        } else {
          source = await loadImageElement(file);
        }
      } catch (bitmapError) {
        source = await loadImageElement(file);
      }

      const width = source.naturalWidth || source.width;
      const height = source.naturalHeight || source.height;
      if (!width || !height) {
        release();
        throw new Error('image_size_invalid');
      }
      const size = Math.min(width, height);
      const canvas = doc.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        release();
        throw new Error('canvas_unavailable');
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      ctx.drawImage(source, (width - size) / 2, (height - size) / 2, size, size, 0, 0, 256, 256);
      release();

      for (const quality of [0.82,0.72,0.62,0.52,0.42]) {
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        if (blob && (blob.size <= 51200 || quality === 0.42)) {
          return { blob: blob, extension: 'jpg', contentType: 'image/jpeg' };
        }
      }
      throw new Error('image_compression_failed');
    }

    function blobToDataUrl(blob) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    async function uploadAvatar(image) {
      const uid = state.authId();
      if (!uid) return null;
      const blob = image.blob || image;
      const extension = image.extension || 'jpg';
      const contentType = image.contentType || blob.type || 'image/jpeg';
      const path = uid + '/avatar.' + extension;
      const result = await win.db.storage.from('profile-avatars').upload(path, blob, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: true
      });
      if (result.error) throw result.error;
      await saveAuthenticated({ avatar: 'image:' + path });
      return 'image:' + path;
    }

    async function choosePhoto(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.type && !file.type.startsWith('image/')) return win.showToast('写真ファイルを選んでください');
      try {
        const image = await compressImage(file);
        if (image.blob.size > 262144) throw new Error('image_too_large');
        if (state.authId()) {
          await uploadAvatar(image);
          refresh();
          closeModal();
          win.showToast('アイコンを保存しました');
        } else {
          const dataUrl = await blobToDataUrl(image.blob);
          confirmGuestSave(async function () {
            state.apply({ avatar: dataUrl });
            refresh();
            closeModal();
            win.showToast('この端末に保存しました');
          });
        }
      } catch (error) {
        console.error(error);
        win.showToast('写真を処理できませんでした');
      }
    }

    async function promoteGuestIfNeeded() {
      const current = state.snapshot();
      const guestName = normalizeName(current.name) || generateGuestName();
      const guestAvatar = isImageAvatar(current.avatar) ? '🐾' : (current.avatar || '🐾');
      const response = await win.db.rpc('promote_guest_profile', {
        p_name: guestName,
        p_avatar: guestAvatar
      });
      if (response.error) throw response.error;
      const profile = response.data?.[0];
      if (!profile) throw new Error('profile_not_found');
      state.apply({ id: profile.id, name: profile.name, point: Number(profile.point || 0), avatar: profile.avatar });
      if (current.avatar?.startsWith('data:image/')) {
        const blob = await (await fetch(current.avatar)).blob();
        await uploadAvatar({ blob: blob, extension: 'jpg', contentType: blob.type || 'image/jpeg' });
      }
      refresh();
      return true;
    }

    async function loadAuthenticatedProfileV2() {
      try {
        const response = await win.db.rpc('get_my_profile');
        if (response.error) throw response.error;
        if (Array.isArray(response.data) && response.data.length) {
          const profile = response.data[0];
          state.apply({ id: profile.id, name: profile.name, point: Number(profile.point || 0), avatar: profile.avatar || '🐾' });
          refresh();
          win.loadQuizStampStatus?.();
          return true;
        }
        return await promoteGuestIfNeeded();
      } catch (error) {
        console.error('Profile v2 restore failed', error);
        if (typeof originalLoad === 'function') return originalLoad();
        return false;
      }
    }

    const originalUpdate = win.updateMyPage;
    win.updateMyPage = function () {
      if (typeof originalUpdate === 'function') originalUpdate();
      mountProfileCard();
      refresh();
    };
    win.loadAuthenticatedProfile = loadAuthenticatedProfileV2;
    win.openAvatarModal = openEditor;

    ensureGuestDefaults();
    doc.addEventListener('DOMContentLoaded', function () {
      ensureModal();
      mountProfileCard();
      refresh();
    });

    Object.assign(api, {
      openEditor, openNameEditor, openAvatarEditor, commitName, commitAvatar,
      closeModal, loadAuthenticatedProfile: loadAuthenticatedProfileV2
    });
  }

  const api = { generateGuestName, normalizeName, isImageAvatar, install };
  return api;
});
