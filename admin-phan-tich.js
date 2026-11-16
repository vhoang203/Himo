/* Bảng phân tích của trang quản trị (081): Chiến lược · Vận hành · Chuyên sâu.
   Tệp này CHỈ VẼ: admin.js gọi máy chủ (admin_pt_*), rồi đưa dữ liệu + các hàm dùng chung vào đây.
   Không gọi mạng, không đọc nội dung người dùng — mọi con số là tổng hợp do máy chủ tính.

   Biểu đồ tự vẽ bằng SVG/HTML (CSP chỉ cho mã của chính trang này): một trục, nét mảnh, chú thích luôn có khi
   ≥ 2 chuỗi, màu theo vai trò (màu thương hiệu = một chuỗi; ba màu phân loại đã kiểm mù màu; màu trạng thái chỉ cho
   cảnh báo), mỗi điểm/cột/ô có chú giải khi rê chuột HOẶC khi chọn bằng bàn phím, và có bảng số khi cần. */
(function () {
  'use strict';

  let C = null;                       // ngữ cảnh từ admin.js: { t, esc, so, khung, nav, fmtNgay, locale, lang }
  const t = (s) => C.t(s);
  const esc = (s) => C.esc(s);
  const so = (n) => C.so(n);
  const pct1 = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
  const hienPct = (v) => (v == null ? '—' : `${C.so(v)}%`);

  // ---------------------------------------------------------------- chú giải nổi (một cái cho cả trang)
  let tip = null;
  function ganChuGiai(root) {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'pt-tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
    }
    const hien = (el, x, y) => {
      tip.textContent = '';
      for (const dong of String(el.getAttribute('data-tip') || '').split('\n')) {
        const d = document.createElement('div'); d.textContent = dong; tip.appendChild(d);
      }
      tip.hidden = false;
      const r = tip.getBoundingClientRect();
      const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
      const top = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
      tip.style.left = `${left}px`; tip.style.top = `${top}px`;
    };
    root.querySelectorAll('[data-tip]').forEach((el) => {
      if (el.dataset.ptTip) return;
      el.dataset.ptTip = '1';
      el.addEventListener('pointermove', (e) => hien(el, e.clientX, e.clientY));
      el.addEventListener('pointerleave', () => { tip.hidden = true; });
      el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); hien(el, r.left + r.width / 2, r.top); });
      el.addEventListener('blur', () => { tip.hidden = true; });
    });
  }

  // ---------------------------------------------------------------- mảnh nhỏ
  /** Mũi tên thay đổi so với kỳ trước. tot: 'len' (tăng là tốt) | 'xuong' (giảm là tốt) | null (trung tính). */
  function bienDong(cur, prev, tot) {
    if (cur == null || prev == null) return '';
    if (prev === 0 && cur === 0) return `<span class="pt-d pt-d0">${t('không đổi')}</span>`;
    if (prev === 0) return `<span class="pt-d pt-d0">${t('mới có')}</span>`;
    const p = Math.round(((cur - prev) / prev) * 1000) / 10;
    if (p === 0) return `<span class="pt-d pt-d0">${t('không đổi')}</span>`;
    const len = p > 0;
    const cls = !tot ? 'pt-d0' : (len === (tot === 'len')) ? 'pt-dtot' : 'pt-dxau';
    return `<span class="pt-d ${cls}">${len ? '▲' : '▼'} ${so(Math.abs(p))}%</span>`;
  }
  /** Ô số liệu: nhãn, giá trị, biến động, dòng phụ. `it` = mẫu quá nhỏ để tin. */
  function o(nhan, gt, bd, phu, it) {
    return `<div class="tile pt-kpi"><div class="l">${esc(nhan)}</div><div class="v">${gt}</div>
      <div class="pt-sub">${bd || ''}${phu ? `<span>${phu}</span>` : ''}${it ? `<span class="tag">${t('mẫu nhỏ')}</span>` : ''}</div></div>`;
  }
  const the = (tieuDe, phu, than, id) => `<div class="card pt-card"${id ? ` id="${id}"` : ''}><div class="sec"><h2>${esc(tieuDe)}</h2>${phu ? `<span class="hint">${phu}</span>` : ''}</div>${than}</div>`;
  const chuThich = (ds) => `<div class="pt-legend">${ds.map((x) => `<span><i class="pt-key ${x.kieu || ''}" style="--c:${x.mau}"></i>${esc(x.ten)}</span>`).join('')}</div>`;
  const ngayNgan = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); return m ? `${m[3]}/${m[2]}` : String(s); };
  /** Mốc trục: 0 và 3 mốc "tròn". */
  function mocTruc(max) {
    if (max <= 0) return { top: 1, ticks: [0, 1] };
    const tho = max / 3; const mu = Math.pow(10, Math.floor(Math.log10(tho)));
    const buoc = [1, 2, 2.5, 5, 10].map((x) => x * mu).find((x) => x >= tho) || tho;
    const step = Math.max(buoc, max < 3 ? 1 : buoc);
    const top = Math.ceil(max / step) * step;
    const ticks = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
    return { top, ticks };
  }

  // ---------------------------------------------------------------- biểu đồ đường (một trục)
  /** chuoi: [{ten, mau, gt: number[] (null = chưa có dữ liệu), net: 'lien'|'dut'}]; nhan: string[] cho trục x. */
  function duong(chuoi, nhan, { cao = 190, donVi = '', W = 640 } = {}) {
    const H = cao, L = 40, R = 12, T = 12, B = 26;
    const n = nhan.length;
    const max = Math.max(1, ...chuoi.flatMap((c) => c.gt.filter((v) => v != null)));
    const { top, ticks } = mocTruc(max);
    const x = (i) => L + (n <= 1 ? 0 : (i * (W - L - R)) / (n - 1));
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const luoi = ticks.map((v) => `<line class="pt-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="pt-ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${so(v)}</text>`).join('');
    const buocNhan = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 70))));
    const truc = nhan.map((s, i) => (i % buocNhan === 0 || (i === n - 1 && (n - 1) % buocNhan >= buocNhan / 2)) ? `<text class="pt-ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(s)}</text>` : '').join('');
    const net = chuoi.map((c) => {
      let d = ''; let dangVe = false;
      c.gt.forEach((v, i) => { if (v == null) { dangVe = false; return; } d += `${dangVe ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; dangVe = true; });
      const cuoi = c.gt.map((v, i) => [v, i]).filter(([v]) => v != null).pop();
      return `<path d="${d}" fill="none" stroke="${c.mau}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${c.net === 'dut' ? ' stroke-dasharray="5 4"' : ''}/>`
        + (cuoi ? `<circle cx="${x(cuoi[1])}" cy="${y(cuoi[0])}" r="4" fill="${c.mau}" stroke="var(--surface)" stroke-width="2"/>` : '');
    }).join('');
    const cot = (W - L - R) / Math.max(1, n - 1);
    const vung = nhan.map((s, i) => {
      const dong = [s, ...chuoi.map((c) => `${c.ten}: ${c.gt[i] == null ? t('chưa có dữ liệu') : so(c.gt[i]) + donVi}`)].join('\n');
      return `<rect class="pt-hit" tabindex="0" x="${Math.max(L, x(i) - cot / 2)}" y="${T}" width="${Math.min(cot, W - R - Math.max(L, x(i) - cot / 2))}" height="${H - T - B}" data-tip="${esc(dong)}"><title>${esc(dong)}</title></rect>`;
    }).join('');
    return `<svg class="pt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(chuoi.map((c) => c.ten).join(', '))}">${luoi}${truc}${net}<g class="pt-hits">${vung}</g></svg>`;
  }

  // ---------------------------------------------------------------- cột dọc (một chuỗi)
  function cotDoc(gt, nhan, { cao = 150, mau = 'var(--primary)', ten = '', buocNhan, W = 640 } = {}) {
    const H = cao, L = 40, R = 8, T = 10, B = 24;
    const n = gt.length;
    const { top, ticks } = mocTruc(Math.max(1, ...gt.map((v) => v || 0)));
    const bw = (W - L - R) / n;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const luoi = ticks.map((v) => `<line class="pt-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="pt-ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${so(v)}</text>`).join('');
    const bn = Math.max(buocNhan || 1, Math.ceil(n / Math.max(3, Math.floor(W / 64))));
    const cots = gt.map((v, i) => {
      const h = (H - T - B) * ((v || 0) / top);
      const rong = Math.max(1, bw - 2);
      const dong = `${nhan[i]}\n${ten ? ten + ': ' : ''}${so(v || 0)}`;
      return `<g class="pt-bar" tabindex="0" data-tip="${esc(dong)}"><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/>`
        + (v ? `<path d="${bar(L + i * bw + 1, y(v), rong, h)}" fill="${mau}"/>` : `<rect x="${L + i * bw + 1}" y="${H - B - 1}" width="${rong}" height="1" fill="var(--line2)"/>`)
        + `<title>${esc(dong)}</title></g>`
        + ((i % bn === 0 || (i === n - 1 && (n - 1) % bn >= bn / 2)) ? `<text class="pt-ax" x="${L + i * bw + bw / 2}" y="${H - 7}" text-anchor="middle">${esc(nhan[i])}</text>` : '');
    }).join('');
    return `<svg class="pt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ten)}">${luoi}${cots}</svg>`;
  }
  /** Cột bo 4px ở đầu dữ liệu, chân phẳng trên đường gốc. */
  function bar(x, y, w, h) {
    const r = Math.min(4, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  // ---------------------------------------------------------------- hạch toán tăng trưởng (cột chồng hai phía)
  function hachToan(tuan, W = 640) {
    const H = 220, L = 40, R = 8, T = 10, B = 24;
    const moiNhan = Math.max(1, Math.ceil(tuan.length / Math.max(3, Math.floor(W / 64))));
    const n = tuan.length;
    const len = tuan.map((w) => (w.du_lieu ? w.moi + w.quay_lai + (w.du_lieu_truoc ? w.giu : 0) : 0));
    const xuong = tuan.map((w) => (w.du_lieu && w.du_lieu_truoc ? w.roi : 0));
    const maxL = Math.max(1, ...len), maxX = Math.max(0, ...xuong);
    const tong = maxL + maxX;
    const h0 = T + (H - T - B) * (maxL / tong);                   // đường 0
    const k = (H - T - B) / tong;
    const bw = (W - L - R) / n;
    const lop = [['moi', 'var(--pt-s1)', t('Mới')], ['giu', 'var(--pt-s2)', t('Giữ lại')], ['quay_lai', 'var(--pt-s3)', t('Quay lại')]];
    const cots = tuan.map((w, i) => {
      const x = L + i * bw + 2, rong = Math.max(2, bw - 4);
      const nhan = ngayNgan(w.tuan);
      if (!w.du_lieu) {
        return `<g tabindex="0" data-tip="${esc(`${t('Tuần')} ${nhan}\n${t('chưa có dữ liệu hoạt động')}`)}"><rect x="${x}" y="${T}" width="${rong}" height="${H - T - B}" fill="url(#pt-hatch)" opacity=".5"/></g>`
          + `<text class="pt-ax" x="${x + rong / 2}" y="${H - 7}" text-anchor="middle">${i % moiNhan === 0 || (i === n - 1 && (n - 1) % moiNhan >= moiNhan / 2) ? esc(nhan) : ''}</text>`;
      }
      let yy = h0; let parts = '';
      for (const [key, mau] of lop) {
        if (key === 'giu' && !w.du_lieu_truoc) continue;
        const v = w[key]; if (!v) continue;
        const h = v * k; yy -= h;
        parts += `<rect x="${x}" y="${yy + 1}" width="${rong}" height="${Math.max(1, h - 2)}" fill="${mau}" rx="2"/>`;
      }
      if (w.du_lieu_truoc && w.roi) parts += `<rect x="${x}" y="${h0 + 1}" width="${rong}" height="${Math.max(1, w.roi * k - 2)}" fill="var(--pt-sneg)" rx="2"/>`;
      const qr = w.du_lieu_truoc && w.roi ? Math.round(((w.moi + w.quay_lai) / w.roi) * 10) / 10 : null;
      const dong = [`${t('Tuần')} ${nhan}`, `${t('Mới')}: ${so(w.moi)}`, w.du_lieu_truoc ? `${t('Giữ lại')}: ${so(w.giu)}` : `${t('Giữ lại')}: ${t('chưa đủ dữ liệu')}`,
        `${t('Quay lại')}: ${so(w.quay_lai)}`, w.du_lieu_truoc ? `${t('Rời bỏ')}: ${so(w.roi)}` : `${t('Rời bỏ')}: ${t('chưa đủ dữ liệu')}`,
        qr != null ? `${t('Tỉ số tăng trưởng')}: ${so(qr)}` : ''].filter(Boolean).join('\n');
      return `<g class="pt-bar" tabindex="0" data-tip="${esc(dong)}"><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/>${parts}<title>${esc(dong)}</title></g>`
        + `<text class="pt-ax" x="${x + rong / 2}" y="${H - 7}" text-anchor="middle">${i % moiNhan === 0 || (i === n - 1 && (n - 1) % moiNhan >= moiNhan / 2) ? esc(nhan) : ''}</text>`;
    }).join('');
    const truc = `<line x1="${L}" x2="${W - R}" y1="${h0}" y2="${h0}" stroke="var(--line2)" stroke-width="1"/>
      <text class="pt-ax" x="${L - 6}" y="${T + 8}" text-anchor="end">${so(maxL)}</text><text class="pt-ax" x="${L - 6}" y="${h0 + 4}" text-anchor="end">0</text>
      ${maxX ? `<text class="pt-ax" x="${L - 6}" y="${H - B}" text-anchor="end">−${so(maxX)}</text>` : ''}`;
    return `<svg class="pt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('Người hoạt động mỗi tuần: mới, giữ lại, quay lại và rời bỏ'))}">
      <defs><pattern id="pt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--line2)" stroke-width="2"/></pattern></defs>
      ${truc}${cots}</svg>`;
  }
  const chuThichHachToan = () => chuThich([[t('Mới'), 'var(--pt-s1)'], [t('Giữ lại'), 'var(--pt-s2)'], [t('Quay lại'), 'var(--pt-s3)'], [t('Rời bỏ (dưới 0)'), 'var(--pt-sneg)']].map(([ten, mau]) => ({ ten, mau })));

  // ---------------------------------------------------------------- vẽ theo đúng bề rộng thật
  // SVG co giãn theo khung nên chữ trên trục cũng co giãn; để chữ luôn ~11 px, mỗi biểu đồ được vẽ SAU khi khung đã có
  // bề rộng, bằng đúng số pixel đó, và vẽ lại khi cửa sổ đổi cỡ.
  let hangCho = [];
  const cho = (fn) => { hangCho.push(fn); return `<div class="pt-chart" data-chart="${hangCho.length - 1}"></div>`; };
  let veLai = null;
  function veBieuDo(main) {
    const ds = hangCho; hangCho = [];
    const ve = () => {
      main.querySelectorAll('.pt-chart[data-chart]').forEach((el) => {
        const fn = ds[Number(el.dataset.chart)];
        if (fn) el.innerHTML = fn(Math.max(280, Math.round(el.clientWidth || 600)));
      });
      ganChuGiai(main);
    };
    ve();
    if (veLai) window.removeEventListener('resize', veLai);
    let hen = null;
    veLai = () => { clearTimeout(hen); hen = setTimeout(() => { if (main.isConnected) ve(); }, 150); };
    window.addEventListener('resize', veLai);
  }

  // ---------------------------------------------------------------- thanh ngang (xếp hạng / tỉ lệ)
  /** dong: [{ten, n, phu?}]; mau một màu (một chuỗi); mau mặc định = màu thương hiệu. */
  function thanh(dong, { tong, mau = 'var(--primary)', donVi = '', rong = 140 } = {}) {
    const max = Math.max(1, ...dong.map((d) => d.n || 0));
    return `<div class="pt-hbars">${dong.map((d) => {
      const w = Math.max(d.n ? 1.5 : 0, Math.round(((d.n || 0) / max) * 1000) / 10);
      const p = tong ? pct1(d.n || 0, tong) : null;
      const dongTip = `${d.ten}: ${so(d.n || 0)}${donVi}${p != null ? ` (${so(p)}%)` : ''}${d.phu ? '\n' + d.phu : ''}`;
      return `<div class="pt-hrow" tabindex="0" data-tip="${esc(dongTip)}" style="--w:${rong}px"><span class="pt-hl">${esc(d.ten)}</span>
        <span class="pt-hb"><i style="width:${w}%;background:${mau}"></i></span>
        <span class="pt-hv">${so(d.n || 0)}${donVi}${p != null ? `<small>${so(p)}%</small>` : ''}</span></div>`;
    }).join('')}</div>`;
  }

  // ---------------------------------------------------------------- phễu
  function pheu(buoc) {
    const dau = buoc[0]?.n || 0;
    return `<div class="pt-funnel">${buoc.map((b, i) => {
      const p0 = dau ? pct1(b.n, dau) : null;
      const pt = i > 0 && buoc[i - 1].n ? pct1(b.n, buoc[i - 1].n) : null;
      const dongTip = `${b.ten}: ${so(b.n)}${p0 != null ? `\n${so(p0)}% ${t('so với bước đầu')}` : ''}${pt != null ? `\n${so(pt)}% ${t('so với bước trước')}` : ''}${b.phu ? '\n' + b.phu : ''}`;
      return `<div class="pt-fstep" tabindex="0" data-tip="${esc(dongTip)}"><span class="pt-fl">${esc(b.ten)}</span>
        <span class="pt-fb"><i style="width:${dau ? Math.max(b.n ? 1.5 : 0, (b.n / dau) * 100) : 0}%"></i></span>
        <span class="pt-fv"><b>${so(b.n)}</b>${pt != null ? `<small>${so(pt)}% ${t('bước trước')}</small>` : ''}</span></div>`;
    }).join('')}</div>`;
  }

  // ---------------------------------------------------------------- bản đồ nhiệt (một hue, nhạt → đậm)
  function nhiet(o2) {
    const ten = C.lang() === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const m = {}; let max = 0;
    for (const c of o2) { m[`${c.t}|${c.g}`] = c.n; if (c.n > max) max = c.n; }
    let html = '<div class="pt-heat" role="img" aria-label="' + esc(t('Tin nhắn theo thứ và giờ')) + '"><span></span>';
    for (let g = 0; g < 24; g++) html += `<span class="pt-hh">${g % 3 === 0 ? g : ''}</span>`;
    for (let d = 1; d <= 7; d++) {
      html += `<span class="pt-hd">${ten[d - 1]}</span>`;
      for (let g = 0; g < 24; g++) {
        const v = m[`${d}|${g}`] || 0;
        const a = v ? 0.12 + 0.88 * (v / max) : 0;
        html += `<span class="pt-hc" tabindex="0" style="--a:${a.toFixed(3)}" data-tip="${esc(`${ten[d - 1]} ${String(g).padStart(2, '0')}:00–${String(g).padStart(2, '0')}:59\n${t('Tin nhắn')}: ${so(v)}`)}"></span>`;
      }
    }
    return html + '</div>' + `<div class="pt-scale"><span>${t('ít')}</span><i></i><span>${t('nhiều')} (${so(max)})</span></div>`;
  }

  // ---------------------------------------------------------------- nhận xét tự động
  /** Câu nhận xét rút từ số liệu. Chỉ nói khi mẫu đủ lớn; mỗi câu nêu con số nó dựa vào. */
  function nhanXet(dsCau) {
    const ds = dsCau.filter(Boolean);
    if (!ds.length) return '';
    return the(t('Nhận xét tự động'), t('rút ra từ chính các con số bên dưới — luôn kiểm lại trước khi quyết định'),
      `<ul class="pt-insights">${ds.map((c) => `<li class="pt-i-${c.m}"><span class="pt-ic" aria-hidden="true">${c.m === 'xau' ? '!' : c.m === 'tot' ? '✓' : 'i'}</span><span><span class="sr">${c.m === 'xau' ? t('Cần chú ý:') : c.m === 'tot' ? t('Tốt:') : t('Thông tin:')} </span>${c.text}</span></li>`).join('')}</ul>`);
  }

  // ---------------------------------------------------------------- tiêu đề + chọn kỳ
  function dauTrang(tieuDe, phu, ky, kyChon) {
    return `<div class="pt-head"><div><h1>${esc(tieuDe)}</h1><p class="sub">${phu}</p></div>
      ${ky ? `<div class="chips" id="ptKy" role="group" aria-label="${esc(t('Khoảng thời gian'))}">${ky.map((d) => `<button class="chip" data-d="${d}" aria-pressed="${kyChon === d}">${d} ${t('ngày')}</button>`).join('')}</div>` : ''}</div>`;
  }
  const MAU_KHONG_DU = 30;    // dưới số người này thì tỉ lệ dao động mạnh — ghi "mẫu nhỏ"

  // ================================================================ A. CHIẾN LƯỢC
  function chienLuoc(main, o2, ctx) {
    C = ctx;
    const k = o2.kpi; const d = o2.ngay;
    const hd = k.hoat_dong.cur, hd0 = k.hoat_dong.prev;
    const dinh = hd ? pct1(k.dau_tb.cur, hd) : null, dinh0 = hd0 ? pct1(k.dau_tb.prev, hd0) : null;
    const hai = hd ? pct1(k.hai_chieu.cur, hd) : null, hai0 = hd0 ? pct1(k.hai_chieu.prev, hd0) : null;
    const g7 = k.giu_7n.cur, g70 = k.giu_7n.prev;
    const d7 = g7 && g7.n ? pct1(g7.quay, g7.n) : null, d70 = g70 && g70.n ? pct1(g70.quay, g70.n) : null;
    const roi = k.roi_bo && k.roi_bo.tong ? pct1(k.roi_bo.n, k.roi_bo.tong) : null;
    const tpn = hd ? Math.round((k.tin_nhan.cur / hd) * 10) / 10 : null, tpn0 = hd0 ? Math.round((k.tin_nhan.prev / hd0) * 10) / 10 : null;
    const bc = hd ? Math.round((k.bao_cao.cur * 1000 / hd) * 10) / 10 : null, bc0 = hd0 ? Math.round((k.bao_cao.prev * 1000 / hd0) * 10) / 10 : null;
    const kyTruoc = (v, f = so) => (v == null ? '' : `${t('kỳ trước')} ${f(v)}`);

    const tiles = [
      o(t('Người hoạt động'), so(hd), bienDong(hd, hd0, 'len'), kyTruoc(hd0)),
      o(t('Đăng ký mới'), so(k.dang_ky.cur), bienDong(k.dang_ky.cur, k.dang_ky.prev, 'len'), kyTruoc(k.dang_ky.prev)),
      o(t('DAU trung bình'), so(k.dau_tb.cur), bienDong(k.dau_tb.cur, k.dau_tb.prev, 'len'), kyTruoc(k.dau_tb.prev)),
      o(t('Độ dính (DAU ÷ người hoạt động)'), hienPct(dinh), bienDong(dinh, dinh0, 'len'), kyTruoc(dinh0, hienPct), hd < MAU_KHONG_DU),
      o(t('Trò chuyện hai chiều'), hienPct(hai), bienDong(hai, hai0, 'len'), `${t('mốc')} ≥ 40%`, hd < MAU_KHONG_DU),
      o(t('Quay lại trong 7 ngày'), hienPct(d7), bienDong(d7, d70, 'len'), `${g7 ? so(g7.quay) + '/' + so(g7.n) : '—'} · ${t('mốc')} ≥ 25%`, !g7 || g7.n < MAU_KHONG_DU),
      o(t('Rời bỏ'), hienPct(roi), '', k.roi_bo ? `${so(k.roi_bo.n)}/${so(k.roi_bo.tong)} ${t('người của kỳ trước')}` : '', !k.roi_bo || k.roi_bo.tong < MAU_KHONG_DU),
      o(t('Tin nhắn mỗi người hoạt động'), so(tpn), bienDong(tpn, tpn0, 'len'), kyTruoc(tpn0)),
      o(t('Tổng tài khoản'), so(k.tong_tk.cur), bienDong(k.tong_tk.cur, k.tong_tk.prev, 'len'), `${t('đầu kỳ')} ${so(k.tong_tk.prev)}`),
      o(t('Báo cáo / 1.000 người hoạt động'), so(bc), bienDong(bc, bc0, 'xuong'), `${so(k.bao_cao.cur)} ${t('báo cáo')}`),
      o(t('Cuộc trò chuyện mới'), so(k.cuoc_moi.cur), bienDong(k.cuoc_moi.cur, k.cuoc_moi.prev, 'len'), kyTruoc(k.cuoc_moi.prev)),
      o(t('Đang có HIMO Plus'), so(k.plus.cur), '', t('hiện tại')),
    ].join('');

    const tuan = o2.tuan || [];
    const nhanT = tuan.map((w) => ngayNgan(w.tuan));
    const xuHuong = cho((W) => duong([
      { ten: t('Người hoạt động trong tuần (WAU)'), mau: 'var(--pt-s1)', gt: tuan.map((w) => (w.du_lieu ? w.wau : null)) },
      { ten: t('Đăng ký mới'), mau: 'var(--pt-s3)', gt: tuan.map((w) => w.dang_ky) },
    ], nhanT, { W }));
    const tin = cho((W) => cotDoc(tuan.map((w) => w.tin), nhanT, { ten: t('Tin nhắn'), buocNhan: 2, W }));

    const cc = o2.co_cau_tin || {};
    const loaiTin = [
      { ten: t('Chữ'), n: cc.chu }, { ten: t('Ảnh'), n: cc.anh }, ...(o2.co_video ? [{ ten: t('Video'), n: cc.video }] : []),
      { ten: t('Vị trí'), n: cc.vi_tri }, { ten: t('Trả lời một tin'), n: cc.tra_loi }, { ten: t('Đã thu hồi'), n: cc.thu_hoi },
    ];
    const tenNuoc = (k2) => (k2 === 'khac' ? t('Khác') : k2 === '?' ? t('Chưa khai') : k2);
    const nguonNuoc = (o2.nguon?.nuoc || []).map((x) => ({ ten: tenNuoc(x.k), n: x.n }));
    const tongDk = nguonNuoc.reduce((a, x) => a + x.n, 0);
    const nguonLang = (o2.nguon?.ngon_ngu || []).map((x) => ({ ten: tenNuoc(x.k), n: x.n }));

    // nhận xét
    const cau = [];
    if (hd >= 10 && hd0 >= 10) {
      const p = Math.round(((hd - hd0) / hd0) * 100);
      cau.push({ m: p >= 5 ? 'tot' : p <= -5 ? 'xau' : 'info', text: `${t('Người hoạt động')} <b>${p >= 0 ? '+' : ''}${p}%</b> ${t('so với')} ${d} ${t('ngày trước đó')} (${so(hd0)} → ${so(hd)}).` });
    }
    if (d7 != null && g7.n >= 10) cau.push({ m: d7 >= 25 ? 'tot' : 'xau', text: `${t('Quay lại trong 7 ngày:')} <b>${so(d7)}%</b> ${d7 >= 25 ? t('— đạt mốc 25% của kế hoạch.') : t('— dưới mốc 25%: chưa nên chi tiền quảng cáo, ưu tiên trải nghiệm tuần đầu.')}` });
    if (hai != null && hd >= 10) cau.push({ m: hai >= 40 ? 'tot' : 'xau', text: `<b>${so(hai)}%</b> ${t('người hoạt động có ít nhất một cuộc trò chuyện hai chiều')} ${hai >= 40 ? t('— đạt mốc 40%.') : t('— mốc là 40%; đây là con số dự đoán giữ chân tốt nhất.')}` });
    const lat = tuan.filter((w) => w.du_lieu && w.du_lieu_truoc).slice(-1)[0];
    if (lat && lat.roi >= 5) {
      const qr = Math.round(((lat.moi + lat.quay_lai) / lat.roi) * 10) / 10;
      cau.push({ m: qr >= 1 ? 'tot' : 'xau', text: `${t('Tuần')} ${ngayNgan(lat.tuan)}: ${so(lat.moi + lat.quay_lai)} ${t('người mới hoặc quay lại so với')} ${so(lat.roi)} ${t('người rời bỏ — tỉ số tăng trưởng')} <b>${so(qr)}</b> ${qr >= 1 ? t('(đang lớn lên).') : t('(đang co lại).')}` });
    }
    if (tongDk >= 10 && nguonNuoc[0]) cau.push({ m: 'info', text: `${t('Nguồn đăng ký lớn nhất:')} <b>${esc(nguonNuoc[0].ten)}</b> (${so(pct1(nguonNuoc[0].n, tongDk))}% ${t('đăng ký của kỳ')}).` });
    if (cc.tong >= 20) {
      const da = (cc.anh || 0) + (cc.video || 0);
      cau.push({ m: 'info', text: `${so(pct1(cc.nhom || 0, cc.tong))}% ${t('tin nhắn nằm trong nhóm')}; ${so(pct1(da, cc.tong))}% ${t('là ảnh hoặc video.')}` });
    }
    if (bc != null && bc0 != null && k.bao_cao.cur >= 5 && bc > bc0 * 1.5) cau.push({ m: 'xau', text: `${t('Tỉ lệ báo cáo tăng từ')} ${so(bc0)} ${t('lên')} <b>${so(bc)}</b> ${t('trên 1.000 người hoạt động — xem nhóm An toàn.')}` });
    if (hd < MAU_KHONG_DU) cau.push({ m: 'info', text: t('Mẫu còn nhỏ (dưới 30 người hoạt động): các tỉ lệ dao động mạnh giữa các kỳ — đọc xu hướng, đừng đọc từng con số.') });

    main.innerHTML = `<div class="stack" style="padding-top:14px">
      ${dauTrang(t('Chiến lược'), `${t('Bức tranh toàn cảnh cho quyết định: kỳ này so với kỳ trước cùng độ dài, 12 tuần gần nhất. "Hoạt động" = mở app trong ngày (ngày UTC).')}${o2.do_tu ? ` ${t('Dữ liệu hoạt động có từ')} ${esc(C.fmtNgay(o2.do_tu))}.` : ''}`, [7, 30, 90], d)}
      ${nhanXet(cau)}
      <div class="tiles pt-tiles">${tiles}</div>
      <div class="pt-grid2">
        ${the(t('Xu hướng 12 tuần'), t('người, theo tuần (thứ Hai)'), chuThich([{ ten: t('Người hoạt động trong tuần (WAU)'), mau: 'var(--pt-s1)' }, { ten: t('Đăng ký mới'), mau: 'var(--pt-s3)' }]) + xuHuong)}
        ${the(t('Tin nhắn mỗi tuần'), '', tin)}
      </div>
      ${the(t('Tăng trưởng thật sự đến từ đâu'), t('người hoạt động mỗi tuần = mới + giữ lại + quay lại; phần dưới 0 là người của tuần trước không quay lại'), chuThichHachToan() + cho((W) => hachToan(tuan, W))
        + `<details class="pt-tbl"><summary>${t('Xem bảng số')}</summary><div class="scrollx"><table class="tbl"><thead><tr><th>${t('Tuần')}</th><th class="num">WAU</th><th class="num">${t('Mới')}</th><th class="num">${t('Giữ lại')}</th><th class="num">${t('Quay lại')}</th><th class="num">${t('Rời bỏ')}</th><th class="num">${t('Đăng ký')}</th><th class="num">${t('Tin nhắn')}</th></tr></thead><tbody>${tuan.map((w) => `<tr><td>${esc(C.fmtNgay(w.tuan))}</td><td class="num">${w.du_lieu ? so(w.wau) : '—'}</td><td class="num">${w.du_lieu ? so(w.moi) : '—'}</td><td class="num">${w.du_lieu && w.du_lieu_truoc ? so(w.giu) : '—'}</td><td class="num">${w.du_lieu ? so(w.quay_lai) : '—'}</td><td class="num">${w.du_lieu && w.du_lieu_truoc ? so(w.roi) : '—'}</td><td class="num">${so(w.dang_ky)}</td><td class="num">${so(w.tin)}</td></tr>`).join('')}</tbody></table></div></details>`)}
      <div class="pt-grid2">
        ${the(t('Người dùng nhắn gì'), `${so(cc.tong || 0)} ${t('tin trong kỳ')} · ${so(pct1(cc.nhom || 0, cc.tong || 0) ?? 0)}% ${t('trong nhóm')}`, thanh(loaiTin, { tong: cc.tong }))}
        ${the(t('Đăng ký đến từ đâu'), `${so(tongDk)} ${t('đăng ký trong kỳ, theo nước khai trong hồ sơ')}`, tongDk ? thanh(nguonNuoc, { tong: tongDk }) : `<div class="hint">${t('Chưa có đăng ký nào trong kỳ.')}</div>`)}
      </div>
      ${tongDk ? the(t('Ngôn ngữ của người mới'), t('ngôn ngữ nhận thông báo'), thanh(nguonLang, { tong: tongDk })) : ''}
      <div class="hint">${t('Định nghĩa: "kỳ trước" là cùng số ngày ngay trước kỳ này. Rời bỏ = hoạt động trong kỳ trước nhưng không mở app lần nào trong kỳ này. Quay lại trong 7 ngày = mở app ít nhất một lần trong 7 ngày sau ngày đăng ký (tính cho những người đã đủ 7 ngày).')}</div>
    </div>`;
    veBieuDo(main);
  }

  // ================================================================ B. VẬN HÀNH
  const NHAN_CANH_BAO = {
    bao_cao_qua_24h: (a) => [`${a.n} ${t('báo cáo đã quá 24 giờ chưa xử lý')}`, t('Apple xem mốc 24 giờ là cam kết. Xử lý ngay.'), 'antoan/baocao'],
    bao_cao_sap_24h: (a) => [t('Một báo cáo sắp quá 24 giờ'), `${t('đã mở')} ${so(a.n)} ${t('giờ')}`, 'antoan/baocao'],
    anh_cho_lau: (a) => [t('Ảnh chờ duyệt quá lâu'), `${t('cái lâu nhất đã chờ')} ${so(a.n)} ${t('giờ')}`, 'antoan/anh'],
    tin_giam: (a) => [t('Tin nhắn giảm mạnh'), `${so(a.n)} ${t('trong 24 giờ qua, trung bình')} ${so(a.tb)}/${t('ngày')} — ${t('kiểm tra app, thông báo đẩy, máy chủ')}`, null],
    bao_cao_tang: (a) => [t('Báo cáo tăng đột biến'), `${so(a.n)} ${t('trong 24 giờ, trung bình')} ${so(a.tb)}/${t('ngày')}`, 'antoan/baocao'],
    chan_tang: (a) => [t('Lượt chặn tăng đột biến'), `${so(a.n)} ${t('trong 24 giờ, trung bình')} ${so(a.tb)}/${t('ngày')} — ${t('có thể có tài khoản quấy rối hoặc spam')}`, 'antoan/taipham'],
    khong_dang_ky_72h: () => [t('Không có đăng ký mới trong 72 giờ'), t('trong khi tuần trước vẫn có — kiểm tra màn đăng ký, email xác nhận'), null],
    goi_nho_nhieu: (a) => [t('Nhiều cuộc gọi bị nhỡ'), `${a.n}/${a.tong} ${t('cuộc trong 24 giờ — kiểm tra thông báo cuộc gọi')}`, null],
    db_day: (a) => [t('Cơ sở dữ liệu sắp đầy'), `${so(a.n)}% ${t('của gói 8 GB')}`, 'hethong/vanhanh'],
    kho_day: () => [t('Kho ảnh/video sắp đầy'), t('trên 80% của 100 GB'), 'hethong/vanhanh'],
  };
  const bytes = (b) => (b == null ? '—' : b >= 1073741824 ? `${so(Math.round(b / 107374182.4) / 10)} GB` : b >= 1048576 ? `${so(Math.round(b / 104857.6) / 10)} MB` : `${so(Math.round(b / 1024))} KB`);

  function vanHanh(main, o2, ctx) {
    C = ctx;
    const h = o2.hien_tai || {}; const cs = o2.cua_so || {}; const g = o2.goi_7n || {};
    const canh = (o2.canh_bao || []).map((a) => { const f = NHAN_CANH_BAO[a.k]; const [tieu, phu, go] = f ? f(a) : [a.k, '', null]; return { m: a.m, tieu, phu, go }; });
    const canhHtml = canh.length
      ? canh.map((c) => `<div class="alertbar ${c.m === 'danger' ? '' : 'warn'}"${c.go ? ` data-go="${c.go}" style="cursor:pointer"` : ''}><span class="pt-ic" aria-hidden="true">!</span><div><b>${esc(c.tieu)}</b><br>${esc(c.phu)}</div></div>`).join('')
      : `<div class="alertbar ok"><span class="pt-ic" aria-hidden="true">✓</span><div><b>${t('Không có cảnh báo')}</b><br>${t('Mọi chỉ số đang trong ngưỡng bình thường.')}</div></div>`;
    const lm = h.loi_moi_7n || {};
    const hienTai = [
      o(t('Báo cáo đang mở'), so(h.bao_cao_mo), h.bao_cao_qua_24h ? `<span class="pt-d pt-dxau">${so(h.bao_cao_qua_24h)} ${t('quá 24 giờ')}</span>` : '', h.bao_cao_lau_nhat_gio != null ? `${t('lâu nhất')} ${so(h.bao_cao_lau_nhat_gio)} ${t('giờ')}` : t('không có')),
      o(t('Ảnh chờ duyệt'), so(h.anh_cho), '', h.anh_cho_lau_nhat_gio != null ? `${t('lâu nhất')} ${so(h.anh_cho_lau_nhat_gio)} ${t('giờ')}` : t('hàng chờ trống')),
      o(t('Hoạt động hôm nay'), so(h.hoat_dong_hom_nay), '', t('ngày UTC')),
      o(t('Đang gọi'), so((h.dang_goi || 0) + (h.dang_goi_nhom || 0)), '', `${so(h.dang_goi || 0)} ${t('cuộc 1-1')} · ${so(h.dang_goi_nhom || 0)} ${t('nhóm')}`),
      o(t('Lời mời trò chuyện được nhận (7 ngày)'), hienPct(lm.n ? pct1(lm.mo, lm.n) : null), '', `${so(lm.mo || 0)}/${so(lm.n || 0)}`, (lm.n || 0) < MAU_KHONG_DU),
      o(t('Đang bị phạt'), so(h.dang_bi_phat), '', t('tạm khoá hoặc khoá vĩnh viễn')),
    ].join('');

    const CHI_SO = [
      ['tin', t('Tin nhắn')], ['nguoi_gui', t('Người gửi tin')], ['dang_ky', t('Đăng ký mới')], ['cuoc_moi', t('Cuộc trò chuyện mới')],
      ['anh', t('Ảnh gửi trong chat')], ...(o2.co_video ? [['video', t('Video gửi trong chat')]] : []), ['vi_tri', t('Vị trí đã chia sẻ')],
      ['goi', t('Cuộc gọi 1-1')], ['goi_nhom', t('Cuộc gọi nhóm')], ['bai', t('Bài đăng')], ['binh_luan', t('Bình luận')], ['thich', t('Lượt thích')],
      ['bao_cao', t('Báo cáo'), 'xuong'], ['chan', t('Lượt chặn'), 'xuong'],
    ];
    const bang = `<div class="scrollx"><table class="tbl pt-cmp"><thead><tr><th>${t('Chỉ số')}</th><th class="num">${t('24 giờ qua')}</th><th class="num">${t('24 giờ trước đó')}</th><th class="num">${t('TB 7 ngày')}</th><th>${t('so với TB 7 ngày')}</th></tr></thead><tbody>
      ${CHI_SO.map(([k, ten, tot]) => { const v = cs[k] || {}; return `<tr><td>${esc(ten)}</td><td class="num"><b>${so(v.c)}</b></td><td class="num">${so(v.p)}</td><td class="num">${v.tb == null ? '—' : so(v.tb)}</td><td>${v.tb == null || Number(v.tb) < 1 ? '' : bienDong(v.c, Number(v.tb), tot || 'len')}</td></tr>`; }).join('')}
      </tbody></table></div>`;

    const gio = o2.theo_gio || [];
    const nhanGio = gio.map((x) => `${x.gio.slice(8, 10)}/${x.gio.slice(5, 7)} ${x.gio.slice(11, 13)}h`);
    const nghe = g.tong ? pct1(g.nghe, g.tong) : null;
    const trangThaiGoi = [{ ten: t('Đã nghe'), n: g.nghe }, { ten: t('Nhỡ'), n: g.nho }, { ten: t('Từ chối'), n: g.tu_choi }, { ten: t('Người gọi huỷ'), n: g.huy }];
    const sc = o2.suc_chua || {};
    const tongKho = sc.kho ? Object.values(sc.kho).reduce((a, x) => a + (x.bytes || 0), 0) : null;
    const thanhSucChua = (ten, dung, gioiHan, phu) => {
      const p = dung == null ? null : Math.min(100, Math.round((dung / gioiHan) * 1000) / 10);
      return `<div class="pt-cap"><div class="row" style="justify-content:space-between"><b>${esc(ten)}</b><span>${bytes(dung)} / ${bytes(gioiHan)}${p != null ? ` · ${so(p)}%` : ''}</span></div>
        <span class="pt-hb"><i style="width:${p == null ? 0 : Math.max(0.8, p)}%;background:${p != null && p >= 80 ? 'var(--warn)' : 'var(--primary)'}"></i></span>${phu ? `<div class="hint">${phu}</div>` : ''}</div>`;
    };

    main.innerHTML = `<div class="stack" style="padding-top:14px">
      ${dauTrang(t('Vận hành'), `${t('Giám sát hằng ngày và cảnh báo sớm. Giờ địa phương:')} ${esc(o2.tz)}. ${t('Cập nhật lúc')} ${esc(new Date(o2.luc).toLocaleTimeString(C.locale(), { hour: '2-digit', minute: '2-digit' }))}.`)}
      ${canhHtml}
      <div class="tiles pt-tiles">${hienTai}</div>
      ${the(t('24 giờ qua so với bình thường'), t('"TB 7 ngày" = trung bình mỗi 24 giờ của 7 ngày trước đó; trung bình dưới 1 thì không tính phần trăm'), bang)}
      <div class="pt-grid2">
        ${the(t('Tin nhắn theo giờ'), t('48 giờ gần nhất'), cho((W) => cotDoc(gio.map((x) => x.tin), nhanGio, { ten: t('Tin nhắn'), buocNhan: 6, W })))}
        ${the(t('Người gửi tin theo giờ'), t('48 giờ gần nhất'), cho((W) => cotDoc(gio.map((x) => x.nguoi), nhanGio, { ten: t('Người gửi tin'), buocNhan: 6, mau: 'var(--pt-s1)', W })))}
      </div>
      ${the(t('Giờ cao điểm'), t('tin nhắn 28 ngày qua theo thứ và giờ địa phương — giờ nên trực báo cáo, gửi thông báo, bảo trì'), nhiet(o2.nhiet_28n || []))}
      <div class="pt-grid2">
        ${the(t('Cuộc gọi 7 ngày'), `${so(g.tong || 0)} ${t('cuộc 1-1')} · ${so(g.thoai || 0)} ${t('thoại')} · ${so(g.video || 0)} video`,
          `<div class="tiles pt-tiles sm">${o(t('Tỉ lệ được nghe'), hienPct(nghe), '', '', (g.tong || 0) < MAU_KHONG_DU)}${o(t('Thời lượng trung bình'), g.giay_tb == null ? '—' : `${Math.floor(g.giay_tb / 60)}:${String(g.giay_tb % 60).padStart(2, '0')}`, '', t('phút:giây'))}${o(t('Tổng phút gọi'), so(g.phut || 0), '', '')}</div>`
          + thanh(trangThaiGoi, { tong: g.tong })
          + `<div class="hint" style="margin-top:8px">${t('Gọi nhóm:')} ${so(g.nhom?.cuoc || 0)} ${t('cuộc')}, ${t('trung bình')} ${so(g.nhom?.nguoi_tb || 0)} ${t('người')}, ${so(g.nhom?.phut_nguoi || 0)} ${t('phút-người')}.</div>`)}
        ${the(t('Sức chứa'), t('gói Supabase Pro'), thanhSucChua(t('Cơ sở dữ liệu'), sc.db_bytes, sc.db_gioi_han)
          + thanhSucChua(t('Kho ảnh và video'), tongKho, sc.kho_gioi_han, sc.kho == null ? t('Không đọc được dung lượng kho từ cơ sở dữ liệu.') : Object.entries(sc.kho).map(([b, x]) => `${esc(b)}: ${so(x.tep)} ${t('tệp')}, ${bytes(x.bytes)}`).join(' · ')))}
      </div>
    </div>`;
    main.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => C.nav(el.dataset.go)));
    veBieuDo(main);
  }

  // ================================================================ C. CHUYÊN SÂU
  const TEN_TINH_NANG = {
    gui_tin: 'Gửi tin nhắn', gui_anh: 'Gửi ảnh', gui_video: 'Gửi video', vi_tri: 'Chia sẻ vị trí', tra_loi: 'Trả lời một tin', cam_xuc: 'Thả cảm xúc',
    nhom: 'Nhắn trong nhóm', goi: 'Gọi 1-1', goi_nhom: 'Gọi nhóm', dich: 'Dịch tin nhắn', dang_bai: 'Đăng bài', thich: 'Thích bài',
    binh_luan: 'Bình luận', theo_doi: 'Theo dõi (lịch sử — trước 091, không còn ghi mới)', xem_ho_so: 'Xem hồ sơ người khác', binh_chon: 'Bình chọn trong nhóm', su_kien: 'Tham gia sự kiện nhóm',
  };
  const TEN_LY_DO = { fake: 'Giả mạo', harassment: 'Quấy rối', underage: 'Dưới 18 tuổi', scam: 'Lừa đảo', inappropriate: 'Không phù hợp', other: 'Khác' };

  function chuyenSau(main, o2, ctx) {
    C = ctx;
    const hd = o2.hoat_dong || 0;
    // 1. cohort
    const coh = o2.cohort || [];
    const oCoh = (row) => row.o.map((c) => {
      if (c.n == null) return `<td class="pt-coh pt-coh-na" title="${esc(t('chưa tới tuần này hoặc chưa có dữ liệu'))}">·</td>`;
      const p = row.n ? pct1(c.n, row.n) : null;
      const a = p == null ? 0 : 0.08 + 0.92 * (p / 100);
      return `<td class="pt-coh" tabindex="0" style="--a:${a.toFixed(3)}" data-tip="${esc(`${t('Nhóm đăng ký tuần')} ${C.fmtNgay(row.tuan)}\n${t('Tuần')} ${c.k}: ${so(c.n)}/${so(row.n)} ${t('người')}${p != null ? ` (${so(p)}%)` : ''}`)}"><span>${p == null ? '—' : so(Math.round(p))}</span></td>`;
    }).join('');
    const cohort = `<div class="scrollx"><table class="tbl pt-cohort"><thead><tr><th>${t('Tuần đăng ký')}</th><th class="num">${t('Người')}</th>${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<th class="num">${t('T')}${k}</th>`).join('')}</tr></thead>
      <tbody>${coh.slice().reverse().map((row) => `<tr><td>${esc(C.fmtNgay(row.tuan))}</td><td class="num">${so(row.n)}</td>${oCoh(row)}</tr>`).join('')}</tbody></table></div>
      <div class="hint">${t('Ô = % người của nhóm có mở app trong tuần thứ k sau tuần đăng ký (T0 = chính tuần đăng ký). Dấu · = tuần chưa tới hoặc chưa có dữ liệu hoạt động.')}</div>`;
    // 2–3. phễu
    const pf = o2.pheu_dang_ky || {};
    const pheuDk = pheu([
      { ten: t('Đăng ký'), n: pf.dang_ky || 0 }, { ten: t('Có ảnh đại diện'), n: pf.co_anh || 0 },
      { ten: t('Gửi tin đầu tiên'), n: pf.nhan_tin || 0, phu: pf.gio_tin_dau_trung_vi != null ? `${t('trung vị')} ${so(pf.gio_tin_dau_trung_vi)} ${t('giờ sau khi đăng ký')}` : '' },
      { ten: t('Có trò chuyện hai chiều'), n: pf.hai_chieu || 0 },
    ]);
    const tc = o2.pheu_tro_chuyen || {};
    const pheuTc = pheu([
      { ten: t('Cuộc 1-1 mới'), n: tc.tao || 0 }, { ten: t('Có tin nhắn'), n: tc.co_tin || 0 },
      { ten: t('Cả hai cùng nhắn'), n: tc.hai_chieu || 0 }, { ten: t('Từ 10 tin trở lên'), n: tc.sau_10 || 0 },
    ]);
    const loiMoi = tc.loi_moi ? `${t('Lời mời trò chuyện (người lạ):')} ${so(tc.loi_moi)}, ${t('được nhận')} ${so(tc.loi_moi_nhan || 0)} (${so(pct1(tc.loi_moi_nhan || 0, tc.loi_moi))}%).` : '';
    // 4. tính năng
    const tn = Object.entries(o2.tinh_nang || {}).map(([k, n]) => ({ ten: t(TEN_TINH_NANG[k] || k), n })).sort((a, b) => b.n - a.n);
    // 5. phân bố
    const pb = o2.phan_bo_tin || {};
    const phanBo = cho((W) => cotDoc([pb['0'], pb['1'], pb['2_5'], pb['6_20'], pb['21_50'], pb['51']].map((x) => x || 0), ['0', '1', '2–5', '6–20', '21–50', '51+'], { ten: t('Người hoạt động'), buocNhan: 1, cao: 170, W }));
    // 6. phân khúc
    const seg = (ds, nhanCot) => `<div class="scrollx"><table class="tbl"><thead><tr><th>${esc(nhanCot)}</th><th class="num">${t('Tài khoản')}</th><th class="num">${t('Hoạt động')}</th><th>${t('% hoạt động')}</th><th class="num">${t('Tin / người hoạt động')}</th></tr></thead><tbody>
      ${ds.map((x) => x.it ? `<tr><td>${esc(x.k === '?' ? t('Chưa khai') : x.k)}</td><td colspan="4" class="hint">${t('dưới')} ${so(o2.k_an_danh)} ${t('người — ẩn để không lộ ai')}</td></tr>`
        : `<tr><td>${esc(x.k === '?' ? t('Chưa khai') : x.k)}</td><td class="num">${so(x.n)}</td><td class="num">${so(x.hd)}</td><td><span class="rate"><i><b style="width:${pct1(x.hd, x.n) || 0}%"></b></i><span>${so(pct1(x.hd, x.n) || 0)}%</span></span></td><td class="num">${x.hd ? so(Math.round((x.tin / x.hd) * 10) / 10) : '—'}</td></tr>`).join('')}</tbody></table></div>`;
    // 7–9. nội dung, an toàn, nhóm
    const nd = o2.noi_dung || {}; const at = o2.an_toan || {}; const nh = o2.nhom || {};
    const lyDo = Object.entries(at.ly_do || {}).map(([k, n]) => ({ ten: t(TEN_LY_DO[k] || k), n })).sort((a, b) => b.n - a.n);
    const muc = { public: t('Công khai'), connections: t('Bạn bè'), friends: t('Bạn thân'), followers: t('Người theo dõi'), private: t('Chỉ mình tôi') };

    // nhận xét
    const cau = [];
    if ((pf.dang_ky || 0) >= 10) {
      const p1 = pct1(pf.nhan_tin || 0, pf.dang_ky);
      cau.push({ m: p1 >= 50 ? 'tot' : 'xau', text: `<b>${so(p1)}%</b> ${t('người đăng ký trong kỳ đã gửi ít nhất một tin')}${pf.gio_tin_dau_trung_vi != null ? `, ${t('trung vị')} ${so(pf.gio_tin_dau_trung_vi)} ${t('giờ sau khi đăng ký')}` : ''}. ${p1 < 50 ? t('Phần lớn người mới chưa bắt chuyện — xem lại gợi ý người để nhắn ở màn đầu.') : ''}` });
    }
    if ((tc.co_tin || 0) >= 10) {
      const p2 = pct1(tc.hai_chieu || 0, tc.co_tin);
      cau.push({ m: p2 >= 50 ? 'tot' : 'xau', text: `${t('Trong các cuộc 1-1 có tin nhắn,')} <b>${so(p2)}%</b> ${t('được trả lời (cả hai cùng nhắn).')}` });
    }
    const top = tn.filter((x) => x.n > 0); const it = tn.filter((x) => hd && x.n / hd < 0.05 && x.n >= 0);
    if (hd >= 10 && top.length > 1) cau.push({ m: 'info', text: `${t('Tính năng được dùng nhiều nhất ngoài nhắn tin:')} <b>${esc(top.find((x) => x.ten !== t('Gửi tin nhắn'))?.ten || '')}</b>. ${it.length ? `${t('Ít hơn 5% người hoạt động dùng:')} ${esc(it.slice(0, 4).map((x) => x.ten).join(', '))}.` : ''}` });
    const daySau = coh.filter((r) => r.n >= 10 && r.o[1] && r.o[1].n != null);
    if (daySau.length >= 2) {
      const a = daySau[daySau.length - 1], b = daySau[daySau.length - 2];
      const pa = pct1(a.o[1].n, a.n), pb2 = pct1(b.o[1].n, b.n);
      cau.push({ m: pa >= pb2 ? 'tot' : 'xau', text: `${t('Quay lại ở tuần thứ 1: nhóm tuần')} ${esc(C.fmtNgay(a.tuan))} <b>${so(pa)}%</b> ${t('so với nhóm tuần trước đó')} ${so(pb2)}%.` });
    }
    if ((at.bao_cao || 0) >= 3 && lyDo[0]) cau.push({ m: 'info', text: `${t('Lý do báo cáo nhiều nhất:')} <b>${esc(lyDo[0].ten)}</b> (${so(lyDo[0].n)}/${so(at.bao_cao)}).${at.gio_xu_ly_trung_vi != null ? ` ${t('Thời gian xử lý trung vị')} ${so(at.gio_xu_ly_trung_vi)} ${t('giờ')}.` : ''}` });
    if (hd < MAU_KHONG_DU) cau.push({ m: 'info', text: t('Mẫu còn nhỏ (dưới 30 người hoạt động): các tỉ lệ dao động mạnh giữa các kỳ — đọc xu hướng, đừng đọc từng con số.') });

    main.innerHTML = `<div class="stack" style="padding-top:14px">
      ${dauTrang(t('Chuyên sâu'), `${t('Tìm nguyên nhân: giữ chân theo nhóm đăng ký, phễu, tính năng, phân khúc.')} ${so(hd)} ${t('người hoạt động trong')} ${o2.ngay} ${t('ngày.')} ${t('Phân khúc dưới')} ${so(o2.k_an_danh)} ${t('người được ẩn.')}`, [7, 30, 90], o2.ngay)}
      ${nhanXet(cau)}
      ${the(t('Giữ chân theo nhóm đăng ký'), t('8 tuần gần nhất, theo tuần (thứ Hai, UTC)'), cohort)}
      <div class="pt-grid2">
        ${the(t('Phễu người mới'), `${t('người đăng ký trong kỳ')}${pf.du_7n ? ` · ${t('quay lại trong 7 ngày:')} ${so(pf.quay_7n)}/${so(pf.du_7n)} (${so(pct1(pf.quay_7n, pf.du_7n))}%)` : ''}`, pheuDk)}
        ${the(t('Phễu trò chuyện 1-1'), loiMoi || t('cuộc trò chuyện 1-1 bắt đầu trong kỳ'), pheuTc)}
      </div>
      <div class="pt-grid2">
        ${the(t('Người hoạt động dùng tính năng nào'), t('% trên người hoạt động trong kỳ'), hd ? thanh(tn, { tong: hd, rong: 170 }) : `<div class="hint">${t('Chưa có người hoạt động trong kỳ.')}</div>`)}
        ${the(t('Mức độ nhắn tin'), `${t('số tin mỗi người hoạt động gửi trong kỳ')}${pb.trung_vi != null ? ` · ${t('trung vị (người có gửi)')} ${so(pb.trung_vi)}` : ''}`, phanBo)}
      </div>
      <div class="pt-grid2">
        ${the(t('Theo độ tuổi'), t('tuổi tính từ ngày sinh trong hồ sơ'), seg(o2.tuoi || [], t('Tuổi')))}
        ${the(t('Theo nước'), t('10 nước nhiều tài khoản nhất'), seg(o2.nuoc || [], t('Nước')))}
      </div>
      <div class="pt-grid2">
        ${the(t('Nội dung'), `${so(nd.bai || 0)} ${t('bài trong kỳ')}`, `<div class="tiles pt-tiles sm">${o(t('Đã duyệt'), so(nd.duyet), '', '')}${o(t('Bị từ chối'), so(nd.tu_choi), '', nd.bai ? `${so(pct1(nd.tu_choi, nd.bai))}%` : '')}${o(t('Thích / bài'), nd.thich_tb == null ? '—' : so(nd.thich_tb), '', '')}${o(t('Bình luận / bài'), nd.binh_luan_tb == null ? '—' : so(nd.binh_luan_tb), '', nd.duyet ? `${so(pct1(nd.co_binh_luan, nd.duyet))}% ${t('bài có bình luận')}` : '')}</div>`
          + thanh(Object.entries(nd.muc || {}).map(([k, n]) => ({ ten: muc[k] || k, n })), { tong: nd.bai }))}
        ${the(t('An toàn'), `${so(at.bao_cao || 0)} ${t('báo cáo')} · ${so(at.chan || 0)} ${t('lượt chặn')}`, `<div class="tiles pt-tiles sm">${o(t('Đã xử lý'), so(at.da_xu_ly), '', at.bao_cao ? `${so(pct1(at.da_xu_ly, at.bao_cao))}%` : '')}${o(t('Xử lý trung vị'), at.gio_xu_ly_trung_vi == null ? '—' : `${so(at.gio_xu_ly_trung_vi)} ${t('giờ')}`, '', `${t('mốc')} < 24 ${t('giờ')}`)}${o(t('Người hoạt động bị báo cáo'), hd ? hienPct(pct1(at.nguoi_bi_bao_cao, hd)) : '—', '', `${so(at.nguoi_bi_bao_cao || 0)} ${t('người')}`)}${o(t('Chặn / 100 người hoạt động'), hd ? so(Math.round((at.chan || 0) * 1000 / hd) / 10) : '—', '', '')}</div>`
          + (lyDo.length ? thanh(lyDo, { tong: at.bao_cao }) : `<div class="hint">${t('Không có báo cáo nào trong kỳ.')}</div>`))}
      </div>
      ${the(t('Nhóm'), '', `<div class="tiles pt-tiles sm">${o(t('Tổng số nhóm'), so(nh.tong), '', `${so(nh.cong_khai || 0)} ${t('công khai')}`)}${o(t('Nhóm mới trong kỳ'), so(nh.moi), '', '')}${o(t('Nhóm có tin nhắn trong kỳ'), so(nh.hoat_dong), '', nh.tong ? `${so(pct1(nh.hoat_dong, nh.tong))}%` : '')}${o(t('Thành viên / nhóm'), nh.thanh_vien_tb == null ? '—' : so(nh.thanh_vien_tb), '', t('trung bình'))}${nh.vao_qua_link != null ? o(t('Vào nhóm qua link mời'), so(nh.vao_qua_link), '', t('trong kỳ')) : ''}</div>`)}
    </div>`;
    veBieuDo(main);
  }


  // ================================================================ D. STORIES (086)
  const TEN_MAU_STORY = {
    editorial_cover: 'Bìa tạp chí', kinetic_portrait: 'Chân dung chuyển động', soft_cinema: 'Điện ảnh dịu', living_grid: 'Lưới sống động',
    digital_scrapbook: 'Sổ dán ảnh', floating_memories: 'Kỷ niệm bay bổng', bold_typography: 'Chữ đậm', minimal_journal: 'Nhật ký tối giản',
    mood_capsule: 'Mood Capsule', neon_accent: 'Điểm neon', photo_diary: 'Nhật ký ảnh', interactive_question: 'Câu hỏi tương tác', '(trong)': 'Tự làm (không mẫu)',
  };
  const TEN_LOP = { photo: 'Ảnh', text: 'Chữ', shape: 'Hình', sticker: 'Nhãn dán', draw: 'Nét vẽ', poll: 'Bình chọn' };
  const TEN_Y_DINH = { just_sharing: 'Chỉ chia sẻ', open_to_chat: 'Sẵn sàng trò chuyện', looking_for_friends: 'Tìm bạn mới', coffee_today: 'Cà phê hôm nay?', feeling_creative: 'Đang sáng tạo', exploring_city: 'Khám phá thành phố', '(khong)': 'Không chọn' };
  const TEN_DT = { public: 'Công khai', connections: 'Bạn bè', followers: 'Người theo dõi', friends: 'Bạn thân' };
  const TEN_CX = { heart: '❤️', fire: '🔥', smile: '😊', wave: '👋', laugh: '😂' };
  const TEN_LY_DO_STORY = { fake: 'Giả mạo', harassment: 'Quấy rối', underage: 'Dưới 18 tuổi', scam: 'Lừa đảo', inappropriate: 'Nội dung phản cảm', other: 'Khác',
    hate: 'Thù ghét / phân biệt', violence: 'Đe doạ / bạo lực', spam: 'Spam / lừa đảo', impersonation: 'Mạo danh', privacy: 'Xâm phạm riêng tư',
    ncii: 'Ảnh thân mật không đồng ý', sexual: 'Tình dục bị cấm', ip: 'Bản quyền' };
  function stories(main, o2, ctx) {
    C = ctx;
    const n = o2.kpi?.nay || {}; const tr = o2.kpi?.truoc || {};
    const nd = o2.noi_dung || {}; const ar = o2.archive || {}; const mo = o2.moments; const at = o2.an_toan || {}; const kho = o2.kho || {};
    const co = o2.co?.co || {}; const thu = o2.co?.nguoi_thu || 0;
    const ngay = o2.theo_ngay || [];
    const trang = n.trang || 0;
    const ds = (obj, ten) => Object.entries(obj || {}).map(([k, v]) => ({ ten: t(ten[k] || k), n: v })).sort((a, b) => b.n - a.n);
    const canhBao = !co.enabled
      ? `<div class="alertbar warn"><div><b>${t('Stories đang TẮT với mọi người')}</b><br>${thu ? `${so(thu)} ${t('người thử (story_rollout) vẫn dùng được — số liệu dưới đây chỉ là nhóm thử.')}` : t('Chưa ai dùng được. Bật bằng cờ story_flags khi sẵn sàng (xem docs/STORIES_V1_RELEASE.md).')}</div></div>` : '';
    const cau = [];
    if ((n.nguoi_xem || 0) >= 10) {
      const p = pct1(n.tra_loi || 0, n.nguoi_xem);
      cau.push({ m: 'info', text: `${t('Trả lời qua chat:')} <b>${so(n.tra_loi || 0)}</b> ${t('tin từ')} ${so(n.nguoi_xem)} ${t('người xem')} (${so(p)}%).` });
    }
    if ((ar.nguoi_da_doc_giai_thich || 0) >= 10) {
      const p = pct1(ar.nguoi_tat_luu || 0, ar.nguoi_da_doc_giai_thich);
      cau.push({ m: p > 30 ? 'xau' : 'info', text: `<b>${so(p)}%</b> ${t('người đã đọc lời giải thích chọn TẮT lưu Archive.')} ${p > 30 ? t('Nhiều người không muốn lưu — xem lại cách giải thích.') : ''}` });
    }
    if ((n.lan_dang || 0) >= 10 && nd.mau?.length) cau.push({ m: 'info', text: `${t('Mẫu được dùng nhiều nhất:')} <b>${esc(t(TEN_MAU_STORY[nd.mau[0].ten] || nd.mau[0].ten))}</b> (${so(nd.mau[0].n)}/${so(trang)} ${t('trang')}).` });
    if ((at.bao_cao || 0) > 0) cau.push({ m: at.bao_cao_mo ? 'xau' : 'info', text: `${so(at.bao_cao)} ${t('báo cáo story / Moment trong kỳ,')} ${so(at.bao_cao_mo || 0)} ${t('đang chờ xử lý.')}` });
    if ((n.nguoi_dang || 0) < MAU_KHONG_DU) cau.push({ m: 'info', text: t('Mẫu còn nhỏ (dưới 30 người đăng): đọc xu hướng, đừng đọc từng con số.') });
    main.innerHTML = `<div class="stack" style="padding-top:14px">
      ${dauTrang(t('Stories'), `${t('Tổng hợp từ chính dữ liệu Stories — app không gửi thêm sự kiện nào. Không có tên, nội dung hay tệp nào rời máy chủ.')} ${t('Kỳ')} ${o2.ngay} ${t('ngày, so với')} ${o2.ngay} ${t('ngày trước đó.')}`, [7, 30, 90], o2.ngay)}
      ${canhBao}
      ${nhanXet(cau)}
      <div class="tiles pt-tiles">
        ${o(t('Lần đăng'), so(n.lan_dang || 0), bienDong(n.lan_dang, tr.lan_dang, 'len'), `${so(trang)} ${t('trang')}`)}
        ${o(t('Người đăng'), so(n.nguoi_dang || 0), bienDong(n.nguoi_dang, tr.nguoi_dang, 'len'), '', (n.nguoi_dang || 0) < MAU_KHONG_DU)}
        ${o(t('Lượt xem'), so(n.luot_xem || 0), bienDong(n.luot_xem, tr.luot_xem, 'len'), `${so(n.nguoi_xem || 0)} ${t('người xem')}`)}
        ${o(t('Cảm xúc'), so(n.cam_xuc || 0), bienDong(n.cam_xuc, tr.cam_xuc, 'len'), '')}
        ${o(t('Trả lời qua chat'), so(n.tra_loi || 0), bienDong(n.tra_loi, tr.tra_loi, 'len'), `${so(n.the_tra_loi || 0)} ${t('kèm thẻ')}`)}
        ${o(t('Phiếu bình chọn'), so(n.phieu_bau || 0), bienDong(n.phieu_bau, tr.phieu_bau, 'len'), '')}
        ${o(t('Kết thúc sớm'), so(n.ket_thuc_som || 0), bienDong(n.ket_thuc_som, tr.ket_thuc_som), n.lan_dang ? `${so(pct1(n.ket_thuc_som || 0, n.lan_dang))}%` : '')}
      </div>
      <div class="pt-grid2">
        ${the(t('Lần đăng mỗi ngày'), t('ngày UTC'), cho((W) => cotDoc(ngay.map((x) => x.lan_dang), ngay.map((x) => ngayNgan(x.ngay)), { ten: t('Lần đăng'), W })))}
        ${the(t('Lượt xem mỗi ngày'), t('ngày UTC · cột riêng vì khác thang đo'), cho((W) => cotDoc(ngay.map((x) => x.luot_xem), ngay.map((x) => ngayNgan(x.ngay)), { ten: t('Lượt xem'), mau: 'var(--accent, #B8651C)', W })))}
      </div>
      <div class="pt-grid2">
        ${the(t('Mẫu được dùng'), `${so(trang)} ${t('trang trong kỳ')}`, (nd.mau || []).length ? thanh((nd.mau || []).map((x) => ({ ten: t(TEN_MAU_STORY[x.ten] || x.ten), n: x.n })), { tong: trang, rong: 170 }) : `<div class="hint">${t('Chưa có story nào trong kỳ.')}</div>`)}
        ${the(t('Hiệu ứng'), t('số lớp dùng mỗi hiệu ứng'), (nd.hieu_ung || []).length ? thanh((nd.hieu_ung || []).map((x) => ({ ten: x.ten, n: x.n })), { rong: 120 }) : `<div class="hint">${t('Chưa có.')}</div>`)}
      </div>
      <div class="pt-grid2">
        ${the(t('Story gồm những gì'), `${t('lớp / trang trung bình:')} ${nd.tb_lop == null ? '—' : so(nd.tb_lop)} · ${t('trang / lần đăng:')} ${nd.tb_trang_moi_lan == null ? '—' : so(nd.tb_trang_moi_lan)}`,
          `<div class="tiles pt-tiles sm">${o(t('Có ảnh'), trang ? hienPct(pct1(nd.co_anh || 0, trang)) : '—', '', `${so(nd.co_anh || 0)} ${t('trang')}`)}${o(t('Chỉ chữ / đồ hoạ'), trang ? hienPct(pct1(nd.chi_chu || 0, trang)) : '—', '', '')}${o(t('Có bình chọn'), trang ? hienPct(pct1(nd.co_binh_chon || 0, trang)) : '—', '', '')}</div>` + thanh(ds(nd.loai_lop, TEN_LOP), { rong: 110 }))}
        ${the(t('Ý định & người xem'), t('theo trang'), thanh(ds(nd.y_dinh, TEN_Y_DINH), { tong: trang, rong: 170 }) + thanh(ds(nd.doi_tuong, TEN_DT), { tong: trang, rong: 170, mau: 'var(--accent, #B8651C)' }))}
      </div>
      <div class="pt-grid2">
        ${the(t('Archive riêng'), t('trạng thái hiện tại (không theo kỳ)'), `<div class="tiles pt-tiles sm">${o(t('Trang đang lưu'), so(ar.trang_luu || 0), '', `${so(ar.nguoi_co_archive || 0)} ${t('người')}`)}${o(t('Người tắt lưu'), so(ar.nguoi_tat_luu || 0), '', ar.nguoi_da_doc_giai_thich ? `${so(pct1(ar.nguoi_tat_luu || 0, ar.nguoi_da_doc_giai_thich))}% ${t('người đã đọc giải thích')}` : '')}${o(t('Yêu thích'), so(ar.yeu_thich || 0), '', '')}${o(t('Đang hiện, không lưu'), so(ar.trang_khong_luu_con_hien || 0), '', t('sẽ mất sau 24 giờ'))}</div>`)}
        ${mo ? the(t('Moments'), '', `<div class="tiles pt-tiles sm">${o(t('Moments'), so(mo.moment || 0), '', `${so(mo.nguoi_co_moment || 0)} ${t('người')}`)}${o(t('Story trong Moments'), so(mo.muc || 0), '', `${so(mo.muc_mo_rong || 0)} ${t('đã mở rộng người xem (có xác nhận)')}`)}${o(t('Tạo trong kỳ'), so(mo.tao_trong_ky || 0), '', '')}</div>` + thanh(ds(mo.doi_tuong, TEN_DT), { rong: 140 }))
          : the(t('Moments'), '', `<div class="hint">${t('Máy chủ chưa có 085 (Moments).')}</div>`)}
      </div>
      <div class="pt-grid2">
        ${the(t('An toàn'), `${so(at.bao_cao || 0)} ${t('báo cáo story / Moment trong kỳ')}`, `<div class="tiles pt-tiles sm">${o(t('Đang chờ xử lý'), so(at.bao_cao_mo || 0), '', '')}${o(t('Trang bị gỡ'), so(at.trang_bi_go || 0), '', t('tổng'))}</div>` + (Object.keys(at.ly_do || {}).length ? thanh(ds(at.ly_do, TEN_LY_DO_STORY), { tong: at.bao_cao, rong: 150 }) : ''))}
        ${the(t('Kho tệp story'), t('ảnh 1080 px + bản nhỏ _t trong Storage — để ước chi phí'), `<div class="tiles pt-tiles sm">${o(t('Tệp'), so(kho.tep || 0), '', '')}${o(t('Dung lượng'), `${so(Math.round((kho.byte || 0) / 1048576 * 10) / 10)} MB`, '', '')}${o(t('Chờ dọn'), so(kho.cho_don || 0), '', '')}${o(t('Trang đang hiện'), so(kho.trang_dang_hien || 0), '', '')}</div>`)}
      </div>
      ${the(t('Cảm xúc'), t('theo loại, trong kỳ'), thanh(Object.entries(nd.cam_xuc || {}).map(([k, v]) => ({ ten: TEN_CX[k] || k, n: v })).sort((a, b) => b.n - a.n), { tong: n.cam_xuc, rong: 60 }))}
    </div>`;
    veBieuDo(main);
  }

  // ================================================================ E. NGƯỜI THẬT (088)
  /** Real-user business metrics: registered internal / test accounts and every interaction with them are left out. */
  function nguoiThat(main, o2, ctx, uv) {
    C = ctx;
    const tk = o2.tai_khoan || {}; const hd = o2.hoat_dong || {}; const moi = o2.moi || {}; const gc = o2.giu_chan || {};
    const lx = o2.luot_ghe || {}; const tc = o2.tro_chuyen || {}; const pl = o2.plus || {};
    const goiY = (uv && Array.isArray(uv.ung_vien)) ? uv.ung_vien.filter((x) => x.goi_y && !x.da_ghi).length : null;
    const cau = [];
    if (tk.chua_phan_loai) cau.push({ m: 'xau', text: `${t('Chưa đăng ký tài khoản nội bộ nào: các số dưới đây VẪN tính tài khoản thử và nhân viên.')} ${goiY ? `${so(goiY)} ${t('tài khoản được gợi ý (≥ 2 dấu hiệu độc lập) — đăng ký bằng docs/monetization/gate-088/GHI-TAI-KHOAN-NOI-BO.sql.')}` : ''}` });
    else if (goiY) cau.push({ m: 'info', text: `${so(goiY)} ${t('tài khoản khác được gợi ý là nội bộ nhưng chưa đăng ký.')}` });
    if ((hd.mau || 0) < MAU_KHONG_DU) cau.push({ m: 'info', text: t('Mẫu còn nhỏ (dưới 30 người hoạt động): đọc xu hướng, đừng đọc từng tỉ lệ.') });
    if ((lx.lien_quan_noi_bo_45_ngay || 0) > 0) cau.push({ m: 'info', text: `${so(lx.lien_quan_noi_bo_45_ngay)} ${t('lượt ghé trong 45 ngày có dính tài khoản nội bộ — không tính là nhu cầu thật.')}` });
    const tl = (a, b) => (b ? hienPct(pct1(a || 0, b)) : '—');
    main.innerHTML = `<div class="stack" style="padding-top:14px">
      ${dauTrang(t('Người thật'), `${t('Chỉ người dùng thật: bỏ tài khoản nội bộ / thử đã đăng ký và mọi tương tác với họ. Bảng Chiến lược / Vận hành / Chuyên sâu vẫn tính tất cả để gỡ lỗi.')} ${t('Kỳ')} ${o2.ky_ngay} ${t('ngày')} · ${t('dữ liệu hoạt động từ')} ${esc(o2.do_tu || '—')}.`, [7, 30, 90], o2.ky_ngay)}
      ${nhanXet(cau)}
      <div class="tiles pt-tiles">
        ${o(t('MAU (30 ngày)'), so(hd.mau || 0), '', `${t('thô kể cả nội bộ:')} ${so(hd.mau_tho_ke_ca_noi_bo || 0)}`, (hd.mau || 0) < MAU_KHONG_DU)}
        ${o(t('WAU (7 ngày)'), so(hd.wau || 0), '', '')}
        ${o(t('DAU (hôm nay, UTC)'), so(hd.dau || 0), '', '')}
        ${o(t('Tài khoản thật'), so(tk.that || 0), '', `${so(tk.noi_bo || 0)} ${t('nội bộ / thử')} · ${so(tk.tong || 0)} ${t('tổng')}`)}
        ${o(t('Người trả phí (cửa hàng)'), pl.tra_phi_cua_hang_that == null ? '—' : so(pl.tra_phi_cua_hang_that), '', pl.ty_le_tra_phi_mau == null ? t('chưa có 063') : `${hienPct(Math.round(pl.ty_le_tra_phi_mau * 1000) / 10)} ${t('của MAU')}`)}
      </div>
      <div class="pt-grid2">
        ${the(t('Mới và kích hoạt'), t('kích hoạt = trong 7 ngày đầu đã nhắn tin, theo dõi hoặc ghé một người thật khác'),
          `<div class="tiles pt-tiles sm">${o(t('Đăng ký trong kỳ'), so(moi.dang_ky || 0), '', '')}${o(t('Đã kích hoạt'), so(moi.kich_hoat_7_ngay || 0), '', tl(moi.kich_hoat_7_ngay, moi.dang_ky))}</div>`)}
        ${the(t('Quay lại'), t('D7 = hoạt động ngày 7–13 sau đăng ký; D30 = ngày 30–36; chỉ nhóm đã đủ ngày'),
          `<div class="tiles pt-tiles sm">${o('D7', tl(gc.d7?.quay_lai, gc.d7?.co_so), '', `${so(gc.d7?.quay_lai || 0)} / ${so(gc.d7?.co_so || 0)}`, (gc.d7?.co_so || 0) < MAU_KHONG_DU)}${o('D30', tl(gc.d30?.quay_lai, gc.d30?.co_so), '', `${so(gc.d30?.quay_lai || 0)} / ${so(gc.d30?.co_so || 0)}`, (gc.d30?.co_so || 0) < MAU_KHONG_DU)}</div>`)}
      </div>
      <div class="pt-grid2">
        ${the(t('Mật độ lượt ghé'), t('chỉ người thật ghé người thật'),
          `<div class="tiles pt-tiles sm">${o(t('Lượt ghé 7 ngày'), so(lx.that_7_ngay || 0), '', lx.moi_nguoi_wau == null ? '' : `${so(lx.moi_nguoi_wau)} ${t('mỗi người hoạt động')}`)}${o(t('Dính nội bộ (45 ngày)'), so(lx.lien_quan_noi_bo_45_ngay || 0), '', t('đã loại'))}</div>`)}
        ${the(t('Trò chuyện hai chiều'), t('cả hai người thật cùng gửi ít nhất một tin trong kỳ'),
          `<div class="tiles pt-tiles sm">${o(t('Cuộc hai chiều'), so(tc.hai_chieu || 0), '', `${so(tc.nguoi_co_hai_chieu || 0)} ${t('người')}`)}${o(t('Tỉ lệ MAU'), tc.ty_le_mau == null ? '—' : hienPct(Math.round(tc.ty_le_mau * 1000) / 10), '', '')}${o(t('Tin nhắn thật'), so(tc.tin_nhan_that || 0), '', `${so(tc.tin_nhan_lien_quan_noi_bo || 0)} ${t('dính nội bộ (đã loại)')}`)}</div>`)}
      </div>
    </div>`;
    veBieuDo(main);
  }

  // ================================================================ F. SỰ KIỆN & TIN THOẠI (151)
  /** admin_pt_su_kien: sự kiện (133–141), nhóm chat sự kiện, tin thoại (137), nhóm ẩn danh sách thành viên (142). */
  const TEN_LOAI_SK = { pride: 'Pride', tiec: 'Tiệc', the_thao: 'Thể thao', hoi_thao: 'Hội thảo', tinh_nguyen: 'Tình nguyện', ca_phe: 'Cà phê', khac: 'Khác' };
  function suKien(main, o2, ctx) {
    C = ctx;
    const sk = o2.su_kien || {}; const tt = o2.tin_thoai || {};
    const ngay = o2.ngay || 30;
    const sod = (v) => (v == null ? '—' : so(v));
    const thoiLuong = (s) => {
      if (s == null) return '—';
      const n = Number(s) || 0;
      return n >= 3600 ? `${so(Math.round(n / 360) / 10)} ${C.lang() === 'en' ? 'h' : 'giờ'}` : n >= 60 ? `${so(Math.round(n / 6) / 10)} ${t('phút')}` : `${so(n)} ${t('giây')}`;
    };
    const loai = Object.entries(sk.theo_loai || {}).map(([k, v]) => ({ ten: t(TEN_LOAI_SK[k] || k), n: Number(v) || 0 })).sort((a, b) => b.n - a.n);
    const nuoc = (sk.theo_nuoc || []).map((x) => ({ ten: `${C.tenNuoc ? C.tenNuoc(x.quoc_gia) : x.quoc_gia} (${x.quoc_gia})`, n: Number(x.n) || 0 }));
    main.innerHTML = `<div class="stack" style="padding-top:14px">
      ${dauTrang(t('Sự kiện & tin thoại'), `${t('Tổng hợp từ máy chủ — không có tên hay nội dung nào.')} ${t('Kỳ')} ${so(ngay)} ${t('ngày')}.`, [7, 30, 90], ngay)}
      ${the(t('Sự kiện tạo trong kỳ'), '', `<div class="tiles pt-tiles">
        ${o(t('Tạo mới'), sod(sk.tao), '', `${sod(sk.tai_cho)} ${t('tại chỗ')} · ${sod(sk.truc_tuyen)} ${t('trực tuyến')}`)}
        ${o(t('Đã huỷ'), sod(sk.huy), '', '')}
        ${o(t('Số người tổ chức'), sod(sk.nguoi_to_chuc), '', '')}
        ${o(t('Lần sửa'), sod(sk.sua), '', sk.sua == null ? t('máy chủ chưa có 140') : '')}
        ${o(t('Đăng ký "Sẽ đi"'), sod(sk.dang_ky_di), '', `${sod(sk.dang_ky_co_the)} ${t('"Có thể đi"')}`)}
        ${o(t('Báo cáo'), sod(sk.bao_cao), '', t('đang mở + đã xử lý'))}
      </div>`)}
      <div class="pt-grid2">
        ${the(t('Lúc này'), t('con số hiện tại, không theo kỳ'), `<div class="tiles pt-tiles sm">
          ${o(t('Chờ duyệt'), sod(sk.cho_duyet), '', '')}${o(t('Bị ẩn'), sod(sk.bi_an), '', '')}${o(t('Sắp diễn ra'), sod(sk.sap_toi), '', '')}</div>
          <div class="row" style="margin-top:8px"><a class="btn sm" href="#noidung/sukien">${t('Mở danh sách sự kiện')} →</a></div>`)}
        ${the(t('Nhóm chat của sự kiện'), t('sự kiện tạo trong kỳ'), `<div class="tiles pt-tiles sm">
          ${o(t('Có nhóm chat'), sod(sk.co_nhom_chat), '', '')}${o(t('Mở cho mọi người chat'), sod(sk.nhom_mo_cho_moi_nguoi), '', t('còn lại là kênh thông báo'))}${o(t('Vào nhóm qua nút sự kiện'), sod(sk.vao_nhom_qua_su_kien), '', '')}</div>`)}
      </div>
      <div class="pt-grid2">
        ${the(t('Loại sự kiện'), t('tạo trong kỳ'), loai.length ? thanh(loai, { tong: sk.tao, rong: 130 }) : `<div class="hint">${t('Chưa có sự kiện nào trong kỳ.')}</div>`)}
        ${the(t('Nước có nhiều sự kiện nhất'), t('10 nước đầu, tạo trong kỳ'), nuoc.length ? thanh(nuoc, { tong: sk.tao, rong: 170 }) : `<div class="hint">${t('Chưa có sự kiện nào trong kỳ.')}</div>`)}
      </div>
      ${the(t('Tin thoại'), t('gửi trong kỳ'), `<div class="tiles pt-tiles">
        ${o(t('Tin thoại'), sod(tt.so_tin), '', `${sod(tt.trong_nhom)} ${t('trong nhóm')}`)}
        ${o(t('Số người gửi'), sod(tt.nguoi_gui), '', '')}
        ${o(t('Tổng thời lượng'), thoiLuong(tt.tong_giay), '', '')}
        ${o(t('Trung bình mỗi tin'), tt.tb_giay == null ? '—' : `${so(tt.tb_giay)} ${t('giây')}`, '', '')}
        ${o(t('Bị báo cáo'), sod(tt.bao_cao), '', t('báo cáo tin nhắn có tin thoại'))}
      </div>`)}
      ${the(t('Nhóm ẩn danh sách thành viên'), t('con số hiện tại, không theo kỳ'), `<div class="tiles pt-tiles sm">${o(t('Số nhóm'), sod(o2.nhom_an_danh_sach), '', o2.nhom_an_danh_sach == null ? t('máy chủ chưa có 142') : '')}</div>`)}
    </div>`;
    veBieuDo(main);
  }

  // ---------------------------------------------------------------- CHÂN DUNG NGƯỜI DÙNG (167)
  // Máy chủ (admin_pt_chan_dung) trả số TỔNG HỢP theo từng chiều: [{k, n}] hoặc {k, it: true} khi nhóm dưới 5 người (không kèm số).
  // Tệp này chỉ vẽ + nối bộ lọc; không có con số nào được gõ sẵn ở đây — không có dữ liệu thì hiện "chưa có", không bịa.
  const cdO = o;                                   // ô số liệu dùng chung (trong chanDung, `o` là dữ liệu)
  const CD_MAU = ['var(--pt-s1)', 'var(--pt-s2)', 'var(--pt-s3)', 'var(--pt-sneg)'];
  const CD_THU_TU = {
    tuoi: ['18-24', '25-34', '35-44', '45-54', '55+', '?'],
    chieu_cao: ['<165', '165-169', '170-174', '175-179', '180-184', '185+', '?'],
    hoat_dong: ['24h', '7d', '30d', 'ngu'],
    plus: ['co', 'khong'], xac_minh: ['co', 'khong'],
  };
  const CD_GIA_TRI = {   // thứ tự các ô chọn trong bộ lọc (đúng các giá trị hồ sơ nhận — 002)
    tuoi: ['18-24', '25-34', '35-44', '45-54', '55+'],
    vai_tro: ['top', 'vers_top', 'vers', 'vers_bottom', 'bottom', 'side', 'ask', '?'],
    dang_nguoi: ['slim', 'average', 'athletic', 'muscular', 'chubby', 'large', '?'],
    tinh_trang: ['single', 'dating', 'partnered', 'married', 'open', 'complicated', '?'],
    dang_tim: ['chat', 'friends', 'dates', 'relationship', 'now', 'networking'],
  };
  const CD_LOC_MANG = ['quoc_gia', 'tuoi', 'vai_tro', 'dang_nguoi', 'tinh_trang', 'dang_tim', 'ngon_ngu'];
  const CD_LOC_DON = ['hoat_dong', 'dang_ky', 'plus', 'xac_minh'];
  const CD_CHEO = ['quoc_gia', 'tuoi', 'vai_tro', 'dang_nguoi', 'tinh_trang', 'plus', 'xac_minh', 'hoat_dong'];

  const cdTenChieu = (c) => ({
    quoc_gia: t('Quốc gia'), tuoi: t('Nhóm tuổi'), vai_tro: t('Vai trò'), dang_nguoi: t('Dáng người'), tinh_trang: t('Tình trạng quan hệ'),
    dang_tim: t('Đang tìm'), ngon_ngu: t('Ngôn ngữ nói được'), ngon_ngu_app: t('Ngôn ngữ nhận thông báo'), chieu_cao: t('Chiều cao'), mbti: 'MBTI',
    plus: 'HIMO Plus', xac_minh: t('Xác minh'), hoat_dong: t('Mức hoạt động'), thang_dang_ky: t('Tháng đăng ký'),
  }[c] || c);
  function cdTenNgonNgu(k) {
    try {
      const s = new Intl.DisplayNames([C.locale()], { type: 'language' }).of(k);
      return s && s !== k ? s.charAt(0).toUpperCase() + s.slice(1) : k;
    } catch (e) { return k; }
  }
  function cdNhan(chieu, k) {
    if (k === '?') return chieu === 'quoc_gia' ? t('Chưa rõ nước') : chieu === 'tuoi' ? t('Chưa có ngày sinh') : chieu === 'ngon_ngu_app' ? t('Chưa bật thông báo') : t('Chưa điền');
    switch (chieu) {
      case 'quoc_gia': return C.tenNuoc(k) || k;
      case 'tuoi': return k.replace('-', '–');
      case 'chieu_cao': return `${k.replace('-', '–')} cm`;
      case 'vai_tro': return ({ top: 'Top', vers_top: 'Vers top', vers: 'Vers', vers_bottom: 'Vers bottom', bottom: 'Bottom', side: 'Side', ask: t('Hỏi tôi') })[k] || k;
      case 'dang_nguoi': return ({ slim: t('Mảnh'), average: t('Cân đối'), athletic: t('Thể thao'), muscular: t('Cơ bắp'), chubby: t('Mũm mĩm'), large: t('To con') })[k] || k;
      case 'tinh_trang': return ({ single: t('Độc thân'), dating: t('Đang hẹn hò'), partnered: t('Đã có người yêu'), married: t('Đã kết hôn'), open: t('Quan hệ mở'), complicated: t('Phức tạp') })[k] || k;
      case 'dang_tim': return ({ chat: t('Trò chuyện'), friends: t('Bạn bè'), dates: t('Hẹn hò'), relationship: t('Lâu dài'), now: t('Gặp ngay'), networking: t('Mở rộng quan hệ') })[k] || k;
      case 'ngon_ngu': case 'ngon_ngu_app': return cdTenNgonNgu(k);
      case 'plus': return k === 'co' ? t('Có Plus') : t('Không có Plus');
      case 'xac_minh': return k === 'co' ? t('Đã xác minh') : t('Chưa xác minh');
      case 'hoat_dong': return ({ '24h': t('Trong 24 giờ qua'), '7d': t('2–7 ngày trước'), '30d': t('8–30 ngày trước'), ngu: t('Không hoạt động trên 30 ngày') })[k] || k;
      case 'thang_dang_ky': { const m = /^(\d{4})-(\d{2})$/.exec(k); return m ? `${m[2]}/${m[1]}` : k; }
      default: return k;
    }
  }
  /** Các dòng của một chiều theo thứ tự hiển thị: [{k, n (null khi bị che), it}]. */
  function cdDong(o, chieu) {
    const ds = ((o.chieu || {})[chieu] || []).map((x) => ({ k: String(x.k), n: x.it ? null : Number(x.n) || 0, it: !!x.it }));
    const tt = CD_THU_TU[chieu];
    if (tt) return ds.sort((a, b) => (tt.indexOf(a.k) < 0 ? 99 : tt.indexOf(a.k)) - (tt.indexOf(b.k) < 0 ? 99 : tt.indexOf(b.k)));
    if (chieu === 'thang_dang_ky') return ds.sort((a, b) => (a.k < b.k ? -1 : 1)).slice(-12);
    return ds;                                   // máy chủ đã xếp theo số người giảm dần; nhóm bị che nằm cuối
  }
  /** Số người của một giá trị: {n} | {it: true} (dưới 5 người) | {n: 0} (không có ai). */
  function cdLay(o, chieu, k) {
    const x = ((o.chieu || {})[chieu] || []).find((y) => String(y.k) === k);
    return !x ? { n: 0 } : x.it ? { it: true } : { n: Number(x.n) || 0 };
  }
  const cdPct = (n, tong) => (tong ? Math.round((n / tong) * 1000) / 10 : 0);

  /** Danh sách thanh ngang của một chiều. loc = khoá bộ lọc mảng (bấm vào dòng để lọc) hoặc null. */
  function cdThanh(o, chieu, { loc = null, chon = [], toiDa = 8, mau = 'var(--primary)' } = {}) {
    const ds = cdDong(o, chieu);
    if (!ds.length) return `<div class="hint">${t('Chưa có dữ liệu.')}</div>`;
    const max = Math.max(1, ...ds.map((d) => d.n || 0));
    const dong = (d) => {
      const ten = cdNhan(chieu, d.k);
      if (d.it) {
        return `<div class="cd-row it" tabindex="0" data-tip="${esc(`${ten}\n${t('Dưới 5 người — không hiện số để không lộ danh tính')}`)}"><span class="cd-l">${esc(ten)}</span><span class="cd-b"></span><span class="cd-p">&lt; 5</span><span class="cd-n"></span></div>`;
      }
      const p = cdPct(d.n, o.tong);
      const tip = `${ten}\n${so(d.n)} ${t('người')} · ${so(p)}%${loc ? '\n' + t('Bấm để lọc theo nhóm này') : ''}`;
      const than = `<span class="cd-l">${esc(ten)}</span><span class="cd-b"><i style="width:${Math.max(1.5, Math.round((d.n / max) * 1000) / 10)}%;background:${mau}"></i></span><span class="cd-p">${so(p)}%</span><span class="cd-n">${so(d.n)}</span>`;
      return loc
        ? `<button type="button" class="cd-row" data-cd-dong="${loc}" data-k="${esc(d.k)}" aria-pressed="${chon.includes(d.k)}" data-tip="${esc(tip)}">${than}</button>`
        : `<div class="cd-row" tabindex="0" data-tip="${esc(tip)}">${than}</div>`;
    };
    const dau = ds.slice(0, toiDa), duoi = ds.slice(toiDa);
    return `<div class="cd-rows">${dau.map(dong).join('')}</div>${duoi.length
      ? `<details class="pt-tbl"><summary>${t('Xem thêm')} ${so(duoi.length)} ${t('nhóm nữa')}</summary><div class="cd-rows" style="margin-top:6px">${duoi.map(dong).join('')}</div></details>` : ''}`;
  }

  /** Một dòng "tỉ lệ có / không" (Plus, xác minh, có ảnh…). */
  function cdTiLe(o, nhan, chieu, k, phu) {
    const x = cdLay(o, chieu, k);
    if (x.it) return `<div class="cd-row it" tabindex="0" data-tip="${esc(`${nhan}\n${t('Dưới 5 người — không hiện số để không lộ danh tính')}`)}"><span class="cd-l">${esc(nhan)}</span><span class="cd-b"></span><span class="cd-p">&lt; 5</span><span class="cd-n"></span></div>`;
    const p = cdPct(x.n, o.tong);
    return `<div class="cd-row" tabindex="0" data-tip="${esc(`${nhan}\n${so(x.n)} ${t('người')} · ${so(p)}%${phu ? '\n' + phu : ''}`)}"><span class="cd-l">${esc(nhan)}</span><span class="cd-b"><i style="width:${Math.max(x.n ? 1.5 : 0, p)}%;background:var(--pt-s2)"></i></span><span class="cd-p">${so(p)}%</span><span class="cd-n">${so(x.n)}</span></div>`;
  }

  /** "Tóm tắt nhanh": mỗi chiều một thanh 100% — ba nhóm lớn nhất + phần còn lại. Dùng cả ở Tổng quan. */
  function cdTomTat(o, cacChieu) {
    return (cacChieu || ['quoc_gia', 'vai_tro', 'tuoi', 'tinh_trang']).map((chieu) => {
      const ds = ((o.chieu || {})[chieu] || []).filter((x) => !x.it).map((x) => ({ k: String(x.k), n: Number(x.n) || 0 })).sort((a, b) => b.n - a.n).slice(0, 3);
      if (!ds.length) return '';
      const conLai = Math.max(0, o.tong - ds.reduce((a, b) => a + b.n, 0));
      const phan = ds.map((d, i) => ({ ten: cdNhan(chieu, d.k), n: d.n, mau: CD_MAU[i] }));
      if (conLai > 0) phan.push({ ten: t('Còn lại'), n: conLai, mau: CD_MAU[3] });
      return `<div class="cd-tt"><div class="cd-tt-h">${esc(cdTenChieu(chieu))}</div>
        <div class="cd-stack" role="img" aria-label="${esc(phan.map((x) => `${x.ten} ${so(cdPct(x.n, o.tong))}%`).join(', '))}">${phan.map((x) => `<i tabindex="0" style="flex:${x.n};background:${x.mau}" data-tip="${esc(`${x.ten}\n${so(x.n)} ${t('người')} · ${so(cdPct(x.n, o.tong))}%`)}"></i>`).join('')}</div>
        <div class="cd-tt-c">${phan.map((x) => `<span><i class="pt-key" style="--c:${x.mau}"></i>${esc(x.ten)} <b>${so(cdPct(x.n, o.tong))}%</b></span>`).join('')}</div></div>`;
    }).join('');
  }

  /** Bảng chéo hai chiều. kieu: 'hang' (% theo hàng) | 'cot' (% theo cột) | 'so' (số người). */
  function cdBangCheo(o, kieu) {
    const ch = o.cheo;
    if (!ch || !ch.a || !ch.b) return `<div class="hint">${t('Chọn hai chiều khác nhau để xem bảng chéo.')}</div>`;
    const xep = (chieu, ds) => { const tt = CD_GIA_TRI[chieu]; return tt && chieu !== 'tuoi' ? [...ds].sort((x, y) => tt.indexOf(x.k) - tt.indexOf(y.k)) : ds; };
    const hang = xep(ch.a, cdDong(o, ch.a).filter((d) => !d.it).slice(0, 12));
    const cot = xep(ch.b, cdDong(o, ch.b).filter((d) => !d.it).slice(0, 8));
    if (!hang.length || !cot.length) return `<div class="hint">${t('Chưa đủ dữ liệu cho bảng chéo.')}</div>`;
    const o2 = new Map((ch.o || []).map((x) => [`${x.a}\u0001${x.b}`, x]));
    const dau = `<tr><th>${esc(cdTenChieu(ch.a))} \\ ${esc(cdTenChieu(ch.b))}</th>${cot.map((c) => `<th class="num">${esc(cdNhan(ch.b, c.k))}</th>`).join('')}<th class="num">${t('Tổng')}</th></tr>`;
    const than = hang.map((h) => `<tr><td>${esc(cdNhan(ch.a, h.k))}</td>${cot.map((c) => {
      const x = o2.get(`${h.k}\u0001${c.k}`);
      const ten = `${cdNhan(ch.a, h.k)} × ${cdNhan(ch.b, c.k)}`;
      if (x && x.it) return `<td class="pt-coh pt-coh-na" tabindex="0" data-tip="${esc(`${ten}\n${t('Dưới 5 người — không hiện số để không lộ danh tính')}`)}">&lt; 5</td>`;
      const n = x ? Number(x.n) || 0 : 0;
      const mau = kieu === 'cot' ? c.n : h.n;
      const p = cdPct(n, kieu === 'so' ? o.tong : mau);
      const hien = kieu === 'so' ? so(n) : `${so(p)}%`;
      const tip = `${ten}\n${so(n)} ${t('người')}\n${so(cdPct(n, h.n))}% ${t('của')} ${cdNhan(ch.a, h.k)}\n${so(cdPct(n, c.n))}% ${t('của')} ${cdNhan(ch.b, c.k)}`;
      return `<td class="pt-coh" tabindex="0" style="--a:${n ? Math.min(0.85, 0.08 + (p / 100) * 0.77).toFixed(2) : 0}" data-tip="${esc(tip)}"><span>${n ? hien : '0'}</span></td>`;
    }).join('')}<td class="num">${so(h.n)}</td></tr>`).join('');
    const chan = `<tr><td><b>${t('Tổng')}</b></td>${cot.map((c) => `<td class="num">${so(c.n)}</td>`).join('')}<td class="num"><b>${so(o.tong)}</b></td></tr>`;
    return `<div class="scrollx"><table class="tbl pt-cohort"><thead>${dau}</thead><tbody>${than}${chan}</tbody></table></div>
      <div class="hint" style="margin-top:8px">${kieu === 'hang' ? t('Mỗi ô: tỉ lệ trong nhóm của HÀNG đó. Rê chuột để xem số người.') : kieu === 'cot' ? t('Mỗi ô: tỉ lệ trong nhóm của CỘT đó. Rê chuột để xem số người.') : t('Mỗi ô: số người. Rê chuột để xem tỉ lệ.')} ${t('Hiện tối đa 12 hàng và 8 cột đông nhất; ô dưới 5 người ghi "< 5".')}</div>`;
  }

  /** Mô tả bộ lọc đang bật: [{khoa, k, ten}] — dùng cho dải "đang lọc" và tệp CSV. */
  function cdLocDangBat(cd) {
    const ds = [];
    CD_LOC_MANG.forEach((khoa) => (cd[khoa] || []).forEach((k) => ds.push({ khoa, k, ten: `${cdTenChieu(khoa)}: ${cdNhan(khoa, k)}` })));
    if (cd.hoat_dong !== 'all') ds.push({ khoa: 'hoat_dong', ten: `${t('Hoạt động')}: ${({ '24h': t('24 giờ qua'), '7d': t('7 ngày qua'), '30d': t('30 ngày qua'), ngu: t('không hoạt động trên 30 ngày') })[cd.hoat_dong]}` });
    if (cd.dang_ky !== 'all') ds.push({ khoa: 'dang_ky', ten: `${t('Đăng ký')}: ${({ '7d': t('7 ngày qua'), '30d': t('30 ngày qua'), '90d': t('90 ngày qua') })[cd.dang_ky]}` });
    if (cd.plus !== 'all') ds.push({ khoa: 'plus', ten: cdNhan('plus', cd.plus) });
    if (cd.xac_minh !== 'all') ds.push({ khoa: 'xac_minh', ten: cdNhan('xac_minh', cd.xac_minh) });
    if (cd.noi_bo) ds.push({ khoa: 'noi_bo', ten: t('Gồm tài khoản nội bộ') });
    if (cd.ca_bi_khoa) ds.push({ khoa: 'ca_bi_khoa', ten: t('Gồm tài khoản bị khoá') });
    return ds;
  }

  /** Tệp CSV của đúng những gì đang hiện (số tổng hợp; nhóm dưới 5 người ghi "<5"). */
  function cdCsv(o, cd) {
    const o1 = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const dong = [[t('Chân dung người dùng HIMO'), o.luc || ''], [t('Bộ lọc'), cdLocDangBat(cd).map((x) => x.ten).join('; ') || t('không lọc')],
      [t('Số người khớp bộ lọc'), o.tong], [t('Tổng người dùng'), o.tong_tat_ca], [], [t('Chiều'), t('Nhóm'), t('Số người'), '%']];
    Object.keys(o.chieu || {}).sort().forEach((chieu) => {
      const laCo = ['co_anh', 'an_danh', 'rieng_tu', 'co_tb'].includes(chieu);
      const ten = laCo ? ({ co_anh: t('Có ảnh hồ sơ'), an_danh: t('Bật ẩn danh'), rieng_tu: t('Tài khoản riêng tư'), co_tb: t('Bật thông báo') })[chieu] : cdTenChieu(chieu);
      ((o.chieu || {})[chieu] || []).forEach((x) => {
        const nhan = laCo ? (String(x.k) === 'true' ? t('Có') : t('Không')) : cdNhan(chieu, String(x.k));
        dong.push([ten, nhan, x.it ? '<5' : x.n, x.it ? '' : cdPct(Number(x.n) || 0, o.tong)]);
      });
    });
    if (o.cheo && o.cheo.o && o.cheo.o.length) {
      dong.push([], [`${cdTenChieu(o.cheo.a)} × ${cdTenChieu(o.cheo.b)}`], [cdTenChieu(o.cheo.a), cdTenChieu(o.cheo.b), t('Số người')]);
      o.cheo.o.forEach((x) => dong.push([cdNhan(o.cheo.a, String(x.a)), cdNhan(o.cheo.b, String(x.b)), x.it ? '<5' : x.n]));
    }
    return '﻿' + dong.map((d) => d.map(o1).join(',')).join('\r\n');
  }

  /**
   * tt: { cd (trạng thái bộ lọc — admin.js giữ), nen (kết quả KHÔNG lọc: để dựng danh sách nước / ngôn ngữ), doi(fn) (đổi bộ lọc rồi
   *       hỏi lại máy chủ), tai(ten, noiDung) (tải tệp) }.
   */
  function chanDung(main, o, ctx, tt) {
    C = ctx;
    const cd = tt.cd;
    const nen = tt.nen && !tt.nen.it ? tt.nen : null;
    const coLoc = cdLocDangBat(cd);
    const chip = (khoa, k, ten) => `<button type="button" class="chip" data-cd-mang="${khoa}" data-k="${esc(k)}" aria-pressed="${(cd[khoa] || []).includes(k)}">${esc(ten)}</button>`;
    const chon = (khoa, ds) => `<select data-cd-don="${khoa}" aria-label="${esc(ds[0][1])}">${ds.map(([k, l]) => `<option value="${k}" ${cd[khoa] === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    // Danh sách nước / ngôn ngữ lấy từ chính dữ liệu (không gõ sẵn): nước đông nhất thành ô bấm, phần còn lại trong ô chọn.
    const nuoc = nen ? ((nen.chieu || {}).quoc_gia || []).filter((x) => !x.it && x.k !== '?').map((x) => String(x.k)) : [];
    const nuocO = [...new Set([...nuoc.slice(0, 8), ...(cd.quoc_gia || [])])];
    const nuocKhac = nuoc.filter((k) => !nuocO.includes(k));
    const ngonNgu = nen ? ((nen.chieu || {}).ngon_ngu || []).filter((x) => !x.it).map((x) => String(x.k)) : [];
    const nnChon = [...new Set([...(cd.ngon_ngu || [])])];
    const moThem = cd.moThem || ['dang_nguoi', 'tinh_trang', 'dang_tim', 'ngon_ngu'].some((k) => (cd[k] || []).length) || cd.noi_bo || cd.ca_bi_khoa;

    const boLoc = `<div class="card cd-loc">
      <div class="cd-lr"><span class="cd-lb">${t('Quốc gia')}</span><div class="chips">${nuocO.map((k) => chip('quoc_gia', k, cdNhan('quoc_gia', k))).join('')}
        ${nuocKhac.length ? `<select data-cd-them="quoc_gia" aria-label="${t('Nước khác')}"><option value="">${t('Nước khác…')}</option>${nuocKhac.map((k) => `<option value="${esc(k)}">${esc(cdNhan('quoc_gia', k))}</option>`).join('')}</select>` : ''}
        ${!nuocO.length ? `<span class="hint">${t('Chưa có nước nào đủ 5 người.')}</span>` : ''}</div></div>
      <div class="cd-lr"><span class="cd-lb">${t('Nhóm tuổi')}</span><div class="chips">${CD_GIA_TRI.tuoi.map((k) => chip('tuoi', k, cdNhan('tuoi', k))).join('')}</div></div>
      <div class="cd-lr"><span class="cd-lb">${t('Vai trò')}</span><div class="chips">${CD_GIA_TRI.vai_tro.map((k) => chip('vai_tro', k, cdNhan('vai_tro', k))).join('')}</div></div>
      <div class="cd-lr"><span class="cd-lb">${t('Trạng thái')}</span><div class="chips">
        ${chon('hoat_dong', [['all', t('Hoạt động: tất cả')], ['24h', t('Hoạt động 24 giờ qua')], ['7d', t('Hoạt động 7 ngày qua')], ['30d', t('Hoạt động 30 ngày qua')], ['ngu', t('Không hoạt động trên 30 ngày')]])}
        ${chon('dang_ky', [['all', t('Đăng ký: mọi lúc')], ['7d', t('Đăng ký 7 ngày qua')], ['30d', t('Đăng ký 30 ngày qua')], ['90d', t('Đăng ký 90 ngày qua')]])}
        ${chon('plus', [['all', t('Plus: tất cả')], ['co', t('Có Plus')], ['khong', t('Không có Plus')]])}
        ${chon('xac_minh', [['all', t('Xác minh: tất cả')], ['co', t('Đã xác minh')], ['khong', t('Chưa xác minh')]])}</div></div>
      <details id="cdThem" ${moThem ? 'open' : ''}><summary>${t('Thêm bộ lọc')}</summary><div class="cd-loc" style="margin-top:10px">
        <div class="cd-lr"><span class="cd-lb">${t('Dáng người')}</span><div class="chips">${CD_GIA_TRI.dang_nguoi.map((k) => chip('dang_nguoi', k, cdNhan('dang_nguoi', k))).join('')}</div></div>
        <div class="cd-lr"><span class="cd-lb">${t('Tình trạng')}</span><div class="chips">${CD_GIA_TRI.tinh_trang.map((k) => chip('tinh_trang', k, cdNhan('tinh_trang', k))).join('')}</div></div>
        <div class="cd-lr"><span class="cd-lb">${t('Đang tìm')}</span><div class="chips">${CD_GIA_TRI.dang_tim.map((k) => chip('dang_tim', k, cdNhan('dang_tim', k))).join('')}</div></div>
        <div class="cd-lr"><span class="cd-lb">${t('Ngôn ngữ')}</span><div class="chips">${nnChon.map((k) => chip('ngon_ngu', k, cdNhan('ngon_ngu', k))).join('')}
          <select data-cd-them="ngon_ngu" aria-label="${t('Ngôn ngữ nói được')}"><option value="">${t('Chọn ngôn ngữ…')}</option>${ngonNgu.filter((k) => !nnChon.includes(k)).map((k) => `<option value="${esc(k)}">${esc(cdNhan('ngon_ngu', k))}</option>`).join('')}</select></div></div>
        <div class="cd-lr"><span class="cd-lb">${t('Phạm vi')}</span><div class="chips">
          <label class="cd-ck"><input type="checkbox" data-cd-co="noi_bo" ${cd.noi_bo ? 'checked' : ''}> ${t('Gồm tài khoản nội bộ')}</label>
          <label class="cd-ck"><input type="checkbox" data-cd-co="ca_bi_khoa" ${cd.ca_bi_khoa ? 'checked' : ''}> ${t('Gồm tài khoản bị khoá')}</label></div></div>
      </div></details>
    </div>`;

    const dau = `<div class="pt-head"><div><h1>${t('Chân dung người dùng')}</h1>
        <p class="sub">${t('Người dùng HIMO là ai: tỉ lệ theo nước, tuổi, vai trò… tính thẳng trên dữ liệu thật mỗi lần mở hoặc đổi bộ lọc. Bấm vào một dòng để lọc theo nhóm đó.')}</p></div>
      <div class="row"><span class="hint">${o && o.luc ? `${t('Số liệu lúc')} ${esc(new Date(o.luc).toLocaleTimeString(C.locale()))}` : ''}</span>
        <button class="btn sm" id="cdLamMoi">${t('Làm mới')}</button>${o && !o.it ? `<button class="btn sm" id="cdCsv">${t('Tải CSV')}</button>` : ''}</div></div>`;
    const dangLoc = `<div class="cd-tom">${o && !o.it
      ? `<span><b>${so(o.tong)}</b> ${coLoc.length ? `${t('người khớp bộ lọc')} · ${so(cdPct(o.tong, o.tong_tat_ca))}% ${t('của')} ${so(o.tong_tat_ca)} ${t('người dùng')}` : `${t('người dùng')} · ${t('chưa lọc')}`}</span>` : ''}
      ${coLoc.map((x, i) => `<button type="button" class="cd-x" data-cd-bo="${i}" title="${t('Bỏ bộ lọc này')}">${esc(x.ten)} <span aria-hidden="true">×</span></button>`).join('')}
      ${coLoc.length ? `<button type="button" class="btn ghost sm" id="cdXoa">${t('Xoá bộ lọc')}</button>` : ''}</div>`;

    let than;
    if (!o || o.it) {
      than = `<div class="card"><div class="empty"><b>${t('Nhóm này có dưới 5 người')}</b><br>${t('Không hiện số liệu của nhóm quá nhỏ để không lộ danh tính từng người. Hãy nới bộ lọc.')}
        ${o && o.tong_tat_ca != null ? `<br><span class="hint">${t('Tổng người dùng trong phạm vi')}: ${so(o.tong_tat_ca)}</span>` : ''}</div></div>`;
    } else {
      const hd24 = cdLay(o, 'hoat_dong', '24h'), hd7 = cdLay(o, 'hoat_dong', '7d');
      const tile = (nhan, x, phu) => cdO(nhan, x.it ? '&lt; 5' : `${so(cdPct(x.n, o.tong))}%`, '', x.it ? t('nhóm dưới 5 người') : `${so(x.n)} ${t('người')}${phu ? ' · ' + phu : ''}`);
      const kpi = `<div class="tiles pt-tiles">
        ${cdO(coLoc.length ? t('Người khớp bộ lọc') : t('Người dùng'), so(o.tong), '', coLoc.length ? `${so(cdPct(o.tong, o.tong_tat_ca))}% ${t('của')} ${so(o.tong_tat_ca)}` : t('không gồm tài khoản bị khoá và tài khoản nội bộ'))}
        ${tile(t('Hoạt động 24 giờ qua'), hd24)}
        ${(hd24.it || hd7.it) ? cdO(t('Hoạt động 7 ngày qua'), '—', '', t('có nhóm dưới 5 người')) : cdO(t('Hoạt động 7 ngày qua'), `${so(cdPct(hd24.n + hd7.n, o.tong))}%`, '', `${so(hd24.n + hd7.n)} ${t('người')}`)}
        ${tile('HIMO Plus', cdLay(o, 'plus', 'co'))}
        ${tile(t('Đã xác minh'), cdLay(o, 'xac_minh', 'co'))}
        ${tile(t('Bật thông báo'), cdLay(o, 'co_tb', 'true'))}
      </div>`;
      const the1 = (chieu, phu, loc, mau) => the(cdTenChieu(chieu), phu, cdThanh(o, chieu, { loc, chon: loc ? cd[loc] || [] : [], mau }));
      than = `${kpi}
        ${the(t('Tóm tắt nhanh'), t('ba nhóm lớn nhất của mỗi chiều'), cdTomTat(o))}
        <div class="cd-grid">
          ${the1('quoc_gia', t('nước người dùng khai trong hồ sơ'), 'quoc_gia')}
          ${the1('vai_tro', '', 'vai_tro')}
          ${the1('tuoi', t('tính từ ngày sinh'), 'tuoi')}
          ${the1('tinh_trang', '', 'tinh_trang')}
          ${the1('dang_nguoi', '', 'dang_nguoi')}
          ${the1('dang_tim', t('một người chọn được nhiều mục — tổng có thể quá 100%'), 'dang_tim')}
          ${the1('ngon_ngu', t('một người chọn được nhiều ngôn ngữ'), 'ngon_ngu')}
          ${the1('ngon_ngu_app', t('ngôn ngữ app lúc bật thông báo'), null, 'var(--pt-s1)')}
          ${the1('chieu_cao', '', null, 'var(--pt-s1)')}
          ${the1('mbti', '', null, 'var(--pt-s1)')}
          ${the1('hoat_dong', t('lần cuối mở app'), null, 'var(--pt-s2)')}
          ${the1('thang_dang_ky', t('12 tháng gần nhất, giờ UTC'), null, 'var(--pt-s2)')}
          ${the(t('Tài khoản & cài đặt'), t('tỉ lệ trong nhóm đang xem'), `<div class="cd-rows">
            ${cdTiLe(o, 'HIMO Plus', 'plus', 'co')}${cdTiLe(o, t('Đã xác minh'), 'xac_minh', 'co')}${cdTiLe(o, t('Có ảnh hồ sơ đã duyệt'), 'co_anh', 'true')}
            ${cdTiLe(o, t('Bật thông báo'), 'co_tb', 'true')}${cdTiLe(o, t('Bật ẩn danh'), 'an_danh', 'true')}${cdTiLe(o, t('Tài khoản riêng tư'), 'rieng_tu', 'true')}</div>`)}
        </div>
        ${the(t('Bảng chéo'), t('so hai chiều với nhau — ví dụ vai trò theo từng nước'), `<div class="filters" style="margin-bottom:10px">
            <select id="cdCheoA" aria-label="${t('Hàng')}">${CD_CHEO.map((k) => `<option value="${k}" ${cd.cheo_a === k ? 'selected' : ''}>${t('Hàng')}: ${esc(cdTenChieu(k))}</option>`).join('')}</select>
            <select id="cdCheoB" aria-label="${t('Cột')}">${CD_CHEO.map((k) => `<option value="${k}" ${cd.cheo_b === k ? 'selected' : ''}>${t('Cột')}: ${esc(cdTenChieu(k))}</option>`).join('')}</select>
            <span class="chips">${[['hang', t('% theo hàng')], ['cot', t('% theo cột')], ['so', t('Số người')]].map(([k, l]) => `<button type="button" class="chip" data-cd-kieu="${k}" aria-pressed="${(cd.kieu || 'hang') === k}">${l}</button>`).join('')}</span>
          </div>${cdBangCheo(o, cd.kieu || 'hang')}`)}
        <div class="hint">${t('Cách tính: mỗi con số là số hồ sơ đếm trực tiếp trên máy chủ lúc tải, không ước lượng. Mặc định không tính tài khoản bị khoá và tài khoản nội bộ. Nhóm dưới 5 người không hiện số. Xu hướng tính dục và cách xưng hô không bao giờ được đưa vào thống kê.')}</div>`;
    }
    main.innerHTML = `<div class="stack" id="cdGoc" style="padding-top:14px">${dau}${boLoc}${dangLoc}${than}</div>`;
    ganChuGiai(main);

    const doi = (fn) => tt.doi(fn);
    const batTat = (khoa, k) => doi((s) => { const a = s[khoa] || []; s[khoa] = a.includes(k) ? a.filter((x) => x !== k) : [...a, k]; });
    main.querySelectorAll('[data-cd-mang]').forEach((b) => b.addEventListener('click', () => batTat(b.dataset.cdMang, b.dataset.k)));
    main.querySelectorAll('[data-cd-dong]').forEach((b) => b.addEventListener('click', () => batTat(b.dataset.cdDong, b.dataset.k)));
    main.querySelectorAll('[data-cd-them]').forEach((s) => s.addEventListener('change', () => { if (s.value) batTat(s.dataset.cdThem, s.value); }));
    main.querySelectorAll('[data-cd-don]').forEach((s) => s.addEventListener('change', () => doi((st) => { st[s.dataset.cdDon] = s.value; })));
    main.querySelectorAll('[data-cd-co]').forEach((c) => c.addEventListener('change', () => doi((st) => { st[c.dataset.cdCo] = c.checked; st.nen = null; })));
    main.querySelectorAll('[data-cd-bo]').forEach((b) => b.addEventListener('click', () => {
      const x = coLoc[Number(b.dataset.cdBo)]; if (!x) return;
      doi((s) => {
        if (CD_LOC_MANG.includes(x.khoa)) s[x.khoa] = (s[x.khoa] || []).filter((k) => k !== x.k);
        else if (CD_LOC_DON.includes(x.khoa)) s[x.khoa] = 'all';
        else { s[x.khoa] = false; s.nen = null; }
      });
    }));
    const xoa = main.querySelector('#cdXoa');
    if (xoa) xoa.addEventListener('click', () => doi((s) => { CD_LOC_MANG.forEach((k) => { s[k] = []; }); CD_LOC_DON.forEach((k) => { s[k] = 'all'; }); s.noi_bo = false; s.ca_bi_khoa = false; s.nen = null; }));
    const them = main.querySelector('#cdThem');
    if (them) them.addEventListener('toggle', () => { cd.moThem = them.open; });
    const lm = main.querySelector('#cdLamMoi'); if (lm) lm.addEventListener('click', () => doi(() => undefined));
    const a = main.querySelector('#cdCheoA'), b = main.querySelector('#cdCheoB');
    if (a) a.addEventListener('change', () => doi((s) => { s.cheo_a = a.value; if (s.cheo_b === a.value) s.cheo_b = CD_CHEO.find((k) => k !== a.value); }));
    if (b) b.addEventListener('change', () => doi((s) => { s.cheo_b = b.value; if (s.cheo_a === b.value) s.cheo_a = CD_CHEO.find((k) => k !== b.value); }));
    main.querySelectorAll('[data-cd-kieu]').forEach((c) => c.addEventListener('click', () => { cd.kieu = c.dataset.cdKieu; chanDung(main, o, ctx, tt); }));
    const csv = main.querySelector('#cdCsv');
    if (csv) csv.addEventListener('click', () => tt.tai(`himo-chan-dung-${String(o.luc || '').slice(0, 10)}.csv`, cdCsv(o, cd)));
  }
  /** Thẻ nhỏ cho trang Tổng quan: chỉ phần "Tóm tắt nhanh". Trả '' khi không có số để hiện. */
  function chanDungTomTat(o, ctx) {
    C = ctx;
    if (!o || o.it || !o.tong) return '';
    const s = cdTomTat(o, ['quoc_gia', 'vai_tro', 'tuoi']);
    return s ? the(t('Người dùng là ai'), `${so(o.tong)} ${t('người dùng')} · <a href="#phantich/chandung">${t('Xem chân dung đầy đủ')} →</a>`, s) : '';
  }

  // ---------------------------------------------------------------- DOANH THU (168)
  // Máy chủ (admin_doanh_thu) trả số TỔNG HỢP từ sổ doanh thu (mỗi giao dịch RevenueCat báo về một dòng) + ảnh chụp thuê bao hiện tại.
  // Tệp này chỉ vẽ + nối bộ lọc; không có con số nào gõ sẵn. Tiền quy USD; đây là số ước tính theo RevenueCat, không phải sổ kế toán.
  const DT_KY = [7, 30, 90, 365];
  function dtTien(v, ma) {
    if (v == null || isNaN(Number(v))) return '—';
    try { return new Intl.NumberFormat(C.locale(), { style: 'currency', currency: ma || 'USD', currencyDisplay: 'narrowSymbol' }).format(Number(v)); }
    catch (e) { return `${so(Math.round(Number(v) * 100) / 100)} ${ma || 'USD'}`; }
  }
  const dtCuaHang = (k) => ({ app_store: 'App Store', play_store: 'Google Play', test_store: 'Test store' })[k] || (k === '?' ? t('Chưa rõ') : k);
  const dtThoiHan = (k) => ({ P1M: t('1 tháng'), P3M: t('3 tháng'), P1Y: t('12 tháng') })[k] || '';
  const dtGoi = (k, thoiHan) => (k === '?' ? t('Chưa rõ') : thoiHan ? `${dtThoiHan(thoiHan)} · ${k}` : k);
  const dtLoai = (r) => (r.loai === 'mua_moi' ? (r.ky === 'TRIAL' ? t('Bắt đầu dùng thử') : t('Mua mới'))
    : ({ gia_han: t('Gia hạn'), mua_le: t('Mua lẻ'), hoan_tien: t('Hoàn tiền'), dao_hoan_tien: t('Đảo hoàn tiền') })[r.loai] || r.loai);
  const dtNuoc = (k) => (k === '?' || !k ? t('Chưa rõ') : C.tenNuoc(k) || k);

  /** Thanh ngang theo tiền: [{ten, usd, n, phu?}] — phần trăm tính trên tổng USD của danh sách. */
  function dtThanh(ds, mau) {
    if (!ds.length) return `<div class="hint">${t('Chưa có giao dịch nào trong kỳ.')}</div>`;
    const tong = ds.reduce((a, d) => a + Math.max(0, Number(d.usd) || 0), 0);
    const max = Math.max(0.01, ...ds.map((d) => Number(d.usd) || 0));
    return `<div class="cd-rows">${ds.map((d) => {
      const usd = Number(d.usd) || 0;
      const p = tong > 0 ? Math.round((usd / tong) * 1000) / 10 : 0;
      const tip = `${d.ten}\n${dtTien(usd)} · ${so(p)}%\n${so(d.n)} ${t('giao dịch')}${d.phu ? '\n' + d.phu : ''}`;
      return `<div class="cd-row tien" tabindex="0" data-tip="${esc(tip)}"><span class="cd-l">${esc(d.ten)}</span><span class="cd-b"><i style="width:${Math.max(usd > 0 ? 1.5 : 0, Math.round((usd / max) * 1000) / 10)}%;background:${mau || 'var(--primary)'}"></i></span><span class="cd-p">${esc(dtTien(usd))}</span><span class="cd-n">${so(p)}%</span></div>`;
    }).join('')}</div>`;
  }

  function dtCsv(o) {
    const o1 = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const tg = o.tong || {}, tb = o.thue_bao || {};
    const dong = [[t('Doanh thu HIMO Plus'), o.luc || ''], [t('Kỳ'), `${o.tu_ngay} → ${o.den_ngay}`, o.tz], [t('Môi trường'), o.moi_truong], [],
      [t('Doanh thu gộp (USD)'), tg.gop], [t('Hoàn tiền (USD)'), tg.hoan], [t('Doanh thu ròng (USD)'), tg.rong], [t('Thực nhận ước tính (USD)'), tg.thuc_nhan],
      [t('Mua mới'), tg.mua_moi], [t('Gia hạn'), tg.gia_han], [t('Hoàn tiền'), tg.hoan_tien], [t('Người đang trả tiền'), tb.dang_tra], [t('MRR ước tính (USD)'), (o.mrr || {}).usd], [],
      [t('Ngày'), t('Doanh thu gộp (USD)'), t('Hoàn tiền (USD)'), t('Mua mới'), t('Gia hạn'), t('Hoàn tiền')]];
    (o.chuoi || []).forEach((c) => dong.push([c.ngay, c.gop, c.hoan, c.mua_moi, c.gia_han, c.hoan_tien]));
    dong.push([], [t('Theo gói'), t('Số giao dịch'), 'USD']);
    (o.theo_goi || []).forEach((x) => dong.push([dtGoi(x.k, x.thoi_han), x.n, x.usd]));
    dong.push([], [t('Theo nước'), t('Số giao dịch'), 'USD']);
    (o.theo_nuoc || []).forEach((x) => dong.push([dtNuoc(x.k), x.n, x.usd]));
    dong.push([], [t('Theo tiền tệ'), t('Số giao dịch'), t('Tiền gốc'), 'USD']);
    (o.theo_tien_te || []).forEach((x) => dong.push([x.k, x.n, x.goc, x.usd]));
    return '﻿' + dong.map((d) => d.map(o1).join(',')).join('\r\n');
  }

  /** tt: { dt (trạng thái bộ lọc — admin.js giữ), doi(fn) (đổi bộ lọc rồi hỏi lại máy chủ), tai(ten, noiDung) }. */
  function doanhThu(main, o, ctx, tt) {
    C = ctx;
    const dt = tt.dt;
    const cam = !!(o && o.error);
    const lc = (o && o.lua_chon) || {};
    const laThu = dt.moi_truong === 'SANDBOX';
    const sp = (lc.san_pham || []).filter((x) => (laThu || x.cua_hang !== 'test_store') && (!dt.cua_hang || x.cua_hang === dt.cua_hang));
    const chon = (khoa, nhan, ds) => `<select data-dt="${khoa}" aria-label="${esc(nhan)}">${ds.map(([k, l]) => `<option value="${esc(k)}" ${String(dt[khoa] || '') === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const boLoc = `<div class="card cd-loc">
      <div class="cd-lr"><span class="cd-lb">${t('Kỳ')}</span><div class="chips">${DT_KY.map((d) => `<button type="button" class="chip" data-dt-ky="${d}" aria-pressed="${dt.ngay === d}">${d} ${t('ngày')}</button>`).join('')}</div></div>
      <div class="cd-lr"><span class="cd-lb">${t('Lọc')}</span><div class="chips">
        ${chon('cua_hang', t('Cửa hàng'), [['', t('Cửa hàng: tất cả')], ['app_store', 'App Store'], ['play_store', 'Google Play'], ...(laThu ? [['test_store', 'Test store']] : [])])}
        ${chon('san_pham', t('Gói'), [['', t('Gói: tất cả')], ...sp.map((x) => [x.k, `${dtThoiHan(x.thoi_han)} · ${dtCuaHang(x.cua_hang)}`])])}
        ${chon('quoc_gia', t('Quốc gia'), [['', t('Nước: tất cả')], ...((lc.quoc_gia || []).map((k) => [k, dtNuoc(k)]))])}
        ${chon('moi_truong', t('Môi trường'), [['PRODUCTION', t('Giao dịch thật')], ['SANDBOX', t('Giao dịch thử (sandbox)')]])}</div></div>
    </div>`;
    const dau = `<div class="pt-head"><div><h1>${t('Doanh thu')}</h1>
        <p class="sub">${t('HIMO Plus: mỗi lần mua, gia hạn hay hoàn tiền RevenueCat báo về máy chủ là vào sổ ngay. Tiền quy ra USD. Đây là số ước tính để theo dõi — số chính thức để đối soát và nộp thuế là báo cáo của App Store Connect / Google Play.')}</p></div>
      <div class="row"><span class="hint">${o && o.luc ? `${t('Số liệu lúc')} ${esc(new Date(o.luc).toLocaleTimeString(C.locale()))}` : ''}</span>
        <button class="btn sm" id="dtLamMoi">${t('Làm mới')}</button>${o && !cam ? `<button class="btn sm" id="dtCsv">${t('Tải CSV')}</button>` : ''}</div></div>`;

    let than;
    if (cam) {
      than = `<div class="card"><div class="empty"><b>${t('Bạn không có quyền xem doanh thu')}</b><br>${t('Chỉ vai Quản trị viên (administrator) và Chủ (owner) xem được thẻ này.')}</div></div>`;
    } else {
      const tg = o.tong || {}, tr = o.truoc || {}, tb = o.thue_bao || {}, mrr = o.mrr || {}, soGhi = o.so || {};
      const n = (v) => Number(v) || 0;
      const chuoi = o.chuoi || [];
      const kieu = dt.kieu === 'gd' ? 'gd' : 'tien';
      const canhBao = `${laThu ? `<div class="alertbar warn"><div><b>${t('Đang xem giao dịch THỬ (sandbox)')}</b><br>${t('Không phải tiền thật. Đổi "Môi trường" về "Giao dịch thật" để xem doanh thu.')}</div></div>` : ''}
        ${n(soGhi.thieu) > 0 ? `<div class="alertbar"><div><b>${so(soGhi.thieu)} ${t('sự kiện có tiền chưa vào sổ')}</b><br>${t('Con số bên dưới đang thiếu các giao dịch này. Chạy trong SQL Editor:')} <code>select public.billing_doanh_thu_bu();</code></div></div>` : ''}
        ${n(soGhi.dong) === 0 ? `<div class="alertbar ok"><div><b>${t('Chưa có giao dịch nào trong sổ')}</b><br>${t('Sổ ghi từ lúc áp bản vá 168 (và ghi bù các sự kiện trong 90 ngày trước đó). Khi có người mua HIMO Plus, giao dịch hiện ở đây trong vài giây.')}</div></div>` : ''}`;
      const kpi = `<div class="tiles pt-tiles dt-tiles">
        ${cdO(t('Doanh thu gộp'), esc(dtTien(tg.gop)), bienDong(n(tg.gop), n(tr.gop), 'len'), `${so(n(tg.mua_moi) + n(tg.gia_han) + n(tg.mua_le))} ${t('giao dịch trả tiền')}`)}
        ${cdO(t('Hoàn tiền'), esc(dtTien(tg.hoan)), bienDong(n(tg.hoan_tien), n(tr.hoan_tien), 'xuong'), `${so(tg.hoan_tien)} ${t('lần')}${n(tg.dao_hoan) ? ` · ${t('đảo lại')} ${esc(dtTien(tg.dao_hoan))}` : ''}`)}
        ${cdO(t('Doanh thu ròng'), esc(dtTien(tg.rong)), bienDong(n(tg.rong), n(tr.rong), 'len'), t('gộp trừ hoàn tiền'))}
        ${cdO(t('Thực nhận ước tính'), esc(dtTien(tg.thuc_nhan)), '', n(tg.thieu_ti_le) ? `${so(tg.thieu_ti_le)} ${t('giao dịch chưa rõ thuế / phí')}` : t('sau thuế và phí cửa hàng'))}
        ${cdO(t('Người đang trả tiền'), so(tb.dang_tra), '', n(o.nguoi_dung) ? `${so(Math.round((n(tb.dang_tra) / n(o.nguoi_dung)) * 1000) / 10)}% ${t('của')} ${so(o.nguoi_dung)} ${t('người dùng')}` : t('lúc này'))}
        ${cdO(t('MRR ước tính'), esc(dtTien(mrr.usd)), '', n(mrr.thieu_gia) ? `${so(mrr.thieu_gia)} ${t('thuê bao chưa có giá tham chiếu')}` : t('gói đang tự gia hạn, quy về một tháng'))}
        ${cdO(t('Mua mới'), so(tg.mua_moi), bienDong(n(tg.mua_moi), n(tr.mua_moi), 'len'), n(tg.dung_thu) ? `+ ${so(tg.dung_thu)} ${t('bắt đầu dùng thử')}` : '')}
        ${cdO(t('Gia hạn'), so(tg.gia_han), bienDong(n(tg.gia_han), n(tr.gia_han), 'len'), n(tg.doi_tu_dung_thu) ? `${so(tg.doi_tu_dung_thu)} ${t('từ dùng thử')}` : '')}
      </div>`;
      const bieuDo = the(t('Theo ngày'), `${esc(fmtNgayDt(o.tu_ngay))} → ${esc(fmtNgayDt(o.den_ngay))} · ${esc(o.tz || 'UTC')}`,
        `<div class="row" style="margin-bottom:8px"><span class="chips">${[['tien', t('Doanh thu (USD)')], ['gd', t('Số giao dịch')]].map(([k, l]) => `<button type="button" class="chip" data-dt-kieu="${k}" aria-pressed="${kieu === k}">${l}</button>`).join('')}</span></div>
        ${chuoi.length ? cho((W) => cotDoc(chuoi.map((c) => (kieu === 'tien' ? n(c.gop) : n(c.mua_moi) + n(c.gia_han))), chuoi.map((c) => ngayNgan(c.ngay)), { cao: 190, W, ten: kieu === 'tien' ? t('Doanh thu gộp (USD)') : t('Mua mới + gia hạn') })) : `<div class="hint">${t('Chưa có dữ liệu.')}</div>`}
        ${n(tg.chua_ro_gia) ? `<div class="hint">${so(tg.chua_ro_gia)} ${t('giao dịch trong kỳ RevenueCat chưa báo giá — được đếm nhưng chưa cộng vào tiền.')}</div>` : ''}`);
      const tbDong = (nhan, v, phu) => `<div class="cd-row tien" tabindex="0" data-tip="${esc(`${nhan}: ${so(v)}${phu ? '\n' + phu : ''}`)}"><span class="cd-l">${esc(nhan)}</span><span class="cd-b"><i style="width:${n(tb.dang_tra) ? Math.min(100, Math.round((n(v) / Math.max(1, n(tb.dang_tra))) * 1000) / 10) : 0}%;background:var(--pt-s2)"></i></span><span class="cd-p">${so(v)}</span><span class="cd-n"></span></div>`;
      const thueBao = the(t('Thuê bao lúc này'), t('ảnh chụp hiện tại, không theo kỳ'), `<div class="cd-rows">
          ${tbDong(t('Đang trả tiền'), tb.dang_tra, t('còn hạn (kể cả đang trong thời gian gia hạn thêm)'))}
          ${tbDong(t('Đang bật tự gia hạn'), tb.tu_gia_han)}
          ${tbDong(t('Đã huỷ, còn hạn'), tb.da_huy, t('sẽ hết Plus khi hết kỳ đã trả'))}
          ${tbDong(t('Sắp hết hạn trong 7 ngày'), tb.sap_het_7d, t('đã huỷ và hết kỳ trong 7 ngày tới'))}
          ${tbDong(t('Đang lỗi thanh toán'), tb.loi_thanh_toan, t('cửa hàng chưa trừ được tiền'))}
          ${tbDong(t('Đang dùng thử'), tb.dung_thu)}</div>
        <div class="hint" style="margin-top:8px">${t('Hết hạn trong 30 ngày qua')}: <b>${so(tb.het_han_30d)}</b> · ${t('Đang dùng Plus tặng (không tính doanh thu)')}: <b>${so(o.plus_tang)}</b></div>
        ${(o.thue_bao_goi || []).length ? `<div class="hint" style="margin-top:6px">${(o.thue_bao_goi || []).map((x) => `${esc(dtGoi(x.k, x.thoi_han))}: <b>${so(x.n)}</b>`).join(' · ')}</div>` : ''}`);
      const ganDay = o.gan_day || [];
      than = `${canhBao}${kpi}${bieuDo}
        <div class="cd-grid">
          ${the(t('Theo gói'), t('giao dịch trả tiền trong kỳ'), dtThanh((o.theo_goi || []).map((x) => ({ ten: dtGoi(x.k, x.thoi_han), usd: x.usd, n: x.n }))))}
          ${the(t('Theo nước'), t('theo vị trí gần nhất của người mua (RevenueCat ghi nhận)'), dtThanh((o.theo_nuoc || []).slice(0, 12).map((x) => ({ ten: dtNuoc(x.k), usd: x.usd, n: x.n })), 'var(--pt-s1)'))}
          ${the(t('Theo cửa hàng'), '', dtThanh((o.theo_cua_hang || []).map((x) => ({ ten: dtCuaHang(x.k), usd: x.usd, n: x.n })), 'var(--pt-s3)'))}
          ${the(t('Theo tiền tệ'), t('tiền khách thật sự trả, và quy USD'), dtThanh((o.theo_tien_te || []).slice(0, 12).map((x) => ({ ten: x.k === '?' ? t('Chưa rõ') : `${x.k} · ${dtTien(x.goc, x.k === '?' ? 'USD' : x.k)}`, usd: x.usd, n: x.n })), 'var(--pt-s2)'))}
          ${thueBao}
        </div>
        ${the(t('Giao dịch gần nhất'), t('25 dòng mới nhất trong kỳ — không gắn với người dùng nào'), ganDay.length ? `<div class="scrollx"><table class="tbl"><thead><tr>
            <th>${t('Lúc')}</th><th>${t('Loại')}</th><th>${t('Gói')}</th><th>${t('Nước')}</th><th>${t('Cửa hàng')}</th><th class="num">${t('Tiền gốc')}</th><th class="num">USD</th></tr></thead>
          <tbody>${ganDay.map((r) => `<tr><td>${esc(new Date(r.luc).toLocaleString(C.locale(), { dateStyle: 'short', timeStyle: 'short' }))}</td>
            <td>${r.loai === 'hoan_tien' ? `<span class="tag danger">${esc(dtLoai(r))}</span>` : esc(dtLoai(r))}</td><td>${esc(r.san_pham || '—')}</td><td>${esc(dtNuoc(r.quoc_gia))}</td>
            <td>${esc(dtCuaHang(r.cua_hang || '?'))}</td><td class="num">${r.goc == null ? '—' : esc(dtTien(r.goc, r.tien_te || 'USD'))}</td><td class="num"><b>${r.usd == null ? '—' : esc(dtTien(r.usd))}</b></td></tr>`).join('')}</tbody></table></div>`
          : `<div class="hint">${t('Chưa có giao dịch nào trong kỳ.')}</div>`)}
        <div class="hint">${t('Cách tính: mỗi dòng sổ là một sự kiện có tiền của RevenueCat (mua mới, gia hạn, mua lẻ, hoàn tiền). Giá USD do RevenueCat quy đổi lúc giao dịch. Thực nhận = giá × (1 − thuế) × (1 − phí cửa hàng) theo tỉ lệ RevenueCat ước tính. MRR = các gói đang tự gia hạn × giá trung bình 90 ngày của gói đó, quy về một tháng. Hoàn tiền của kỳ cũ hơn kỳ mới nhất có thể không được RevenueCat báo.')}
          ${soGhi.tu ? ` ${t('Sổ có dữ liệu từ')} ${esc(new Date(soGhi.tu).toLocaleDateString(C.locale()))} (${so(soGhi.dong)} ${t('dòng')}).` : ''}</div>`;
    }
    main.innerHTML = `<div class="stack" id="dtGoc" style="padding-top:14px">${dau}${boLoc}${than}</div>`;
    veBieuDo(main);

    main.querySelectorAll('[data-dt-ky]').forEach((b) => b.addEventListener('click', () => tt.doi((s) => { s.ngay = Number(b.dataset.dtKy); })));
    main.querySelectorAll('[data-dt]').forEach((s) => s.addEventListener('change', () => tt.doi((st) => {
      st[s.dataset.dt] = s.value;
      if (s.dataset.dt === 'cua_hang' || s.dataset.dt === 'moi_truong') st.san_pham = '';     // gói thuộc một cửa hàng — đổi cửa hàng thì bỏ lọc gói
      if (s.dataset.dt === 'moi_truong') { st.quoc_gia = ''; if (st.cua_hang === 'test_store') st.cua_hang = ''; }
    })));
    main.querySelectorAll('[data-dt-kieu]').forEach((c) => c.addEventListener('click', () => { dt.kieu = c.dataset.dtKieu; doanhThu(main, o, ctx, tt); }));
    const lm = main.querySelector('#dtLamMoi'); if (lm) lm.addEventListener('click', () => tt.doi(() => undefined));
    const csv = main.querySelector('#dtCsv');
    if (csv) csv.addEventListener('click', () => tt.tai(`himo-doanh-thu-${String(o.den_ngay || '').slice(0, 10)}.csv`, dtCsv(o)));
  }
  const fmtNgayDt = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s || ''); };
  /** Khối nhỏ cho trang Tổng quan. Trả '' khi máy chủ chưa có 168, người xem không có quyền, hoặc chưa có gì để hiện. */
  function doanhThuTomTat(o, ctx) {
    C = ctx;
    if (!o || o.error || !o.tong) return '';
    const tg = o.tong, tb = o.thue_bao || {}, ch = o.chuoi || [];
    const homNay = ch.length ? Number(ch[ch.length - 1].gop) || 0 : 0;
    const o1 = (v, l) => `<div class="tile" style="cursor:pointer" data-go="solieu/doanhthu"><div class="v">${v}</div><div class="l">${esc(l)}</div></div>`;
    return `<div class="sec lon"><h2>${t('Doanh thu')}</h2><span class="hint">${t('HIMO Plus, quy USD, ước tính theo RevenueCat')}</span></div>
      <div class="tiles">${o1(esc(dtTien(homNay)), t('hôm nay'))}${o1(esc(dtTien(tg.gop)), `${o.ngay} ${t('ngày qua (gộp)')}`)}${o1(so(tb.dang_tra), t('người đang trả tiền'))}${o1(esc(dtTien((o.mrr || {}).usd)), t('MRR ước tính'))}</div>`;
  }

  window.HIMO_PT = { chienLuoc, vanHanh, chuyenSau, stories, nguoiThat, suKien, chanDung, chanDungTomTat, doanhThu, doanhThuTomTat, chuGiai: ganChuGiai };
})();
