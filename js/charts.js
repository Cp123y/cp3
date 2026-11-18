/* 轻量 SVG 图表引擎 —— 无外部依赖 */
(function () {
  const AX = '#94a3b1';
  const GRID = '#eef2f7';

  function nf(v, d) {
    if (v == null || isNaN(v)) return '—';
    return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function wrap(w, h, inner) {
    return `<svg viewBox="0 0 ${w} ${h}" class="chart-svg" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
  }
  function legend(series, limits) {
    let h = '<div class="legend">';
    (series || []).forEach(s => { h += `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`; });
    (limits || []).forEach(l => { h += `<span><i class="dashed" style="border-color:${l.color}"></i>${esc(l.label)}</span>`; });
    return h + '</div>';
  }
  function smoothPath(pts) {
    if (!pts.length) return '';
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i], mx = (p0[0] + p1[0]) / 2;
      d += ` C${mx.toFixed(1)},${p0[1].toFixed(1)} ${mx.toFixed(1)},${p1[1].toFixed(1)} ${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
    }
    return d;
  }

  /* ---------- 折线图 ---------- */
  function line(el, cfg) {
    if (!el) return;
    const W = cfg.width || 900, H = cfg.height || 280;
    const pad = { l: 56, r: 22, t: 18, b: cfg.legend === false ? 26 : 34 };
    const labels = cfg.labels || [];
    const series = cfg.series || [];
    const limits = cfg.limitLines || [];
    const bands = cfg.bands || [];

    let vals = [];
    series.forEach(s => s.values.forEach(v => { if (v != null && !isNaN(v)) vals.push(v); }));
    limits.forEach(l => vals.push(l.value));
    bands.forEach(b => b.upper.forEach((v, i) => {
      if (v != null && !isNaN(v)) { vals.push(v); vals.push(b.lower[i]); }
    }));
    if (!vals.length) vals = [0, 1];

    let min = cfg.yMin != null ? cfg.yMin : Math.min.apply(null, vals);
    let max = cfg.yMax != null ? cfg.yMax : Math.max.apply(null, vals);
    if (max - min < 1e-9) { max += 1; min -= 1; }
    const span0 = max - min;
    if (cfg.yMin == null) min -= span0 * 0.14;
    if (cfg.yMax == null) max += span0 * 0.14;

    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const X = i => pad.l + (labels.length <= 1 ? iw / 2 : iw * i / (labels.length - 1));
    const Y = v => pad.t + ih * (1 - (v - min) / (max - min));
    const dig = cfg.digits != null ? cfg.digits : ((max - min) > 60 ? 0 : 1);

    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = min + (max - min) * i / 4, y = Y(v);
      g += `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${W - pad.r}" y2="${y.toFixed(1)}" stroke="${GRID}"/>`;
      g += `<text x="${pad.l - 9}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10.5" fill="${AX}">${nf(v, dig)}</text>`;
    }
    const stepX = Math.max(1, Math.ceil(labels.length / 8));
    labels.forEach((lb, i) => {
      if (i % stepX === 0 || i === labels.length - 1) {
        g += `<text x="${X(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="10.5" fill="${AX}">${esc(lb)}</text>`;
      }
    });

    bands.forEach(b => {
      const idx = [];
      b.upper.forEach((v, i) => { if (v != null && !isNaN(v) && b.lower[i] != null) idx.push(i); });
      if (idx.length < 2) return;
      const up = idx.map(i => `${X(i).toFixed(1)},${Y(b.upper[i]).toFixed(1)}`);
      const lo = idx.slice().reverse().map(i => `${X(i).toFixed(1)},${Y(b.lower[i]).toFixed(1)}`);
      g += `<polygon points="${up.concat(lo).join(' ')}" fill="${b.color || '#8b5cf6'}" opacity="${b.opacity || 0.13}"/>`;
    });

    limits.forEach(l => {
      const y = Y(l.value).toFixed(1);
      g += `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="${l.color}" stroke-width="1.4" stroke-dasharray="6 4" opacity=".9"/>`;
      if (l.label) {
        g += `<text x="${W - pad.r - 3}" y="${(Number(y) - 5).toFixed(1)}" text-anchor="end" font-size="10.5" fill="${l.color}">${esc(l.label)}</text>`;
      }
    });

    series.forEach(s => {
      const pts = [];
      s.values.forEach((v, i) => { if (v != null && !isNaN(v)) pts.push([X(i), Y(v)]); });
      if (!pts.length) return;
      const d = smoothPath(pts);
      if (s.area) {
        const gid = 'g' + Math.random().toString(36).slice(2, 9);
        g += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${s.color}" stop-opacity=".2"/>
          <stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs>`;
        g += `<path d="${d} L${pts[pts.length - 1][0].toFixed(1)},${(pad.t + ih).toFixed(1)} L${pts[0][0].toFixed(1)},${(pad.t + ih).toFixed(1)} Z" fill="url(#${gid})"/>`;
      }
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}" stroke-linecap="round" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="7 5"' : ''}/>`;
      if (s.values.length <= 60) {
        s.values.forEach((v, i) => {
          if (v == null || isNaN(v)) return;
          g += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="6.5" fill="transparent"><title>${esc(labels[i] || '')} ${esc(s.name)} ${nf(v, dig)}</title></circle>`;
          if (i === s.values.length - 1 && s.dotLast !== false) {
            g += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.4" fill="#fff" stroke="${s.color}" stroke-width="2"/>`;
          }
        });
      }
    });

    el.innerHTML = (cfg.legend === false ? '' : legend(series, limits)) + wrap(W, H, g);
  }

  /* ---------- 柱状图 ---------- */
  function bar(el, cfg) {
    if (!el) return;
    const W = cfg.width || 900, H = cfg.height || 270;
    const limits = cfg.limits || [];           // 每个类别的排放限值
    const hasLimit = limits.length > 0;
    const pad = { l: 52, r: 20, t: 26, b: hasLimit ? 56 : 38 };
    const cats = cfg.categories || [];
    const series = cfg.series || [];
    let max = cfg.yMax != null ? cfg.yMax : 0;
    if (cfg.yMax == null) {
      series.forEach(s => s.values.forEach(v => { if (v != null) max = Math.max(max, v); }));
      max = max * 1.2 || 1;
    }
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const Y = v => pad.t + ih * (1 - v / max);
    const gw = iw / Math.max(cats.length, 1);
    const bw = Math.min(42, gw * 0.6 / Math.max(series.length, 1));
    const dig = cfg.digits != null ? cfg.digits : 0;
    const LIM = '#d9765c';

    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, y = Y(v);
      g += `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="${GRID}"/>`;
      g += `<text x="${pad.l - 9}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10.5" fill="${AX}">${nf(v, 0)}</text>`;
    }
    cats.forEach((c, ci) => {
      const cx = pad.l + gw * ci + gw / 2;
      const lim = hasLimit ? limits[ci] : null;
      series.forEach((s, si) => {
        const v = s.values[ci] || 0;
        const x = cx - (series.length * bw) / 2 + si * bw;
        const y = Y(v);
        const over = lim != null && si === series.length - 1 && v > lim;
        g += `<rect x="${(x + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${Math.max(1, pad.t + ih - y).toFixed(1)}" rx="3.5" fill="${over ? '#d9534f' : s.color}" opacity=".92">
          <title>${esc(c)} · ${esc(s.name)} ${nf(v, dig)}${lim != null ? ' / 限值 ' + lim : ''}</title></rect>`;
        if (cfg.showValues !== false) {
          g += `<text x="${(x + (bw - 3) / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="${over ? '#c0392b' : '#71839a'}">${nf(v, dig)}</text>`;
        }
      });
      // 该污染物的排放限值虚线
      if (lim != null) {
        const ly = Y(lim);
        const x0 = cx - gw * 0.44, x1 = cx + gw * 0.44;
        g += `<line x1="${x0.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${ly.toFixed(1)}"
          stroke="${LIM}" stroke-width="1.3" stroke-dasharray="4 3" opacity=".95">
          <title>${esc(c)} 排放限值 ${lim} mg/L</title></line>`;
        g += `<text x="${x1.toFixed(1)}" y="${(ly - 4).toFixed(1)}" text-anchor="end" font-size="9" fill="${LIM}">${lim}</text>`;
      }
      g += `<text x="${cx.toFixed(1)}" y="${H - 30}" text-anchor="middle" font-size="11" fill="#64748b">${esc(c)}</text>`;
      if (lim != null) {
        const out = series.length ? series[series.length - 1].values[ci] : null;
        const ok = out != null && out <= lim;
        g += `<text x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="9.5" fill="${ok ? '#7f8fa0' : '#c0392b'}">限值 ${lim}${ok ? ' · 达标' : ' · 超标'}</text>`;
      }
    });
    el.innerHTML = legend(series, hasLimit ? [{ label: cfg.limitName || '排放限值', color: LIM }] : []) + wrap(W, H, g);
  }

  /* ---------- 雷达图 ---------- */
  function radar(el, cfg) {
    if (!el) return;
    const W = 460, H = 348, cx = W / 2, cy = H / 2 + 6, R = 112;
    const axes = cfg.axes || [];
    const n = axes.length;
    const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    let g = '';
    for (let r = 4; r >= 1; r--) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = ang(i), rr = R * r / 4;
        pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
      }
      g += `<polygon points="${pts.join(' ')}" fill="${r === 4 ? '#fbfdff' : 'none'}" stroke="#e9eff6"/>`;
    }
    for (let i = 0; i < n; i++) {
      const a = ang(i);
      g += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * R).toFixed(1)}" y2="${(cy + Math.sin(a) * R).toFixed(1)}" stroke="#e9eff6"/>`;
      const lx = cx + Math.cos(a) * (R + 27), ly = cy + Math.sin(a) * (R + 19);
      g += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#64748b">${esc(axes[i].label)}</text>`;
    }
    (cfg.series || []).forEach(s => {
      const pts = s.values.map((v, i) => {
        const a = ang(i), rr = R * Math.max(0, Math.min(100, v)) / 100;
        return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
      });
      const str = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`);
      g += `<polygon points="${str.join(' ')}" fill="${s.color}" fill-opacity=".15" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
      pts.forEach(p => { g += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.8" fill="${s.color}"/>`; });
    });
    el.innerHTML = legend(cfg.series || []) + wrap(W, H, g);
  }

  /* ---------- 仪表盘 ---------- */
  function gauge(el, cfg) {
    if (!el) return;
    const W = 320, H = 186, cx = 160, cy = 152, R = 108;
    const v = Math.max(0, Math.min(100, cfg.value));
    const len = Math.PI * R;
    const color = cfg.color || '#0e9f6e';
    const g = `
      <path d="M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}" fill="none" stroke="#eef2f7" stroke-width="15" stroke-linecap="round"/>
      <path d="M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}" fill="none" stroke="${color}" stroke-width="15" stroke-linecap="round"
        stroke-dasharray="${(len * v / 100).toFixed(1)} ${len.toFixed(1)}"/>
      <text x="${cx}" y="${cy - 18}" text-anchor="middle" font-size="33" font-weight="700" fill="#17232f">${cfg.display != null ? cfg.display : v.toFixed(1)}<tspan font-size="14" fill="#8595a6">${cfg.suffix == null ? '%' : cfg.suffix}</tspan></text>
      <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="11.5" fill="#8595a6">${esc(cfg.label || '')}</text>
      <text x="${cx - R + 6}" y="${cy + 20}" text-anchor="middle" font-size="10" fill="#b3c0cd">0</text>
      <text x="${cx + R - 6}" y="${cy + 20}" text-anchor="middle" font-size="10" fill="#b3c0cd">100</text>`;
    el.innerHTML = wrap(W, H, g);
  }

  /* ---------- 环形图 ---------- */
  function donut(el, cfg) {
    if (!el) return;
    const W = 240, H = 176, cx = 120, cy = 88, R = 62, sw = 17;
    const items = cfg.items || [];
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    let a0 = -Math.PI / 2, g = '';
    items.forEach(it => {
      const a1 = a0 + it.value / total * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R;
      const x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      g += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)}"
        fill="none" stroke="${it.color}" stroke-width="${sw}"><title>${esc(it.name)} ${it.value}</title></path>`;
      a0 = a1;
    });
    g += `<text x="${cx}" y="${cy - 1}" text-anchor="middle" font-size="24" font-weight="700" fill="#17232f">${cfg.center != null ? cfg.center : total}</text>`;
    g += `<text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="10.5" fill="#8595a6">${esc(cfg.sub || '')}</text>`;
    el.innerHTML = wrap(W, H, g) +
      `<div class="legend" style="justify-content:center;margin-top:-4px">${items.map(i => `<span><i style="background:${i.color}"></i>${esc(i.name)} ${i.value}</span>`).join('')}</div>`;
  }

  /* ---------- 迷你曲线 ---------- */
  function spark(values, color) {
    const W = 120, H = 34, p = 3;
    const mn = Math.min.apply(null, values), mx = Math.max.apply(null, values);
    const span = (mx - mn) || 1;
    const pts = values.map((v, i) => [
      p + (W - p * 2) * i / Math.max(1, values.length - 1),
      H - p - (H - p * 2) * (v - mn) / span
    ]);
    const d = smoothPath(pts);
    return `<svg viewBox="0 0 ${W} ${H}" class="spark-svg"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/></svg>`;
  }

  window.CHARTS = { line, bar, radar, gauge, donut, spark, nf, esc };
})();
