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
  // ---------------------------------------------------------------- chế độ sáng / tối
  // Công tắc trên đầu trang (và ở màn đăng nhập). Lựa chọn nằm trong localStorage 'himo-admin-theme' và được admin-giao-dien.js đặt
  // lên <html data-theme> trước khi trang vẽ. Chưa chọn gì → theo máy. Toàn bộ màu của trang là biến CSS nên đổi là xong ngay.
  const mauMay = () => { try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; } };
  const mauDangDung = () => { const c = document.documentElement.getAttribute('data-theme'); return c === 'light' || c === 'dark' ? c : mauMay(); };
  function apDungMau() {
    const c = document.documentElement.getAttribute('data-theme');
    // logo: <picture> chọn bản tối theo máy; khi người dùng tự chọn thì ép theo lựa chọn đó
    document.querySelectorAll('.brand picture source').forEach((s) => { s.media = c === 'dark' ? 'all' : c === 'light' ? 'not all' : '(prefers-color-scheme: dark)'; });
    const toi = mauDangDung() === 'dark';
    document.querySelectorAll('.theme-sw').forEach((b) => {
      b.title = toi ? t('Chuyển sang nền sáng') : t('Chuyển sang nền tối');
      b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', String(toi));
    });
  }
  function doiMau() {
    const moi = mauDangDung() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', moi);
    try { localStorage.setItem('himo-admin-theme', moi); } catch (e) { /* bỏ qua: vẫn đổi cho lần mở này */ }
    apDungMau();
  }
  document.querySelectorAll('.theme-sw').forEach((b) => b.addEventListener('click', doiMau));
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apDungMau); } catch (e) { /* trình duyệt cũ */ }

  function veNgonNgu() {
    apDungMau();                     // nhãn của công tắc theo ngôn ngữ; logo theo chế độ
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
    const lm = $('#lamMoi'); if (lm) { lm.title = t('Làm mới số liệu ngay'); lm.setAttribute('aria-label', lm.title); }
    document.title = t('Quản trị') + ' · HIMO';
  }
  const locale = () => (lang === 'en' ? 'en-GB' : 'vi-VN');
  /** Tên nước theo mã ISO 2 chữ, theo ngôn ngữ đang chọn; trình duyệt không có Intl.DisplayNames thì trả lại mã. */
  const tenNuoc = (ma) => {
    if (!ma || !/^[A-Za-z]{2}$/.test(ma)) return ma || '';
    try { return new Intl.DisplayNames([locale()], { type: 'region' }).of(ma.toUpperCase()) || ma; } catch (e) { return ma; }
  };
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
    document.body.innerHTML = `<div class="login"><div class="card"><h2>${t('Chưa cấu hình')}</h2><p class="hint">${t('Thiếu config.js (SUPABASE_URL, SUPABASE_ANON_KEY) hoặc không tải được thư viện. Kiểm tra mạng rồi tải lại trang.')}</p></div></div>`;
    return;
  }
  // Phiên quản trị CHỈ nằm trong bộ nhớ của trang này (kiểm toán bảo mật 21/10, C02): sessionStorage được trình duyệt
  // khôi phục cùng thẻ khi "Mở lại thẻ vừa đóng" (Ctrl+Shift+T) / khôi phục phiên — người dùng chung máy mở lại được trang
  // quản trị đã xác thực hai lớp mà không cần mật khẩu hay mã. Nay: tải lại, nhân bản thẻ, mở lại thẻ vừa đóng đều phải
  // đăng nhập lại (mật khẩu + mã hai lớp) — đúng mức thận trọng cho một trang xem được dữ liệu người dùng.
  try { window.sessionStorage.removeItem('himo-admin'); } catch (e) { /* bản cũ để lại; không có sessionStorage thì thôi */ }
  const boNhoPhien = (() => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } };
  })();
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'himo-admin', storage: boNhoPhien },
  });
  // Rời trang (đóng thẻ, tải lại, điều hướng đi): thu hồi phiên ở máy chủ (refresh token hết dùng được), không chờ kết quả.
  window.addEventListener('pagehide', () => {
    try {
      const s = JSON.parse(boNhoPhien.getItem('himo-admin') || 'null');
      if (!s || !s.access_token) return;
      fetch(cfg.SUPABASE_URL + '/auth/v1/logout?scope=local', { method: 'POST', keepalive: true,
        headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access_token } }).catch(() => undefined);
      boNhoPhien.removeItem('himo-admin');
    } catch (e) { /* trang đang đóng — không có gì để báo */ }
  });
  // Trang quay lại từ bộ nhớ đệm lùi / tiến (bfcache) sau khi đã thu hồi phiên → tải lại để về màn đăng nhập.
  window.addEventListener('pageshow', (ev) => { if (ev.persisted) location.reload(); });

  // ---------------------------------------------------------------- tiện ích
  const REASON = {}, KIND = {}, RSTATUS = {}, MOD = {}, ACTION = {}, LOAI_SK = {}, LY_DO_SK = {};
  function veTuDien() {
    Object.assign(REASON, { fake: `${t('Giả mạo')}`, harassment: `${t('Quấy rối')}`, underage: `${t('Dưới 18 tuổi')}`, scam: `${t('Lừa đảo')}`, inappropriate: `${t('Nội dung phản cảm')}`, other: `${t('Khác')}`,
      hate: `${t('Thù ghét / phân biệt')}`, violence: `${t('Đe doạ / bạo lực')}`, spam: `${t('Spam / lừa đảo')}`, impersonation: `${t('Mạo danh')}`,
      privacy: `${t('Xâm phạm riêng tư')}`, ncii: `${t('Ảnh thân mật không đồng ý')}`, sexual: `${t('Tình dục bị cấm')}`, ip: `${t('Bản quyền')}` });
    Object.assign(KIND, { profile: `${t('Hồ sơ')}`, post: `${t('Bài đăng')}`, comment: `${t('Bình luận')}`, message: `${t('Tin nhắn')}`, album: `${t('Ảnh album')}`, unknown: `${t('Không rõ (báo cáo cũ)')}`, user: `${t('Tài khoản')}`, none: '—',
      story: `${t('Story')}`, moment: `${t('Bộ sưu tập')}`, anh_tu_xoa: `${t('Ảnh tự xoá')}`, bai_hat: `${t('Bài hát trên hồ sơ')}`, group: `${t('Nhóm')}`, group_poll: `${t('Bình chọn')}`, group_event: `${t('Sự kiện')}`,
      follow_request: `${t('Lời mời theo dõi')}`, message_request: `${t('Lời mời nhắn tin')}` });
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
      name_override: `${t('Cho đổi tên một lần')}`,   // 101
    });
    Object.assign(KIND, { conversation: `${t('Hội thoại')}`, promo: `${t('Ưu đãi')}`, admin: `${t('Quản trị viên')}`, report: `${t('Báo cáo')}`, chat: `${t('Ảnh chat')}`, media: `${t('Ảnh')}` });
    // 151 — sự kiện, nước chỉ trực tuyến, bằng chứng nhóm
    Object.assign(ACTION, {
      ADMIN_HIDE_EVENT: `${t('Ẩn sự kiện')}`, ADMIN_RESTORE_EVENT: `${t('Hiện lại sự kiện')}`,
      ADMIN_RESTRICT_COUNTRY: `${t('Thêm nước chỉ trực tuyến')}`, ADMIN_UNRESTRICT_COUNTRY: `${t('Bỏ nước chỉ trực tuyến')}`,
      ADMIN_VIEW_BILLING: `${t('Xem thanh toán của một người')}`, ADMIN_APPEAL_DECIDE: `${t('Quyết khiếu nại xử phạt')}`, ADMIN_LEGAL_REQUEST: `${t('Ghi yêu cầu pháp lý')}`,
      ADMIN_VIEW_GROUP_EVIDENCE: `${t('Mở tin bị gỡ khỏi nhóm')}`, ADMIN_DELETE_CONTENT: `${t('Gỡ nội dung')}`,
    });
    Object.assign(KIND, { event: `${t('Sự kiện')}`, event_cover: `${t('Ảnh bìa sự kiện')}`, country: `${t('Quốc gia')}` });
    Object.assign(LOAI_SK, { pride: 'Pride', tiec: `${t('Tiệc')}`, the_thao: `${t('Thể thao')}`, hoi_thao: `${t('Hội thảo')}`,
      tinh_nguyen: `${t('Tình nguyện')}`, ca_phe: `${t('Cà phê')}`, khac: `${t('Khác')}` });
    Object.assign(LY_DO_SK, { bay: `${t('Có thể là bẫy, không an toàn')}`, gia_mao: `${t('Giả mạo')}`, '18_plus': `${t('Nội dung 18+')}`,
      spam: `${t('Spam, quảng cáo')}`, khac: `${t('Lý do khác')}` });
  }
  veTuDien();

  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    // rà soát 15/11: ghi múi giờ (người xem ở Mỹ / Canada / VN); tiếng Anh theo dạng Mỹ
    let vung = '';
    try { vung = (new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName') || {}).value || ''; } catch (e) { vung = ''; }
    return lang === 'en'
      ? `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}${vung ? ' ' + vung : ''}`
      : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}${vung ? ' ' + vung : ''}`;
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
    if (/mfa_required/.test(m)) return `${t('Cần xác thực hai lớp. Vào Hệ thống → Vận hành để bật.')}`;   // 166c
    if (/reason_required/.test(m)) return `${t('Cần ghi lý do (ít nhất 3 ký tự).')}`;                       // 166c
    // audit 16/11: máy chủ thiếu một hàm (chưa áp bản vá) → nói rõ, thay vì dòng lỗi kỹ thuật tiếng Anh của PostgREST
    if ((e && e.code === 'PGRST202') || /Could not find the function/i.test(m)) return `${t('Máy chủ chưa có chức năng này (thiếu một bản vá SQL).')}`;
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
  /** rieng = tệp vừa được cấp quyền xem có ghi nhật ký (admin_mo_anh / bằng chứng): URL sống 120 giây và KHÔNG vào bộ nhớ đệm —
   *  URL có chữ ký là vé ai cầm cũng dùng được, đừng để nó sống lâu hơn việc xem (rà soát 15/11). */
  /** 182 (16/11/2026): hình dạng an toàn của một đường dẫn tệp — giống ràng buộc SQL 182. createSignedUrl (ký MỘT tệp) đặt đường dẫn
   *  vào ĐỊA CHỈ yêu cầu; một đường dẫn có "../" do người dùng ghi vào hồ sơ lái yêu cầu mang phiên của quản trị viên sang địa chỉ
   *  khác (ví dụ hàm xoá tài khoản). Nên: (1) đường dẫn không khớp → không gọi gì; (2) ký THEO LÔ — đường dẫn nằm trong thân JSON. */
  const DUONG_DAN_TEP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}){1,5}$/;
  const duongDanSach = (p) => typeof p === 'string' && p.length <= 300 && DUONG_DAN_TEP.test(p);
  async function photoUrl(path, thumb, rieng) {
    if (!path) return null;
    if (!duongDanSach(path)) return null;
    const key = (thumb ? 't:' : 'f:') + path;
    const c = rieng ? null : urlCache.get(key); if (c && c.exp > Date.now()) return c.url;
    const tryPath = async (p) => {
      if (!duongDanSach(p)) return null;
      const { data, error } = await sb.storage.from('photos').createSignedUrls([p], rieng ? 120 : 600);
      const d = !error && Array.isArray(data) ? data[0] : null;
      return d && !d.error && d.signedUrl ? d.signedUrl : null;
    };
    let url = thumb ? await tryPath(thumbOf(path)) : null;
    if (!url) url = await tryPath(path);
    if (url && !rieng) {
      if (urlCache.size > 400) {   // dọn mục hết hạn, đừng để phình mãi
        const gio = Date.now();
        urlCache.forEach((v, k) => { if (v.exp <= gio) urlCache.delete(k); });
      }
      urlCache.set(key, { url, exp: Date.now() + 8 * 60 * 1000 });
    }
    return url;
  }
  /** Gắn ảnh vào các <img data-photo> sau khi render (không chặn việc vẽ danh sách). */
  /**
   * 091 (bạn bè): số bạn bè thật lấy từ admin_ban_be (friendships / close_friends / friend_requests). follows chỉ còn là
   * LỊCH SỬ (đóng băng từ 091) và được ghi nhãn như vậy. Máy chủ chưa có 091 → hàm không có → giữ dòng theo dõi cũ như trước.
   */
  function hydrateBanBe(root) {
    (root || document).querySelectorAll('[data-ban-be]').forEach(async (el) => {
      const id = el.getAttribute('data-ban-be'); el.removeAttribute('data-ban-be');
      let d = null;
      try { d = await rpc('admin_ban_be', { p_user: id }); } catch (e) { d = null; }
      if (!d) return;
      const ls = d.lich_su_theo_doi || {};
      el.innerHTML = `${so(d.ban_be)} ${t('bạn bè')} · ${t('Bạn thân đã chọn')} ${so(d.ban_than_da_chon)} · ${t('được chọn làm Bạn thân')} ${so(d.duoc_chon_ban_than)} · ${t('lời mời chờ')} ${so(d.loi_moi_den)}/${so(d.loi_moi_di)} (${t('đến/đi')})`
        + ` <span class="hint" title="${esc(t('follows đóng băng từ 091: lịch sử, không cấp quyền'))}">· ${t('theo dõi cũ (lịch sử)')} ${so(ls.nguoi_theo_doi || 0)}/${so(ls.dang_theo_doi || 0)}</span>`;
    });
  }
  /** Thẻ "Bạn bè (091)" ở trang Hệ thống: cặp bạn bè (một dòng mỗi cặp), lời mời, Bạn thân, hoạt động 30 ngày. */
  function hydrateBanBeTong(root) {
    (root || document).querySelectorAll('[data-ban-be-tong]').forEach(async (el) => {
      el.removeAttribute('data-ban-be-tong');
      let d = null;
      try { d = await rpc('admin_ban_be', { p_user: null, p_days: 30 }); } catch (e) { d = null; }
      if (!d) { el.innerHTML = `<div class="card"><div class="sec"><h2>${t('Bạn bè')}</h2></div><div class="hint">${t('Máy chủ chưa có bản vá 091 (bạn bè): chưa có số liệu.')}</div></div>`; return; }
      const k = d.ky || {}; const ls = d.lich_su_theo_doi || {};
      el.innerHTML = `<div class="card"><div class="sec"><h2>${t('Bạn bè')}</h2><span class="hint">${t('một cặp bạn bè = một dòng; mỗi người trong cặp có thêm một bạn')}</span></div>
        <div class="tiles">
          <div class="tile"><div class="v">${so(d.cap_ban_be)}</div><div class="l">${t('cặp bạn bè')}</div></div>
          <div class="tile"><div class="v">${so(d.nguoi_co_ban)}</div><div class="l">${t('người có ít nhất một bạn')}</div></div>
          <div class="tile"><div class="v">${so(d.loi_moi_dang_cho)}</div><div class="l">${t('lời mời đang chờ')}</div></div>
          <div class="tile"><div class="v">${so(d.ban_than)}</div><div class="l">${t('dòng Bạn thân còn hiệu lực')}</div></div>
        </div>
        <dl class="kv" style="margin-top:8px">
          <dt>${t('30 ngày')}</dt><dd>${so(k.loi_moi_gui)} ${t('lời mời gửi')} · ${so(k.chap_nhan)} ${t('chấp nhận')} · ${so(k.tu_choi)} ${t('từ chối')} · ${so(k.rut_lai)} ${t('rút lại')} · ${so(k.huy_ket_ban)} ${t('huỷ kết bạn')} · ${so(k.chan_khi_la_ban)} ${t('chặn khi đang là bạn')} · ${so(k.nguoi_ket_ban)} ${t('người đã gửi hoặc chấp nhận lời mời')}</dd>
          <dt>${t('Chuyển đổi 091')}</dt><dd>${d.chuyen_doi ? `${so(d.chuyen_doi.cap_ban_be)} ${t('cặp từ theo dõi hai chiều')} · ${so(d.chuyen_doi.ban_than_luu_tru)} ${t('Bạn thân cũ đã lưu trữ (ngừng hiệu lực)')} · ${esc(fmtNgay(d.chuyen_doi.chuyen_doi_luc))}` : '—'}</dd>
          <dt>${t('Lịch sử theo dõi')}</dt><dd>${so(ls.dong_follows)} ${t('dòng follows')} · ${so(ls.yeu_cau_theo_doi_cu)} ${t('yêu cầu theo dõi cũ')} <span class="hint">(${t('đóng băng từ 091 — không cấp quyền, không phải bạn bè')})</span></dd>
        </dl></div>`;
    });
  }
  function hydratePhotos(root) {
    hydrateBanBe(root); hydrateBanBeTong(root);
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
      self_report: `${t('Nội dung của chính bạn — để một quản trị viên khác quyết định.')}`,   // 083
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
  /** Gọi một RPC nhạy cảm; gặp mfa_required thì mời nhập mã rồi gọi lại một lần.
   *  loiRieng: câu riêng cho một mã lỗi của màn gọi (vd. forbidden ở danh sách nước chỉ trực tuyến). */
  async function goiNhayCam(name, args, loiRieng) {
    let d = await rpc(name, args);
    if (d && d.error === 'mfa_required') {
      if (await canXacThuc()) { if (await xacThucHaiLop()) d = await rpc(name, args); }
      else {
        // Đã aal2 mà máy chủ vẫn từ chối: yếu tố chưa được chủ dự án duyệt (065, admin_mfa_duyet).
        try { const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
          if (data && data.currentLevel === 'aal2') { toast(t('Yếu tố xác thực hai lớp của bạn chưa được chủ dự án duyệt. Nhờ chủ dự án duyệt rồi thử lại.'), true); return null; } } catch (e) { /* bỏ qua */ }
      }
    }
    if (d && d.error) { toast((loiRieng && loiRieng[d.error]) || LOI_NHAY_CAM[d.error] || d.error, true); return null; }
    return d;
  }
  /** 166c: khoá / cấm / xoá tài khoản cần phiên hai lớp — máy chủ ném 'mfa_required' → xác thực rồi thử lại MỘT lần. */
  async function rpcHaiLop(name, args) {
    try { return await rpc(name, args); } catch (e) {
      if (!/mfa_required/.test((e && e.message) || '')) throw e;
      if (!(await canXacThuc()) || !(await xacThucHaiLop())) throw e;
      return rpc(name, args);
    }
  }
  /** Xin quyền đọc ảnh riêng (ghi nhật ký) rồi lấy URL có chữ ký. */
  async function moAnhRieng(paths, lyDo) {
    let d;
    try { d = await goiNhayCam('admin_mo_anh', { p_paths: paths, p_reason: lyDo }); }
    catch (e) { if (!laChuaCo(e)) throw e; d = { cu: true }; }   // máy chủ trước 065: chưa có quyền xem có nhật ký — đọc theo luật cũ của máy chủ đó
    if (!d) return {};
    const out = {};
    for (const pth of paths) { urlCache.delete('f:' + pth); urlCache.delete('t:' + pth); out[pth] = await photoUrl(pth, false, true); }
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
  async function docHoiThoai(convId, lyDo, truoc) {
    // rà soát 15/11: quá 300 tin → "Tải 300 tin cũ hơn" (p_before; máy chủ ghi nhật ký mỗi lần)
    const d = await goiNhayCam('admin_xem_hoi_thoai', { p_conversation: convId, p_reason: lyDo, p_limit: 300, ...(truoc ? { p_before: truoc } : {}) }); if (!d) return;
    const ms = d.messages || [];
    const coCuHon = ms.length >= 300 && ms[0] && ms[0].created_at;
    modalRong(`<h2>${t('Tin nhắn')}</h2><p>${t('Hiện tối đa 300 tin gần nhất. Tin đã thu hồi không còn nội dung trên máy chủ.')}</p>
      ${coCuHon ? `<div class="row" style="margin-bottom:8px"><button class="btn sm" id="mCuHon">${t('Tải 300 tin cũ hơn (ghi nhật ký)')}</button></div>` : ''}${truoc ? `<div class="hint">${t('Đang xem tin trước')} ${esc(fmtDate(truoc))}</div>` : ''}
      <div>${ms.length ? ms.map((x) => `<div class="msg"><span class="who">${esc(x.sender_name || String(x.sender_id).slice(0, 8))}</span><span class="when">${esc(fmtDate(x.created_at))}</span>
        ${x.recalled_at ? `<div class="body hint">${t('(đã thu hồi)')}</div>` : ''}
        ${x.body ? `<div class="body">${esc(x.body)}</div>` : ''}
        ${x.image_path ? `<div><button class="btn sm" data-anh="${esc(x.image_path)}">${t('Mở ảnh (ghi nhật ký)')}</button></div>` : ''}
        ${x.lat != null && x.lng != null ? `<div class="hint">📍 ${esc(Number(x.lat).toFixed(5))}, ${esc(Number(x.lng).toFixed(5))}</div>` : ''}</div>`).join('') : `<div class="empty">${t('Không có tin nhắn.')}</div>`}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="mCancel">${t('Đóng')}</button></div>`, (m) => {
      $('#mCancel', m).onclick = () => closeModal();
      if ($('#mCuHon', m)) $('#mCuHon', m).onclick = () => { docHoiThoai(convId, lyDo, ms[0].created_at); };
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
  // Thứ tự (15/11): việc phải làm hằng ngày đứng trước, phần để hiểu người dùng đứng sau, kỹ thuật cuối cùng. `muc` = tên mục
  // trên thanh bên (màn rộng). Trong An toàn: hàng đợi có hạn trước (báo cáo, ảnh, xác minh, quét Story), rồi mới tới tra cứu.
  const NHOM = [
    { k: 'tongquan',  ten: 'Tổng quan', subs: [] },
    { k: 'antoan',    ten: 'An toàn',   badge: 'badgeReports', muc: 'Việc hằng ngày',
      subs: [['baocao', 'Báo cáo'], ['anh', 'Duyệt ảnh'], ['xacminh', 'Xác minh selfie'], ['quetstory', 'Quét Story'], ['phat', 'Đang bị phạt'], ['khieunai', 'Khiếu nại xử phạt'], ['taipham', 'Bị báo cáo nhiều lần'], ['bangchung', 'Tin bị gỡ khỏi nhóm'], ['phaply', 'Yêu cầu pháp lý']] },
    { k: 'nguoidung', ten: 'Người dùng', subs: [] },
    // 151: số sự kiện cần xử lý có badge riêng ở Nội dung — badge An toàn giữ đúng nghĩa "việc có hạn 24 giờ" (báo cáo + ảnh chờ).
    { k: 'noidung',   ten: 'Nội dung',  badge: 'badgeNoiDung',
      subs: [['bai', 'Bài đăng'], ['binhluan', 'Bình luận'], ['sukien', 'Sự kiện'], ['nhandan', 'Nhãn dán']] },
    { k: 'phantich',  ten: 'Phân tích', muc: 'Hiểu người dùng',
      subs: [['chienluoc', 'Chiến lược'], ['chandung', 'Chân dung người dùng'], ['nguoithat', 'Người thật'], ['vanhanh', 'Vận hành'], ['chuyensau', 'Chuyên sâu'], ['stories', 'Stories'], ['sukien', 'Sự kiện & tin thoại'], ['goiy', 'Gợi ý Nearby']] },
    { k: 'solieu',    ten: 'Số liệu',
      subs: [['tangtruong', 'Tăng trưởng'], ['doanhthu', 'Doanh thu'], ['giuchan', 'Giữ chân'], ['khuvuc', 'Khu vực & ngôn ngữ'], ['nhucau', 'Nhu cầu trả phí']] },
    { k: 'hethong',   ten: 'Hệ thống', muc: 'Kỹ thuật',
      subs: [['vanhanh', 'Vận hành'], ['succhua', 'Sức chứa & nâng cấp'], ['nhatky', 'Nhật ký'], ['nuoc', 'Nước chỉ trực tuyến'], ['chongvuot', 'Chứng thực & giới hạn']] },
  ];
  // Biểu tượng của thanh bên: SVG vẽ tay, nằm ngay trong trang (CSP không cho tải từ ngoài).
  const BT = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    tongquan: BT('<rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>'),
    antoan: BT('<path d="M12 3l8 3v6c0 4.6-3.2 8-8 9-4.8-1-8-4.4-8-9V6l8-3z"/><path d="M9 12l2.2 2.2L15.2 10"/>'),
    nguoidung: BT('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8"/><path d="M18.5 14.9c1.6.8 2.7 2.5 3 5.1"/>'),
    noidung: BT('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 15.5l-5-5-8.5 9"/>'),
    phantich: BT('<path d="M3 3v18h18"/><path d="M7 14.5l4-4 3 3 5.5-6.5"/>'),
    solieu: BT('<path d="M5 20v-9"/><path d="M12 20V5"/><path d="M19 20v-6"/><path d="M2.5 20h19"/>'),
    hethong: BT('<path d="M4 6h8"/><path d="M18 6h2"/><circle cx="15" cy="6" r="2.2"/><path d="M4 12h2"/><path d="M12 12h8"/><circle cx="9" cy="12" r="2.2"/><path d="M4 18h8"/><path d="M18 18h2"/><circle cx="15" cy="18" r="2.2"/>'),
  };
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
    sk: { loc: 'can_xu_ly', q: '', trang: 0 },     // 151 — sự kiện
    tqKy: 30,                                       // 19/11 — dashboard Tổng quan: 7 / 30 / 90 ngày
    bcn: { trang: 0 },                              // 151 — tin bị gỡ khỏi nhóm
    xm: { trang: 0 },                               // 149 — hàng đợi xác minh selfie
    solieu: { ngay: 30 },
    pt: { ngay: 30 },
    // 167 — Chân dung người dùng: bộ lọc + hai chiều của bảng chéo. `nen` = kết quả KHÔNG lọc gần nhất (danh sách nước / ngôn ngữ).
    cd: { quoc_gia: [], tuoi: [], vai_tro: [], dang_nguoi: [], tinh_trang: [], dang_tim: [], ngon_ngu: [], hoat_dong: 'all', dang_ky: 'all',
      plus: 'all', xac_minh: 'all', noi_bo: false, ca_bi_khoa: false, cheo_a: 'quoc_gia', cheo_b: 'vai_tro', kieu: 'hang', moThem: false, nen: null },
    // 168 — Doanh thu: kỳ + bộ lọc. kieu = biểu đồ theo tiền ('tien') hay số giao dịch ('gd').
    // 202 — theo kỳ: nhom (ngay | tuan | thang | nam), ky (khoảng dựng sẵn hoặc 'tuy_chon' + tu / den), ss (so sánh), so (số liệu của biểu đồ). Nhớ theo từng quản trị viên.
    dt: { ngay: 30, moi_truong: 'PRODUCTION', cua_hang: '', san_pham: '', quoc_gia: '', kieu: 'tien', nhom: 'ngay', ky: 'thang_nay', tu: '', den: '', ss: 'khong', so: 'thuc_nhan' },
    nuoc: null,
    sc: { ky: 30 },                                 // 218 — Sức chứa & nâng cấp: xu hướng 7 / 30 ngày
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
    $('#gnav').innerHTML = NHOM.map((n) => `${n.muc ? `<div class="gsec" role="presentation">${esc(t(n.muc))}</div>` : ''}<button class="tab" role="tab" data-nhom="${n.k}" aria-selected="${n.k === state.nhom}">${ICON[n.k] || ''}<span class="tab-t">${esc(t(n.ten))}</span>${n.badge ? ` <span class="badge" id="${n.badge}" hidden></span>` : ''}</button>${n.k === state.nhom && n.subs.length
      ? `<div class="gsubs" role="group">${n.subs.map(([k, l]) => `<button class="gsub" data-gsub="${k}" aria-current="${k === state.sub}">${esc(t(l))}</button>`).join('')}</div>` : ''}`).join('');
    $('#gnav').querySelectorAll('[data-nhom]').forEach((b) => b.addEventListener('click', () => nav(b.dataset.nhom)));
    $('#gnav').querySelectorAll('[data-gsub]').forEach((b) => b.addEventListener('click', () => nav(state.nhom + '/' + b.dataset.gsub)));
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
      document.title = (n > 0 ? `(${n}) ` : '') + t('Quản trị') + ' · HIMO';   // rà soát 15/11: thấy việc chờ khi thẻ ở nền
    } catch (e) { /* im lặng */ }
    badgeSuKien();
  }
  /** 151: sự kiện cần xử lý (chờ duyệt + bị ẩn + bị báo cáo). Máy chủ chưa có 151 hoặc vai trò không xem được → thôi hẳn, im lặng. */
  let coBadgeSuKien = true;
  async function badgeSuKien() {
    if (!coBadgeSuKien) return;
    try {
      const d = await rpc('admin_su_kien_ds', { p_loc: 'can_xu_ly', p_q: null, p_limit: 1, p_offset: 0 });
      const k = (d && d.dem) || {};
      const n = (Number(k.cho_duyet) || 0) + (Number(k.an) || 0) + (Number(k.bao_cao) || 0);
      const b = $('#badgeNoiDung');
      if (b) { b.hidden = !(n > 0); b.textContent = n; b.title = t('Sự kiện cần xử lý'); }
    } catch (e) {
      if (laChuaCo(e) || /forbidden/.test((e && e.message) || '')) coBadgeSuKien = false;
    }
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
  // Vẽ TUẦN TỰ (25/10/2026): trước đây hai lượt vẽ chạy song song — lượt cũ (vd. Tổng quan đang chờ 3 RPC lúc vừa đăng nhập)
  // xong muộn rồi ghi đè #main của trang vừa mở, hoặc làm trang mới vỡ ("Cannot set properties of null"). Nay một lượt chạy tới
  // hết; yêu cầu đến trong lúc đó được gộp thành MỘT lượt vẽ lại ngay sau, đọc địa chỉ (#…) lúc đó. Lượt treo quá 20 giây thì
  // không chặn lượt mới nữa (mạng hỏng): lượt treo vẫn chỉ ghi được vào #main cũ nếu showLogin đã thay #main.
  let dangVe = null, dangVeTu = 0, veLai = false;
  // rà soát 15/11: nút "Tải lại" trong thông báo lỗi chỉ vẽ lại (location.reload() thu hồi phiên ở pagehide)
  document.addEventListener('himo-tai-lai', () => { render(); });
  function render() {
    if (dangVe && Date.now() - dangVeTu < 20_000) { veLai = true; return dangVe; }
    const p = (async () => {
      try { do { veLai = false; await veMotLan(); } while (veLai && !$('#app').hidden); }
      finally { if (dangVe === p) dangVe = null; }
    })();
    dangVe = p; dangVeTu = Date.now();
    return p;
  }
  async function veMotLan() {
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
        else if (state.sub === 'bangchung') await renderBangChung(main);
        else if (state.sub === 'xacminh') await renderXacMinh(main);
        else if (state.sub === 'quetstory') await renderQuetStory(main);
        else if (state.sub === 'khieunai') await renderKhieuNai(main);
        else if (state.sub === 'phaply') await renderPhapLy(main);
        else await renderAnToan(main);
      } else if (state.nhom === 'nguoidung') await renderUsers(main);
      else if (state.nhom === 'noidung') await (state.sub === 'sukien' ? renderSuKien(main) : state.sub === 'nhandan' ? renderNhanDan(main) : renderNoiDung(main));
      else if (state.nhom === 'solieu') await renderSoLieu(main);
      else if (state.nhom === 'phantich') await renderPhanTich(main);
      else await renderHeThong(main);
      if (luot !== luotVe) return;        // đã có lượt vẽ mới hơn
      hydratePhotos(main);
      veBaoDong(main);                    // 218: dải đỏ trên mọi trang khi đường thư đỏ
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
    if (state.nhom === 'solieu' && state.sub === 'doanhthu') {      // 202 — khối theo kỳ: đừng vẽ lại dưới tay người đang thao tác
      const d = state.dt, a0 = document.activeElement;
      if (d.mtMo && document.getElementById('dtkMtForm')) return false;                    // đang mở ô đặt mục tiêu
      if (d.loiNgay || d.tuNhap != null || d.denNhap != null) return false;                 // đang nhập dở khoảng tuỳ chọn
      if (a0 && a0.classList && a0.closest && a0.closest('.dtk') && (a0.classList.contains('pt-bar') || a0.classList.contains('dtk-mt'))) return false;   // tiêu điểm bàn phím đang ở một cột biểu đồ / dòng mục tiêu
    }
    if (state.nhom === 'tongquan') { const a1 = document.activeElement; if (a1 && a1.closest && a1.closest('#tqGoc') && a1.matches('.tq-svg, .pt-svg, .pt-bar, .pt-hc, .pt-hrow')) return false; }
    // Bảng Chiến lược / Chuyên sâu dùng để đọc và suy nghĩ: không tự vẽ lại giữa chừng. Vận hành thì có.
    if (state.nhom === 'phantich' && state.sub !== 'vanhanh' && state.sub !== 'chandung') return false;
    // Quét Story có video đang phát; danh sách nước có ô nhập đang gõ dở: đừng vẽ lại giữa chừng.
    if ((state.nhom === 'antoan' && state.sub === 'quetstory') || (state.nhom === 'hethong' && state.sub === 'nuoc')) return false;
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return false;
    // Kiểm toán 17/11 (K3): vừa chạm / bấm trong 10 giây qua → đừng vẽ lại danh sách dưới tay người đang thao tác (thẻ xê dịch, cú bấm kế
    // tiếp rơi nhầm đối tượng). Lượt tự làm mới kế tiếp (một phút sau) sẽ chạy khi tay đã rời.
    if (Date.now() - chamCuoi < 10_000) return false;
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
  // 22/11 (mục 48, QT-1): chỉ xét "bỏ mặc" khi trang quản trị ĐANG MỞ. Ở màn đăng nhập (kể cả hộp nhập mã hai lớp) mọi lần chạm chỉ là
  // chạm — trước đây chamCuoi chỉ được đặt lại khi đăng nhập xong, nên sau lần tự đăng xuất phím đầu tiên ở màn đăng nhập lại đăng xuất
  // ngay phiên vừa đăng nhập (và đóng hộp nhập mã): không đăng nhập lại được nếu không tải lại trang.
  const dangMoTrang = () => !$('#app').hidden;
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, () => {
      // Kiểm toán 17/11: máy ngủ thì bộ hẹn 15 giây không chạy — lần chạm đầu sau khi mở máy phải bị xét là "đã bỏ mặc quá 30 phút" trước
      if (dangMoTrang() && Date.now() - chamCuoi >= NGHI_MS) { kiemTraBoMac(); return; }
      chamCuoi = Date.now();
    }, { passive: true, capture: true }));
  async function kiemTraBoMac() {
    if (!dangMoTrang() || Date.now() - chamCuoi < NGHI_MS) return;
    clearInterval(autoTimer); autoTimer = null;
    clearInterval(freshTimer); freshTimer = null;
    chamCuoi = Date.now();   // QT-1: đồng hồ bỏ mặc bắt đầu lại từ màn đăng nhập
    try { await sb.auth.signOut({ scope: 'local' }); } catch (e) {}
    location.hash = '';
    showLogin(t('Đã tự đăng xuất vì bạn không dùng trang trong 30 phút.'));
  }

  // Nút ↻ trên đầu trang: tải lại số liệu ngay (các bảng Chiến lược / Chuyên sâu không tự làm mới — bấm nút này).
  $('#lamMoi').addEventListener('click', () => { autoRefresh(true); });
  // 19/11: chỉ nút ↻ mới bỏ bộ nhớ 5 phút của Tổng quan (quay lại thẻ trình duyệt thì không — tránh hỏi lại 9 hàm nặng)
  $('#lamMoi').addEventListener('pointerdown', () => tqXoa()); $('#lamMoi').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') tqXoa(); });

  function startAuto() {
    clearInterval(autoTimer); clearInterval(freshTimer);
    chamCuoi = Date.now();
    autoTimer = setInterval(() => { autoRefresh(false); }, AUTO_MS);
    freshTimer = setInterval(() => { showFreshness(); kiemTraBoMac(); }, 15_000);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (dangMoTrang() && Date.now() - chamCuoi >= NGHI_MS) { kiemTraBoMac(); return; }   // kiểm toán 17/11: quay lại thẻ sau hơn 30 phút → đăng xuất, không tải dữ liệu mới
    if (Date.now() - lastLoad < 20_000) return;
    if (canAuto()) autoRefresh(true); else { refreshBadges(); showFreshness(); }
  });

  // ---------------------------------------------------------------- TỔNG QUAN
  // Một màn hình duy nhất trả lời: hôm nay có gì phải làm ngay, và app đang
  // lớn lên hay đứng yên. Bấm vào ô nào là nhảy thẳng vào nhóm đó.
  async function renderTongQuan(main) {
    if (!main.querySelector('#tqGoc')) main.innerHTML = dangTai;      // tự làm mới mỗi phút: giữ màn hình tới khi có số mới
    // 19/11 — dashboard: việc chờ (báo cáo, ảnh) lấy mới mỗi lượt; các khối tổng hợp nặng giữ 5 phút (tqCham) để lượt tự làm mới mỗi phút không đè máy chủ.
    // Khối nào máy chủ chưa có (production còn ở nền 29/10) → null → không vẽ.
    const ky = [7, 30, 90].includes(state.tqKy) ? state.tqKy : 30;
    const cham = (ten, fn) => tqCham(`${ten}|${ky}|${new Date().toISOString().slice(0, 10)}`, ten, fn);   // khoá có NGÀY UTC: qua nửa đêm UTC là lấy lại
    const [s, sf, g, cd, dthu, vh, cl, sy, st, sk, bb] = await Promise.all([
      rpc('admin_stats', { p_days: 14 }), rpc('admin_safety'), cham('g', () => rpc('admin_growth', { p_days: Math.min(180, Math.max(ky * 2, 42)) })),   // kỳ này + kỳ trước + ≥ 6 tuần làm mốc "cùng thứ"
      cham('cd', () => rpc('admin_pt_chan_dung', { p_loc: {} }).catch(() => null)),     // 167: máy chủ chưa có → không hiện thẻ "Người dùng là ai"
      ky === 30 ? rpc('admin_doanh_thu', { p_loc: { ngay: 30, tz: muiGio() } }).catch(() => null)   // 168: chưa có / không có quyền → không hiện khối Doanh thu
        : rpc('admin_doanh_thu', { p_loc: { ngay: ky, tz: muiGio() } }).catch(() => null),
      cham('vh', () => rpc('admin_pt_van_hanh', { p_tz: muiGio() })),
      cham('cl', () => rpc('admin_pt_chien_luoc', { p_days: ky })),
      cham('sy', () => rpc('admin_system')),
      cham('st', () => rpc('admin_pt_stories', { p_days: ky })),
      cham('sk', () => rpc('admin_pt_su_kien', { p_days: ky })),
      cham('bb', () => rpc('admin_ban_be', { p_user: null, p_days: ky })),
    ]);
    const sla = sf.sla || {}; const hn = g.hom_nay || {};
    const canhBao = [];
    const choAnh = (sf.anh_cho || {});
    const tongAnh = (choAnh.ho_so || 0) + (choAnh.bai || 0) + (choAnh.album || 0);
    // 171c (Q11): mức 1 có đồng hồ 1 giờ; máy chủ chưa có 171 thì các khoá này không có → không hiện
    if (sla.muc1_qua_1h > 0) canhBao.push({ m: 'danger', t: `${sla.muc1_qua_1h} ${dem(sla.muc1_qua_1h, 'báo cáo khẩn đã quá 1 giờ')}`, p: `${t('Báo cáo mức 1 (trẻ vị thành niên, ảnh riêng tư bị phát tán, đe doạ) cần xem trước mọi việc khác.')}`, go: 'antoan/baocao' });
    else if (sla.muc1_mo > 0) canhBao.push({ m: 'danger', t: `${sla.muc1_mo} ${dem(sla.muc1_mo, 'báo cáo khẩn đang chờ')}`, p: `${t('Mức 1 có hạn 1 giờ.')}`, go: 'antoan/baocao' });
    if (sla.qua_24h > 0) canhBao.push({ m: 'danger', t: `${sla.qua_24h} ${dem(sla.qua_24h, 'báo cáo đã quá 24 giờ')}`, p: `${t('Apple xem mốc 24 giờ là cam kết. Xử lý ngay.')}`, go: 'antoan/baocao' });
    else if (sla.tu_18_24h > 0) canhBao.push({ m: 'warn', t: `${sla.tu_18_24h} ${dem(sla.tu_18_24h, 'báo cáo sắp quá 24 giờ')}`, p: `${t('Còn dưới 6 tiếng để xử lý.')}`, go: 'antoan/baocao' });
    else if (s.reports_open > 0) canhBao.push({ m: 'warn', t: `${s.reports_open} ${dem(s.reports_open, 'báo cáo đang chờ')}`, p: sla.gio_lau_nhat != null ? `${t('Cái lâu nhất đã mở')} ${Math.round(sla.gio_lau_nhat)} ${t('giờ — còn trong hạn 24 giờ.')}` : '', go: 'antoan/baocao' });
    if (sla.ve_minh > 0) canhBao.push({ m: 'warn', t: `${sla.ve_minh} ${dem(sla.ve_minh, 'báo cáo về chính bạn')}`, p: `${t('Bạn không tự xử lý được báo cáo về mình — cần một quản trị viên khác. Các báo cáo này không tính vào đồng hồ 24 giờ của bạn.')}`, go: 'antoan/baocao' });
    const kh = sla.khac || {}; const khQua = (kh.khieu_nai_anh_qua_24h || 0) + (kh.selfie_qua_24h || 0) + (kh.su_kien_qua_24h || 0);
    if (khQua > 0) canhBao.push({ m: 'danger', t: `${khQua} ${dem(khQua, 'việc khác đã chờ quá 24 giờ')}`,
      p: [kh.khieu_nai_anh_qua_24h ? `${kh.khieu_nai_anh_qua_24h} ${t('khiếu nại ảnh')}` : '', kh.selfie_qua_24h ? `${kh.selfie_qua_24h} ${t('selfie chờ duyệt')}` : '', kh.su_kien_qua_24h ? `${kh.su_kien_qua_24h} ${t('sự kiện chờ duyệt')}` : ''].filter(Boolean).join(' · '),
      go: kh.khieu_nai_anh_qua_24h ? 'antoan/anh' : kh.selfie_qua_24h ? 'antoan/xacminh' : 'noidung/sukien' });
    if (tongAnh > 0) canhBao.push({ m: 'warn', t: `${tongAnh} ${dem(tongAnh, 'ảnh đang chờ duyệt')}`, p: choAnh.gio_lau_nhat ? `${t('Cái lâu nhất đã chờ')} ${Math.round(choAnh.gio_lau_nhat)} ${t('giờ.')}` : '', go: 'antoan/anh' });
    if (!canhBao.length) canhBao.push({ m: 'ok', t: `${t('Không có việc gấp')}`, p: `${t('Mọi báo cáo đã đóng, hàng chờ ảnh trống.')}`, go: 'antoan/baocao' });

    const PT = window.HIMO_PT;
    if (!PT || !PT.tongQuan) { main.innerHTML = khung(t('Tổng quan'), '', `<div class="empty">${t('Chưa tải được bảng Tổng quan. Tải lại trang.')}</div>`); return; }
    const ctxPt = { t, esc, so, nav, fmtNgay, locale, lang: () => lang, tenNuoc };
    const laAi = PT && PT.chanDungTomTat ? PT.chanDungTomTat(cd, ctxPt) : '';
    // giữ tiêu điểm bàn phím qua lượt vẽ lại (tự làm mới mỗi phút / đổi kỳ)
    const a0 = document.activeElement; const giuTd = a0 && main.contains(a0) ? (a0.dataset.d ? `#tqKy [data-d="${a0.dataset.d}"]` : a0.dataset.cuon ? `[data-cuon="${a0.dataset.cuon}"]` : a0.dataset.go ? `[data-go="${a0.dataset.go}"]` : null) : null;
    PT.tongQuan(main, { ky, s, sf, g, cd, dthu, vh, cl, sys: sy, st, sk, bb, laAi, canhBao, thieuMay: tqThieu, tenLyDo: (k) => REASON[k] || k,
      cuoiHtml: `<div class="hint">${t('Xử lý báo cáo trong 24 giờ là điều khoản dễ bị gỡ app nhất — xem quy trình ở')} <code>supabase/BAO-CAO.md</code>.</div>` }, ctxPt);
    if (PT.chuGiai) PT.chuGiai(main);
    main.querySelectorAll('#tqKy [data-d]').forEach((b) => b.addEventListener('click', () => { state.tqKy = Number(b.dataset.d); render(); }));   // qua hàng đợi vẽ (không vẽ đè màn khác)
    main.querySelectorAll('[data-go]').forEach((el) => {
      el.addEventListener('click', () => nav(el.dataset.go));
      if (el.getAttribute('role') === 'link') el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(el.dataset.go); } });
    });
    if (giuTd) { const el = main.querySelector(giuTd); if (el) el.focus({ preventScroll: true }); }
  }

  /** 19/11 — bộ nhớ ngắn cho các khối tổng hợp nặng của Tổng quan (5 phút). Hàm máy chủ CHƯA CÓ → nhớ "chưa có" (null) và ghi vào tqThieu;
   *  lỗi khác (hết giờ, mạng) → null cho lượt này nhưng KHÔNG giữ, lượt sau hỏi lại. Bấm ↻ / đăng xuất → xoá hết. */
  const tqNho = new Map(); const tqThieu = new Set();
  function tqCham(khoa, ten, fn) {
    const x = tqNho.get(khoa);
    if (x && Date.now() - x.luc < 300_000) return x.p;
    const p = Promise.resolve().then(fn).then((v) => v, (e) => { if (laChuaCo(e)) { tqThieu.add(ten); return null; } tqNho.delete(khoa); return null; });
    tqNho.set(khoa, { luc: Date.now(), p });
    return p;
  }
  const tqXoa = () => { tqNho.clear(); tqThieu.clear(); };

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
          <select id="fKind"><option value="all">${t('Mọi loại')}</option>${['profile', 'post', 'comment', 'message', 'album', 'story', 'moment', 'anh_tu_xoa', 'group', 'group_poll', 'group_event', 'follow_request', 'message_request', 'unknown'].map((k) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${KIND[k]}</option>`).join('')}</select>
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
          <span class="n">${esc(r.reported_name || `${t('Đã xoá')}`)} ${r.priority === 1 ? `<span class="tag danger">${t('Khẩn')}</span>` : ''}<span class="tag${r.priority === 1 ? ' danger' : r.priority === 2 ? ' warn' : ''}">${esc(REASON[r.reason] || r.reason)}</span><span class="tag accent">${esc(KIND[r.kind])}</span>${modTag(r.reported_status)}${r.other_open ? `<span class="tag warn">+${r.other_open} ${t('báo cáo khác')}</span>` : ''}</span>
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
        ${sla.muc1_mo != null ? ((kq) => `<div class="tiles" style="margin-top:8px">
          <div class="tile${sla.muc1_mo ? ' alert' : ''}"><div class="v">${so(sla.muc1_mo)}</div><div class="l">${t('mức 1 (khẩn) đang mở')}</div></div>
          <div class="tile${sla.muc1_qua_1h ? ' alert' : ''}"><div class="v">${so(sla.muc1_qua_1h)}</div><div class="l">${t('mức 1 đã quá 1 giờ')}</div></div>
          <div class="tile"><div class="v">${so(sla.ve_minh)}</div><div class="l">${t('về chính bạn (người khác xử lý)')}</div></div>
          <div class="tile${kq ? ' alert' : ''}"><div class="v">${so(kq)}</div><div class="l">${t('việc khác quá 24 giờ')}</div></div>
        </div><div class="hint" style="margin-top:6px">${t('Đồng hồ 24 giờ không tính báo cáo về chính bạn. Việc khác = khiếu nại ảnh, selfie chờ duyệt, sự kiện chờ duyệt.')}</div>`)(((sla.khac || {}).khieu_nai_anh_qua_24h || 0) + ((sla.khac || {}).selfie_qua_24h || 0) + ((sla.khac || {}).su_kien_qua_24h || 0)) : ''}
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
        <dt>${t('Quan hệ')}</dt><dd><span data-ban-be="${esc(u.id)}" data-fol="${c.followers || 0}" data-fing="${c.following || 0}">${c.followers || 0} ${t('người theo dõi · theo dõi')} ${c.following || 0}</span> · ${c.conversations || 0} ${t('cuộc trò chuyện · chặn')} ${c.blocks_made || 0} ${t('· bị')} ${c.blocked_by || 0} ${t('người chặn')}</dd>
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

  /** 151: tin thoại / video của tin bị báo cáo — lấy từ bằng chứng báo cáo (còn cả khi tin đã thu hồi), rồi tới chính tin. */
  function tinMedia(ev, c) {
    const lay = (k) => { const v = (ev && typeof ev === 'object' && ev[k]) || (c && c[k]); return typeof v === 'string' && v ? v : null; };
    const a = lay('audio_path'), v = lay('video_path');
    if (!a && !v) return '';
    return `<div class="row" style="gap:8px;margin-top:6px">
        ${a ? `<button class="btn sm" data-thoai="${esc(a)}">${t('Nghe tin thoại')}</button>` : ''}
        ${v ? `<button class="btn sm" data-video="${esc(v)}">${t('Xem video')}</button>` : ''}</div>
      ${a || v ? `<div class="hint">${t('Tin thoại, video và ảnh riêng của tin bị báo cáo cần lý do và phiên xác thực hai lớp; mỗi lần mở được ghi vào nhật ký quản trị.')}</div>` : ''}`;
  }
  const theMedia = (tag, url) => {
    const e = document.createElement(tag);
    e.controls = true; e.preload = 'metadata'; e.src = url;
    if (tag === 'video') { e.playsInline = true; e.setAttribute('playsinline', ''); e.style.cssText = 'max-width:100%;max-height:420px;border-radius:10px;display:block'; }
    else e.style.cssText = 'width:100%;max-width:420px;display:block';
    return e;
  };
  /** 153 (B3, rà độc lập 11/11): tin thoại, video VÀ ảnh riêng của tin bị báo cáo đều mở qua admin_mo_anh (lý do + hai lớp +
   *  nhật ký) — trước đây video mở thẳng bằng URL có chữ ký, không lý do, không nhật ký. Lý do hỏi MỘT lần cho mỗi lần xem báo cáo
   *  (giữ trong khung này, mất khi khung vẽ lại). Ảnh bài đăng / bình luận công khai giữ như cũ (hydratePhotos). */
  function noiMediaTin(root) {
    let lyDoXem = null;
    const xinLyDo = async (tieuDe) => { if (!lyDoXem) lyDoXem = await hoiLyDo(tieuDe); return lyDoXem; };
    const gan = (sel, lay, tieuDe, ve, loiChu) => root.querySelectorAll(sel).forEach((b) => b.addEventListener('click', async () => {
      const pth = lay(b);
      const lyDo = await xinLyDo(tieuDe); if (!lyDo) return;
      b.disabled = true;
      try {
        const urls = await moAnhRieng([pth], lyDo);
        if (urls[pth]) b.replaceWith(ve(urls[pth]));
        else { b.disabled = false; toast(loiChu, true); }
      } catch (e) { b.disabled = false; toast(friendly(e), true); }
    }));
    gan('[data-thoai]', (b) => b.dataset.thoai, t('Nghe tin thoại'), (u) => theMedia('audio', u), t('Không tải được tin thoại.'));
    gan('[data-video]', (b) => b.dataset.video, t('Xem video'), (u) => theMedia('video', u), t('Không tải được video.'));
    gan('[data-anhrieng]', (b) => b.dataset.anhrieng, t('Xem ảnh riêng'), (u) => {
      const im = document.createElement('img');
      im.className = 'photo'; im.alt = ''; im.src = u;
      im.style.cssText = 'max-width:100%;max-height:420px;border-radius:10px;display:block';
      return im;
    }, t('Không tải được ảnh.'));
  }

  function contentBlock(kind, c, snapshot, ev) {
    const tm = kind === 'message' ? tinMedia(ev, c) : '';
    // 160: ảnh tự xoá — nội dung chỉ nằm ở bằng chứng (evidence.path); mở qua admin_mo_anh như ảnh riêng của tin nhắn
    if (kind === 'anh_tu_xoa') {
      const p = ev && ev.path;
      // 161: ảnh đã mở được giữ 3 ngày kể từ lúc mở; báo cáo trong 3 ngày đó thì tệp thành bằng chứng và được giữ tiếp
      return `<div class="hint">${t('Ảnh tự xoá')}${ev && ev.opened_at ? ` · ${t('mở lúc')} ${esc(fmtDate(ev.opened_at))}` : ` · ${t('chưa mở')}`}</div><div class="hint">${t('Ảnh đã mở được giữ 3 ngày kể từ lúc mở; báo cáo trong 3 ngày đó thì ảnh được giữ làm bằng chứng. Báo cáo muộn hơn có thể không còn ảnh.')}</div>${p ?`<button class="btn sm" data-anhrieng="${esc(p)}" style="margin-top:6px">${t('Xem ảnh riêng')}</button>` : `<div class="hint">${t('Không còn tệp.')}</div>`}`;
    }
    if (!c) return `<div class="quote" style="color:var(--soft)">${t('Nội dung không còn (đã bị gỡ hoặc xoá). Bản chụp lúc báo cáo:')}<br>${esc(snapshot || '—')}</div>${tm}`;
    const img = (p, full) => p ? `<img class="photo" data-photo="${esc(p)}" ${full ? 'data-full' : ''} data-zoom="${esc(p)}" title="${t('Bấm để xem to')}" alt="" style="opacity:0;transition:opacity .2s">` : '';
    // 153 (B3): ảnh RIÊNG của tin nhắn / yêu cầu nhắn tin bị báo cáo — chỉ một nút; mở qua admin_mo_anh (noiMediaTin).
    const anhRieng = (p) => p ? `<button class="btn sm" data-anhrieng="${esc(p)}" style="margin-top:6px">${t('Xem ảnh riêng')}</button>` : '';
    // 171b (Q6): ảnh album, story, moment bị báo cáo cũng mở qua admin_mo_anh (lý do + hai lớp + nhật ký); story có thể là video
    const mediaRieng = (p) => (p && /\.(mp4|mov)$/i.test(p) ? `<button class="btn sm" data-video="${esc(p)}" style="margin-top:6px">${t('Xem video')}</button>` : anhRieng(p));
    // Bài đăng và bình luận là nội dung công khai nên mở được trang chi tiết đầy đủ.
    const moRong = (k, id) => id ? `<div class="row" style="margin-top:8px"><a class="btn sm" href="#noidung/${k === 'post' ? 'bai' : 'binhluan'}/${id}">${t('Xem đầy đủ')} ${k === 'post' ? `${t('bài đăng')}` : `${t('bình luận')}`} →</a></div>` : '';
    if (kind === 'post') return `${img(c.image_path, true)}${c.caption ? `<div class="quote">${esc(c.caption)}</div>` : ''}<div class="hint">${t('Trạng thái:')} ${esc(c.status)}${c.moderation_reason ? ' · ' + esc(c.moderation_reason) : ''} · ${esc(fmtDate(c.created_at))}</div>${moRong('post', c.id)}`;
    if (kind === 'comment') return `<div class="quote">${esc(c.body)}</div><div class="hint">${t('Bình luận lúc')} ${esc(fmtDate(c.created_at))}${c.post_image ? ` ${t('dưới bài:')}` : ''}</div>${img(c.post_image)}${moRong('comment', c.id)}`;
    if (kind === 'message') return `${c.recalled_at ? `<div class="quote" style="color:var(--soft)">${t('Tin đã bị thu hồi.')}</div>` : ''}${c.body ? `<div class="quote">${esc(c.body)}</div>` : ''}${anhRieng(c.image_path)}${c.lat != null ? `<div class="hint">${t('Vị trí chia sẻ:')} ${esc(String(Number(c.lat)))}, ${esc(String(Number(c.lng)))}</div>` : ''}${tm}<div class="hint">${t('Gửi lúc')} ${esc(fmtDate(c.created_at))}</div>`;
    if (kind === 'album') return `${anhRieng(c.path)}<div class="hint">${t('Trạng thái:')} ${esc(c.status)}${c.moderation_reason ? ' · ' + esc(c.moderation_reason) : ''}</div>`;
    // 083: loại mới
    if (kind === 'group') return `${img(c.photo_path, true)}<div class="quote"><b>${esc(c.title || '')}</b>${c.description ? '<br>' + esc(c.description) : ''}</div><div class="hint">${esc(c.visibility || '')} · ${t('thành viên:')} ${esc(String(c.members ?? ''))}</div>`;
    if (kind === 'message_request') return `${(c.messages || []).map((m) => `<div class="quote">${m.body ? esc(m.body) : ''}</div>${anhRieng(m.image_path)}`).join('') || `<div class="hint">${t('Không còn tin nào.')}</div>`}`;
    if (kind === 'story') return `${c.removed ? `<div class="quote" style="color:var(--soft)">${t('Story đã bị gỡ.')}</div>` : ''}${(c.media || []).map(mediaRieng).join('')}${(c.texts || []).length ? `<div class="quote">${c.texts.map(esc).join('<br>')}</div>` : ''}<div class="hint">${t('Đăng lúc')} ${esc(fmtDate(c.created_at))} · ${t('đối tượng:')} ${esc(c.audience || '')}${c.active ? ` · <b>${t('đang hiển thị')}</b>` : ''}</div>`;
    if (kind === 'moment') return `<div class="quote"><b>${esc(c.title || '')}</b></div>${(c.covers || []).map(mediaRieng).join('')}<div class="hint">${t('đối tượng:')} ${esc(c.audience || '')} · ${esc(String(c.items ?? 0))} story</div>`;
    if (kind === 'group_poll' || kind === 'group_event' || kind === 'follow_request') return `<div class="quote">${esc(snapshot || '—')}</div>`;
    return `${img(c.photo_path, true)}${c.bio ? `<div class="quote">${esc(c.bio)}</div>` : `<div class="hint">${t('Không có giới thiệu.')}</div>`}`;
  }

  async function renderReportPane(pane) {
    pane.hidden = false;
    pane.innerHTML = '<div class="stack"><div class="skeleton"></div><div class="skeleton"></div></div>';
    // 065: chi tiết báo cáo là nội dung nhạy cảm — máy chủ ghi nhật ký và đòi aal2.
    const d = await goiNhayCam('admin_report_detail', { p_id: state.id });
    if (!d) { pane.innerHTML = `<div class="card">${t('Không mở được báo cáo — cần xác thực hai lớp hoặc vai trò không đủ quyền.')}</div>`; return; }
    const r = d.report; const open = r.status === 'open';
    // rà soát 15/11 (tạm, tới khi SQL 166 sửa loại): máy chủ xếp báo cáo ảnh tự xoá vào 'message' → dùng target_type
    if (r.target_type === 'anh_tu_xoa') r.kind = 'anh_tu_xoa';
    if (r.target_type === 'bai_hat') r.kind = 'bai_hat';   // 214: bài hát trên hồ sơ — gỡ ở thẻ "Bài hát trên hồ sơ" của người dùng
    const khan = r.priority === 1;
    // Người bị báo cáo có thể đã xoá tài khoản (reports.reported_id thành NULL).
    // Phải giữ nguyên null để userCard biết mà báo "đã xoá" và các nút phạt tắt đi.
    const u = d.reported || null;
    const canAct = !!(u && !u.deleted && !u.is_admin && u.id);
    // 066: báo cáo cũ không xác định được thứ bị báo cáo → không cho "Gỡ" (máy chủ cũng từ chối).
    const canRemove = canAct && r.kind !== 'unknown' && r.kind !== 'group' && r.kind !== 'anh_tu_xoa' && r.kind !== 'bai_hat';   // 214: bài hát gỡ ở thẻ người dùng (admin_bai_hat_go)   // 160: ảnh tự xoá tự biến mất — không có gì để gỡ   // 083: chưa gỡ riêng được cả nhóm
    pane.innerHTML = `
      <button class="btn ghost sm sheet-close" id="paneClose">${t('← Danh sách')}</button>
      <div class="stack">
        <div class="card stack" style="gap:8px">
          <div class="row" style="justify-content:space-between"><h2>${esc(KIND[r.kind] || r.kind)} ${t('bị báo cáo')}${r.priority === 1 ? ` <span class="tag danger">${t('Khẩn')}</span>` : ''}</h2><span class="tag ${open ? 'warn' : 'ok'}">${esc(RSTATUS[r.status])}</span></div>
          <dl class="kv">
            <dt>${t('Lý do')}</dt><dd><b>${esc(REASON[r.reason] || r.reason)}</b>${r.details ? ' — ' + esc(r.details) : ''}</dd>
            <dt>${t('Báo cáo lúc')}</dt><dd>${esc(fmtDate(r.created_at))} (${esc(ago(r.created_at))})${open && hoursOpen(r.created_at) >= 18 ? ` <b style="color:var(--danger)">${t('sắp quá 24 giờ')}</b>` : ''}</dd>
            <dt>${t('Người báo cáo')}</dt><dd>${d.reporter ? `<a href="#nguoidung/${d.reporter.id}">${esc(d.reporter.display_name)}</a> ${t('· đã gửi')} ${d.reporter.reports_made} ${t('báo cáo')}` : '—'}</dd>
            ${r.giu_phap_ly_den ? `<dt>${t('Giữ theo pháp lý')}</dt><dd><b>${t('tới')} ${esc(fmtDate(r.giu_phap_ly_den))}</b>${r.so_ncmec ? ` · ${t('số tham chiếu')}: ${esc(r.so_ncmec)}` : ''}</dd>` : ''}
            ${!open ? `<dt>${t('Kết quả')}</dt><dd>${esc(r.resolution || '')}${r.resolved_by ? ' · ' + esc(r.resolved_by) : ''} · ${esc(fmtDate(r.resolved_at))}${r.admin_note ? '<br>' + esc(r.admin_note) : ''}</dd>` : ''}
          </dl>
          ${khan ? `<div class="hint" style="color:var(--danger)">${t('Báo cáo khẩn: ảnh / video được làm mờ — chạm để xem.')}</div>` : ''}
          <div id="noiDungBC" class="${khan ? 'mo-khan' : ''}">${contentBlock(r.kind, d.content, r.snapshot, r.evidence)}</div>
          ${r.kind === 'group' ? '<div id="nhomSuKien"></div>' : ''}
          ${r.snapshot && d.content ? `<details><summary class="hint" style="cursor:pointer">${t('Bản chụp lúc báo cáo')}</summary><div class="quote" style="margin-top:6px">${esc(r.snapshot)}</div></details>` : ''}
          ${r.evidence ? `<details><summary class="hint" style="cursor:pointer">${t('Bằng chứng lưu kèm báo cáo')}${r.evidence_until ? ` (${t('giữ tới')} ${esc(fmtDate(r.evidence_until))})` : ''}</summary><pre class="quote" style="margin-top:6px;white-space:pre-wrap">${esc(JSON.stringify(r.evidence, null, 2))}</pre></details>` : ''}
        </div>
        ${open ? `<div class="card stack" style="gap:8px"><h2>${t('Xử lý')}</h2>
          <div class="actions">
            <button class="btn" data-act="dismiss">${t('Bỏ qua')}<small>${t('Không vi phạm, đóng báo cáo')}</small></button>
            <button class="btn" data-act="remove" ${canRemove ? '' : 'disabled'}>${t('Gỡ nội dung')}<small>${t('Xoá thứ bị báo cáo, giữ tài khoản')}</small></button>
            <button class="btn" data-act="warn" ${canAct ? '' : 'disabled'}>${t('Gỡ + cảnh cáo')}<small>${t('Họ thấy lời cảnh cáo khi mở app')}</small></button>
            <button class="btn" data-act="suspend" ${canAct ? '' : 'disabled'}>${t('Gỡ + tạm khoá')}<small>${t('Văng khỏi app trong N ngày')}</small></button>
            <button class="btn danger" data-act="ban" ${canAct ? '' : 'disabled'}>${t('Gỡ + khoá vĩnh viễn')}<small>${t('Giữ dữ liệu làm bằng chứng')}</small></button>
            <button class="btn danger" data-act="delete" ${canAct && !khan ? '' : 'disabled'}>${t('Xoá tài khoản')}<small>${khan ? t('Báo cáo khẩn: khoá để giữ bằng chứng, không xoá') : t('Xoá hẳn mọi dữ liệu')}</small></button>
          </div>
          ${r.kind === 'group' ? `<div class="actions"><button class="btn danger" id="goNhom" ${(r.target_id || (d.content && d.content.id)) ? '' : 'disabled'}>${t('Gỡ ảnh, mô tả và nội quy của nhóm')}<small>${t('Giữ tên nhóm, thành viên và tin nhắn')}</small></button></div>
          <div class="hint">${t('Cần bản vá 089 trên máy chủ. Muốn xử lý cả người chịu trách nhiệm (chủ nhóm) thì dùng các nút tài khoản.')}</div>` : ''}
          ${r.kind === 'unknown' ? `<div class="hint" style="color:var(--warn, inherit)">${t('Báo cáo cũ: không xác định được nội dung bị báo cáo, nên nút Gỡ bị tắt. Các nút còn lại chỉ xử lý tài khoản.')}</div>` : ''}
          <div class="hint">${t('Khoá hay xoá thì mọi báo cáo đang mở về người này cũng được đóng luôn. Nghi ngờ dưới 18 tuổi hoặc tội phạm: khoá (giữ bằng chứng), đừng xoá.')}</div>
        </div>` : ''}
        <div class="card stack" style="gap:8px"><h2>${t('Giữ bằng chứng (pháp lý)')}</h2>
          <div class="hint">${t('Dùng khi nghi nội dung xâm hại trẻ em hoặc có yêu cầu của cơ quan có thẩm quyền: bằng chứng của báo cáo được giữ 1 năm kể từ lúc bấm (bấm lại để gia hạn), không bị dọn sau 90 ngày. Việc này được ghi nhật ký.')}</div>
          <div class="actions"><button class="btn" id="giuBC">${r.giu_phap_ly_den ? t('Gia hạn giữ thêm 1 năm') : t('Giữ bằng chứng 1 năm')}</button></div>
        </div>
        <div><div class="hint" style="margin:0 0 6px 2px">${t('Người bị báo cáo')}</div>${userCard(u, { posts: true })}</div>
      </div>`;
    $('#paneClose', pane).addEventListener('click', () => nav('antoan/baocao'));
    const gb = $('#giuBC', pane); if (gb) gb.addEventListener('click', () => giuBangChung(r));
    pane.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => resolveReport(r, u, b.dataset.act)));
    const gn = $('#goNhom', pane); if (gn) gn.addEventListener('click', () => goNhom(r, d));
    const mo = $('#noiDungBC', pane);
    if (mo && mo.classList.contains('mo-khan')) mo.addEventListener('click', (e) => { if (!mo.classList.contains('mo-khan')) return; e.preventDefault(); e.stopPropagation(); mo.classList.remove('mo-khan'); }, true);
    hydratePhotos(pane); noiXemAnh(pane); noiMediaTin(pane);
    if (r.kind === 'group') veNhomSuKien($('#nhomSuKien', pane), r.target_id || (d.content && d.content.id));
  }

  /** 151: nhóm bị báo cáo là nhóm chat của một sự kiện → ghi rõ và dẫn tới sự kiện. Lỗi / không thuộc sự kiện nào → im lặng. */
  async function veNhomSuKien(el, conv) {
    if (!el || !conv) return;
    let d = null;
    try { d = await rpc('admin_nhom_su_kien', { p_conv: conv }); } catch (e) { d = null; }
    if (!d || !d.su_kien_id || !el.isConnected) return;
    const tc = d.to_chuc || {};
    el.innerHTML = `<div class="hint">${t('Nhóm chat của sự kiện')}: <a href="#noidung/sukien/${esc(d.su_kien_id)}">${esc(d.tieu_de || '—')}</a>${tc.id ? ` · ${t('người tổ chức')} <a href="#nguoidung/${esc(tc.id)}">${esc(tc.ten || '?')}</a>` : ''}</div>`;
  }

  let dangGui = false;
  /** 166d: giữ bằng chứng của một báo cáo theo pháp lý (moderate + lý do + hai lớp + nhật ký ở máy chủ). */
  async function giuBangChung(r) {
    if (dangGui) return;
    const ans = await confirmAction({ title: t('Giữ bằng chứng (pháp lý)'), text: t('Bằng chứng của báo cáo này được giữ 1 năm kể từ bây giờ. Ghi số tham chiếu nếu có (ví dụ số báo cáo NCMEC) — có thể để trống và bổ sung sau.'), noteLabel: t('Số tham chiếu (có thể để trống)'), okLabel: t('Tiếp') });
    if (!ans) return;
    const so = (ans.note || '').trim();
    if (so.length > 60) { toast(t('Số tham chiếu tối đa 60 ký tự.'), true); return; }
    const lyDo = await hoiLyDoViec(t('Giữ bằng chứng (pháp lý)'), t('Ghi lý do giữ (vụ việc, cơ quan yêu cầu). Lý do được lưu vào nhật ký quản trị.'), t('Giữ bằng chứng'));
    if (!lyDo) return;
    dangGui = true;
    try {
      const k = await goiNhayCam('admin_bao_cao_giu', { p_id: r.id, p_so_ncmec: so || null, p_ly_do: lyDo });
      if (k) {
        toast(k.con_bang_chung === false ? t('Đã ghi hạn giữ — nhưng bằng chứng của báo cáo này đã bị dọn từ trước.') : `${t('Đã giữ bằng chứng tới')} ${fmtDate(k.giu_phap_ly_den)}`, k.con_bang_chung === false);
        await render();
      }
    } catch (e) {
      toast(e && (e.code === 'PGRST202' || e.code === '42883') ? t('Máy chủ chưa có bản vá 166 — chưa giữ được.') : friendly(e), true);
    } finally { dangGui = false; }
  }
  // 089: gỡ ảnh, mô tả, nội quy, câu hỏi của một nhóm (máy chủ ghi nhật ký, đóng báo cáo đang mở về nhóm đó)
  async function goNhom(r, d) {
    if (dangGui) return;
    const conv = r.target_id || (d.content && d.content.id);
    if (!conv) return;
    const ans = await confirmAction({ title: `${t('Gỡ ảnh, mô tả và nội quy của nhóm')}`, text: `${t('Ảnh, mô tả, nội quy và câu hỏi xin vào của nhóm bị xoá; tên nhóm, thành viên và tin nhắn giữ nguyên. Báo cáo đang mở về nhóm này được đóng.')}`, noteLabel: `${t('Lý do (bắt buộc, ít nhất 3 ký tự)')}`, okLabel: `${t('Gỡ')}`, danger: true });
    if (!ans) return;
    if ((ans.note || '').length < 3) { toast(t('Cần ghi lý do (ít nhất 3 ký tự).'), true); return; }
    dangGui = true;
    try {
      const kq = await rpc('admin_go_nhom', { p_conv: conv, p_ly_do: ans.note });
      toast(kq === 'removed' ? t('Đã gỡ ảnh và mô tả của nhóm.') : t('Nhóm này không còn.'));
      await render();
    } catch (e) {
      toast(e && (e.code === 'PGRST202' || e.code === '42883') ? t('Máy chủ chưa có bản vá 089 — chưa gỡ được.') : friendly(e), true);
    } finally { dangGui = false; }
  }

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
      await rpcHaiLop('admin_resolve_report', { p_id: r.id, p_action: act, p_note: ans.note || null, p_days: ans.days });
      toast(t('Đã xử lý') + ': ' + (ACTION['report:' + act] || act));
      // Xoá tài khoản xong thì báo cáo trỏ vào một hồ sơ không còn — về danh sách.
      if (act === 'delete') nav('antoan/baocao'); else await render();
    } catch (e) { toast(friendly(e), true); }
    finally { dangGui = false; }
  }

  // ---------------------------------------------------------------- DUYỆT ẢNH
  /** admin_set_photo theo tệp đã xem (100 / 092). Máy chủ chưa có bản đó (PGRST202: chỉ có hàm 4 tham số) → gọi bản cũ. */
  async function datAnh(a) {
    const { error } = await sb.rpc('admin_set_photo', a);
    if (!error) return;
    if (error.code === 'PGRST202') {
      const { p_path: _bo, ...cu } = a;
      const r = await sb.rpc('admin_set_photo', cu);
      if (r.error) throw r.error;
      return;
    }
    throw error;
  }

  async function renderPhotos(main) {
    main.innerHTML = `<div class="stack" style="padding-top:16px">
      <div><h1>${t('Duyệt ảnh')}</h1><p class="sub">${t('Máy (Sightengine) duyệt trước; đây là chỗ xem lại ảnh còn chờ hoặc sửa quyết định của máy.')}</p></div>
      <div class="chips" id="phChips">${[['pending', `${t('Đang chờ')}`], ['rejected', `${t('Đã từ chối')}`], ['approved', `${t('Đã duyệt (mới nhất)')}`], ['appeals', `${t('Khiếu nại')}`]].map(([k, l]) => `<button class="chip" data-k="${k}" aria-pressed="${state.anh.status === k}">${l}</button>`).join('')}</div>
      <div class="grid" id="phGrid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>
    </div>`;
    main.querySelectorAll('#phChips .chip').forEach((c) => c.addEventListener('click', () => { state.anh.status = c.dataset.k; render(); }));
    if (state.anh.status === 'appeals') return renderAppeals($('#phGrid'));
    const rows = await rpc('admin_photo_queue', { p_status: state.anh.status, p_limit: 120, p_offset: 0 });
    const grid = $('#phGrid');
    if (!rows.length) { grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${t('Không có ảnh nào.')}</div>`; return; }
    // C05 (rà soát 22/10): thẻ duyệt hiện ĐÚNG tệp sẽ được duyệt (data-full = bản gốc), không phải bản thu nhỏ _t — _t do chủ ảnh
    // tải lên riêng, có thể khác ảnh gốc; admin_set_photo chỉ khoá đường dẫn bản gốc.
    grid.innerHTML = rows.map((p) => `
      <div class="pcard" data-kind="${p.kind}" data-id="${p.id}" data-path="${esc(p.path)}">
        <img data-photo="${esc(p.path)}" data-full data-zoom="${esc(p.path)}" title="${t('Bấm để xem to')}" alt="" style="opacity:0;transition:opacity .2s">
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
        // Kiểm toán 21/10 (C05): gửi kèm ĐƯỜNG DẪN tệp đang hiện trên thẻ — máy chủ chỉ quyết định đúng tệp đã xem.
        await datAnh({ p_kind: card.dataset.kind, p_id: card.dataset.id, p_status: status, p_reason: note, p_path: card.dataset.path });
        card.style.opacity = '0.35';
        toast(status === 'approved' ? `${t('Đã duyệt')}` : `${t('Đã từ chối')}`);
        refreshBadges();
      } catch (e) {
        if (e && (e.message === 'replaced' || /replaced/.test(String(e.hint || '')))) {
          toast(`${t('Chủ ảnh vừa thay ảnh khác — hàng chờ đã tải lại, xem lại ảnh mới.')}`, true);
          render();
          return;
        }
        card.querySelectorAll('button').forEach((x) => { x.disabled = false; });
        toast(friendly(e), true);
      }
    }));
    hydratePhotos(grid); noiXemAnh(grid);
  }

  // ---------------------------------------------------------------- KHIẾU NẠI (092)
  // Chủ ảnh bị máy từ chối gửi một lời khiếu nại từ app; ở đây người thật xem lại: "Duyệt lại" (admin_set_photo 'approved'
  // qua admin_resolve_appeal) hoặc "Giữ từ chối". Mã / điểm của máy hiện kèm để đối chiếu. Máy chủ chưa có 092 → báo rõ.
  async function renderAppeals(grid) {
    let rows;
    try { rows = await rpc('admin_appeals', { p_status: 'open', p_limit: 120, p_offset: 0 }); }
    catch (e) { grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${/function|PGRST202|42883/i.test(String(e && e.message || e)) ? t('Máy chủ chưa có bản vá 092 (khiếu nại).') : esc(friendly(e))}</div>`; return; }
    if (!rows.length) { grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${t('Không có khiếu nại nào đang chờ.')}</div>`; return; }
    const diem = (sc) => { if (!sc || typeof sc !== 'object') return ''; const top = Object.entries(sc).filter(([k, v]) => typeof v === 'number' && !/^thumb:/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 3); return top.map(([k, v]) => `${esc(k)} ${Math.round(v * 100)}%`).join(' · '); };
    // Kết quả thật của admin_resolve_appeal → câu cho quản trị viên (void_* = khiếu nại đóng vì trạng thái đã đổi, không duyệt gì).
    const KQ = { approved: t('Đã duyệt lại ảnh (đúng tệp đã khiếu nại)'), upheld: t('Đã giữ từ chối (tệp vẫn còn, chỉ chủ và quản trị viên xem được)'),
      void_deleted: t('Khiếu nại đóng: chủ đã xoá nội dung — không duyệt gì'), void_replaced: t('Khiếu nại đóng: chủ đã thay ảnh — không áp cho ảnh mới'),
      void_decided: t('Khiếu nại đóng: ảnh đã có quyết định khác — giữ nguyên'), void_media_missing: t('Khiếu nại đóng: tệp gốc không còn / đã đổi bản — không khôi phục; chủ phải đăng ảnh khác') };
    // Tình trạng thật lúc xem: nội dung còn? tệp còn đúng bản? — quyết định sẽ đọc lại lần nữa trên máy chủ.
    const tinhTrang = (a) => !a.item_exists ? `<span class="tag danger">${t('Nội dung đã xoá')}</span>`
      : a.media_ok === false ? `<span class="tag danger">${t('Tệp gốc không còn / đã đổi bản')}</span>`
      : a.item_status !== 'rejected' ? `<span class="tag warn">${t('Ảnh không còn ở trạng thái từ chối')}</span>` : `<span class="tag ok">${t('Tệp còn đúng bản')}</span>`;
    grid.innerHTML = rows.map((a) => `
      <div class="pcard" data-id="${a.id}" data-kind="${a.kind}">
        ${a.path && a.media_ok !== false && a.item_exists ? `<img data-photo="${esc(a.path)}" data-full data-zoom="${esc(a.path)}" title="${t('Bấm để xem to')}" alt="" style="opacity:0;transition:opacity .2s">` : `<div class="anh-hong" title="${t('Không còn tệp để xem')}">∅</div>`}
        <div class="b">
          <div class="row" style="gap:6px"><span class="tag accent">${esc(KIND[a.kind] || a.kind)}</span><a href="#nguoidung/${a.owner_id}" style="font-weight:700;color:inherit;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.owner_name)}</a></div>
          <div class="row" style="gap:6px;margin-top:4px">${tinhTrang(a)}${a.moderated_by === 'admin' ? `<span class="tag">${t('quản trị viên đã quyết')}</span>` : ''}</div>
          <div class="hint">${esc(ago(a.created_at))} · ${t('Trạng thái ảnh')}: ${esc(a.item_status || '—')}${a.code ? ' · ' + t('Mã') + ': ' + esc(a.code) : ''}${a.reason ? '<br>' + esc(a.reason) : ''}${diem(a.scores) ? '<br>' + t('Điểm máy') + ': ' + diem(a.scores) : ''}</div>
          <div style="margin-top:6px;padding:8px;border-radius:8px;background:var(--surface3)"><b>${t('Người dùng viết')}:</b> ${a.message ? esc(a.message) : `<i>${t('(không ghi gì)')}</i>`}</div>
          <div class="r"><button class="btn ok" data-act="approve">${t('Duyệt lại ảnh')}</button><button class="btn danger" data-act="uphold">${t('Giữ từ chối')}</button></div>
          ${a.kind === 'post' ? `<a class="btn sm" href="#noidung/bai/${a.item_id}">${t('Xem đầy đủ bài')} →</a>` : ''}
        </div>
      </div>`).join('');
    grid.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
      if (b.disabled) return;
      const card = b.closest('.pcard'); const act = b.dataset.act;
      const ans = await confirmAction(act === 'approve'
        ? { title: `${t('Chấp nhận khiếu nại')}`, text: `${t('Ảnh về trạng thái đã duyệt (mức xem / riêng tư / chặn giữ nguyên). Máy chủ đọc lại lúc quyết: nội dung đã xoá, ảnh đã thay, tệp không còn hay đã có quyết định khác → khiếu nại đóng với lý do đó, không duyệt gì.')}`, noteLabel: `${t('Ghi chú (nội bộ)')}`, okLabel: `${t('Duyệt lại')}` }
        : { title: `${t('Giữ từ chối')}`, text: `${t('Người dùng thấy "khiếu nại đã xem xét: giữ quyết định từ chối". Không xoá tệp.')}`, noteLabel: `${t('Ghi chú (nội bộ)')}`, okLabel: `${t('Giữ từ chối')}`, danger: true });
      if (!ans) return;
      card.querySelectorAll('button').forEach((x) => { x.disabled = true; });
      try {
        const kq = await rpc('admin_resolve_appeal', { p_id: card.dataset.id, p_action: act, p_note: ans.note || null });
        card.style.opacity = '0.35';
        toast(KQ[kq] || `${t('Kết quả')}: ${esc(String(kq))}`, typeof kq === 'string' && kq.startsWith('void_'));
        refreshBadges();
      } catch (e) {
        card.querySelectorAll('button').forEach((x) => { x.disabled = false; });
        toast(friendly(e), true);
      }
    }));
    hydratePhotos(grid); noiXemAnh(grid);
  }

  // ---------------------------------------------------------------- TIN BỊ GỠ KHỎI NHÓM (119 / 137 / 151)
  // Chủ nhóm / quản trị nhóm gỡ một tin vi phạm → nội dung vào group_message_evidence (giữ 180 ngày). Danh sách KHÔNG kèm
  // nội dung; mở nội dung qua admin_group_evidence (lý do + xác thực hai lớp + nhật ký, cấp quyền xem tệp 15 phút).
  /** Hàm có trên máy chủ nhưng chưa được mở cho trang quản trị (chưa vào danh sách trắng api_functions) hoặc chưa có. */
  const laChuaMo = (e) => laChuaCo(e) || /permission denied for function/i.test((e && e.message) || '');
  /** Tin gồm những gì: biểu tượng kèm chữ (biểu tượng aria-hidden — trình đọc màn hình đọc chữ). */
  const bieuTuongTin = (r) => [[r.co_chu, '💬', t('chữ')], [r.co_anh, '🖼', t('ảnh')], [r.co_video, '🎬', t('video')], [r.co_thoai, '🎙', t('thoại')], [r.co_vi_tri, '📍', t('vị trí')]]
    .filter((x) => x[0]).map(([, i, l]) => `<span class="tag"><span aria-hidden="true">${i}</span>${esc(l)}</span>`).join('');
  const nguoiLink = (p) => (p && p.id ? `<a href="#nguoidung/${esc(p.id)}">${esc(p.ten || '?')}</a>` : esc(t('Tài khoản đã xoá')));

  async function renderBangChung(main) {
    const f = state.bcn;
    main.innerHTML = dangTai;
    const phu = t('Tin mà chủ nhóm hoặc quản trị nhóm đã gỡ vì vi phạm. Máy chủ giữ nội dung làm bằng chứng 180 ngày. Danh sách không kèm nội dung; mở nội dung cần lý do và phiên xác thực hai lớp, và mỗi lần mở được ghi vào nhật ký quản trị.');
    let d;
    try { d = await rpc('admin_bang_chung_nhom_ds', { p_conv: null, p_limit: TRANG, p_offset: f.trang * TRANG }); }
    catch (e) { if (laChuaCo(e)) { main.innerHTML = khung(t('Tin bị gỡ khỏi nhóm'), esc(phu), canBanVa151()); return; } throw e; }
    const rows = (d && d.rows) || []; const tong = Number(d && d.tong) || 0;
    main.innerHTML = khung(t('Tin bị gỡ khỏi nhóm'), esc(phu), `
      <div class="list card" id="bcnList" style="padding:4px 12px">${rows.length ? rows.map((r) => `
        <div class="item" style="cursor:default">
          <span class="t">
            <span class="n">${esc(r.nhom || t('Nhóm không tên'))}${r.su_kien_id ? ` <a class="tag accent" href="#noidung/sukien/${esc(r.su_kien_id)}">${t('Nhóm chat sự kiện')}</a>` : ''} ${bieuTuongTin(r)}</span>
            <span class="s" style="display:block;white-space:normal">${t('Người gửi')}: ${nguoiLink(r.nguoi_gui)} · ${t('Người gỡ')}: ${nguoiLink(r.nguoi_go)}</span>
            ${r.ly_do ? `<span class="s" style="display:block;white-space:normal">${t('Lý do')}: ${esc(r.ly_do)}</span>` : ''}
            <span class="m" style="display:block;white-space:normal">${t('Gỡ lúc')} ${esc(fmtDate(r.go_luc))} · ${t('giữ tới')} ${esc(fmtNgay(r.giu_toi))}${r.gui_luc ? ` · ${t('gửi lúc')} ${esc(fmtDate(r.gui_luc))}` : ''}</span>
          </span>
          <button class="btn sm" data-mo="${esc(r.message_id)}">${t('Mở nội dung')}</button>
        </div>`).join('') : `<div class="empty">${t('Chưa có tin nào bị gỡ khỏi nhóm trong 180 ngày qua.')}</div>`}</div>
      <div class="pager" id="bcnPager"></div>`);
    main.querySelectorAll('[data-mo]').forEach((b) => b.addEventListener('click', () => moBangChung(rows.find((r) => r.message_id === b.dataset.mo) || { message_id: b.dataset.mo })));
    pager($('#bcnPager'), tong, f.trang, (n) => { f.trang = n; render(); });
  }

  // ---------------------------------------------------------------- XÁC MINH SELFIE (149)
  // Hàng đợi: selfie + tư thế được giao + ảnh đại diện HIỆN TẠI. Danh sách không kèm ảnh; xem ảnh qua admin_mo_anh (lý do + xác thực
  // hai lớp + nhật ký, quyền xem 10 phút). Duyệt / từ chối / thu hồi: quyền "moderate" + xác thực hai lớp, ghi nhật ký.
  const TU_THE_XM = { quay_trai: 'Quay mặt sang trái', quay_phai: 'Quay mặt sang phải', ngang_len: 'Ngẩng mặt lên', cui_xuong: 'Cúi mặt xuống',
    nghieng_dau: 'Nghiêng đầu', cuoi: 'Cười', ha_mieng: 'Há miệng' };
  const LY_DO_XM = [['khong_khop', 'Không khớp ảnh đại diện'], ['anh_chup_anh', 'Ảnh chụp lại ảnh / màn hình'], ['khong_ro', 'Ảnh mờ / tối'],
    ['sai_tu_the', 'Sai tư thế'], ['nhieu_nguoi', 'Nhiều người trong ảnh'], ['gia_mao', 'Giả mạo danh tính (giữ selfie 1 năm)'], ['khac', 'Lý do khác']];
  const canBanVa149 = () => `<div class="alertbar warn"><div><b>${t('Cần bản vá 149 trên máy chủ')}</b><br>${t('Áp supabase/149-xac-minh.sql trong SQL Editor. Các mục khác vẫn dùng bình thường.')}</div></div>`;
  const LOI_XM = { da_xu_ly: t('Lần thử này đã được xử lý.'), can_anh: t('Ảnh đại diện chưa được duyệt — duyệt ảnh trước.'), khong_thay: t('Không tìm thấy lần thử này.'), anh_da_doi: t('Người này vừa đổi ảnh đại diện — đóng lại, tải lại hàng chờ rồi so lại với ảnh mới.'),
    forbidden: t('Bạn không có quyền kiểm duyệt.') };

  async function renderXacMinh(main) {
    const f = state.xm;
    main.innerHTML = dangTai;
    const phu = t('Người dùng chụp selfie theo một tư thế để nhận huy hiệu “Đã xác minh”. So selfie với ảnh đại diện hiện tại rồi duyệt hoặc từ chối. Danh sách không kèm ảnh; mỗi lần mở ảnh cần lý do và được ghi vào nhật ký quản trị.');
    let d;
    try { d = await rpc('admin_xac_minh_cho_duyet', { p_limit: TRANG, p_offset: f.trang * TRANG }); }
    catch (e) { if (laChuaMo(e)) { main.innerHTML = khung(t('Xác minh selfie'), esc(phu), canBanVa149()); return; } throw e; }
    const rows = (d && d.rows) || []; const tong = Number(d && d.tong) || 0;
    const cheDo = d && d.che_do === 'tu_dong' ? t('Tự động (có nhà cung cấp)') : d && d.che_do === 'tat' ? t('Tắt') : t('Thủ công');
    main.innerHTML = khung(t('Xác minh selfie'), esc(phu), `
      <div class="hint" style="margin-bottom:8px">${t('Chế độ')}: <b>${esc(cheDo)}</b> · ${t('Đang chờ')}: <b>${so(tong)}</b></div>
      <div class="list card" id="xmList" style="padding:4px 12px">${rows.length ? rows.map((r) => `
        <div class="item" style="cursor:default">
          <span class="t">
            <span class="n">${nguoiLink(r.nguoi)}${r.ly_do === 'doi_anh' ? ` <span class="tag warn">${t('Đổi ảnh đại diện — so lại')}</span>` : ''}</span>
            <span class="s" style="display:block;white-space:normal">${t('Tư thế được giao')}: ${esc(t(TU_THE_XM[r.tu_the] || r.tu_the))}${r.diem != null ? ` · ${t('Điểm tự động')}: ${esc(String(r.diem))}` : ''} · ${t('Lần thử trong 30 ngày')}: ${so(r.lan_30_ngay)}</span>
            <span class="m" style="display:block;white-space:normal">${t('Nộp lúc')} ${esc(fmtDate(r.nop_luc))}</span>
          </span>
          <button class="btn sm" data-xm="${esc(r.id)}">${t('So ảnh')}</button>
        </div>`).join('') : `<div class="empty">${t('Không có selfie nào đang chờ duyệt.')}</div>`}</div>
      <div class="pager" id="xmPager"></div>
      <div class="card" style="margin-top:12px;padding:12px">
        <b>${t('Thu hồi huy hiệu')}</b>
        <div class="row" style="gap:8px;margin-top:8px"><input id="xmUser" placeholder="${t('Mã người dùng (uuid)')}" style="flex:1"><button class="btn sm danger" id="xmThuHoi">${t('Thu hồi')}</button></div>
      </div>`);
    main.querySelectorAll('[data-xm]').forEach((b) => b.addEventListener('click', () => soAnhXacMinh(rows.find((r) => r.id === b.dataset.xm))));
    pager($('#xmPager'), tong, f.trang, (n) => { f.trang = n; render(); });
    $('#xmThuHoi').onclick = async () => {
      const u = ($('#xmUser').value || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(u)) { toast(t('Mã người dùng không hợp lệ.'), true); return; }
      const lyDo = await hoiLyDoViec(t('Thu hồi huy hiệu xác minh'), t('Người dùng được báo trong app. Selfie giữ 30 ngày rồi xoá.'), t('Thu hồi'), true); if (!lyDo) return;
      const k = await goiNhayCam('admin_xac_minh_thu_hoi', { p_user: u, p_ly_do: lyDo }, LOI_XM); if (!k) return;
      toast(t('Đã thu hồi huy hiệu.')); render();
    };
  }

  async function soAnhXacMinh(r) {
    if (!r) return;
    const lyDo = await hoiLyDo(t('So selfie xác minh với ảnh đại diện')); if (!lyDo) return;
    const urls = await moAnhRieng([r.selfie, r.anh_dai_dien].filter(Boolean), lyDo);
    const uS = urls[r.selfie], uA = urls[r.anh_dai_dien];
    modalRong(`<h2>${t('So selfie xác minh với ảnh đại diện')}</h2>
      <p>${t('Đã ghi nhật ký. Quyền xem ảnh hết hạn sau 10 phút.')} ${t('Tư thế được giao')}: <b>${esc(t(TU_THE_XM[r.tu_the] || r.tu_the))}</b></p>
      <div class="row" style="gap:12px;align-items:flex-start">
        <div style="flex:1"><div class="hint">${t('Selfie')}</div><div id="xmS"></div>${uS ? '' : `<div class="hint">${t('Không tải được tệp')}</div>`}</div>
        <div style="flex:1"><div class="hint">${t('Ảnh đại diện hiện tại')}</div><div id="xmA"></div>${uA ? '' : `<div class="hint">${t('Không tải được tệp')}</div>`}</div>
      </div>
      <p class="hint">${t('Chỉ duyệt khi cùng một người, đúng tư thế, và là ảnh chụp trực tiếp (không phải ảnh chụp lại ảnh hay màn hình).')}</p>
      <div class="row" style="gap:8px;margin-top:8px"><select id="xmLyDo">${LY_DO_XM.map(([v, l]) => `<option value="${v}">${esc(t(l))}</option>`).join('')}</select></div>
      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px">
        <button class="btn ghost" id="mCancel">${t('Đóng')}</button>
        <button class="btn danger" id="xmTuChoi">${t('Từ chối')}</button>
        <button class="btn" id="xmDat">${t('Duyệt')}</button>
      </div>`, (m) => {
      $('#mCancel', m).onclick = () => closeModal();
      for (const [id, u] of [['#xmS', uS], ['#xmA', uA]]) { if (u) { const img = document.createElement('img'); img.className = 'anh-rieng'; img.alt = ''; img.src = u; $(id, m).appendChild(img); } }
      let dangQuyet = false;   // rà soát 15/11: bấm đúp → lần hai báo "đã xử lý"
      const quyet = async (kq) => {
        if (dangQuyet) return;
        dangQuyet = true; $('#xmDat', m).disabled = true; $('#xmTuChoi', m).disabled = true;
        let k = null;
        try { k = await goiNhayCam('admin_xac_minh_quyet', { p_id: r.id, p_ket_qua: kq, p_ly_do: kq === 'tu_choi' ? $('#xmLyDo', m).value : null, p_anh: r.anh_dai_dien || null }, LOI_XM); }   // 187 (K5): máy chủ so với ảnh hiện tại
        finally { if (!k) { dangQuyet = false; $('#xmDat', m).disabled = false; $('#xmTuChoi', m).disabled = false; } }
        if (!k) return;
        closeModal(); toast(kq === 'dat' ? t('Đã duyệt — huy hiệu đã bật.') : t('Đã từ chối — người dùng được báo trong app.')); render();
      };
      $('#xmDat', m).onclick = () => quyet('dat');
      $('#xmTuChoi', m).onclick = () => quyet('tu_choi');
    });
  }

  async function moBangChung(r) {
    const lyDo = await hoiLyDo(t('Nội dung tin bị gỡ')); if (!lyDo) return;
    let e;
    try { e = await goiNhayCam('admin_group_evidence', { p_message: r.message_id, p_reason: lyDo }); }
    catch (x) { toast(laChuaMo(x) ? t('Máy chủ chưa mở admin_group_evidence cho trang quản trị.') : friendly(x), true); return; }
    if (!e) return;
    // Quyền xem tệp vừa được cấp (15 phút): bỏ URL cũ trong bộ nhớ đệm rồi xin lại.
    const tep = [e.image_path, e.video_path, e.audio_path];
    tep.filter(Boolean).forEach((p) => { urlCache.delete('f:' + p); urlCache.delete('t:' + p); });
    const [uAnh, uVideo, uThoai] = await Promise.all(tep.map((p) => (p ? photoUrl(p, false, true).catch(() => null) : null)));
    const hong = (p, u) => (p && !u ? `<div class="hint">${t('Không tải được tệp')}</div>` : '');
    modalRong(`<h2>${t('Nội dung tin bị gỡ')}</h2>
      <p>${t('Đã ghi nhật ký. Quyền xem tệp hết hạn sau 15 phút.')} ${t('Máy chủ giữ bằng chứng này 180 ngày')}${e.retain_until ? ` (${t('tới')} ${esc(fmtNgay(e.retain_until))})` : ''}.</p>
      <div class="msg">
        <span class="who">${esc((r.nguoi_gui && r.nguoi_gui.ten) || String(e.sender_id || '').slice(0, 8))}</span><span class="when">${esc(fmtDate(e.message_created_at))}</span>
        ${r.nhom ? `<div class="hint">${t('Nhóm')}: ${esc(r.nhom)}</div>` : ''}
        ${e.body ? `<div class="body">${esc(e.body)}</div>` : ''}
        <div id="mMedia"></div>${hong(e.image_path, uAnh)}${hong(e.video_path, uVideo)}${hong(e.audio_path, uThoai)}
        ${e.lat != null && e.lng != null ? `<div class="hint">📍 ${esc(Number(e.lat).toFixed(5))}, ${esc(Number(e.lng).toFixed(5))}</div>` : ''}
        ${!e.body && !e.image_path && !e.video_path && !e.audio_path && e.lat == null ? `<div class="hint">${t('Tin không có nội dung còn lưu.')}</div>` : ''}
      </div>
      <dl class="kv" style="margin-top:8px">
        <dt>${t('Người gỡ')}</dt><dd>${esc((r.nguoi_go && r.nguoi_go.ten) || '—')} · ${esc(fmtDate(e.removed_at))}</dd>
        <dt>${t('Lý do gỡ')}</dt><dd>${esc(e.reason || '—')}</dd>
      </dl>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="mCancel">${t('Đóng')}</button></div>`, (m) => {
      $('#mCancel', m).onclick = () => closeModal();
      const box = $('#mMedia', m);
      if (uAnh) { const img = document.createElement('img'); img.className = 'anh-rieng'; img.alt = ''; img.src = uAnh; box.appendChild(img); }
      if (uVideo) box.appendChild(theMedia('video', uVideo));
      if (uThoai) box.appendChild(theMedia('audio', uThoai));
    });
  }

  // ---------------------------------------------------------------- QUÉT STORY (084 §P)
  // Hàng chờ chỉ có việc khi story_flags.public_screening bật: Story CÔNG KHAI tới người lạ sau khi được quét / người duyệt.
  /** Tệp của một trang Story: composition.assets = { aN: { p: ảnh (hoặc ảnh bìa của video), v?: video (123) } }. */
  const tepStory = (comp) => Object.values((comp && typeof comp === 'object' && comp.assets) || {})
    .filter((a) => a && typeof a === 'object' && typeof a.p === 'string')
    .map((a) => ({ p: a.p, v: typeof a.v === 'string' ? a.v : null }));
  const SCREEN = () => ({ manual: t('Cần người xem'), pending: t('Đang chờ máy quét') });

  async function renderQuetStory(main) {
    main.innerHTML = dangTai;
    const phu = t('Story CÔNG KHAI chỉ tới người lạ sau khi được quét — nhưng chỉ khi cờ story_flags.public_screening đang bật. Hiện cờ này TẮT theo quyết định của chủ dự án, nên danh sách trống là bình thường.');
    let rows;
    try { rows = await rpc('admin_story_screen_queue', { p_limit: 50 }); }
    catch (e) {
      if (!laChuaMo(e)) throw e;
      main.innerHTML = khung(t('Quét Story'), esc(phu), `<div class="alertbar warn"><div><b>${t('Máy chủ chưa mở hàng chờ quét Story cho trang quản trị')}</b><br>${t('admin_story_screen_queue / admin_story_screen (084) chưa có trong danh sách trắng api_functions. Không ảnh hưởng gì khi cờ quét đang tắt.')}</div></div>`);
      return;
    }
    rows = rows || [];
    main.innerHTML = khung(t('Quét Story'), esc(phu), `
      <div class="grid" id="qsGrid">${rows.length ? rows.map((s) => {
        const tep = tepStory(s.composition);
        return `<div class="pcard" data-id="${esc(s.id)}">
          ${tep.length ? tep.map((a) => (a.v ? `<video controls playsinline preload="none" data-vid="${esc(a.v)}" style="width:100%;display:block;background:var(--surface3)"></video>`
            : `<img data-photo="${esc(a.p)}" data-full data-zoom="${esc(a.p)}" title="${t('Bấm để xem to')}" alt="" style="opacity:0;transition:opacity .2s">`)).join('')
            : `<div class="hint" style="padding:10px">${t('Trang này không có ảnh — chỉ chữ / đồ hoạ.')}</div>`}
          <div class="b">
            <div class="row" style="gap:6px"><span class="tag ${s.screen === 'manual' ? 'warn' : ''}">${esc(SCREEN()[s.screen] || s.screen || '—')}</span><a href="#nguoidung/${esc(s.owner_id)}" style="font-weight:700;color:inherit;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.owner_name || '?')}</a></div>
            <div class="hint">${esc(fmtDate(s.created_at))} · ${t('lần quét')} ${so(s.attempts)}${s.screen_reason ? '<br>' + esc(s.screen_reason) : ''}</div>
            <details><summary class="hint" style="cursor:pointer">${t('Bố cục (JSON)')}</summary><pre class="quote" style="white-space:pre-wrap;max-height:240px;overflow:auto;font-size:11px">${esc(JSON.stringify(s.composition, null, 2))}</pre></details>
            <div class="r"><button class="btn ok" data-set="approved">${t('Duyệt')}</button><button class="btn danger" data-set="rejected">${t('Từ chối')}</button></div>
          </div></div>`;
      }).join('') : `<div class="empty" style="grid-column:1/-1">${t('Không có trang Story nào chờ quét.')}</div>`}</div>`);
    const grid = $('#qsGrid');
    grid.querySelectorAll('video[data-vid]').forEach(async (v) => {
      const p = v.getAttribute('data-vid'); v.removeAttribute('data-vid');
      let u = null; try { u = await photoUrl(p, false); } catch (e) { u = null; }
      if (u) v.src = u; else v.replaceWith(khungAnhHong());
    });
    grid.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => quyetStory(b.closest('.pcard'), b.dataset.set)));
    hydratePhotos(grid); noiXemAnh(grid);
  }
  async function quyetStory(card, status) {
    if (!card || dangGui) return;
    let lyDo = null;
    if (status === 'rejected') {
      lyDo = await hoiLyDoViec(t('Từ chối trang Story'), t('Trang này không tới được ai ngoài chủ của nó. Chủ Story không thấy lý do.'), t('Từ chối'), true);
      if (!lyDo) return;
    }
    dangGui = true;
    card.querySelectorAll('button').forEach((x) => { x.disabled = true; });
    try {
      await rpc('admin_story_screen', { p_slide: card.dataset.id, p_status: status, p_reason: lyDo });
      card.style.opacity = '0.35';
      toast(status === 'approved' ? t('Đã duyệt') : t('Đã từ chối'));
    } catch (e) {
      card.querySelectorAll('button').forEach((x) => { x.disabled = false; });
      const m = (e && e.message) || '';
      toast(laChuaMo(e) ? t('Máy chủ chưa mở hàng chờ quét Story cho trang quản trị')
        : /unavailable/.test(m) ? t('Trang Story này không còn (đã xoá hoặc đã bị gỡ).')
        : /chính bạn/.test(m) ? t(m) : friendly(e), true);
    } finally { dangGui = false; }
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
          <span class="m">${t('vào')} ${esc(ago(u.last_seen))} · ${t('tham gia')} ${esc(fmtNgay(u.created_at))} · ${u.so_bai} ${t('bài ·')} ${so(u.so_tin)} ${t('tin')}${u.reports_received ? ` ${t('· bị báo cáo')} ${u.reports_received}` : ''}${u.co_thong_bao ? '' : ` ${t('· tắt thông báo')}`}</span>
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
            <button class="btn" data-plus>${t('Plus / thanh toán')}<small>${t('Quyền lợi, khuyến mãi, sự kiện')}</small></button>
          </div></div>` : ''}
        ${u && u.id && !u.deleted ? `<div class="card stack" style="gap:8px" id="dtCard" hidden><h2>${t('Tên hiển thị & @username')}</h2>
          <p class="hint" style="margin:0">${t('Luật: tên hiển thị 30 ngày một lần, @username 60 ngày một lần — Free và Plus như nhau. Chỉ mở ngoại lệ khi có lý do an toàn đã kiểm chứng (quấy rối, lộ thông tin cá nhân, mạo danh).')}</p>
          <div class="hint" id="dtTinh" aria-live="polite"></div>
          <div class="actions"><button class="btn" id="dtCho">${t('Cho đổi tên một lần')}<small>${t('Không phải chờ — cần lý do, ghi nhật ký, hết hạn sau 7 ngày')}</small></button></div></div>` : ''}
        ${u && u.id && !u.deleted ? `<div class="card stack" style="gap:8px" id="bhCard" hidden><h2>${t('Bài hát trên hồ sơ')}</h2>
          <div class="hint" id="bhTinh" aria-live="polite"></div>
          <div class="actions" id="bhHanh" hidden><button class="btn danger" id="bhGo">${t('Gỡ bài hát')}<small>${t('Cần lý do, có ghi nhật ký. Người dùng chọn lại bài khác được')}</small></button></div></div>` : ''}
      </div>`;
    $('#paneClose', pane).addEventListener('click', () => nav('nguoidung'));
    pane.querySelectorAll('[data-rieng]').forEach((b) => b.addEventListener('click', () => (b.dataset.rieng === 'album' ? xemAlbumRieng(u) : xemHoiThoai(u)).catch((e) => toast(friendly(e), true))));
    pane.querySelectorAll('[data-plus]').forEach((b) => b.addEventListener('click', () => xemPlus(u).catch((e) => toast(friendly(e), true))));   // 172a
    pane.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => userAction(u, b.dataset.act)));
    hydratePhotos(pane); noiXemAnh(pane);
    if ($('#dtCard', pane)) { $('#dtCho', pane).addEventListener('click', () => choDoiTen(u, pane)); veDoiTen(u, pane); }
    if ($('#bhCard', pane)) { $('#bhGo', pane).addEventListener('click', () => goBaiHat(u, pane)); veBaiHat(u, pane); }   // 214
  }

  // ---------------------------------------------------------------- bài hát trên hồ sơ (214, mục 45)
  // Chỉ chữ (tên bài, ca sĩ, nhãn E, trạng thái) + link tới bài trên Apple Music — không ảnh bìa (CSP của trang không mở mzstatic.com), không
  // phát. Máy chủ quyết mọi thứ (chi_admin; gỡ cần quyền 'moderate', lý do ≥ 3 ký tự, không tự gỡ của mình, nhật ký). Chưa có 214 → ẩn thẻ.
  const TT_BH = () => ({ ok: t('đang hiện'), mat: t('Apple Music đã gỡ bài — đang ẩn'), khong_nghe_thu: t('không còn bản nghe thử — đang ẩn') });
  async function veBaiHat(u, pane) {
    const card = $('#bhCard', pane); if (!card) return;
    try {
      const b = await rpc('admin_bai_hat_xem', { p_user: u.id });
      if (!b) { card.hidden = true; return; }
      card.hidden = false; $('#bhHanh', pane).hidden = false;
      const lk = /^https:\/\/music\.apple\.com\//.test(b.lien_ket || '') ? ` · <a href="${esc(b.lien_ket)}" target="_blank" rel="noopener noreferrer">${t('Mở trên Apple Music')}</a>` : '';
      $('#bhTinh', pane).innerHTML = `<b>${esc(b.ten)}</b> · ${esc(b.ca_si)}${b.nhay_cam ? ` <span class="tag warn">E</span>` : ''}${lk}<br>`
        + `${esc(TT_BH()[b.trang_thai] || b.trang_thai)} · ${t('chọn lúc')} ${esc(fmtDate(b.chon_luc))}`;
    } catch (e) {
      if (laChuaCo(e)) { card.hidden = true; return; }
      card.hidden = false; $('#bhTinh', pane).textContent = friendly(e);
    }
  }
  async function goBaiHat(u, pane) {
    if (dangGui) return;
    const ans = await confirmAction({ title: t('Gỡ bài hát'), text: `${u.display_name || t('người này')} ${t('sẽ không còn bài hát trên hồ sơ. Họ chọn lại bài khác được. Việc gỡ được ghi vào nhật ký.')}`,
      noteLabel: t('Lý do (bắt buộc, ít nhất 3 ký tự)'), okLabel: t('Gỡ bài hát'), danger: true });
    if (!ans) return;
    if (ans.note.length < 3) { toast(LOI_NHAY_CAM.reason_required, true); return; }
    dangGui = true;
    try {
      await rpc('admin_bai_hat_go', { p_user: u.id, p_ly_do: ans.note });
      toast(t('Đã gỡ bài hát khỏi hồ sơ.'));
      await veBaiHat(u, pane);
    } catch (e) {
      const m = (e && e.message) || '';
      toast(laChuaCo(e) ? t('Máy chủ chưa có bản vá 214.')
        : /reason_required/.test(m) ? LOI_NHAY_CAM.reason_required
        : /forbidden/.test(m) ? LOI_NHAY_CAM.forbidden
        : /not_found/.test(m) ? LOI_NHAY_CAM.not_found
        : /own_content/.test(m) ? LOI_NHAY_CAM.self_report
        : friendly(e), true);
    } finally { dangGui = false; }
  }

  // ---------------------------------------------------------------- đổi tên (101)
  // Máy chủ quyết định mọi thứ (chi_admin, lý do ≥ 3 ký tự, không tự cấp cho mình, quyền theo vai trò của 065, nhật ký).
  // Trang này chỉ hiện ngày được đổi lại và gửi yêu cầu. Máy chủ chưa có 101 (PGRST202) → ẩn cả thẻ.
  const laChuaCo = (e) => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function/i.test(e.message || ''));
  function dongDoiTen(nhan, x) {
    if (!x) return `${esc(nhan)}: —`;
    const mien = x.mien ? ` · <span class="tag ok">${t('đang có lượt ngoại lệ')}</span>` : '';
    const lan = x.last_at ? ` · ${t('đổi lần cuối')} ${esc(fmtDate(x.last_at))}` : '';
    return `<b>${esc(nhan)}</b>: ${x.next_at ? `${t('đổi lại được từ')} ${esc(fmtDate(x.next_at))}` : `${t('đổi được ngay')}`}${lan}${mien}`;
  }
  async function veDoiTen(u, pane) {
    const card = $('#dtCard', pane); if (!card) return;
    try {
      const s = await rpc('admin_xem_doi_ten', { p_user: u.id });
      if (!s || s.status !== 'ok') { card.hidden = true; return; }
      card.hidden = false;
      $('#dtTinh', pane).innerHTML = `${dongDoiTen(t('Tên hiển thị'), s.ten)}<br>${dongDoiTen('@username', s.username)}${s.an_han_den ? `<br>${t('Tài khoản mới: lần sửa trong 24 giờ đầu còn tới')} ${esc(fmtDate(s.an_han_den))}` : ''}`;
    } catch (e) {
      if (laChuaCo(e)) { card.hidden = true; return; }
      card.hidden = false; $('#dtTinh', pane).textContent = friendly(e);
    }
  }
  function hoiChoDoiTen(name) {
    return new Promise((resolve) => {
      modal(`
        <h2>${t('Cho đổi tên một lần')}</h2>
        <p>${esc(name)} ${t('được đổi MỘT lần không phải chờ 30 / 60 ngày. Lượt này hết hạn sau 7 ngày nếu không dùng. Định dạng, tên dành riêng và tên đã có người dùng vẫn bị chặn như thường. Người dùng không thấy lý do.')}</p>
        <label class="hint" for="mTruong">${t('Trường')}</label>
        <select class="text" id="mTruong" style="margin-bottom:10px">
          <option value="ten">${t('Tên hiển thị')}</option><option value="username">@username</option><option value="ca_hai">${t('Cả hai')}</option>
        </select>
        <label class="hint" for="mNote">${t('Lý do (bắt buộc, ít nhất 3 ký tự)')}</label>
        <textarea class="note" id="mNote" placeholder="${esc(t('Số phiếu hỗ trợ, loại sự việc (quấy rối / lộ thông tin / mạo danh), đã kiểm chứng thế nào'))}"></textarea>
        <div class="row" style="justify-content:flex-end;margin-top:12px">
          <button class="btn ghost" id="mCancel">${t('Huỷ')}</button>
          <button class="btn primary" id="mOk">${t('Cho đổi')}</button>
        </div>`, (m) => {
        modalHuy = () => resolve(null);
        $('#mCancel', m).onclick = () => closeModal();
        $('#mOk', m).onclick = () => {
          const note = $('#mNote', m).value.trim();
          if (note.length < 3) { toast(LOI_NHAY_CAM.reason_required, true); $('#mNote', m).focus(); return; }
          modalHuy = null;
          const truong = $('#mTruong', m).value;
          closeModal(); resolve({ truong, note });
        };
      });
    });
  }
  async function choDoiTen(u, pane) {
    if (dangGui) return;
    const ans = await hoiChoDoiTen(u.display_name || `${t('người này')}`); if (!ans) return;
    dangGui = true;
    try {
      const d = await rpc('admin_cho_doi_ten', { p_user: u.id, p_truong: ans.truong, p_ly_do: ans.note });
      toast(`${t('Xong')}: ${ACTION.name_override}${d && d.het_han ? ` — ${t('hết hạn')} ${fmtDate(d.het_han)}` : ''}`);
      await veDoiTen(u, pane);
    } catch (e) {
      const m = (e && e.message) || '';
      toast(laChuaCo(e) ? t('Máy chủ chưa có bản vá 101.')
        : /reason_required/.test(m) ? LOI_NHAY_CAM.reason_required
        : /forbidden/.test(m) ? LOI_NHAY_CAM.forbidden
        : /not_found/.test(m) ? LOI_NHAY_CAM.not_found
        : /unavailable/.test(m) ? t('Không làm được: không tự mở cho chính mình, hoặc tài khoản không phải quản trị viên.')
        : friendly(e), true);
    } finally { dangGui = false; }
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
    const canLyDo = act === 'suspended' || act === 'banned' || act === 'delete';   // 166c
    if (canLyDo) cfgs[act].noteLabel = t('Lý do (bắt buộc, ít nhất 3 ký tự)');
    const ans = await confirmAction(cfgs[act]); if (!ans) return;
    if (canLyDo && (ans.note || '').trim().length < 3) { toast(t('Cần ghi lý do (ít nhất 3 ký tự).'), true); return; }
    dangGui = true;
    try {
      if (act === 'warn') await rpc('admin_warn_user', { p_user: u.id, p_text: ans.note || null });
      else if (act === 'delete') await rpcHaiLop('admin_delete_user', { p_user: u.id, p_reason: ans.note || null });
      else await rpcHaiLop('admin_set_user_status', { p_user: u.id, p_status: act, p_days: ans.days, p_reason: ans.note || null });
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
            <span class="m">${t('tham gia')} ${esc(fmtNgay(a.tham_gia))}${a.nuoc ? ' · ' + esc(a.nuoc) : ''} · ${laBai ? `${so(a.so_bai)} ${t('bài')}` : `${so(a.so_binh_luan)} ${t('bình luận')}`}${a.bi_bao_cao ? ` ${t('· bị báo cáo')} ${a.bi_bao_cao} ${t('lần')}` : ''}</span></span>
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

  // ---------------------------------------------------------------- SỰ KIỆN (151)
  // Danh sách cần xử lý (chờ duyệt / bị ẩn / bị báo cáo) + chi tiết. Hiện / Ẩn / gỡ bìa đều cần lý do và được máy chủ ghi
  // nhật ký (admin_actions). Máy chủ chưa có 151 → một dòng báo ngắn, các mục khác vẫn chạy.
  const canBanVa151 = (them) => `<div class="alertbar warn"><div><b>${t('Cần bản vá 151 trên máy chủ')}</b><br>${them || t('Áp supabase/151-quan-tri-su-kien-thoai.sql trong SQL Editor. 151 chỉ áp được khi máy chủ đã có tính năng Sự kiện và kiểm duyệt nhóm (065, 119, 133–141). Các mục khác vẫn dùng bình thường.')}</div></div>`;
  /** Lỗi của các hàm quản trị 151 → câu dễ hiểu. */
  function loiQuanTri(e) {
    const m = (e && e.message) || '';
    if (laChuaCo(e)) return t('Cần bản vá 151 trên máy chủ');
    if (/\bforbidden\b/.test(m)) return LOI_NHAY_CAM.forbidden;
    if (/reason_required/.test(m)) return LOI_NHAY_CAM.reason_required;
    if (/^not found$|not_found/.test(m)) return LOI_NHAY_CAM.not_found;
    if (/chính bạn/.test(m)) return t(m);
    return friendly(e);
  }
  /** Hỏi lý do cho một thao tác (bắt buộc, ít nhất 3 ký tự). null khi huỷ. */
  async function hoiLyDoViec(title, text, okLabel, danger) {
    const ans = await confirmAction({ title, text, noteLabel: t('Lý do (bắt buộc, ít nhất 3 ký tự)'), okLabel, danger });
    if (!ans) return null;
    if (ans.note.length < 3) { toast(LOI_NHAY_CAM.reason_required, true); return null; }
    return ans.note;
  }
  const tagSuKien = (s) => `${s.trang_thai === 'cho_duyet' ? `<span class="tag warn">${t('Chờ duyệt')}</span>`
    : s.trang_thai === 'an' ? `<span class="tag danger">${t('Bị ẩn')}</span>` : `<span class="tag ok">${t('Đang hiện')}</span>`}${s.da_huy || s.huy_luc ? `<span class="tag">${t('Đã huỷ')}</span>` : ''}`;
  const noiSuKien = (s) => (s.truc_tuyen ? t('Trực tuyến') : [s.khu_vuc, tenNuoc(s.quoc_gia)].filter(Boolean).join(' · ') || '—');
  const LOC_SK = () => [['can_xu_ly', t('Cần xử lý')], ['cho_duyet', t('Chờ duyệt')], ['an', t('Bị ẩn')], ['bao_cao', t('Bị báo cáo')], ['sap_toi', t('Sắp diễn ra')], ['tat_ca', t('Tất cả')]];

  // ---------------------------------------------------------------- nhãn dán (215, mục 47)
  // Danh mục bộ / nhãn (kể cả đang tắt) với ảnh thu nhỏ từ kho CÔNG KHAI `stickers` của đúng máy chủ đang đăng nhập (CSP img-src đã mở
  // máy chủ đó — không thêm nguồn nào), số tin đã gửi (tổng / 30 ngày, không id người dùng) và nút bật / tắt. Máy chủ quyết mọi thứ
  // (chi_admin; bật / tắt cần quyền 'moderate', lý do ≥ 3 ký tự, xác thực hai lớp khi bắt buộc; ghi nhật ký). Chưa có 215 → một dòng báo.
  const anhNhanDan = (p) => `${cfg.SUPABASE_URL}/storage/v1/object/public/stickers/${String(p).split('/').map(encodeURIComponent).join('/')}`;
  async function renderNhanDan(main) {
    main.innerHTML = khung(t('Nhãn dán'), esc(t('Bộ nhãn dán HIMO tự vẽ và duyệt. Tắt một bộ hay một nhãn thì không ai gửi được nữa, tin đã gửi hiện chữ thay thế. Thêm bộ mới bằng công cụ nhập (cần câu duyệt của chủ dự án).')),
      `<div id="ndThan">${dangTai}</div>`);
    let d;
    try { d = await rpc('admin_nhan_dan_ds'); } catch (e) {
      if (laChuaCo(e)) { $('#ndThan').innerHTML = `<div class="card"><div class="hint">${t('Máy chủ chưa có bản vá 215.')}</div></div>`; return; }
      throw e;
    }
    const packs = (d && Array.isArray(d.packs)) ? d.packs : [];
    const than = $('#ndThan');
    than.innerHTML = packs.length ? `<div class="stack">${packs.map(theBoNhan).join('')}</div>`
      : `<div class="empty">${t('Chưa có bộ nhãn dán nào trên máy chủ này.')}</div>`;
    than.querySelectorAll('[data-nd-bo]').forEach((b) => b.addEventListener('click', () => batTatNhanDan('bo', b.dataset.ndBo, b.dataset.bat === '1', main)));
    than.querySelectorAll('[data-nd-nhan]').forEach((b) => b.addEventListener('click', () => batTatNhanDan('nhan', b.dataset.ndNhan, b.dataset.bat === '1', main)));
  }
  function theBoNhan(b) {
    const ten = (b.names && (b.names[lang] || b.names.vi || b.names.en)) || b.id;
    const ds = Array.isArray(b.stickers) ? b.stickers : [];
    const nhan = ds.map((s) => {
      const em = Array.isArray(s.emoji) ? s.emoji.join(' ') : '';
      return `<figure class="card" style="margin:0;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px${s.active ? '' : ';opacity:.5'}">
        <img src="${esc(anhNhanDan(s.path))}" alt="${esc(em)}" width="72" height="72" loading="lazy" style="object-fit:contain">
        <figcaption class="hint" style="text-align:center">${esc(em)} · ${so(s.tong)}</figcaption>
        <button class="btn ghost sm" data-nd-nhan="${esc(s.id)}" data-bat="${s.active ? '0' : '1'}">${s.active ? t('Tắt nhãn') : t('Bật nhãn')}</button>
      </figure>`;
    }).join('');
    return `<section class="card stack" style="gap:10px">
      <div class="sec"><h2>${esc(ten)}</h2>
        <span>${b.active ? `<span class="tag ok">${t('đang bật')}</span>` : `<span class="tag">${t('đang tắt')}</span>`}${b.plus_only ? ` <span class="tag accent">HIMO Plus</span>` : ''}</span>
        <button class="btn sm${b.active ? ' ghost' : ''}" data-nd-bo="${esc(b.id)}" data-bat="${b.active ? '0' : '1'}">${b.active ? t('Tắt bộ') : t('Bật bộ')}</button></div>
      <p class="hint">${esc(b.id)} · v${esc(b.version)} · ${so(ds.length)} ${dem(ds.length, 'nhãn')} · ${t('đã gửi')} ${so(b.tong)} (${t('30 ngày')}: ${so(b.d30)})</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px">${nhan}</div>
    </section>`;
  }
  async function batTatNhanDan(loai, id, bat, main) {
    if (dangGui) return;
    const ans = await confirmAction({
      title: bat ? (loai === 'bo' ? t('Bật bộ nhãn dán') : t('Bật nhãn dán')) : (loai === 'bo' ? t('Tắt bộ nhãn dán') : t('Tắt nhãn dán')),
      text: bat ? t('Mọi người sẽ gửi được nhãn này. Việc bật được ghi vào nhật ký.')
        : t('Không ai gửi được nữa. Tin đã gửi hiện chữ thay thế. Việc tắt được ghi vào nhật ký.'),
      noteLabel: t('Lý do (bắt buộc, ít nhất 3 ký tự)'), okLabel: bat ? t('Bật') : t('Tắt'), danger: !bat });
    if (!ans) return;
    if (ans.note.length < 3) { toast(LOI_NHAY_CAM.reason_required, true); return; }
    dangGui = true;
    try {
      await rpcHaiLop(loai === 'bo' ? 'admin_nhan_dan_bat_bo' : 'admin_nhan_dan_bat_nhan', { p_id: id, p_bat: bat, p_ly_do: ans.note });
      toast(bat ? t('Đã bật.') : t('Đã tắt.'));
      await renderNhanDan(main);
    } catch (e) {
      const m = (e && e.message) || '';
      toast(laChuaCo(e) ? t('Máy chủ chưa có bản vá 215.')
        : /reason_required/.test(m) ? LOI_NHAY_CAM.reason_required
        : /mfa_required/.test(m) ? LOI_NHAY_CAM.mfa_required
        : /forbidden/.test(m) ? LOI_NHAY_CAM.forbidden
        : /not_found/.test(m) ? LOI_NHAY_CAM.not_found
        : friendly(e), true);
    } finally { dangGui = false; }
  }

  async function renderSuKien(main) {
    const f = state.sk;
    main.innerHTML = `<div class="cols${state.id ? '' : ' wide'}">
      <section>
        <div class="sec"><h2>${t('Sự kiện')}</h2><span class="hint" id="skTong"></span></div>
        <p class="sub">${t('Sự kiện chờ duyệt, bị ẩn (kể cả tự ẩn khi đủ 3 báo cáo) hoặc đang bị báo cáo. Bấm một sự kiện để xem đầy đủ và xử lý.')}</p>
        <div class="chips" id="skLoc" role="group" aria-label="${esc(t('Lọc sự kiện'))}"></div>
        <div class="filters" style="margin-top:8px">
          <input id="skQ" placeholder="${esc(t('Tiêu đề, khu vực, mã sự kiện…'))}" aria-label="${esc(t('Tìm sự kiện'))}" value="${esc(f.q)}" autocomplete="off">
        </div>
        <div class="list card" id="skList" style="padding:4px 12px;margin-top:10px"><div class="skeleton"></div><div class="skeleton"></div></div>
        <div class="pager" id="skPager"></div>
      </section>
      <aside class="pane" id="skPane" ${state.id ? '' : 'hidden'}></aside>
    </div>`;
    $('#skQ').onkeydown = (e) => { if (e.key === 'Enter') { f.q = $('#skQ').value.trim(); f.trang = 0; nav('noidung/sukien'); } };
    let d;
    try { d = await rpc('admin_su_kien_ds', { p_loc: f.loc, p_q: f.q || null, p_limit: TRANG, p_offset: f.trang * TRANG }); }
    catch (e) { if (laChuaCo(e)) { main.innerHTML = khung(t('Sự kiện'), '', canBanVa151()); return; } throw e; }
    const dm = (d && d.dem) || {}; const rows = (d && d.rows) || []; const tong = Number(d && d.tong) || 0;
    const nLoc = { cho_duyet: dm.cho_duyet, an: dm.an, bao_cao: dm.bao_cao };
    $('#skLoc').innerHTML = LOC_SK().map(([k, l]) => `<button class="chip" data-loc="${k}" aria-pressed="${f.loc === k}">${esc(l)}${nLoc[k] ? ` (${so(nLoc[k])})` : ''}</button>`).join('');
    $('#skLoc').querySelectorAll('[data-loc]').forEach((b) => b.addEventListener('click', () => { f.loc = b.dataset.loc; f.trang = 0; nav('noidung/sukien'); }));
    $('#skTong').textContent = tong ? `${so(tong)} ${dem(tong, 'sự kiện')}` : '';
    const list = $('#skList');
    list.innerHTML = rows.length ? rows.map(dongSuKien).join('')
      : `<div class="empty">${f.loc === 'can_xu_ly' && !f.q ? t('Không có sự kiện nào cần xử lý. 🎉') : t('Không có sự kiện nào khớp bộ lọc.')}</div>`;
    list.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => nav('noidung/sukien', b.dataset.open)));
    pager($('#skPager'), tong, f.trang, (n) => { f.trang = n; nav('noidung/sukien'); });
    hydratePhotos(list);
    if (state.id) await renderSuKienPane($('#skPane'), state.id);
  }

  function dongSuKien(s) {
    const tc = s.to_chuc || {};
    return `<button class="item" data-open="${esc(s.id)}" aria-current="${state.id === s.id}">
      ${avatar(s.bia && s.bia_trang_thai === 'duyet' ? s.bia : null, s.tieu_de)}
      <span class="t">
        <span class="n">${esc(s.tieu_de || '—')} ${tagSuKien(s)}${s.so_bao_cao ? `<span class="tag danger">${so(s.so_bao_cao)} ${dem(s.so_bao_cao, 'báo cáo')}</span>` : ''}${LOAI_SK[s.loai] ? `<span class="tag accent">${esc(LOAI_SK[s.loai])}</span>` : ''}</span>
        <span class="s" style="display:block">${esc(tc.ten || t('Tài khoản đã xoá'))} · ${esc(fmtDate(s.bat_dau))} · ${esc(noiSuKien(s))}</span>
        <span class="m" style="display:block;white-space:normal">${so(s.so_di)} ${t('người sẽ đi')}${s.bao_cao_moi ? ` · ${t('báo cáo mới nhất')} ${esc(ago(s.bao_cao_moi))}` : ''} · ${t('tạo')} ${esc(ago(s.tao_luc))}</span>
      </span>
    </button>`;
  }

  /** Chi tiết một sự kiện: nội dung đầy đủ, người tổ chức, báo cáo (đang mở + đã xử lý), nhóm chat, nhật ký quản trị, nút xử lý. */
  async function renderSuKienPane(pane, id) {
    pane.hidden = false;
    pane.innerHTML = '<div class="stack"><div class="skeleton"></div><div class="skeleton"></div></div>';
    const d = await rpc('admin_su_kien_chi_tiet', { p_id: id });
    const quay = `<button class="btn ghost sm sheet-close" id="paneClose">${t('← Danh sách')}</button>`;
    if (!d) {
      pane.innerHTML = `${quay}<div class="card"><h2>${t('Không tìm thấy sự kiện')}</h2><div class="hint">${t('Sự kiện này không còn (có thể đã bị xoá).')}</div></div>`;
      $('#paneClose', pane).onclick = () => nav('noidung/sukien');
      return;
    }
    pane.innerHTML = `${quay}
      <div class="stack">
        ${theSuKien(d)}
        ${theXuLySuKien(d)}
        ${theToChuc(d.to_chuc)}
        ${theBaoCaoSuKien(d.bao_cao || [], d.bao_cao_cu || [])}
        ${theNhomChatSuKien(d.nhom_chat)}
        ${nhatKyNgan((d.nhat_ky || []).map((a) => ({ created_at: a.luc, action: a.action, admin: a.admin, note: a.ly_do })))}
      </div>`;
    $('#paneClose', pane).onclick = () => nav('noidung/sukien');
    pane.querySelectorAll('[data-sk]').forEach((b) => b.addEventListener('click', () => thaoTacSuKien(d, b.dataset.sk)));
    const mb = $('#skMoBia', pane); if (mb) mb.addEventListener('click', () => moBiaSuKien(d, mb));
    hydratePhotos(pane); noiXemAnh(pane);
  }

  const PHAM_VI_SK = () => ({ cong_khai: t('Công khai'), ban_be: t('Bạn bè'), nhom: t('Thành viên nhóm') });
  const BIA_SK = () => ({ cho: t('đang chờ máy duyệt'), duyet: t('đã duyệt'), tu_choi: t('máy đã từ chối') });
  function theSuKien(d) {
    // Quản trị viên đọc được bìa khi bìa đã duyệt và sự kiện công khai, chưa huỷ (133); còn lại mở qua admin_mo_anh (ghi nhật ký).
    const docBia = d.bia && d.bia_trang_thai === 'duyet' && d.pham_vi === 'cong_khai' && !d.huy_luc;
    return `<div class="card stack" style="gap:10px">
      <div class="row" style="justify-content:space-between;align-items:flex-start"><h2>${esc(d.tieu_de || '—')}</h2><span class="row" style="gap:4px">${tagSuKien(d)}</span></div>
      ${d.bia ? `<div>${docBia ? `<img class="photo" style="max-width:100%" data-photo="${esc(d.bia)}" data-full data-zoom="${esc(d.bia)}" alt="${esc(t('Ảnh bìa'))}" title="${t('Bấm để xem to')}">`
        : `<button class="btn sm" id="skMoBia">${t('Mở ảnh bìa (ghi nhật ký)')}</button>`}
        <div class="hint">${t('Ảnh bìa')}: ${esc(BIA_SK()[d.bia_trang_thai] || d.bia_trang_thai || '—')}${d.bia_ma ? ` · ${t('Mã')}: ${esc(d.bia_ma)}` : ''}</div></div>` : ''}
      ${d.mo_ta ? `<div class="quote">${esc(d.mo_ta)}</div>` : `<div class="hint">${t('Không có mô tả.')}</div>`}
      <dl class="kv">
        <dt>${t('Loại')}</dt><dd>${esc(LOAI_SK[d.loai] || d.loai || '—')}</dd>
        <dt>${t('Thời gian')}</dt><dd>${esc(fmtDate(d.bat_dau))}${d.ket_thuc ? ` → ${esc(fmtDate(d.ket_thuc))}` : ''}</dd>
        ${d.truc_tuyen ? `<dt>${t('Trực tuyến')}</dt><dd style="overflow-wrap:anywhere">${esc(d.link || d.dia_diem || '—')}</dd>`
          : `<dt>${t('Địa điểm')}</dt><dd>${esc(d.dia_diem || '—')}${d.khu_vuc ? ` · ${esc(d.khu_vuc)}` : ''}${d.quoc_gia ? ` · ${esc(tenNuoc(d.quoc_gia))}` : ''}${d.an_dia_chi ? ` <span class="tag">${t('ẩn địa chỉ chính xác')}</span>` : ''}</dd>`}
        <dt>${t('Sức chứa')}</dt><dd>${d.suc_chua ? so(d.suc_chua) : t('không giới hạn')}</dd>
        <dt>${t('Ai xem được')}</dt><dd>${esc(PHAM_VI_SK()[d.pham_vi] || d.pham_vi || '—')}${d.nhom ? ` · <b>${esc(d.nhom.title || '—')}</b>` : ''}</dd>
        <dt>${t('Đăng ký')}</dt><dd>${so(d.so_di)} ${t('sẽ đi')} · ${so(d.so_co_the)} ${t('có thể đi')}</dd>
        <dt>${t('Tạo lúc')}</dt><dd>${esc(fmtDate(d.tao_luc))}${d.huy_luc ? ` · ${t('huỷ lúc')} ${esc(fmtDate(d.huy_luc))}` : ''}</dd>
        <dt>${t('Sửa trong 24 giờ')}</dt><dd>${d.so_lan_sua_24h == null ? '—' : `${so(d.so_lan_sua_24h)} ${t('lần')}`}</dd>
        <dt>${t('Mã')}</dt><dd><code>${esc(d.id)}</code></dd>
      </dl>
    </div>`;
  }
  function theXuLySuKien(d) {
    const coBc = (d.bao_cao || []).length > 0;
    return `<div class="card stack" style="gap:8px"><h2>${t('Xử lý')}</h2>
      <div class="actions">
        ${d.trang_thai !== 'hien' || coBc ? `<button class="btn ok" data-sk="hien">${t('Hiện sự kiện')}<small>${t('Báo cáo đang mở chuyển sang lịch sử')}</small></button>` : ''}
        ${d.trang_thai !== 'an' ? `<button class="btn danger" data-sk="an">${t('Ẩn sự kiện')}<small>${t('Người khác không thấy sự kiện nữa')}</small></button>` : ''}
        ${d.bia ? `<button class="btn danger" data-sk="bia">${t('Gỡ ảnh bìa')}<small>${t('Tệp bị xoá, sự kiện giữ nguyên')}</small></button>` : ''}
      </div>
      <div class="hint">${t('Hiện lại một sự kiện thì các báo cáo đang mở chuyển sang lịch sử, nên luật "3 người báo cáo → tự ẩn" đếm lại từ đầu. Mọi thao tác cần lý do và được ghi vào nhật ký quản trị.')}</div>
    </div>`;
  }
  const theToChuc = (tc) => `<div class="card stack" style="gap:8px"><h2>${t('Người tổ chức')}</h2>
    ${tc && tc.id ? `<a class="item" href="#nguoidung/${esc(tc.id)}" style="padding:8px 4px;text-decoration:none">${avatar(tc.anh, tc.ten)}
      <span class="t"><span class="n">${esc(tc.ten || '?')}${modTag(tc.trang_thai)}</span><span class="m">${t('Tham gia')} ${esc(fmtNgay(tc.tao_luc))}</span></span></a>`
      : `<div class="hint">${t('Tài khoản đã xoá')}</div>`}</div>`;
  function theBaoCaoSuKien(mo, cu) {
    const nguoi = (r) => (r.user_id ? `<a href="#nguoidung/${esc(r.user_id)}">${esc(r.ten || '?')}</a>` : esc(t('Tài khoản đã xoá')));
    return `<div class="card stack" style="gap:8px">
      <div class="sec"><h2>${t('Báo cáo đang mở')}</h2><span class="hint">${so(mo.length)}</span></div>
      ${mo.length ? `<div class="list">${mo.map((r) => `<div class="item" style="cursor:default"><span class="t">
          <span class="n">${esc(LY_DO_SK[r.ly_do] || r.ly_do)}</span>
          ${r.ghi_chu ? `<span class="s" style="display:block;white-space:normal">${esc(r.ghi_chu)}</span>` : ''}
          <span class="m" style="display:block;white-space:normal">${esc(fmtDate(r.tao_luc))} ${t('· từ')} ${nguoi(r)}</span></span></div>`).join('')}</div>`
        : `<div class="hint">${t('Không có báo cáo nào đang mở.')}</div>`}
      ${cu.length ? `<details><summary class="hint" style="cursor:pointer">${t('Báo cáo đã xử lý')} (${so(cu.length)})</summary><div class="stack" style="gap:6px;margin-top:6px">${cu.map((r) => `<div class="hint"><b>${esc(LY_DO_SK[r.ly_do] || r.ly_do)}</b> · ${t('báo cáo lúc')} ${esc(fmtDate(r.tao_luc))} · ${t('xử lý lúc')} ${esc(fmtDate(r.xu_ly_luc))}${r.ghi_chu ? '<br>' + esc(r.ghi_chu) : ''}</div>`).join('')}</div></details>` : ''}
    </div>`;
  }
  const VIS_NHOM = () => ({ public: t('Công khai'), private: t('Riêng tư') });
  const DONG_NHOM = () => ({ giu: t('Giữ nhóm như thường'), '2d': t('Chỉ đọc 2 ngày sau khi kết thúc'), '7d': t('Chỉ đọc 7 ngày sau khi kết thúc'), '30d': t('Chỉ đọc 30 ngày sau khi kết thúc') });
  function theNhomChatSuKien(c) {
    if (!c) return '';
    return `<div class="card stack" style="gap:8px"><h2>${t('Nhóm chat của sự kiện')}</h2>
      <dl class="kv">
        <dt>${t('Tên nhóm')}</dt><dd>${esc(c.title || '—')}</dd>
        <dt>${t('Hiển thị')}</dt><dd>${esc(VIS_NHOM()[c.visibility] || c.visibility || '—')}</dd>
        <dt>${t('Thành viên')}</dt><dd>${so(c.members)}</dd>
        ${c.cua_su_kien ? `<dt>${t('Ai được nhắn')}</dt><dd>${c.mo ? t('Mọi thành viên') : t('Chỉ chủ nhóm / quản trị nhóm (kênh thông báo)')}</dd>
        <dt>${t('Sau sự kiện')}</dt><dd>${esc(DONG_NHOM()[c.dong] || c.dong || '—')}</dd>` : `<dt>${t('Nguồn')}</dt><dd>${t('Nhóm có sẵn được gắn vào sự kiện')}</dd>`}
        <dt>${t('Mã nhóm')}</dt><dd><code>${esc(c.id)}</code></dd>
      </dl>
      <div class="hint">${t('Đọc tin nhắn của nhóm: mở từ báo cáo về nhóm hoặc từ trang của một thành viên (cần lý do, xác thực hai lớp, có ghi nhật ký).')}</div>
    </div>`;
  }

  async function thaoTacSuKien(d, act) {
    if (dangGui) return;
    const cfg = {
      hien: [t('Hiện sự kiện'), t('Sự kiện hiện lại với những người được xem nó. Các báo cáo đang mở chuyển sang lịch sử, nên luật "3 người báo cáo → tự ẩn" đếm lại từ đầu.'), t('Hiện'), false],
      an: [t('Ẩn sự kiện'), t('Sự kiện biến khỏi danh sách và trang sự kiện của người khác. Hiện lại được bất cứ lúc nào.'), t('Ẩn'), true],
      bia: [t('Gỡ ảnh bìa'), t('Ảnh bìa bị gỡ khỏi sự kiện và tệp vào hàng đợi xoá — không lấy lại được. Sự kiện giữ nguyên.'), t('Gỡ'), true],
    }[act];
    if (!cfg) return;
    const lyDo = await hoiLyDoViec(cfg[0], cfg[1], cfg[2], cfg[3]); if (!lyDo) return;
    dangGui = true;
    try {
      if (act === 'bia') {
        await rpc('admin_su_kien_go_bia', { p_id: d.id, p_ly_do: lyDo });
        toast(t('Đã gỡ ảnh bìa.'));
      } else {
        const kq = await rpc('admin_su_kien_dat', { p_id: d.id, p_hien: act === 'hien', p_ly_do: lyDo });
        const n = kq && kq.bao_cao_da_xu_ly;
        toast(act === 'hien' ? `${t('Đã hiện sự kiện.')}${n ? ` ${so(n)} ${t('báo cáo chuyển sang lịch sử.')}` : ''}` : t('Đã ẩn sự kiện.'));
      }
      await render();
    } catch (e) { toast(loiQuanTri(e), true); }
    finally { dangGui = false; }
  }
  async function moBiaSuKien(d, b) {
    const lyDo = await hoiLyDo(t('Ảnh bìa sự kiện')); if (!lyDo) return;
    b.disabled = true;
    let urls = {};
    try { urls = await moAnhRieng([d.bia], lyDo); } catch (e) { urls = {}; }
    if (urls[d.bia]) {
      const img = document.createElement('img');
      img.className = 'photo'; img.style.maxWidth = '100%'; img.alt = t('Ảnh bìa'); img.src = urls[d.bia];
      b.replaceWith(img);
    } else { b.disabled = false; toast(t('Không tải được ảnh'), true); }
  }

  // ---------------------------------------------------------------- SỐ LIỆU
  async function renderSoLieu(main) {
    if (state.sub === 'doanhthu') return renderDoanhThu(main);
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
    // 22/11 (mục 48, QT-4): như Tổng quan — DAU trung bình của 7 ngày TRỌN gần nhất (bỏ hôm nay chưa hết ngày, bỏ ngày trước khi có dữ liệu) ÷ MAU
    const ngay7 = (g.series || []).slice(-8, -1).filter((r) => !(g.do_tu && String(r.day) < String(g.do_tu)));
    const dinhTb = ngay7.length && Number(hn.mau) ? Math.round(((ngay7.reduce((a, r) => a + (Number(r.dau) || 0), 0) / ngay7.length) / Number(hn.mau)) * 1000) / 10 : null;
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
        <div class="tile"><div class="v">${dinhTb != null ? so(dinhTb) + '%' : '—'}</div><div class="l">${t('DAU/MAU — độ dính')}</div><div class="hint">${t('DAU trung bình 7 ngày ÷ MAU')}</div></div>
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
          </tr>`).join('') : `<tr><td colspan="5"><div class="empty">${t('Chưa có nhóm nào trong 90 ngày qua.')}</div></td></tr>`}</tbody>
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

  // ---------------------------------------------------------------- PHÂN TÍCH (081)
  // admin.js gọi máy chủ; admin-phan-tich.js chỉ vẽ. Máy chủ chưa có 081 thì nói rõ, không hiện bảng rỗng.
  async function renderPhanTich(main) {
    const PT = window.HIMO_PT;
    const ctx = { t, esc, so, nav, fmtNgay, locale, lang: () => lang, tenNuoc };
    if (state.sub === 'chandung') return renderChanDung(main, PT, ctx);
    main.innerHTML = dangTai;
    let o;
    try {
      if (state.sub === 'goiy') {
        // 197 — số liệu nội bộ của các ô cuối lưới Nearby (chỉ đọc). Máy chủ chưa có 197 thì báo ngắn, các bảng khác vẫn chạy.
        // Kỳ của tab này nhớ RIÊNG (gyNgay: 7 / 14 / 30) — không dùng chung với các tab 7 / 30 / 90 ngày.
        const goiGY = () => rpc('admin_pt_goi_y_nearby', { p_days: state.pt.gyNgay || 14, p_limit: 100, p_offset: state.pt.gyTu || 0 });
        try {
          o = await goiGY();
          // bảng vừa ngắn lại (máy chủ tính lại) trong lúc đang đứng ở một trang không còn dòng nào → lùi về trang cuối còn dòng
          if (o && Array.isArray(o.top) && !o.top.length && Number(o.top_tong) > 0 && (state.pt.gyTu || 0) > 0) {
            state.pt.gyTu = Math.floor((Number(o.top_tong) - 1) / 100) * 100;
            o = await goiGY();
          }
        }
        catch (e) { if (laChuaCo(e)) { main.innerHTML = khung(t('Gợi ý Nearby'), '', `<div class="alertbar warn"><div><b>${t('Máy chủ chưa có gói 197')}</b><br>${t('Cần áp supabase/197-nearby-goi-y.sql (sau 096). Các bảng phân tích khác vẫn dùng được.')}</div></div>`); return; } throw e; }
      } else if (state.sub === 'sukien') {
        // 151 — riêng một khối: máy chủ chưa có 151 thì báo ngắn, không lẫn với lời nhắc 081.
        try { o = await rpc('admin_pt_su_kien', { p_days: state.pt.ngay }); }
        catch (e) { if (laChuaCo(e)) { main.innerHTML = khung(t('Sự kiện & tin thoại'), '', canBanVa151()); return; } throw e; }
      } else if (state.sub === 'vanhanh') {
        let tz = 'Asia/Ho_Chi_Minh';
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) { /* trình duyệt cũ */ }
        o = await rpc('admin_pt_van_hanh', { p_tz: tz });
      } else if (state.sub === 'chuyensau') o = await rpc('admin_pt_chuyen_sau', { p_days: state.pt.ngay });
      else if (state.sub === 'stories') o = await rpc('admin_pt_stories', { p_days: state.pt.ngay });
      else if (state.sub === 'nguoithat') o = await rpc('admin_pt_nguoi_that', { p_days: state.pt.ngay });
      else o = await rpc('admin_pt_chien_luoc', { p_days: state.pt.ngay });
    } catch (e) {
      if (e && state.sub === 'nguoithat' && (e.code === 'PGRST202' || /Could not find the function/i.test(e.message || ''))) {
        main.innerHTML = khung(`${t('Người thật')}`, '', `<div class="alertbar warn"><div><b>${t('Máy chủ chưa có số liệu người thật')}</b><br>${t('Cần áp 088 (supabase/088-tai-khoan-noi-bo.sql). Các bảng phân tích khác vẫn dùng bình thường.')}</div></div>`);
        return;
      }
      if (e && state.sub === 'stories' && (e.code === 'PGRST202' || /Could not find the function/i.test(e.message || ''))) {
        main.innerHTML = khung(`${t('Stories')}`, '', `<div class="alertbar warn"><div><b>${t('Máy chủ chưa có phân tích Stories')}</b><br>${t('Cần áp 084 (Stories) rồi 086 (supabase/086-phan-tich-stories.sql). Các bảng phân tích khác vẫn dùng bình thường.')}</div></div>`);
        return;
      }
      if (e && (e.code === 'PGRST202' || /Could not find the function/i.test(e.message || ''))) {
        main.innerHTML = khung(`${t('Phân tích')}`, '', `<div class="alertbar warn"><div><b>${t('Máy chủ chưa có bảng phân tích')}</b><br>${t('Cần áp bản vá 081 (supabase/081-bang-phan-tich-quan-tri.sql) trong SQL Editor. Các nhóm khác vẫn dùng bình thường.')}</div></div>`);
        return;
      }
      throw e;
    }
    if (!PT) throw new Error(t('Thiếu tệp admin-phan-tich.js.'));
    if (state.sub === 'vanhanh') PT.vanHanh(main, o, ctx);
    else if (state.sub === 'chuyensau') PT.chuyenSau(main, o, ctx);
    else if (state.sub === 'stories') PT.stories(main, o, ctx);
    else if (state.sub === 'goiy') {
      if (!PT.goiY) throw new Error(t('Thiếu tệp admin-phan-tich.js.'));
      PT.goiY(main, o || {}, ctx);
      const tu = Number((o || {}).top_tu) || 0;   // lật trang bảng hồ sơ: 100 dòng mỗi trang, số thứ tự tính trên toàn bảng
      const lat = (moi) => { state.pt.gyTu = moi; state.pt.gyCuon = true; render(); };
      main.querySelectorAll('.gyTruoc').forEach((b) => b.addEventListener('click', () => lat(Math.max(0, tu - 100))));
      main.querySelectorAll('.gySau').forEach((b) => b.addEventListener('click', () => lat(tu + 100)));
      // vừa lật trang: đưa bảng về lại trước mắt (trang vẽ lại từ đầu nên độ cuộn nhảy lên trên)
      if (state.pt.gyCuon) { state.pt.gyCuon = false; const bang = main.querySelector('#gyBang'); if (bang && bang.scrollIntoView) bang.scrollIntoView({ block: 'start' }); }
    }
    else if (state.sub === 'sukien') {
      if (!PT.suKien) throw new Error(t('Thiếu tệp admin-phan-tich.js.'));
      PT.suKien(main, o || {}, ctx);
    } else if (state.sub === 'nguoithat') {
      let uv = null;
      try { uv = await rpc('admin_noi_bo_ung_vien'); } catch (e) { uv = null; }   // candidates are optional
      PT.nguoiThat(main, o, ctx, uv);
    } else PT.chienLuoc(main, o, ctx);
    main.querySelectorAll('#ptKy .chip').forEach((c) => c.addEventListener('click', () => { if (state.sub === 'goiy') state.pt.gyNgay = Number(c.dataset.d); else state.pt.ngay = Number(c.dataset.d); render(); }));
  }

  // ---------------------------------------------------------------- CHÂN DUNG NGƯỜI DÙNG (167)
  // Một lời gọi admin_pt_chan_dung cho mỗi lần mở / đổi bộ lọc / tự làm mới: máy chủ đếm thẳng trên bảng hồ sơ lúc đó (không bảng
  // tạm, không số gõ sẵn). Đang lọc thì gọi thêm một lần KHÔNG lọc để có danh sách nước / ngôn ngữ cho bộ lọc.
  function locChanDung(coLoc) {
    const c = state.cd, p = {};
    if (coLoc) {
      ['quoc_gia', 'tuoi', 'vai_tro', 'dang_nguoi', 'tinh_trang', 'dang_tim', 'ngon_ngu'].forEach((k) => { if (c[k].length) p[k] = c[k]; });
      ['hoat_dong', 'dang_ky', 'plus', 'xac_minh'].forEach((k) => { if (c[k] !== 'all') p[k] = c[k]; });
      p.cheo_a = c.cheo_a; p.cheo_b = c.cheo_b;
    }
    if (c.noi_bo) p.noi_bo = true;
    if (c.ca_bi_khoa) p.ca_bi_khoa = true;
    return p;
  }
  /** Tải một tệp văn bản do chính trang tạo ra (số tổng hợp đang hiện) — không gọi mạng. */
  function taiTep(ten, noiDung) {
    const u = URL.createObjectURL(new Blob([noiDung], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = u; a.download = ten; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  }
  async function renderChanDung(main, PT, ctx) {
    if (!main.querySelector('#cdGoc')) main.innerHTML = dangTai;      // đang ở sẵn thẻ này (đổi bộ lọc, tự làm mới): giữ màn hình tới khi có số mới
    const c = state.cd;
    const dangLoc = Object.keys(locChanDung(true)).some((k) => !['cheo_a', 'cheo_b', 'noi_bo', 'ca_bi_khoa'].includes(k));
    let o, nen;
    try {
      [o, nen] = await Promise.all([rpc('admin_pt_chan_dung', { p_loc: locChanDung(true) }),
        dangLoc ? rpc('admin_pt_chan_dung', { p_loc: locChanDung(false) }).catch(() => c.nen) : null]);
    } catch (e) {
      if (laChuaCo(e)) {
        main.innerHTML = khung(t('Chân dung người dùng'), '', `<div class="alertbar warn"><div><b>${t('Máy chủ chưa có bản vá 170')}</b><br>${t('Thẻ này cần hàm admin_pt_chan_dung. Áp theo thứ tự: 088 (supabase/088-tai-khoan-noi-bo.sql) nếu máy chủ chưa có, rồi 170 (supabase/170-chan-dung-moi-may-chu.sql). Các thẻ khác chạy như cũ.')}</div></div>`);
        return;
      }
      throw e;
    }
    if (!PT || !PT.chanDung) throw new Error(t('Thiếu tệp admin-phan-tich.js.'));
    c.nen = dangLoc ? (nen || c.nen) : o;
    PT.chanDung(main, o, ctx, { cd: c, nen: c.nen, doi: (fn) => { fn(c); render(); }, tai: taiTep });
  }

  // ---------------------------------------------------------------- DOANH THU (168)
  // Một lời gọi admin_doanh_thu mỗi lần mở / đổi bộ lọc / tự làm mới (mỗi phút): máy chủ cộng thẳng từ sổ doanh thu lúc đó.
  const muiGio = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };
  function locDoanhThu() {
    const c = state.dt, p = { ngay: c.ngay, moi_truong: c.moi_truong, tz: muiGio() };
    ['cua_hang', 'san_pham', 'quoc_gia'].forEach((k) => { if (c[k]) p[k] = c[k]; });
    return p;
  }
  // 202 — theo kỳ. Lựa chọn (nhóm, khoảng, so sánh, số liệu) nhớ trên máy theo TỪNG quản trị viên; trình duyệt chặn bộ nhớ thì dùng mặc định.
  const DT_KY_HOP_LE = { nhom: ['ngay', 'tuan', 'thang', 'nam'], ky: ['thang_nay', 'thang_truoc', 'quy_nay', 'nam_nay', 'nam_truoc', '12_thang', 'tat_ca', 'tuy_chon'],
    ss: ['khong', 'ky_truoc', 'cung_ky_nam_truoc'], so: ['thuc_nhan', 'gop', 'gd'] };
  const laNgay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  function napDtKy(uid) {
    const c = state.dt;
    if (c.cuaAi === uid) return;
    c.cuaAi = uid;
    // Đổi người đăng nhập mà không tải lại trang: về mặc định trước (không thừa hưởng lựa chọn hay ô đặt mục tiêu đang mở của người trước).
    Object.assign(c, { nhom: 'ngay', ky: 'thang_nay', tu: '', den: '', ss: 'khong', so: 'thuc_nhan', tuNhap: null, denNhap: null, loiNgay: '', dangHoi: false, mtMo: false, mtXacNhan: false, mtLoi: '', mtThap: null, mtCao: null });
    try {
      const j = JSON.parse(localStorage.getItem(`himo-admin-dt-ky:${uid}`) || 'null');
      if (j && typeof j === 'object') {
        for (const k of Object.keys(DT_KY_HOP_LE)) if (DT_KY_HOP_LE[k].includes(j[k])) c[k] = j[k];
        if (laNgay(j.tu) && laNgay(j.den) && j.tu <= j.den) { c.tu = j.tu; c.den = j.den; } else if (c.ky === 'tuy_chon') c.ky = 'thang_nay';
      }
    } catch (e) { /* trình duyệt chặn bộ nhớ / dữ liệu hỏng: dùng mặc định */ }
  }
  function luuDtKy() {
    const c = state.dt;
    try { if (c.cuaAi) localStorage.setItem(`himo-admin-dt-ky:${c.cuaAi}`, JSON.stringify({ nhom: c.nhom, ky: c.ky, tu: c.tu, den: c.den, ss: c.ss, so: c.so })); } catch (e) { /* bỏ qua */ }
  }
  function locDoanhThuKy() {
    const c = state.dt, p = { nhom: c.nhom, so_sanh: c.ss, moi_truong: c.moi_truong, tz: muiGio() };
    if (c.ky === 'tuy_chon' && laNgay(c.tu) && laNgay(c.den)) { p.tu_ngay = c.tu; p.den_ngay = c.den; } else p.ky = c.ky === 'tuy_chon' ? 'thang_nay' : c.ky;
    ['cua_hang', 'san_pham', 'quoc_gia'].forEach((k) => { if (c[k]) p[k] = c[k]; });
    return p;
  }
  let dtLuot = 0;       // số thứ tự lượt hỏi máy chủ của thẻ Doanh thu — chỉ lượt MỚI NHẤT được vẽ
  let dtVe = null;      // hàm vẽ lại của lượt MỚI NHẤT đã về — mọi lời "vẽ lại" (kể cả từ một lượt cũ còn dang dở) đều vẽ bằng số mới nhất
  const dtODay = () => state.nhom === 'solieu' && state.sub === 'doanhthu';
  async function renderDoanhThu(main) {
    const luot = ++dtLuot;
    const conDay = () => luot === dtLuot && dtODay();
    if (!main.querySelector('#dtGoc')) main.innerHTML = dangTai;      // đang ở sẵn thẻ này: giữ màn hình tới khi có số mới
    const PT = window.HIMO_PT;
    try { const { data } = await sb.auth.getSession(); napDtKy((data && data.session && data.session.user && data.session.user.id) || 'chung'); } catch (e) { napDtKy('chung'); }
    let o, ky;
    try {
      // 202: hỏi song song. Máy chủ chưa có hàm theo kỳ → ky = null (thẻ hiện một dòng nhắc, phần cũ chạy như trước); lỗi khác → một dòng báo lỗi trong khối theo kỳ.
      [o, ky] = await Promise.all([rpc('admin_doanh_thu', { p_loc: locDoanhThu() }),
        rpc('admin_doanh_thu_ky', { p_loc: locDoanhThuKy() }).catch((e) => (laChuaCo(e) ? null : { error: 'loi' }))]);
    } catch (e) {
      if (luot === dtLuot) state.dt.dangHoi = false;
      if (!conDay()) return;
      if (laChuaCo(e)) {
        main.innerHTML = khung(t('Doanh thu'), '', `<div class="alertbar warn"><div><b>${t('Máy chủ chưa có bản vá 168')}</b><br>${t('Thẻ này cần sổ doanh thu và hàm admin_doanh_thu (supabase/168-doanh-thu.sql). 168 chỉ áp được khi máy chủ đã có phần thanh toán HIMO Plus (063) và phân quyền quản trị (065). Các thẻ khác chạy như cũ.')}</div></div>`);
        return;
      }
      throw e;
    }
    if (luot === dtLuot) state.dt.dangHoi = false;
    if (!conDay()) return;       // đã có lượt hỏi mới hơn, hoặc đã sang thẻ khác trong lúc chờ: đừng vẽ đè
    if (!PT || !PT.doanhThu) throw new Error(t('Thiếu tệp admin-phan-tich.js.'));
    const ctxDt = { t, esc, so, nav, fmtNgay, locale, lang: () => lang, tenNuoc };
    // doi / doiKy: đổi lựa chọn rồi hỏi lại máy chủ (chỉ khi còn ở thẻ này). veLai: vẽ lại bằng số của lượt MỚI NHẤT — một câu trả lời đến muộn
    // (ví dụ kết quả "Xác nhận đổi" về sau khi đã đổi bộ lọc hay sang thẻ khác) không vẽ đè số cũ lên màn hình mới.
    const tt = { dt: state.dt, ky, doi: (fn) => { fn(state.dt); luuDtKy(); if (dtODay()) render(); },
      doiKy: (fn) => { fn(state.dt); state.dt.dangHoi = true; luuDtKy(); if (dtODay()) render(); else state.dt.dangHoi = false; }, tai: taiTep,
      veLai: () => { if (dtVe) dtVe(); },
      // Đặt mục tiêu: máy chủ quyết định (chỉ owner, hai lớp, ghi nhật ký). Lỗi mạng → { error: 'loi' } để khối hiện câu "thử lại".
      datMucTieu: (thap, cao) => rpc('admin_dat_muc_tieu_doanh_thu', { p_thap: thap, p_cao: cao }).catch(() => ({ error: 'loi' })) };
    dtVe = () => { if (!dtODay()) return; luuDtKy(); PT.doanhThu(main, o, ctxDt, tt); };
    PT.doanhThu(main, o, ctxDt, tt);
  }

  // ---------------------------------------------------------------- HỆ THỐNG
  async function renderHeThong(main) {
    if (state.sub === 'nhatky') return renderLog(main);
    if (state.sub === 'nuoc') return renderNuoc(main);
    if (state.sub === 'chongvuot') return renderChongVuot(main);
    if (state.sub === 'succhua') return renderSucChua(main);
    main.innerHTML = dangTai;
    const sy = await rpc('admin_system');
    const baoMat = await theBaoMat();
    // HIMO Plus (063): absent on a server without 063 → the card is simply not shown.
    let bh = null;
    try { bh = await rpc('admin_billing_health'); } catch (e) { bh = null; }
    // Mục 46 (gói 213): thông báo đẩy gửi được / lỗi theo mã 24 giờ. Máy chủ chưa có 213 → "chưa áp"; lỗi khác → câu thử lại.
    let tbd = null;
    try { tbd = await rpc('admin_thong_bao_day'); } catch (e) { tbd = laChuaCo(e) ? 'chua' : 'loi'; }
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
      ${theThongBaoDay(tbd)}
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
      <div id="ban-be-tong" data-ban-be-tong="1"></div>
      ${bangDem(`${t('Số dòng trong từng bảng')}`, sy.bang, { follows: `follows (${t('lịch sử theo dõi, đóng băng từ 091')})` })}
      <div class="card">
        <div class="sec"><h2>${t('Hàng rào bảo mật')}</h2></div>
        <dl class="kv">
          <dt>${t('Hàm cho phép gọi')}</dt><dd>${so(hr.ham_trong_danh_sach_trang)} ${t('tên trong danh sách trắng')}</dd>
          <dt>${t('Hàm hở')}</dt><dd>${hr.ham_ho_cho_public > 0 ? `<b style="color:var(--danger)">${hr.ham_ho_cho_public}</b> ${t('— phải bằng 0')}` : `${t('0 — đúng')}`}</dd>
          <dt>${t('Việc 24 giờ')}</dt><dd>${so(sy.viec_24h)} ${t('hành động quản trị')}</dd>
        </dl>
      </div>`);
    noiBaoMat(main); hydrateBanBeTong(main);
  }

  // Mục 46: mã lỗi Expo / APNs → loại (đúng như src/lib/thong-bao/expo.ts phanLoaiLoi, bộ kiểm thong-bao-46-app so hai bên) + câu cho người
  // vận hành. Mã lạ = tạm thời (máy chủ tự thử lại). Mã đến từ máy chủ luôn đi qua esc().
  const LOI_DAY = {
    InvalidCredentials: ['cau-hinh', 'Khoá APNs (iPhone) hoặc FCM (Android) của dự án EAS thiếu hoặc hỏng. Chủ dự án chạy eas credentials, chọn iOS rồi Push Notifications. Xem docs/release/THONG-BAO-IOS-2011.md.'],
    MismatchSenderId: ['cau-hinh', 'Khoá FCM (Android) trên EAS không khớp ứng dụng. Chủ dự án tải lại khoá FCM V1 trong eas credentials.'],
    DeviceNotRegistered: ['huy-thiet-bi', 'Máy đã gỡ app hoặc tắt thông báo. Máy chủ tự ngừng gửi tới máy đó.'],
    MessageTooBig: ['vinh-vien', 'Tin quá 4096 byte. Đây là lỗi dựng tin, báo Claude.'],
    MessageRateExceeded: ['tam-thoi', 'Gửi quá nhanh tới một máy. Máy chủ tự thử lại.'],
  };
  const LOAI_LOI_DAY = { 'cau-hinh': 'Cấu hình', 'huy-thiet-bi': 'Máy không còn nhận', 'vinh-vien': 'Không thử lại', 'tam-thoi': 'Tạm thời, tự thử lại' };
  function theThongBaoDay(x) {
    const tieuDe = `<div class="sec"><h2>${t('Thông báo đẩy: gửi được / lỗi 24 giờ')}</h2><span class="hint">${t('chỉ số đếm và mã lỗi, "gửi được" là Expo đã nhận, chưa chắc đã hiện trên máy')}</span></div>`;
    if (x === 'chua') return `<div class="card">${tieuDe}<div class="hint">${t('Máy chủ chưa áp gói')} 213.</div></div>`;
    if (!x || typeof x !== 'object') return `<div class="card">${tieuDe}<div class="alertbar warn"><div>${t('Không đọc được số liệu. Thử lại.')}</div></div></div>`;
    const ds = Array.isArray(x.ma_loi) ? x.ma_loi : [];
    const bl = Array.isArray(x.bien_lai_loi) ? x.bien_lai_loi : [];
    const chinh = ds[0] ? String(ds[0].ma) : '';
    const coMa = (ma) => Object.prototype.hasOwnProperty.call(LOI_DAY, ma);
    const giai = (ma) => (coMa(ma) ? t(LOI_DAY[ma][1]) : t('Mã lạ, máy chủ tự thử lại. Nếu lặp lại nhiều thì báo Claude.'));
    const loai = (ma) => t(LOAI_LOI_DAY[coMa(ma) ? LOI_DAY[ma][0] : 'tam-thoi']);
    const g = x.gio_qua || {}; const ch = x.cau_hinh || {}; const may = x.may_dang_nhan || {};
    return `
      ${x.tat_ca_hong_1h === true ? `<div class="alertbar"><div><b>${t('Thông báo đẩy: mọi lần gửi trong 1 giờ qua đều hỏng')}</b> (<code>${esc(chinh || '?')}</code>)<br>${esc(giai(chinh))}</div></div>` : ''}
      ${x.tat_ca_hong_1h !== true && Number(x.gui_24h) === 0 && Number(x.hong_24h) > 0 ? `<div class="alertbar warn"><div><b>${t('24 giờ qua chưa gửi được thông báo đẩy nào')}</b> (<code>${esc(chinh || '?')}</code>)<br>${esc(giai(chinh))}</div></div>` : ''}
      <div class="card scrollx">
        ${tieuDe}
        <div class="tiles">
          <div class="tile"><div class="v">${so(x.gui_24h)}</div><div class="l">${t('gửi được')}</div></div>
          <div class="tile${Number(x.hong_24h) ? ' alert' : ''}"><div class="v">${so(x.hong_24h)}</div><div class="l">${t('lỗi')}</div></div>
          <div class="tile"><div class="v">${so(x.thu_lai)}</div><div class="l">${t('đang chờ thử lại')}</div></div>
          <div class="tile"><div class="v">${so(x.bo_qua_24h)}</div><div class="l">${t('bỏ qua có lý do')}</div></div>
        </div>
        ${ds.length ? `<table class="tbl" style="margin-top:10px"><thead><tr><th>${t('Mã lỗi')}</th><th>${t('Loại')}</th><th>${t('lỗi')}</th><th>${t('đang chờ thử lại')}</th><th>${t('1 giờ qua')}</th></tr></thead>
          <tbody>${ds.map((r) => `<tr><td><code>${esc(r.ma)}</code><div class="hint">${esc(giai(String(r.ma)))}</div></td><td>${esc(loai(String(r.ma)))}</td><td>${so(r.hong)}</td><td>${so(r.thu_lai)}</td><td>${so(r.gio_qua)}</td></tr>`).join('')}</tbody></table>`
          : `<div class="hint" style="margin-top:8px">${t('Không có lỗi gửi trong 24 giờ.')}</div>`}
        <div class="hint" style="margin-top:8px">${t('Biên lai Apple / Google 24 giờ')}: ${so(x.bien_lai_ok_24h)} ${t('đã nhận')}${bl.map((b) => ` · <code>${esc(b.ma)}</code> ${so(b.so)}`).join('')}
          · ${t('1 giờ qua')}: ${so(g.gui)} ${t('gửi được')}, ${so(g.hong)} ${t('lỗi')}, ${so(g.thu_lai)} ${t('đang chờ thử lại')}
          · ${t('Lần gửi được gần nhất')}: ${x.lan_gui_cuoi ? esc(fmtNgay(x.lan_gui_cuoi)) : t('chưa có')}</div>
        <div class="hint">${t('Máy đang nhận')}: iPhone ${so(may.ios)} · Android ${so(may.android)} · ${ch.dang_gui ? t('máy chủ đang gửi') : t('máy chủ chưa gửi')}${ch.tam_dung ? ` · ${t('đang tạm dừng')}` : ''}${ch.chi_thu_nghiem ? ` · ${t('chỉ danh sách thử')} (${so(ch.so_thu)})` : ''}</div>
      </div>`;
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
          <dt>${t('Tạm dừng mua mới')}</dt><dd>${onOff(st.purchases_paused)}</dd>
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

  // ---------------------------------------------------------------- SỨC CHỨA & NÂNG CẤP (218, mục 47-tai phần B)
  // Máy chủ tính hết (%, mức, dự phóng, ngày chạm ngưỡng); admin-phan-tich.js chỉ vẽ. Không giá nào ghi cứng ở trang: hạn mức, giá, gói kế,
  // nơi bấm và ngày đọc giá nằm trong bảng he_thong_tai_nguyen. Sửa: chỉ owner + hai lớp (máy chủ trả {error}); mọi lần sửa vào nhật ký (trigger 065).
  const SC_GIA_KIEU = () => [['', t('Không có giá')], ['thang', t('USD / tháng')], ['gb_thang', t('USD / GB / tháng')], ['nghin', t('USD / 1.000')], ['trieu', t('USD / 1 triệu')], ['luot', t('USD / lượt')], ['phan_tram', '%']];
  const scLoiDat = (r) => (r && r.error === 'mfa' ? t('Cần xác thực hai lớp để sửa.') : r && r.error === 'forbidden' ? t('Chỉ owner sửa được.') : t('Giá trị không hợp lệ. Kiểm lại số, ngày và địa chỉ (phải bắt đầu bằng https://).'));
  async function renderSucChua(main) {
    main.innerHTML = dangTai;
    let d;
    try { d = await rpc('admin_suc_chua'); if (d && d.nguong) window.HIMO_NGUONG = d.nguong; }   // mục 48 QT-8
    catch (e) {
      if (laChuaCo(e)) { main.innerHTML = khung(t('Sức chứa & nâng cấp'), '', `<div class="alertbar warn"><div><b>${t('Máy chủ chưa áp gói')} 218</b><br>${t('Cần áp supabase/218-suc-chua-giam-sat.sql. Các trang khác vẫn dùng bình thường.')}</div></div>`); return; }
      throw e;
    }
    if ((location.hash.replace(/^#/, '').split('/')[0] || 'tongquan') !== 'hethong') return;
    const PT = window.HIMO_PT;
    if (!PT || !PT.sucChua) throw new Error(t('Thiếu tệp admin-phan-tich.js.'));
    const ds = (d && d.tai_nguyen) || [];
    const ctx = { t, esc, so, nav, fmtNgay, fmtGio: fmtDate, locale, lang: () => lang, ky: state.sc.ky,
      doiKy: (k) => { state.sc.ky = k === 7 ? 7 : 30; PT.sucChua(main, d || {}, { ...ctx, ky: state.sc.ky }); veBaoDong(main); },
      sua: (khoa) => scSua(ds.find((x) => x.khoa === khoa)),
      suaNguong: () => scSuaNguong((d && d.nguong) || {}) };
    PT.sucChua(main, d || {}, ctx);
  }
  function scSua(x) {
    if (!x) return;
    const PT = window.HIMO_PT || {};
    const o = (id, nhan, gt, kieu, them) => `<label class="hint" for="${id}" style="display:block;margin:8px 0 4px">${esc(nhan)}</label><input class="text" id="${id}" ${kieu ? `type="${kieu}"` : ''} value="${esc(gt == null ? '' : gt)}" ${them || ''}>`;
    modal(`<h2>${esc(t('Sửa'))}: ${esc(t((PT.scTen && PT.scTen(x.khoa)) || x.khoa))}</h2><p>${t('Chỉ owner sửa được, cần xác thực hai lớp. Mọi lần sửa được ghi vào nhật ký quản trị. Để trống ô nào thì xoá giá trị đó.')}</p>
      ${o('scHan', t('Hạn mức'), x.han_muc, 'number', 'min="0" step="any"')}${x.han_muc_ngay != null || x.khoa === 'auth_thu' || x.khoa === 'sightengine' ? o('scHanNgay', t('Hạn mức mỗi ngày'), x.han_muc_ngay, 'number', 'min="0" step="any"') : ''}
      ${o('scGoi', t('Gói kế (tên)'), x.goi_ke, 'text', 'maxlength="60"')}${o('scGia', t('Giá gói kế (USD)'), x.gia_ke_usd, 'number', 'min="0" step="any"')}
      <label class="hint" for="scGiaKieu" style="display:block;margin:8px 0 4px">${t('Đơn vị giá')}</label><select class="text" id="scGiaKieu">${SC_GIA_KIEU().map(([k, l]) => `<option value="${k}"${(x.gia_kieu || '') === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
      ${o('scLink', t('Nơi nâng cấp (https://…)'), x.link, 'url', 'maxlength="300"')}${o('scNguon', t('Trang giá đã đọc (https://…)'), x.nguon_gia, 'url', 'maxlength="300"')}
      ${o('scDoc', t('Ngày đọc giá'), x.doc_luc ? String(x.doc_luc).slice(0, 10) : '', 'date')}
      <label class="hint" style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" id="scTat" style="min-height:auto"${x.tat_thu ? ' checked' : ''}> ${t('Tắt thư cảnh báo của phần này')}</label>
      <div class="err" id="scLoi"></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="mCancel">${t('Huỷ')}</button><button class="btn primary" id="mOk">${t('Lưu')}</button></div>`, (m) => {
      $('#mCancel', m).onclick = () => closeModal();
      $('#mOk', m).onclick = async () => {
        const so2 = (id) => { const e = $(id, m); if (!e) return undefined; const v = e.value.trim(); return v === '' ? null : Number(v); };
        const chu = (id) => { const v = $(id, m).value.trim(); return v === '' ? null : v; };
        const thay = { han_muc: so2('#scHan'), goi_ke: chu('#scGoi'), gia_ke_usd: so2('#scGia'), gia_kieu: $('#scGiaKieu', m).value || null,
          link: chu('#scLink'), nguon_gia: chu('#scNguon'), doc_luc: chu('#scDoc'), tat_thu: !!$('#scTat', m).checked };
        const hn = so2('#scHanNgay'); if (hn !== undefined) thay.han_muc_ngay = hn;
        if ([thay.han_muc, thay.gia_ke_usd, thay.han_muc_ngay].some((v) => v != null && !Number.isFinite(v))) { $('#scLoi', m).textContent = t('Giá trị không hợp lệ. Kiểm lại số, ngày và địa chỉ (phải bắt đầu bằng https://).'); return; }
        $('#mOk', m).disabled = true;
        let r; try { r = await rpc('admin_suc_chua_dat', { p_khoa: x.khoa, p_thay: thay }); } catch (e) { r = { error: 'loi' }; }
        if (r && r.ok) { closeModal(); toast(t('Đã lưu.')); render(); return; }
        $('#mOk', m).disabled = false; $('#scLoi', m).textContent = scLoiDat(r);
      };
    });
  }
  function scSuaNguong(n) {
    const o = (id, nhan, gt, them) => `<div><label class="hint" for="${id}" style="display:block;margin:8px 0 4px">${esc(nhan)}</label><input class="text" id="${id}" type="number" value="${esc(gt == null ? '' : gt)}" ${them || ''}></div>`;
    modalRong(`<h2>${t('Sửa ngưỡng')}</h2><p>${t('Chỉ owner sửa được, cần xác thực hai lớp. Mọi lần sửa được ghi vào nhật ký quản trị.')}</p>
      <div class="tq-luoi2">${o('ngVang', t('Vàng ở % hạn mức'), n.vang_pt, 'min="1" max="99"')}${o('ngDo', t('Đỏ ở % hạn mức'), n.do_pt, 'min="1" max="100"')}
      ${o('ngCpuVang', t('CPU, RAM vàng: p95 một giờ trên (%)'), n.cpu_vang_p95, 'min="1" max="99"')}${o('ngCpuVangNgay', t('Số ngày trong tuần để vàng'), n.cpu_vang_ngay, 'min="1" max="7"')}
      ${o('ngCpuDo', t('CPU, RAM đỏ: p95 một giờ trên (%)'), n.cpu_do_p95, 'min="1" max="100"')}${o('ngCpuDoNgay', t('Số ngày liền để đỏ'), n.cpu_do_ngay_lien, 'min="1" max="7"')}
      ${o('ngKetNoi', t('Kết nối Postgres đỏ ở (% max_connections)'), n.ket_noi_do_pt, 'min="1" max="100"')}${o('ngRt', t('Realtime đỏ ở (% hạn mức)'), n.realtime_do_pt, 'min="1" max="100"')}
      ${o('ngThu', t('Tối đa thư cảnh báo mỗi ngày'), n.thu_toi_da_ngay, 'min="0" max="50"')}</div>
      <label class="hint" style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" id="ngTuan" style="min-height:auto"${n.tuan_bat ? ' checked' : ''}> ${t('Gửi thư tuần sáng thứ Hai')}</label>
      <div class="err" id="ngLoi"></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="mCancel">${t('Huỷ')}</button><button class="btn primary" id="mOk">${t('Lưu')}</button></div>`, (m) => {
      $('#mCancel', m).onclick = () => closeModal();
      $('#mOk', m).onclick = async () => {
        const v = (id) => Number($(id, m).value);
        const thay = { vang_pt: v('#ngVang'), do_pt: v('#ngDo'), cpu_vang_p95: v('#ngCpuVang'), cpu_vang_ngay: v('#ngCpuVangNgay'), cpu_do_p95: v('#ngCpuDo'),
          cpu_do_ngay_lien: v('#ngCpuDoNgay'), ket_noi_do_pt: v('#ngKetNoi'), realtime_do_pt: v('#ngRt'), thu_toi_da_ngay: v('#ngThu'), tuan_bat: !!$('#ngTuan', m).checked };
        if (Object.values(thay).some((x) => typeof x === 'number' && !Number.isFinite(x))) { $('#ngLoi', m).textContent = t('Giá trị không hợp lệ.'); return; }
        $('#mOk', m).disabled = true;
        let r; try { r = await rpc('admin_suc_chua_nguong_dat', { p_thay: thay }); } catch (e) { r = { error: 'loi' }; }
        if (r && r.ok) { closeModal(); toast(t('Đã lưu.')); render(); return; }
        $('#mOk', m).disabled = false; $('#ngLoi', m).textContent = r && (r.error === 'mfa' || r.error === 'forbidden') ? scLoiDat(r) : t('Giá trị không hợp lệ. Vàng phải nhỏ hơn đỏ, số ngày từ 1 tới 7.');
      };
    });
  }
  /** 218: dải đỏ trên MỌI trang khi đường thư đỏ (thư Auth hỏng / thư cảnh báo không đi được). Hỏi máy chủ tối đa mỗi phút một lần;
   *  máy chủ chưa có 218 hoặc tài khoản không đọc được → thôi hẳn, im lặng. */
  let bdCo = true, bdLuc = 0, bdKq = null;
  async function veBaoDong(main) {
    if (!bdCo || !main) return;
    if (Date.now() - bdLuc > 60_000) {
      bdLuc = Date.now();
      try { bdKq = await rpc('admin_suc_chua_bao_dong'); } catch (e) { if (laChuaCo(e) || /unavailable/.test((e && e.message) || '')) bdCo = false; bdKq = null; }
      if (bdKq && bdKq.nguong) window.HIMO_NGUONG = bdKq.nguong;   // 22/11 (mục 48, QT-8): 226 trả ngưỡng vàng / đỏ — Tổng quan / Vận hành dùng chung
    }
    const cu = main.querySelector('.sc-bao-dong'); if (cu) cu.remove();
    if (!bdKq || bdKq.do !== true) return;
    const lyDo = [bdKq.thu_auth ? t('Thư Auth đang gửi hỏng hoặc gần hết trần, người mới có thể không nhận được mã đăng ký.') : '',
      bdKq.thu_canh_bao ? t('Có phần đang đỏ mà thư cảnh báo chưa gửi được tới admin@himosocial.com.') : ''].filter(Boolean).join(' ');
    const el = document.createElement('div');
    el.className = 'alertbar sc-bao-dong'; el.setAttribute('role', 'alert');
    el.innerHTML = `<span class="pt-ic" aria-hidden="true">!</span><div><b>${t('Đường thư đang đỏ')}</b><br>${esc(lyDo)} <a href="#hethong/succhua">${t('Xem Sức chứa & nâng cấp')}</a></div>`;
    const goc = main.querySelector('.stack') || main;
    const dau = goc.firstElementChild;
    if (dau && dau.nextSibling) goc.insertBefore(el, dau.nextSibling); else goc.appendChild(el);
  }

  // ---------------------------------------------------------------- CHỨNG THỰC & GIỚI HẠN (mục 36: 203 / 204 / 205 / 207)
  // Chỉ SỐ ĐẾM — không id người dùng, không key id, không id sự kiện. Gói nào máy chủ chưa có thì khối đó ghi "chưa áp".
  // Đổi chế độ chứng thực bản cài: chỉ owner + hai lớp (admin_chung_thuc_dat trả {error}); máy chủ ghi nhật ký mọi lần đổi (trigger 065).
  const CT_KET_QUA = {
    xem_dat: 'Xem ảnh tự xoá — đạt', xem_thieu: 'Xem — không kèm chứng thực (bản app cũ, Android, máy không hỗ trợ)',
    xem_thach_sai: 'Xem — lời thách sai / đã dùng / hết hạn', xem_khoa_la: 'Xem — khoá lạ / của người khác', xem_bo_dem: 'Xem — bộ đếm không tăng (phát lại)',
    xem_chu_ky: 'Xem — chữ ký sai', xem_moi_truong: 'Xem — khoá khác môi trường', xem_app_id: 'Xem — sai app id',
    dk_dat: 'Đăng ký khoá — đạt', dk_thach_sai: 'Đăng ký — lời thách sai / đã dùng', dk_chua_ghim_goc: 'Đăng ký — máy chủ chưa ghim gốc Apple',
    dk_chuoi: 'Đăng ký — chuỗi chứng chỉ sai', dk_nonce: 'Đăng ký — nonce sai', dk_moi_truong: 'Đăng ký — sai môi trường (aaguid)', dk_khoa_nguoi_khac: 'Đăng ký — khoá đã thuộc người khác',
  };
  async function renderChongVuot(main) {
    main.innerHTML = dangTai;
    const hoi = (ten) => rpc(ten).catch((e) => (laChuaCo(e) ? null : { error: 'loi' }));
    const [ct, nl, bc, tl] = await Promise.all(['admin_chung_thuc', 'admin_gioi_han_nguoi_la', 'admin_gioi_han_bao_cao_su_kien', 'admin_gioi_han_tai_len'].map(hoi));
    const tiles = (ds) => `<div class="tiles">${ds.map(([v, l]) => `<div class="tile"><div class="v">${v}</div><div class="l">${esc(l)}</div></div>`).join('')}</div>`;
    const chua = (goi) => `<div class="hint">${t('Máy chủ chưa áp gói')} ${esc(goi)}.</div>`;
    const hong = `<div class="alertbar warn"><div>${t('Không đọc được số liệu. Thử lại.')}</div></div>`;
    const khoi = (x, goi, ve) => (x === null ? chua(goi) : x.error ? hong : ve(x));
    const tenCheDo = { tat: t('Tắt'), ghi_nhan: t('Chỉ ghi nhận'), bat_buoc: t('Bắt buộc') };
    const mb = (b) => `${so(Math.round((Number(b) || 0) / 1048576))} MB`;
    const veCt = (x) => {
      const ngay = Array.isArray(x.ngay) ? x.ngay : [];
      return `${tiles([[esc(tenCheDo[x.che_do] || x.che_do), t('Chế độ')], [esc(x.moi_truong), t('Môi trường')], [so(x.so_khoa), t('Khoá đã đăng ký')], [so(x.khoa_dung_7_ngay), t('Khoá dùng trong 7 ngày')]])}
        <div class="filters" role="group" aria-label="${esc(t('Chế độ'))}">${['tat', 'ghi_nhan', 'bat_buoc'].map((m) => `<button class="chip" data-ct="${m}" aria-pressed="${x.che_do === m}" ${x.la_owner ? '' : 'disabled'}>${tenCheDo[m]}</button>`).join('')}</div>
        <div class="hint">${t('Chỉ owner đổi được (cần xác thực hai lớp). Thứ tự: Tắt → Chỉ ghi nhận (đếm, vẫn mở ảnh) → Bắt buộc. Chỉ chuyển sang Bắt buộc khi gốc Apple đã được ghim, bản 26 đã lên App Store và dòng "không kèm chứng thực" gần như bằng 0.')}</div>
        <table class="tbl"><thead><tr><th>${t('Ngày (UTC)')}</th><th>${t('Kết quả')}</th><th class="num">${t('Số lần')}</th></tr></thead>
        <tbody>${ngay.length ? ngay.map((r) => `<tr><td>${esc(r.ngay)}</td><td>${CT_KET_QUA[r.ket_qua] ? esc(t(CT_KET_QUA[r.ket_qua])) : `<code>${esc(r.ket_qua)}</code>`}</td><td class="num">${so(r.so)}</td></tr>`).join('')
          : `<tr><td colspan="3"><div class="empty">${t('Chưa có lượt nào trong 14 ngày.')}</div></td></tr>`}</tbody></table>`;
    };
    main.innerHTML = khung(t('Chứng thực & giới hạn'), esc(t('Chỉ số đếm — không có tên, id hay nội dung của ai.')), `
      <div class="card stack" style="gap:10px"><h2>${t('Chứng thực bản cài (ảnh tự xoá)')}</h2>${khoi(ct, '207', veCt)}</div>
      <div class="card stack" style="gap:10px"><h2>${t('Lời nhắn mới tới người lạ')}</h2>${khoi(nl, '203', (x) => tiles([[so(x.luot_24h), t('Lời mới trong 24 giờ')], [so(x.nguoi_gui_24h), t('Người gửi')],
        [so(x.cham_tran_gio), `${t('Đang chạm trần giờ')} (${so(x.tran_gio)})`], [so(x.cham_tran_ngay), `${t('Đang chạm trần ngày')} (${so(x.tran_ngay)})`], [so(x.tu_choi_con_hieu_luc), t('Dấu từ chối còn hiệu lực (7 ngày)')]]))}</div>
      <div class="card stack" style="gap:10px"><h2>${t('Báo cáo sự kiện')}</h2>${khoi(bc, '204', (x) => tiles([[so(x.bao_cao_24h), t('Báo cáo trong 24 giờ')], [so(x.nguoi_bao_24h), t('Người báo')],
        [so(x.cham_tran), `${t('Đang chạm trần')} (${so(x.tran_ngay)} / ${t('ngày')})`], [so(x.bao_cao_mo), t('Báo cáo đang mở')], [so(x.bao_cao_mo_khong_tinh), t('Trong đó không tính vào ngưỡng tự ẩn (tài khoản < 7 ngày hoặc chưa xác nhận email)')]]))}</div>
      <div class="card stack" style="gap:10px"><h2>${t('Tải lên')}</h2>${khoi(tl, '205', (x) => tiles([[so(x.tep_24h), t('Tệp trong 24 giờ')], [mb(x.byte_24h), t('Dung lượng trong 24 giờ')], [so(x.nguoi_tai_24h), t('Người tải')],
        [so(x.cham_tran_gio), `${t('Đang chạm trần giờ')} (${so(x.tran_gio)})`], [so(x.cham_tran_ngay), `${t('Đang chạm trần ngày')} (2 GB)`]]))}</div>`);
    main.querySelectorAll('[data-ct]').forEach((b) => b.addEventListener('click', async () => {
      const m = b.dataset.ct;
      if (!ct || ct.error || ct.che_do === m || dangGui) return;
      const ok = await confirmAction({ title: `${t('Đổi chế độ chứng thực')}: ${tenCheDo[m]}`, okLabel: t('Đổi'), danger: m === 'bat_buoc',
        text: m === 'bat_buoc' ? t('Máy nào không chứng thực được sẽ KHÔNG mở được ảnh tự xoá (một dòng báo; người gửi không được báo gì).') : t('Ảnh tự xoá vẫn mở như cũ; máy chủ chỉ đếm kết quả.') });
      if (!ok) return;
      dangGui = true;
      try {
        const r = await rpc('admin_chung_thuc_dat', { p_che_do: m });
        if (r && r.error === 'mfa') toast(t('Cần xác thực hai lớp để đổi chế độ.'), true);
        else if (r && r.error) toast(t('Chỉ owner đổi được chế độ.'), true);
        else toast(t('Đã đổi chế độ.'));
      } catch (e) { toast(t('Chưa đổi được. Thử lại.'), true); }
      finally { dangGui = false; }
      render();
    }));
  }
  // ---------------------------------------------------------------- NƯỚC CHỈ TRỰC TUYẾN (133 / 151)
  // Ở các nước này HIMO chỉ nhận sự kiện trực tuyến. Xem: mọi quản trị viên; thêm / bỏ: chỉ owner, lý do + xác thực hai lớp,
  // máy chủ ghi nhật ký cả lần bị từ chối (admin_nhay_cam). admin_nuoc_han_che_dat TRẢ {error} chứ không ném lỗi.
  async function renderNuoc(main) {
    main.innerHTML = dangTai;
    const phu = t('Ở những nước này HIMO chỉ nhận sự kiện trực tuyến, vì quan hệ đồng giới bị coi là tội hình sự (danh sách của Human Dignity Trust, 66 nơi). Đổi danh sách là một quyết định chính sách: chỉ chủ dự án (owner) làm được, cần lý do và xác thực hai lớp, và mọi thay đổi đều được ghi nhật ký.');
    let rows;
    try { rows = await rpc('admin_nuoc_han_che_ds'); }
    catch (e) { if (laChuaCo(e)) { main.innerHTML = khung(t('Nước chỉ trực tuyến'), esc(phu), canBanVa151()); return; } throw e; }
    rows = rows || [];
    main.innerHTML = khung(t('Nước chỉ trực tuyến'), esc(phu), `
      <div class="card scrollx">
        <div class="sec"><h2>${t('Danh sách')}</h2><span class="hint">${so(rows.length)} ${t('nước / vùng')}</span></div>
        <table class="tbl"><thead><tr><th>${t('Mã')}</th><th>${t('Nước')}</th><th>${t('Ghi chú')}</th><th class="num">${t('Sự kiện tại chỗ')}</th><th></th></tr></thead>
        <tbody>${rows.length ? rows.map((r) => `<tr><td><code>${esc(r.quoc_gia)}</code></td><td>${esc(tenNuoc(r.quoc_gia))}</td><td>${esc(r.ghi_chu || '')}</td>
          <td class="num">${r.so_su_kien ? `<span class="tag warn" title="${esc(t('Sự kiện tại chỗ đã tạo ở nước này (thường là trước khi nước được thêm vào danh sách)'))}">${so(r.so_su_kien)}</span>` : '0'}</td>
          <td><button class="btn sm danger" data-bo="${esc(r.quoc_gia)}" aria-label="${esc(t('Bỏ') + ' ' + r.quoc_gia)}">${t('Bỏ')}</button></td></tr>`).join('')
          : `<tr><td colspan="5"><div class="empty">${t('Danh sách đang trống.')}</div></td></tr>`}</tbody></table>
      </div>
      <div class="card stack" style="gap:8px">
        <h2>${t('Thêm một nước')}</h2>
        <div class="filters">
          <input id="nMa" maxlength="2" placeholder="${esc(t('Mã 2 chữ, vd. UG'))}" aria-label="${esc(t('Mã nước (ISO 3166-1, 2 chữ)'))}" autocomplete="off" style="width:150px;text-transform:uppercase">
          <input id="nGhiChu" maxlength="200" placeholder="${esc(t('Ghi chú (nguồn, ngày cập nhật)'))}" aria-label="${esc(t('Ghi chú'))}" autocomplete="off">
          <button class="btn primary" id="nThem">${t('Thêm')}</button>
        </div>
        <div class="hint" id="nTen" aria-live="polite"></div>
      </div>`);
    $('#nMa').oninput = () => { const v = $('#nMa').value.trim().toUpperCase(); $('#nTen').textContent = /^[A-Z]{2}$/.test(v) ? tenNuoc(v) : ''; };
    $('#nThem').onclick = () => {
      const ma = $('#nMa').value.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(ma)) { toast(t('Mã nước phải gồm 2 chữ cái (ISO 3166-1), ví dụ UG.'), true); $('#nMa').focus(); return; }
      datNuoc(ma, true, $('#nGhiChu').value.trim());
    };
    main.querySelectorAll('[data-bo]').forEach((b) => b.addEventListener('click', () => datNuoc(b.dataset.bo, false, null)));
  }
  async function datNuoc(ma, them, ghiChu) {
    if (dangGui) return;
    const ten = `${ma} (${tenNuoc(ma)})`;
    const lyDo = await hoiLyDoViec(them ? `${t('Thêm nước chỉ trực tuyến')}: ${ten}` : `${t('Bỏ nước chỉ trực tuyến')}: ${ten}`,
      them ? t('Từ nay ở nước này HIMO chỉ nhận sự kiện trực tuyến. Sự kiện tại chỗ đã có không tự đổi.')
        : t('Từ nay ở nước này HIMO nhận cả sự kiện tại chỗ. Chỉ bỏ khi nguồn tin cậy xác nhận luật đã đổi.'),
      them ? t('Thêm') : t('Bỏ'), !them);
    if (!lyDo) return;
    dangGui = true;
    try {
      const d = await goiNhayCam('admin_nuoc_han_che_dat', { p_quoc_gia: ma, p_them: them, p_ly_do: lyDo, p_ghi_chu: ghiChu || null },
        { forbidden: t('Chỉ chủ dự án (owner) đổi được danh sách này.') });
      if (d) { toast(them ? `${t('Đã thêm')} ${ma}` : `${t('Đã bỏ')} ${ma}`); await render(); }
    } catch (e) {
      toast(/invalid/.test((e && e.message) || '') ? t('Mã nước phải gồm 2 chữ cái (ISO 3166-1), ví dụ UG.') : loiQuanTri(e), true);
    } finally { dangGui = false; }
  }

  // ---------------------------------------------------------------- 172: PLUS THEO TỪNG NGƯỜI · KHIẾU NẠI XỬ PHẠT · YÊU CẦU PHÁP LÝ
  // Máy chủ chưa có 172 (PGRST202) → một dòng báo ngắn, các mục khác vẫn chạy. Mọi quyết định (quyền, hai lớp, nhật ký) nằm ở máy chủ.
  const canBanVa172 = () => `<div class="alertbar warn"><div><b>${t('Máy chủ chưa có bản vá 172')}</b><br>${t('Công cụ này cần supabase/172-quan-tri-cong-cu.sql (172 cần 063 và 065). Các thẻ khác chạy như cũ.')}</div></div>`;
  const loi172 = () => ({ already_decided: t('Khiếu nại này đã được quyết.'), not_found: t('Không tìm thấy.') });
  const ngay172 = (ts) => (ts ? esc(fmtDate(ts)) : '—');

  /** 172a (Q9): thanh toán của MỘT người — hỏi lý do (máy chủ ghi nhật ký), hiện quyền lợi cửa hàng, khuyến mãi, sự kiện gần nhất.
   *  Chủ dự án cấp / thu khuyến mãi ngay tại đây (hai lớp + lý do). */
  async function xemPlus(u) {
    const lyDo = await hoiLyDo(`${t('Plus / thanh toán của')} ${u.display_name || ''}`); if (!lyDo) return;
    let d;
    try { d = await goiNhayCam('admin_plus_nguoi', { p_user: u.id, p_ly_do: lyDo }); }
    catch (e) { if (laChuaCo(e)) { toast(t('Máy chủ chưa có bản vá 172'), true); return; } throw e; }
    if (!d) return;
    const ql = d.quyen_loi || [], km = d.khuyen_mai || [], sk = d.su_kien || [];
    const tagKm = (g) => (g.thu_luc ? `<span class="tag">${t('đã thu')}</span>` : g.dang_hieu_luc ? `<span class="tag ok">${t('đang hiệu lực')}</span>` : `<span class="tag">${t('hết hạn')}</span>`);
    const chiOwner = { forbidden: t('Chỉ chủ dự án (owner) cấp hoặc thu được khuyến mãi.') };
    modalRong(`<h2>${t('Plus / thanh toán của')} ${esc(u.display_name || '')}</h2>
      <p>${t('Đã ghi nhật ký.')} ${t('Plus tới:')} <b>${ngay172(d.plus_until)}</b>${d.la_tester ? ` <span class="tag">${t('tài khoản thử thanh toán')}</span>` : ''}</p>
      <div class="sec"><h2>${t('Quyền lợi từ cửa hàng')}</h2></div>
      <div class="list">${ql.length ? ql.map((e) => `<div class="item" style="cursor:default"><span class="t"><span class="n">${esc(e.san_pham)} · ${esc(e.cua_hang)}${e.moi_truong === 'SANDBOX' ? ' <span class="tag warn">sandbox</span>' : ''}</span>
        <span class="s" style="white-space:normal">${t('hết hạn')} ${ngay172(e.het_han)} · ${e.tu_gia_han ? t('tự gia hạn') : t('không gia hạn')}${e.hoan_tien_luc ? ` · <b style="color:var(--danger)">${t('đã hoàn tiền')} ${ngay172(e.hoan_tien_luc)}</b>` : ''}${e.loi_thanh_toan_luc ? ` · <b style="color:var(--danger)">${t('lỗi thanh toán từ')} ${ngay172(e.loi_thanh_toan_luc)}</b>` : ''}</span></span></div>`).join('') : `<div class="empty">${t('Chưa mua gói nào.')}</div>`}</div>
      <div class="sec"><h2>${t('Khuyến mãi')}</h2></div>
      <div class="list">${km.length ? km.map((g) => `<div class="item" style="cursor:default"><span class="t"><span class="n">${esc(g.loai)} ${tagKm(g)}</span>
        <span class="s" style="white-space:normal">${ngay172(g.tu)} → ${ngay172(g.den)}${g.ly_do ? ' · ' + esc(g.ly_do) : ''}</span></span>
        ${d.quyen_cap && !g.thu_luc ? `<button class="btn sm danger" data-thu-km="${esc(g.id)}">${t('Thu')}</button>` : ''}</div>`).join('') : `<div class="empty">${t('Chưa có khuyến mãi nào.')}</div>`}</div>
      ${d.quyen_cap ? `<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
        <select id="pLoai"><option value="support">${t('Hỗ trợ (support)')}</option><option value="compensation">${t('Đền bù (compensation)')}</option></select>
        <input class="text" id="pNgay" type="number" min="1" max="366" value="30" style="width:90px"> <span class="hint">${t('ngày')}</span>
        <button class="btn primary" id="pCap">${t('Cấp Plus')}</button></div>` : `<div class="hint" style="margin-top:8px">${chiOwner.forbidden}</div>`}
      <div class="sec"><h2>${t('Sự kiện thanh toán gần nhất')}</h2></div>
      <div class="list">${sk.length ? sk.map((ev) => `<div class="item" style="cursor:default"><span class="t"><span class="n">${esc(ev.loai)}${ev.moi_truong === 'SANDBOX' ? ' <span class="tag warn">sandbox</span>' : ''}</span>
        <span class="s" style="white-space:normal">${ngay172(ev.nhan_luc)} · ${esc(ev.trang_thai)}${ev.loi ? ` · <b style="color:var(--danger)">${esc(ev.loi)}</b>` : ''}</span></span></div>`).join('') : `<div class="empty">${t('Chưa có sự kiện nào.')}</div>`}</div>
      <div class="actions"><button class="btn" id="pDong">${t('Đóng')}</button></div>`, (m) => {
      m.querySelector('#pDong').onclick = closeModal;
      const cap = m.querySelector('#pCap');
      if (cap) cap.onclick = async () => {
        const loai = m.querySelector('#pLoai').value, ngay = Number(m.querySelector('#pNgay').value);
        if (!(ngay >= 1 && ngay <= 366)) { toast(t('Số ngày phải từ 1 tới 366.'), true); return; }
        // 22/11 (mục 48, PLUS-7, chủ dự án chọn "a"): ngày cấp NỐI sau hạn hiện tại (gói 229). Người đang có hơn 366 ngày thì lần cấp này không thêm được (trần 366 ngày / lần) — nói rõ.
        const truocMs = d.plus_until ? new Date(d.plus_until).getTime() : 0;
        const conPlus = truocMs > Date.now();
        const ld = await hoiLyDoViec(`${t('Cấp Plus')} ${ngay} ${t('ngày')}: ${u.display_name || ''}`, `${t('Người này có HIMO Plus tới hết thời hạn cấp. Việc cấp được ghi vào nhật ký kèm tên bạn.')}${conPlus ? ` ${t('Người này đang có Plus tới')} ${ngay172(d.plus_until)}. ${t('Ngày cấp sẽ nối thêm sau ngày đó.')}` : ''}`, t('Cấp Plus'));
        if (!ld) return;
        const kq = await goiNhayCam('admin_plus_cap', { p_user: u.id, p_loai: loai, p_ngay: ngay, p_ly_do: ld }, chiOwner);
        if (kq) {
          const sauMs = kq.plus_until ? new Date(kq.plus_until).getTime() : 0;
          if (conPlus && sauMs <= truocMs + 60_000) toast(`${t('Plus vẫn tới')} ${fmtDate(kq.plus_until)}. ${t('Người này đã có Plus hơn 366 ngày nên lần cấp này không thêm được ngày.')}`);
          else toast(`${t('Đã cấp Plus tới')} ${fmtDate(kq.plus_until)}`);
        }
      };
      m.querySelectorAll('[data-thu-km]').forEach((b) => { b.onclick = async () => {
        const id = b.dataset.thuKm;
        const ld = await hoiLyDoViec(`${t('Thu khuyến mãi của')} ${u.display_name || ''}`, t('Khuyến mãi này hết hiệu lực ngay; Plus của người này được tính lại. Việc thu được ghi vào nhật ký kèm tên bạn.'), t('Thu'), true);
        if (!ld) return;
        const kq = await goiNhayCam('admin_plus_thu', { p_id: id, p_ly_do: ld }, chiOwner);
        if (kq) toast(t('Đã thu khuyến mãi.'));
      }; });
    });
  }

  /** 172b (Q14): khiếu nại việc bị khoá / cấm / gỡ nội dung. Chấp nhận KHÔNG tự gỡ khoá — mở trang người dùng để gỡ. */
  async function renderKhieuNai(main) {
    const phu = t('Người dùng khiếu nại việc bị khoá, bị cấm hoặc bị gỡ nội dung. Chấp nhận khiếu nại KHÔNG tự gỡ khoá hay trả nội dung — mở trang người dùng để làm việc đó.');
    const loc = state.kn || 'open';
    main.innerHTML = dangTai;
    let d;
    try { d = await goiNhayCam('admin_khieu_nai_ds', { p_trang_thai: loc, p_limit: 100, p_offset: 0 }); }
    catch (e) { if (laChuaCo(e)) { main.innerHTML = khung(t('Khiếu nại xử phạt'), esc(phu), canBanVa172()); return; } throw e; }
    if (!d) { main.innerHTML = khung(t('Khiếu nại xử phạt'), esc(phu), `<div class="empty">${t('Vai trò của bạn không có quyền này.')}</div>`); return; }
    const LOAI = { suspend: t('Bị tạm khoá'), ban: t('Bị khoá vĩnh viễn'), content: t('Nội dung bị gỡ') };
    const TT = { open: t('Đang mở'), accepted: t('Đã chấp nhận'), rejected: t('Đã bác'), all: t('Tất cả') };
    const ds = d.ds || [];
    main.innerHTML = khung(t('Khiếu nại xử phạt'), esc(phu), `
      <div class="tiles">
        <div class="tile${d.mo ? ' alert' : ''}"><div class="v">${so(d.mo)}</div><div class="l">${t('đang mở')}</div></div>
        <div class="tile${d.mo_qua_24h ? ' alert' : ''}"><div class="v">${so(d.mo_qua_24h)}</div><div class="l">${t('đã chờ quá 24 giờ')}</div></div>
      </div>
      <div class="filters"><select id="knLoc">${Object.keys(TT).map((k) => `<option value="${k}"${k === loc ? ' selected' : ''}>${TT[k]}</option>`).join('')}</select></div>
      <div class="list card" style="padding:4px 12px">${ds.length ? ds.map((k) => `
        <div class="item" style="cursor:default"><span class="t">
          <span class="n"><a href="#nguoidung/${esc(k.user_id)}" style="font-weight:600">${esc(k.ten || String(k.user_id).slice(0, 8))}</a> <span class="tag">${LOAI[k.loai] || esc(k.loai)}</span>${k.tinh_trang && k.tinh_trang !== 'active' ? ` <span class="tag danger">${esc(MOD[k.tinh_trang] || k.tinh_trang)}</span>` : ` <span class="tag ok">${t('tài khoản đang hoạt động')}</span>`}${k.trang_thai === 'open' && hoursOpen(k.tao_luc) >= 24 ? ` <b style="color:var(--danger)">${t('quá 24 giờ')}</b>` : ''}</span>
          <span class="s" style="white-space:normal">${esc(k.loi_nhan)}</span>
          <span class="s">${ngay172(k.tao_luc)} (${esc(ago(k.tao_luc))})${k.noi_dung_id ? ` · ${esc(k.noi_dung_loai)} ${esc(String(k.noi_dung_id).slice(0, 8))}` : ''}</span>
          ${k.tra_loi ? `<span class="s" style="white-space:normal">${t('Trả lời')}: ${esc(k.tra_loi)}</span>` : ''}</span>
          ${k.trang_thai !== 'open' ? `<span class="tag${k.trang_thai === 'accepted' ? ' ok' : ''}">${TT[k.trang_thai]}</span>`
            : k.cua_minh ? `<span class="tag">${t('của chính bạn')}</span>`
            : `<span class="row" style="gap:6px"><button class="btn sm" data-kn="${esc(k.id)}" data-chap="1">${t('Chấp nhận')}</button><button class="btn sm danger" data-kn="${esc(k.id)}" data-chap="0">${t('Bác')}</button></span>`}
        </div>`).join('') : `<div class="empty">${t('Không có khiếu nại nào.')}</div>`}</div>`);
    $('#knLoc').onchange = () => { state.kn = $('#knLoc').value; render(); };
    main.querySelectorAll('[data-kn]').forEach((b) => b.addEventListener('click', async () => {
      if (dangGui) return;
      const chap = b.dataset.chap === '1';
      const ans = await confirmAction({ title: chap ? t('Chấp nhận khiếu nại') : t('Bác khiếu nại'),
        text: chap ? t('Người dùng sẽ thấy khiếu nại được chấp nhận kèm lời trả lời. Việc gỡ khoá hoặc trả nội dung bạn làm riêng ở trang người dùng.') : t('Người dùng sẽ thấy khiếu nại bị bác kèm lời trả lời.'),
        noteLabel: t('Trả lời người dùng (bắt buộc, họ đọc được)'), okLabel: chap ? t('Chấp nhận') : t('Bác'), danger: !chap });
      if (!ans) return;
      if (ans.note.length < 3) { toast(LOI_NHAY_CAM.reason_required, true); return; }
      dangGui = true;
      try {
        const kq = await goiNhayCam('admin_khieu_nai_xu_ly', { p_id: b.dataset.kn, p_chap_nhan: chap, p_tra_loi: ans.note }, loi172());
        if (kq) { toast(chap ? t('Đã chấp nhận khiếu nại.') : t('Đã bác khiếu nại.')); await render(); }
      } catch (e) { toast(friendly(e), true); } finally { dangGui = false; }
    }));
  }

  /** 172c (Q5): hàng đợi yêu cầu pháp lý — mỗi yêu cầu có hạn; hạn mặc định theo loại là mốc vận hành, sửa được. */
  async function renderPhapLy(main) {
    const phu = t('Yêu cầu gỡ nội dung, yêu cầu của cơ quan điều tra, yêu cầu xuất hoặc xoá dữ liệu — mỗi yêu cầu một dòng, có hạn và người phụ trách ghi kết quả.');
    const loc = state.pl || 'mo';
    const chiCap = { forbidden: t('Thẻ này mở cho vai senior_moderator trở lên.') };
    main.innerHTML = dangTai;
    let d;
    try { d = await goiNhayCam('admin_phap_ly_ds', { p_loc: loc, p_limit: 100, p_offset: 0 }, chiCap); }
    catch (e) { if (laChuaCo(e)) { main.innerHTML = khung(t('Yêu cầu pháp lý'), esc(phu), canBanVa172()); return; } throw e; }
    if (!d) { main.innerHTML = khung(t('Yêu cầu pháp lý'), esc(phu), `<div class="empty">${chiCap.forbidden}</div>`); return; }
    const LOAI = { take_it_down: t('Ảnh riêng tư bị phát tán (TAKE IT DOWN)'), go_noi_dung: t('Cơ quan nhà nước yêu cầu gỡ nội dung'), co_quan_dieu_tra: t('Cơ quan điều tra'),
      xuat_du_lieu: t('Xuất dữ liệu cá nhân'), xoa_du_lieu: t('Xoá dữ liệu cá nhân'), khac: t('Khác') };
    const TT = { moi: t('Mới'), dang_xu_ly: t('Đang xử lý'), xong: t('Xong'), tu_choi: t('Từ chối') };
    const conLai = (y) => {
      if (y.trang_thai === 'xong' || y.trang_thai === 'tu_choi') return '';
      const ms = new Date(y.han).getTime() - Date.now(); const h = Math.abs(ms) / 3600000;
      const chu = h >= 48 ? `${Math.round(h / 24)} ${t('ngày')}` : `${Math.max(1, Math.round(h))} ${t('giờ')}`;
      return ms <= 0 ? `<b style="color:var(--danger)">${t('quá hạn')} ${chu}</b>` : h <= 24 ? `<b style="color:var(--danger)">${t('còn')} ${chu}</b>` : `${t('còn')} ${chu}`;
    };
    const lienQuan = (y) => {
      const a = y.nguoi_lien_quan ? `<a href="#nguoidung/${esc(y.nguoi_lien_quan)}">${esc(y.ten_nguoi || String(y.nguoi_lien_quan).slice(0, 8))}</a>` : '';
      const b = y.bao_cao_id ? `<a href="#antoan/baocao/${esc(y.bao_cao_id)}">${t('báo cáo liên quan')}</a>` : '';
      return a || b ? `<span class="s">${[a, b].filter(Boolean).join(' · ')}</span>` : '';
    };
    const ds = d.ds || [];
    main.innerHTML = khung(t('Yêu cầu pháp lý'), esc(phu), `
      <div class="tiles">
        <div class="tile"><div class="v">${so(d.mo)}</div><div class="l">${t('đang mở')}</div></div>
        <div class="tile${d.qua_han ? ' alert' : ''}"><div class="v">${so(d.qua_han)}</div><div class="l">${t('đã quá hạn')}</div></div>
        <div class="tile${d.trong_24h ? ' alert' : ''}"><div class="v">${so(d.trong_24h)}</div><div class="l">${t('hết hạn trong 24 giờ')}</div></div>
      </div>
      <div class="card"><div class="sec"><h2>${t('Thêm yêu cầu')}</h2></div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <select id="plLoai">${Object.keys(LOAI).map((k) => `<option value="${k}">${LOAI[k]}</option>`).join('')}</select>
          <input class="text" id="plNguon" placeholder="${t('Ai gửi (cơ quan, người, hộp thư)')}" maxlength="200" style="min-width:220px">
          <input class="text" id="plSo" placeholder="${t('Số công văn / mã vụ việc')}" maxlength="120" style="min-width:160px">
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">
          <label class="hint">${t('Nhận lúc')} <input class="text" id="plNhan" type="datetime-local"></label>
          <label class="hint">${t('Hạn (để trống = hạn mặc định)')} <input class="text" id="plHan" type="datetime-local"></label>
          <input class="text" id="plNguoi" placeholder="${t('Mã người dùng liên quan (uuid, nếu có)')}" style="min-width:260px">
          <input class="text" id="plBaoCao" placeholder="${t('Mã báo cáo liên quan (uuid, nếu có)')}" style="min-width:260px">
        </div>
        <textarea class="text" id="plGhiChu" rows="2" maxlength="4000" placeholder="${t('Ghi chú: yêu cầu gì, về nội dung nào')}" style="margin-top:8px;width:100%"></textarea>
        <div class="row" style="margin-top:8px"><button class="btn primary" id="plThem">${t('Thêm')}</button></div>
        <div class="hint" style="margin-top:6px">${t('Hạn mặc định: ảnh riêng tư bị phát tán 48 giờ · cơ quan nhà nước yêu cầu gỡ 24 giờ · xuất / xoá dữ liệu 30 ngày · còn lại 7 ngày. Đây là mốc vận hành, sửa được cho từng yêu cầu; nghĩa vụ pháp lý cụ thể do luật sư xác định.')}</div>
      </div>
      <div class="filters"><select id="plLoc"><option value="mo"${loc === 'mo' ? ' selected' : ''}>${t('Đang mở')}</option><option value="dong"${loc === 'dong' ? ' selected' : ''}>${t('Đã đóng')}</option><option value="tat_ca"${loc === 'tat_ca' ? ' selected' : ''}>${t('Tất cả')}</option></select></div>
      <div class="list card" style="padding:4px 12px">${ds.length ? ds.map((y) => `
        <div class="item" style="cursor:default"><span class="t">
          <span class="n">${LOAI[y.loai] || esc(y.loai)} <span class="tag${y.trang_thai === 'xong' ? ' ok' : ''}">${TT[y.trang_thai] || esc(y.trang_thai)}</span> ${conLai(y)}</span>
          <span class="s" style="white-space:normal">${esc(y.nguon)}${y.tham_chieu ? ' · ' + esc(y.tham_chieu) : ''} · ${t('nhận')} ${ngay172(y.nhan_luc)} · ${t('hạn')} ${ngay172(y.han)}</span>
          ${lienQuan(y)}
          ${y.ghi_chu ? `<span class="s" style="white-space:normal">${esc(y.ghi_chu)}</span>` : ''}
          ${y.ket_qua ? `<span class="s" style="white-space:normal"><b>${t('Kết quả')}:</b> ${esc(y.ket_qua)}</span>` : ''}</span>
          ${y.trang_thai === 'moi' || y.trang_thai === 'dang_xu_ly' ? `<span class="row" style="gap:6px;flex-wrap:wrap">
            ${y.trang_thai === 'moi' ? `<button class="btn sm" data-pl="${esc(y.id)}" data-tt="dang_xu_ly">${t('Nhận xử lý')}</button>` : ''}
            <button class="btn sm" data-pl="${esc(y.id)}" data-tt="xong">${t('Xong')}</button>
            <button class="btn sm danger" data-pl="${esc(y.id)}" data-tt="tu_choi">${t('Từ chối')}</button></span>` : ''}
        </div>`).join('') : `<div class="empty">${t('Không có yêu cầu nào.')}</div>`}</div>`);
    $('#plLoc').onchange = () => { state.pl = $('#plLoc').value; render(); };
    const laUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const gio = (id) => { const v = $(id).value; return v ? new Date(v).toISOString() : null; };
    $('#plThem').onclick = async () => {
      if (dangGui) return;
      const nguon = $('#plNguon').value.trim(), nguoi = $('#plNguoi').value.trim(), bc = $('#plBaoCao').value.trim();
      if (nguon.length < 2) { toast(t('Ghi ai gửi yêu cầu (ít nhất 2 ký tự).'), true); $('#plNguon').focus(); return; }
      if ((nguoi && !laUuid(nguoi)) || (bc && !laUuid(bc))) { toast(t('Mã người dùng / mã báo cáo phải là uuid.'), true); return; }
      const nhan = gio('#plNhan'), han = gio('#plHan');
      if (han && new Date(han) <= new Date(nhan || Date.now())) { toast(t('Hạn phải sau lúc nhận.'), true); return; }
      const du = { loai: $('#plLoai').value, nguon, tham_chieu: $('#plSo').value.trim() || null, ghi_chu: $('#plGhiChu').value.trim() || null };
      if (nhan) du.nhan_luc = nhan;
      if (han) du.han = han;
      if (nguoi) du.nguoi_lien_quan = nguoi;
      if (bc) du.bao_cao_id = bc;
      const ld = await hoiLyDoViec(t('Thêm yêu cầu pháp lý'), t('Yêu cầu được ghi vào hàng đợi và vào nhật ký quản trị kèm tên bạn.'), t('Thêm'));
      if (!ld) return;
      dangGui = true;
      try {
        const kq = await goiNhayCam('admin_phap_ly_ghi', { p_id: null, p_du_lieu: du, p_ly_do: ld }, chiCap);
        if (kq) { toast(`${t('Đã thêm. Hạn:')} ${fmtDate(kq.han)}`); await render(); }
      } catch (e) { toast(/invalid|22P02|22007|23514/.test(((e && e.message) || '') + ((e && e.code) || '')) ? t('Dữ liệu không hợp lệ — xem lại loại, ngày giờ và các mã.') : friendly(e), true); }
      finally { dangGui = false; }
    };
    main.querySelectorAll('[data-pl]').forEach((b) => b.addEventListener('click', async () => {
      if (dangGui) return;
      const tt = b.dataset.tt, dong = tt === 'xong' || tt === 'tu_choi';
      const ld = await hoiLyDoViec(`${t('Yêu cầu pháp lý')}: ${TT[tt]}`, dong ? t('Ghi kết quả: đã làm gì, trả lời ai, lúc nào. Dòng này được lưu làm kết quả của yêu cầu và vào nhật ký.') : t('Ghi ai nhận xử lý và bước tiếp theo.'), TT[tt], tt === 'tu_choi');
      if (!ld) return;
      dangGui = true;
      try {
        const kq = await goiNhayCam('admin_phap_ly_ghi', { p_id: b.dataset.pl, p_du_lieu: dong ? { trang_thai: tt, ket_qua: ld } : { trang_thai: tt }, p_ly_do: ld }, chiCap);
        if (kq) { toast(t('Đã lưu.')); await render(); }
      } catch (e) { toast(friendly(e), true); } finally { dangGui = false; }
    }));
  }

  // ---------------------------------------------------------------- NHẬT KÝ
  async function renderLog(main) {
    const f = state.nk;
    main.innerHTML = `<div class="stack" style="padding-top:14px">
      <div><h1>${t('Nhật ký')}</h1><p class="sub">${t('Mọi hành động của mọi quản trị viên, kể cả mỗi lần mở nội dung riêng và mỗi lần bị từ chối. Không ai sửa hay xoá được nhật ký này; máy chủ chỉ tự xoá dòng cũ hơn thời hạn lưu (mặc định 2 năm).')}</p></div>
      <div class="filters">
        <input id="lQ" placeholder="${t('Tên người, ghi chú…')}" value="${esc(f.q)}" autocomplete="off">
        <select id="lAct">${[['all', `${t('Mọi loại')}`], ['xem', `${t('Xem nội dung riêng')}`], ['tu_choi', `${t('Bị từ chối')}`], ['report', `${t('Xử lý báo cáo')}`], ['status', `${t('Khoá / mở khoá')}`], ['photo', `${t('Duyệt ảnh')}`], ['content', `${t('Gỡ nội dung')}`], ['warn', `${t('Cảnh cáo')}`], ['delete', `${t('Xoá tài khoản')}`], ['ADMIN_ROLE', `${t('Đổi vai trò quản trị')}`], ['billing', `${t('Thanh toán (thủ công)')}`],
          ['ADMIN_HIDE_EVENT', `${t('Ẩn sự kiện')}`], ['ADMIN_RESTORE_EVENT', `${t('Hiện lại sự kiện')}`], ['ADMIN_RESTRICT_COUNTRY', `${t('Thêm nước chỉ trực tuyến')}`], ['ADMIN_UNRESTRICT_COUNTRY', `${t('Bỏ nước chỉ trực tuyến')}`]].map(([k, l]) => `<option value="${k}" ${f.action === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="list card" id="lList" style="padding:4px 12px"><div class="skeleton"></div></div>
      <div class="pager" id="lPager"></div></div>`;
    const doiLoc = () => { f.q = $('#lQ').value.trim(); f.action = $('#lAct').value; f.trang = 0; nav('hethong/nhatky'); };
    $('#lAct').onchange = doiLoc;
    $('#lQ').onkeydown = (e) => { if (e.key === 'Enter') doiLoc(); };
    let rows;
    try { rows = await rpc('admin_actions_log', { p_q: f.q, p_action: f.action, p_limit: TRANG, p_offset: f.trang * TRANG }); }
    catch (e) {   // 171a (Q15): nhật ký chỉ mở cho vai moderator trở lên
      if (!/forbidden/.test((e && e.message) || '')) throw e;
      $('#lList').innerHTML = `<div class="alertbar warn"><div><b>${t('Vai trò của bạn không xem được nhật ký')}</b><br>${t('Nhật ký quản trị chỉ mở cho vai moderator trở lên.')}</div></div>`;
      return;
    }
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
    // Rà soát 15/11: hộp thoại / ảnh phóng to nằm NGOÀI #app — đóng hết, bỏ URL có chữ ký đã nhớ, để hội thoại / ảnh riêng đang mở
    // không còn nằm trên màn đăng nhập sau khi tự đăng xuất vì bỏ máy.
    closeModal(); dongAnhTo(); urlCache.clear(); tqXoa(); $('#toast').hidden = true;
    $('#app').hidden = true; $('#login').hidden = false;
    // Bỏ nội dung đã tải: thay #main bằng một ô rỗng mới, để một lượt vẽ còn dở (đang chờ máy chủ) có xong muộn cũng chỉ ghi vào
    // ô cũ đã tách khỏi trang — không còn dữ liệu của phiên trước nằm trong trang sau khi đăng xuất.
    luotVe++;
    const mainCu = $('#main');
    if (mainCu) { const moi = mainCu.cloneNode(false); mainCu.replaceWith(moi); }
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
      if (await canXacThuc() && !(await xacThucHaiLop())) { await sb.auth.signOut({ scope: 'local' }); throw new Error(t('Cần mã xác thực hai lớp để vào trang quản trị.')); }
      const ok = await rpc('is_admin');
      if (!ok) { await sb.auth.signOut({ scope: 'local' }); throw new Error('unavailable'); }
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

  $('#logout').addEventListener('click', async () => { await sb.auth.signOut({ scope: 'local' }); location.hash = ''; showLogin(); });

  veNgonNgu(); veManDangNhap();
  document.documentElement.lang = lang;

  // Rà soát 15/11: phiên bị thu hồi / làm mới hỏng / đăng xuất ở nơi khác → về màn đăng nhập (đóng hết hộp thoại, bỏ URL đã nhớ),
  // thay vì ở lại trong trang với mọi khung báo "Không có quyền…".
  sb.auth.onAuthStateChange((ev) => {
    if (ev === 'SIGNED_OUT' && !$('#app').hidden) showLogin(t('Phiên đăng nhập đã kết thúc. Đăng nhập lại.'));
  });

  (async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      try {
        if (await canXacThuc() && !(await xacThucHaiLop())) throw new Error('aal2');
        if (await rpc('is_admin')) return showApp(data.session);
      } catch (e) { /* rơi xuống đăng nhập */ }
      await sb.auth.signOut({ scope: 'local' });
    }
    showLogin();
  })();
})();

/* CSP: không còn handler inline (script-src 'self'). Nút "Tải lại" trong thông báo lỗi dùng data-reload. */
document.addEventListener('click', function (e) {
  var t = e.target && e.target.closest ? e.target.closest('[data-reload]') : null;
  if (t) document.dispatchEvent(new CustomEvent('himo-tai-lai'));
});
