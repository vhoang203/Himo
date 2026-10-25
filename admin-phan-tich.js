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

  window.HIMO_PT = { chienLuoc, vanHanh, chuyenSau, stories, nguoiThat };
})();
