(function () {
  'use strict';
  // Chống nhúng khung (clickjacking): GitHub Pages không gửi được header
  // Content-Security-Policy, và frame-ancestors trong <meta> bị bỏ qua.
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
    try { window.top.location.href = window.location.href; } catch (_) { /* cross-origin: trang vẫn ẩn */ }
    return;
  }
  const cfg = window.HIMO_CONFIG || {};
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- hai thứ tiếng
  // Khoá dịch CHÍNH LÀ câu tiếng Việt: thiếu bản tiếng Anh thì hiện tiếng Việt,
  // hỏng theo hướng đọc được chứ không thành ô trống. Nội dung của người dùng
  // (tên, giới thiệu, bài, bình luận) KHÔNG bao giờ đi qua đây.
  const EN = window.HIMO_EN || {};
  let lang = 'vi';
  try { lang = localStorage.getItem('himo-admin-lang') || (/^en/i.test(navigator.language || '') ? 'en' : 'vi'); } catch (e) { /* trình duyệt chặn */ }
  const t = (s) => (lang === 'en' ? (EN[s] || s) : s);
  /** Nhãn đi kèm con số: tiếng Anh cần dạng số ít khi n = 1.
   *  Từ điển EN1 chỉ chứa những nhãn thật sự đứng cạnh một con số. */
  const EN1 = window.HIMO_EN1 || {};
  const dem = (n, vi) => (lang === 'en' && Number(n) === 1 ? (EN1[vi] || EN[vi] || vi) : t(vi));
  function datNgonNgu(l) {
    lang = l === 'en' ? 'en' : 'vi';
    try { localStorage.setItem('himo-admin-lang', lang); } catch (e) { /* bỏ qua */ }
    document.documentElement.lang = lang;
    veTuDien();
    veLoiNhayCam();
    veNgonNgu();
    veManDangNhap();                 // nhãn tĩnh: "Quản trị", "Đăng xuất", tiêu đề tab
    if (!$('#app').hidden) render();
  }
  function veNgonNgu() {
    ['#langSw', '#langSw2'].forEach((sel) => {
      const el = $(sel); if (!el) return;
      el.innerHTML = ['vi', 'en'].map((l) => `<button class="lang${l === lang ? ' on' : ''}" data-lang="${l}" aria-label="${l === 'vi' ? 'Tiếng Việt' : 'English'}">${l.toUpperCase()}</button>`).join('');
      el.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => datNgonNgu(b.dataset.lang)));
    });
  }
  /** Nhãn tĩnh của màn đăng nhập và tiêu đề trang. */
  function veManDangNhap() {
    const dat = (sel, chu) => { const e = $(sel); if (e) e.textContent = chu; };
    dat('#lgBrand', t('Quản trị'));
    dat('#appBrand', t('Quản trị'));
    dat('#lgHint', t('Chỉ tài khoản quản trị viên mới vào được. Mọi thao tác đều được ghi lại.'));
    dat('#lgPw', t('Mật khẩu'));
    dat('#loginBtn', t('Đăng nhập'));
    dat('#lgForgot', t('Quên mật khẩu?'));
    dat('#logout', t('Đăng xuất'));
    const f = $('#freshness'); if (f) f.title = t('Trang tự làm mới mỗi phút');
    document.title = t('Quản trị') + ' · HIMO';
  }
  const locale = () => (lang === 'en' ? 'en-GB' : 'vi-VN');
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
    document.body.innerHTML = `<div class="login"><div class="card"><h2>${t('Chưa cấu hình')}</h2><p class="hint">${t('Thiếu config.js (SUPABASE_URL, SUPABASE_ANON_KEY) hoặc không tải được thư viện. Kiểm tra mạng rồi tải lại trang.')}</p></div></div>`;
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    // sessionStorage chứ không phải localStorage: phiên quản trị chỉ sống trong
    // đúng thẻ trình duyệt này, đóng thẻ là mất. Đổi lại phải đăng nhập lại mỗi
    // lần mở — đúng mức thận trọng cho một trang xem được dữ liệu người dùng.
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'himo-admin',
            storage: (function(){ try { window.sessionStorage.setItem('himo-test','1'); window.sessionStorage.removeItem('himo-test'); return window.sessionStorage; } catch (e) { return undefined; } })() },
  });

  // ---------------------------------------------------------------- tiện ích
  const REASON = {}, KIND = {}, RSTATUS = {}, MOD = {}, ACTION = {};
  function veTuDien() {
    Object.assign(REASON, { fake: `${t('Giả mạo')}`, harassment: `${t('Quấy rối')}`, underage: `${t('Dưới 18 tuổi')}`, scam: `${t('Lừa đảo')}`, inappropriate: `${t('Nội dung phản cảm')}`, other: `${t('Khác')}` });
    Object.assign(KIND, { profile: `${t('Hồ sơ')}`, post: `${t('Bài đăng')}`, comment: `${t('Bình luận')}`, message: `${t('Tin nhắn')}`, album: `${t('Ảnh album')}`, unknown: `${t('Không rõ (báo cáo cũ)')}`, user: `${t('Tài khoản')}`, none: '—' });
    Object.assign(RSTATUS, { open: `${t('Đang mở')}`, reviewed: `${t('Đã xem')}`, actioned: `${t('Đã xử lý')}`, all: `${t('Tất cả')}` });
    Object.assign(MOD, { active: `${t('Bình thường')}`, suspended: `${t('Tạm khoá')}`, banned: `${t('Khoá vĩnh viễn')}` });
    Object.assign(ACTION, {
    'report:dismiss': `${t('Bỏ qua báo cáo')}`, 'report:remove': `${t('Gỡ nội dung')}`, 'report:warn': `${t('Gỡ + cảnh cáo')}`, 'report:suspend': `${t('Gỡ + tạm khoá')}`,
    'report:ban': `${t('Gỡ + khoá vĩnh viễn')}`, 'report:delete': `${t('Gỡ + xoá tài khoản')}`, warn: `${t('Cảnh cáo')}`, 'status:active': `${t('Mở khoá')}`,
    'status:suspended': `${t('Tạm khoá')}`, 'status:banned': `${t('Khoá vĩnh viễn')}`, delete: `${t('Xoá tài khoản')}`, 'photo:approved': `${t('Duyệt ảnh')}`, 'photo:rejected': `${t('Từ chối ảnh')}`,
      'content:an': `${t('Gỡ nội dung công khai')}`, 'content:tra_lai': `${t('Trả lại nội dung')}`,
      // 065 — xem nội dung riêng, đổi vai trò, can thiệp thanh toán (đều ghi nhật ký)
      ADMIN_VIEW_PRIVATE_ALBUM: `${t('Xem album riêng')}`, ADMIN_VIEW_CHAT_MEDIA: `${t('Xem ảnh trong chat')}`,
      ADMIN_VIEW_MEDIA: `${t('Xem ảnh')}`, ADMIN_VIEW_CONVERSATION: `${t('Xem hội thoại')}`,
      ADMIN_LIST_CONVERSATIONS: `${t('Xem danh sách hội thoại')}`, ADMIN_VIEW_REPORT: `${t('Mở báo cáo')}`,
      ADMIN_VIEW_USER: `${t('Mở hồ sơ người dùng')}`, ADMIN_ROLE_CHANGE: `${t('Đổi vai trò quản trị')}`,
      'billing:promo_grant': `${t('Tặng HIMO Plus (thủ công)')}`, 'billing:promo_revoke': `${t('Thu hồi HIMO Plus đã tặng')}`,
    });
    Object.assign(KIND, { conversation: `${t('Hội thoại')}`, promo: `${t('Ưu đãi')}`, admin: `${t('Quản trị viên')}`, report: `${t('Báo cáo')}`, chat: `${t('Ảnh chat')}`, media: `${t('Ảnh')}` });
  }
  veTuDien();

  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return lang === 'en'
      ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  /** Chỉ ngày, không giờ. Chuỗi "YYYY-MM-DD" phải đọc theo giờ địa phương,
   *  vì new Date("2026-01-15") là nửa đêm UTC — ở múi giờ âm sẽ lùi một ngày. */
  const fmtNgay = (ts) => {
    if (!ts) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ts));
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const ago = (ts) => {
    if (!ts) return '';
    const s = (Date.now() - new Date(ts).getTime()) / 1000;
    if (isNaN(s)) return '';
    if (s < 60) return `${t('vừa xong')}`;
    if (s < 3600) return `${Math.floor(s / 60)} ${t('phút trước')}`;
    if (s < 86400) return `${Math.floor(s / 3600)} ${t('giờ trước')}`;
    if (s < 86400 * 14) return `${Math.floor(s / 86400)} ${t('ngày trước')}`;
    return fmtNgay(ts);
  };
  const hoursOpen = (ts) => Math.floor((Date.now() - new Date(ts).getTime()) / 3600000);
  const friendly = (e) => {
    const m = (e && e.message) || String(e);
    if (/unavailable/i.test(m)) return `${t('Không có quyền làm việc này (tài khoản không phải quản trị viên?).')}`;
    if (/Invalid login credentials/i.test(m)) return `${t('Email hoặc mật khẩu không đúng.')}`;
    if (/user_banned|banned/i.test(m)) return `${t('Tài khoản này đang bị khoá.')}`;
    if (/Failed to fetch|NetworkError|network/i.test(m)) return `${t('Không kết nối được. Kiểm tra mạng.')}`;
    if (/invalid input syntax|does not exist|uuid/i.test(m)) return `${t('Địa chỉ không hợp lệ. Quay lại danh sách và thử lại.')}`;
    return m.length > 160 ? `${t('Có lỗi xảy ra. Thử lại sau.')}` : m;
  };
  let toastTimer;
  function toast(msg, err) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, err ? 5000 : 2600);
  }
  async function rpc(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    if (error) throw error;
    return data;
  }
  // Ảnh: URL có chữ ký 10 phút, ưu tiên bản thu nhỏ; ảnh cũ chưa có bản nhỏ thì lấy bản lớn.
  const urlCache = new Map();
  const thumbOf = (p) => p.replace(/(\.[A-Za-z0-9]+)$/, '_t$1');
  async function photoUrl(path, thumb) {
    if (!path) return null;
    const key = (thumb ? 't:' : 'f:') + path;
    const c = urlCache.get(key); if (c && c.exp > Date.now()) return c.url;
    const tryPath = async (p) => { const { data, error } = await sb.storage.from('photos').createSignedUrl(p, 600); return error ? null : data.signedUrl; };
    let url = thumb ? await tryPath(thumbOf(path)) : null;
    if (!url) url = await tryPath(path);
    if (url) {
      if (urlCache.size > 400) {   // dọn mục hết hạn, đừng để phình mãi
        const gio = Date.now();
        urlCache.forEach((v, k) => { if (v.exp <= gio) urlCache.delete(k); });
      }
      urlCache.set(key, { url, exp: Date.now() + 8 * 60 * 1000 });
    }
    return url;
  }
  /** Gắn ảnh vào các <img data-photo> sau khi render (không chặn việc vẽ danh sách). */
  function hydratePhotos(root) {
    (root || document).querySelectorAll('img[data-photo]').forEach(async (img) => {
      const p = img.getAttribute('data-photo'); const full = img.hasAttribute('data-full');
      img.removeAttribute('data-photo');
      let u = null;
      try { u = await photoUrl(p, !full); } catch (e) { u = null; }
      if (u) {
        img.style.opacity = '1'; img.src = u;
        img.addEventListener('error', () => { img.replaceWith(khungAnhHong()); }, { once: true });
      } else {
        img.replaceWith(khungAnhHong());
      }
    });
  }
  /** Xem ảnh to: bấm vào bất kỳ ảnh nào có class "zoom". */
  async function xemAnhTo(path) {
    const u = await photoUrl(path, false);
    if (!u) return;
    $('#lbImg').src = u; $('#lightbox').hidden = false;
  }
  function dongAnhTo() { $('#lightbox').hidden = true; $('#lbImg').removeAttribute('src'); }
  $('#lightbox').addEventListener('click', (e) => { if (e.target.id !== 'lbImg') dongAnhTo(); });
  $('#lbClose').addEventListener('click', dongAnhTo);
  /** Gắn sự kiện phóng to cho mọi ảnh có data-zoom. */
  function noiXemAnh(root) {
    (root || document).querySelectorAll('[data-zoom]').forEach((img) => {
      const pth = img.getAttribute('data-zoom'); img.removeAttribute('data-zoom');
      img.classList.add('zoom');
      img.addEventListener('click', (e) => { e.stopPropagation(); xemAnhTo(pth); });
    });
  }

  /** Ảnh không tải được thì thay bằng một ô có dấu, đừng để trống trơn. */
  function khungAnhHong() {
    const e = document.createElement('span');
    e.className = 'anh-hong'; e.title = t('Không tải được ảnh');
    e.textContent = '⃠';
    return e;
  }
  const avatar = (path, name, round) => path
    ? `<span class="av${round ? ' round' : ''}"><img data-photo="${esc(path)}" alt="" style="opacity:0;transition:opacity .2s"></span>`
    : `<span class="av${round ? ' round' : ''}">${esc((name || '?').trim().charAt(0).toUpperCase())}</span>`;
  const modTag = (st, until) => st === 'suspended' ? `<span class="tag warn">${t('Tạm khoá')}${until ? ` ${t('tới')} ` + fmtNgay(until) : ''}</span>`
    : st === 'banned' ? `<span class="tag danger">${t('Khoá vĩnh viễn')}</span>` : '';

  // ---------------------------------------------------------------- hộp thoại
  function modal(html, onMount) {
    const m = $('#modal'); m.innerHTML = html; $('#modalScrim').hidden = false;
    if (onMount) onMount(m);
    const first = m.querySelector('textarea, input'); if (first) first.focus();
  }
  let modalHuy = null;   // gọi khi hộp thoại đóng mà chưa ai bấm nút nào
  function modalRong(html, onMount) { $('#modal').classList.add('rong'); modal(html, onMount); }
  function closeModal() {
    $('#modalScrim').hidden = true; $('#modal').innerHTML = ''; $('#modal').classList.remove('rong');
    const h = modalHuy; modalHuy = null; if (h) h();
  }
  $('#modalScrim').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (!$('#lightbox').hidden) return dongAnhTo(); closeModal(); });

  /** Hỏi xác nhận kèm ghi chú (và số ngày nếu cần). resolve(null) khi huỷ. */
  function confirmAction({ title, text, noteLabel, notePlaceholder, days, danger, okLabel, xoaFile }) {
    return new Promise((resolve) => {
      modal(`
        <h2>${esc(title)}</h2>
        <p>${esc(text)}</p>
        ${xoaFile ? `<label class="hint" style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><input type="checkbox" id="mXoaFile" style="min-height:auto"> ${t('Xoá luôn ảnh khỏi kho — không trả lại được')}</label>` : ''}
        ${days ? `<label class="hint" style="display:block;margin-bottom:8px">${t('Số ngày')} <input class="text" id="mDays" type="number" min="1" max="365" value="${days}" style="width:90px;display:inline-block;margin-left:6px"></label>` : ''}
        <label class="hint" for="mNote">${esc(noteLabel || `${t('Ghi chú (nội bộ)')}`)}</label>
        <textarea class="note" id="mNote" placeholder="${esc(notePlaceholder || '')}"></textarea>
        <div class="row" style="justify-content:flex-end;margin-top:12px">
          <button class="btn ghost" id="mCancel">${t('Huỷ')}</button>
          <button class="btn ${danger ? 'danger fill' : 'primary'}" id="mOk">${esc(okLabel || `${t('Xác nhận')}`)}</button>
        </div>`, (m) => {
        modalHuy = () => resolve(null);      // Esc hoặc bấm nền cũng coi như Huỷ
        $('#mCancel', m).onclick = () => { closeModal(); };
        $('#mOk', m).onclick = () => {
          modalHuy = null;
          const note = $('#mNote', m).value.trim();
          const d = days ? Math.max(1, Math.min(365, Number($('#mDays', m).value) || days)) : null;
          const xf = xoaFile ? !!($('#mXoaFile', m) || {}).checked : false;
          closeModal(); resolve({ note, days: d, xoaFile: xf });
        };
      });
    });
  }

  // ---------------------------------------------------------------- xác thực hai lớp (065)
  //
  // Máy chủ quyết định: is_admin() đòi aal2 khi tài khoản đã bật hai lớp (047),
  // và mọi lần xem nội dung riêng đòi aal2 (065, admin_settings.mfa_required_sensitive).
  // Trang này chỉ giúp đăng ký và nhập mã — ẩn nút không phải là bảo vệ.
  async function canXacThuc() {
    try { const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel(); return !!data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'; }
    catch (e) { return false; }
  }
  function hoiMa(title, text, extra) {
    return new Promise((resolve) => {
      modal(`<h2>${esc(title)}</h2><p>${esc(text)}</p>${extra || ''}
        <input class="text" id="mCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="font-size:20px;letter-spacing:4px;text-align:center">
        <div class="row" style="justify-content:flex-end;margin-top:12px">
          <button class="btn ghost" id="mCancel">${t('Huỷ')}</button><button class="btn primary" id="mOk">${t('Xác nhận')}</button></div>`, (m) => {
        modalHuy = () => resolve(null);
        $('#mCancel', m).onclick = () => closeModal();
        const ok = () => { const v = $('#mCode', m).value.replace(/\D/g, ''); if (v.length !== 6) return; modalHuy = null; closeModal(); resolve(v); };
        $('#mOk', m).onclick = ok;
        $('#mCode', m).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
      });
    });
  }
  /** Nâng phiên hiện tại lên aal2 bằng yếu tố TOTP đã xác minh. */
  async function xacThucHaiLop() {
    const { data } = await sb.auth.mfa.listFactors();
    const f = ((data && data.totp) || []).find((x) => x.status === 'verified');
    if (!f) return false;
    for (let lan = 0; lan < 3; lan++) {
      const code = await hoiMa(t('Xác thực hai lớp'), t('Nhập mã 6 số trong ứng dụng xác thực của bạn.'));
      if (!code) return false;
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code });
      if (!error) return true;
      toast(t('Mã không đúng hoặc đã hết hạn. Thử lại.'), true);
    }
    return false;
  }
  /** Đăng ký TOTP cho tài khoản quản trị đang đăng nhập. */
  async function batHaiLop() {
    const { data: ds } = await sb.auth.mfa.listFactors();
    for (const f of ((ds && ds.all) || []).filter((x) => x.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'HIMO admin ' + new Date().toISOString().slice(0, 16) });
    if (error) throw error;
    const qr = String(data.totp.qr_code || '');
    const qrSrc = qr.startsWith('data:') ? qr : 'data:image/svg+xml;utf-8,' + encodeURIComponent(qr);
    const code = await hoiMa(t('Bật xác thực hai lớp'),
      t('Quét mã QR bằng Google Authenticator, 1Password hoặc ứng dụng tương tự, rồi nhập mã 6 số. Nên thêm cùng mã này vào một ứng dụng thứ hai để dự phòng.'),
      `<div style="text-align:center"><img src="${esc(qrSrc)}" alt="QR" style="width:200px;height:200px;background:#fff;padding:8px;border-radius:8px"></div>
       <p class="hint" style="word-break:break-all">${t('Hoặc nhập khoá')}: <code>${esc(data.totp.secret || '')}</code></p>`);
    if (!code) { await sb.auth.mfa.unenroll({ factorId: data.id }); return false; }
    const { error: e2 } = await sb.auth.mfa.challengeAndVerify({ factorId: data.id, code });
    if (e2) { await sb.auth.mfa.unenroll({ factorId: data.id }); throw e2; }
    return true;
  }

  // ---------------------------------------------------------------- nội dung riêng (065)
  //
  // Quản trị viên được xem MỌI nội dung khi cần (quyết định của chủ dự án), nhưng
  // mỗi lần mở phải có lý do, phải là phiên aal2, và máy chủ ghi nhật ký TRƯỚC khi
  // trả dữ liệu hoặc cấp quyền đọc ảnh (admin_mo_anh). Trang này không tự quyết gì.
  const LOI_NHAY_CAM = {};
  function veLoiNhayCam() {
    Object.assign(LOI_NHAY_CAM, {
      mfa_required: `${t('Cần xác thực hai lớp. Vào Hệ thống → Vận hành để bật.')}`,
      reason_required: `${t('Cần ghi lý do (ít nhất 3 ký tự).')}`,
      forbidden: `${t('Vai trò của bạn không có quyền này.')}`,
      not_found: `${t('Không tìm thấy.')}`, bad_request: `${t('Yêu cầu không hợp lệ.')}`,
    });
  }
  veLoiNhayCam();
  async function hoiLyDo(title) {
    const ans = await confirmAction({ title, text: t('Ghi lý do (số báo cáo, mã hỗ trợ, vụ việc). Lý do và việc mở được lưu vào nhật ký quản trị, không sửa hay xoá được.'),
      noteLabel: t('Lý do (bắt buộc)'), okLabel: t('Mở') });
    if (!ans) return null;
    if (ans.note.length < 3) { toast(LOI_NHAY_CAM.reason_required, true); return null; }
    return ans.note;
  }
  /** Gọi một RPC nhạy cảm; gặp mfa_required thì mời nhập mã rồi gọi lại một lần. */
  async function goiNhayCam(name, args) {
    let d = await rpc(name, args);
    if (d && d.error === 'mfa_required') {
      if (await canXacThuc()) { if (await xacThucHaiLop()) d = await rpc(name, args); }
      else {
        // Đã aal2 mà máy chủ vẫn từ chối: yếu tố chưa được chủ dự án duyệt (065, admin_mfa_duyet).
        try { const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
          if (data && data.currentLevel === 'aal2') { toast(t('Yếu tố xác thực hai lớp của bạn chưa được chủ dự án duyệt. Nhờ chủ dự án duyệt rồi thử lại.'), true); return null; } } catch (e) { /* bỏ qua */ }
      }
    }
    if (d && d.error) { toast(LOI_NHAY_CAM[d.error] || d.error, true); return null; }
    return d;
  }
  /** Xin quyền đọc ảnh riêng (ghi nhật ký) rồi lấy URL có chữ ký. */
  async function moAnhRieng(paths, lyDo) {
    const d = await goiNhayCam('admin_mo_anh', { p_paths: paths, p_reason: lyDo });
    if (!d) return {};
    const out = {};
    for (const pth of paths) { urlCache.delete('f:' + pth); urlCache.delete('t:' + pth); out[pth] = await photoUrl(pth, false); }
    return out;
  }
  async function xemHoiThoai(u) {
    const lyDo = await hoiLyDo(`${t('Hội thoại của')} ${u.display_name || ''}`); if (!lyDo) return;
    const d = await goiNhayCam('admin_hoi_thoai_cua', { p_user: u.id, p_reason: lyDo }); if (!d) return;
    const ds = d.conversations || [];
    modalRong(`<h2>${t('Hội thoại của')} ${esc(u.display_name || '')}</h2>
      <p>${t('Đã ghi nhật ký. Bấm một hội thoại để đọc tin nhắn (ghi nhật ký thêm một lần).')}</p>
      <div class="stack" style="gap:6px">${ds.length ? ds.map((c) => `<button class="btn" data-conv="${esc(c.id)}" style="text-align:left">
        <b>${esc((c.people || []).map((x) => x.display_name || String(x.id).slice(0, 8)).join(', '))}</b>${c.kind === 'group' ? ` <span class="tag">${t('Nhóm')}${c.title ? ': ' + esc(c.title) : ''}</span>` : ''}
        <small>${so(c.messages)} ${t('tin')} · ${esc(c.last_message_at ? fmtDate(c.last_message_at) : '—')}</small></button>`).join('') : `<div class="empty">${t('Không có hội thoại nào.')}</div>`}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="mCancel">${t('Đóng')}</button></div>`, (m) => {
      $('#mCancel', m).onclick = () => closeModal();
      m.querySelectorAll('[data-conv]').forEach((b) => b.addEventListener('click', () => docHoiThoai(b.dataset.conv, lyDo)));
    });
  }
  async function docHoiThoai(convId, lyDo) {
    const d = await goiNhayCam('admin_xem_hoi_thoai', { p_conversation: convId, p_reason: lyDo, p_limit: 300 }); if (!d) return;
    const ms = d.messages || [];
    modalRong(`<h2>${t('Tin nhắn')}</h2><p>${t('Hiện tối đa 300 tin gần nhất. Tin đã thu hồi không còn nội dung trên máy chủ.')}</p>
      <div>${ms.length ? ms.map((x) => `<div class="msg"><span class="who">${esc(x.sender_name || String(x.sender_id).slice(0, 8))}</span><span class="when">${esc(fmtDate(x.created_at))}</span>
        ${x.recalled_at ? `<div class="body hint">${t('(đã thu hồi)')}</div>` : ''}
        ${x.body ? `<div class="body">${esc(x.body)}</div>` : ''}
        ${x.image_path ? `<div><button class="btn sm" data-anh="${esc(x.image_path)}">${t('Mở ảnh (ghi nhật ký)')}</button></div>` : ''}
        ${x.lat != null && x.lng != null ? `<div class="hint">📍 ${esc(Number(x.lat).toFixed(5))}, ${esc(Number(x.lng).toFixed(5))}</div>` : ''}</div>`).join('') : `<div class="empty">${t('Không có tin nhắn.')}</div>`}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="mCancel">${t('Đóng')}</button></div>`, (m) => {
      $('#mCancel', m).onclick = () => closeModal();
      m.querySelectorAll('[data-anh]').forEach((b) => b.addEventListener('click', async () => {
        const pth = b.dataset.anh; const urls = await moAnhRieng([pth], lyDo);
        if (urls[pth]) { const img = document.createElement('img'); img.className = 'anh-rieng'; img.src = urls[pth]; b.replaceWith(img); }
        else toast(t('Không tải được ảnh'), true);
      }));
    });
  }
  async function xemAlbumRieng(u) {
    const lyDo = await hoiLyDo(`${t('Album riêng của')} ${u.display_name || ''}`); if (!lyDo) return;
    const d = await goiNhayCam('admin_album_cua', { p_user: u.id, p_reason: lyDo }); if (!d) return;
    const ps = d.photos || []; const vs = d.viewers || [];
    modalRong(`<h2>${t('Album riêng của')} ${esc(u.display_name || '')}</h2>
      <p>${so(ps.length)} ${t('ảnh')} · ${t('đang mở cho')} ${so(vs.length)} ${t('người')}${vs.length ? ': ' + vs.map((v) => esc(v.display_name || '?')).join(', ') : ''}</p>
      ${ps.length ? `<button class="btn primary" id="mMoAnh">${t('Mở tất cả ảnh (ghi nhật ký từng ảnh)')}</button>` : ''}
      <div id="mAnh" style="margin-top:8px">${ps.map((x) => `<span class="anh-rieng" data-p="${esc(x.path)}" title="${esc(x.status)}"></span>`).join('')}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="mCancel">${t('Đóng')}</button></div>`, (m) => {
      $('#mCancel', m).onclick = () => closeModal();
      if ($('#mMoAnh', m)) $('#mMoAnh', m).onclick = async () => {
        $('#mMoAnh', m).disabled = true;
        const urls = await moAnhRieng(ps.map((x) => x.path).slice(0, 50), lyDo);
        m.querySelectorAll('[data-p]').forEach((sp) => { const u2 = urls[sp.dataset.p]; if (u2) { const img = document.createElement('img'); img.className = 'anh-rieng'; img.src = u2; sp.replaceWith(img); } });
      };
    });
  }
  async function theBaoMat() {
    let me = null; try { me = await rpc('admin_toi'); } catch (e) { me = null; }
    let mfa = false, aal = '';
    try { const { data } = await sb.auth.mfa.listFactors(); mfa = !!data && (data.totp || []).some((f) => f.status === 'verified'); } catch (e) { /* bỏ qua */ }
    try { const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel(); aal = data ? data.currentLevel : ''; } catch (e) { /* bỏ qua */ }
    const onOff = (v) => (v ? `<b>${t('bật')}</b>` : t('tắt'));
    return `
      ${!mfa ? `<div class="alertbar warn"><div><b>${t('Tài khoản này chưa bật xác thực hai lớp')}</b><br>${t('Album riêng, hội thoại, ảnh trong chat và chi tiết báo cáo chỉ mở được trong phiên đã xác thực hai lớp.')}</div></div>` : ''}
      <div class="card">
        <div class="sec"><h2>${t('Bảo mật tài khoản quản trị')}</h2></div>
        <dl class="kv">
          <dt>${t('Vai trò')}</dt><dd>${me ? esc(me.role || '—') : '—'}</dd>
          <dt>${t('Xác thực hai lớp')}</dt><dd>${mfa ? `<b>${t('đã bật')}</b>` : t('chưa bật')} · ${t('phiên này')}: ${esc(aal || '—')}</dd>
          ${me && mfa ? `<dt>${t('Chủ dự án đã duyệt yếu tố')}</dt><dd>${me.mfa_approved ? `<b>${t('có')}</b>` : `<b style="color:var(--danger)">${t('chưa')}</b> — ${t('nội dung riêng còn khoá tới khi được duyệt')}`}</dd>` : ''}
          ${me ? `<dt>${t('Bắt buộc cho nội dung riêng')}</dt><dd>${onOff(me.mfa_required_sensitive)}</dd>
          <dt>${t('Bắt buộc cho mọi việc quản trị')}</dt><dd>${onOff(me.mfa_required_all)}</dd>
          <dt>${t('Quyền')}</dt><dd>${esc((me.perms || []).join(', '))}</dd>` : ''}
        </dl>
        <div class="row" style="margin-top:8px;gap:8px">
          ${!mfa ? `<button class="btn primary" id="btnBatMfa">${t('Bật xác thực hai lớp')}</button>` : ''}
          ${mfa && aal !== 'aal2' ? `<button class="btn" id="btnXacThuc">${t('Xác thực phiên này')}</button>` : ''}
        </div>
        <div class="hint" style="margin-top:8px">${t('Mất điện thoại: quản trị viên chủ dự án xoá yếu tố cũ trong Supabase → Authentication → Users → MFA, rồi đăng ký lại ở đây.')}</div>
      </div>`;
  }
  function noiBaoMat(root) {
    const b1 = $('#btnBatMfa', root), b2 = $('#btnXacThuc', root);
    if (b1) b1.onclick = async () => { try { if (await batHaiLop()) { toast(t('Đã bật xác thực hai lớp.')); await render(); } } catch (e) { toast(friendly(e), true); } };
    if (b2) b2.onclick = async () => { if (await xacThucHaiLop()) { toast(t('Phiên đã được xác thực hai lớp.')); await render(); } };
  }

  // ---------------------------------------------------------------- trạng thái + định tuyến
  //
  // Địa chỉ có dạng #nhóm/mục/id — ví dụ #antoan/baocao/<id>, #nguoidung/<id>.
  // Mỗi nhóm là một mảng việc tách bạch, để lúc làm việc không phải nhìn thứ
  // không liên quan.
  const NHOM = [
    { k: 'tongquan',  ten: 'Tổng quan', subs: [] },
    { k: 'antoan',    ten: 'An toàn',   badge: 'badgeReports',
      subs: [['baocao', 'Báo cáo'], ['anh', 'Duyệt ảnh'], ['phat', 'Đang bị phạt'], ['taipham', 'Bị báo cáo nhiều lần']] },
    { k: 'nguoidung', ten: 'Người dùng', subs: [] },
    { k: 'noidung',   ten: 'Nội dung',
      subs: [['bai', 'Bài đăng'], ['binhluan', 'Bình luận']] },
    { k: 'solieu',    ten: 'Số liệu',
      subs: [['tangtruong', 'Tăng trưởng'], ['giuchan', 'Giữ chân'], ['khuvuc', 'Khu vực & ngôn ngữ'], ['nhucau', 'Nhu cầu trả phí']] },
    { k: 'hethong',   ten: 'Hệ thống',
      subs: [['vanhanh', 'Vận hành'], ['nhatky', 'Nhật ký']] },
  ];
  const nhomCua = (k) => NHOM.find((n) => n.k === k) || NHOM[0];

  const state = {
    nhom: 'tongquan', sub: '', id: null,
    // bộ lọc từng nhóm — giữ lại khi chuyển qua chuyển lại
    bc: { status: 'open', reason: 'all', kind: 'all', q: '', trang: 0 },
    anh: { status: 'pending' },
    nd: {
      bai:      { status: 'all', q: '', baoCao: false, trang: 0, tacGia: null },
      binhluan: { status: 'all', q: '', baoCao: false, trang: 0, tacGia: null },
    },
    ng: { q: '', status: 'all', country: 'all', hoatDong: 'all', sort: 'recent', trang: 0 },
    nk: { q: '', action: 'all', trang: 0 },
    solieu: { ngay: 30 },
    nuoc: null,
  };
  const TRANG = 30;

  function nav(route, id) {
    const h = '#' + route + (id ? '/' + id : '');
    if (location.hash !== h) location.hash = h; else render();
  }
  window.addEventListener('hashchange', render);
  function parseHash() {
    const [nhom, sub, id] = location.hash.replace(/^#/, '').split('/');
    state.nhom = NHOM.some((n) => n.k === nhom) ? nhom : 'tongquan';
    const g = nhomCua(state.nhom);
    state.sub = g.subs.length ? (g.subs.some(([k]) => k === sub) ? sub : g.subs[0][0]) : '';
    // Chỉ ba chỗ có khung chi tiết. Nhóm khác mà lỡ có phần id thừa trong địa chỉ
    // thì bỏ qua, nếu không tự làm mới sẽ tắt vĩnh viễn ở chính màn hình Tổng quan.
    const coChiTiet = state.nhom === 'nguoidung'
      || (state.nhom === 'antoan' && state.sub === 'baocao')
      || state.nhom === 'noidung';
    const tho = (g.subs.length ? id : sub) || null;
    // id phải là uuid, nếu không thì máy chủ trả lỗi Postgres thô
    state.id = (coChiTiet && tho && /^[0-9a-f-]{36}$/i.test(tho)) ? tho : null;
  }

  function veNav() {
    const g = nhomCua(state.nhom);
    $('#gnav').innerHTML = NHOM.map((n) => `<button class="tab" role="tab" data-nhom="${n.k}" aria-selected="${n.k === state.nhom}">${esc(t(n.ten))}${n.badge ? ` <span class="badge" id="${n.badge}" hidden></span>` : ''}</button>`).join('');
    $('#gnav').querySelectorAll('[data-nhom]').forEach((b) => b.addEventListener('click', () => nav(b.dataset.nhom)));
    const sn = $('#snav');
    sn.hidden = !g.subs.length;
    sn.innerHTML = g.subs.map(([k, l]) => `<button class="chip" data-sub="${k}" aria-pressed="${k === state.sub}">${esc(t(l))}</button>`).join('');
    sn.querySelectorAll('[data-sub]').forEach((b) => b.addEventListener('click', () => nav(state.nhom + '/' + b.dataset.sub)));
  }

  async function refreshBadges() {
    if ($('#app').hidden) return;
    try {
      const s = await rpc('admin_stats', { p_days: 1 });
      const r = $('#badgeReports');
      const n = (s.reports_open || 0) + (s.photos_pending || 0);
      if (r) { r.hidden = !(n > 0); r.textContent = n; }
    } catch (e) { /* im lặng */ }
  }

  /** Bộ khung chung: tiêu đề + phần thân, để mọi màn hình trông giống nhau. */
  const khung = (tieuDe, phu, than) => `<div class="stack" style="padding-top:14px">
    <div><h1>${esc(tieuDe)}</h1>${phu ? `<p class="sub">${phu}</p>` : ''}</div>${than}</div>`;
  const dangTai = '<div class="stack" style="padding-top:16px"><div class="skeleton"></div><div class="skeleton"></div></div>';
  const so = (n) => (n == null ? '—' : Number(n).toLocaleString(locale()));
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

  function pager(el, tong, trang, doiTrang) {
    if (tong == null) return;
    // Trang rỗng vì người khác vừa xử lý bớt: quay về trang đầu thay vì kẹt.
    if (tong === 0 && trang > 0) { doiTrang(0); return; }
    const het = (trang + 1) * TRANG >= tong;
    el.innerHTML = tong === 0 ? '' : `<button class="btn sm" ${trang === 0 ? 'disabled' : ''} id="pPrev">← ${t('Trước')}</button>
      <span>${trang * TRANG + 1}–${Math.min(tong, (trang + 1) * TRANG)} / ${so(tong)}</span>
      <button class="btn sm" ${het ? 'disabled' : ''} id="pNext">${t('Sau')} →</button>`;
    const pv = $('#pPrev', el); const nx = $('#pNext', el);
    if (pv) pv.onclick = () => { doiTrang(trang - 1); };
    if (nx) nx.onclick = () => { doiTrang(trang + 1); };
  }

  let luotVe = 0;
  async function render() {
    if ($('#app').hidden) return;          // đã đăng xuất thì đừng gọi máy chủ nữa
    const luot = ++luotVe;                 // lượt vẽ sau thắng lượt vẽ trước
    parseHash();
    veNav();
    const main = $('#main');
    try {
      if (state.nhom === 'tongquan') await renderTongQuan(main);
      else if (state.nhom === 'antoan') {
        if (state.sub === 'baocao') await renderReports(main);
        else if (state.sub === 'anh') await renderPhotos(main);
        else await renderAnToan(main);
      } else if (state.nhom === 'nguoidung') await renderUsers(main);
      else if (state.nhom === 'noidung') await renderNoiDung(main);
      else if (state.nhom === 'solieu') await renderSoLieu(main);
      else await renderHeThong(main);
      if (luot !== luotVe) return;        // đã có lượt vẽ mới hơn
      hydratePhotos(main);
    } catch (e) {
      if (luot !== luotVe) return;
      main.innerHTML = `<div class="empty">${esc(friendly(e))}<br><button class="btn sm" style="margin-top:10px" data-reload="1">${t('Tải lại')}</button></div>`;
    }
    refreshBadges();
    lastLoad = Date.now();
    showFreshness();
  }

  // ---------------------------------------------------------------- tự làm mới
  // Trang quản trị hay được mở sẵn cả ngày. Cứ mỗi phút tải lại số liệu, và tải
  // lại NGAY khi quay lại tab. Không tự tải lại khi: tab đang ẩn, đang mở hộp
  // thoại xác nhận, đang đọc chi tiết, hoặc con trỏ đang ở ô nhập.
  const AUTO_MS = 60_000;
  let lastLoad = 0, autoTimer = null, freshTimer = null, autoBusy = false;

  function showFreshness() {
    const el = $('#freshness'); if (!el || $('#app').hidden) return;
    const s = Math.round((Date.now() - lastLoad) / 1000);
    el.classList.toggle('busy', autoBusy);
    el.classList.toggle('stale', !autoBusy && s > 150);
    el.textContent = autoBusy ? `${t('đang tải…')}` : s < 75 ? `${t('mới cập nhật')}` : `${Math.round(s / 60)} ${t('phút trước')}`;
  }

  function canAuto() {
    if ($('#app').hidden || document.hidden) return false;
    if (!$('#modalScrim').hidden) return false;
    if (state.id) return false;
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return false;
    return true;
  }

  async function autoRefresh(force) {
    if (!force && !canAuto()) { showFreshness(); return; }
    if ($('#app').hidden || autoBusy) return;
    autoBusy = true; showFreshness();
    try { await render(); } catch (e) { /* im lặng, phút sau thử lại */ }
    finally { autoBusy = false; showFreshness(); }
  }

  // --- Tự đăng xuất khi bỏ mặc quá lâu ---------------------------------------
  // Máy chủ Supabase chỉ cho đặt "hết hạn vì không dùng" ở gói trả phí, nên trang
  // tự làm lấy: 30 phút không chạm vào là đăng xuất. Bỏ quên máy ở quán cà phê
  // thì phiên cũng đã đóng.
  const NGHI_MS = 30 * 60_000;
  let chamCuoi = Date.now();
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, () => { chamCuoi = Date.now(); }, { passive: true, capture: true }));
  async function kiemTraBoMac() {
    if (Date.now() - chamCuoi < NGHI_MS) return;
    clearInterval(autoTimer); autoTimer = null;
    clearInterval(freshTimer); freshTimer = null;
    try { await sb.auth.signOut(); } catch (e) {}
    location.hash = '';
    showLogin(t('Đã tự đăng xuất vì bạn không dùng trang trong 30 phút.'));
  }

  function startAuto() {
    clearInterval(autoTimer); clearInterval(freshTimer);
    chamCuoi = Date.now();
    autoTimer = setInterval(() => { autoRefresh(false); }, AUTO_MS);
    freshTimer = setInterval(() => { showFreshness(); kiemTraBoMac(); }, 15_000);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (Date.now() - lastLoad < 20_000) return;
    if (canAuto()) autoRefresh(true); else { refreshBadges(); showFreshness(); }
  });

  // ---------------------------------------------------------------- TỔNG QUAN
  // Một màn hình duy nhất trả lời: hôm nay có gì phải làm ngay, và app đang
  // lớn lên hay đứng yên. Bấm vào ô nào là nhảy thẳng vào nhóm đó.
  async function renderTongQuan(main) {
    main.innerHTML = dangTai;
    const [s, sf, g] = await Promise.all([
      rpc('admin_stats', { p_days: 14 }), rpc('admin_safety'), rpc('admin_growth', { p_days: 14 }),
    ]);
    const sla = sf.sla || {}; const hn = g.hom_nay || {};
    const canhBao = [];
    const choAnh = (sf.anh_cho || {});
    const tongAnh = (choAnh.ho_so || 0) + (choAnh.bai || 0) + (choAnh.album || 0);
    if (sla.qua_24h > 0) canhBao.push({ m: 'danger', t: `${sla.qua_24h} ${dem(sla.qua_24h, 'báo cáo đã quá 24 giờ')}`, p: `${t('Apple xem mốc 24 giờ là cam kết. Xử lý ngay.')}`, go: 'antoan/baocao' });
    else if (sla.tu_18_24h > 0) canhBao.push({ m: 'warn', t: `${sla.tu_18_24h} ${dem(sla.tu_18_24h, 'báo cáo sắp quá 24 giờ')}`, p: `${t('Còn dưới 6 tiếng để xử lý.')}`, go: 'antoan/baocao' });
    else if (s.reports_open > 0) canhBao.push({ m: 'warn', t: `${s.reports_open} ${dem(s.reports_open, 'báo cáo đang chờ')}`, p: sla.gio_lau_nhat != null ? `${t('Cái lâu nhất đã mở')} ${Math.round(sla.gio_lau_nhat)} ${t('giờ — còn trong hạn 24 giờ.')}` : '', go: 'antoan/baocao' });
    if (tongAnh > 0) canhBao.push({ m: 'warn', t: `${tongAnh} ${dem(tongAnh, 'ảnh đang chờ duyệt')}`, p: choAnh.gio_lau_nhat ? `${t('Cái lâu nhất đã chờ')} ${Math.round(choAnh.gio_lau_nhat)} ${t('giờ.')}` : '', go: 'antoan/anh' });
    if (!canhBao.length) canhBao.push({ m: 'ok', t: `${t('Không có việc gấp')}`, p: `${t('Mọi báo cáo đã đóng, hàng chờ ảnh trống.')}`, go: 'antoan/baocao' });

    const o = [
      { v: so(s.reports_open), l: dem(s.reports_open, 'báo cáo đang chờ'), alert: sla.qua_24h > 0, go: 'antoan/baocao' },
      { v: so(tongAnh), l: dem(tongAnh, 'ảnh chờ duyệt'), go: 'antoan/anh' },
      { v: so(hn.tong), l: dem(hn.tong, 'người dùng'), go: 'nguoidung' },
      { v: so(hn.dau), l: dem(hn.dau, 'hoạt động hôm nay'), go: 'solieu/tangtruong' },
      { v: so(hn.moi_7d), l: dem(hn.moi_7d, 'đăng ký 7 ngày qua'), go: 'solieu/tangtruong' },
      { v: so(s.messages_24h), l: dem(s.messages_24h, 'tin nhắn 24 giờ qua') },
      { v: so(s.posts_total), l: dem(s.posts_total, 'bài đã duyệt'), go: 'noidung/bai' },
      { v: so((s.suspended || 0) + (s.banned || 0)), l: `${t('đang bị khoá (')}${s.suspended} ${t('tạm ·')} ${s.banned} ${t('vĩnh viễn)')}`, go: 'antoan/phat' },
    ];
    const series = s.series || [];
    main.innerHTML = khung(`${t('Tổng quan')}`, `${t('Mọi thứ cần biết trong một màn hình. Bấm vào ô để đi thẳng tới nhóm việc.')}`, `
      ${canhBao.map((c) => `<div class="alertbar ${c.m}" data-go="${c.go}" style="cursor:pointer"><div><b>${esc(c.t)}</b>${c.p ? '<br>' + esc(c.p) : ''}</div></div>`).join('')}
      <div class="tiles">${o.map((t) => `<div class="tile${t.alert ? ' alert' : ''}" ${t.go ? `style="cursor:pointer" data-go="${t.go}"` : ''}><div class="v">${t.v}</div><div class="l">${esc(t.l)}</div></div>`).join('')}</div>
      <div class="charts">${bieuDo(series, 'signups', `${t('Đăng ký mới')}`)}${bieuDo(series, 'active', `${t('Người hoạt động')}`)}${bieuDo(series, 'messages', `${t('Tin nhắn')}`)}${bieuDo(series, 'posts', `${t('Bài đăng')}`)}${bieuDo(series, 'reports', `${t('Báo cáo')}`)}</div>
      <div class="hint">${t('Xử lý báo cáo trong 24 giờ là điều khoản dễ bị gỡ app nhất — xem quy trình ở')} <code>supabase/BAO-CAO.md</code>.</div>`);
    main.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => nav(el.dataset.go)));
  }

  /** Biểu đồ cột nhỏ dùng chung. */
  function bieuDo(series, key, title, nhan) {
    const vals = (series || []).map((d) => Number(d[key] || 0));
    const max = Math.max(1, ...vals);
    const tong = vals.reduce((a, b) => a + b, 0);
    return `<div class="chart"><h3>${esc(title)}</h3><div class="sum">${nhan || `${so(tong)} ${t('trong')} ${vals.length} ${t('ngày')}`}</div>
      <div class="bars" role="img" aria-label="${esc(title)} ${t('theo ngày')}">${(series || []).map((d, i) => `<i class="${vals[i] ? '' : 'zero'}" style="height:${vals[i] ? Math.max(4, Math.round(vals[i] / max * 100)) : 1}%"><b>${esc(String(d.day).slice(5).split('-').reverse().join('/'))}: ${vals[i]}</b></i>`).join('')}</div>
      <div class="axis"><span>${esc(String((series || [])[0] ? series[0].day : '').slice(5).split('-').reverse().join('/'))}</span><span>${t('hôm nay')}</span></div></div>`;
  }

  // ---------------------------------------------------------------- BÁO CÁO
  async function renderReports(main) {
    const f = state.bc;
    main.innerHTML = `<div class="cols${state.id ? '' : ' wide'}" id="repCols">
      <section>
        <div class="sec"><h2>${t('Báo cáo')}</h2><span class="hint" id="repTong"></span></div>
        <div class="filters" style="margin-bottom:10px">
          <select id="fStatus">${[['open', `${t('Đang mở')}`], ['reviewed', `${t('Đã xem')}`], ['actioned', `${t('Đã xử lý')}`], ['all', `${t('Mọi trạng thái')}`]].map(([k, l]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select id="fReason"><option value="all">${t('Mọi lý do')}</option>${Object.entries(REASON).map(([k, l]) => `<option value="${k}" ${f.reason === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select id="fKind"><option value="all">${t('Mọi loại')}</option>${['profile', 'post', 'comment', 'message', 'album', 'unknown'].map((k) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${KIND[k]}</option>`).join('')}</select>
          <input id="fQ" placeholder="${t('Tên người, mô tả…')}" value="${esc(f.q)}" autocomplete="off">
        </div>
        <div class="list" id="repList"><div class="skeleton"></div><div class="skeleton"></div></div>
        <div class="pager" id="repPager"></div>
      </section>
      <aside class="pane" id="repPane" ${state.id ? '' : 'hidden'}></aside>
    </div>`;
    const doiLoc = () => {
      f.status = $('#fStatus').value; f.reason = $('#fReason').value; f.kind = $('#fKind').value;
      f.q = $('#fQ').value.trim(); f.trang = 0; nav('antoan/baocao');
    };
    ['#fStatus', '#fReason', '#fKind'].forEach((id) => { $(id).onchange = doiLoc; });
    $('#fQ').onkeydown = (e) => { if (e.key === 'Enter') doiLoc(); };

    const rows = await rpc('admin_reports', {
      p_status: f.status, p_reason: f.reason, p_kind: f.kind, p_q: f.q,
      p_limit: TRANG, p_offset: f.trang * TRANG,
    });
    const tong = rows.length ? rows[0].tong : 0;
    $('#repTong').textContent = tong ? `${so(tong)} ${dem(tong, 'báo cáo')}` : '';
    const list = $('#repList');
    if (!rows.length) list.innerHTML = `<div class="empty">${f.status === 'open' && !f.q && f.reason === 'all' ? `${t('Không có báo cáo nào đang chờ. 🎉')}` : `${t('Không có báo cáo nào khớp bộ lọc.')}`}</div>`;
    else list.innerHTML = rows.map((r) => {
      const gap = r.status === 'open' && r.gio_mo >= 24 ? `<b style="color:var(--danger)">${t('quá 24 giờ')}</b>`
        : r.status === 'open' && r.gio_mo >= 18 ? `<b style="color:var(--danger)">${t('sắp quá 24 giờ')}</b>` : '';
      return `<button class="item" data-id="${r.id}" aria-current="${state.id === r.id}">
        ${avatar(r.reported_photo, r.reported_name)}
        <span class="t">
          <span class="n">${esc(r.reported_name || `${t('Đã xoá')}`)} <span class="tag${r.reason === 'underage' ? ' danger' : ''}">${esc(REASON[r.reason] || r.reason)}</span><span class="tag accent">${esc(KIND[r.kind])}</span>${modTag(r.reported_status)}${r.other_open ? `<span class="tag warn">+${r.other_open} ${t('báo cáo khác')}</span>` : ''}</span>
          <span class="s">${esc(r.details || r.snapshot || '')}</span>
          <span class="m">${esc(ago(r.created_at))}${gap ? ' · ' + gap : ''} ${t('· từ')} ${esc(r.reporter_name || '?')}${r.status !== 'open' ? ` · ${esc(RSTATUS[r.status])}${r.resolution ? ' (' + esc(r.resolution) + ')' : ''}` : ''}</span>
        </span>
      </button>`;
    }).join('');
    list.querySelectorAll('.item').forEach((b) => b.addEventListener('click', () => nav('antoan/baocao', b.dataset.id)));
    pager($('#repPager'), tong, f.trang, (t) => { f.trang = t; nav('antoan/baocao'); });
    hydratePhotos(list);
    if (state.id) await renderReportPane($('#repPane'));
  }

  // ---------------------------------------------------------------- AN TOÀN: đang bị phạt / tái phạm
  async function renderAnToan(main) {
    main.innerHTML = dangTai;
    const sf = await rpc('admin_safety');
    if (state.sub === 'phat') return veDangPhat(main, sf);
    return veTaiPham(main, sf);
  }

  function dongNguoi(u, phu, tags) {
    return `<button class="item" data-id="${u.id}">
      ${avatar(u.anh || u.photo_path, u.ten)}
      <span class="t"><span class="n">${esc(u.ten || `${t('Đã xoá')}`)} ${tags || ''}</span>
      <span class="m">${phu}</span></span></button>`;
  }
  function noiDongNguoi(root) {
    root.querySelectorAll('.item[data-id]').forEach((b) => b.addEventListener('click', () => nav('nguoidung', b.dataset.id)));
  }

  function veDangPhat(main, sf) {
    const dp = sf.dang_phat || []; const cc = sf.canh_cao || [];
    main.innerHTML = khung(`${t('Đang bị phạt')}`, `${t('Ai đang bị khoá, khoá tới bao giờ, và ai đã bị cảnh cáo. Tạm khoá hết hạn thì máy chủ tự mở, không cần làm gì.')}`, `
      <div class="card">
        <div class="sec"><h2>${t('Đang bị khoá')}</h2><span class="hint">${dp.length}</span></div>
        <div class="list" id="dsPhat">${dp.length ? dp.map((u) => dongNguoi(u,
          u.trang_thai === 'suspended'
            ? `${t('tạm khoá tới')} ${esc(fmtDate(u.den))}${u.con_lai_gio != null ? ` ${t('· còn')} ${Math.max(0, Math.round(u.con_lai_gio))} ${t('giờ')}` : ''}${u.ly_do ? ' · ' + esc(u.ly_do) : ''}`
            : `${t('khoá vĩnh viễn')}${u.ly_do ? ' · ' + esc(u.ly_do) : ''}`,
          modTag(u.trang_thai))).join('') : `<div class="empty">${t('Không có ai đang bị khoá.')}</div>`}</div>
      </div>
      <div class="card">
        <div class="sec"><h2>${t('Đã bị cảnh cáo')}</h2><span class="hint">${cc.length} ${t('· còn hoạt động bình thường')}</span></div>
        <div class="list" id="dsCanhCao">${cc.length ? cc.map((u) => dongNguoi(u,
          `${u.so_lan} ${t('lần cảnh cáo')}${u.con_treo ? ` ${t('· chưa bấm "Đã hiểu"')}` : ''}`,
          `<span class="tag warn">${t('cảnh cáo')} ${u.so_lan}</span>`)).join('') : `<div class="empty">${t('Chưa cảnh cáo ai.')}</div>`}</div>
      </div>`);
    noiDongNguoi(main); hydratePhotos(main);
  }

  function veTaiPham(main, sf) {
    const tp = sf.tai_pham || []; const bcn = sf.bao_cao_nhieu || [];
    const xl = sf.xu_ly || {}; const sla = sf.sla || {};
    main.innerHTML = khung(`${t('Bị báo cáo nhiều lần')}`, `${t('Người bị báo cáo từ 2 lần trở lên trong 90 ngày — thường là dấu hiệu sớm của tài khoản cần xử lý dứt điểm.')}`, `
      <div class="tiles">
        <div class="tile"><div class="v">${so(sf.bao_cao_tren_1000_mau_7d)}</div><div class="l">${t('báo cáo / 1.000 người hoạt động (7 ngày)')}</div></div>
        <div class="tile"><div class="v">${so(xl.dong_7d)}</div><div class="l">${t('báo cáo đã đóng 7 ngày qua')}</div></div>
        <div class="tile"><div class="v">${xl.gio_tb_7d != null ? xl.gio_tb_7d + ` ${t('giờ')}` : '—'}</div><div class="l">${t('thời gian xử lý trung bình')}</div></div>
        <div class="tile${xl.dong_7d && xl.trong_24h_7d < xl.dong_7d ? ' alert' : ''}"><div class="v">${xl.dong_7d ? pct(xl.trong_24h_7d, xl.dong_7d) + '%' : '—'}</div><div class="l">${t('đóng trong vòng 24 giờ')}</div></div>
      </div>
      <div class="card">
        <div class="sec"><h2>${t('Bị báo cáo nhiều lần')}</h2><span class="hint">${t('90 ngày gần đây')}</span></div>
        <div class="list" id="dsTaiPham">${tp.length ? tp.map((u) => dongNguoi(u,
          `${u.so_bao_cao} ${t('báo cáo')}${u.dang_mo ? ` · ${u.dang_mo} ${t('đang mở')}` : ''}`,
          `<span class="tag danger">${u.so_bao_cao} ${t('báo cáo')}</span>${modTag(u.trang_thai)}`)).join('') : `<div class="empty">${t('Không có ai bị báo cáo quá một lần. 🎉')}</div>`}</div>
      </div>
      <div class="card">
        <div class="sec"><h2>${t('Người báo cáo nhiều')}</h2><span class="hint">${t('từ 3 lần trong 30 ngày — có thể là người cảnh giác, cũng có thể là người báo cáo bừa')}</span></div>
        <div class="list" id="dsBaoNhieu">${bcn.length ? bcn.map((u) => dongNguoi(u, `${t('đã gửi')} ${u.so_lan} ${t('báo cáo')}`, '')).join('') : `<div class="empty">${t('Không có ai.')}</div>`}</div>
      </div>
      <div class="card">
        <div class="sec"><h2>${t('Báo cáo đang mở, theo tuổi')}</h2></div>
        <div class="tiles">
          <div class="tile"><div class="v">${so(sla.duoi_6h)}</div><div class="l">${t('dưới 6 giờ')}</div></div>
          <div class="tile"><div class="v">${so(sla.tu_6_18h)}</div><div class="l">${t('6–18 giờ')}</div></div>
          <div class="tile${sla.tu_18_24h ? ' alert' : ''}"><div class="v">${so(sla.tu_18_24h)}</div><div class="l">${t('18–24 giờ')}</div></div>
          <div class="tile${sla.qua_24h ? ' alert' : ''}"><div class="v">${so(sla.qua_24h)}</div><div class="l">${t('đã quá 24 giờ')}</div></div>
        </div>
      </div>
      ${bangDem(`${t('Lý do bị báo cáo (30 ngày)')}`, sf.theo_ly_do, REASON)}
      ${bangDem(`${t('Loại nội dung bị báo cáo (30 ngày)')}`, sf.theo_loai, KIND)}
      ${bangDem(`${t('Kết quả xử lý (30 ngày)')}`, sf.ket_qua_30d, { dismiss: `${t('Bỏ qua')}`, remove: `${t('Gỡ nội dung')}`, warn: `${t('Gỡ + cảnh cáo')}`, suspend: `${t('Tạm khoá')}`, ban: `${t('Khoá vĩnh viễn')}`, delete: `${t('Xoá tài khoản')}` })}`);
    noiDongNguoi(main); hydratePhotos(main);
  }

  /** Bảng đếm từ một object {khoá: số} kèm bảng dịch nhãn. */
  function bangDem(tieuDe, obj, nhan) {
    const rows = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
    const tong = rows.reduce((a, r) => a + Number(r[1]), 0);
    if (!rows.length) return '';
    return `<div class="card"><div class="sec"><h2>${esc(tieuDe)}</h2><span class="hint">${so(tong)}</span></div>
      <table class="tbl"><tbody>${rows.map(([k, v]) => `<tr><td>${esc((nhan || {})[k] || k)}</td>
        <td style="width:45%"><span class="rate"><i><b style="width:${tong ? Math.round(v / tong * 100) : 0}%"></b></i></span></td>
        <td class="num">${so(v)}</td><td class="num" style="color:var(--soft)">${tong ? pct(v, tong) : 0}%</td></tr>`).join('')}</tbody></table></div>`;
  }

  function userCard(u, opts) {
    if (!u || !u.id) return `<div class="card"><h2>${t('Tài khoản đã xoá')}</h2><div class="hint">${t('Người này đã xoá tài khoản; báo cáo vẫn giữ lại để làm bằng chứng.')}</div></div>`;
    if (u.deleted) return `<div class="card"><h2>${t('Tài khoản đã xoá')}</h2><div class="hint">${esc(u.email || u.id)}</div>${actionsList(u.actions)}</div>`;
    const c = u.counts || {};
    return `<div class="card stack" style="gap:10px">
      <div class="row" style="align-items:flex-start">
        ${avatar(u.photo_path, u.display_name)}
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:16px;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><a href="#nguoidung/${u.id}" style="color:inherit;text-decoration:none">${esc(u.display_name)}</a>${u.age ? `<span class="hint">${u.age} ${t('tuổi')}</span>` : ''}${u.is_admin ? `<span class="tag accent">${t('quản trị')}</span>` : ''}${modTag(u.moderation_status, u.moderation_until)}${u.warned_count ? `<span class="tag warn">${t('đã cảnh cáo')} ${u.warned_count}</span>` : ''}</div>
          <div class="hint" style="overflow-wrap:anywhere">${esc(u.email || '')}</div>
        </div>
      </div>
      ${u.bio ? `<div class="quote">${esc(u.bio)}</div>` : ''}
      <dl class="kv">
        <dt>${t('Tham gia')}</dt><dd>${esc(fmtDate(u.created_at))}</dd>
        <dt>${t('Hoạt động')}</dt><dd>${esc(ago(u.last_seen))}</dd>
        <dt>${t('Nội dung')}</dt><dd>${c.posts || 0} ${t('bài')}${c.posts_pending ? ` (${c.posts_pending} ${t('chờ duyệt)')}` : ''}${c.posts_rejected ? `, ${c.posts_rejected} ${t('bị từ chối')}` : ''} · ${c.comments || 0} ${t('bình luận ·')} ${so(c.messages || 0)} ${t('tin')} · ${c.album_photos || 0} ${t('ảnh album')}${c.album_shared_with ? ` ${t('(chia sẻ với')} ${c.album_shared_with})` : ''}</dd>
        <dt>${t('Quan hệ')}</dt><dd>${c.followers || 0} ${t('người theo dõi · theo dõi')} ${c.following || 0} · ${c.conversations || 0} ${t('cuộc trò chuyện · chặn')} ${c.blocks_made || 0} ${t('· bị')} ${c.blocked_by || 0} ${t('người chặn')}</dd>
        <dt>${t('Được xem')}</dt><dd>${c.views_received_7d || 0} ${t('lượt xem hồ sơ trong 7 ngày')}${u.ngay_hoat_dong_30 != null ? ` ${t('· vào app')} ${u.ngay_hoat_dong_30}${t('/30 ngày')}` : ''}</dd>
        <dt>${t('Cài đặt')}</dt><dd>${u.country ? esc(u.country) + ' · ' : ''}${u.co_thong_bao ? `${t('bật thông báo')}` : `<span style="color:var(--soft)">${t('tắt thông báo')}</span>`}${u.push_lang ? ' (' + esc(u.push_lang) + ')' : ''}${u.incognito ? ` ${t('· ẩn danh')}` : ''}${u.private_account ? ` ${t('· tài khoản riêng tư')}` : ''}${u.hide_distance ? ` ${t('· ẩn khoảng cách')}` : ''}${u.quiet_view ? ` ${t('· xem thầm')}` : ''}${u.plus_until && new Date(u.plus_until) > new Date() ? ' · <b>' + t('HIMO Plus') + '</b>' : ''}</dd>
        <dt>${t('Bị báo cáo')}</dt><dd>${c.reports_received || 0} ${t('lần (')}${c.reports_actioned || 0} ${t('đã xử lý,')} ${c.reports_open || 0} ${t('đang mở) · đã gửi')} ${c.reports_made || 0} ${t('báo cáo')}</dd>
        ${u.moderation_reason ? `<dt>${t('Lý do khoá')}</dt><dd>${esc(u.moderation_reason)}</dd>` : ''}
        ${u.admin_notice ? `<dt>${t('Cảnh cáo chưa đọc')}</dt><dd>${esc(u.admin_notice)}</dd>` : ''}
      </dl>
      ${opts && opts.posts && (u.posts || []).length ? `<div><div class="hint" style="margin-bottom:6px">${t('Bài gần đây — bấm để xem đầy đủ')}</div><div class="row">${u.posts.map((p) => `<a href="#noidung/bai/${p.id}"><img class="photo sm" data-photo="${esc(p.image_path)}" title="${esc((p.caption || '') + ' · ' + p.status)}" style="opacity:0;transition:opacity .2s;${p.status !== 'approved' ? 'outline:2px solid var(--danger)' : ''}"></a>`).join('')}</div></div>` : ''}
      ${(u.reports || []).length ? `<details><summary class="hint" style="cursor:pointer">${t('Lịch sử bị báo cáo (')}${u.reports.length})</summary><div class="stack" style="gap:6px;margin-top:6px">${u.reports.map((r) => `<div class="hint"><a href="#antoan/baocao/${r.id}">${esc(fmtDate(r.created_at))}</a> · ${esc(REASON[r.reason] || r.reason)} · ${esc(RSTATUS[r.status])}${r.resolution ? ' (' + esc(r.resolution) + ')' : ''}<br><span style="color:var(--faint)">${r.snapshot_withheld ? t('— bản chụp cần xác thực hai lớp —') : esc(r.snapshot || '')}</span></div>`).join('')}</div></details>` : ''}
      ${actionsList(u.actions)}
    </div>`;
  }
  const actionsList = (list) => (list || []).length ? `<details><summary class="hint" style="cursor:pointer">${t('Nhật ký xử lý (')}${list.length})</summary><div class="stack" style="gap:6px;margin-top:6px">${list.map((a) => `<div class="hint">${esc(fmtDate(a.created_at))} · <b>${esc(ACTION[a.action] || a.action)}</b>${a.admin ? ' · ' + esc(a.admin) : ''}${a.note ? '<br>' + esc(a.note) : ''}</div>`).join('')}</div></details>` : '';

  function contentBlock(kind, c, snapshot) {
    if (!c) return `<div class="quote" style="color:var(--soft)">${t('Nội dung không còn (đã bị gỡ hoặc xoá). Bản chụp lúc báo cáo:')}<br>${esc(snapshot || '—')}</div>`;
    const img = (p, full) => p ? `<img class="photo" data-photo="${esc(p)}" ${full ? 'data-full' : ''} data-zoom="${esc(p)}" title="${t('Bấm để xem to')}" alt="" style="opacity:0;transition:opacity .2s">` : '';
    // Bài đăng và bình luận là nội dung công khai nên mở được trang chi tiết đầy đủ.
    const moRong = (k, id) => id ? `<div class="row" style="margin-top:8px"><a class="btn sm" href="#noidung/${k === 'post' ? 'bai' : 'binhluan'}/${id}">${t('Xem đầy đủ')} ${k === 'post' ? `${t('bài đăng')}` : `${t('bình luận')}`} →</a></div>` : '';
    if (kind === 'post') return `${img(c.image_path, true)}${c.caption ? `<div class="quote">${esc(c.caption)}</div>` : ''}<div class="hint">${t('Trạng thái:')} ${esc(c.status)}${c.moderation_reason ? ' · ' + esc(c.moderation_reason) : ''} · ${esc(fmtDate(c.created_at))}</div>${moRong('post', c.id)}`;
    if (kind === 'comment') return `<div class="quote">${esc(c.body)}</div><div class="hint">${t('Bình luận lúc')} ${esc(fmtDate(c.created_at))}${c.post_image ? ` ${t('dưới bài:')}` : ''}</div>${img(c.post_image)}${moRong('comment', c.id)}`;
    if (kind === 'message') return `${c.recalled_at ? `<div class="quote" style="color:var(--soft)">${t('Tin đã bị thu hồi.')}</div>` : ''}${c.body ? `<div class="quote">${esc(c.body)}</div>` : ''}${img(c.image_path, true)}${c.lat != null ? `<div class="hint">${t('Vị trí chia sẻ:')} ${c.lat}, ${c.lng}</div>` : ''}<div class="hint">${t('Gửi lúc')} ${esc(fmtDate(c.created_at))}</div>`;
    if (kind === 'album') return `${img(c.path, true)}<div class="hint">${t('Trạng thái:')} ${esc(c.status)}${c.moderation_reason ? ' · ' + esc(c.moderation_reason) : ''}</div>`;
    return `${img(c.photo_path, true)}${c.bio ? `<div class="quote">${esc(c.bio)}</div>` : `<div class="hint">${t('Không có giới thiệu.')}</div>`}`;
  }

  async function renderReportPane(pane) {
    pane.hidden = false;
    pane.innerHTML = '<div class="stack"><div class="skeleton"></div><div class="skeleton"></div></div>';
    // 065: chi tiết báo cáo là nội dung nhạy cảm — máy chủ ghi nhật ký và đòi aal2.
    const d = await goiNhayCam('admin_report_detail', { p_id: state.id });
    if (!d) { pane.innerHTML = `<div class="card">${t('Không mở được báo cáo — cần xác thực hai lớp hoặc vai trò không đủ quyền.')}</div>`; return; }
    const r = d.report; const open = r.status === 'open';
    // Người bị báo cáo có thể đã xoá tài khoản (reports.reported_id thành NULL).
    // Phải giữ nguyên null để userCard biết mà báo "đã xoá" và các nút phạt tắt đi.
    const u = d.reported || null;
    const canAct = !!(u && !u.deleted && !u.is_admin && u.id);
    // 066: báo cáo cũ không xác định được thứ bị báo cáo → không cho "Gỡ" (máy chủ cũng từ chối).
    const canRemove = canAct && r.kind !== 'unknown';
    pane.innerHTML = `
      <button class="btn ghost sm sheet-close" id="paneClose">${t('← Danh sách')}</button>
      <div class="stack">
        <div class="card stack" style="gap:8px">
          <div class="row" style="justify-content:space-between"><h2>${esc(KIND[r.kind])} ${t('bị báo cáo')}</h2><span class="tag ${open ? 'warn' : 'ok'}">${esc(RSTATUS[r.status])}</span></div>
          <dl class="kv">
            <dt>${t('Lý do')}</dt><dd><b>${esc(REASON[r.reason] || r.reason)}</b>${r.details ? ' — ' + esc(r.details) : ''}</dd>
            <dt>${t('Báo cáo lúc')}</dt><dd>${esc(fmtDate(r.created_at))} (${esc(ago(r.created_at))})${open && hoursOpen(r.created_at) >= 18 ? ` <b style="color:var(--danger)">${t('sắp quá 24 giờ')}</b>` : ''}</dd>
            <dt>${t('Người báo cáo')}</dt><dd>${d.reporter ? `<a href="#nguoidung/${d.reporter.id}">${esc(d.reporter.display_name)}</a> ${t('· đã gửi')} ${d.reporter.reports_made} ${t('báo cáo')}` : '—'}</dd>
            ${!open ? `<dt>${t('Kết quả')}</dt><dd>${esc(r.resolution || '')}${r.resolved_by ? ' · ' + esc(r.resolved_by) : ''} · ${esc(fmtDate(r.resolved_at))}${r.admin_note ? '<br>' + esc(r.admin_note) : ''}</dd>` : ''}
          </dl>
          ${contentBlock(r.kind, d.content, r.snapshot)}
          ${r.snapshot && d.content ? `<details><summary class="hint" style="cursor:pointer">${t('Bản chụp lúc báo cáo')}</summary><div class="quote" style="margin-top:6px">${esc(r.snapshot)}</div></details>` : ''}
        </div>
        ${open ? `<div class="card stack" style="gap:8px"><h2>${t('Xử lý')}</h2>
          <div class="actions">
            <button class="btn" data-act="dismiss">${t('Bỏ qua')}<small>${t('Không vi phạm, đóng báo cáo')}</small></button>
            <button class="btn" data-act="remove" ${canRemove ? '' : 'disabled'}>${t('Gỡ nội dung')}<small>${t('Xoá thứ bị báo cáo, giữ tài khoản')}</small></button>
            <button class="btn" data-act="warn" ${canAct ? '' : 'disabled'}>${t('Gỡ + cảnh cáo')}<small>${t('Họ thấy lời cảnh cáo khi mở app')}</small></button>
            <button class="btn" data-act="suspend" ${canAct ? '' : 'disabled'}>${t('Gỡ + tạm khoá')}<small>${t('Văng khỏi app trong N ngày')}</small></button>
            <button class="btn danger" data-act="ban" ${canAct ? '' : 'disabled'}>${t('Gỡ + khoá vĩnh viễn')}<small>${t('Giữ dữ liệu làm bằng chứng')}</small></button>
            <button class="btn danger" data-act="delete" ${canAct ? '' : 'disabled'}>${t('Xoá tài khoản')}<small>${t('Xoá hẳn mọi dữ liệu')}</small></button>
          </div>
          ${r.kind === 'unknown' ? `<div class="hint" style="color:var(--warn, inherit)">${t('Báo cáo cũ: không xác định được nội dung bị báo cáo, nên nút Gỡ bị tắt. Các nút còn lại chỉ xử lý tài khoản.')}</div>` : ''}
          <div class="hint">${t('Khoá hay xoá thì mọi báo cáo đang mở về người này cũng được đóng luôn. Nghi ngờ dưới 18 tuổi hoặc tội phạm: khoá (giữ bằng chứng), đừng xoá.')}</div>
        </div>` : ''}
        <div><div class="hint" style="margin:0 0 6px 2px">${t('Người bị báo cáo')}</div>${userCard(u, { posts: true })}</div>
      </div>`;
    $('#paneClose', pane).addEventListener('click', () => nav('antoan/baocao'));
    pane.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => resolveReport(r, u, b.dataset.act)));
    hydratePhotos(pane); noiXemAnh(pane);
  }

  let dangGui = false;
  async function resolveReport(r, u, act) {
    if (dangGui) return;
    const name = (u && u.display_name) || `${t('người này')}`;
    const cfgs = {
      dismiss: { title: `${t('Bỏ qua báo cáo')}`, text: `${t('Đánh dấu đã xem, không vi phạm. Nội dung giữ nguyên.')}`, okLabel: `${t('Bỏ qua')}` },
      remove: { title: `${t('Gỡ nội dung')}`, text: `${t('Gỡ')} ${(KIND[r.kind] || r.kind || '').toLowerCase()} ${t('bị báo cáo của')} ${name}${t('. Tài khoản giữ nguyên.')}`, okLabel: `${t('Gỡ')}` },
      warn: { title: `${t('Gỡ và cảnh cáo')}`, text: `${t('Gỡ nội dung và hiện lời cảnh cáo cho')} ${name} ${t('khi họ mở app.')}`, noteLabel: `${t('Lời cảnh cáo họ sẽ đọc (để trống = câu mặc định)')}`, notePlaceholder: `${t('Nội dung của bạn đã bị gỡ vì vi phạm Điều khoản sử dụng. Vi phạm lần nữa, tài khoản sẽ bị khoá.')}`, okLabel: `${t('Gỡ + cảnh cáo')}` },
      suspend: { title: `${t('Gỡ và tạm khoá')}`, text: `${t('Gỡ nội dung;')} ${name} ${t('không đăng nhập được và ẩn với mọi người trong thời gian khoá.')}`, days: 7, noteLabel: `${t('Lý do (nội bộ)')}`, okLabel: `${t('Tạm khoá')}`, danger: true },
      ban: { title: `${t('Gỡ và khoá vĩnh viễn')}`, text: `${name} ${t('không bao giờ đăng nhập lại được; dữ liệu giữ nguyên làm bằng chứng.')}`, noteLabel: `${t('Lý do (nội bộ)')}`, okLabel: `${t('Khoá vĩnh viễn')}`, danger: true },
      delete: { title: `${t('Xoá tài khoản')}`, text: `${t('Xoá hẳn')} ${name} ${t('cùng toàn bộ hồ sơ, ảnh, bài, tin nhắn. Không hoàn tác được. Email được giữ trong nhật ký.')}`, noteLabel: `${t('Lý do (nội bộ)')}`, okLabel: `${t('Xoá vĩnh viễn')}`, danger: true },
    };
    const ans = await confirmAction(cfgs[act]); if (!ans) return;
    dangGui = true;
    try {
      await rpc('admin_resolve_report', { p_id: r.id, p_action: act, p_note: ans.note || null, p_days: ans.days });
      toast(t('Đã xử lý') + ': ' + (ACTION['report:' + act] || act));
      // Xoá tài khoản xong thì báo cáo trỏ vào một hồ sơ không còn — về danh sách.
      if (act === 'delete') nav('antoan/baocao'); else await render();
    } catch (e) { toast(friendly(e), true); }
    finally { dangGui = false; }
  }

  // ---------------------------------------------------------------- DUYỆT ẢNH
  async function renderPhotos(main) {
    main.innerHTML = `<div class="stack" style="padding-top:16px">
      <div><h1>${t('Duyệt ảnh')}</h1><p class="sub">${t('Máy (Sightengine) duyệt trước; đây là chỗ xem lại ảnh còn chờ hoặc sửa quyết định của máy.')}</p></div>
      <div class="chips" id="phChips">${[['pending', `${t('Đang chờ')}`], ['rejected', `${t('Đã từ chối')}`], ['approved', `${t('Đã duyệt (mới nhất)')}`]].map(([k, l]) => `<button class="chip" data-k="${k}" aria-pressed="${state.anh.status === k}">${l}</button>`).join('')}</div>
      <div class="grid" id="phGrid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>
    </div>`;
    main.querySelectorAll('#phChips .chip').forEach((c) => c.addEventListener('click', () => { state.anh.status = c.dataset.k; render(); }));
    const rows = await rpc('admin_photo_queue', { p_status: state.anh.status, p_limit: 120, p_offset: 0 });
    const grid = $('#phGrid');
    if (!rows.length) { grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${t('Không có ảnh nào.')}</div>`; return; }
    grid.innerHTML = rows.map((p) => `
      <div class="pcard" data-kind="${p.kind}" data-id="${p.id}">
        <img data-photo="${esc(p.path)}" data-zoom="${esc(p.path)}" title="${t('Bấm để xem to')}" alt="" style="opacity:0;transition:opacity .2s">
        <div class="b">
          <div class="row" style="gap:6px"><span class="tag accent">${esc(KIND[p.kind])}</span><a href="#nguoidung/${p.owner_id}" style="font-weight:700;color:inherit;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.owner_name)}</a></div>
          <div class="hint">${esc(ago(p.created_at))}${p.reason ? ' · ' + esc(p.reason) : ''}${p.caption ? '<br>' + esc(p.caption) : ''}</div>
          <div class="r">${p.status !== 'approved' ? `<button class="btn ok" data-set="approved">${t('Duyệt')}</button>` : ''}${p.status !== 'rejected' ? `<button class="btn danger" data-set="rejected">${t('Từ chối')}</button>` : ''}</div>
          ${p.kind === 'post' ? `<a class="btn sm" href="#noidung/bai/${p.id}">${t('Xem đầy đủ bài')} →</a>` : ''}
        </div>
      </div>`).join('');
    grid.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', async () => {
      if (b.disabled) return;
      const card = b.closest('.pcard'); const status = b.dataset.set;
      let note = null;
      if (status === 'rejected') {
        const ans = await confirmAction({ title: `${t('Từ chối ảnh')}`, text: `${t('Ảnh bài đăng / album bị từ chối sẽ bị xoá file; ảnh đại diện thì chủ tài khoản thấy để đổi.')}`, noteLabel: `${t('Lý do (chủ ảnh không thấy)')}`, okLabel: `${t('Từ chối')}`, danger: true });
        if (!ans) return; note = ans.note || null;
      }
      card.querySelectorAll('button').forEach((x) => { x.disabled = true; });
      try {
        await rpc('admin_set_photo', { p_kind: card.dataset.kind, p_id: card.dataset.id, p_status: status, p_reason: note });
        card.style.opacity = '0.35';
        toast(status === 'approved' ? `${t('Đã duyệt')}` : `${t('Đã từ chối')}`);
        refreshBadges();
      } catch (e) {
        card.querySelectorAll('button').forEach((x) => { x.disabled = false; });
        toast(friendly(e), true);
      }
    }));
    hydratePhotos(grid); noiXemAnh(grid);
  }

  // ---------------------------------------------------------------- NGƯỜI DÙNG
  async function renderUsers(main) {
    const f = state.ng;
    if (!state.nuoc) { try { state.nuoc = await rpc('admin_countries'); } catch (e) { state.nuoc = []; } }
    main.innerHTML = `<div class="cols${state.id ? '' : ' wide'}">
      <section>
        <div class="sec"><h2>${t('Người dùng')}</h2><span class="hint" id="uTong"></span></div>
        <div class="filters" style="margin-bottom:10px">
          <input id="uQ" placeholder="${t('Tên, email, id, giới thiệu…')}" value="${esc(f.q)}" autocomplete="off">
          <select id="uStatus">${[['all', `${t('Mọi trạng thái')}`], ['active', `${t('Bình thường')}`], ['suspended', `${t('Đang tạm khoá')}`], ['banned', `${t('Khoá vĩnh viễn')}`], ['warned', `${t('Đã bị cảnh cáo')}`], ['admin', `${t('Quản trị viên')}`]].map(([k, l]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select id="uCountry"><option value="all">${t('Mọi nước')}</option>${(state.nuoc || []).map((c) => `<option value="${esc(c.country)}" ${f.country === c.country ? 'selected' : ''}>${esc(c.country)} (${c.n})</option>`).join('')}</select>
          <select id="uAct">${[['all', `${t('Mọi mức hoạt động')}`], ['24h', `${t('Vào trong 24 giờ')}`], ['7d', `${t('Vào trong 7 ngày')}`], ['30d', `${t('Vào trong 30 ngày')}`], ['ngu30', `${t('Không vào 30 ngày')}`], ['moi7d', `${t('Mới đăng ký 7 ngày')}`]].map(([k, l]) => `<option value="${k}" ${f.hoatDong === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select id="uSort">${[['recent', `${t('Mới hoạt động')}`], ['new', `${t('Mới đăng ký')}`], ['reports', `${t('Bị báo cáo nhiều')}`], ['posts', `${t('Đăng nhiều')}`], ['name', `${t('Theo tên')}`]].map(([k, l]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div class="list" id="uList"><div class="skeleton"></div><div class="skeleton"></div></div>
        <div class="pager" id="uPager"></div>
      </section>
      <aside class="pane" id="uPane" ${state.id ? '' : 'hidden'}></aside>
    </div>`;
    const doiLoc = () => {
      f.q = $('#uQ').value.trim(); f.status = $('#uStatus').value; f.country = $('#uCountry').value;
      f.hoatDong = $('#uAct').value; f.sort = $('#uSort').value; f.trang = 0; nav('nguoidung');
    };
    ['#uStatus', '#uCountry', '#uAct', '#uSort'].forEach((id) => { $(id).onchange = doiLoc; });
    $('#uQ').onkeydown = (e) => { if (e.key === 'Enter') doiLoc(); };

    const rows = await rpc('admin_user_search', {
      p_q: f.q, p_status: f.status, p_country: f.country, p_hoat_dong: f.hoatDong,
      p_sort: f.sort, p_limit: TRANG, p_offset: f.trang * TRANG,
    });
    const tong = rows.length ? rows[0].tong : 0;
    $('#uTong').textContent = tong ? `${so(tong)} ${dem(tong, 'người')}` : '';
    const list = $('#uList');
    list.innerHTML = rows.length ? rows.map((u) => `
      <button class="item" data-id="${u.id}" aria-current="${state.id === u.id}">
        ${avatar(u.photo_path, u.display_name)}
        <span class="t">
          <span class="n">${esc(u.display_name)}${u.tuoi ? ` <span class="hint">${u.tuoi} ${t('tuổi')}</span>` : ''} ${modTag(u.moderation_status, u.moderation_until)}${u.la_admin ? `<span class="tag accent">${t('quản trị')}</span>` : ''}${u.warned_count ? `<span class="tag warn">${t('cảnh cáo')} ${u.warned_count}</span>` : ''}${u.reports_open ? `<span class="tag danger">${u.reports_open} ${t('báo cáo mở')}</span>` : ''}${u.incognito ? `<span class="tag">${t('ẩn danh')}</span>` : ''}${u.plus_until && new Date(u.plus_until) > new Date() ? `<span class="tag ok">${t('Plus')}</span>` : ''}</span>
          <span class="s">${esc(u.email || '')}${u.country ? ' · ' + esc(u.country) : ''}</span>
          <span class="m">${t('vào')} ${esc(ago(u.last_seen))} · tham gia ${esc(fmtNgay(u.created_at))} · ${u.so_bai} ${t('bài ·')} ${so(u.so_tin)} ${t('tin')}${u.reports_received ? ` ${t('· bị báo cáo')} ${u.reports_received}` : ''}${u.co_thong_bao ? '' : ` ${t('· tắt thông báo')}`}</span>
        </span>
      </button>`).join('') : `<div class="empty">${t('Không tìm thấy ai khớp bộ lọc.')}</div>`;
    list.querySelectorAll('.item').forEach((b) => b.addEventListener('click', () => nav('nguoidung', b.dataset.id)));
    pager($('#uPager'), tong, f.trang, (t) => { f.trang = t; nav('nguoidung'); });
    hydratePhotos(list);
    if (state.id) await renderUserPane($('#uPane'));
  }

  async function renderUserPane(pane) {
    pane.hidden = false;
    pane.innerHTML = '<div class="stack"><div class="skeleton"></div><div class="skeleton"></div></div>';
    const u = await rpc('admin_user_detail', { p_id: state.id });
    const canAct = !!(u && !u.deleted && !u.is_admin);
    pane.innerHTML = `
      <button class="btn ghost sm sheet-close" id="paneClose">${t('← Danh sách')}</button>
      <div class="stack">
        ${userCard(u, { posts: true })}
        ${canAct ? `<div class="card stack" style="gap:8px"><h2>${t('Hành động')}</h2>
          <div class="actions">
            <button class="btn" data-act="warn">${t('Cảnh cáo')}<small>${t('Hiện lời nhắc khi họ mở app')}</small></button>
            ${u.moderation_status !== 'active' ? `<button class="btn ok" data-act="active">${t('Mở khoá')}<small>${t('Cho đăng nhập lại')}</small></button>` : `<button class="btn" data-act="suspended">${t('Tạm khoá')}<small>${t('N ngày, tự mở lại')}</small></button>`}
            <button class="btn danger" data-act="banned">${t('Khoá vĩnh viễn')}<small>${t('Giữ dữ liệu làm bằng chứng')}</small></button>
            <button class="btn danger" data-act="delete">${t('Xoá tài khoản')}<small>${t('Xoá hẳn mọi dữ liệu')}</small></button>
          </div></div>` : (u && u.is_admin ? `<div class="hint">${t('Tài khoản quản trị viên — không khoá/xoá từ đây.')}</div>` : '')}
        ${u && u.id && !u.deleted ? `<div class="card stack" style="gap:8px"><h2>${t('Nội dung riêng')}</h2>
          <p class="hint" style="margin:0">${t('Mỗi lần mở cần lý do, cần phiên xác thực hai lớp, và được ghi vào nhật ký (ai, lúc nào, lý do).')}</p>
          <div class="actions">
            <button class="btn" data-rieng="hoithoai">${t('Hội thoại')}<small>${t('Tin nhắn riêng và nhóm')}</small></button>
            <button class="btn" data-rieng="album">${t('Album riêng')}<small>${t('Mọi ảnh trong album')}</small></button>
          </div></div>` : ''}
      </div>`;
    $('#paneClose', pane).addEventListener('click', () => nav('nguoidung'));
    pane.querySelectorAll('[data-rieng]').forEach((b) => b.addEventListener('click', () => (b.dataset.rieng === 'album' ? xemAlbumRieng(u) : xemHoiThoai(u)).catch((e) => toast(friendly(e), true))));
    pane.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => userAction(u, b.dataset.act)));
    hydratePhotos(pane); noiXemAnh(pane);
  }

  async function userAction(u, act) {
    if (dangGui) return;
    const name = u.display_name || `${t('người này')}`;
    const cfgs = {
      warn: { title: `${t('Cảnh cáo')}`, text: `${name} ${t('sẽ thấy lời cảnh cáo ở trang chủ tới khi bấm "Đã hiểu".')}`, noteLabel: `${t('Lời cảnh cáo (để trống = câu mặc định)')}`, okLabel: `${t('Gửi cảnh cáo')}` },
      active: { title: `${t('Mở khoá')}`, text: `${name} ${t('đăng nhập lại được và hiện lại với mọi người.')}`, okLabel: `${t('Mở khoá')}` },
      suspended: { title: `${t('Tạm khoá')}`, text: `${name} ${t('không đăng nhập được và ẩn với mọi người trong thời gian khoá.')}`, days: 7, noteLabel: `${t('Lý do (nội bộ)')}`, okLabel: `${t('Tạm khoá')}`, danger: true },
      banned: { title: `${t('Khoá vĩnh viễn')}`, text: `${name} ${t('không bao giờ đăng nhập lại được; dữ liệu giữ nguyên làm bằng chứng.')}`, noteLabel: `${t('Lý do (nội bộ)')}`, okLabel: `${t('Khoá vĩnh viễn')}`, danger: true },
      delete: { title: `${t('Xoá tài khoản')}`, text: `${t('Xoá hẳn')} ${name} ${t('cùng toàn bộ dữ liệu. Không hoàn tác được. Email được giữ trong nhật ký.')}`, noteLabel: `${t('Lý do (nội bộ)')}`, okLabel: `${t('Xoá vĩnh viễn')}`, danger: true },
    };
    const ans = await confirmAction(cfgs[act]); if (!ans) return;
    dangGui = true;
    try {
      if (act === 'warn') await rpc('admin_warn_user', { p_user: u.id, p_text: ans.note || null });
      else if (act === 'delete') await rpc('admin_delete_user', { p_user: u.id, p_reason: ans.note || null });
      else await rpc('admin_set_user_status', { p_user: u.id, p_status: act, p_days: ans.days, p_reason: ans.note || null });
      toast(t('Xong') + ': ' + (ACTION[act === 'warn' ? 'warn' : act === 'delete' ? 'delete' : 'status:' + act] || act));
      if (act === 'delete') nav('nguoidung'); else await render();
    } catch (e) { toast(friendly(e), true); }
    finally { dangGui = false; }
  }

  // ---------------------------------------------------------------- NỘI DUNG
  // Nội dung CÔNG KHAI (bài đăng, bình luận). Nội dung riêng (tin nhắn, album)
  // mở từ trang người dùng qua các RPC có ghi nhật ký của 065.
  async function renderNoiDung(main) {
    const laBai = state.sub === 'bai';
    const f = state.nd[state.sub] || state.nd.bai;
    main.innerHTML = `<div class="cols${state.id ? '' : ' wide'}">
      <section>
        <div class="sec"><h2>${laBai ? `${t('Bài đăng')}` : `${t('Bình luận')}`}</h2><span class="hint" id="cTong"></span></div>
        <p class="sub">${t('Nội dung công khai — đúng những gì người dùng khác đã thấy. Bấm vào một mục để xem đầy đủ. Tin nhắn riêng và album riêng mở từ trang của từng người dùng (cần lý do, xác thực hai lớp, có ghi nhật ký).')}</p>
        <div class="filters">
          <input id="cQ" placeholder="${laBai ? `${t('Chú thích, tên người đăng…')}` : `${t('Nội dung bình luận, tên người…')}`}" value="${esc(f.q)}" autocomplete="off">
          ${laBai ? `<select id="cStatus">${[['all', `${t('Mọi trạng thái')}`], ['approved', `${t('Đã duyệt')}`], ['pending', `${t('Đang chờ duyệt')}`], ['rejected', `${t('Đã bị gỡ')}`]].map(([k, l]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}
          <label class="hint" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="cBc" ${f.baoCao ? 'checked' : ''} style="min-height:auto"> ${t('chỉ thứ đang bị báo cáo')}</label>
          ${f.tacGia ? `<button class="btn sm" id="cBoLoc">${t('Bỏ lọc theo người')}</button>` : ''}
        </div>
        <div id="cList" style="margin-top:10px"><div class="skeleton"></div><div class="skeleton"></div></div>
        <div class="pager" id="cPager"></div>
      </section>
      <aside class="pane" id="cPane" ${state.id ? '' : 'hidden'}></aside>
    </div>`;
    const doiLoc = () => {
      f.q = $('#cQ').value.trim(); if (laBai) f.status = $('#cStatus').value;
      f.baoCao = $('#cBc').checked; f.trang = 0; nav('noidung/' + state.sub);
    };
    if (laBai) $('#cStatus').onchange = doiLoc;
    $('#cBc').onchange = doiLoc;
    $('#cQ').onkeydown = (e) => { if (e.key === 'Enter') doiLoc(); };
    if ($('#cBoLoc')) $('#cBoLoc').onclick = () => { f.tacGia = null; f.trang = 0; nav('noidung/' + state.sub); };

    const rows = await rpc('admin_content', {
      p_kind: laBai ? 'post' : 'comment', p_status: laBai ? f.status : 'all', p_q: f.q,
      p_author: f.tacGia, p_bao_cao: f.baoCao, p_limit: TRANG, p_offset: f.trang * TRANG,
    });
    const tong = rows.length ? rows[0].tong : 0;
    $('#cTong').textContent = tong ? `${so(tong)} ${dem(tong, 'mục')}` : '';
    const box = $('#cList');
    if (!rows.length) {
      box.innerHTML = `<div class="empty">${t('Không có nội dung nào khớp bộ lọc.')}</div>`;
      pager($('#cPager'), 0, 0, () => {});
    } else {
      const tt = { approved: '', pending: `<span class="tag warn">${t('chờ duyệt')}</span>`, rejected: `<span class="tag danger">${t('đã gỡ')}</span>` };
      box.innerHTML = laBai
        ? `<div class="grid">${rows.map((r) => `
            <div class="pcard clickable" data-open="${r.id}" aria-current="${state.id === r.id}">
              <img data-photo="${esc(r.image_path)}" alt="" style="opacity:0;transition:opacity .2s">
              <div class="b">
                <div class="row" style="gap:6px">${tt[r.status] || ''}${r.so_bao_cao ? `<span class="tag danger">${r.so_bao_cao} ${t('báo cáo')}</span>` : ''}</div>
                <span style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.author_name)}</span>
                ${r.noi_dung ? `<div class="hint" style="white-space:normal">${esc(r.noi_dung)}</div>` : ''}
                <div class="hint">${esc(ago(r.created_at))} · ${r.so_thich} ${t('thích ·')} ${r.so_binh_luan} ${t('bình luận')}</div>
              </div>
            </div>`).join('')}</div>`
        : `<div class="list card" style="padding:4px 12px">${rows.map((r) => `
            <button class="item" data-open="${r.id}" aria-current="${state.id === r.id}">
              ${avatar(r.author_photo, r.author_name)}
              <span class="t">
                <span class="n">${esc(r.author_name)}${r.so_bao_cao ? `<span class="tag danger">${r.so_bao_cao} ${t('báo cáo')}</span>` : ''}${modTag(r.author_status)}</span>
                <span class="s" style="white-space:normal">${esc(r.noi_dung)}</span>
                <span class="m">${esc(ago(r.created_at))} · ${r.so_thich} ${t('thích')}</span>
              </span>
            </button>`).join('')}</div>`;
      box.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => nav('noidung/' + state.sub, el.dataset.open)));
      pager($('#cPager'), tong, f.trang, (t) => { f.trang = t; nav('noidung/' + state.sub); });
      hydratePhotos(box);
    }
    if (state.id) await renderContentPane($('#cPane'), laBai ? 'post' : 'comment', state.id);
  }

  /**
   * Chi tiết một nội dung công khai: ảnh to bấm xem được, tác giả, ai thích,
   * toàn bộ bình luận, mọi báo cáo về nó, và nhật ký quản trị.
   */
  async function renderContentPane(pane, kind, id) {
    pane.hidden = false;
    pane.innerHTML = '<div class="stack"><div class="skeleton"></div><div class="skeleton"></div></div>';
    const d = await rpc('admin_content_detail', { p_kind: kind, p_id: id });
    const quay = `<button class="btn ghost sm sheet-close" id="paneClose">${t('← Danh sách')}</button>`;
    if (d.da_xoa) {
      pane.innerHTML = `${quay}<div class="card"><h2>${t('Nội dung không còn')}</h2>
        <div class="hint">${t('Đã bị gỡ hoặc xoá.')}</div>${nhatKyNgan(d.nhat_ky)}</div>`;
      $('#paneClose', pane).onclick = () => nav('noidung/' + state.sub);
      return;
    }
    const a = d.tac_gia || {};
    const laBai = d.kind === 'post';
    const tt = { approved: `<span class="tag ok">${t('Đang hiển thị')}</span>`, pending: `<span class="tag warn">${t('Chờ duyệt')}</span>`, rejected: `<span class="tag danger">${t('Đã gỡ')}</span>` };
    pane.innerHTML = `${quay}
      <div class="stack">
        <div class="card stack" style="gap:10px">
          <div class="row" style="justify-content:space-between"><h2>${laBai ? `${t('Bài đăng')}` : `${t('Bình luận')}`}</h2>${tt[d.status] || ''}</div>
          ${laBai && d.image_path ? `<img class="photo" style="max-width:100%" data-photo="${esc(d.image_path)}" data-full data-zoom="${esc(d.image_path)}" alt="" title="${t('Bấm để xem to')}">` : ''}
          ${d.noi_dung ? `<div class="quote">${esc(d.noi_dung)}</div>` : `<div class="hint">${t('Không có chữ.')}</div>`}
          ${d.tra_loi_cho ? `<div class="hint">${t('Trả lời bình luận của')} <b>${esc(d.tra_loi_cho.tac_gia)}</b>: “${esc(d.tra_loi_cho.body)}”</div>` : ''}
          <dl class="kv">
            <dt>${t('Đăng lúc')}</dt><dd>${esc(fmtDate(d.created_at))} (${esc(ago(d.created_at))})</dd>
            <dt>${t('Lượt thích')}</dt><dd>${so(d.so_thich)}</dd>
            ${laBai ? `<dt>${t('Bình luận')}</dt><dd>${so((d.binh_luan || []).length)}</dd>` : ''}
            ${laBai && d.visibility ? `<dt>${t('Ai xem được')}</dt><dd>${esc(d.visibility)}</dd>` : ''}
            ${d.moderation_reason ? `<dt>${t('Lý do gỡ')}</dt><dd>${esc(d.moderation_reason)}</dd>` : ''}
          </dl>
          <div class="row">
            ${d.status === 'rejected'
              ? `<button class="btn ok" data-go2="tra_lai">${t('Trả lại')}</button>`
              : `<button class="btn danger" data-go2="an">${laBai ? `${t('Gỡ bài')}` : `${t('Xoá bình luận')}`}</button>`}
            <button class="btn" id="cLocTacGia">${t('Xem mọi')} ${laBai ? `${t('bài')}` : `${t('bình luận')}`} ${t('của người này')}</button>
          </div>
        </div>

        ${!laBai && d.bai ? `<div class="card stack" style="gap:8px">
          <h2>${t('Nằm dưới bài của')} ${esc(d.bai.tac_gia || '?')}</h2>
          ${d.bai.image_path ? `<img class="photo" data-photo="${esc(d.bai.image_path)}" data-zoom="${esc(d.bai.image_path)}" alt="">` : ''}
          ${d.bai.noi_dung ? `<div class="quote">${esc(d.bai.noi_dung)}</div>` : ''}
          <div class="row"><a class="btn sm" href="#noidung/bai/${d.bai.id}">${t('Mở bài đăng')}</a></div>
        </div>` : ''}

        <div class="card stack" style="gap:8px">
          <h2>${t('Người đăng')}</h2>
          <button class="item" id="cTacGia" style="padding:8px 4px">
            ${avatar(a.anh, a.ten)}
            <span class="t"><span class="n">${esc(a.ten || '?')}${a.la_admin ? `<span class="tag accent">${t('quản trị')}</span>` : ''}${modTag(a.trang_thai)}${a.canh_cao ? `<span class="tag warn">${t('cảnh cáo')} ${a.canh_cao}</span>` : ''}</span>
            <span class="m">tham gia ${esc(fmtNgay(a.tham_gia))}${a.nuoc ? ' · ' + esc(a.nuoc) : ''} · ${laBai ? `${so(a.so_bai)} ${t('bài')}` : `${so(a.so_binh_luan)} ${t('bình luận')}`}${a.bi_bao_cao ? ` ${t('· bị báo cáo')} ${a.bi_bao_cao} ${t('lần')}` : ''}</span></span>
          </button>
        </div>

        ${(d.bao_cao || []).length ? `<div class="card stack" style="gap:8px">
          <div class="sec"><h2>${t('Báo cáo về nội dung này')}</h2><span class="hint">${d.bao_cao.length}</span></div>
          <div class="list">${d.bao_cao.map((r) => `<a class="item" href="#antoan/baocao/${r.id}" style="text-decoration:none">
            <span class="t"><span class="n">${esc(REASON[r.reason] || r.reason)} <span class="tag ${r.status === 'open' ? 'warn' : 'ok'}">${esc(RSTATUS[r.status])}</span></span>
            ${r.details ? `<span class="s" style="white-space:normal">${esc(r.details)}</span>` : ''}
            <span class="m">${esc(fmtDate(r.created_at))} ${t('· từ')} ${esc(r.nguoi_bao_cao || '?')}${r.resolution ? ' · ' + esc(r.resolution) : ''}</span></span></a>`).join('')}</div>
        </div>` : ''}

        ${laBai && (d.nguoi_thich || []).length ? `<div class="card stack" style="gap:8px">
          <div class="sec"><h2>${t('Đã thích')}</h2><span class="hint">${so(d.so_thich)}${d.so_thich > d.nguoi_thich.length ? ` ${t('· hiện')} ${d.nguoi_thich.length} ${t('người gần nhất')}` : ''}</span></div>
          <div class="likers">${d.nguoi_thich.map((u) => `<a href="#nguoidung/${u.id}" title="${esc(u.ten)}">${avatar(u.anh, u.ten, true)}</a>`).join('')}</div>
        </div>` : ''}

        ${laBai ? `<div class="card stack" style="gap:4px">
          <div class="sec"><h2>${t('Bình luận')}</h2><span class="hint">${(d.binh_luan || []).length}</span></div>
          ${(d.binh_luan || []).length ? d.binh_luan.map((c) => `
            <div class="cmt${c.parent_id ? ' reply' : ''}">
              ${avatar(c.anh, c.tac_gia, true)}
              <div class="b">
                <div class="n"><a href="#nguoidung/${c.tac_gia_id}" style="color:inherit;text-decoration:none">${esc(c.tac_gia)}</a>${modTag(c.tac_gia_trang_thai)}${c.so_bao_cao ? `<span class="tag danger">${c.so_bao_cao} ${t('báo cáo')}</span>` : ''}</div>
                <div class="x">${esc(c.body)}</div>
                <div class="m">${esc(ago(c.created_at))}${c.so_thich ? ` · ${c.so_thich} ${t('thích')}` : ''} · <a href="#noidung/binhluan/${c.id}">${t('xem chi tiết')}</a></div>
              </div>
            </div>`).join('') : `<div class="hint">${t('Chưa có bình luận nào.')}</div>`}
        </div>` : ''}

        ${nhatKyNgan(d.nhat_ky)}
      </div>`;
    $('#paneClose', pane).onclick = () => nav('noidung/' + state.sub);
    $('#cTacGia', pane).onclick = () => nav('nguoidung', a.id);
    $('#cLocTacGia', pane).onclick = () => { const g = state.nd[state.sub] || state.nd.bai; g.tacGia = a.id; g.trang = 0; nav('noidung/' + state.sub); };
    const nut = pane.querySelector('[data-go2]');
    if (nut) nut.addEventListener('click', () => goNoiDung(kind, id, nut.dataset.go2, () => nav('noidung/' + state.sub)));
    hydratePhotos(pane); noiXemAnh(pane);
  }

  const nhatKyNgan = (list) => (list || []).length
    ? `<div class="card"><div class="sec"><h2>${t('Nhật ký quản trị')}</h2><span class="hint">${list.length}</span></div>
       <div class="stack" style="gap:6px">${list.map((a) => `<div class="hint">${esc(fmtDate(a.created_at))} · <b>${esc(ACTION[a.action] || a.action)}</b>${a.admin ? ' · ' + esc(a.admin) : ''}${a.note ? '<br>' + esc(a.note) : ''}</div>`).join('')}</div></div>`
    : '';

  /** Gỡ / trả lại một nội dung công khai — dùng chung cho danh sách và trang chi tiết. */
  async function goNoiDung(kind, id, act, xong) {
    if (dangGui) return;
    const laAn = act === 'an';
    const ans = await confirmAction(laAn
      ? { title: kind === 'post' ? `${t('Gỡ bài đăng')}` : `${t('Xoá bình luận')}`,
          text: kind === 'post' ? `${t('Bài biến mất khỏi mọi bảng tin. Ảnh vẫn giữ trong kho để còn trả lại được — tích ô bên dưới nếu cần xoá hẳn. Người đăng không nhận được thông báo; muốn nhắc họ thì cảnh cáo ở trang người dùng.')}`
                                : `${t('Bình luận bị xoá hẳn, không hoàn tác được.')}`,
          noteLabel: `${t('Lý do (nội bộ, chỉ nhật ký thấy)')}`, okLabel: kind === 'post' ? `${t('Gỡ')}` : `${t('Xoá')}`,
          danger: true, xoaFile: kind === 'post' }
      : { title: `${t('Trả lại bài')}`, text: `${t('Bài hiện lại trên bảng tin. Ảnh đã bị xoá thì không lấy lại được.')}`, okLabel: `${t('Trả lại')}` });
    if (!ans) return;
    dangGui = true;
    try {
      await rpc('admin_go_cong_khai', {
        p_kind: kind, p_id: id, p_hanh_dong: act,
        p_ly_do: ans.note || null, p_xoa_file: !!ans.xoaFile,
      });
      toast(laAn ? `${t('Đã gỡ')}` : `${t('Đã trả lại')}`);
      if (xong) xong(); else await render();
    } catch (e) { toast(friendly(e), true); }
    finally { dangGui = false; }
  }

  // ---------------------------------------------------------------- SỐ LIỆU
  async function renderSoLieu(main) {
    main.innerHTML = dangTai;
    // Nhu cầu trả phí đọc bảng khác — đừng gọi admin_growth cho phí một vòng.
    if (state.sub === 'nhucau') return veNhuCau(main);
    const g = await rpc('admin_growth', { p_days: state.solieu.ngay });
    if (state.sub === 'giuchan') return veGiuChan(main, g);
    if (state.sub === 'khuvuc') return veKhuVuc(main, g);
    return veTangTruong(main, g);
  }

  /**
   * NHU CẦU TRẢ PHÍ — "tường phí giả".
   * Đếm số NGƯỜI đã chạm vào từng giới hạn, trong khi app vẫn chưa chặn ai
   * và chưa bán gì. Xem GOI-TRA-PHI.md phần 6. Bảng nguồn không lưu ai đã
   * chạm — mỗi người mỗi tính năng mỗi giờ tính một lượt, thế thôi.
   */
  const TEN_TINH_NANG = {
    views_names:      'Muốn xem TÊN người đã xem mình',
    grid_depth:       'Xem hết 90 người trong lưới',
    filters_advanced: 'Dùng từ 3 nhóm lọc trở lên',
    incognito:        'Ẩn danh',
    unsend:           'Thu hồi tin nhắn',
    album_limit:      'Chạm hạn mức album',
    boost:            'Đẩy hồ sơ',
    '-':              '(không gắn tính năng)',
  };

  async function veNhuCau(main) {
    const rows = await rpc('admin_event_summary', { p_days: state.solieu.ngay });
    const chams = (rows || []).filter((r) => r.ten === 'feature_blocked');
    const dinh = Math.max(1, ...chams.map((r) => Number(r.so_luot) || 0));
    const khac = (rows || []).filter((r) => r.ten !== 'feature_blocked');
    main.innerHTML = khung(`${t('Nhu cầu trả phí')}`, `${t('Trong')} ${state.solieu.ngay} ${t('ngày gần đây. Mỗi người · mỗi tính năng · mỗi giờ tính MỘT lượt, nên con số này là "bao nhiêu người khác nhau đã chạm vào", không phải số lần bấm. App hiện KHÔNG chặn gì và KHÔNG bán gì — đây chỉ là đo nhu cầu.')}`, `
      <div class="row" style="justify-content:flex-end">
        <div class="chips" id="ngayChips">${[7, 30, 90].map((d) => `<button class="chip" data-d="${d}" aria-pressed="${state.solieu.ngay === d}">${d} ${t('ngày')}</button>`).join('')}</div>
      </div>
      <div class="card">
        <div class="sec"><h2>${t('Người dùng chạm vào giới hạn nào')}</h2><span class="hint">${t('xếp theo số người, nhiều nhất trước')}</span></div>
        ${chams.length ? `<div class="funnel">${chams.map((r) => `<div class="fstep">
            <span>${esc(t(TEN_TINH_NANG[r.tinh_nang] || r.tinh_nang))}</span>
            <span class="bar"><i style="width:${Math.max(1, pct(Number(r.so_luot) || 0, dinh))}%"></i></span>
            <span class="n">${so(r.so_luot)}</span></div>`).join('')}</div>`
          : `<div class="hint">${t('Chưa có lượt nào. Hoặc chưa ai chạm tới giới hạn, hoặc bản app đang cài trên máy chưa có phần đo — phần đo thêm ở bản vá 049.')}</div>`}
        <div class="hint" style="margin-top:10px">${t('Nếu sau 30 ngày mà bảng này gần như trống, đừng xây gói trả phí — tường phí sẽ không bán được gì. Đó là một kết luận có ích, không phải một thất bại.')}</div>
      </div>
      ${khac.length ? `<div class="card scrollx">
        <div class="sec"><h2>${t('Sự kiện khác')}</h2></div>
        <table class="tbl"><thead><tr><th>${t('Sự kiện')}</th><th>${t('Tính năng')}</th><th class="num">${t('Số người')}</th><th>${t('Gần nhất')}</th></tr></thead>
        <tbody>${khac.map((r) => `<tr><td>${esc(r.ten)}</td><td>${esc(t(TEN_TINH_NANG[r.tinh_nang] || r.tinh_nang))}</td><td class="num">${so(r.so_luot)}</td><td>${esc(fmtNgay(r.lan_gan_nhat))}</td></tr>`).join('')}</tbody></table>
      </div>` : ''}`);
    main.querySelectorAll('#ngayChips .chip').forEach((c) => c.addEventListener('click', () => { state.solieu.ngay = Number(c.dataset.d); render(); }));
  }

  function veTangTruong(main, g) {
    const hn = g.hom_nay || {}; const ph = g.phieu || {};
    const buoc = [
      [`${t('Đăng ký')}`, ph.dang_ky],
      [`${t('Có ảnh đại diện')}`, ph.co_anh],
      [`${t('Đã đăng hoặc nhắn')}`, ph.co_hoat_dong],
      [`${t('Trò chuyện hai chiều')}`, ph.co_tro_chuyen_hai_chieu],
    ];
    const dinh = Number(ph.dang_ky) || 1;
    main.innerHTML = khung(`${t('Tăng trưởng')}`, `${t('Số liệu')} ${state.solieu.ngay} ${t('ngày gần đây. "Hoạt động" đếm theo ngày người dùng thực sự mở app.')}`, `
      <div class="tiles">
        <div class="tile"><div class="v">${so(hn.dau)}</div><div class="l">${t('hoạt động hôm nay (DAU)')}</div></div>
        <div class="tile"><div class="v">${so(hn.wau)}</div><div class="l">${t('hoạt động 7 ngày (WAU)')}</div></div>
        <div class="tile"><div class="v">${so(hn.mau)}</div><div class="l">${t('hoạt động 30 ngày (MAU)')}</div></div>
        <div class="tile"><div class="v">${g.dinh_dinh != null ? g.dinh_dinh + '%' : '—'}</div><div class="l">${t('DAU/MAU — độ dính')}</div></div>
        <div class="tile"><div class="v">${so(hn.tong)}</div><div class="l">${dem(hn.tong, 'tổng tài khoản')}</div></div>
        <div class="tile"><div class="v">${so(hn.moi_hom_nay)}</div><div class="l">${dem(hn.moi_hom_nay, 'đăng ký hôm nay')}</div></div>
        <div class="tile"><div class="v">${so(hn.moi_7d)}</div><div class="l">${dem(hn.moi_7d, 'đăng ký 7 ngày')}</div></div>
        <div class="tile"><div class="v">${so(hn.moi_30d)}</div><div class="l">${dem(hn.moi_30d, 'đăng ký 30 ngày')}</div></div>
      </div>
      <div class="row" style="justify-content:flex-end">
        <div class="chips" id="ngayChips">${[14, 30, 90].map((d) => `<button class="chip" data-d="${d}" aria-pressed="${state.solieu.ngay === d}">${d} ${t('ngày')}</button>`).join('')}</div>
      </div>
      <div class="charts">${bieuDo(g.series, 'dang_ky', `${t('Đăng ký mới')}`)}${bieuDo(g.series, 'dau', `${t('Người mở app mỗi ngày')}`)}${bieuDo(g.series, 'tin', `${t('Tin nhắn')}`)}${bieuDo(g.series, 'bai', `${t('Bài đăng')}`)}${bieuDo(g.series, 'bao_cao', `${t('Báo cáo')}`)}</div>
      <div class="card">
        <div class="sec"><h2>${t('Phễu: từ đăng ký đến trò chuyện thật')}</h2><span class="hint">${t('tính trên toàn bộ tài khoản')}</span></div>
        <div class="funnel">${buoc.map(([ten, v]) => `<div class="fstep"><span>${esc(ten)}</span>
          <span class="bar"><i style="width:${Math.max(1, pct(Number(v) || 0, dinh))}%"></i></span>
          <span class="n">${so(v)} · ${pct(Number(v) || 0, dinh)}%</span></div>`).join('')}</div>
        <div class="hint" style="margin-top:10px">${t('"Trò chuyện hai chiều" = có ít nhất một cuộc mà cả hai bên đều nhắn, trong 90 ngày. Đây là con số dự đoán giữ chân tốt nhất của app hẹn hò — kế hoạch 12 tháng đặt mốc ≥ 40%.')}</div>
      </div>`);
    main.querySelectorAll('#ngayChips .chip').forEach((c) => c.addEventListener('click', () => { state.solieu.ngay = Number(c.dataset.d); render(); }));
  }

  function veGiuChan(main, g) {
    const rows = g.giu_chan || [];
    const o = (v, co) => co
      ? `<span class="rate"><i><b style="width:${Math.min(100, v)}%"></b></i><span>${v}%</span></span>`
      : `<span class="hint">${t('chưa đủ ngày')}</span>`;
    main.innerHTML = khung(`${t('Giữ chân')}`, `${t('Bao nhiêu phần trăm người đăng ký một ngày quay lại sau 1, 7 và 30 ngày.')} ${g.do_tu ? `${t('Số liệu bắt đầu được ghi từ')} <b>${esc(fmtNgay(g.do_tu))}</b> ${t('— nhóm nào đăng ký trước đó thì chưa có đủ dữ liệu, và ô đó để trống chứ không đoán.')}` : `${t('Chưa có dữ liệu — bảng ngày-hoạt-động vừa được tạo, số liệu sẽ đầy dần từ hôm nay.')}`}`, `
      <div class="card scrollx">
        <table class="tbl">
          <thead><tr><th>${t('Nhóm đăng ký')}</th><th class="num">${t('Số người')}</th><th>${t('D1 — quay lại hôm sau')}</th><th>D7</th><th>D30</th></tr></thead>
          <tbody>${rows.length ? rows.map((r) => `<tr>
            <td>${esc(fmtNgay(r.nhom))}</td>
            <td class="num">${so(r.so_nguoi)}</td>
            <td>${o(pct(r.d1, r.so_nguoi), r.du_lieu_d1)}</td>
            <td>${o(pct(r.d7, r.so_nguoi), r.du_lieu_d7)}</td>
            <td>${o(pct(r.d30, r.so_nguoi), r.du_lieu_d30)}</td>
          </tr>`).join('') : `<tr><td colspan="5"><div class="empty">${t('Chưa có nhóm nào trong 60 ngày qua.')}</div></td></tr>`}</tbody>
        </table>
      </div>
      <div class="card">
        <div class="sec"><h2>${t('Mốc cần đạt')}</h2></div>
        <div class="hint">${t('Kế hoạch 12 tháng đặt cổng:')} <b>D7 ≥ 25%</b> ${t('để ra khỏi giai đoạn thử nghiệm, và')} <b>D30 ≥ 12%</b> ${t('trước khi tiêu tiền quảng cáo. Dưới mốc đó thì quảng cáo chỉ là đổ người vào một cái xô thủng.')}</div>
      </div>`);
  }

  function veKhuVuc(main, g) {
    const nuoc = g.theo_nuoc || []; const tp = g.theo_thanh_pho || []; const nn = g.theo_ngon_ngu || {};
    const tongN = nuoc.reduce((a, x) => a + x.n, 0) || 1;
    const tongT = tp.reduce((a, x) => a + x.n, 0) || 1;
    main.innerHTML = khung(`${t('Khu vực & ngôn ngữ')}`, `${t('Người dùng ở đâu và nói tiếng gì — để biết nên ra mắt thành phố nào tiếp theo và dịch trước cho ngôn ngữ nào.')}`, `
      <div class="card scrollx">
        <div class="sec"><h2>${t('Theo nước')}</h2><span class="hint">${t('khai trong hồ sơ')}</span></div>
        <table class="tbl"><thead><tr><th>${t('Nước')}</th><th class="num">${t('Tài khoản')}</th><th style="width:35%"></th><th class="num">${t('Hoạt động 30 ngày')}</th></tr></thead>
        <tbody>${nuoc.map((x) => `<tr><td>${esc(x.ten)}</td><td class="num">${so(x.n)}</td>
          <td><span class="rate"><i><b style="width:${pct(x.n, tongN)}%"></b></i></span></td>
          <td class="num">${so(x.hd_30d)}</td></tr>`).join('')}</tbody></table>
      </div>
      <div class="card scrollx">
        <div class="sec"><h2>${t('Theo thành phố')}</h2><span class="hint">${t('ước lượng: thành phố gần ô lưới ~550 m nhất, chỉ tính người hoạt động 30 ngày')}</span></div>
        <table class="tbl"><thead><tr><th>${t('Thành phố')}</th><th>${t('Nước')}</th><th class="num">${t('Người')}</th><th style="width:35%"></th></tr></thead>
        <tbody>${tp.length ? tp.map((x) => `<tr><td>${esc(x.ten)}</td><td>${esc(x.nuoc)}</td><td class="num">${so(x.n)}</td>
          <td><span class="rate"><i><b style="width:${pct(x.n, tongT)}%"></b></i></span></td></tr>`).join('')
          : `<tr><td colspan="4"><div class="empty">${t('Chưa có ai bật vị trí.')}</div></td></tr>`}</tbody></table>
      </div>
      ${bangDem(`${t('Ngôn ngữ nhận thông báo')}`, nn, {})}`);
  }

  // ---------------------------------------------------------------- HỆ THỐNG
  async function renderHeThong(main) {
    if (state.sub === 'nhatky') return renderLog(main);
    main.innerHTML = dangTai;
    const sy = await rpc('admin_system');
    const baoMat = await theBaoMat();
    // HIMO Plus (063): absent on a server without 063 → the card is simply not shown.
    let bh = null;
    try { bh = await rpc('admin_billing_health'); } catch (e) { bh = null; }
    // Đã sang trang khác trong lúc chờ (các lời gọi trên mất vài trăm ms): đừng vẽ đè trang mới.
    if ((location.hash.replace(/^#/, '').split('/')[0] || 'tongquan') !== 'hethong') return;
    const hc = sy.hang_cho || {}; const d = sy.dich || {}; const tb = sy.thong_bao || {};
    const ka = sy.kho_anh || {}; const hr = sy.hang_rao || {};
    const tyLeDich = pct(d.ky_tu_thang, d.han_muc_deepl_free);
    main.innerHTML = khung(`${t('Vận hành')}`, `${t('Hàng chờ, hạn mức dịch vụ ngoài, và hàng rào bảo mật — những thứ hỏng âm thầm nếu không ai nhìn.')}`, `
      ${baoMat}
      ${tyLeDich >= 80 ? `<div class="alertbar warn"><div><b>${t('Hạn mức dịch đã dùng')} ${tyLeDich}%</b><br>${t('Gói DeepL miễn phí là 500.000 ký tự/tháng. Hết hạn mức thì nút Dịch tự ẩn, app không lỗi.')}</div></div>` : ''}
      ${hc.ket_qua_2h > 0 ? `<div class="alertbar warn"><div><b>${hc.ket_qua_2h} ${t('ảnh kẹt ở "đang chờ" quá 2 giờ')}</b><br>${t('Thường là Sightengine hết hạn mức hoặc Edge Function lỗi. Duyệt tay ở nhóm An toàn, và xem Edge Functions → Logs.')}</div></div>` : ''}
      ${hr.ham_ho_cho_public > 0 ? `<div class="alertbar"><div><b>${hr.ham_ho_cho_public} ${t('hàm đang mở cho mọi người')}</b><br>${t('Có bản vá nào quên')} <code>seal_api()</code>${t('. Báo ngay cho Claude.')}</div></div>` : ''}
      <div class="card">
        <div class="sec"><h2>${t('Hàng chờ duyệt ảnh')}</h2></div>
        <div class="tiles">
          <div class="tile"><div class="v">${so(hc.anh_ho_so)}</div><div class="l">${dem(ka.anh_ho_so, 'ảnh đại diện')}</div></div>
          <div class="tile"><div class="v">${so(hc.bai)}</div><div class="l">${dem(ka.anh_bai, 'ảnh bài đăng')}</div></div>
          <div class="tile"><div class="v">${so(hc.album)}</div><div class="l">${dem(ka.anh_album, 'ảnh album')}</div></div>
          <div class="tile${hc.ket_qua_2h ? ' alert' : ''}"><div class="v">${so(hc.ket_qua_2h)}</div><div class="l">${t('kẹt quá 2 giờ')}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="sec"><h2>${t('Dịch tin nhắn')}</h2><span class="hint">${t('DeepL, gói miễn phí 500.000 ký tự/tháng')}</span></div>
        <div class="funnel"><div class="fstep"><span>${t('Tháng này')}</span>
          <span class="bar"><i style="width:${Math.min(100, tyLeDich)}%"></i></span>
          <span class="n">${so(d.ky_tu_thang)} / ${so(d.han_muc_deepl_free)} · ${tyLeDich}%</span></div></div>
        <div class="hint" style="margin-top:8px">${t('Hôm nay')} ${so(d.ky_tu_hom_nay)} ${t('ký tự ·')} ${so(d.nguoi_dung_thang)} ${t('người dùng nút Dịch trong tháng.')}</div>
      </div>
      <div class="card">
        <div class="sec"><h2>${t('Thông báo đẩy')}</h2></div>
        <div class="tiles">
          <div class="tile"><div class="v">${so(tb.co_token)}</div><div class="l">${dem(tb.co_token, 'máy đã bật thông báo')}</div></div>
          <div class="tile"><div class="v">${so(tb.tat_xem_truoc)}</div><div class="l">${t('tắt xem trước nội dung')}</div></div>
          <div class="tile"><div class="v">${so(tb.gui_24h)}</div><div class="l">${dem(tb.gui_24h, 'thông báo trong 24 giờ')}</div></div>
          <div class="tile"><div class="v">${so(tb.chua_doc)}</div><div class="l">${t('chưa đọc')}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="sec"><h2>${t('Kho ảnh')}</h2><span class="hint">${t('số file trong Storage — dùng để ước tiền băng thông')}</span></div>
        <div class="tiles">
          <div class="tile"><div class="v">${so(ka.anh_ho_so)}</div><div class="l">${t('ảnh đại diện')}</div></div>
          <div class="tile"><div class="v">${so(ka.anh_bai)}</div><div class="l">${t('ảnh bài đăng')}</div></div>
          <div class="tile"><div class="v">${so(ka.anh_album)}</div><div class="l">${t('ảnh album')}</div></div>
          <div class="tile"><div class="v">${so(ka.anh_chat)}</div><div class="l">${dem(ka.anh_chat, 'ảnh trong chat')}</div></div>
        </div>
      </div>
      <div class="card scrollx">
        <div class="sec"><h2>${t('Quản trị viên')}</h2><span class="hint">${t('thêm/bớt bằng SQL Editor — xem 06-Trang-quan-tri/README.md')}</span></div>
        <table class="tbl"><thead><tr><th>${t('Tên')}</th><th>${t('Ghi chú')}</th><th>${t('Từ')}</th><th>${t('Nhận đẩy')}</th></tr></thead>
        <tbody>${(sy.quan_tri || []).map((a) => `<tr><td><a href="#nguoidung/${a.id}">${esc(a.ten || a.id)}</a></td><td>${esc(a.ghi_chu || '')}</td>
          <td>${esc(fmtNgay(a.tu))}</td><td>${a.co_thong_bao ? `${t('có')}` : `<span style="color:var(--danger)">${t('không')}</span>`}</td></tr>`).join('')}</tbody></table>
        <div class="hint" style="margin-top:8px">${t('Quản trị viên không bật thông báo trong app thì sẽ không nhận được đẩy "Báo cáo mới".')}</div>
      </div>
      ${bh ? theThanhToan(bh) : ''}
      ${bangDem(`${t('Số dòng trong từng bảng')}`, sy.bang, {})}
      <div class="card">
        <div class="sec"><h2>${t('Hàng rào bảo mật')}</h2></div>
        <dl class="kv">
          <dt>${t('Hàm cho phép gọi')}</dt><dd>${so(hr.ham_trong_danh_sach_trang)} ${t('tên trong danh sách trắng')}</dd>
          <dt>${t('Hàm hở')}</dt><dd>${hr.ham_ho_cho_public > 0 ? `<b style="color:var(--danger)">${hr.ham_ho_cho_public}</b> ${t('— phải bằng 0')}` : `${t('0 — đúng')}`}</dd>
          <dt>${t('Việc 24 giờ')}</dt><dd>${so(sy.viec_24h)} ${t('hành động quản trị')}</dd>
        </dl>
      </div>`);
    noiBaoMat(main);
  }

  function theThanhToan(bh) {
    const st = bh.settings || {}; const ev = bh.events || {};
    const onOff = (v) => (v ? `<b>${t('bật')}</b>` : t('tắt'));
    return `
      ${bh.gave_up > 0 ? `<div class="alertbar warn"><div><b>${t('Có sự kiện thanh toán bỏ cuộc')}: ${so(bh.gave_up)}</b><br>${t('Người mua có thể chưa nhận được quyền lợi. Xem bảng billing_events (status = failed) và log của Edge Function billing-worker.')}</div></div>` : ''}
      <div class="card">
        <div class="sec"><h2>${t('HIMO Plus — thanh toán')}</h2><span class="hint">${t('chỉ đọc · trạng thái do máy chủ xác minh qua RevenueCat')}</span></div>
        <dl class="kv">
          <dt>${t('Đang bán')}</dt><dd>${onOff(st.sales_enabled)}</dd>
          <dt>${t('Cổng Plus')}</dt><dd>${onOff(st.plus_gates_enforced)}</dd>
          <dt>${t('Quyền thử nghiệm sandbox')}</dt><dd>${onOff(st.sandbox_tester_access)}</dd>
          <dt>${t('Ưu đãi khi đăng ký (ngày)')}</dt><dd>${so(st.signup_promo_days)}</dd>
        </dl>
        <div class="tiles" style="margin-top:8px">
          <div class="tile"><div class="v">${so(bh.active_store_production)}</div><div class="l">${t('thuê bao cửa hàng đang hoạt động')}</div></div>
          <div class="tile"><div class="v">${so(bh.active_promo)}</div><div class="l">${t('ưu đãi đang hoạt động')}</div></div>
          <div class="tile"><div class="v">${so(bh.testers)}</div><div class="l">${t('người thử')}</div></div>
          <div class="tile${bh.gave_up ? ' alert' : ''}"><div class="v">${so(bh.gave_up)}</div><div class="l">${t('sự kiện bỏ cuộc sau 12 lần')}</div></div>
        </div>
        <div class="hint" style="margin-top:8px">${t('Hàng đợi webhook')}: ${Object.entries(ev).map(([k, n]) => `${esc(k)} ${so(n)}`).join(' · ') || '0'}${bh.oldest_due ? ` · ${t('đến hạn sớm nhất')} ${esc(fmtNgay(bh.oldest_due))}` : ''}</div>
      </div>`;
  }

  // ---------------------------------------------------------------- NHẬT KÝ
  async function renderLog(main) {
    const f = state.nk;
    main.innerHTML = `<div class="stack" style="padding-top:14px">
      <div><h1>${t('Nhật ký')}</h1><p class="sub">${t('Mọi hành động của mọi quản trị viên, kể cả mỗi lần mở nội dung riêng và mỗi lần bị từ chối. Không ai sửa hay xoá được nhật ký này; máy chủ chỉ tự xoá dòng cũ hơn thời hạn lưu (mặc định 2 năm).')}</p></div>
      <div class="filters">
        <input id="lQ" placeholder="${t('Tên người, ghi chú…')}" value="${esc(f.q)}" autocomplete="off">
        <select id="lAct">${[['all', `${t('Mọi loại')}`], ['xem', `${t('Xem nội dung riêng')}`], ['tu_choi', `${t('Bị từ chối')}`], ['report', `${t('Xử lý báo cáo')}`], ['status', `${t('Khoá / mở khoá')}`], ['photo', `${t('Duyệt ảnh')}`], ['content', `${t('Gỡ nội dung')}`], ['warn', `${t('Cảnh cáo')}`], ['delete', `${t('Xoá tài khoản')}`], ['ADMIN_ROLE', `${t('Đổi vai trò quản trị')}`], ['billing', `${t('Thanh toán (thủ công)')}`]].map(([k, l]) => `<option value="${k}" ${f.action === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="list card" id="lList" style="padding:4px 12px"><div class="skeleton"></div></div>
      <div class="pager" id="lPager"></div></div>`;
    const doiLoc = () => { f.q = $('#lQ').value.trim(); f.action = $('#lAct').value; f.trang = 0; nav('hethong/nhatky'); };
    $('#lAct').onchange = doiLoc;
    $('#lQ').onkeydown = (e) => { if (e.key === 'Enter') doiLoc(); };
    const rows = await rpc('admin_actions_log', { p_q: f.q, p_action: f.action, p_limit: TRANG, p_offset: f.trang * TRANG });
    const tong = rows.length ? rows[0].tong : 0;
    $('#lList').innerHTML = rows.length ? rows.map((a) => `
      <div class="item" style="cursor:default">
        <span class="t">
          <span class="n">${esc(ACTION[a.action] || ACTION[a.action_type] || a.action)}${a.result === 'denied' ? ` <span class="tag danger">${t('bị từ chối')}</span>` : ''} ${a.target_name ? `<a href="#nguoidung/${a.target_user}" style="font-weight:600">${esc(a.target_name)}</a>` : (a.target_user ? `<span class="hint">${esc(String(a.target_user).slice(0, 8))}…</span>` : '')}${a.target_kind ? `<span class="tag">${esc(KIND[a.target_kind] || a.target_kind)}</span>` : ''}</span>
          ${a.reason ? `<span class="s" style="white-space:normal">${t('Lý do')}: ${esc(a.reason)}</span>` : ''}
          ${a.note ? `<span class="s" style="white-space:normal">${esc(a.note)}</span>` : ''}
          <span class="m">${esc(fmtDate(a.created_at))} · ${esc(a.admin_name || `${t('admin')}`)}${a.actor_role ? ' · ' + esc(a.actor_role) : ''}${a.aal ? ' · ' + esc(a.aal) : ''}</span>
        </span>
      </div>`).join('') : `<div class="empty">${t('Không có hành động nào khớp bộ lọc.')}</div>`;
    pager($('#lPager'), tong, f.trang, (t) => { f.trang = t; nav('hethong/nhatky'); });
  }

  // ---------------------------------------------------------------- ĐĂNG NHẬP / KHỞI ĐỘNG
  async function showApp(session) {
    $('#login').hidden = true; $('#app').hidden = false;
    veNgonNgu(); veManDangNhap();
    $('#whoEmail').textContent = session.user.email || '';
    if (!location.hash) location.hash = '#tongquan';
    await render();
    startAuto();
  }
  async function showLogin(msg) {
    clearInterval(autoTimer); autoTimer = null;
    clearInterval(freshTimer); freshTimer = null;
    $('#app').hidden = true; $('#login').hidden = false;
    veNgonNgu(); veManDangNhap();
    $('#loginErr').textContent = msg || '';
  }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn'); btn.disabled = true; $('#loginErr').textContent = '';
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email: $('#email').value.trim().toLowerCase(), password: $('#pw').value });
      if (error) throw error;
      // Tài khoản đã bật hai lớp: phiên phải lên aal2 trước khi hỏi is_admin (047/065).
      if (await canXacThuc() && !(await xacThucHaiLop())) { await sb.auth.signOut(); throw new Error(t('Cần mã xác thực hai lớp để vào trang quản trị.')); }
      const ok = await rpc('is_admin');
      if (!ok) { await sb.auth.signOut(); throw new Error('unavailable'); }
      $('#pw').value = '';
      await showApp(data.session);
    } catch (x) { $('#loginErr').textContent = friendly(x); }
    finally { btn.disabled = false; }
  });
  // --- Quên mật khẩu (trang quản trị) ---------------------------------------
  // Gửi email đặt lại mật khẩu về đúng trang dat-lai-mat-khau.html nằm cạnh file này.
  // Mở bằng file:// thì không dùng được đường dẫn cục bộ (Supabase chỉ nhận http/https),
  // nên rơi về địa chỉ đã đăng trên GitHub Pages.
  const TRANG_DAT_LAI = /^https?:$/.test(location.protocol)
    ? new URL('dat-lai-mat-khau.html', location.href).href
    : 'https://vhoang203.github.io/Himo/dat-lai-mat-khau.html';
  $('#lgForgot').addEventListener('click', async () => {
    const note = $('#loginNote'), btn = $('#lgForgot');
    const em = $('#email').value.trim().toLowerCase();
    note.hidden = true; $('#loginErr').textContent = '';
    if (!/^\S+@\S+\.\S+$/.test(em)) { $('#loginErr').textContent = t('Nhập email của bạn ở ô trên rồi bấm lại.'); return; }
    btn.disabled = true;
    try {
      const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: TRANG_DAT_LAI });
      if (error) throw error;
      // Luôn báo cùng một câu, dù email có tồn tại hay không — để người ngoài
      // không dò được ai là quản trị viên.
      note.textContent = t('Nếu email này là tài khoản HIMO, chúng tôi vừa gửi liên kết đặt lại mật khẩu. Kiểm tra cả mục Spam.');
      note.hidden = false;
    } catch (x) { $('#loginErr').textContent = friendly(x); }
    finally { btn.disabled = false; }
  });

  $('#logout').addEventListener('click', async () => { await sb.auth.signOut(); location.hash = ''; showLogin(); });

  veNgonNgu(); veManDangNhap();
  document.documentElement.lang = lang;

  (async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      try {
        if (await canXacThuc() && !(await xacThucHaiLop())) throw new Error('aal2');
        if (await rpc('is_admin')) return showApp(data.session);
      } catch (e) { /* rơi xuống đăng nhập */ }
      await sb.auth.signOut();
    }
    showLogin();
  })();
})();

/* CSP: không còn handler inline (script-src 'self'). Nút "Tải lại" trong thông báo lỗi dùng data-reload. */
document.addEventListener('click', function (e) {
  var t = e.target && e.target.closest ? e.target.closest('[data-reload]') : null;
  if (t) location.reload();
});
