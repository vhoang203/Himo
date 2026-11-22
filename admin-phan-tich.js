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
  /** 22/11 (mục 48, QT-8): ngưỡng vàng / đỏ (% hạn mức) của trang Sức chứa (218, máy chủ trả qua admin_suc_chua_bao_dong / admin_suc_chua);
   *  chưa đọc được thì dùng mặc định của 218 (60 / 80). Trước đây Tổng quan / Vận hành ghi cứng 80 / 95 nên cùng tài nguyên hai màu. */
  function nguongSc() {
    const n = window.HIMO_NGUONG || {};
    const vang = Number(n.vang_pt) > 0 ? Number(n.vang_pt) : 60, dd = Number(n.do_pt) > 0 ? Number(n.do_pt) : 80;
    return { vang, do: Math.max(vang, dd) };
  }
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
    // 22/11 (mục 48, QT-6): 226 tính DAU trung bình trên ngày TRỌN có dữ liệu; chưa đủ ngày → null → "—"
    const dinh = hd && k.dau_tb.cur != null ? pct1(k.dau_tb.cur, hd) : null, dinh0 = hd0 && k.dau_tb.prev != null ? pct1(k.dau_tb.prev, hd0) : null;
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
      o(t('DAU trung bình'), k.dau_tb.cur == null ? '—' : so(k.dau_tb.cur), bienDong(k.dau_tb.cur, k.dau_tb.prev, 'len'), `${kyTruoc(k.dau_tb.prev)}${k.dau_tb.ngay_tron ? ` · ${t('ngày trọn, không tính hôm nay')}` : ''}`),
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
        <span class="pt-hb"><i style="width:${p == null ? 0 : Math.max(0.8, p)}%;background:${p != null && p >= nguongSc().do ? 'var(--danger)' : p != null && p >= nguongSc().vang ? 'var(--warn)' : 'var(--primary)'}"></i></span>${phu ? `<div class="hint">${phu}</div>` : ''}</div>`;
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
        ${o(t('Người trả phí (cửa hàng)'), pl.tra_phi_cua_hang_that == null ? '—' : so(pl.tra_phi_cua_hang_that), '', pl.ty_le_tra_phi_mau == null ? t('chưa có 063') : `${hienPct(Math.round(pl.ty_le_tra_phi_mau * 1000) / 10)} ${t('so với MAU')} · ${t('không gồm dùng thử')}`)}
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

  // ================================================================ G. GỢI Ý NEARBY (197)
  /** admin_pt_goi_y_nearby — số liệu NỘI BỘ, chỉ đọc (chủ dự án 18/11/2026).
   *  Tệp này là tệp tĩnh: ai biết địa chỉ trang cũng tải được, không cần đăng nhập → KHÔNG chứa lời nào về cách chọn hay cách tính. Hai khối
   *  "Tổng hợp" / "Cài đặt đang chạy" và các cột số của "Bảng hồ sơ" được vẽ nguyên theo TÊN TRƯỜNG máy chủ gửi cho quản trị viên đã đăng
   *  nhập (rà độc lập 18/11); bảng giải thích từng trường nằm ở tài liệu nội bộ của gói, không nằm ở đây. */
  function goiY(main, o2, ctx) {
    C = ctx;
    const cd = o2.cai_dat || {}; const g = o2.goi_y || {};
    const ngay = o2.ngay || 14;
    const sod = (v) => (v == null ? '—' : so(v));
    const top = o2.top || []; const tong = Number(o2.top_tong) || 0; const tu = Number(o2.top_tu) || 0;
    const theoNgay = o2.theo_ngay || [];
    const lucNao = (ts) => esc(new Date(ts).toLocaleString(C.locale ? C.locale() : undefined));
    // giá trị máy chủ gửi, trang không biết trước nghĩa: số → tối đa 4 chữ số lẻ; đúng / sai → dấu; mốc giờ → giờ của máy đang xem; còn lại → chữ đã thoát
    const gt = (v) => (v == null ? '—' : typeof v === 'number' ? so(Math.round(v * 10000) / 10000) : typeof v === 'boolean' ? (v ? '✓' : '✗')
      : /^\d{4}-\d{2}-\d{2}T/.test(String(v)) ? lucNao(v) : esc(String(v)));
    // 198: máy chủ gửi kèm nhãn của từng trường cho quản trị viên đã đăng nhập (`nhan`: { tên trường: { vi, en } }) → hiện nhãn đó;
    // trường chưa có nhãn (máy chủ chưa có 198) → tên trường. Tệp này vẫn không chứa lời giải thích nào.
    const nhan = o2.nhan && typeof o2.nhan === 'object' ? o2.nhan : {};
    const ngonNgu = C.lang && C.lang() === 'en' ? 'en' : 'vi';
    const tenTruong = (k) => {
      const n = nhan[k];
      return esc(n && typeof n === 'object' && typeof n[ngonNgu] === 'string' && n[ngonNgu] ? n[ngonNgu] : String(k).replace(/_/g, ' '));
    };
    const bangTruong = (obj) => {
      const ks = Object.keys(obj || {}).sort();
      return ks.length
        ? `<div class="scrollx"><table class="tbl"><tbody>${ks.map((k) => `<tr><td>${tenTruong(k)}</td><td class="num">${gt(obj[k])}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="hint">${t('Chưa có dữ liệu.')}</div>`;
    };
    // cột dựng riêng (thứ tự, hồ sơ, nước); MỌI trường khác của một dòng thành một cột theo tên trường — trường `diem` đứng đầu
    const RIENG = ['hang', 'id', 'ten', 'username', 'nuoc', 'xac_minh', 'du_dieu_kien'];
    const cotKhac = top.length ? Object.keys(top[0]).filter((k) => !RIENG.includes(k)).sort((a, b) => (a === 'diem' ? -1 : b === 'diem' ? 1 : a < b ? -1 : a > b ? 1 : 0)) : [];
    const capNhat = cd.tinh_luc ? `${t('cập nhật lúc')} ${lucNao(cd.tinh_luc)}` : t('chưa cập nhật lần nào');
    const trangThai = cd.bat
      ? `<div class="alertbar ok"><div><b>${t('Đang BẬT')}</b> — ${so(cd.phan_tram || 0)}% · ${t('tài khoản thử')}: ${sod(o2.nguoi_thu)}. ${capNhat}.</div></div>`
      : `<div class="alertbar warn"><div><b>${t('Đang TẮT')}</b> — ${t('bật / tắt ở máy chủ, không đổi từ trang này.')} ${capNhat}.</div></div>`;
    const dongTop = top.map((x) => `<tr>
        <td class="num"><b>${gt(x.hang)}</b></td>
        <td><a href="#nguoidung/${esc(x.id)}">${esc(x.ten || '?')}</a>${x.username ? ` <span class="hint">@${esc(x.username)}</span>` : ''}${x.xac_minh ? ` <span class="tag accent">${t('đã xác minh')}</span>` : ''}${x.du_dieu_kien === false ? ` <span class="tag">${t('không đủ điều kiện')}</span>` : ''}</td>
        <td>${esc(x.nuoc || '—')}</td>
        ${cotKhac.map((k, i) => `<td class="num">${i === 0 ? `<b>${gt(x[k])}</b>` : gt(x[k])}</td>`).join('')}</tr>`).join('');
    // lật trang: có ở TRÊN và dưới bảng, và luôn có khi bảng có dòng — kể cả lúc trang đang đứng vừa hết dòng (máy chủ vừa tính lại)
    const nutTrang = `<div class="row" style="margin:8px 0;gap:8px">
          <button class="btn sm gyTruoc" ${tu <= 0 ? 'disabled' : ''}>← ${t('Trang trước')}</button>
          <button class="btn sm gySau" ${tu + top.length >= tong ? 'disabled' : ''}>${t('Trang sau')} →</button>
          <span class="hint">${so(top.length ? tu + 1 : 0)}–${so(tu + top.length)} / ${so(tong)}</span></div>`;
    main.innerHTML = `<div class="stack" style="padding-top:14px">
      ${dauTrang(t('Gợi ý Nearby'), `${t('Số liệu nội bộ, chỉ đọc.')} ${t('Kỳ')} ${so(ngay)} ${t('ngày')}.`, [7, 14, 30], ngay)}
      ${trangThai}
      ${the(t('Ô trong kỳ'), t('gồm cả tài khoản thử / nội bộ'), `<div class="tiles pt-tiles">
        ${o(t('Ô đã gửi cho app'), sod(g.luot), '', `${sod(g.luot_khoa)} ${t('ô khoá')}`)}
        ${o(t('Người nhận ô'), sod(g.nguoi_xem), '', `${sod(g.nguoi_xem_khoa)} ${t('nhận ô khoá')}`)}
        ${o(t('Hồ sơ xuất hiện trong ô'), sod(g.ho_so), '', '')}
        ${o(t('Ô được bấm'), sod(g.o_duoc_bam), '', `${sod(g.o_khoa_duoc_bam)} ${t('ô khoá')} · ${hienPct(pct1(Number(g.o_duoc_bam) || 0, Number(g.luot) || 0))}`)}
        ${o(t('Người bấm ô khoá'), sod(g.nguoi_bam_khoa), '', hienPct(pct1(Number(g.nguoi_bam_khoa) || 0, Number(g.nguoi_xem_khoa) || 0)), (Number(g.nguoi_xem_khoa) || 0) < MAU_KHONG_DU)}
        ${o(t('Bấm ô khoá, sau đó có lượt mua / gia hạn Plus'), sod(g.nguoi_bam_roi_mua), '', t('gồm cả dùng thử và môi trường thử — không phải bằng chứng nhân quả'))}
      </div>`)}
      ${the(t('Tổng hợp'), capNhat, bangTruong(o2.diem))}
      ${the(t('Bảng hồ sơ'), '', o2.top_bi_gioi_han ? `<div class="hint">${t('Bảng từng hồ sơ chỉ hiện cho quản trị viên được xem dữ liệu riêng và đã xác thực hai lớp.')} ${t('Số hồ sơ trong bảng')}: ${so(tong)}.</div>`
        : tong ? `${nutTrang}<div class="scrollx">
        <table class="tbl"><thead><tr><th class="num">#</th><th>${t('Hồ sơ')}</th><th>${t('Nước')}</th>${cotKhac.map((k) => `<th class="num">${tenTruong(k)}</th>`).join('')}</tr></thead>
        <tbody>${dongTop}</tbody></table></div>${top.length > 20 ? nutTrang : ''}` : `<div class="hint">${t('Chưa có dữ liệu.')}</div>`, 'gyBang')}
      ${the(t('Theo ngày'), t('ngày theo giờ UTC'), theoNgay.length ? `<div class="scrollx"><table class="tbl"><thead><tr><th>${t('Ngày')}</th><th class="num">${t('Ô đã gửi cho app')}</th><th class="num">${t('Ô khoá')}</th>
          <th class="num">${t('Người nhận ô')}</th><th class="num">${t('Ô được bấm')}</th><th class="num">${t('Ô khoá được bấm')}</th></tr></thead>
        <tbody>${theoNgay.map((x) => `<tr><td>${esc(ngayNgan(x.ngay))}</td><td class="num">${sod(x.luot)}</td><td class="num">${sod(x.luot_khoa)}</td><td class="num">${sod(x.nguoi)}</td>
          <td class="num">${sod(x.bam)}</td><td class="num">${sod(x.bam_khoa)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="hint">${t('Chưa có ô nào trong kỳ.')}</div>`)}
      ${the(t('Cài đặt đang chạy'), t('đổi ở máy chủ, không đổi từ trang này'), bangTruong(cd))}
      <div class="hint">${t('Tên cột và tên cài đặt hiện đúng theo tên trường máy chủ gửi; bảng giải thích nằm trong tài liệu nội bộ.')}</div>
    </div>`;
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
    // 170: chiều mà máy chủ này CHƯA có dữ liệu (cột hồ sơ chưa tồn tại — vd. production trước 144 / 149). Không hiện "0%" cho thứ không đo được.
    const thieu = new Set([...((o && o.thieu) || []), ...((tt.nen && tt.nen.thieu) || [])]);
    if (thieu.has('xac_minh') && cd.xac_minh !== 'all') cd.xac_minh = 'all';
    const chuaCo = (banVa) => `<div class="hint">${t('Máy chủ này chưa có dữ liệu cho mục này')} (${t('cần bản vá')} ${banVa}).</div>`;
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
        ${thieu.has('xac_minh') ? '' : chon('xac_minh', [['all', t('Xác minh: tất cả')], ['co', t('Đã xác minh')], ['khong', t('Chưa xác minh')]])}</div></div>
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
        ${thieu.has('xac_minh') ? cdO(t('Đã xác minh'), '—', '', t('máy chủ chưa có dữ liệu này')) : tile(t('Đã xác minh'), cdLay(o, 'xac_minh', 'co'))}
        ${tile(t('Bật thông báo'), cdLay(o, 'co_tb', 'true'))}
      </div>`;
      const the1 = (chieu, phu, loc, mau) => (thieu.has(chieu) ? the(cdTenChieu(chieu), '', chuaCo(chieu === 'mbti' ? '144' : '149'))
        : the(cdTenChieu(chieu), phu, cdThanh(o, chieu, { loc, chon: loc ? cd[loc] || [] : [], mau })));
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
            ${cdTiLe(o, 'HIMO Plus', 'plus', 'co')}${thieu.has('xac_minh') ? '' : cdTiLe(o, t('Đã xác minh'), 'xac_minh', 'co')}${cdTiLe(o, t('Có ảnh hồ sơ đã duyệt'), 'co_anh', 'true')}
            ${cdTiLe(o, t('Bật thông báo'), 'co_tb', 'true')}${cdTiLe(o, t('Bật ẩn danh'), 'an_danh', 'true')}${cdTiLe(o, t('Tài khoản riêng tư'), 'rieng_tu', 'true')}</div>`)}
        </div>
        ${the(t('Bảng chéo'), t('so hai chiều với nhau — ví dụ vai trò theo từng nước'), `<div class="filters" style="margin-bottom:10px">
            <select id="cdCheoA" aria-label="${t('Hàng')}">${CD_CHEO.filter((k) => !thieu.has(k)).map((k) => `<option value="${k}" ${cd.cheo_a === k ? 'selected' : ''}>${t('Hàng')}: ${esc(cdTenChieu(k))}</option>`).join('')}</select>
            <select id="cdCheoB" aria-label="${t('Cột')}">${CD_CHEO.filter((k) => !thieu.has(k)).map((k) => `<option value="${k}" ${cd.cheo_b === k ? 'selected' : ''}>${t('Cột')}: ${esc(cdTenChieu(k))}</option>`).join('')}</select>
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
    // Tổng quan: ba vòng tròn (3 nhóm lớn nhất + "Còn lại"). Ô dưới ngưỡng ẩn danh (it) gộp vào "Còn lại".
    const s = ['quoc_gia', 'vai_tro', 'tuoi'].map((chieu) => {
      const ds = ((o.chieu || {})[chieu] || []).filter((x) => !x.it).map((x) => ({ k: String(x.k), n: Number(x.n) || 0 })).sort((x, y) => y.n - x.n).slice(0, 3);
      if (!ds.length) return '';
      const conLai = Math.max(0, o.tong - ds.reduce((x, y) => x + y.n, 0));
      const phan = ds.map((d, i) => ({ ten: cdNhan(chieu, d.k), n: d.n, mau: TQ([1, 2, 7][i]) }));   // cùng màu với vòng "Người dùng theo quốc gia" bên trên
      if (conLai > 0) phan.push({ ten: t('Còn lại'), n: conLai, mau: 'var(--tq-khac)' });
      return `<div><h4 class="tq-h4">${esc(cdTenChieu(chieu))}</h4>${tronKhuyet(phan, { phuGiua: t('người dùng') })}</div>`;
    }).filter(Boolean);
    return s.length ? the(t('Người dùng là ai'), `${so(o.tong)} ${t('người dùng')} · <a href="#phantich/chandung">${t('Xem chân dung đầy đủ')} →</a>`, `<div class="tq-luoi3 tq-cd3">${s.join('')}</div>`) : '';
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
    const coKy = Object.prototype.hasOwnProperty.call(tt, 'ky');        // 202: admin.js mới đưa kèm kết quả theo kỳ (null = máy chủ chưa có 202)
    dtkNhoTieuDiem(main);                                               // trang tự làm mới mỗi phút: nút đang giữ tiêu điểm trong khối theo kỳ phải giữ được nó
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
      // 22/11 (mục 48, QT-3): "Người đang trả tiền" không gồm người đang dùng thử (như Tổng quan, luật f); mũi tên so kỳ bỏ vì kỳ này có hôm nay chưa hết ngày (luật e)
      const traThat = Math.max(0, n(tb.dang_tra) - n(tb.dung_thu));
      const n = (v) => Number(v) || 0;
      const chuoi = o.chuoi || [];
      const kieu = dt.kieu === 'gd' ? 'gd' : 'tien';
      const canhBao = `${laThu ? `<div class="alertbar warn"><div><b>${t('Đang xem giao dịch THỬ (sandbox)')}</b><br>${t('Không phải tiền thật. Đổi "Môi trường" về "Giao dịch thật" để xem doanh thu.')}</div></div>` : ''}
        ${n(soGhi.thieu) > 0 ? `<div class="alertbar"><div><b>${so(soGhi.thieu)} ${t('sự kiện có tiền chưa vào sổ')}</b><br>${t('Con số bên dưới đang thiếu các giao dịch này. Chạy trong SQL Editor:')} <code>select public.billing_doanh_thu_bu();</code></div></div>` : ''}
        ${n(soGhi.dong) === 0 ? `<div class="alertbar ok"><div><b>${t('Chưa có giao dịch nào trong sổ')}</b><br>${t('Sổ ghi từ lúc áp bản vá 168 (và ghi bù các sự kiện trong 90 ngày trước đó). Khi có người mua HIMO Plus, giao dịch hiện ở đây trong vài giây.')}</div></div>` : ''}`;
      const kpi = `${coKy && tt.ky && !tt.ky.error ? `<div class="sec lon"><h2>${dt.ngay} ${t('ngày gần nhất')}</h2><span class="hint">${t('các ô số, biểu đồ theo ngày và bảng chia theo gói / nước bên dưới')}</span></div>` : ''}<div class="tiles pt-tiles dt-tiles">
        ${cdO(t('Doanh thu gộp'), esc(dtTien(tg.gop)), '', `${so(n(tg.mua_moi) + n(tg.gia_han) + n(tg.mua_le))} ${t('giao dịch trả tiền')}`)}
        ${cdO(t('Hoàn tiền'), esc(dtTien(tg.hoan)), '', `${so(tg.hoan_tien)} ${t('lần')}${n(tg.dao_hoan) ? ` · ${t('đảo lại')} ${esc(dtTien(tg.dao_hoan))}` : ''}`)}
        ${cdO(t('Doanh thu ròng'), esc(dtTien(tg.rong)), '', t('gộp trừ hoàn tiền'))}
        ${cdO(t('Thực nhận ước tính'), esc(dtTien(tg.thuc_nhan)), '', n(tg.thieu_ti_le) ? `${so(tg.thieu_ti_le)} ${t('giao dịch chưa rõ thuế / phí')}` : t('sau thuế và phí cửa hàng'))}
        ${cdO(t('Người đang trả tiền'), so(traThat), '', `${n(o.nguoi_dung) ? `${so(Math.round((traThat / n(o.nguoi_dung)) * 1000) / 10)}% ${t('của')} ${so(o.nguoi_dung)} ${t('người dùng')}` : t('lúc này')}${n(tb.dung_thu) ? ` · + ${so(tb.dung_thu)} ${t('dùng thử')}` : ''}`)}
        ${cdO(t('MRR ước tính'), esc(dtTien(mrr.usd)), '', `${n(mrr.thieu_gia) ? `${so(mrr.thieu_gia)} ${t('thuê bao chưa có giá tham chiếu')}` : t('gói đang tự gia hạn, quy về một tháng')}${n(tb.dung_thu) ? ` · ${t('gồm cả dùng thử')}` : ''}`)}
        ${cdO(t('Mua mới'), so(tg.mua_moi), '', n(tg.dung_thu) ? `+ ${so(tg.dung_thu)} ${t('bắt đầu dùng thử')}` : '')}
        ${cdO(t('Gia hạn'), so(tg.gia_han), '', n(tg.doi_tu_dung_thu) ? `${so(tg.doi_tu_dung_thu)} ${t('từ dùng thử')}` : '')}

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
      than = `${canhBao}${coKy ? dtkAnToan(tt.ky, dt) : ''}${kpi}${bieuDo}
        <div class="cd-grid">
          ${the(t('Theo gói'), t('giao dịch trả tiền trong kỳ — gộp, chưa trừ hoàn tiền'), dtThanh((o.theo_goi || []).map((x) => ({ ten: dtGoi(x.k, x.thoi_han), usd: x.usd, n: x.n }))))}
          ${the(t('Theo nước'), t('vị trí gần nhất của người mua (RevenueCat ghi nhận) — gộp, chưa trừ hoàn tiền'), dtThanh((o.theo_nuoc || []).slice(0, 12).map((x) => ({ ten: dtNuoc(x.k), usd: x.usd, n: x.n })), 'var(--pt-s1)'))}
          ${the(t('Theo cửa hàng'), t('gộp, chưa trừ hoàn tiền'), dtThanh((o.theo_cua_hang || []).map((x) => ({ ten: dtCuaHang(x.k), usd: x.usd, n: x.n })), 'var(--pt-s3)'))}
          ${the(t('Theo tiền tệ'), t('tiền khách thật sự trả, và quy USD — gộp, chưa trừ hoàn tiền'), dtThanh((o.theo_tien_te || []).slice(0, 12).map((x) => ({ ten: x.k === '?' ? t('Chưa rõ') : `${x.k} · ${dtTien(x.goc, x.k === '?' ? 'USD' : x.k)}`, usd: x.usd, n: x.n })), 'var(--pt-s2)'))}
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
    if (coKy && !cam) { try { dtkNoi(main, tt.ky, tt); } catch (e) { /* khối theo kỳ hỏng không được kéo theo phần cũ */ } }
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

  // ---------------------------------------------------------------- DOANH THU THEO KỲ (202)
  // Máy chủ (admin_doanh_thu_ky) trả các CỘT của kỳ đang chọn (ngày / tuần / tháng / năm), cột của kỳ so sánh, khối "tháng này" và hai mục
  // tiêu. Tệp này chỉ vẽ + nối nút; admin.js gọi máy chủ. Không có con số nào gõ sẵn (hai mục tiêu cũng do máy chủ trả).
  const n0 = (v) => Number(v) || 0;
  const dtkNgay = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? { y: m[1], m: m[2], d: m[3] } : null; };
  /** Nhãn của một cột: `ngan` cho trục, `day` cho chú giải / bảng / CSV. */
  function dtkNhan(c, nhom) {
    const a = dtkNgay(c.tu), b = dtkNgay(c.den);
    if (!a || !b) return { ngan: String(c.tu || ''), day: String(c.tu || '') };
    const day = c.tu === c.den ? `${a.d}/${a.m}/${a.y}` : `${a.d}/${a.m}/${a.y} – ${b.d}/${b.m}/${b.y}`;
    if (nhom === 'nam') return { ngan: a.y, day };
    if (nhom === 'thang') return { ngan: `${a.m}/${a.y}`, day };
    return { ngan: `${a.d}/${a.m}`, day };
  }
  const dtkSoNgayThang = (y, m) => new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
  /** Mục tiêu (USD thực nhận mỗi THÁNG) quy về một cột: tháng = nguyên; ngày = chia số ngày của tháng đó; năm = × 12; tuần = không vẽ. */
  function dtkMucTieuCot(c, nhom, usd) {
    const a = dtkNgay(c.tu);
    if (!a || !(Number(usd) > 0)) return null;
    if (nhom === 'thang') return Number(usd);
    if (nhom === 'ngay') return Number(usd) / dtkSoNgayThang(a.y, a.m);
    if (nhom === 'nam') return Number(usd) * 12;
    return null;
  }
  const dtkGt = (c, kieu) => (!c ? 0 : kieu === 'gd' ? n0(c.tra_tien) : kieu === 'gop' ? n0(c.gop) : n0(c.thuc_nhan));
  const dtkHien = (v, kieu) => (kieu === 'gd' ? so(v) : dtTien(v));
  const dtkDoi = (cur, prev) => (prev ? Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10 : null);
  const DTK_MT_TOI_DA = 10;   // đường mục tiêu chỉ vẽ khi không cao quá 10 lần cột cao nhất
  const dtkTenNhom = (k) => ({ ngay: t('Ngày'), tuan: t('Tuần'), thang: t('Tháng'), nam: t('Năm') })[k] || String(k || '');
  const dtkTenSs = (k) => ({ khong: t('Không so sánh'), ky_truoc: t('Kỳ trước'), cung_ky_nam_truoc: t('Cùng kỳ năm trước') })[k] || String(k || '');
  /** Nhãn % thay đổi của TỔNG so với kỳ so sánh. Kỳ so sánh ÂM (chỉ có hoàn tiền): chia cho trị tuyệt đối như bảng bên dưới — không để dấu bị đảo. */
  function dtkHuyHieu(cur, prev) {
    if (!(prev < 0)) return bienDong(cur, prev, 'len');
    const p = dtkDoi(cur, prev);
    return `<span class="pt-d ${p > 0 ? 'pt-dtot' : p < 0 ? 'pt-dxau' : 'pt-d0'}">${p > 0 ? '▲ ' : p < 0 ? '▼ ' : ''}${so(Math.abs(p))}%</span>`;
  }
  /** Số mục tiêu hợp lệ: 0 < x ≤ 10 000 000, tối đa hai chữ số thập phân. So có dung sai: 5000.1 × 100 không tròn trong số thực, phép so bằng tuyệt đối từ chối nhầm. */
  const dtkSoMucTieu = (x) => typeof x === 'number' && Number.isFinite(x) && x > 0 && x <= 10000000 && Math.abs(x * 100 - Math.round(x * 100)) < 1e-6;

  /**
   * Cột theo kỳ: cột chính (màu thương hiệu), cột kỳ so sánh nhạt hơn đứng bên trái, đường mục tiêu nét đứt có nhãn.
   * Giá trị âm (kỳ hoàn tiền nhiều hơn thu) vẽ xuống dưới đường 0. mucTieu: [{ usd, nhan }] — chỉ đưa vào khi đang xem THỰC NHẬN;
   * nhãn cạnh mỗi đường là giá trị của đường ở cột cuối, theo đúng thang của trục.
   */
  function cotKy(cot, { nhom, kieu, coSs, mucTieu = [], ten = '', W = 640, cao = 230 } = {}) {
    const n = cot.length;
    const gt = cot.map((c) => dtkGt(c, kieu));
    const ss = cot.map((c) => (coSs && c.ss && c.ss.co ? dtkGt(c.ss, kieu) : null));
    const maxDl = Math.max(0, ...gt, ...ss.map((v) => v || 0));
    const minDl = Math.min(0, ...gt, ...ss.map((v) => v || 0));
    // Mục tiêu cao hơn 10 lần cột cao nhất thì KHÔNG vẽ (cột sẽ bị ép dẹt dưới 1/10 khung, không đọc được) — dòng chữ dưới biểu đồ nói rõ con số.
    const mt = mucTieu.map((m) => ({ ...m, v: cot.map((c) => dtkMucTieuCot(c, nhom, m.usd)) })).filter((m) => m.v.length && m.v.every((v) => v != null));
    const mtVe = mt.filter((m) => maxDl > 0 && Math.max(...m.v) <= maxDl * DTK_MT_TOI_DA);
    const H = cao, L = 48, R = mtVe.length ? 70 : 8, T = 12, B = 24;
    const { top, ticks } = mocTruc(Math.max(maxDl, ...mtVe.flatMap((m) => m.v), 0));
    const day = minDl < 0 ? -mocTruc(-minDl).top : 0;
    const y = (v) => T + (H - T - B) * ((top - v) / (top - day));
    const bw = (W - L - R) / Math.max(1, n);
    const moc = [...new Set([...ticks, ...(day < 0 ? [day] : [])])];
    const luoi = moc.map((v) => `<line class="pt-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="pt-ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${so(v)}</text>`).join('')
      + (day < 0 ? `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line2)" stroke-width="1"/>` : '');
    const bn = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((W - L - R) / (nhom === 'thang' ? 62 : 48)))));
    const mot = (x, v, w, mau, mo) => {
      if (!v) return `<rect x="${x}" y="${y(0) - 1}" width="${w}" height="1" fill="var(--line2)"/>`;
      if (v > 0) return `<path d="${bar(x, y(v), w, y(0) - y(v))}" fill="${mau}"${mo ? ` fill-opacity="${mo}" stroke="${mau}" stroke-width="1"` : ''}/>`;
      return `<rect x="${x}" y="${y(0)}" width="${w}" height="${Math.max(1, y(v) - y(0))}" fill="var(--pt-sneg)"${mo ? ` fill-opacity="${mo}" stroke="var(--pt-sneg)" stroke-width="1"` : ''} rx="2"/>`;
    };
    const cots = cot.map((c, i) => {
      const nh = dtkNhan(c, nhom);
      const x0 = L + i * bw, trong = Math.max(1, bw - (bw > 14 ? 4 : 1));
      const coCap = ss[i] != null;
      const w1 = coSs ? Math.max(1, trong / 2 - (trong > 10 ? 1 : 0)) : trong;
      const dong = [nh.day, `${ten}: ${dtkHien(gt[i], kieu)}`];
      if (coSs) {
        if (coCap) { const p = dtkDoi(gt[i], ss[i]); dong.push(`${t('Kỳ so sánh')} (${dtkNhan(c.ss, nhom).day}): ${dtkHien(ss[i], kieu)}${p == null ? '' : ` (${p > 0 ? '+' : ''}${so(p)}%)`}`); }
        else dong.push(t('Kỳ so sánh: không có ngày tương ứng'));
      }
      dong.push(`${t('Mua mới')}: ${so(c.mua_moi)} · ${t('Gia hạn')}: ${so(c.gia_han)} · ${t('Hoàn tiền')}: ${so(c.hoan_tien)}`);
      for (const m of mt) dong.push(`${m.nhan}: ${dtTien(m.v[i])}`);
      const tip = dong.join('\n');
      return `<g class="pt-bar" tabindex="0" data-tip="${esc(tip)}"><rect x="${x0}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/>`
        + (coSs ? (coCap ? mot(x0 + (bw - trong) / 2, ss[i], w1, 'var(--primary)', '.35') : '') : '')
        + mot(x0 + (bw - trong) / 2 + (coSs ? trong - w1 : 0), gt[i], w1, 'var(--primary)', '')
        + `<title>${esc(tip)}</title></g>`
        + ((i % bn === 0 || (i === n - 1 && (n - 1) % bn >= Math.ceil(bn * 0.75))) ? `<text class="pt-ax" x="${x0 + bw / 2}" y="${H - 7}" text-anchor="middle">${esc(nh.ngan)}</text>` : '');
    }).join('');
    const duongMt = mtVe.map((m, k) => {
      const d = m.v.map((v, i) => `${i ? 'L' : 'M'}${(L + i * bw).toFixed(1)},${y(v).toFixed(1)}H${(L + (i + 1) * bw).toFixed(1)}`).join('');
      const mau = k ? 'var(--pt-s3)' : 'var(--pt-s2)';
      return `<path d="${d}" fill="none" stroke="${mau}" stroke-width="1.5" stroke-dasharray="6 4"/><text class="pt-ax" x="${W - R + 5}" y="${y(m.v[n - 1]) + 4}" style="font-weight:700">${so(Math.round(m.v[n - 1]))}</text>`;
    }).join('');
    return `<svg class="pt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ten)}">${luoi}${cots}${duongMt}</svg>`;
  }

  /** Một ô CSV an toàn: luôn bọc nháy kép; ô CHỮ bắt đầu bằng = + - @ (hoặc tab / xuống dòng) được thêm dấu ' phía trước để bảng tính không coi là công thức. Số thật (kể cả số âm) giữ nguyên là số. */
  function csvO(v) {
    if (v == null) return '""';
    if (typeof v === 'number' && Number.isFinite(v)) return `"${v}"`;
    let s = String(v);
    if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r\n]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }
  const dtkSach = (v) => String(v == null ? '' : v).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const dtkTenTep = (ky) => `himo-doanh-thu-${dtkSach(ky.nhom)}-${dtkSach(ky.tu_ngay)}_${dtkSach(ky.den_ngay)}-${dtkSach(ky.tz || 'UTC')}.csv`;
  /** Nhãn cột trong CSV: dạng ISO (2026 · 2026-11 · 2026-11-18) — bảng tính không đoán nhầm ngày / tháng và không tự gán năm hiện tại. */
  const dtkNhanCsv = (c, nhom) => { const a = dtkNgay(c.tu); return !a ? String(c.tu || '') : nhom === 'nam' ? a.y : nhom === 'thang' ? `${a.y}-${a.m}` : `${a.y}-${a.m}-${a.d}`; };
  /** CSV của ĐÚNG những gì bảng đang hiện: các dòng mô tả, một dòng mỗi cột, dòng tổng. Không có dữ liệu về người dùng nào.
   *  Bộ lọc ghi theo `ky.loc` — bộ lọc máy chủ ĐÃ DÙNG cho chính các con số này (không theo lựa chọn vừa đổi trên màn hình mà số chưa về). */
  function dtkCsv(ky) {
    const loc = ky.loc || {};
    const coSs = ky.so_sanh !== 'khong';
    const dau = [t('Kỳ'), t('Từ ngày'), t('Đến ngày'), t('Doanh thu gộp (USD)'), t('Hoàn tiền (USD)'), t('Doanh thu ròng (USD)'), t('Thực nhận ước tính (USD)'), t('Mua mới'), t('Gia hạn'), t('Mua lẻ'), t('Hoàn tiền'), t('Giao dịch trả tiền'),
      ...(coSs ? [t('Kỳ so sánh — từ ngày'), t('Kỳ so sánh — đến ngày'), t('Kỳ so sánh — thực nhận (USD)'), t('Kỳ so sánh — gộp (USD)')] : [])];
    const tg = ky.tong || {}, ts = ky.tong_ss || {};
    const dong = [[t('Doanh thu HIMO Plus theo kỳ'), ky.luc || ''], [t('Khoảng'), `${ky.tu_ngay} → ${ky.den_ngay}`, ky.tz], [t('Xem theo'), dtkTenNhom(ky.nhom)], [t('So sánh'), dtkTenSs(ky.so_sanh)], [t('Môi trường'), ky.moi_truong],
      [t('Lọc'), loc.cua_hang || '', loc.san_pham || '', loc.quoc_gia || ''], [], dau];
    for (const c of ky.cot || []) {
      const s = c.ss && c.ss.co ? c.ss : null;
      dong.push([dtkNhanCsv(c, ky.nhom), c.tu, c.den, n0(c.gop), n0(c.hoan), n0(c.rong), n0(c.thuc_nhan), n0(c.mua_moi), n0(c.gia_han), n0(c.mua_le), n0(c.hoan_tien), n0(c.tra_tien),
        ...(coSs ? [s ? s.tu : '', s ? s.den : '', s ? n0(s.thuc_nhan) : '', s ? n0(s.gop) : ''] : [])]);
    }
    dong.push([t('Tổng'), ky.tu_ngay, ky.den_ngay, n0(tg.gop), n0(tg.hoan), n0(tg.rong), n0(tg.thuc_nhan), n0(tg.mua_moi), n0(tg.gia_han), n0(tg.mua_le), n0(tg.hoan_tien), n0(tg.tra_tien),
      ...(coSs ? [ts.tu || '', ts.den || '', n0(ts.thuc_nhan), n0(ts.gop)] : [])]);
    return '﻿' + dong.map((d) => d.map(csvO).join(',')).join('\r\n');
  }

  /** Thẻ "Tháng này": thực nhận từ đầu tháng so với hai mục tiêu, ước tính cuối tháng, còn cần bao nhiêu mỗi ngày. */
  function dtkThangNay(ky, st) {
    const tn = ky.thang_nay || {}, mt = ky.muc_tieu || {}, ds = tn.muc_tieu || [];
    const conNgay = n0(tn.ngay_trong_thang) - n0(tn.ngay_da_qua);
    const hang = ds.map((m, k) => {
      const pt = n0(m.pt), dat = n0(m.con_thieu) <= 0;
      const phu = dat ? t('Đã đạt mục tiêu này trong tháng.')
        : conNgay > 0 ? `${t('Còn thiếu')} ${dtTien(m.con_thieu)} — ${t('cần')} ${dtTien(m.can_moi_ngay)} ${t('mỗi ngày trong')} ${so(conNgay)} ${t('ngày còn lại')}`
        : `${t('Còn thiếu')} ${dtTien(m.con_thieu)} — ${t('hôm nay là ngày cuối tháng')}`;
      const tip = `${k ? t('Mục tiêu cao') : t('Mục tiêu thấp')}: ${dtTien(m.usd)}\n${t('Thực nhận từ đầu tháng')}: ${dtTien(tn.thuc_nhan)} (${so(pt)}%)\n${t('Ước tính cuối tháng')}: ${so(n0(m.uoc_tinh_pt))}% ${t('của mục tiêu')}`;
      return `<div class="cd-row tien dtk-mt" tabindex="0" data-tip="${esc(tip)}"><span class="cd-l"><b>${esc(dtTien(tn.thuc_nhan))}</b> / ${esc(dtTien(m.usd))}<span class="dtk-mt-t">${k ? t('Mục tiêu cao') : t('Mục tiêu thấp')}</span></span>
          <span class="cd-p">${so(pt)}%</span><span class="cd-b"><i style="width:${Math.max(pt > 0 ? 1.5 : 0, Math.min(100, pt))}%;background:${k ? 'var(--pt-s3)' : 'var(--pt-s2)'}"></i></span></div>
        <div class="hint" style="margin:-2px 0 8px">${esc(phu)}</div>`;
    }).join('');
    const form = !st.mtMo || !mt.sua_duoc ? '' : `<div class="card" id="dtkMtForm" style="margin-top:10px">
        <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
          <label style="display:flex;flex-direction:column;gap:4px;font-size:13px">${t('Mục tiêu thấp (USD mỗi tháng)')}<input id="dtkMtThap" type="number" inputmode="decimal" min="0.01" max="10000000" step="0.01" value="${esc(String(st.mtThap != null ? st.mtThap : n0(mt.thap)))}" ${st.mtXacNhan ? 'disabled' : ''}></label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:13px">${t('Mục tiêu cao (USD mỗi tháng)')}<input id="dtkMtCao" type="number" inputmode="decimal" min="0.01" max="10000000" step="0.01" value="${esc(String(st.mtCao != null ? st.mtCao : n0(mt.cao)))}" ${st.mtXacNhan ? 'disabled' : ''}></label>
          ${st.mtXacNhan ? `<button type="button" class="btn sm primary" id="dtkMtXacNhan">${t('Xác nhận đổi')}</button>` : `<button type="button" class="btn sm" id="dtkMtLuu">${t('Lưu mục tiêu')}</button>`}
          <button type="button" class="btn sm" id="dtkMtHuy">${t('Huỷ')}</button>
        </div>
        ${st.mtXacNhan ? `<div class="alertbar warn" style="margin-top:10px"><div><b>${t('Đổi mục tiêu?')}</b><br>${esc(dtTien(mt.thap))} / ${esc(dtTien(mt.cao))} → ${esc(dtTien(st.mtThap))} / ${esc(dtTien(st.mtCao))}. ${t('Thay đổi được ghi vào nhật ký quản trị.')}</div></div>` : ''}
        ${st.mtLoi ? `<div class="alertbar" style="margin-top:10px" role="alert"><div>${esc(st.mtLoi)}</div></div>` : ''}
      </div>`;
    return the(t('Tháng này'), `${esc(fmtNgayDt(tn.tu))} → ${esc(fmtNgayDt(tn.den))} · ${t('ngày thứ')} ${so(tn.ngay_da_qua)}/${so(tn.ngay_trong_thang)} · ${esc(ky.tz || '')}`,
      `<div class="cd-rows">${hang}</div>
       <div class="hint">${t('Ước tính cuối tháng')}: <b>${esc(dtTien(tn.uoc_tinh_cuoi_thang))}</b> — ${t('ƯỚC TÍNH theo đường thẳng (thực nhận từ đầu tháng ÷ số ngày đã qua × số ngày của tháng); tháng có đợt gia hạn dồn vào một ngày thì lệch.')}</div>
       ${n0(tn.thieu_ti_le) ? `<div class="hint" id="dtkThieu">${so(tn.thieu_ti_le)} ${t('giao dịch chưa rõ thuế / phí')} — ${t('chưa cộng vào thực nhận.')}</div>` : ''}
       <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><span class="hint">${t('Mục tiêu là thực nhận ước tính mỗi tháng, theo bộ lọc đang chọn.')}</span>
         ${mt.sua_duoc && !st.mtMo ? `<button type="button" class="btn sm" id="dtkMtMo">${t('Đặt mục tiêu')}</button>` : ''}</div>${form}`, 'dtkThang');
  }

  /** Bảng dưới biểu đồ: một dòng mỗi cột + dòng tổng — cũng là bản đọc được bằng trình đọc màn hình của biểu đồ. */
  function dtkBang(ky) {
    const coSs = ky.so_sanh !== 'khong', tg = ky.tong || {}, ts = ky.tong_ss || {};
    const o1 = (v) => `<td class="num">${esc(dtTien(v))}</td>`, o2 = (v) => `<td class="num">${so(v)}</td>`;
    const doi = (a, b) => { const p = dtkDoi(n0(a), n0(b)); return p == null ? '—' : `${p > 0 ? '+' : ''}${so(p)}%`; };
    const dong = (ky.cot || []).map((c) => { const s = c.ss && c.ss.co ? c.ss : null; return `<tr><th scope="row">${esc(dtkNhan(c, ky.nhom).day)}</th>${o1(c.gop)}${o1(c.hoan)}${o1(c.rong)}<td class="num"><b>${esc(dtTien(c.thuc_nhan))}</b></td>${o2(c.mua_moi)}${o2(c.gia_han)}${o2(c.mua_le)}${o2(c.hoan_tien)}${o2(c.tra_tien)}
      ${coSs ? `<td class="num">${s ? esc(dtTien(s.thuc_nhan)) : '—'}</td><td class="num">${s ? esc(doi(c.thuc_nhan, s.thuc_nhan)) : '—'}</td>` : ''}</tr>`; }).join('');
    return `<div class="scrollx"><table class="tbl" id="dtkBang"><caption class="hint" style="text-align:left;padding-bottom:6px">${t('Một dòng cho mỗi cột của biểu đồ.')}</caption><thead><tr>
        <th scope="col">${t('Kỳ')}</th><th scope="col" class="num">${t('Gộp')}</th><th scope="col" class="num">${t('Hoàn tiền')}</th><th scope="col" class="num">${t('Ròng')}</th><th scope="col" class="num">${t('Thực nhận')}</th>
        <th scope="col" class="num">${t('Mua mới')}</th><th scope="col" class="num">${t('Gia hạn')}</th><th scope="col" class="num">${t('Mua lẻ')}</th><th scope="col" class="num">${t('Lần hoàn')}</th><th scope="col" class="num">${t('Giao dịch trả tiền')}</th>
        ${coSs ? `<th scope="col" class="num">${t('Thực nhận kỳ so sánh')}</th><th scope="col" class="num">${t('Thay đổi')}</th>` : ''}</tr></thead>
      <tbody>${dong}</tbody>
      <tfoot><tr><th scope="row">${t('Tổng')}</th>${o1(tg.gop)}${o1(tg.hoan)}${o1(tg.rong)}<td class="num"><b>${esc(dtTien(tg.thuc_nhan))}</b></td>${o2(tg.mua_moi)}${o2(tg.gia_han)}${o2(tg.mua_le)}${o2(tg.hoan_tien)}${o2(tg.tra_tien)}
        ${coSs ? `<td class="num">${esc(dtTien(ts.thuc_nhan))}</td><td class="num">${esc(doi(tg.thuc_nhan, ts.thuc_nhan))}</td>` : ''}</tr></tfoot></table></div>`;
  }

  /** Khối "theo kỳ" của thẻ Doanh thu. ky = kết quả admin_doanh_thu_ky · null (máy chủ chưa có 202) · { error }. st = trạng thái bộ chọn (admin.js giữ). */
  function dtkKhoi(ky, st) {
    if (!ky) return `<div class="dtk"><div class="hint" id="dtkChuaCo">${t('Máy chủ chưa có bản vá 202 — chưa xem được theo tuần / tháng / năm, so cùng kỳ và mục tiêu. Phần bên dưới chạy như cũ.')}</div></div>`;
    if (ky.error === 'forbidden') return '';
    // Kết quả có hình dạng lạ (không phải của 202) → coi như lỗi: một dòng báo, không vẽ nửa chừng.
    if (!ky.error && (!Array.isArray(ky.cot) || !['ngay', 'tuan', 'thang', 'nam'].includes(ky.nhom) || ky.cot.some((c) => !c || typeof c !== 'object'))) ky = { error: 'loi' };
    const chip = (thuoc, k, nhan, dang, khoa) => `<button type="button" class="chip" data-${thuoc}="${k}" aria-pressed="${dang === k}"${khoa ? ' disabled' : ''}>${nhan}</button>`;
    const cho1 = !!st.dangHoi;       // đang chờ máy chủ trả số cho lựa chọn vừa bấm: khoá bộ chọn tới khi số về
    const NHOM = [['ngay', t('Ngày')], ['tuan', t('Tuần')], ['thang', t('Tháng')], ['nam', t('Năm')]];
    const KY = [['thang_nay', t('Tháng này')], ['thang_truoc', t('Tháng trước')], ['quy_nay', t('Quý này')], ['nam_nay', t('Năm nay')], ['nam_truoc', t('Năm trước')], ['12_thang', t('12 tháng')], ['tat_ca', t('Tất cả')]];
    const SS = [['khong', t('Không so sánh')], ['ky_truoc', t('Kỳ trước')], ['cung_ky_nam_truoc', t('Cùng kỳ năm trước')]];
    const KIEU = [['thuc_nhan', t('Thực nhận (USD)')], ['gop', t('Doanh thu gộp (USD)')], ['gd', t('Số giao dịch')]];
    const tuy = st.ky === 'tuy_chon';
    const chon = `<div class="card cd-loc" id="dtkChon"${cho1 ? ' aria-busy="true" style="opacity:.6"' : ''}>
      <div class="cd-lr"><span class="cd-lb">${t('Xem theo')}</span><div class="chips" role="group" aria-label="${t('Xem theo')}">${NHOM.map(([k, l]) => chip('dtk-nhom', k, l, st.nhom, cho1)).join('')}</div></div>
      <div class="cd-lr"><span class="cd-lb">${t('Khoảng')}</span><div class="chips" role="group" aria-label="${t('Khoảng')}">${KY.map(([k, l]) => chip('dtk-ky', k, l, st.ky, cho1)).join('')}${chip('dtk-ky', 'tuy_chon', t('Tuỳ chọn'), st.ky, cho1)}</div></div>
      ${tuy ? `<div class="cd-lr"><span class="cd-lb"></span><div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">
          <label style="display:flex;flex-direction:column;gap:4px;font-size:13px">${t('Từ ngày')}<input id="dtkTu" type="date" value="${esc(st.tuNhap != null ? st.tuNhap : st.tu || '')}"></label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:13px">${t('Đến ngày')}<input id="dtkDen" type="date" value="${esc(st.denNhap != null ? st.denNhap : st.den || '')}"></label>
          <button type="button" class="btn sm" id="dtkXem">${t('Xem')}</button><span class="hint" id="dtkLoiNgay"${st.loiNgay ? ' role="alert"' : ''}>${esc(st.loiNgay || '')}</span></div></div>` : ''}
      <div class="cd-lr"><span class="cd-lb">${t('So sánh')}</span><div class="chips" role="group" aria-label="${t('So sánh')}">${SS.map(([k, l]) => chip('dtk-ss', k, l, st.ss, cho1)).join('')}</div></div>
    </div>`;
    if (ky.error) {
      const loi = ky.error === 'qua_nhieu_cot' ? `${t('Khoảng này có')} ${so(ky.so_cot)} ${t('cột — tối đa')} ${so(ky.toi_da)}. ${t('Chọn Tuần / Tháng / Năm, hoặc rút ngắn khoảng.')}`
        : ky.error === 'khoang_qua_dai' ? t('Khoảng dài quá 5 năm. Rút ngắn khoảng.')
        : ky.error === 'khoang_nguoc' ? t('Ngày bắt đầu đang sau ngày kết thúc.')
        : ky.error === 'ngay_sai' ? t('Ngày không hợp lệ. Chọn lại hai ngày (từ năm 2020).')
        : t('Máy chủ không trả được số liệu theo kỳ.');
      return `<div class="dtk"><div class="sec lon"><h2>${t('Theo kỳ')}</h2></div>${chon}<div class="alertbar warn" id="dtkLoi" role="status"><div>${esc(loi)}</div></div></div>`;
    }
    const kieu = ['thuc_nhan', 'gop', 'gd'].includes(st.so) ? st.so : 'thuc_nhan';
    const coSs = ky.so_sanh !== 'khong';
    const cot = ky.cot || [], tg = ky.tong || {}, ts = ky.tong_ss || {};
    const trong = !(ky.so || {}).co_giao_dich;
    const mt = ky.muc_tieu || {};
    const mucTieu = kieu === 'thuc_nhan' ? [{ usd: n0(mt.thap), nhan: t('Mục tiêu thấp') }, { usd: n0(mt.cao), nhan: t('Mục tiêu cao') }].filter((m) => m.usd > 0) : [];
    const coDuongMt = mucTieu.length && ky.nhom !== 'tuan';
    const maxCot = Math.max(0, ...cot.map((c) => dtkGt(c, kieu)), ...cot.map((c) => (coSs && c.ss && c.ss.co ? dtkGt(c.ss, kieu) : 0)));
    const ngoaiKhung = coDuongMt ? mucTieu.filter((m) => { const v = cot.map((c) => dtkMucTieuCot(c, ky.nhom, m.usd)); return !(maxCot > 0 && Math.max(...v) <= maxCot * DTK_MT_TOI_DA); }) : [];
    const tenKieu = KIEU.find(([k]) => k === kieu)[1];
    const tongHien = kieu === 'gd' ? so(tg.tra_tien) : esc(dtTien(kieu === 'gop' ? tg.gop : tg.thuc_nhan));
    const tongSs = kieu === 'gd' ? n0(ts.tra_tien) : n0(kieu === 'gop' ? ts.gop : ts.thuc_nhan);
    const bieuDo = the(`${t('Theo kỳ')} — ${NHOM.find(([k]) => k === ky.nhom)[1]}`, `${esc(fmtNgayDt(ky.tu_ngay))} → ${esc(fmtNgayDt(ky.den_ngay))} · ${esc(ky.tz || '')}${ky.tz_khong_hop_le ? ` (${t('múi giờ của trình duyệt không dùng được — đang tính theo giờ Việt Nam')})` : ''}`,
      `<div class="row" style="margin-bottom:8px;gap:8px;flex-wrap:wrap;justify-content:space-between">
         <span class="chips" role="group" aria-label="${t('Số liệu')}">${KIEU.map(([k, l]) => chip('dtk-so', k, l, kieu)).join('')}</span>
         <span class="row" style="gap:8px"><b>${t('Tổng')}: ${tongHien}</b>${coSs ? `<span class="hint">${t('kỳ so sánh')}: ${kieu === 'gd' ? so(tongSs) : esc(dtTien(tongSs))} ${dtkHuyHieu(n0(kieu === 'gd' ? tg.tra_tien : kieu === 'gop' ? tg.gop : tg.thuc_nhan), tongSs)}</span>` : ''}
           <button type="button" class="btn sm" id="dtkCsv">${t('Xuất CSV')}</button></span></div>
       ${trong ? `<div class="alertbar ok" id="dtkTrong"><div>${t('Chưa có giao dịch — số liệu sẽ hiện khi có lượt mua đầu tiên')}</div></div>` : ''}
       ${chuThich([{ ten: tenKieu, mau: 'var(--primary)' }, ...(coSs ? [{ ten: t('Kỳ so sánh'), mau: 'color-mix(in srgb, var(--primary) 35%, transparent)' }] : []),
          ...(coDuongMt ? mucTieu.filter((m) => !ngoaiKhung.includes(m)).map((m, k) => ({ ten: `${m.nhan} (${ky.nhom === 'ngay' ? t('chia đều theo ngày') : ky.nhom === 'nam' ? t('× 12 tháng') : t('mỗi tháng')})`, mau: k ? 'var(--pt-s3)' : 'var(--pt-s2)' })) : [])])}
       ${cot.length ? cho((W) => { try { return cotKy(cot, { nhom: ky.nhom, kieu, coSs, mucTieu: coDuongMt ? mucTieu : [], ten: tenKieu, W }); } catch (e) { return ''; } }) : `<div class="hint">${t('Chưa có dữ liệu.')}</div>`}
       ${ngoaiKhung.length ? `<div class="hint" id="dtkMtNgoai">${t('Đường mục tiêu không vẽ vì cao hơn nhiều lần cột cao nhất')}: ${ngoaiKhung.map((m) => `${esc(m.nhan)} ${esc(dtTien(dtkMucTieuCot(cot[cot.length - 1], ky.nhom, m.usd)))}`).join(' · ')}.</div>` : ''}
       ${mucTieu.length && ky.nhom === 'tuan' ? `<div class="hint">${t('Xem theo tuần không có đường mục tiêu (mục tiêu tính theo tháng).')}</div>` : ''}
       ${ky.cat_5_nam ? `<div class="hint">${t('"Tất cả" đang hiện 5 năm gần nhất.')}</div>` : ''}
       ${n0(tg.thieu_ti_le) ? `<div class="hint">${so(tg.thieu_ti_le)} ${t('giao dịch chưa rõ thuế / phí')} — ${t('chưa cộng vào thực nhận.')}</div>` : ''}
       ${dtkBang(ky)}`, 'dtkBieuDo');
    return `<div class="dtk"><div class="sec lon"><h2>${t('Theo kỳ')}</h2><span class="hint">${t('ngày, tuần, tháng, năm — so cùng kỳ — mục tiêu tháng')}</span></div>${chon}${dtkThangNay(ky, st)}${bieuDo}</div>`;
  }

  /** Khối theo kỳ không bao giờ được làm hỏng phần cũ của thẻ: gặp điều bất ngờ → một dòng báo lỗi, phần bên dưới vẫn vẽ. */
  function dtkAnToan(ky, st) { try { return dtkKhoi(ky, st); } catch (e) { try { return dtkKhoi({ error: 'loi' }, st); } catch (e2) { return ''; } } }

  /** Nối nút của khối theo kỳ. tt: { dt, doiKy(fn) (đổi bộ chọn rồi hỏi lại máy chủ), veLai() (vẽ lại, không hỏi máy chủ), datMucTieu(thap, cao) → Promise, tai(ten, noiDung) }. */
  let dtkTieuDiem = '';       // bộ chọn CSS của nút cần nhận lại tiêu điểm sau lần vẽ kế tiếp (bấm nút → khối được vẽ lại bằng DOM mới)
  /** Trước khi vẽ lại mà không do một cú bấm (tự làm mới): nhớ nút / ô của khối theo kỳ đang giữ tiêu điểm. Chỉ nhận tên thuộc tính và id do chính tệp này sinh ra. */
  function dtkNhoTieuDiem(main) {
    if (dtkTieuDiem) return;
    const a = document.activeElement;
    if (!a || !a.closest || !main.contains(a) || !a.closest('.dtk')) return;
    const tn = Array.from(a.attributes || []).find((x) => /^data-dtk-(nhom|ky|ss|so)$/.test(x.name) && /^[a-z0-9_]+$/.test(x.value));
    dtkTieuDiem = tn ? `[${tn.name}="${tn.value}"]` : (/^dtk[A-Za-z]+$/.test(a.id || '') ? `#${a.id}` : '');
  }
  function dtkNoi(main, ky, tt) {
    const st = tt.dt;
    if (dtkTieuDiem) {
      const dich = main.querySelector(dtkTieuDiem), a = document.activeElement;
      dtkTieuDiem = '';
      // chỉ đặt lại khi tiêu điểm đang "rơi" (nút cũ đã bị thay) hoặc còn trong thẻ này — không giật tiêu điểm khỏi hộp thoại / ô nhập ở nơi khác
      if (dich && !dich.disabled && (!a || a === document.body || !a.isConnected || main.contains(a))) { try { dich.focus({ preventScroll: true }); } catch (e) { /* trình duyệt cũ */ } }
    }
    const khoa = () => { const k = main.querySelector('#dtkChon'); if (k) { k.setAttribute('aria-busy', 'true'); k.style.opacity = '.6'; k.querySelectorAll('button,input').forEach((b) => { b.disabled = true; }); } };
    const nut = (thuoc, fn) => main.querySelectorAll(`[data-${thuoc}]`).forEach((b) => b.addEventListener('click', () => { const k = b.getAttribute(`data-${thuoc}`); dtkTieuDiem = `[data-${thuoc}="${k}"]`; fn(k); }));
    nut('dtk-nhom', (k) => { khoa(); tt.doiKy((s) => { s.nhom = k; }); });
    nut('dtk-ss', (k) => { khoa(); tt.doiKy((s) => { s.ss = k; }); });
    nut('dtk-so', (k) => { st.so = k; tt.veLai(); });
    nut('dtk-ky', (k) => {
      if (k === 'tuy_chon') { st.ky = 'tuy_chon'; st.loiNgay = ''; if (!st.tu && ky && ky.tu_ngay) { st.tu = ky.tu_ngay; st.den = ky.den_ngay; } dtkTieuDiem = '#dtkTu'; tt.veLai(); return; }
      khoa(); tt.doiKy((s) => { s.ky = k; s.loiNgay = ''; s.tuNhap = null; s.denNhap = null; });
    });
    // hai ô ngày: giữ điều đang gõ dở (lượt tự làm mới không được xoá mất) — chỉ thành khoảng thật khi bấm "Xem" và hợp lệ
    const oTu = main.querySelector('#dtkTu'), oDen = main.querySelector('#dtkDen');
    if (oTu) oTu.addEventListener('input', () => { st.tuNhap = oTu.value; });
    if (oDen) oDen.addEventListener('input', () => { st.denNhap = oDen.value; });
    const xem = main.querySelector('#dtkXem');
    if (xem) xem.addEventListener('click', () => {
      const tu = (main.querySelector('#dtkTu') || {}).value || '', den = (main.querySelector('#dtkDen') || {}).value || '';
      const ok = /^\d{4}-\d{2}-\d{2}$/.test(tu) && /^\d{4}-\d{2}-\d{2}$/.test(den);
      if (!ok) { st.loiNgay = t('Chọn đủ hai ngày.'); st.tuNhap = tu; st.denNhap = den; dtkTieuDiem = '#dtkTu'; tt.veLai(); return; }
      if (tu > den) { st.loiNgay = t('Ngày bắt đầu đang sau ngày kết thúc.'); st.tuNhap = tu; st.denNhap = den; dtkTieuDiem = '#dtkTu'; tt.veLai(); return; }
      dtkTieuDiem = '#dtkXem'; khoa(); tt.doiKy((s) => { s.ky = 'tuy_chon'; s.tu = tu; s.den = den; s.loiNgay = ''; s.tuNhap = null; s.denNhap = null; });
    });
    const csv = main.querySelector('#dtkCsv');
    if (csv && ky && !ky.error) csv.addEventListener('click', () => tt.tai(dtkTenTep(ky), dtkCsv(ky)));
    const mo = main.querySelector('#dtkMtMo');
    if (mo) mo.addEventListener('click', () => { st.mtMo = true; st.mtXacNhan = false; st.mtLoi = ''; st.mtThap = null; st.mtCao = null; dtkTieuDiem = '#dtkMtThap'; tt.veLai(); });
    const huy = main.querySelector('#dtkMtHuy');
    if (huy) huy.addEventListener('click', () => { st.mtMo = false; st.mtXacNhan = false; st.mtLoi = ''; st.mtThap = null; st.mtCao = null; dtkTieuDiem = '#dtkMtMo'; tt.veLai(); });
    const luu = main.querySelector('#dtkMtLuu');
    if (luu) luu.addEventListener('click', () => {
      const a = Number((main.querySelector('#dtkMtThap') || {}).value), b = Number((main.querySelector('#dtkMtCao') || {}).value);
      st.mtThap = a; st.mtCao = b;
      if (!dtkSoMucTieu(a) || !dtkSoMucTieu(b)) st.mtLoi = t('Mỗi mục tiêu phải lớn hơn 0, không quá 10 000 000 và tối đa hai chữ số thập phân.');
      else if (a > b) st.mtLoi = t('Mục tiêu thấp không được lớn hơn mục tiêu cao.');
      else { st.mtLoi = ''; st.mtXacNhan = true; st.mtThap = Math.round(a * 100) / 100; st.mtCao = Math.round(b * 100) / 100; }
      dtkTieuDiem = st.mtXacNhan ? '#dtkMtXacNhan' : '#dtkMtThap';
      tt.veLai();
    });
    const xn = main.querySelector('#dtkMtXacNhan');
    if (xn) xn.addEventListener('click', () => {
      xn.disabled = true;
      tt.datMucTieu(st.mtThap, st.mtCao).then((r) => {
        if (r && r.ok) { st.mtMo = false; st.mtXacNhan = false; st.mtLoi = ''; st.mtThap = null; st.mtCao = null; dtkTieuDiem = '#dtkMtMo'; tt.doiKy(() => undefined); return; }
        st.mtXacNhan = false; dtkTieuDiem = '#dtkMtThap';
        st.mtLoi = r && r.error === 'forbidden' ? t('Chỉ vai Chủ (owner) đặt được mục tiêu.')
          : r && r.error === 'mfa' ? t('Cần xác thực hai lớp để đổi mục tiêu. Vào Hệ thống → Vận hành để bật, rồi đăng nhập lại.')
          : r && r.error === 'thu_tu' ? t('Mục tiêu thấp không được lớn hơn mục tiêu cao.')
          : r && r.error === 'so_sai' ? t('Mỗi mục tiêu phải lớn hơn 0, không quá 10 000 000 và tối đa hai chữ số thập phân.')
          : t('Chưa đổi được mục tiêu. Thử lại.');
        tt.veLai();
      });
    });
  }

  // ================================================================ TỔNG QUAN — DASHBOARD (19/11/2026, bản 3 sau ba lượt kiểm độc lập)
  // Chủ dự án: "dashboard thật đẹp và đầy đủ hầu hết các dữ liệu", "các biểu đồ khác nhau rồi màu sắc cho đẹp lên như Tableau", "nhìn dashboard là
  // phải biết được insight", "phải đẹp thẩm mỹ, vẫn phải đúng dữ liệu thực tế". Tài liệu: docs/release/DASHBOARD-QUAN-TRI.md.
  // Thứ tự nhóm: Hôm nay · Tăng trưởng · Doanh thu · An toàn & nội dung · Người dùng · Hệ thống · Điều đáng chú ý · Cần làm ngay (hai nhóm cuối theo
  // ý chủ dự án; có việc gấp thì thanh đi nhanh dính trên đầu hiện nút đỏ nêu việc gấp nhất).
  // Luật số liệu: chỉ so NGÀY TRỌN (hôm nay chưa hết ngày không đem so); ngày của máy chủ là ngày UTC — ghi rõ; ngày trước khi có số hoạt động
  // (do_tu) là "chưa có dữ liệu", không phải 0; mỗi nhãn nói đúng điều trường đó đếm; mẫu nhỏ thì không kết luận.
  // Màu: --tq-1..8 phân loại (đã chạy bộ kiểm mù màu sáng + tối); xanh / vàng / đỏ chỉ cho TRẠNG THÁI, luôn kèm chữ.
  // Tệp này chỉ vẽ; admin.js gọi máy chủ.
  const TQ = (i) => `var(--tq-${i})`;
  let tqId = 0;
  const KHAC = '\u0001khac';
  function spark(gt, mau, W = 132, H = 34) {
    const v = (gt || []).filter((x) => x != null).map(n0); if (v.length < 2) return '';
    const max = Math.max(...v), min = Math.min(0, ...v), cao = Math.max(1, max - min);
    const x = (i) => 2 + (i * (W - 6)) / (v.length - 1);
    const y = (a) => H - 3 - ((a - min) / cao) * (H - 8);
    const d = v.map((a, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(a).toFixed(1)}`).join('');
    return `<svg class="tq-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}L${x(v.length - 1).toFixed(1)},${H}L${x(0)},${H}Z" fill="${mau}" fill-opacity=".13"/>`
      + `<path d="${d}" fill="none" stroke="${mau}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  }
  /** Ô số: chấm màu + nhãn, giá trị, dòng so sánh (đã kèm chữ nói so với gì), dòng phụ, đường nhỏ. */
  function tqO({ nhan, gt, so2, phu, duong: dg, mau = TQ(1), go, canh, vong }) {
    return `<div class="tq-kpi${canh ? ` tq-${canh}` : ''}"${go ? ` data-go="${go}" tabindex="0" role="link"` : ''} style="--c:${mau}">
      <div class="tq-kl"><i aria-hidden="true"></i>${esc(nhan)}</div>${vong != null ? `<div class="tq-kvr"><div class="tq-kv">${gt}</div><span class="tq-kvong" aria-hidden="true">${vongPt(vong, { mau, co: 46, day: 6 })}</span></div>` : `<div class="tq-kv">${gt}</div>`}
      ${so2 ? `<div class="tq-kb">${so2}</div>` : ''}${phu ? `<div class="tq-kp">${phu}</div>` : ''}${dg ? spark(dg, mau) : ''}</div>`;
  }
  const tqThe = (tieuDe, phu, than, { cot = 6, go } = {}) => `<section class="card tq-the tq-c${cot}">
    <div class="tq-th"><div><h3>${esc(tieuDe)}</h3>${phu ? `<span class="hint">${phu}</span>` : ''}</div>${go ? `<button class="tq-xem" data-go="${go}">${t('Xem chi tiết')} →</button>` : ''}</div>${than}</section>`;
  /** "▲ 12%" kèm chữ nói so với gì; đổi dưới 0,5 % → "không đổi". tot: 'len' | 'xuong'. */
  function soVoi(cur, prev, voi, tot = 'len') {
    if (cur == null || prev == null) return '';
    if (!n0(prev)) return n0(cur) ? `<span class="pt-d pt-d0">${t('mới có')}</span> <span>${esc(voi)}</span>` : '';
    const p = ((n0(cur) - n0(prev)) / n0(prev)) * 100;
    if (Math.abs(p) < 0.5) return `<span class="pt-d pt-d0">${t('không đổi')}</span> <span>${esc(voi)}</span>`;
    return `${bienDong(n0(cur), n0(prev), tot)} <span>${esc(voi)}</span>`;
  }
  /** Đổi của một TỈ LỆ: "+2,1 điểm" (không phải % của %). */
  function diem(cur, prev, voi) {
    if (cur == null || prev == null) return '';
    const d = Math.round((cur - prev) * 10) / 10;
    const cls = Math.abs(d) < 0.5 ? 'pt-d0' : d > 0 ? 'pt-dtot' : 'pt-dxau';
    return `<span class="pt-d ${cls}">${Math.abs(d) < 0.5 ? t('không đổi') : `${d > 0 ? '+' : '−'}${so(Math.abs(d))} ${t('điểm')}`}</span> <span>${esc(voi)}</span>`;
  }

  /** Vùng / đường, MỘT trục. Rê chuột → đường dò + chấm + chú giải. Cả biểu đồ là MỘT điểm dừng bàn phím, nhãn đọc màn hình là câu tóm tắt. */
  function vung(chuoi, nhan, { cao = 220, W = 640, tien, nhanTruc, tomTat = '' } = {}) {
    const H = cao, L = 50, R = 14, T = 12, B = 26, n = nhan.length;
    const max = Math.max(1, ...chuoi.flatMap((c) => c.gt.filter((v) => v != null).map(n0)));
    const { top, ticks } = mocTruc(max);
    const x = (i) => L + (n <= 1 ? 0 : (i * (W - L - R)) / (n - 1));
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const hien = (v) => (tien ? tien(v) : so(v));
    const luoi = ticks.map((v) => `<line class="pt-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="pt-ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${esc(tien ? tien(v, true) : so(v))}</text>`).join('');
    const bn = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 74))));
    const truc = (nhanTruc || nhan).map((s, i) => (i % bn === 0 || i === n - 1) && !(i !== n - 1 && n - 1 - i < bn / 2) ? `<text class="pt-ax" x="${x(i)}" y="${H - 7}" text-anchor="${i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'}">${esc(s)}</text>` : '').join('');
    let defs = '';
    const net = chuoi.map((c) => {
      let d = ''; let dang = false; let dau = null, cuoi = null;
      c.gt.forEach((v, i) => { if (v == null) { dang = false; return; } d += `${dang ? 'L' : 'M'}${x(i).toFixed(1)},${y(n0(v)).toFixed(1)}`; dang = true; if (dau == null) dau = i; cuoi = i; });
      if (!d) return '';
      let fill = '';
      if (c.kieu === 'vung' && !c.gt.slice(dau, cuoi + 1).some((v) => v == null)) {
        const id = `tqg${++tqId}`;
        defs += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.mau}" stop-opacity=".30"/><stop offset="1" stop-color="${c.mau}" stop-opacity=".02"/></linearGradient>`;
        fill = `<path d="${d}L${x(cuoi).toFixed(1)},${y(0)}L${x(dau).toFixed(1)},${y(0)}Z" fill="url(#${id})"/>`;
      }
      return `${fill}<path d="${d}" fill="none" stroke="${c.mau}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${c.kieu === 'dut' ? ' stroke-dasharray="5 4"' : ''}/>`;
    }).join('');
    const cot = (W - L - R) / Math.max(1, n - 1);
    const hits = nhan.map((s, i) => {
      const dong = [s, ...chuoi.map((c) => `${c.ten}: ${c.gt[i] == null ? t('chưa có dữ liệu') : hien(n0(c.gt[i]))}`)].join('\n');
      const x0 = Math.max(L, x(i) - cot / 2), w = Math.min(cot, W - R - x0);
      const cham = chuoi.map((c) => (c.gt[i] == null ? '' : `<circle cx="${x(i)}" cy="${y(n0(c.gt[i]))}" r="4.5" fill="${c.mau}" stroke="var(--surface)" stroke-width="2"/>`)).join('');
      return `<g class="tq-hit" data-tip="${esc(dong)}"><rect x="${x0}" y="${T}" width="${w}" height="${H - T - B}" fill="transparent"/><line class="tq-x" x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}"/>${cham}</g>`;
    }).join('');
    return `<svg class="pt-svg tq-svg" viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${esc(tomTat || chuoi.map((c) => c.ten).join(', '))}"><defs>${defs}</defs>${luoi}${truc}${net}${hits}</svg>`;
  }
  /** Cột chồng: cot[{nhan, phan:number[]}], lop[{ten, mau}] — khe 2 px chỉ khi đã có phần nằm dưới; đầu cột bo 4 px. */
  function cotChong(cot, lop, { cao = 200, W = 640, tomTat = '' } = {}) {
    const H = cao, L = 40, R = 8, T = 10, B = 24, n = cot.length;
    const { top, ticks } = mocTruc(Math.max(1, ...cot.map((c) => c.phan.reduce((a, b) => a + n0(b), 0))));
    const bw = (W - L - R) / Math.max(1, n);
    const k = (H - T - B) / top;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const luoi = ticks.map((v) => `<line class="pt-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="pt-ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${so(v)}</text>`).join('');
    const bn = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 64))));
    const cots = cot.map((c, i) => {
      const x0 = L + i * bw + 1, rong = Math.max(1, bw - 3);
      let yy = H - B; let parts = ''; let daVe = false;
      const cuoi = c.phan.map(n0).reduce((a, v, j) => (v > 0 ? j : a), -1);
      c.phan.forEach((v0, j) => {
        const v = n0(v0); if (!v) return;
        const h = v * k; yy -= h;
        const hv = Math.max(0.5, h - (daVe ? 2 : 0));
        parts += j === cuoi ? `<path d="${bar(x0, yy, rong, hv)}" fill="${lop[j].mau}"/>` : `<rect x="${x0}" y="${yy}" width="${rong}" height="${hv}" fill="${lop[j].mau}"/>`;
        daVe = true;
      });
      const dong = [c.nhan, ...lop.map((l, j) => `${l.ten}: ${so(n0(c.phan[j]))}`)].join('\n');
      return `<g class="pt-bar" data-tip="${esc(dong)}"><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/>${parts || `<rect x="${x0}" y="${H - B - 1}" width="${rong}" height="1" fill="var(--line2)"/>`}</g>`
        + ((i % bn === 0 || i === n - 1) && !(i !== n - 1 && n - 1 - i < bn / 2) ? `<text class="pt-ax" x="${L + i * bw + bw / 2}" y="${H - 7}" text-anchor="middle">${esc(c.nhan)}</text>` : '');
    }).join('');
    return `<svg class="pt-svg tq-svg" viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${esc(tomTat || lop.map((l) => l.ten).join(', '))}">${luoi}${cots}</svg>`;
  }
  /** Tròn khuyết (≤ 5 phần, đã xếp lớn → nhỏ, "Khác" cuối) + chú giải có số và %. */
  function tronKhuyet(phan, { phuGiua } = {}) {
    const ds = phan.filter((p) => n0(p.n) > 0);
    const tong = ds.reduce((a, p) => a + n0(p.n), 0);
    const S = 168, c = S / 2, r0 = 78, r1 = 50;
    const pt = (rr, a) => `${(c + rr * Math.cos(a)).toFixed(2)},${(c + rr * Math.sin(a)).toFixed(2)}`;
    const khe = ds.length > 1 ? 0.035 : 0;
    let a = -Math.PI / 2; let lat = '';
    for (const p of ds) {
      const goc = (n0(p.n) / tong) * Math.PI * 2;
      const a0 = a + khe / 2, a1 = Math.max(a0 + 0.001, Math.min(a + goc - khe / 2, a0 + Math.PI * 2 - 0.0005));
      const lon = a1 - a0 > Math.PI ? 1 : 0;
      lat += `<path class="tq-lat" data-tip="${esc(`${p.ten}: ${so(n0(p.n))} (${so(pct1(n0(p.n), tong))}%)`)}" d="M${pt(r0, a0)}A${r0},${r0} 0 ${lon} 1 ${pt(r0, a1)}L${pt(r1, a1)}A${r1},${r1} 0 ${lon} 0 ${pt(r1, a0)}Z" fill="${p.mau}"/>`;
      a += goc;
    }
    if (!ds.length) lat = `<circle cx="${c}" cy="${c}" r="${(r0 + r1) / 2}" fill="none" stroke="var(--surface2)" stroke-width="${r0 - r1}"/>`;
    return `<div class="tq-donut"><svg viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(ds.map((p) => `${p.ten} ${so(pct1(n0(p.n), tong))}%`).join(', '))}">${lat}
      <text x="${c}" y="${c - 2}" text-anchor="middle" class="tq-dg"${so(tong).length > 5 ? ` style="font-size:${so(tong).length > 8 ? 14 : so(tong).length > 6 ? 16 : 19}px"` : ''}>${esc(so(tong))}</text><text x="${c}" y="${c + 16}" text-anchor="middle" class="tq-dp">${esc(phuGiua || '')}</text></svg>
      <div class="tq-dl">${phan.map((p) => `<div><i style="background:${p.mau}"></i><span>${esc(p.ten)}</span><b>${so(n0(p.n))}</b><small>${tong ? `${so(pct1(n0(p.n), tong))}%` : '—'}</small></div>`).join('')}</div></div>`;
  }
  /** Gộp phần nhỏ: giữ `toiDa − 1` phần lớn nhất; các phần còn lại VÀ mọi phần tên "Khác" gộp thành một "Khác" (cuối). */
  function gopKhac(ds, toiDa = 5) {
    const tenKhac = t('Khác');
    const s = [...ds].filter((x) => n0(x.n) > 0).sort((a, b) => n0(b.n) - n0(a.n));
    const that = s.filter((x) => x.ten !== tenKhac && x.k !== KHAC); let khac = s.filter((x) => x.ten === tenKhac || x.k === KHAC).reduce((a, x) => a + n0(x.n), 0);
    const giu = that.length + (khac ? 1 : 0) <= toiDa ? that : that.slice(0, toiDa - 1);
    khac += that.slice(giu.length).reduce((a, x) => a + n0(x.n), 0);
    return khac ? [...giu, { ten: tenKhac, k: KHAC, n: khac }] : giu;
  }
  const toMau = (ds) => ds.map((p, i) => ({ ...p, mau: p.k === KHAC ? 'var(--tq-khac)' : TQ([1, 2, 7, 5, 4][i] || 1) }));
  /** Vòng phần trăm cho MỘT tỉ lệ (0–100 %): cung đầy theo %, số ở giữa. mau: màu cung (trạng thái hoặc phân loại). */
  function vongPt(p, { mau = TQ(1), co = 96, day = 10, nhan = '' } = {}) {
    const r = (co - day) / 2, c = co / 2, chuVi = 2 * Math.PI * r;
    const v = p == null ? 0 : Math.max(0, Math.min(100, p));
    const ve = v > 0 && v < 1 ? 1 : v;                                   // cung nhìn thấy được
    const chu = p == null ? '—' : v > 0 && v < 1 ? '<1%' : `${so(Math.round(v))}%`;
    return `<svg class="tq-vong" viewBox="0 0 ${co} ${co}" width="${co}" height="${co}" role="img" aria-label="${esc(`${nhan} ${p == null ? '—' : v > 0 && v < 1 ? '<1%' : `${so(Math.round(v * 10) / 10)}%`}`)}">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="color-mix(in srgb, var(--ink) 11%, transparent)" stroke-width="${day}"/>
      ${p == null ? '' : `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${mau}" stroke-width="${day}" stroke-linecap="round" stroke-dasharray="${((ve / 100) * chuVi).toFixed(2)} ${chuVi.toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>`}
      <text x="${c}" y="${c + 5}" text-anchor="middle" class="tq-vg" style="font-size:${Math.round(co / 5.2)}px">${chu}</text></svg>`;
  }
  /** Thanh hạn (100 %): màu TRẠNG THÁI cố định (xanh đậm → xanh nhạt → vàng → đỏ), luôn kèm chữ + số. */
  function thanhHan(phan) {
    const tong = phan.reduce((a, p) => a + n0(p.n), 0);
    if (!tong) return `<div class="tq-ok-dong"><span class="tag ok">✓</span> ${t('Không có báo cáo nào đang mở')}</div>`;
    return `<div class="tq-han" role="img" aria-label="${esc(phan.map((p) => `${p.ten}: ${n0(p.n)}`).join(', '))}">${phan.filter((p) => n0(p.n) > 0).map((p) => `<i style="flex:${n0(p.n)};background:var(--${p.m})" data-tip="${esc(`${p.ten}: ${so(n0(p.n))}`)}"></i>`).join('')}</div>
      <div class="tq-hanl">${phan.map((p) => `<span><i style="background:var(--${p.m})"></i>${esc(p.ten)} <b>${so(n0(p.n))}</b></span>`).join('')}</div>`;
  }
  /** Thước dung lượng: đã dùng / giới hạn; không đọc được (null) → "—" (không đoán); vàng / đỏ theo ngưỡng của trang Sức chứa (QT-8), luôn kèm %. */
  function thuoc(nhan, dung, gioiHan, hien) {
    const biet = dung != null && n0(gioiHan) > 0;
    const p = biet ? Math.min(100, (n0(dung) / n0(gioiHan)) * 100) : null;
    const ng = nguongSc();
    const m = p == null ? 'line2' : p >= ng.do ? 'danger' : p >= ng.vang ? 'warn' : 'ok';
    const nhanM = p == null ? '' : p >= ng.do ? t('gần đầy') : p >= ng.vang ? t('cần để ý') : t('còn nhiều');
    return `<div class="tq-thuoc tq-thuoc-vong">${vongPt(p, { mau: `var(--${m})`, co: 104, day: 11, nhan })}
      <div><div class="tq-tl"><span>${esc(nhan)}</span></div><div class="tq-tp">${biet ? hien : t('không đọc được')}</div>${nhanM ? `<span class="tag ${m === 'ok' ? 'ok' : m === 'warn' ? 'warn' : 'danger'}">${esc(nhanM)}</span>` : ''}</div></div>`;
  }
  /** Giữ chân theo TUẦN đăng ký (gộp nhóm theo ngày của máy chủ, cộng SỐ chứ không cộng %): một ô chỉ hiện khi MỌI ngày của tuần đã đủ dữ liệu. */
  function bangGiuChan(gc) {
    const tuan = new Map();
    for (const r of gc || []) {
      const d = new Date(`${String(r.nhom).slice(0, 10)}T00:00:00Z`); if (isNaN(d)) continue;
      const thu = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - thu);
      const k = d.toISOString().slice(0, 10);
      const o2 = tuan.get(k) || { k, n: 0, ngay: 0, d1: 0, d7: 0, d30: 0, c1: 0, c7: 0, c30: 0, du1: 0, du7: 0, du30: 0 };
      o2.n += n0(r.so_nguoi); o2.ngay += 1;
      for (const m of ['1', '7', '30']) if (r[`du_lieu_d${m}`]) { o2[`d${m}`] += n0(r[`d${m}`]); o2[`c${m}`] += n0(r.so_nguoi); o2[`du${m}`] += 1; }
      tuan.set(k, o2);
    }
    const ds = [...tuan.values()].sort((a, b) => (a.k < b.k ? 1 : -1)).slice(0, 8);
    if (!ds.length) return `<div class="empty">${t('Chưa có người đăng ký trong 90 ngày qua')}</div>`;
    const o3 = (r, m) => {
      if (!r[`du${m}`] || r[`du${m}`] < r.ngay) return `<td class="tq-gc0" title="${esc(t('chưa đủ ngày'))}">…</td>`;
      const a = r[`d${m}`], c = r[`c${m}`]; if (!c) return `<td class="tq-gc0">—</td>`;
      const p = pct1(a, c); const al = Math.min(1, 0.08 + (p / 60) * 0.92);
      return `<td class="tq-gc${al > 0.55 ? ' tq-dam' : ''}" style="--a:${al.toFixed(3)}" data-tip="${esc(`${so(a)} / ${so(c)} ${t('người quay lại')}`)}">${so(p)}%</td>`;
    };
    return `<div class="scrollx"><table class="tq-gct"><caption class="sr">${t('Giữ chân theo tuần đăng ký')}</caption><thead><tr><th scope="col">${t('Tuần đăng ký')}</th><th scope="col">${t('Người')}</th><th scope="col">${t('Đúng ngày 1')}</th><th scope="col">${t('Đúng ngày 7')}</th><th scope="col">${t('Đúng ngày 30')}</th></tr></thead>
      <tbody>${ds.map((r) => `<tr><th scope="row">${esc(ngayNgan(r.k))}</th><td class="tq-num">${so(r.n)}</td>${o3(r, '1')}${o3(r, '7')}${o3(r, '30')}</tr>`).join('')}</tbody></table></div>`;
  }
  /** Tình trạng mọi tài khoản (KHÔNG phải phễu: các bước không lồng nhau, đếm trên mọi tài khoản) — % so với tổng tài khoản, một hue. */
  function tqTrangThai(buoc) {
    const tong = n0((buoc[0] || {}).n);
    return `<div class="tq-pheu">${buoc.map((b, i) => `<div class="tq-pb"><div class="tq-pt"><span>${esc(b.ten)}</span><b>${so(n0(b.n))}${i && tong ? ` <small>${so(pct1(n0(b.n), tong))}%</small>` : ''}</b></div>
      <div class="tq-pr"><i style="width:${tong ? Math.max(n0(b.n) ? 1.5 : 0, (n0(b.n) / tong) * 100) : 0}%;background:${TQ(1)};opacity:${(1 - i * 0.18).toFixed(2)}"></i></div>${b.phu ? `<small>${b.phu}</small>` : ''}</div>`).join('')}</div>`;
  }
  const gioDv = () => (C.lang() === 'en' ? 'h' : ' giờ');
  const tenTz = (tz) => (tz === 'Asia/Ho_Chi_Minh' || tz === 'Asia/Saigon' ? t('giờ Việt Nam') : esc(tz || ''));
  const tenNgonNgu = (k) => { if (k === '?') return t('Chưa rõ'); try { const x = new Intl.DisplayNames([C.locale()], { type: 'language' }).of(k); return x ? x.charAt(0).toUpperCase() + x.slice(1) : k; } catch (e) { return String(k).toUpperCase(); } };
  const tenGoiTq = (k, thoiHan) => `${dtThoiHan(thoiHan) || String(k)} · ${String(k).includes(':') ? 'Google Play' : 'App Store'}`;

  // ---------------------------------------------------------------- thống kê nhỏ cho "Điều đáng chú ý" (thuần)
  /** Hồi quy tuyến tính y = a + b·x → độ dốc, R², trung bình (bỏ điểm null). */
  function hoiQuy(v) {
    const ds = v.map((y, i) => [i, y]).filter(([, y]) => y != null).map(([i, y]) => [i, n0(y)]); const n = ds.length; if (n < 3) return null;
    const mx = ds.reduce((a, [i]) => a + i, 0) / n, my = ds.reduce((a, [, y]) => a + y, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (const [i, y] of ds) { sxy += (i - mx) * (y - my); sxx += (i - mx) ** 2; syy += (y - my) ** 2; }
    if (!sxx || !syy) return { doc: 0, r2: 0, tb: my, n };
    return { doc: sxy / sxx, r2: (sxy * sxy) / (sxx * syy), tb: my, n };
  }
  /** Trung bình trượt 7 ngày (khử nhịp tuần); điểm thiếu → null. */
  const truot7 = (v) => v.map((_, i) => { const w = v.slice(Math.max(0, i - 6), i + 1); return i < 6 || w.some((x) => x == null) ? null : w.reduce((a, b) => a + n0(b), 0) / 7; });
  /**
   * Độ lệch so với CÙNG THỨ ≥ 4 tuần trước, cho số ĐẾM: độ lệch chuẩn không dưới √trung bình (sàn Poisson) → mốc 0 hoặc mốc phẳng vẫn bắt được đột biến.
   * Bỏ các ngày trước `tuNgay` (chưa có số).
   */
  function lechCungThu(ds, key, idx, tuNgay) {
    const thu = (r) => new Date(`${String(r.day).slice(0, 10)}T00:00:00Z`).getUTCDay();
    const x = ds[idx]; if (!x || (tuNgay && String(x.day) < tuNgay)) return null;
    const mau = ds.filter((r, i) => i < idx && thu(r) === thu(x) && !(tuNgay && String(r.day) < tuNgay)).slice(-6).map((r) => n0(r[key]));
    if (mau.length < 4) return null;
    const tb2 = mau.reduce((a, b) => a + b, 0) / mau.length;
    const sd = Math.max(Math.sqrt(mau.reduce((a, b) => a + (b - tb2) ** 2, 0) / (mau.length - 1)), Math.sqrt(Math.max(tb2, 1)));
    return { x: n0(x[key]), tb: tb2, z: (n0(x[key]) - tb2) / sd, ngay: x.day, tuan: mau.length };
  }
  /** Hai số đếm khác nhau thật (không phải dao động ngẫu nhiên): |a − b| ≥ 2·√(a + b). */
  const demKhac = (a, b) => Math.abs(a - b) >= 2 * Math.sqrt(Math.max(1, a + b));
  /** Hai tỉ lệ khác nhau thật: kiểm định z hai tỉ lệ, |z| ≥ 2. */
  function tiLeKhac(x1, n1, x2, n2) {
    if (!n1 || !n2) return false;
    const p = (x1 + x2) / (n1 + n2); const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    return se > 0 && Math.abs(x1 / n1 - x2 / n2) / se >= 2;
  }
  /**
   * Nhận xét tự động — mỗi câu nêu con số nó dựa vào; chỉ nói khi mẫu đủ lớn VÀ khác biệt vượt mức dao động ngẫu nhiên.
   * Không lặp việc đã có trong "Cần làm ngay". Trả [{m:'xau'|'tot'|'tt', diem, text, go}], việc xấu trước.
   */
  function tqNhanXet(x) {
    const kq = []; const them = (m, diem2, text, go) => kq.push({ m, diem: diem2, text, go });
    const { tat, tron, tronT, coTruoc, cl, vh, dt, sc, kho, sys, tuNgay, dinh, nho } = x;
    if (nho) them('tt', 1, `${C.lang() === 'en' ? `Small sample: ${so(Math.round(x.tbDau))} active ${Math.round(x.tbDau) === 1 ? 'person' : 'people'} a day on average.` : `Mẫu còn nhỏ: trung bình mỗi ngày chỉ có ${so(Math.round(x.tbDau))} người hoạt động.`} ${t('Tỉ lệ và xu hướng dao động mạnh, chưa nên kết luận.')}`);
    if (!nho) {
      const homQua = tat.length - 2;
      for (const [key, ten, tot] of [['dau', t('Người hoạt động'), 'len'], ['dang_ky', t('Đăng ký mới'), 'len'], ['tin', t('Tin nhắn'), 'len'], ['bao_cao', t('Báo cáo'), 'xuong']]) {
        const l = lechCungThu(tat, key, homQua, key === 'dau' ? tuNgay : null);
        if (!l || Math.abs(l.z) < 3 || Math.abs(l.x - l.tb) < 5 || (l.tb > 0 && Math.abs(l.x - l.tb) / l.tb < 0.15)) continue;
        const cao = l.x > l.tb; const xau = (cao && tot === 'xuong') || (!cao && tot === 'len');
        them(xau ? 'xau' : 'tot', xau ? 9 : 5, `${t('Hôm qua')} ${esc(ngayNgan(l.ngay))}: ${ten} ${so(l.x)}, ${cao ? t('cao khác thường') : t('thấp khác thường')} ${t('so với cùng thứ của')} ${so(l.tuan)} ${t('tuần trước')} (${t('trung bình')} ${so(Math.round(l.tb))}).`, key === 'bao_cao' ? 'antoan/baocao' : 'solieu/tangtruong');
      }
      if (tron.length >= 21) {
        const h = hoiQuy(truot7(tron.map((r) => (tuNgay && String(r.day) < tuNgay ? null : r.dau))));
        if (h && h.n >= 14 && h.tb > 0 && h.r2 >= 0.5) {
          const tuan = (h.doc * 7) / h.tb * 100;
          if (Math.abs(tuan) >= 3) them(tuan > 0 ? 'tot' : 'xau', tuan > 0 ? 4 : 8, `${t('Người hoạt động mỗi ngày đang')} ${tuan > 0 ? t('tăng') : t('giảm')} ${t('khoảng')} ${so(Math.round(Math.abs(tuan) * 10) / 10)}% ${t('mỗi tuần')} (${t('theo trung bình 7 ngày của')} ${so(tron.length)} ${t('ngày trọn gần nhất')}).`, 'solieu/tangtruong');
        }
      }
      if (coTruoc) {
        const a = tron.reduce((s2, r) => s2 + n0(r.dang_ky), 0), b = tronT.reduce((s2, r) => s2 + n0(r.dang_ky), 0);
        if (b >= MAU_KHONG_DU && Math.abs(a - b) / b >= 0.15 && demKhac(a, b)) them(a > b ? 'tot' : 'xau', a > b ? 4 : 7, `${t('Đăng ký mới')} ${a > b ? t('tăng') : t('giảm')} ${so(Math.round(Math.abs(pct1(a - b, b))))}% ${t('so với kỳ trước')} (${so(a)} ${t('so với')} ${so(b)}, ${t('không tính hôm nay')}).`, 'solieu/tangtruong');
      }
      if (cl) {
        const c = (cl.kpi.giu_7n || {}).cur || {}, p = (cl.kpi.giu_7n || {}).prev || {};
        if (n0(c.n) >= MAU_KHONG_DU && n0(p.n) >= MAU_KHONG_DU && tiLeKhac(n0(c.quay), n0(c.n), n0(p.quay), n0(p.n))) {
          const d1 = pct1(n0(c.quay), n0(c.n)), d0 = pct1(n0(p.quay), n0(p.n));
          them(d1 > d0 ? 'tot' : 'xau', d1 > d0 ? 4 : 7, `${t('Người mới quay lại trong 7 ngày đầu')}: ${so(d1)}% (${t('kỳ trước')} ${so(d0)}%).`, 'solieu/giuchan');
        }
      }
      if (dinh != null) {
        if (dinh < 15) them('xau', 5, `${t('Mức dùng hằng ngày')} ${so(dinh)}%: ${t('phần lớn người dùng không mở app mỗi ngày.')}`, 'solieu/tangtruong');
        else if (dinh >= 40) them('tot', 3, `${t('Mức dùng hằng ngày')} ${so(dinh)}%: ${t('người dùng mở app rất thường xuyên.')}`, 'solieu/tangtruong');
      }
      if (vh && (vh.nhiet_28n || []).length >= 24) {
        const ten = C.lang() === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy', 'Chủ nhật'];
        const gio = Array(24).fill(0); let dinh2 = null;
        for (const o2 of vh.nhiet_28n) { const g2 = Number(o2.g); if (g2 >= 0 && g2 < 24) gio[g2] += n0(o2.n); if (!dinh2 || n0(o2.n) > n0(dinh2.n)) dinh2 = o2; }
        let vang = 0, it = Infinity;
        for (let g2 = 0; g2 < 24; g2++) { const s3 = gio[g2] + gio[(g2 + 1) % 24] + gio[(g2 + 2) % 24]; if (s3 < it) { it = s3; vang = g2; } }
        const hh = (v) => String(Number(v)).padStart(2, '0');
        if (dinh2 && n0(dinh2.n) && ten[Number(dinh2.t) - 1]) them('tt', 2, `${t('Nhắn tin nhiều nhất vào')} ${ten[Number(dinh2.t) - 1]}, ${hh(dinh2.g)}:00. ${t('Vắng nhất từ')} ${hh(vang)}:00 ${t('đến')} ${hh((vang + 3) % 24)}:00 (${tenTz(vh.tz)}), ${t('hợp để bảo trì.')}`, 'phantich/vanhanh');
      }
    }
    if (dt) {
      const tb2 = dt.thue_bao || {};
      if (n0(tb2.loi_thanh_toan) > 0) them('xau', 5, `${t('Thuê bao đang lỗi thanh toán')}: ${so(tb2.loi_thanh_toan)}. ${t('Có thể mất nếu không gia hạn được.')}`, 'solieu/doanhthu');
      const a = n0(dt.tong.gop), b = n0((dt.truoc || {}).gop);
      // 22/11 (mục 48, QT-2): kỳ trước không có giao_dich (gb luôn 0, câu này không bao giờ hiện) — hai kỳ đếm cùng một cách: mua mới + gia hạn
      const ga = n0(dt.tong.mua_moi) + n0(dt.tong.gia_han), gb = n0((dt.truoc || {}).mua_moi) + n0((dt.truoc || {}).gia_han);
      if (b > 0 && ga >= 20 && gb >= 20 && Math.abs(a - b) / b >= 0.2 && demKhac(ga, gb)) them(a > b ? 'tot' : 'xau', a > b ? 4 : 7, `${t('Doanh thu gộp')} ${a > b ? t('tăng') : t('giảm')} ${so(Math.round(Math.abs(pct1(a - b, b))))}% ${t('so với kỳ trước')} (${t('kỳ này gồm cả hôm nay chưa hết ngày')}).`, 'solieu/doanhthu');
      if (n0(tb2.sap_het_7d) > 0 && n0(tb2.dang_tra) > 0 && n0(tb2.sap_het_7d) / n0(tb2.dang_tra) >= 0.1) them('tt', 3, `${t('Thuê bao sẽ hết hạn trong 7 ngày tới')}: ${so(tb2.sap_het_7d)} (${so(pct1(n0(tb2.sap_het_7d), n0(tb2.dang_tra)))}% ${t('thuê bao đang còn hạn')}).`, 'solieu/doanhthu');
    }
    for (const [ten, a, b] of [[t('Cơ sở dữ liệu'), sc.db_bytes, sc.db_gioi_han], [t('Kho ảnh và video'), kho, sc.kho_gioi_han], [t('Dịch tháng này (DeepL miễn phí)'), sys.dich && sys.dich.ky_tu_thang, sys.dich && sys.dich.han_muc_deepl_free]]) {
      if (a != null && n0(b) && n0(a) / n0(b) >= nguongSc().vang / 100) them('xau', 6, `${ten} ${t('đã dùng')} ${so(Math.round((n0(a) / n0(b)) * 100))}% ${t('hạn mức. Cần nâng gói hoặc dọn bớt.')}`, 'hethong/vanhanh');
    }
    const thuTu = { xau: 0, tot: 1, tt: 2 };
    return kq.sort((p, q) => thuTu[p.m] - thuTu[q.m] || q.diem - p.diem).slice(0, 8);
  }

  function tongQuan(main, d, ctx) {
    C = ctx; tqId = 0;
    { const tip0 = document.querySelector('.pt-tip'); if (tip0) tip0.hidden = true; }      // chú giải cũ không treo lại sau lượt vẽ mới
    const s = d.s || {}, sf = d.sf || {}, g = d.g || {}, hn = g.hom_nay || {}, sla = sf.sla || {};
    const cl = d.cl && d.cl.kpi ? d.cl : null, k = cl ? cl.kpi : {};
    const vh = d.vh && d.vh.hien_tai ? d.vh : null, dt = d.dthu && !d.dthu.error && d.dthu.tong ? d.dthu : null;
    const ky = d.ky;
    const tuNgay = g.do_tu ? String(g.do_tu).slice(0, 10) : null;           // trước ngày này máy chủ chưa ghi số hoạt động → "chưa có dữ liệu", không phải 0
    const dauCo = (r) => !(tuNgay && String(r.day) < tuNgay);
    // admin.js xin 2 × kỳ (tối thiểu 42 ngày): nửa sau = kỳ này, nửa trước = kỳ trước cùng độ dài. NGÀY TRỌN = bỏ ngày cuối (hôm nay) ở cả hai.
    const tat = g.series || [];
    const series = tat.slice(-ky), truoc = tat.slice(0, Math.max(0, tat.length - ky)).slice(-ky);
    const tron = series.slice(0, -1), tronT = truoc.slice(0, -1);
    const coTruoc = truoc.length === series.length && series.length > 1;
    const coTruocDau = coTruoc && truoc.every(dauCo);
    const nhanNgay = series.map((r) => ngayNgan(r.day));
    const cot = (ds, key) => ds.map((r) => n0(r[key]));
    const cotDau = (ds) => ds.map((r) => (dauCo(r) ? n0(r.dau) : null));
    const tong = (ds, key) => cot(ds, key).reduce((a, b) => a + b, 0);
    const tbDauCua = (ds) => { const v = cotDau(ds).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
    const choAnh = sf.anh_cho || {}; const tongAnh = n0(choAnh.ho_so) + n0(choAnh.bai) + n0(choAnh.album);
    const kp = (x) => (x && typeof x === 'object' ? x : {});
    const pt = (a, b) => (n0(b) ? `${so(pct1(n0(a), n0(b)))}%` : '—');
    const thieu = [];
    const may = d.thieuMay || new Set();              // hàm máy chủ CHƯA CÓ (không phải lỗi tạm, không phải thiếu quyền, không phải mẫu nhỏ)
    const nhom = (id, tieuDe, tomTat, the2) => `<div class="tq-nhom tq-c12" id="${id}"><div class="tq-nh"><h2>${esc(tieuDe)}</h2>${tomTat ? `<p>${tomTat}</p>` : ''}</div></div>${the2}`;
    // ngày của máy chủ là ngày UTC: nói rõ lúc "hôm nay" bắt đầu theo giờ máy người xem
    const nayUtc = new Date(); const dauNgay = new Date(Date.UTC(nayUtc.getUTCFullYear(), nayUtc.getUTCMonth(), nayUtc.getUTCDate()));
    const gioDauNgay = dauNgay.toLocaleTimeString(C.locale(), { hour: '2-digit', minute: '2-digit' });
    const ghiUtc = `${t('ngày theo giờ UTC, bắt đầu lúc')} ${esc(gioDauNgay)} ${t('giờ máy bạn')}`;

    // ================================================================ HÔM NAY
    const homNay = series[series.length - 1] || {};
    const homQua = tat[tat.length - 2] || null, homQuaT = tat[tat.length - 9] || null;     // hai ngày TRỌN: hôm qua và cùng thứ tuần trước
    const hqSo = (key, tot = 'len') => (homQua ? `<span>${t('hôm qua')} <b>${so(n0(homQua[key]))}</b></span>${homQuaT && (key !== 'dau' || (dauCo(homQua) && dauCo(homQuaT))) ? ` ${soVoi(n0(homQua[key]), n0(homQuaT[key]), t('so với cùng thứ tuần trước'), tot)}` : ''}` : '');
    const ht = vh ? vh.hien_tai || {} : {};
    const goiN = n0(ht.dang_goi) + n0(ht.dang_goi_nhom);
    const oHom = [
      tqO({ nhan: t('Hoạt động hôm nay'), gt: so(hn.dau), mau: TQ(2), go: 'solieu/tangtruong', so2: hqSo('dau') }),
      tqO({ nhan: t('Đăng ký hôm nay'), gt: so(hn.moi_hom_nay != null ? hn.moi_hom_nay : homNay.dang_ky), mau: TQ(5), go: 'solieu/tangtruong', so2: hqSo('dang_ky') }),
      tqO({ nhan: t('Tin nhắn 24 giờ gần nhất'), gt: so(s.messages_24h), mau: TQ(7), so2: homQua ? `<span>${t('hôm qua')} <b>${so(n0(homQua.tin))}</b></span>` : '' }),
      tqO({ nhan: t('Báo cáo mới hôm nay'), gt: so(homNay.bao_cao), mau: TQ(8), go: 'antoan/baocao', so2: hqSo('bao_cao', 'xuong') }),
      vh ? tqO({ nhan: t('Đang gọi lúc này'), gt: so(goiN), mau: TQ(4), phu: `${t('trong đó gọi nhóm')}: ${so(n0(ht.dang_goi_nhom))}` }) : '',
    ].join('');
    const theoGio = vh ? vh.theo_gio || [] : [];
    const gioThe = theoGio.length ? tqThe(t('48 giờ qua'), `${t('tin nhắn và người gửi mỗi giờ')} · ${tenTz(vh.tz)}`,
      chuThich([{ ten: t('Tin nhắn'), mau: TQ(7) }, { ten: t('Người gửi'), mau: TQ(5) }])
      + cho((W) => vung([{ ten: t('Tin nhắn'), mau: TQ(7), gt: theoGio.map((r) => n0(r.tin)), kieu: 'vung' }, { ten: t('Người gửi'), mau: TQ(5), gt: theoGio.map((r) => n0(r.nguoi)), kieu: 'duong' }],
        theoGio.map((r) => `${String(r.gio).slice(8, 10)}/${String(r.gio).slice(5, 7)} ${String(r.gio).slice(11, 13)}:00`),
        { W, cao: 200, nhanTruc: theoGio.map((r) => (String(r.gio).slice(11, 13) === '00' ? `${String(r.gio).slice(8, 10)}/${String(r.gio).slice(5, 7)}` : `${String(r.gio).slice(11, 13)}h`)),
          tomTat: `${t('Tin nhắn 48 giờ qua')}: ${so(theoGio.reduce((a, r) => a + n0(r.tin), 0))}` })), { cot: 6, go: 'phantich/vanhanh' }) : '';
    const nhietThe = vh && (vh.nhiet_28n || []).length ? tqThe(t('Lúc nào người dùng nhắn tin nhiều nhất'), `${t('28 ngày qua')} · ${tenTz(vh.tz)}`, nhiet(vh.nhiet_28n), { cot: 6, go: 'phantich/vanhanh' }) : '';
    if (!vh && may.has('vh')) thieu.push(t('Nhịp theo giờ'));
    const tomHom = `${t('Đến lúc này')}: ${so(hn.dau)} ${t('người hoạt động')} · ${so(s.messages_24h)} ${t('tin nhắn trong 24 giờ gần nhất')} · ${ghiUtc}`;

    // ================================================================ TĂNG TRƯỞNG
    const giu7 = cl ? kp(kp(k.giu_7n).cur) : {}, giu7t = cl ? kp(kp(k.giu_7n).prev) : {};
    const dauTb = tbDauCua(tron.length ? tron : series), dauTbT = coTruocDau ? tbDauCua(tronT) : null;
    // mức dùng hằng ngày = DAU trung bình 7 ngày TRỌN gần nhất ÷ MAU (không dùng DAU của hôm nay chưa hết ngày)
    const v7 = cotDau(tat.slice(-8, -1)).filter((x2) => x2 != null);                  // trung bình KHÔNG làm tròn trước khi chia
    const dinh = v7.length && n0(hn.mau) ? Math.round(((v7.reduce((a, b) => a + b, 0) / v7.length) / n0(hn.mau)) * 1000) / 10 : null;
    const tbDau = dauTb || 0; const nho = tbDau < MAU_KHONG_DU;
    const oTang = [
      tqO({ nhan: t('Tổng người dùng'), gt: so(hn.tong), mau: TQ(1), go: 'nguoidung', phu: `+${so(tong(series, 'dang_ky'))} ${t('đăng ký trong kỳ')}` }),
      tqO({ nhan: t('Đăng ký mới'), gt: so(tong(series, 'dang_ky')), mau: TQ(5), go: 'solieu/tangtruong', so2: coTruoc ? soVoi(tong(tron, 'dang_ky'), tong(tronT, 'dang_ky'), t('so với kỳ trước, không tính hôm nay')) : '', duong: cot(series, 'dang_ky') }),
      tqO({ nhan: t('Hoạt động trung bình mỗi ngày'), gt: dauTb != null ? so(dauTb) : '—', mau: TQ(2), go: 'solieu/tangtruong', so2: dauTbT != null ? soVoi(dauTb, dauTbT, t('so với kỳ trước, không tính hôm nay')) : '', duong: cotDau(series) }),
      tqO({ nhan: t('Mức dùng hằng ngày'), gt: dinh != null ? `${so(dinh)}%` : '—', mau: TQ(4), vong: dinh, phu: `${t('DAU trung bình 7 ngày ÷ MAU')} · ${t('MAU')} ${so(hn.mau)} · ${t('WAU')} ${so(hn.wau)}` }),
      cl ? tqO({ nhan: t('Quay lại trong 7 ngày đầu'), gt: pt(giu7.quay, giu7.n), mau: TQ(7), vong: n0(giu7.n) ? pct1(n0(giu7.quay), n0(giu7.n)) : null, go: 'solieu/giuchan', so2: n0(giu7t.n) ? diem(pct1(n0(giu7.quay), n0(giu7.n)), pct1(n0(giu7t.quay), n0(giu7t.n)), t('so với kỳ trước')) : '', phu: `${so(giu7.quay)} / ${so(giu7.n)} ${t('người đăng ký đã đủ 7 ngày')}` }) : '',
      tqO({ nhan: t('Tin nhắn trong kỳ'), gt: so(tong(series, 'tin')), mau: TQ(7), so2: coTruoc ? soVoi(tong(tron, 'tin'), tong(tronT, 'tin'), t('so với kỳ trước, không tính hôm nay')) : '', phu: cl ? `${so(kp(k.cuoc_moi).cur)} ${t('cuộc trò chuyện mới')}` : '', duong: cot(series, 'tin') }),
    ].join('');
    // đường "kỳ trước" thẳng THỨ với kỳ này: lùi 7 / 28 / 84 ngày (bội số của 7)
    const lui = ky === 7 ? 7 : ky === 30 ? 28 : 84;
    const ssCung = series.map((r, i) => { const j = tat.length - series.length + i - lui; const r2 = tat[j]; return r2 && dauCo(r2) && i < series.length - 1 ? n0(r2.dau) : null; });
    const coSs = ssCung.some((v) => v != null);
    const xuHuong = tqThe(t('Người hoạt động mỗi ngày'), `${ky} ${t('ngày qua')} · ${coSs ? `${t('nét đứt: cùng thứ, lùi')} ${lui} ${t('ngày')} · ` : ''}${t('điểm cuối là hôm nay, chưa hết ngày')}`,
      chuThich([{ ten: t('Kỳ này'), mau: TQ(2) }, ...(coSs ? [{ ten: `${t('Lùi')} ${lui} ${t('ngày')}`, mau: 'var(--tq-khac)', kieu: 'pt-key-dut' }] : [])])
      + (tuNgay && series.some((r) => !dauCo(r)) ? `<p class="hint">${t('Số hoạt động có từ')} ${esc(ngayNgan(tuNgay))}.</p>` : '')
      + cho((W) => vung([{ ten: t('Kỳ này'), mau: TQ(2), gt: cotDau(series), kieu: 'vung' }, ...(coSs ? [{ ten: `${t('Lùi')} ${lui} ${t('ngày')}`, mau: 'var(--tq-khac)', gt: ssCung, kieu: 'dut' }] : [])],
        nhanNgay, { W, cao: 240, tomTat: `${t('Người hoạt động mỗi ngày')}, ${ky} ${t('ngày qua')}: ${t('trung bình')} ${dauTb != null ? so(dauTb) : '—'}` })),
      { cot: 8, go: 'solieu/tangtruong' });
    const ph = g.phieu || null;
    const ttThe = ph ? tqThe(t('Tình trạng mọi tài khoản'), t('mọi tài khoản từ trước tới nay, các dòng không lồng nhau'), tqTrangThai([
      { ten: t('Tài khoản'), n: n0(ph.dang_ky) }, { ten: t('Có ảnh đại diện'), n: n0(ph.co_anh) }, { ten: t('Đã từng đăng bài hoặc nhắn tin'), n: n0(ph.co_hoat_dong) },
      { ten: t('Có trò chuyện hai chiều trong 90 ngày'), n: n0(ph.co_tro_chuyen_hai_chieu) }]), { cot: 4, go: 'solieu/giuchan' }) : '';
    // tuần đang chạy chưa hết: bỏ khỏi hạch toán (nếu không, ai chưa quay lại tuần này đều thành "rời bỏ")
    const homNayUtc = new Date(Date.UTC(nayUtc.getUTCFullYear(), nayUtc.getUTCMonth(), nayUtc.getUTCDate())).getTime();
    const tuanDu = cl ? (cl.tuan || []).filter((w) => { const d0 = new Date(`${String(w.tuan).slice(0, 10)}T00:00:00Z`).getTime(); return !isNaN(d0) && d0 + 7 * 864e5 <= homNayUtc && w.du_lieu; }) : [];   // bỏ tuần chưa trọn và tuần trước khi có số
    const tuanThe = tuanDu.length ? tqThe(t('Người hoạt động mỗi tuần'), t('mới, giữ lại, quay lại và rời đi, các tuần đã trọn'),
      chuThich([{ ten: t('Mới'), mau: 'var(--pt-s1)' }, { ten: t('Giữ lại'), mau: 'var(--pt-s2)' }, { ten: t('Quay lại'), mau: 'var(--pt-s3)' }, { ten: t('Rời đi (dưới trục)'), mau: 'var(--pt-sneg)' }])
      + cho((W) => hachToan(tuanDu, W)), { cot: 6, go: 'phantich/chienluoc' }) : '';
    const giuThe = (g.giu_chan || []).length ? tqThe(t('Giữ chân theo tuần đăng ký'), t('% người dùng mở app đúng ngày 1, 7, 30 sau khi đăng ký'), bangGiuChan(g.giu_chan), { cot: 6, go: 'solieu/giuchan' }) : '';
    const tomTang = `${t('Trung bình')} ${dauTb != null ? so(dauTb) : '—'} ${t('người hoạt động mỗi ngày')}${dauTbT ? `, ${Math.abs(pct1(dauTb - dauTbT, dauTbT)) < 0.5 ? t('không đổi') : `${dauTb > dauTbT ? t('tăng') : t('giảm')} ${so(Math.abs(pct1(dauTb - dauTbT, dauTbT)))}%`} ${t('so với kỳ trước')}` : ''} · ${so(tong(series, 'dang_ky'))} ${t('người đăng ký mới')} · ${t('gồm cả tài khoản nội bộ và tài khoản thử')}`;

    // ================================================================ DOANH THU
    let tienThe = '', tomTien = '';
    if (dt) {
      const ch = dt.chuoi || []; const tbo = dt.thue_bao || {};
      const traThat = Math.max(0, n0(tbo.dang_tra) - n0(tbo.dung_thu));
      const goi = toMau(gopKhac((dt.theo_goi || []).map((x) => ({ ten: tenGoiTq(x.k, x.thoi_han), n: n0(x.n) })), 5));
      const truocGop = n0((dt.truoc || {}).gop);
      tienThe = tqThe('HIMO Plus', `${esc(dt.ngay)} ${t('ngày qua')} · ${t('tính bằng USD, ước tính theo RevenueCat')} · ${t('kỳ này gồm cả hôm nay chưa hết ngày')}`,
        `<div class="tq-hang">${[[t('Doanh thu gộp'), dtTien(dt.tong.gop), truocGop ? `${t('kỳ trước')} ${esc(dtTien(truocGop))}` : ''], [t('Doanh thu ròng'), dtTien(dt.tong.rong), ''],
          [t('Thực nhận ước tính'), dtTien(dt.tong.thuc_nhan), t('sau thuế và phí cửa hàng')], [t('MRR ước tính'), dtTien((dt.mrr || {}).usd), n0(tbo.dung_thu) ? t('gồm cả người đang dùng thử') : ''],
          [t('Đang trả tiền'), so(traThat), `${n0(tbo.dung_thu) ? `+${so(tbo.dung_thu)} ${t('dùng thử')} · ` : ''}${n0(dt.nguoi_dung) ? `${pt(traThat, dt.nguoi_dung)} ${t('người dùng')}` : ''}`]]
          .map(([a, b, c0]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b>${c0 ? `<small>${c0}</small>` : ''}</div>`).join('')}</div>`
        + `<div class="tq-luoi2"><div><h4 class="tq-h4">${t('Doanh thu gộp mỗi ngày')}</h4>${cho((W) => vung([{ ten: t('Doanh thu gộp'), mau: TQ(1), gt: ch.map((c) => n0(c.gop)), kieu: 'vung' }], ch.map((c) => ngayNgan(c.ngay)),
            { W, cao: 190, tien: (v, truc) => dtTien(truc ? Math.round(v) : v), tomTat: `${t('Doanh thu gộp mỗi ngày')}: ${dtTien(dt.tong.gop)}` }))}</div>
          <div><h4 class="tq-h4">${t('Số giao dịch mỗi ngày')}</h4>${chuThich([{ ten: t('Mua mới'), mau: TQ(7) }, { ten: t('Gia hạn'), mau: TQ(5) }])}${cho((W) => cotChong(ch.map((c) => ({ nhan: ngayNgan(c.ngay), phan: [c.mua_moi, c.gia_han] })), [{ ten: t('Mua mới'), mau: TQ(7) }, { ten: t('Gia hạn'), mau: TQ(5) }], { W, cao: 190, tomTat: t('Số giao dịch mỗi ngày') }))}</div></div>`
        + `<div class="tq-luoi2 tq-mt"><div><h4 class="tq-h4">${t('Giao dịch theo gói')}</h4>${tronKhuyet(goi.length ? goi : [{ ten: t('Chưa có'), n: 0, mau: TQ(1) }], { phuGiua: t('giao dịch') })}
          ${n0(tbo.dang_tra) && n0(tbo.tu_gia_han) + n0(tbo.da_huy) === n0(tbo.dang_tra) ? `<h4 class="tq-h4 tq-mt">${t('Thuê bao còn hạn theo gia hạn')}</h4>${tronKhuyet([{ ten: t('Tự gia hạn'), n: n0(tbo.tu_gia_han), mau: TQ(1) }, { ten: t('Đã tắt gia hạn'), n: n0(tbo.da_huy), mau: TQ(5) }], { phuGiua: t('thuê bao') })}` : ''}</div>
          <div><h4 class="tq-h4">${t('Thuê bao lúc này')}</h4><div class="tq-kvs">${[[t('Còn hạn'), tbo.dang_tra], [t('trong đó dùng thử'), tbo.dung_thu], [t('Tự gia hạn'), tbo.tu_gia_han], [t('Đã tắt gia hạn'), tbo.da_huy], [t('Lỗi thanh toán'), tbo.loi_thanh_toan], [t('Hết hạn trong 7 ngày tới'), tbo.sap_het_7d], [t('Đã hết hạn trong 30 ngày qua'), tbo.het_han_30d]]
            .map(([a, b]) => `<div><span>${esc(a)}</span><b>${so(n0(b))}</b></div>`).join('')}</div></div></div>`,
        { cot: 12, go: 'solieu/doanhthu' });
      tomTien = `${t('Doanh thu gộp')} ${esc(dtTien(dt.tong.gop))}${truocGop ? ` (${t('kỳ trước')} ${esc(dtTien(truocGop))})` : ''} · ${so(traThat)} ${t('người đang trả tiền')} · ${t('MRR')} ${esc(dtTien((dt.mrr || {}).usd))}`;
    } else if (d.dthu === null) thieu.push(t('Doanh thu'));

    // ================================================================ AN TOÀN & NỘI DUNG
    const lyDo = toMau(gopKhac(Object.entries(sf.theo_ly_do || {}).map(([k2, n]) => ({ ten: d.tenLyDo ? d.tenLyDo(k2) : k2, k: k2 === 'other' ? KHAC : k2, n })), 5));
    const xl = sf.xu_ly || {};
    const xuLyThe = tqThe(t('Xử lý báo cáo'), t('7 ngày qua'), `<div class="tq-kvs">${[[t('Đã đóng'), so(n0(xl.dong_7d))],
      [t('Thời gian xử lý trung bình'), xl.gio_tb_7d != null ? `${so(Math.round(n0(xl.gio_tb_7d) * 10) / 10)}${gioDv()}` : '—'],
      [t('Lâu nhất'), xl.gio_lau_nhat_7d != null ? `${so(Math.round(n0(xl.gio_lau_nhat_7d) * 10) / 10)}${gioDv()}` : '—'],
      [t('Xử lý trong 24 giờ'), xl.trong_24h_7d != null && n0(xl.dong_7d) ? `${so(n0(xl.trong_24h_7d))} (${pt(xl.trong_24h_7d, xl.dong_7d)})` : '—'],
      [t('Ảnh bị từ chối'), so(n0(choAnh.tu_choi_7d))],
      [t('Báo cáo trên 1.000 người dùng gần đây'), sf.bao_cao_tren_1000_mau_7d != null ? so(sf.bao_cao_tren_1000_mau_7d) : '—'],
      [t('Đang bị khoá'), `${so(n0(s.suspended))} ${t('tạm')} · ${so(n0(s.banned))} ${t('vĩnh viễn')}`]]
      .map(([a, b]) => `<div><span>${esc(a)}</span><b>${b}</b></div>`).join('')}</div><p class="hint">${t('"Người dùng gần đây" là người có mở app trong 30 ngày.')}</p>`, { cot: 6, go: 'antoan/baocao' });
    const lyDoThe = tqThe(t('Lý do báo cáo'), t('30 ngày qua'), lyDo.length ? tronKhuyet(lyDo, { phuGiua: t('báo cáo') }) : `<div class="empty">${t('Chưa có báo cáo')}</div>`, { cot: 6, go: 'antoan/baocao' });
    const baiThe = tqThe(t('Bài đăng mỗi ngày'), `${ky} ${t('ngày qua')}`, cho((W) => cotDoc(cot(series, 'bai'), nhanNgay, { W, cao: 170, mau: TQ(1), ten: t('Bài đăng') })), { cot: 6, go: 'noidung/bai' });
    const bcThe = tqThe(t('Báo cáo mới mỗi ngày'), `${ky} ${t('ngày qua')}`, cho((W) => cotDoc(cot(series, 'bao_cao'), nhanNgay, { W, cao: 170, mau: TQ(8), ten: t('Báo cáo') })), { cot: 6, go: 'antoan/baocao' });
    const cc = cl ? cl.co_cau_tin || {} : null;
    const loaiTin = cc ? [{ ten: t('Chữ (gồm tin thoại)'), n: n0(cc.chu), mau: TQ(1) }, { ten: t('Ảnh'), n: n0(cc.anh), mau: TQ(2) }, ...(cc.video != null ? [{ ten: t('Video'), n: n0(cc.video), mau: TQ(7) }] : []), { ten: t('Vị trí'), n: n0(cc.vi_tri), mau: TQ(5) }].sort((a, b) => b.n - a.n) : [];
    const coThuHoi = !!cc && n0(cc.thu_hoi) > 0 && loaiTin.reduce((a, x) => a + x.n, 0) + n0(cc.thu_hoi) === n0(cc.rieng) + n0(cc.nhom);
    const coCau = cc ? tqThe(t('Tỉ trọng tin nhắn theo loại'), `${ky} ${t('ngày qua')}${coThuHoi ? '' : ` · ${t('tin đã thu hồi không nằm trong loại nào')}`}`,
      `<div class="tq-luoi2"><div>${tronKhuyet(coThuHoi ? [...loaiTin, { ten: t('Đã thu hồi'), k: KHAC, n: n0(cc.thu_hoi), mau: 'var(--tq-khac)' }] : loaiTin, { phuGiua: t('tin nhắn') })}</div>
        <div>${tronKhuyet([{ ten: t('Chat riêng'), n: n0(cc.rieng), mau: TQ(3) }, { ten: t('Trong nhóm'), n: n0(cc.nhom), mau: TQ(4) }], { phuGiua: t('tin nhắn') })}</div></div>`
      + `<div class="tq-mini tq-mt">${[[t('trả lời'), cc.tra_loi], ...(coThuHoi ? [] : [[t('thu hồi'), cc.thu_hoi]])].map(([a, b]) => `<span>${esc(a)} <b>${so(n0(b))}</b></span>`).join('')}</div>`, { cot: 12 }) : '';
    const tomAn = `${so(n0(xl.dong_7d))} ${t('báo cáo đã đóng trong 7 ngày')}${xl.gio_tb_7d != null ? `, ${t('trung bình')} ${so(Math.round(n0(xl.gio_tb_7d) * 10) / 10)}${gioDv()}` : ''}${lyDo.length && lyDo[0].k !== KHAC ? ` · ${t('lý do nhiều nhất')}: ${esc(lyDo[0].ten)}` : ''}`;

    // ================================================================ NGƯỜI DÙNG
    const nuoc = (g.theo_nuoc || []).slice(0, 8).map((x) => ({ ten: x.ten === '?' || !x.ten ? t('Chưa rõ') : (C.tenNuoc ? C.tenNuoc(x.ten) : x.ten), n: n0(x.n), phu: `${t('hoạt động 30 ngày')}: ${so(n0(x.hd_30d))} (${pt(x.hd_30d, x.n)})` }));
    const nuocDu = (g.theo_nuoc || []).map((x) => ({ ten: x.ten === '?' || !x.ten ? t('Chưa rõ') : (C.tenNuoc ? C.tenNuoc(x.ten) : x.ten), n: n0(x.n) }));
    const conLai = Math.max(0, n0(hn.tong) - nuocDu.reduce((a, x) => a + x.n, 0));          // theo_nuoc chỉ trả 20 nước nhiều nhất → phần còn lại vào "Khác"
    const nuocThe = nuoc.length ? tqThe(t('Người dùng theo quốc gia'), t('5 nước nhiều nhất, còn lại gộp "Khác"'), tronKhuyet(toMau(gopKhac(conLai ? [...nuocDu, { ten: t('Khác'), k: KHAC, n: conLai }] : nuocDu, 5)), { phuGiua: t('người dùng') }), { cot: 6, go: 'solieu/khuvuc' }) : '';
    const nn = Object.entries(g.theo_ngon_ngu || {}).map(([k2, n]) => ({ ten: tenNgonNgu(k2), n: n0(n) })).sort((a, b) => b.n - a.n);
    const nnThe = nn.length ? tqThe(t('Ngôn ngữ nhận thông báo'), t('ngôn ngữ của thông báo đẩy mỗi người đang dùng'), tronKhuyet(toMau(gopKhac(nn, 5)), { phuGiua: t('người dùng') }), { cot: 6, go: 'solieu/khuvuc' }) : '';
    const tinhNang = [];
    const stk = d.st && d.st.kpi ? d.st.kpi : null;
    const ssN = (a2, b2) => soVoi(a2, b2, t('so với kỳ trước'));
    if (stk) { const a2 = stk.nay || {}, b2 = stk.truoc || {}; tinhNang.push([t('Story'), [[t('Lượt đăng'), a2.lan_dang, b2.lan_dang], [t('Người đăng'), a2.nguoi_dang, b2.nguoi_dang], [t('Lượt xem'), a2.luot_xem, b2.luot_xem], [t('Cảm xúc'), a2.cam_xuc, b2.cam_xuc]], 'phantich/stories']); } else if (may.has('st')) thieu.push(t('Story'));
    const skd = d.sk && d.sk.su_kien ? d.sk.su_kien : null;
    if (skd) tinhNang.push([t('Sự kiện'), [[t('Tạo trong kỳ'), skd.tao], [t('Sắp tới hoặc đang diễn ra'), skd.sap_toi], [t('Lượt nhận "sẽ đi"'), skd.dang_ky_di], [t('Người tổ chức'), skd.nguoi_to_chuc]], 'phantich/sukien']); else if (may.has('sk')) thieu.push(t('Sự kiện'));
    const bb = d.bb && d.bb.cap_ban_be != null ? d.bb : null;
    if (bb) tinhNang.push([t('Bạn bè'), [[t('Cặp bạn bè'), bb.cap_ban_be], [t('Bạn thân'), bb.ban_than], [t('Lời mời đang chờ'), bb.loi_moi_dang_cho], [t('Kết bạn trong kỳ'), (bb.ky || {}).chap_nhan]], 'hethong/vanhanh']);
    const tnThe = tinhNang.length ? `<div class="tq-tn tq-c12">${tinhNang.map(([ten, ds, go], i) => `<section class="card tq-tnc" style="--c:${TQ([5, 4, 1][i] || 1)}"><div class="tq-th"><h3><i aria-hidden="true"></i>${esc(ten)}</h3><button class="tq-xem" data-go="${go}">${t('Xem chi tiết')} →</button></div>
      <div class="tq-kvs">${ds.map(([a, b, c0]) => `<div><span>${esc(a)}</span><b>${so(n0(b))}${c0 != null ? ` ${ssN(n0(b), n0(c0))}` : ''}</b></div>`).join('')}</div></section>`).join('')}</div>` : '';
    if (d.cd === null) thieu.push(t('Chân dung người dùng'));
    const tomNguoi = nuoc.length ? `${t('Nhiều nhất')}: ${nuoc.slice(0, 3).map((x2) => `${esc(x2.ten)} ${pt(x2.n, hn.tong)}`).join(' · ')}` : '';

    // ================================================================ HỆ THỐNG
    const sc = vh ? vh.suc_chua || {} : {};
    const sys = d.sys || {};
    const kho = sc.kho ? Object.values(sc.kho).reduce((a, x2) => a + n0(x2 && x2.bytes), 0) : null;          // null = máy chủ không đọc được kho → không đoán
    const mb = (v) => `${so(Math.round(n0(v) / 1048576))} MB`;
    const heThongThe = tqThe(t('Dung lượng và hạn mức'), t('xanh dưới 80% · vàng từ 80% · đỏ từ 95%'),
      `<div class="tq-luoi3">${sc.db_gioi_han ? thuoc(t('Cơ sở dữ liệu'), sc.db_bytes, sc.db_gioi_han, `${mb(sc.db_bytes)} / ${mb(sc.db_gioi_han)}`) : ''}
        ${sc.kho_gioi_han ? thuoc(t('Kho ảnh và video'), kho, sc.kho_gioi_han, `${mb(kho)} / ${mb(sc.kho_gioi_han)}`) : ''}
        ${sys.dich ? thuoc(t('Dịch tháng này (DeepL miễn phí)'), sys.dich.ky_tu_thang, sys.dich.han_muc_deepl_free, `${so(n0(sys.dich.ky_tu_thang))} / ${so(n0(sys.dich.han_muc_deepl_free))} ${t('ký tự')}`) : ''}</div>
      ${sys.thong_bao ? `<div class="tq-mini tq-mt">${[[t('máy nhận thông báo'), sys.thong_bao.co_token], [t('thông báo 24 giờ qua'), sys.thong_bao.gui_24h], [t('chưa đọc'), sys.thong_bao.chua_doc]].map(([a, b]) => `<span>${esc(a)} <b>${so(n0(b))}</b></span>`).join('')}</div>` : ''}
      ${thieu.length ? `<div class="tq-thieu"><b>${t('Chưa hiện vì máy chủ chưa có bản vá')}:</b> ${thieu.map(esc).join(' · ')}</div>` : ''}`,
      { cot: 12, go: 'hethong/vanhanh' });
    const phanTram = (a, b) => (a != null && n0(b) ? Math.round((n0(a) / n0(b)) * 100) : null);
    const ptHe = (a, b) => { if (a == null || !n0(b)) return '—'; const x = (n0(a) / n0(b)) * 100; return x > 0 && x < 1 ? '<1' : phanTram(a, b); };   // giống chữ trong vòng: phần rất nhỏ ghi <1 %
    const tomHe = [sc.db_gioi_han ? `${t('Cơ sở dữ liệu')} ${ptHe(sc.db_bytes, sc.db_gioi_han)}%` : '', kho != null && sc.kho_gioi_han ? `${t('kho ảnh')} ${ptHe(kho, sc.kho_gioi_han)}%` : '', sys.dich ? `${t('dịch')} ${ptHe(sys.dich.ky_tu_thang, sys.dich.han_muc_deepl_free)}%` : ''].filter(Boolean).join(' · ');

    // ================================================================ ĐIỀU ĐÁNG CHÚ Ý
    const nx = tqNhanXet({ tat, tron, tronT, coTruoc, cl, vh, dt, sc, kho, sys, tuNgay, dinh, nho, tbDau });
    const soXau = nx.filter((c) => c.m === 'xau').length, soTot = nx.filter((c) => c.m === 'tot').length;
    const nxThe = `<section class="card tq-the tq-c12">${nx.length ? `<ul class="pt-insights tq-ins">${nx.map((c) => `<li class="pt-i-${c.m}"><span class="pt-ic" aria-hidden="true">${c.m === 'xau' ? '!' : c.m === 'tot' ? '✓' : 'i'}</span><span><span class="sr">${c.m === 'xau' ? t('Cần chú ý:') : c.m === 'tot' ? t('Tốt:') : t('Thông tin:')} </span>${c.text}</span>${c.go ? `<button class="tq-xem" data-go="${c.go}">${t('Xem')} →</button>` : ''}</li>`).join('')}</ul>`
      : `<div class="empty">${t('Chưa thấy điều gì khác thường trong kỳ này.')}</div>`}<p class="hint tq-mt">${t('Máy tự rút ra từ các con số bên trên: so với cùng thứ các tuần trước, xu hướng, giữ chân, doanh thu, hạn mức. Chỉ nêu khi khác biệt lớn hơn mức dao động ngẫu nhiên. Luôn kiểm lại trước khi quyết định.')}</p></section>`;
    const tomNx = nx.length ? `${so(soXau)} ${t('điều cần chú ý')} · ${so(soTot)} ${t('điều tốt')}` : '';

    // ================================================================ CẦN LÀM NGAY
    const cb = (d.canhBao || []).filter((c) => c.m !== 'ok');
    const kh = sla.khac || {};
    const moTinh = n0(sla.duoi_6h) + n0(sla.tu_6_18h) + n0(sla.tu_18_24h) + n0(sla.qua_24h);
    const coSla = sla.duoi_6h != null || sla.qua_24h != null;
    const hang = [[t('Báo cáo đang chờ bạn'), coSla ? moTinh : s.reports_open, 'antoan/baocao', n0(sla.qua_24h) ? 'danger' : n0(sla.tu_18_24h) ? 'warn' : '', n0(sla.ve_minh) ? `+${so(sla.ve_minh)} ${t('về bạn')}` : ''],
      [t('Ảnh chờ duyệt'), tongAnh, 'antoan/anh', '', choAnh.gio_lau_nhat ? `${t('lâu nhất')} ${so(Math.round(choAnh.gio_lau_nhat))}${gioDv()}` : ''],
      kh.selfie != null ? [t('Selfie chờ duyệt'), kh.selfie, 'antoan/xacminh', n0(kh.selfie_qua_24h) ? 'danger' : '', ''] : null,
      kh.khieu_nai_anh != null ? [t('Khiếu nại ảnh'), kh.khieu_nai_anh, 'antoan/anh', n0(kh.khieu_nai_anh_qua_24h) ? 'danger' : '', ''] : null,
      kh.su_kien != null ? [t('Sự kiện chờ duyệt'), kh.su_kien, 'noidung/sukien', n0(kh.su_kien_qua_24h) ? 'danger' : '', ''] : null,
      [t('Đang bị khoá'), n0(s.suspended) + n0(s.banned), 'antoan/phat', '', '']].filter(Boolean);
    const viecThe = `<section class="card tq-the tq-c12 tq-viec"><div class="tq-viec-l">
        ${cb.length ? cb.map((c) => `<button class="tq-cb tq-cb-${c.m}" data-go="${c.go}"><span class="tq-cbi" aria-hidden="true">!</span><span><b>${esc(c.t)}</b>${c.p ? `<small>${esc(c.p)}</small>` : ''}</span><span class="tq-cbx">${t('Xử lý')} →</span></button>`).join('')
          : `<div class="tq-cb tq-cb-ok"><span class="tq-cbi" aria-hidden="true">✓</span><span><b>${t('Không có việc gấp')}</b><small>${t('Mọi báo cáo đã đóng, hàng chờ ảnh trống.')}</small></span></div>`}
      </div><div class="tq-viec-r"><div class="tq-dem">${hang.map(([a, b, go, m, phu]) => `<button class="tq-demo${m ? ` tq-demo-${m}` : ''}" data-go="${go}"><b>${so(n0(b))}</b><span>${esc(a)}</span>${phu ? `<small>${esc(phu)}</small>` : ''}</button>`).join('')}</div>
        ${coSla ? `<h4 class="tq-h4 tq-mt">${t('Báo cáo đang mở theo thời gian chờ')} · ${t('hạn 24 giờ')}</h4>
        ${thanhHan([{ ten: t('dưới 6 giờ'), n: sla.duoi_6h, m: 'tq-ok1' }, { ten: t('6 đến 18 giờ'), n: sla.tu_6_18h, m: 'tq-ok2' }, { ten: t('18 đến 24 giờ'), n: sla.tu_18_24h, m: 'warn' }, { ten: t('quá 24 giờ'), n: sla.qua_24h, m: 'danger' }])}` : ''}</div></section>`;
    const tomViec = cb.length ? `${t('Việc cần xem')}: ${so(cb.length)}${sla.gio_lau_nhat != null && moTinh ? ` · ${t('báo cáo lâu nhất đã chờ')} ${so(Math.round(sla.gio_lau_nhat))}${gioDv()}` : ''}` : t('Không có việc gấp. Mọi báo cáo và ảnh đều đã xử lý.');

    // ================================================================ ghép
    const NHOM_TQ = [['tq-homnay', t('Hôm nay')], ['tq-tang', t('Tăng trưởng')], ...(dt ? [['tq-tien', t('Doanh thu')]] : []), ['tq-an', t('An toàn & nội dung')], ['tq-nguoi', t('Người dùng')], ['tq-he', t('Hệ thống')], ['tq-nx', t('Điều đáng chú ý')], ['tq-viec', t('Cần làm ngay')]];
    const gapNhat = cb[0];
    const nutGap = gapNhat ? `<button class="chip tq-gap" data-cuon="tq-viec"><b>${so(cb.length)}</b> ${esc(gapNhat.t)}${cb.length > 1 ? ` ${t('và')} ${so(cb.length - 1)} ${t('việc khác')}` : ''}</button>`
      : `<button class="chip tq-gap-ok" data-cuon="tq-viec">✓ ${t('Không có việc gấp')}</button>`;
    const kyNut = `<div class="tq-ky"><div class="chips" id="tqKy" role="group" aria-label="${esc(t('Khoảng thời gian'))}">${[7, 30, 90].map((x2) => `<button class="chip" data-d="${x2}" aria-pressed="${ky === x2}">${x2} ${t('ngày')}</button>`).join('')}</div>
      <span class="hint">${t('áp cho Tăng trưởng, Doanh thu, Bài đăng và Báo cáo')}</span></div>`;
    const luc = new Date().toLocaleTimeString(C.locale(), { hour: '2-digit', minute: '2-digit' });
    main.innerHTML = `<div class="stack tq" id="tqGoc" style="padding-top:14px">
      <div class="pt-head"><div><h1>${t('Tổng quan')}</h1><p class="sub">${t('Số liệu chính của HIMO, chia theo nhóm. Bấm "Xem chi tiết" để mở từng mục.')} · ${t('Cập nhật lúc')} ${esc(luc)}</p></div>${kyNut}</div>
      <nav class="tq-nav" aria-label="${esc(t('Đi nhanh tới nhóm'))}">${nutGap}${NHOM_TQ.map(([id, ten]) => `<button class="chip" data-cuon="${id}">${esc(ten)}</button>`).join('')}</nav>
      <div class="tq-luoi">
        ${nhom('tq-homnay', t('Hôm nay'), tomHom, `<div class="tq-kpis tq-c12">${oHom}</div>${gioThe}${nhietThe}`)}
        ${nhom('tq-tang', `${t('Tăng trưởng')} · ${ky} ${t('ngày qua')}`, tomTang, `<div class="tq-kpis tq-c12">${oTang}</div>${xuHuong}${ttThe}${tuanThe}${giuThe}`)}
        ${dt ? nhom('tq-tien', `${t('Doanh thu')} · ${esc(dt.ngay)} ${t('ngày qua')}`, tomTien, tienThe) : ''}
        ${nhom('tq-an', t('An toàn & nội dung'), tomAn, `${xuLyThe}${lyDoThe}${baiThe}${bcThe}${coCau}`)}
        ${nhom('tq-nguoi', t('Người dùng'), tomNguoi, `${nuocThe}${nnThe}${tnThe}${d.laAi ? `<div class="tq-c12">${d.laAi}</div>` : ''}`)}
        ${nhom('tq-he', t('Hệ thống'), tomHe, heThongThe)}
        ${nhom('tq-nx', t('Điều đáng chú ý'), tomNx, nxThe)}
        ${nhom('tq-viec', t('Cần làm ngay'), tomViec, viecThe)}
      </div>
      ${d.cuoiHtml || ''}</div>`;
    main.querySelectorAll('[data-cuon]').forEach((b) => b.addEventListener('click', () => {
      const el = main.querySelector(`#${b.dataset.cuon}`); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
    veBieuDo(main);
  }

  // ================================================================ SỨC CHỨA & NÂNG CẤP (218, mục 47-tai phần B)
  // Tệp này chỉ vẽ: admin.js gọi admin_suc_chua (máy chủ tính %, mức, dự phóng, ngày chạm ngưỡng) rồi đưa kết quả vào đây.
  // Giá, hạn mức, gói kế, nơi bấm, ngày đọc giá đều đến từ máy chủ (bảng he_thong_tai_nguyen) — trang không ghi cứng giá nào.
  // Màu: một chuỗi số TQ(1) như dashboard Tổng quan, đường ngưỡng đỏ nét đứt màu trung tính; xanh / vàng / đỏ chỉ cho TRẠNG THÁI, luôn kèm chữ.
  const SC_TEN = {
    db_cpu: 'CPU cơ sở dữ liệu', db_ram: 'RAM cơ sở dữ liệu', db_dia: 'Đĩa cơ sở dữ liệu', db_ket_noi: 'Kết nối Postgres', db_pooler: 'Pooler (client đang nối)',
    realtime_ket_noi: 'Kết nối Realtime', realtime_tin_giay: 'Tin Realtime mỗi giây', kho_luu_tru: 'Kho lưu trữ (ảnh, video)', egress: 'Băng thông ra (egress)',
    auth_thu: 'Thư Auth (mã đăng ký, đặt lại mật khẩu)', auth_thu_hong: 'Thư Auth gửi hỏng', edge_luot: 'Lượt gọi Edge Functions', day: 'Thông báo đẩy',
    sightengine: 'Kiểm duyệt ảnh (Sightengine)', dich: 'Dịch tin nhắn', livekit_phut: 'Phút gọi (LiveKit)', livekit_dong_thoi: 'Người gọi cùng lúc (LiveKit)',
    revenuecat: 'Doanh thu theo dõi (RevenueCat)', nguoi_mau: 'Người dùng hoạt động trong tháng (MAU)',
  };
  const SC_NHOM = [['Cơ sở dữ liệu', ['db']], ['Realtime, lưu trữ và MAU', ['realtime', 'kho', 'nguoi_dung']], ['Đăng nhập, thư và Edge Functions', ['auth', 'edge']],
    ['Dịch vụ ngoài', ['day', 'kiem_duyet', 'dich', 'goi', 'thanh_toan']]];
  /** Việc khi đỏ — câu không chứa giá; giá + gói kế đến từ máy chủ và được nối vào sau. */
  const SC_VIEC = {
    db_cpu: 'Nâng cỡ máy (compute) của cơ sở dữ liệu', db_ram: 'Nâng cỡ máy (compute) của cơ sở dữ liệu', db_dia: 'Mở rộng đĩa hoặc dọn dữ liệu cũ',
    db_ket_noi: 'Nâng compute để có thêm kết nối tối đa, hoặc tìm chỗ giữ kết nối thừa', db_pooler: 'Nâng compute để pooler nhận thêm client',
    realtime_ket_noi: 'Tắt chặn chi Realtime và chuyển kênh hộp thư sang Broadcast', realtime_tin_giay: 'Tắt chặn chi Realtime để nâng trần tin mỗi giây',
    kho_luu_tru: 'Xem ảnh / video cũ có dọn được không, phần vượt tính theo GB', egress: 'Bật bộ nhớ đệm ảnh, xem đường gọi tốn băng thông, phần vượt tính theo GB',
    auth_thu: 'Nâng gói gửi thư và tăng hạn gửi thư của Auth', auth_thu_hong: 'Mở nhật ký Auth xem mã lỗi. 535 nghĩa là khoá SMTP của Resend sai hoặc đã bị thu hồi',
    edge_luot: 'Xem hàm nào gọi nhiều nhất, phần vượt tính theo triệu lượt', day: 'Xem mã lỗi ở Hệ thống, Vận hành. InvalidCredentials nghĩa là khoá APNs trên EAS hỏng',
    sightengine: 'Nâng gói Sightengine', dich: 'Đặt ngân sách và cảnh báo cho dịch vụ dịch', livekit_phut: 'Nâng gói LiveKit', livekit_dong_thoi: 'Nâng gói LiveKit',
    revenuecat: 'Chỉ để biết, không cần làm gì', nguoi_mau: 'Phần vượt tính theo từng MAU, xem lại chặn chi của tổ chức',
  };
  const SC_DV = { '%': '%', GB: 'GB', conn: 'kết nối', client: 'client', 'msg/s': 'tin / giây', email: 'thư', call: 'lượt', push: 'tin', op: 'thao tác', char: 'ký tự',
    min: 'phút-người', people: 'người', USD: 'USD', MAU: 'MAU' };
  const SC_GIA = { thang: 'USD / tháng', gb_thang: 'USD / GB / tháng', nghin: 'USD / 1.000', trieu: 'USD / 1 triệu', luot: 'USD / lượt', phan_tram: '%' };
  const SC_MUC = { xanh: ['ok', 'Ổn'], vang: ['warn', 'Cần để ý'], do: ['danger', 'Cần nâng'], chua_noi: ['', 'Chưa nối'], cu: ['', 'Số cũ'], thong_tin: ['', 'Thông tin'] };
  const SC_MAU = { xanh: 'var(--ok)', vang: 'var(--warn)', do: 'var(--danger)' };
  /** Vì sao chưa có số, và ai phải làm gì. */
  const scVsao = (x) => {
    if (x.khoa === 'egress') return t('Supabase chưa có API đọc egress. Chủ dự án xem ở Organization, Usage.');
    if (x.khoa === 'realtime_tin_giay') return t('Chưa có nguồn số cho tin mỗi giây. Xem ở Realtime, Reports của dự án.');
    if (x.muc === 'cu' && x.loi_nguon) return `${t('Lần đọc gần nhất báo lỗi')} ${x.loi_nguon}. ${x.loi_nguon === 'http_401' || x.loi_nguon === 'http_403' ? t('Khoá đọc số sai hoặc đã bị xoá.') : t('Bộ thu sẽ thử lại sau 5 phút.')}`;
    if (x.muc === 'cu') return t('Số cũ hơn 30 phút. Bộ thu có thể đã dừng.');
    if (x.nguon === 'may_chu') return t('Cần khoá đọc Metrics API (bí mật SUC_CHUA_METRICS_KEY do chủ dự án nhập) và lịch gọi Edge (gói 218b).');
    if (x.nguon === 'nhat_ky') return t('Cần khoá Management API để đọc nhật ký (bí mật SUC_CHUA_MGMT_TOKEN). Đây là quyết định của chủ dự án.');
    return t('Bộ thu trong máy chủ chưa chạy (cần pg_cron, gói 218).');
  };
  const scSo = (v, dv) => { if (v == null) return '—'; const n = n0(v); const r = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10; return dv ? `${so(r)} ${t(SC_DV[dv] || dv)}` : so(r); };
  const scNgay = (s) => { const d = new Date(String(s || '')); return isNaN(d.getTime()) ? '' : C.fmtNgay(d.toISOString()).replace(/ \d{2}:\d{2}.*$/, ''); };
  const scLink = (s) => (typeof s === 'string' && /^https:\/\/[A-Za-z0-9.-]+(\/[^\s"<>]*)?$/.test(s) ? s : null);
  /** Giá in đủ chữ số (0,00325 USD / MAU, 0,0213 USD / GB) — không làm tròn như so(). */
  const scGia = (x) => (x.gia_ke_usd != null && x.gia_kieu ? `${n0(x.gia_ke_usd).toLocaleString(C.locale(), { maximumFractionDigits: 5 })} ${t(SC_GIA[x.gia_kieu] || '')}` : '');
  const scNguongDo = (x, ng) => (x.kieu === 'cpu_ram' ? n0(ng.cpu_do_p95) : x.tich_luy && n0(x.han_muc_ngay) ? n0(x.han_muc_ngay) * n0(ng.do_pt) / 100 : !n0(x.han_muc) || x.tich_luy ? null
    : n0(x.han_muc) * (x.kieu === 'ket_noi' ? n0(ng.ket_noi_do_pt) : x.kieu === 'realtime' ? n0(ng.realtime_do_pt) : n0(ng.do_pt)) / 100);
  /** Một dòng chính (giá trị) + các dòng phụ theo kiểu tài nguyên. */
  function scGiaTri(x) {
    const p = x.phu || {}; const dv = x.don_vi;
    if (x.kieu === 'cpu_ram') return [`${t('p95 một giờ qua')} ${scSo(x.gia_tri)} %`, p.tb_1h != null ? `${t('trung bình')} ${scSo(p.tb_1h)} %` : ''];
    if (x.kieu === 'thu_hong') return [`${scSo(x.gia_tri)} ${t('lần hỏng trong 1 giờ qua')}`, `${t('24 giờ')}: ${scSo(p.hong_24h)} ${t('hỏng')} / ${scSo(p.thu_24h)} ${t('lần gửi')}${n0(p.het_luot_24h) ? ` · 429: ${scSo(p.het_luot_24h)}` : ''}${p.ma && Object.keys(p.ma).length ? ` · ${t('mã')} ${Object.entries(p.ma).map(([m, n]) => `${esc(m)} × ${so(n0(n))}`).join(', ')}` : ''}`];
    if (x.kieu === 'day') return [`${t('1 giờ qua')}: ${so(n0(p.gui_1h))} ${t('gửi được')}, ${so(n0(p.hong_1h))} ${t('hỏng')}`, `${t('24 giờ')}: ${so(n0(p.gui_24h))} ${t('gửi được')}, ${so(n0(p.hong_24h))} ${t('hỏng')}`];
    const tren = x.han_muc != null ? `${scSo(x.gia_tri)} / ${scSo(x.han_muc, dv)}` : scSo(x.gia_tri, dv);
    if (x.kieu === 'ket_noi') return [`${t('đỉnh 24 giờ')} ${scSo(p.dinh_24h)} / ${scSo(x.han_muc, dv)}`, `${t('lúc này')} ${scSo(x.gia_tri)}`];
    if (x.kieu === 'realtime') return [`${t('đỉnh hôm nay')} ${scSo(p.dinh_hom_nay)} / ${scSo(x.han_muc, dv)}`, `${t('lúc này')} ${scSo(x.gia_tri)}`];
    if (x.kieu === 'thang' || x.kieu === 'thong_tin') {
      return [`${tren}${x.tich_luy ? ` ${t('tháng này')}` : ''}`, [p.du_phong != null && x.kieu !== 'thong_tin' ? `${t('dự phóng cuối tháng')} ${scSo(p.du_phong)}` : '',
        x.han_muc_ngay ? `${t('hôm nay')} ${scSo(p.hom_nay)} / ${scSo(x.han_muc_ngay)}` : ''].filter(Boolean).join(' · ')];
    }
    return [tren, ''];
  }
  /** Chuỗi 31 ngày (ô cuối là hôm nay, ngày UTC) → nhãn ngày + số, cắt còn `ky` ngày. */
  function scChuoi(x, ky, luc) {
    const v = Array.isArray(x.chuoi) ? x.chuoi.slice(-ky) : [];
    const goc = new Date(luc || Date.now());
    const nhan = v.map((_, i) => { const d = new Date(Date.UTC(goc.getUTCFullYear(), goc.getUTCMonth(), goc.getUTCDate() - (v.length - 1 - i))); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; });
    return { v: v.map((a) => (a == null ? null : n0(a))), nhan };
  }
  function scThe(x, ng, ky, luc, laOwner) {
    const [cls, chu] = SC_MUC[x.muc] || ['', x.muc || '—'];
    const ten = t(SC_TEN[x.khoa] || x.khoa);
    const coSo = x.muc !== 'chua_noi' && x.muc !== 'cu';
    const pt = x.phan_tram != null ? Math.max(0, Math.min(100, n0(x.phan_tram))) : null;
    const [chinh, phu] = coSo ? scGiaTri(x) : ['', ''];
    const nd = scNguongDo(x, ng);
    const ch = scChuoi(x, ky, luc);
    const coDuong = coSo && ch.v.filter((a) => a != null).length >= 2;
    const tenChuoi = x.kieu === 'cpu_ram' ? t('p95 một giờ cao nhất mỗi ngày') : x.kieu === 'day' ? t('tin gửi được mỗi ngày') : x.tich_luy || x.kieu === 'thu_hong' ? t('mỗi ngày') : t('cao nhất mỗi ngày');
    const tenNguong = x.tich_luy ? t('ngưỡng đỏ của trần ngày') : t('ngưỡng đỏ');
    const duong = coDuong ? chuThich([{ ten: tenChuoi, mau: TQ(1) }, ...(nd != null ? [{ ten: tenNguong, mau: 'var(--tq-khac)', kieu: 'pt-key-dut' }] : [])])
      + cho((W) => vung([{ ten: tenChuoi, mau: TQ(1), gt: ch.v, kieu: 'vung' }, ...(nd != null ? [{ ten: tenNguong, mau: 'var(--tq-khac)', gt: ch.v.map(() => nd), kieu: 'dut' }] : [])],
        ch.nhan, { W, cao: 120, tomTat: `${ten}: ${tenChuoi}, ${ky} ${t('ngày qua')}` }))
      : coSo ? `<p class="hint sc-it">${t('Chưa đủ hai ngày số để vẽ xu hướng.')}</p>` : '';
    const lk = scLink(x.link), ng2 = scLink(x.nguon_gia);
    const gia = scGia(x);
    const viec = `${t(SC_VIEC[x.khoa] || '')}${x.goi_ke && x.kieu !== 'thong_tin' ? `: ${esc(x.goi_ke)}${gia ? ` (${esc(gia)})` : ''}` : x.kieu === 'thong_tin' && x.han_muc ? `. ${t('Trên')} ${scSo(x.han_muc, 'USD')} ${t('mỗi tháng thì phí là')} ${esc(gia)}` : ''}.`;
    const cham = x.ngay_cham ? `${x.tich_luy || x.kieu === 'thang' ? t('dự kiến hết hạn mức ngày') : t('dự kiến chạm ngưỡng đỏ ngày')} ${esc(scNgay(x.ngay_cham))}` : '';
    return `<article class="card sc-the${x.muc === 'do' ? ' sc-do' : ''}" id="sc-${esc(x.khoa)}">
      <div class="sc-dau"><h3>${esc(ten)}</h3><span class="tag ${cls}">${x.muc === 'do' ? '! ' : ''}${esc(t(chu))}</span></div>
      ${coSo ? `<div class="sc-so"><b>${chinh}</b>${pt != null && x.kieu !== 'cpu_ram' ? `<span>${so(Math.round(n0(x.phan_tram) * 10) / 10)} %</span>` : ''}</div>
        ${pt != null ? `<div class="sc-thanh" role="img" aria-label="${esc(`${ten} ${so(Math.round(pt))} %`)}"><i style="width:${pt}%;background:${SC_MAU[x.muc] || 'var(--line2)'}"></i><s style="left:${n0(ng.vang_pt)}%"></s><s style="left:${n0(ng.do_pt)}%"></s></div>` : ''}
        ${phu || cham || x.ly_do ? `<p class="sc-phu">${[phu, x.ly_do === 'chi_csdl' ? t('chưa nối Metrics API nên đang tính bằng cỡ cơ sở dữ liệu') : '', x.ly_do === 'du_phong' ? t('đỏ vì dự phóng cuối tháng vượt hạn mức') : '', x.ly_do === 'ngay' ? t('đỏ vì gần hết trần trong ngày') : '', cham].filter(Boolean).join(' · ')}</p>` : ''}`
        : `<p class="sc-chua">${esc(scVsao(x))}</p>`}
      ${duong}
      <div class="sc-viec"><b>${t('Khi đỏ thì làm gì')}</b><span>${viec}</span>
        <div class="sc-chan">${lk ? `<a class="btn sm" href="${esc(lk)}" target="_blank" rel="noopener noreferrer">${t('Mở nơi nâng cấp')} ↗</a>` : ''}
          <span class="hint">${x.doc_luc ? `${t('Hạn mức và giá đọc ngày')} ${esc(C.fmtNgay(x.doc_luc))}` : t('Chưa ghi ngày đọc giá')}${ng2 ? ` · <a href="${esc(ng2)}" target="_blank" rel="noopener noreferrer">${t('nguồn')}</a>` : ''}${x.tat_thu ? ` · ${t('đã tắt thư cảnh báo')}` : ''}</span>
          ${laOwner ? `<button class="btn ghost sm" data-sc-sua="${esc(x.khoa)}">${t('Sửa')}</button>` : ''}</div></div>
    </article>`;
  }
  const SC_MA_LOI = { chua_co_khoa: 'chưa có khoá gửi thư', loi_mang: 'lỗi mạng', http_401: 'khoá sai', http_403: 'khoá không đủ quyền', http_429: 'hết lượt gửi' };
  const SC_TT_THU = { cho: 'chờ gửi', da_gui: 'đã gửi', loi: 'chưa gửi được', bo_qua_tat: 'không gửi (đã tắt thư)', bo_qua_6h: 'không gửi (đã gửi trong 6 giờ)', bo_qua_tran: 'không gửi (đủ trần thư trong ngày)', bo_qua_tuan: 'không gửi (tắt thư tuần)' };
  function sucChua(main, d, ctx) {
    C = ctx; tqId = 0;
    { const tip0 = document.querySelector('.pt-tip'); if (tip0) tip0.hidden = true; }
    const ds = Array.isArray(d.tai_nguyen) ? d.tai_nguyen : [];
    const ng = d.nguong || {}; const ky = ctx.ky === 7 ? 7 : 30; const luc = d.luc;
    const theo = (k) => ds.find((x) => x.khoa === k);
    const dem = (m) => ds.filter((x) => x.muc === m).length;
    // nguồn số
    const ngu = d.nguon || {}; const thu = d.thu || {};
    const mocNguon = (k, ten) => { const x = ngu[k]; const tuoi = x && x.luc ? (Date.now() - new Date(x.luc).getTime()) / 60000 : null;
      const ok = x && !x.loi && tuoi != null && tuoi < 30;
      return `<span class="sc-ng"><i class="${ok ? 'ok' : x ? 'warn' : ''}" aria-hidden="true"></i>${esc(ten)}: ${!x ? t('chưa nối') : x.loi ? `${t('lỗi')} ${esc(x.loi)}` : `${so(Math.max(0, Math.round(tuoi)))} ${t('phút trước')}`}</span>`; };
    const nguonHtml = `<div class="sc-nguon">${mocNguon('noi_bo', t('Trong máy chủ'))}${mocNguon('may_chu', 'Metrics API')}${mocNguon('nhat_ky', t('Nhật ký Auth và Edge'))}
      <span class="sc-ng"><i class="${thu.co_khoa ? 'ok' : ''}" aria-hidden="true"></i>${t('Thư cảnh báo')}: ${thu.co_khoa ? `${t('đã có khoá')}${thu.lan_gui_cuoi ? `, ${t('gửi gần nhất')} ${esc(C.fmtNgay(thu.lan_gui_cuoi))}` : ''}` : t('chưa có khoá gửi thư')}</span></div>`;
    // lúc nào nâng
    const ba = (Array.isArray(d.lua_chon_nang) ? d.lua_chon_nang : []).map(theo).filter(Boolean);
    const baHtml = ba.length ? ba.map((x) => { const [cls, chu] = SC_MUC[x.muc] || ['', '']; const gia = scGia(x);
      return `<button class="tq-cb tq-cb-${x.muc === 'do' ? 'danger' : x.muc === 'vang' ? 'warn' : 'ok'} sc-ba" data-sc-cuon="sc-${esc(x.khoa)}"><span class="tq-cbi" aria-hidden="true">${x.muc === 'xanh' ? '✓' : '!'}</span>
        <span><b>${esc(t(SC_TEN[x.khoa] || x.khoa))}</b><small>${esc(t(chu))}${x.phan_tram != null ? ` · ${so(Math.round(n0(x.phan_tram)))} %` : ''} · ${x.ly_do === 'ngay' ? `${t('gần hết trần trong ngày')}: ${t('hôm nay')} ${scSo((x.phu || {}).hom_nay)} / ${scSo(x.han_muc_ngay)}`
          : x.ly_do === 'du_phong' ? `${t('dự phóng cuối tháng')} ${scSo((x.phu || {}).du_phong)} / ${scSo(x.han_muc)}` : x.ngay_cham ? `${t('dự kiến chạm ngưỡng ngày')} ${esc(scNgay(x.ngay_cham))}` : t('chưa thấy ngày chạm ngưỡng')}</small>
        <small>${x.goi_ke ? `${t('Nâng lên')} ${esc(x.goi_ke)}${gia ? ` · ${esc(gia)}` : ''}` : esc(t(SC_VIEC[x.khoa] || ''))}</small></span><span class="tq-cbx">${t('Xem')} →</span></button>`; }).join('')
      : `<div class="tq-cb tq-cb-ok"><span class="tq-cbi" aria-hidden="true">✓</span><span><b>${t('Chưa có số để xếp')}</b><small>${t('Khi bộ thu chạy, ba phần gần ngưỡng đỏ nhất hiện ở đây.')}</small></span></div>`;
    // người dùng (thứ tạo ra tải)
    const nd = d.nguoi_dung || {}; const dau = (nd.dau || []).map((a) => (a == null ? null : n0(a))), dk = (nd.dang_ky || []).map((a) => (a == null ? null : n0(a)));
    const onl = (nd.online_dinh || []).map((a) => (a == null ? null : n0(a))), dn = (nd.dang_nhap || []).map((a) => (a == null ? null : n0(a)));
    const cuoi = (a) => (a.length ? a[a.length - 1] : null);
    const nguoiHtml = `<div class="tq-kpis">${[
      tqO({ nhan: t('Hoạt động hôm nay (DAU)'), gt: so(cuoi(dau)), mau: TQ(2), duong: dau.slice(-ky) }),
      tqO({ nhan: t('Đang mở app lúc này'), gt: so(nd.online_luc_nay), mau: TQ(1), phu: `${t('đỉnh hôm nay')} ${so(cuoi(onl))}`, duong: onl.slice(-ky) }),
      tqO({ nhan: t('MAU (30 ngày)'), gt: so(nd.mau), mau: TQ(7), phu: theo('nguoi_mau') && theo('nguoi_mau').han_muc ? `${t('gói cho')} ${so(theo('nguoi_mau').han_muc)}` : '' }),
      tqO({ nhan: t('Đăng ký hôm nay'), gt: so(cuoi(dk)), mau: TQ(5), duong: dk.slice(-ky) }),
      tqO({ nhan: t('Đăng nhập hôm nay'), gt: so(cuoi(dn)), mau: TQ(4), phu: t('phiên mới, không tính phiên đã đăng xuất'), duong: dn.slice(-ky) }),
    ].join('')}</div><p class="hint">${t('Gồm cả tài khoản nội bộ và tài khoản thử. Ngày theo giờ UTC.')} ${t('"Đang mở app" đếm người có nhịp tim trong 3 phút, đỉnh là số lớn nhất của các lần đo 5 phút.')}</p>`;
    // các nhóm tài nguyên
    const nhomHtml = SC_NHOM.map(([ten, cac], i) => { const ds2 = ds.filter((x) => cac.includes(x.nhom)); if (!ds2.length) return '';
      return `<section class="sc-nhom" id="scn-${i}"><h2>${esc(t(ten))}</h2><div class="sc-luoi">${ds2.map((x) => scThe(x, ng, ky, luc, d.la_owner)).join('')}</div></section>`; }).join('');
    // Edge theo hàm
    const ham = Array.isArray(d.ham_edge) ? d.ham_edge : null;
    const hamHtml = ham && ham.length ? `<div class="scrollx"><table class="tbl"><thead><tr><th>${t('Hàm')}</th><th class="num">${t('Lượt 24 giờ')}</th><th class="num">${t('Lỗi 5xx')}</th><th class="num">${t('Tỉ lệ lỗi')}</th><th class="num">4xx</th><th class="num">p95</th></tr></thead>
      <tbody>${ham.map((h) => { const tl = n0(h.luot) ? (n0(h.loi_5xx) / n0(h.luot)) * 100 : 0; return `<tr><td><code>${esc(h.ham)}</code></td><td class="num">${so(n0(h.luot))}</td><td class="num">${so(n0(h.loi_5xx))}</td>
        <td class="num">${tl >= 5 ? `<span class="tag danger">${so(Math.round(tl * 10) / 10)} %</span>` : tl >= 0.1 ? `${so(Math.round(tl * 10) / 10)} %` : tl > 0 ? '<0,1 %' : '0 %'}</td><td class="num">${so(n0(h.loi_4xx))}</td><td class="num">${h.p95_ms != null ? `${so(n0(h.p95_ms))} ms` : '—'}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="hint">${t('Cập nhật mỗi giờ từ nhật ký Edge')}${d.ham_edge_luc ? ` · ${esc(C.fmtNgay(d.ham_edge_luc))}` : ''}. ${t('4xx thường là lời gọi bị từ chối đúng luật (chưa đăng nhập, hết lượt), không phải lỗi máy chủ.')}</p>`
      : `<p class="hint">${esc(scVsao({ nguon: 'nhat_ky' }))}</p>`;
    // cảnh báo đã có
    const cb = Array.isArray(d.canh_bao) ? d.canh_bao : [];
    const gio = C.fmtGio || C.fmtNgay;
    const cbHtml = cb.length ? `<div class="scrollx"><table class="tbl sc-tbl"><thead><tr><th>${t('Lúc')}</th><th>${t('Phần')}</th><th>${t('Thư')}</th><th>${t('Tình trạng')}</th></tr></thead><tbody>${cb.map((b) =>
      `<tr><td>${esc(gio(b.luc))}</td><td>${b.loai === 'tuan' ? t('Thư tuần') : esc(t(SC_TEN[b.khoa] || b.khoa))}${b.phan_tram != null ? ` · ${so(Math.round(n0(b.phan_tram)))} %` : ''}</td>
       <td>${b.trang_thai === 'loi' ? `<span class="tag danger">${esc(t(SC_TT_THU.loi))}</span>${b.loi ? ` ${SC_MA_LOI[b.loi] ? esc(t(SC_MA_LOI[b.loi])) : `<code>${esc(b.loi)}</code>`}` : ''}` : esc(t(SC_TT_THU[b.trang_thai] || b.trang_thai))}</td>
       <td>${b.loai !== 'do' ? '' : b.ket_thuc_luc ? `${t('hết đỏ lúc')} ${esc(gio(b.ket_thuc_luc))}` : `<span class="tag danger">${t('còn đỏ')}</span>`}</td></tr>`).join('')}</tbody></table></div>`
      : `<p class="hint">${t('Chưa có cảnh báo nào.')}</p>`;
    const nguongHtml = `<div class="tq-kvs">${[[t('Vàng / đỏ theo % hạn mức'), `${so(n0(ng.vang_pt))} % / ${so(n0(ng.do_pt))} %`],
      [t('CPU, RAM vàng'), `${t('p95 một giờ')} > ${so(n0(ng.cpu_vang_p95))} % ${t('trên')} ${so(n0(ng.cpu_vang_ngay))} ${t('ngày trong tuần')}`],
      [t('CPU, RAM đỏ'), `${t('p95 một giờ')} > ${so(n0(ng.cpu_do_p95))} % ${so(n0(ng.cpu_do_ngay_lien))} ${t('ngày liền')}`],
      [t('Kết nối Postgres đỏ'), `${so(n0(ng.ket_noi_do_pt))} % max_connections ${t('ở bất kỳ mốc 5 phút nào trong 24 giờ')}`],
      [t('Realtime đỏ'), `${so(n0(ng.realtime_do_pt))} % ${t('hạn mức ở đỉnh trong ngày')}`],
      [t('Hạn mức theo tháng đỏ'), t('khi dự phóng cuối tháng (tuyến tính 7 ngày gần nhất) vượt hạn mức')],
      [t('Thư Auth đỏ'), t('ở lần gửi hỏng đầu tiên trong một giờ, hoặc ở mức đỏ của trần ngày')],
      [t('Thông báo đẩy đỏ'), t('khi mọi lần gửi trong 1 giờ đều hỏng')],
      [t('Thư cảnh báo'), `${t('một thư mỗi lần đỏ, tối đa 1 thư mỗi phần trong 6 giờ')}, ${t('tối đa')} ${so(n0(ng.thu_toi_da_ngay))} ${t('thư mỗi ngày')}, ${ng.tuan_bat ? t('thư tuần sáng thứ Hai') : t('thư tuần đang tắt')}`]]
      .map(([a, b]) => `<div><span>${esc(a)}</span><b>${b}</b></div>`).join('')}</div>${d.la_owner ? `<div class="row" style="margin-top:10px"><button class="btn sm" data-sc-nguong="1">${t('Sửa ngưỡng')}</button></div>` : ''}`;
    const kyNut = `<div class="chips" role="group" aria-label="${esc(t('Khoảng thời gian của xu hướng'))}">${[7, 30].map((k) => `<button class="chip" data-sc-ky="${k}" aria-pressed="${ky === k}">${k} ${t('ngày')}</button>`).join('')}</div>`;
    main.innerHTML = `<div class="stack sc" style="padding-top:14px">
      <div class="pt-head"><div><h1>${t('Sức chứa & nâng cấp')}</h1><p class="sub">${t('Mỗi thẻ là một phần của hệ thống so với hạn mức của gói đang dùng. Số đo mỗi 5 phút. Hạn mức, giá và nơi nâng cấp lấy từ bảng cài đặt, chủ dự án sửa được.')} ${t('Ngày theo giờ UTC, điểm cuối của mỗi đường là hôm nay, chưa hết ngày.')}</p></div>${kyNut}</div>
      ${nguonHtml}
      <div class="tq-mini"><span>${t('Cần nâng')} <b>${so(dem('do'))}</b></span><span>${t('Cần để ý')} <b>${so(dem('vang'))}</b></span><span>${t('Ổn')} <b>${so(dem('xanh'))}</b></span><span>${t('Chưa nối')} <b>${so(dem('chua_noi') + dem('cu'))}</b></span></div>
      <section class="card"><div class="tq-th"><div><h2>${t('Lúc nào nâng')}</h2><span class="hint">${t('ba phần gần ngưỡng đỏ nhất, ngày chạm ngưỡng dự phóng tuyến tính từ 7 ngày gần nhất')}</span></div></div><div class="tq-viec-l tq-mt">${baHtml}</div></section>
      <section class="sc-nhom"><h2>${t('Người dùng')}</h2>${nguoiHtml}</section>
      ${nhomHtml}
      <section class="card"><div class="sec"><h2>${t('Edge Functions theo hàm')}</h2></div>${hamHtml}</section>
      <section class="card"><div class="sec"><h2>${t('Cảnh báo gần đây')}</h2><span class="hint">${t('gửi tới admin@himosocial.com')}</span></div>${cbHtml}</section>
      <section class="card"><div class="sec"><h2>${t('Ngưỡng')}</h2></div>${nguongHtml}</section>
    </div>`;
    main.querySelectorAll('[data-sc-cuon]').forEach((b) => b.addEventListener('click', () => { const el = main.querySelector(`#${b.dataset.scCuon}`); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); }));
    main.querySelectorAll('[data-sc-ky]').forEach((b) => b.addEventListener('click', () => ctx.doiKy(Number(b.dataset.scKy))));
    main.querySelectorAll('[data-sc-sua]').forEach((b) => b.addEventListener('click', () => ctx.sua(b.dataset.scSua)));
    main.querySelectorAll('[data-sc-nguong]').forEach((b) => b.addEventListener('click', () => ctx.suaNguong()));
    veBieuDo(main);
  }
  const scTen = (k) => SC_TEN[k];

  /** Các hàm thuần của khối theo kỳ — để bộ kiểm tĩnh gọi thẳng (đưa ngữ cảnh t / esc / so vào trước). */
  const dtkThu = (ctx) => { C = ctx; return { csvO, dtkCsv, dtkTenTep, dtkMucTieuCot, dtkNhan, dtkKhoi, dtkAnToan, cotKy, dtkSoMucTieu, dtkHuyHieu }; };

  window.HIMO_PT = { chienLuoc, vanHanh, chuyenSau, stories, nguoiThat, suKien, goiY, chanDung, chanDungTomTat, doanhThu, doanhThuTomTat, tongQuan, dtkThu, chuGiai: ganChuGiai,
    sucChua, scTen };
})();
