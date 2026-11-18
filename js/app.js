/* =================== 工具 =================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad2 = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const nf = (v, d = 1) => Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dateStr = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const PAGE_META = {
  home: ['首页总览', '厂区运行状态与关键指标一览'],
  model3d: ['3D 厂区模型', '数字孪生厂区 · 按设计总平面图布置构筑物与管线'],
  water: ['实时水质监测', '进出水水质指标实时趋势与达标判断'],
  process: ['工艺运行监控', '各处理环节运行参数与设备状态'],
  efficiency: ['去除效率分析', '污染物去除率计算、对比与变化分析'],
  ai: ['AI 预测与预警', '污染物浓度预测、异常识别与风险预警'],
  history: ['历史数据查询', '历史监测数据检索、统计与报告生成'],
  chat: ['AI 智能问答', '结合监测数据分析污染物变化与工艺问题'],
};

const ICO = {
  flow: '<path d="M12 3c4 4.6 6.2 7.7 6.2 10.2A6.2 6.2 0 0 1 5.8 13.2C5.8 10.7 8 7.6 12 3z"/>',
  recycle: '<path d="M3.5 12a8.5 8.5 0 0 1 14.4-6.1L20.5 8"/><path d="M20.5 3.5V8h-4.5"/><path d="M20.5 12a8.5 8.5 0 0 1-14.4 6.1L3.5 16"/><path d="M3.5 20.5V16H8"/>',
  check: '<circle cx="12" cy="12" r="8.6"/><path d="M8.3 12.2l2.6 2.6 4.8-5.4"/>',
  device: '<path d="M4 21v-6M4 11V3M12 21v-9M12 8V3M20 21v-4M20 13V3"/><path d="M1.5 15h5M9.5 8h5M17.5 17h5"/>',
  bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.6 8.5-2.6 8.5h17.2S18 15 18 8.5z"/><path d="M13.7 20.5a2 2 0 0 1-3.4 0"/>',
};

const state = {
  page: 'home',
  waterInd: 'cod',
  unitId: 'orbal',
  twinUnit: 'ditch1',
  data: {},
  labels: [],
  chat: [],
  hist: { start: null, end: null, gran: 'day', ind: 'cod', rows: [] },
  updatedAt: new Date(),
};

/* =================== 数据模拟 =================== */
function initData() {
  const N = 48, now = new Date();
  state.labels = Array.from({ length: N }, (_, i) => {
    const t = new Date(now.getTime() - (N - 1 - i) * 30 * 60000);
    return pad2(t.getHours()) + ':' + pad2(t.getMinutes());
  });
  const gen = (base, amp, phase) => Array.from({ length: N }, (_, i) => {
    const x = i / (N - 1);
    return base
      + Math.sin(x * Math.PI * 2.2 + phase) * amp
      + Math.sin(x * Math.PI * 5.6 + phase * 1.7) * amp * 0.3
      + (Math.random() - 0.5) * amp * 0.32;
  });
  state.data = {};
  Object.keys(SPEC).forEach((k, idx) => {
    const s = SPEC[k];
    state.data[k] = { in: gen(s.inBase, s.inAmp, idx * 0.9), out: gen(s.outBase, s.outAmp, idx * 1.4 + 0.8) };
  });
  state.data.flow = { in: gen(FLOW.inBase, FLOW.inAmp, 0.5), out: gen(FLOW.outBase, FLOW.outAmp, 2.3) };
}

function current() {
  const o = {};
  Object.keys(SPEC).forEach(k => {
    const d = state.data[k];
    o[k] = { in: d.in[d.in.length - 1], out: d.out[d.out.length - 1] };
  });
  const f = state.data.flow;
  o.flow = { in: f.in[f.in.length - 1], out: f.out[f.out.length - 1] };
  return o;
}
const removal = k => {
  const c = current()[k];
  if (!c || !c.in) return 0;
  return (c.in - c.out) / c.in * 100;
};

function statusOf(k, out) {
  const s = SPEC[k];
  if (s.limit != null) return out <= s.limit ? { text: '达标', cls: 'ok' } : { text: '超标', cls: 'bad' };
  if (s.range) return (out >= s.range[0] && out <= s.range[1]) ? { text: '正常', cls: 'ok' } : { text: '越界', cls: 'bad' };
  if (k === 'do') return out >= (s.refMin || 0) ? { text: '正常', cls: 'ok' } : { text: '偏低', cls: 'warn' };
  return { text: '参考', cls: 'gray' };
}
const NO_REMOVAL = ['do', 'temp', 'orp', 'ph'];

/* =================== 实时刷新 =================== */
function tick() {
  Object.keys(SPEC).forEach(k => {
    const s = SPEC[k], d = state.data[k];
    const li = d.in.length - 1, lo = d.out.length - 1;
    d.in[li] = d.in[li] + (s.inBase - d.in[li]) * 0.09 + (Math.random() - 0.5) * s.inAmp * 0.05;
    d.out[lo] = d.out[lo] + (s.outBase - d.out[lo]) * 0.09 + (Math.random() - 0.5) * s.outAmp * 0.07;
  });
  ['in', 'out'].forEach(side => {
    const arr = state.data.flow[side];
    const base = side === 'in' ? FLOW.inBase : FLOW.outBase;
    const amp = side === 'in' ? FLOW.inAmp : FLOW.outAmp;
    const L = arr.length - 1;
    arr[L] = arr[L] + (base - arr[L]) * 0.1 + (Math.random() - 0.5) * amp * 0.08;
  });
  state.updatedAt = new Date();
  if (['home', 'water', 'process', 'ai', 'model3d'].includes(state.page)) renderPage(state.page);
}

function updateClock() {
  const d = new Date();
  $('#clockTime').textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  const wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  $('#clockDate').textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${wk}`;
}

/* =================== 路由 =================== */
function renderPage(page) {
  const meta = PAGE_META[page];
  if (meta) { $('#pageTitle').textContent = meta[0]; $('#pageDesc').textContent = meta[1]; }
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  if (page === 'home') renderHome();
  if (page === 'model3d') renderModel3D();
  if (page === 'water') renderWater();
  if (page === 'process') renderProcess();
  if (page === 'efficiency') renderEfficiency();
  if (page === 'ai') renderAI();
  if (page === 'history') renderHistory();
  if (page === 'chat') renderChat();
}

function goto(page) {
  if (!PAGE_META[page]) page = 'home';
  state.page = page;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  renderPage(page);
  if (location.hash !== '#' + page) history.replaceState(null, '', '#' + page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =================== 1. 首页 =================== */
function kpiCard(k) {
  return `<button class="kpi" type="button" data-kpi="${k.id}" title="查看${k.label}详情">
    <div class="kpi-top"><span>${k.label}</span><span class="kpi-ico">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[k.icon]}</svg>
    </span></div>
    <div class="kpi-val">${k.val}<small>${k.unit || ''}</small></div>
    <div class="kpi-foot">${k.foot || ''}</div>
    ${k.spark ? `<div class="kpi-spark">${CHARTS.spark(k.spark, k.color || '#2f7cf6')}</div>` : ''}
    <span class="kpi-go" aria-hidden="true">详情
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
    </span>
  </button>`;
}

/* KPI 卡片 → 明细页 */
function setHistRange(days, ind) {
  const today = new Date();
  $('#hStart').value = dateStr(addDays(today, -days));
  $('#hEnd').value = dateStr(today);
  $('#hGran').value = 'day';
  const opt = $('#hInd').querySelector(`option[value="${ind}"]`);
  if (opt) $('#hInd').value = ind;
}

const KPI_TARGET = {
  waterNow: () => { setHistRange(6, 'flow'); goto('history'); },
  volume: () => { setHistRange(29, 'flow'); goto('history'); },
  rate: () => goto('efficiency'),
  devices: () => goto('process'),
  alerts: () => goto('ai'),
};

function openKpi(id) {
  const fn = KPI_TARGET[id];
  if (fn) fn();
}

function renderHome() {
  const c = current();
  const volume = c.flow.out * 24 / 10000;
  const warnCount = ALERTS.filter(a => a.level !== '提示').length;
  const kpis = [
    { id: 'waterNow', label: '当前处理水量', val: nf(c.flow.out, 0), unit: ' m³/h', icon: 'flow', foot: '<span class="up">▲ 2.4%</span> 较昨日同时段', spark: state.data.flow.out, color: '#2f7cf6' },
    { id: 'volume', label: '今日累计处理量', val: nf(volume, 2), unit: ' 万 m³', icon: 'recycle', foot: '<span style="color:#8595a6">设计规模 3.0 万 m³/d</span>' },
    { id: 'rate', label: '出水综合达标率', val: '99.2', unit: ' %', icon: 'check', foot: '<span class="up">▲ 0.3%</span> 近 30 日', spark: [98.3, 98.7, 98.6, 99.0, 98.9, 99.1, 99.2], color: '#0e9f6e' },
    { id: 'devices', label: '运行设备', val: '42', unit: ' / 44 台', icon: 'device', foot: '<span style="color:#8595a6">1 台待机 · 1 台检修</span>' },
    { id: 'alerts', label: '待处理预警', val: warnCount, unit: ' 条', icon: 'bell', foot: '<span class="warn">总氮接近限值</span>' },
  ];
  $('#homeKpi').innerHTML = kpis.map(kpiCard).join('');
  $$('#homeKpi .kpi').forEach(b => { b.onclick = () => openKpi(b.dataset.kpi); });

  CHARTS.line($('#homeFlowChart'), {
    labels: state.labels,
    series: [
      { name: '进水流量', color: '#2f7cf6', values: state.data.flow.in, area: true },
      { name: '出水流量', color: '#0e9f6e', values: state.data.flow.out },
    ],
    digits: 0, width: 620, height: 268,
  });

  CHARTS.gauge($('#homeGauge'), { value: 99.2, label: '综合达标率 · 近 30 日', color: '#0e9f6e' });
  $('#homeMiniStats').innerHTML = [
    ['28', '达标天数'], ['1', '超标次数'], ['0.36', '平均余氯 mg/L'],
  ].map(([v, l]) => `<div class="mini-stat"><b>${v}</b><span>${l}</span></div>`).join('');

  const mainKeys = ['cod', 'bod5', 'nh3', 'tn', 'tp', 'ss'];
  CHARTS.bar($('#homeBar'), {
    categories: mainKeys.map(k => SPEC[k].name),
    series: [
      { name: '进水', color: '#9dc0ea', values: mainKeys.map(k => c[k].in) },
      { name: '出水', color: '#1289a7', values: mainKeys.map(k => c[k].out) },
    ],
    limits: mainKeys.map(k => SPEC[k].limit),
    limitName: 'GB18918-2002 一级 A',
    digits: 0, width: 620, height: 276,
  });

  $('#homeAlertCount').textContent = `${ALERTS.length} 条待关注`;
  $('#homeAlerts').innerHTML = ALERTS.map((a, i) => {
    const lv = a.level === '严重' ? 'danger' : a.level === '警告' ? 'warn' : 'info';
    return `<button class="alert-item ${lv}" type="button" data-alert="${i}" title="查看预警详情">
      <div style="flex:1;min-width:0">
        <div class="alert-title">${a.title}<span class="alert-time">${a.time}</span></div>
        <div class="alert-desc">${a.desc}</div>
      </div>
      <span class="alert-go" aria-hidden="true">›</span>
    </button>`;
  }).join('');
  $$('#homeAlerts .alert-item').forEach(b => { b.onclick = () => goto('ai'); });

  const keys = ['cod', 'bod5', 'nh3', 'tn', 'tp', 'ss', 'ph', 'do'];
  $('#homeIndGrid').innerHTML = keys.map(k => {
    const s = SPEC[k], st = statusOf(k, c[k].out);
    return `<div class="ind-card">
      <div class="name"><span>${s.name}</span><span class="chip ${st.cls}">${st.text}</span></div>
      <div class="val">${nf(c[k].out, s.digits)}<small>${s.unit}</small></div>
      <div class="meta"><span>进水 ${nf(c[k].in, s.digits)}</span>
      <span>${NO_REMOVAL.includes(k) ? '—' : '去除 ' + nf(removal(k), 1) + '%'}</span></div>
    </div>`;
  }).join('');
}

/* =================== 2. 实时水质监测 =================== */
function renderWater() {
  const keys = Object.keys(SPEC);
  $('#waterTabs').innerHTML = keys.map(k =>
    `<button class="chip-btn ${state.waterInd === k ? 'active' : ''}" data-ind="${k}">${SPEC[k].name}</button>`
  ).join('');
  $$('#waterTabs .chip-btn').forEach(b => {
    b.onclick = () => { state.waterInd = b.dataset.ind; renderWater(); };
  });

  const k = state.waterInd, s = SPEC[k], d = state.data[k];
  $('#waterChartTitle').textContent = `${s.full} 进出水变化趋势`;

  let limits = [];
  if (s.limit != null) limits = [{ value: s.limit, label: `排放限值 ${s.limit}`, color: '#dc4b3e' }];
  else if (s.range) limits = [{ value: s.range[1], label: `上限 ${s.range[1]}`, color: '#dc4b3e' }, { value: s.range[0], label: `下限 ${s.range[0]}`, color: '#dc4b3e' }];

  CHARTS.line($('#waterChart'), {
    labels: state.labels,
    series: [
      { name: '进水', color: '#2f7cf6', values: d.in, area: true },
      { name: '出水', color: '#0e9f6e', values: d.out },
    ],
    limitLines: limits,
    digits: s.digits,
    width: 760, height: 306,
  });

  const ci = d.in[d.in.length - 1], co = d.out[d.out.length - 1];
  const st = statusOf(k, co);
  const pct = s.limit != null ? clamp(co / s.limit * 100, 0, 130) : (s.range ? clamp(co / s.range[1] * 100, 0, 130) : 50);
  const meterCls = pct > 100 ? 'bad' : pct > 85 ? 'warn' : '';
  const recent = d.out.slice(-12);
  $('#waterUpdate').textContent = `更新于 ${state.updatedAt.toLocaleTimeString('zh-CN', { hour12: false })}`;
  $('#waterCurrent').innerHTML = `
    <div class="read-main">
      <div class="label">出水 ${s.name} · 当前</div>
      <div class="num">${nf(co, s.digits)}<small>${s.unit}</small></div>
      <div class="chips-row">
        <span class="chip ${st.cls}">${st.text}</span>
        <span class="chip gray">${s.limit != null ? '限值 ' + s.limit : s.range ? '区间 ' + s.range[0] + '–' + s.range[1] : '参考指标'}</span>
      </div>
    </div>
    <div class="read-row"><span>进水浓度</span><b>${nf(ci, s.digits)} ${s.unit}</b></div>
    <div class="read-row"><span>去除率</span><b>${NO_REMOVAL.includes(k) ? '—' : nf(removal(k), 1) + ' %'}</b></div>
    <div class="read-row"><span>${s.limit != null ? '占限值比例' : '运行区间占比'}</span><b>${nf(pct, 1)} %</b></div>
    <div class="meter"><i class="${meterCls}" style="width:${Math.min(pct, 100)}%"></i></div>
    <div class="read-row" style="margin-top:10px"><span>近 6 小时最高</span><b>${nf(Math.max.apply(null, recent), s.digits)} ${s.unit}</b></div>
    <div class="read-row"><span>近 6 小时最低</span><b>${nf(Math.min.apply(null, recent), s.digits)} ${s.unit}</b></div>
    <div class="read-row"><span>采样频率</span><b>30 分钟 / 次</b></div>`;

  $('#waterTable').innerHTML = `<table>
    <thead><tr><th>监测指标</th><th>类别</th><th>进水</th><th>出水</th><th>去除率</th><th>排放限值</th><th>状态</th></tr></thead>
    <tbody>${keys.map(kk => {
      const sp = SPEC[kk], cc = current()[kk], s2 = statusOf(kk, cc.out);
      return `<tr>
        <td>${sp.name}</td>
        <td>${sp.group || '—'}</td>
        <td>${nf(cc.in, sp.digits)} ${sp.unit}</td>
        <td>${nf(cc.out, sp.digits)} ${sp.unit}</td>
        <td>${NO_REMOVAL.includes(kk) ? '—' : nf(removal(kk), 1) + ' %'}</td>
        <td>${sp.limit != null ? sp.limit : sp.range ? sp.range[0] + '–' + sp.range[1] : '—'}</td>
        <td><span class="chip ${s2.cls}">${s2.text}</span></td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

/* =================== 3. 工艺监控 =================== */
const UNIT_STATUS_KEY = ['设备状态', '刮泥机状态', '刮吸泥机', '达标情况', '除砂机状态', '除污机',
  '砂水分离器', '浓缩机', '搅拌器', '转刷运行', '泵组', '提升泵运行', '脱水机', '运行泵组'];

const UNIT_METRIC = {
  inlet: { k: 'cod', s: 'in', label: '进水 COD' },
  coarse: { k: 'ss', s: 'in', label: '进水悬浮物' },
  fine: { k: 'ss', s: 'in', label: '进水悬浮物' },
  grit: { k: 'ss', s: 'in', label: '进水悬浮物' },
  dist1: { k: 'ss', s: 'in', label: '进水悬浮物' },
  anaer: { k: 'orp', s: 'in', label: '厌氧区 ORP' },
  orbal: { k: 'do', s: 'out', label: '好氧区溶解氧' },
  dist2: { k: 'ss', s: 'out', label: '出水悬浮物' },
  secondary: { k: 'ss', s: 'out', label: '出水悬浮物' },
  lift2: { k: 'ss', s: 'out', label: '出水悬浮物' },
  floc: { k: 'tp', s: 'in', label: '进水总磷' },
  primary: { k: 'ss', s: 'out', label: '出水悬浮物' },
  dnf: { k: 'tn', s: 'out', label: '出水总氮' },
  contact: { k: 'nh3', s: 'out', label: '出水氨氮' },
  measure: { k: 'cod', s: 'out', label: '出水 COD' },
  outlet: { k: 'cod', s: 'out', label: '出水 COD' },
  sludgePump: { k: 'ss', s: 'in', label: '进泥悬浮物' },
  thickener: { k: 'ss', s: 'in', label: '进泥悬浮物' },
  storage: { k: 'ss', s: 'in', label: '污泥浓度' },
  dewater: { k: 'ss', s: 'in', label: '污泥浓度' },
  transport: { k: 'ss', s: 'out', label: '滤液悬浮物' },
};

/* 实时值替换：表内静态参数替换为当前监测值 */
function liveParam(key, val) {
  const c = current();
  const map = {
    '出水 COD': nf(c.cod.out, 1), '出水氨氮': nf(c.nh3.out, 2), '出水总磷': nf(c.tp.out, 2),
    '出水总氮': nf(c.tn.out, 2), '出水 SS': nf(c.ss.out, 1), '排放流量': nf(c.flow.out, 0),
    '进水流量': nf(c.flow.in, 0), '进水 COD': nf(c.cod.in, 0), '进水氨氮': nf(c.nh3.in, 2),
    '进水总磷': nf(c.tp.in, 2), '进水 pH': nf(c.ph.in, 2), '进水水温': nf(c.temp.in, 1),
    '溶解氧 DO': nf(c.do.out, 2), 'ORP': nf(c.orp.in, 0), '池内水温': nf(c.temp.out, 1),
    '好氧区 DO': nf(c.do.out, 2), '外沟 DO': nf(c.do.out * 0.15, 2),
    '中沟 DO': nf(c.do.out * 0.5, 2), '内沟 DO': nf(c.do.out, 2),
  };
  return map[key] != null ? map[key] : val;
}

function unitParamsHTML(u) {
  return `<table><tbody>${u.params.map(([key, val, unit]) => {
    const v = liveParam(key, val);
    const isStatus = UNIT_STATUS_KEY.includes(key);
    const okState = v !== '检修' && v.indexOf('停') < 0 && v.indexOf('待机') < 0 && v.indexOf('故障') < 0;
    return `<tr><td>${key}</td><td class="num-cell" style="text-align:right">${isStatus
      ? `<span class="chip ${okState ? 'ok' : 'warn'}">${v}</span>`
      : v + (unit ? ' <span style="color:#8595a6;font-size:11px">' + unit + '</span>' : '')}</td></tr>`;
  }).join('')}</tbody></table>`;
}

function renderProcess() {
  FLOW2D.render($('#flowSchematic'), state.unitId, id => {
    state.unitId = id;
    renderProcess();
  });

  const u = PLANT_UNITS.find(x => x.id === state.unitId) || PLANT_UNITS[6];
  $('#unitTitle').textContent = `${u.name} · 运行参数`;
  $('#unitSub').textContent = u.desc;
  $('#unitParams').innerHTML = unitParamsHTML(u);

  const m = UNIT_METRIC[u.id] || { k: 'cod', s: 'in', label: '进水 COD' };
  CHARTS.line($('#unitChart'), {
    labels: state.labels,
    series: [{ name: m.label, color: '#1289a7', values: state.data[m.k][m.s], area: true }],
    digits: SPEC[m.k].digits, width: 560, height: 175,
  });

  $('#equipList').innerHTML = EQUIPMENTS.map(e => {
    const cls = e.status === '运行' ? 'ok' : e.status === '待机' ? 'gray' : 'bad';
    return `<div class="equip-row">
      <span class="dot ${e.status === '运行' ? 'ok' : e.status === '待机' ? 'warn' : 'bad'}"></span>
      <span class="equip-name">${e.name}</span>
      <span class="equip-area">${e.area}</span>
      <span class="chip ${cls}">${e.status}</span>
      <span class="equip-meta">${e.status === '运行' ? e.current.toFixed(1) + ' A' : '—'}</span>
      <span class="equip-meta" style="width:66px;text-align:right">${nf(e.hours, 0)} h</span>
    </div>`;
  }).join('');
}

/* =================== 3.5 三维厂区模型 =================== */
const TWIN_MINI = [
  ['进水量', () => nf(current().flow.in, 0), 'm³/h'],
  ['出水 COD', () => nf(current().cod.out, 1), 'mg/L'],
  ['出水氨氮', () => nf(current().nh3.out, 2), 'mg/L'],
  ['出水总磷', () => nf(current().tp.out, 2), 'mg/L'],
  ['氧化沟 DO', () => nf(current().do.out, 2), 'mg/L'],
  ['污泥浓度', () => '3,860', 'mg/L'],
];

const TWIN_BOTTOM = [
  { k: 'tp', label: 'TP' }, { k: 'tn', label: 'TN' }, { k: 'cod', label: 'COD' },
  { k: 'nh3', label: 'NH₄-N' }, { k: 'ss', label: 'SS' }, { k: 'ph', label: 'PH' },
];

function twinStatus(k) {
  const c = current()[k], s = SPEC[k];
  if (k === 'ph') return { text: '指标正常', cls: 'ok', pct: 72 };
  const pct = c.out / s.limit * 100;
  if (pct >= 100) return { text: '超出限值', cls: 'bad', pct: 100 };
  if (pct >= 85) return { text: '内控预警', cls: 'warn', pct };
  return { text: '指标正常', cls: 'ok', pct };
}

function renderTwinPanels() {
  const c = current();
  $('#twinMini').innerHTML = TWIN_MINI.map(([label, fn, unit]) => `
    <div class="twin-mini">
      <span>${label}</span>
      <b>${fn()}<small>${unit}</small></b>
    </div>`).join('');

  $('#twinStats').innerHTML = [
    ['今日处理量', nf(c.flow.out * 24 / 10000, 2) + ' 万 m³'],
    ['吨水电耗', '0.286 kWh/m³'],
    ['设备完好率', '98.6 %'],
    ['安全运行', '1,472 天'],
  ].map(([l, v]) => `<div class="twin-stat"><span>${l}</span><b>${v}</b></div>`).join('');

  $('#twinBottom').innerHTML = TWIN_BOTTOM.map(item => {
    const s = SPEC[item.k], v = c[item.k].out, st = twinStatus(item.k);
    return `<div class="twin-card ${st.cls}">
      <div class="tc-name">${item.label}</div>
      <div class="tc-val">${nf(v, s.digits)}<small>${s.unit || 'mg/L'}</small></div>
      <div class="tc-bar"><i style="width:${Math.min(st.pct, 100)}%"></i></div>
      <div class="tc-state">${st.text}</div>
    </div>`;
  }).join('');
}

/* 三维模型选中项 → 构筑物参数浮窗（PLAN 条目映射到工艺单元） */
function planItemOf(id) {
  return (typeof PLAN !== 'undefined' ? PLAN.items.find(x => x.id === id) : null);
}

function showTwinTip(id) {
  const tip = $('#twinTip');
  const it = planItemOf(id);
  const u = it && it.unit ? PLANT_UNITS.find(x => x.id === it.unit) : null;
  if (!u) { tip.classList.remove('show'); return; }
  tip.innerHTML = `
    <button class="tip-close" id="tipClose">×</button>
    <div class="tip-head">${it.label}<span class="chip ok">正常运行</span></div>
    <div class="tip-sub">${u.desc}</div>
    <div class="tip-rows">${unitParamsHTML(u)}</div>`;
  tip.classList.add('show');
  $('#tipClose').onclick = () => { tip.classList.remove('show'); Scene3D.select(null); };
}

function renderModel3D() {
  const canvas = $('#twinCanvas');
  if (window.Scene3D && !Scene3D.isReady()) {
    const ok = Scene3D.init(canvas, $('#twinLabels'), $('#twinStage'), id => {
      if (id) {
        state.twinUnit = id;
        Scene3D.select(id);
        showTwinTip(id);
      } else {
        state.twinUnit = null;
        $('#twinTip').classList.remove('show');
      }
    });
    if (ok) {
      Scene3D.select(state.twinUnit || 'ditch1');
      setTimeout(() => Scene3D.resize(), 40);
    }
  } else if (window.Scene3D) {
    Scene3D.resize();
  }
  renderTwinPanels();
  if (state.twinUnit) showTwinTip(state.twinUnit);
}

/* =================== 4. 去除效率 =================== */
function renderEfficiency() {
  const c = current();
  const keys = ['cod', 'bod5', 'nh3', 'tn', 'tp', 'ss'];
  const target = { cod: 90, bod5: 95, nh3: 90, tn: 70, tp: 85, ss: 95 };
  const rates = keys.map(k => removal(k));

  CHARTS.bar($('#effBar'), {
    categories: keys.map(k => SPEC[k].name),
    series: [
      { name: '实际去除率', color: '#0e9f6e', values: rates },
      { name: '设计目标', color: '#c8d8e6', values: keys.map(k => target[k]) },
    ],
    yMax: 100, digits: 1, width: 560, height: 268,
  });

  CHARTS.radar($('#effRadar'), {
    axes: keys.map(k => ({ label: SPEC[k].name })),
    series: [
      { name: '实际去除率', color: '#1289a7', values: rates },
      { name: '设计目标', color: '#c8d8e6', values: keys.map(k => target[k]) },
    ],
  });

  const days = Array.from({ length: 7 }, (_, i) => dateStr(addDays(new Date(), i - 6)).slice(5));
  const series = (base, amp) => days.map((_, i) => clamp(base + Math.sin(i * 1.15) * amp + (Math.random() - 0.5) * amp * 0.5, 55, 99.5));
  CHARTS.line($('#effTrend'), {
    labels: days,
    series: [
      { name: 'COD 去除率', color: '#2f7cf6', values: series(removal('cod'), 1.6) },
      { name: '氨氮去除率', color: '#0e9f6e', values: series(removal('nh3'), 2.2) },
      { name: '总磷去除率', color: '#e8940f', values: series(removal('tp'), 3.0) },
    ],
    digits: 1, height: 262,
  });

  $('#effTable').innerHTML = `<table>
    <thead><tr><th>污染物</th><th>进水浓度</th><th>出水浓度</th><th>去除量</th><th>去除率</th><th>设计目标</th><th>评价</th></tr></thead>
    <tbody>${keys.map(k => {
      const s = SPEC[k];
      const r = removal(k);
      const ok = r >= target[k];
      return `<tr>
        <td>${s.name}</td>
        <td>${nf(c[k].in, s.digits)} mg/L</td>
        <td>${nf(c[k].out, s.digits)} mg/L</td>
        <td>${nf(c[k].in - c[k].out, s.digits)} mg/L</td>
        <td><b style="color:${ok ? '#0b7a5e' : '#b06a00'}">${nf(r, 1)} %</b></td>
        <td>${target[k]} %</td>
        <td><span class="chip ${ok ? 'ok' : 'warn'}">${ok ? '优于目标' : '略低于目标'}</span></td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

/* =================== 5. AI 预测与预警 =================== */
function renderAI() {
  const c = current();
  const exceed = Object.keys(SPEC).filter(k => SPEC[k].limit != null && c[k].out > SPEC[k].limit).length;
  const risk = Math.round(clamp(16 + exceed * 26 + (c.tn.out / SPEC.tn.limit) * 22, 6, 96));
  const riskColor = risk > 60 ? '#dc4b3e' : risk > 35 ? '#e8940f' : '#0e9f6e';
  const riskText = risk > 60 ? '高风险' : risk > 35 ? '中风险' : '低风险';
  CHARTS.gauge($('#riskGauge'), { value: risk, display: risk, suffix: '', label: `综合风险指数 · ${riskText}`, color: riskColor });
  $('#riskNote').innerHTML = `当前 ${Object.keys(SPEC).length} 项指标中 <b>${exceed}</b> 项超标；
    出水总氮 ${nf(c.tn.out, 2)} mg/L，占限值 ${nf(c.tn.out / SPEC.tn.limit * 100, 0)}%；
    模型判定未来 12 小时整体风险为 <b>${riskText}</b>。`;

  // 预测：过去 6 小时（12 点）+ 未来 12 小时（24 点，30 分钟粒度）
  const history = state.data.cod.out.slice(-12);
  const last = history[history.length - 1];
  if (!state.fc) {
    const future = [];
    let v = last;
    for (let i = 0; i < 24; i++) {
      v = v + (26 - v) * 0.08 + (Math.random() - 0.5) * 1.5 + (i < 6 ? 0.55 : 0);
      future.push(v);
    }
    const nowD = new Date();
    const futureLabels = future.map((_, i) => {
      const t = new Date(nowD.getTime() + (i + 1) * 30 * 60000);
      return pad2(t.getHours()) + ':' + pad2(t.getMinutes());
    });
    state.fc = {
      future, futureLabels,
      upper: future.map((x, i) => x + 2.2 + i * 0.16),
      lower: future.map((x, i) => Math.max(0, x - 2.2 - i * 0.16)),
    };
  }
  const f = state.fc;
  const future = f.future;
  const labels = state.labels.slice(-12).concat(f.futureLabels);
  const upper = Array(12).fill(null).concat(f.upper);
  const lower = Array(12).fill(null).concat(f.lower);

  CHARTS.line($('#forecastChart'), {
    labels,
    series: [
      { name: '实测出水 COD', color: '#2f7cf6', values: history.concat(Array(24).fill(null)) },
      { name: 'AI 预测', color: '#7c5cf0', dash: true, values: Array(11).fill(null).concat([last]).concat(future) },
    ],
    bands: [{ upper, lower, color: '#7c5cf0', opacity: 0.12 }],
    limitLines: [{ value: SPEC.cod.limit, label: '排放限值 50', color: '#dc4b3e' }],
    digits: 1, width: 780, height: 300,
  });

  $('#anomalyList').innerHTML = ANOMALIES.map(a => `
    <div class="anomaly">
      <span class="lv ${a.level === '高' ? 'high' : a.level === '中' ? 'mid' : 'low'}">${a.level}</span>
      <div class="body">
        <div class="t"><span>${a.ind} · ${a.value}</span><span style="color:#8595a6;font-weight:400;font-size:11px">${a.time}</span></div>
        <div class="d">偏离历史均值 ${a.dev} · 置信度 ${a.conf}</div>
      </div>
    </div>`).join('');

  const items = [
    `进水 COD 当前 <b>${nf(c.cod.in, 0)} mg/L</b>，24 小时波动区间 ${nf(Math.min.apply(null, state.data.cod.in), 0)}–${nf(Math.max.apply(null, state.data.cod.in), 0)} mg/L，存在短时冲击负荷。`,
    `出水 COD <b>${nf(c.cod.out, 1)} mg/L</b>、氨氮 <b>${nf(c.nh3.out, 2)} mg/L</b>，均优于一级 A 标准，去除率分别为 ${nf(removal('cod'), 1)}%、${nf(removal('nh3'), 1)}%。`,
    `出水总氮 ${nf(c.tn.out, 2)} mg/L，距 15 mg/L 限值余量仅 ${nf((1 - c.tn.out / 15) * 100, 0)}%，为当前最薄弱环节。`,
    `预测未来 12 小时出水 COD 区间 ${nf(Math.min.apply(null, future), 1)}–${nf(Math.max.apply(null, future), 1)} mg/L，不会触及限值。`,
    `<b>建议：</b>适当提高深床滤池碳源投加量并保持氧化沟缺氧段低 DO，控制出水总氮；同时关注进水冲击负荷，必要时启用调节池削峰。`,
  ];
  $('#aiSummary').innerHTML = items.map((t, i) => `<div class="ai-item"><span class="idx">${i + 1}</span><div>${t}</div></div>`).join('');

  $('#ruleTable').innerHTML = `<table>
    <thead><tr><th>监测指标</th><th>预警阈值</th><th>预警等级</th><th>通知方式</th></tr></thead>
    <tbody>${RULES.map(r => `<tr>
      <td>${r[0]}</td><td>${r[1]}</td>
      <td><span class="chip ${r[2] === '严重' ? 'bad' : r[2] === '警告' ? 'warn' : 'gray'}">${r[2]}</span></td>
      <td>${r[3]}</td></tr>`).join('')}</tbody></table>`;
}

/* =================== 6. 历史数据 =================== */
function dayRow(d) {
  const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const rnd = k => {
    const x = Math.sin(key * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const codOut = 21 + rnd(3) * 17;
  const nh3Out = 1.05 + rnd(5) * 1.75;
  const tpOut = 0.2 + rnd(9) * 0.27;
  const ssOut = 4.8 + rnd(11) * 4.8;
  const flowIn = 26200 + rnd(1) * 4300;
  return {
    date: dateStr(d),
    flowIn,
    flowOut: flowIn * (0.972 + rnd(14) * 0.022),
    codIn: 348 + rnd(2) * 112, codOut,
    nh3In: 26 + rnd(4) * 13, nh3Out,
    tnIn: 36 + rnd(6) * 9.5, tnOut: 7.2 + rnd(7) * 3.9,
    tpIn: 3.9 + rnd(8) * 1.4, tpOut,
    ssIn: 152 + rnd(10) * 62, ssOut,
    phOut: 7.04 + rnd(12) * 0.46,
    ok: codOut <= 50 && nh3Out <= 5 && tpOut <= 0.5 && ssOut <= 10,
  };
}

function buildHistory(startS, endS, gran) {
  const s = new Date(startS + 'T00:00:00'), e = new Date(endS + 'T00:00:00');
  const rows = [];
  let cur = new Date(s), guard = 0;
  while (cur <= e && guard < 800) { rows.push(dayRow(cur)); cur = addDays(cur, 1); guard++; }
  if (gran === 'day') return rows.map(r => Object.assign({}, r, { label: r.date.slice(5) }));

  const buckets = [];
  if (gran === 'week') {
    for (let i = 0; i < rows.length; i += 7) {
      const chunk = rows.slice(i, i + 7);
      buckets.push({ label: chunk[0].date.slice(5) + ' ~ ' + chunk[chunk.length - 1].date.slice(5), rows: chunk });
    }
  } else {
    const map = new Map();
    rows.forEach(r => {
      const k = r.date.slice(0, 7);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    map.forEach((chunk, k) => buckets.push({ label: k, rows: chunk }));
  }
  return buckets.map(b => {
    const n = b.rows.length;
    const avg = f => b.rows.reduce((sum, r) => sum + r[f], 0) / n;
    return {
      label: b.label, date: b.label,
      flowIn: avg('flowIn'), flowOut: avg('flowOut'),
      codIn: avg('codIn'), codOut: avg('codOut'),
      nh3In: avg('nh3In'), nh3Out: avg('nh3Out'),
      tnIn: avg('tnIn'), tnOut: avg('tnOut'),
      tpIn: avg('tpIn'), tpOut: avg('tpOut'),
      ssIn: avg('ssIn'), ssOut: avg('ssOut'),
      phOut: avg('phOut'), ok: b.rows.every(r => r.ok),
    };
  });
}

function renderHistory() {
  const startS = $('#hStart').value, endS = $('#hEnd').value;
  let s = startS, e = endS;
  if (!s || !e) return;
  if (s > e) { const t = s; s = e; e = t; $('#hStart').value = s; $('#hEnd').value = e; }
  const gran = $('#hGran').value, indKey = $('#hInd').value;
  const rows = buildHistory(s, e, gran);
  state.hist = { start: s, end: e, gran, ind: indKey, rows };

  const ind = HISTORY_IND[indKey];
  const outs = rows.map(r => r[ind.outKey]);
  const ins = rows.map(r => r[ind.inKey]);
  const avg = arr => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const okRate = rows.length ? rows.filter(r => r.ok).length / rows.length * 100 : 0;
  const totalVol = rows.reduce((a, r) => a + r.flowIn, 0) / 10000;

  $('#hStats').innerHTML = [
    { l: '统计时段', v: s.slice(5) + ' ~ ' + e.slice(5), s: '' },
    { l: `平均进出水 ${ind.name}`, v: nf(avg(ins), ind.digits), s: '/ ' + nf(avg(outs), ind.digits) + ' ' + ind.unit },
    { l: `出水${ind.name}最高`, v: nf(Math.max.apply(null, outs), ind.digits), s: ind.unit },
    { l: '出水达标率', v: nf(okRate, 1), s: '%' },
    { l: '累计处理水量', v: nf(totalVol, 1), s: '万 m³' },
  ].map(x => `<div class="stat-box"><span>${x.l}</span><b>${x.v}<small>${x.s}</small></b></div>`).join('');

  $('#hChartSub').textContent = `${ind.name} · 进水 / 出水 · 单位 ${ind.unit}`;
  const limits = ind.limit != null ? [{ value: ind.limit, label: '排放限值 ' + ind.limit, color: '#dc4b3e' }] : [];
  CHARTS.line($('#hChart'), {
    labels: rows.map(r => r.label),
    series: [
      { name: '进水', color: '#2f7cf6', values: ins, area: true },
      { name: '出水', color: '#0e9f6e', values: outs },
    ],
    limitLines: limits, digits: ind.digits, height: 292,
  });

  const shown = rows.slice(-60);
  $('#hTableSub').textContent = `共 ${rows.length} 条记录${rows.length > 60 ? '，显示最近 60 条' : ''} · 粒度：${{ day: '按日', week: '按周', month: '按月' }[gran]}`;
  $('#hTable').innerHTML = `<table>
    <thead><tr><th>时间</th><th>进水量 m³/d</th><th>进 COD</th><th>出 COD</th><th>出氨氮</th><th>出总氮</th><th>出总磷</th><th>出 SS</th><th>达标</th></tr></thead>
    <tbody>${shown.map(r => `<tr>
      <td>${r.date}</td>
      <td>${nf(r.flowIn, 0)}</td>
      <td>${nf(r.codIn, 0)}</td>
      <td>${nf(r.codOut, 1)}</td>
      <td>${nf(r.nh3Out, 2)}</td>
      <td>${nf(r.tnOut, 2)}</td>
      <td>${nf(r.tpOut, 2)}</td>
      <td>${nf(r.ssOut, 1)}</td>
      <td><span class="chip ${r.ok ? 'ok' : 'bad'}">${r.ok ? '达标' : '超标'}</span></td>
    </tr>`).join('')}</tbody></table>`;
}

function exportCSV() {
  const rows = state.hist.rows;
  if (!rows.length) return;
  const head = ['时间', '进水量(m³/d)', '出水量(m³/d)', '进水COD', '出水COD', '进水氨氮', '出水氨氮', '进水总氮', '出水总氮', '进水总磷', '出水总磷', '进水SS', '出水SS', '出水pH', '是否达标'];
  const body = rows.map(r => [
    r.date, r.flowIn.toFixed(0), r.flowOut.toFixed(0),
    r.codIn.toFixed(1), r.codOut.toFixed(1), r.nh3In.toFixed(2), r.nh3Out.toFixed(2),
    r.tnIn.toFixed(2), r.tnOut.toFixed(2), r.tpIn.toFixed(2), r.tpOut.toFixed(2),
    r.ssIn.toFixed(1), r.ssOut.toFixed(1), r.phOut.toFixed(2), r.ok ? '达标' : '超标',
  ].join(','));
  const csv = '\ufeff' + head.join(',') + '\n' + body.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `污水厂监测数据_${state.hist.start}_${state.hist.end}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function genReport() {
  const { rows, start, end } = state.hist;
  if (!rows.length) return;
  const ind = HISTORY_IND[state.hist.ind];
  const outs = rows.map(r => r[ind.outKey]);
  const avgOut = outs.reduce((a, b) => a + b, 0) / outs.length;
  const okRate = rows.filter(r => r.ok).length / rows.length * 100;
  const totalVol = rows.reduce((a, r) => a + r.flowIn, 0) / 10000;
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>运行报告</title>
  <style>body{font-family:"Microsoft YaHei",sans-serif;color:#17232f;padding:38px;line-height:1.8;font-size:13px}
  h1{font-size:20px;margin-bottom:4px}h2{font-size:15px;margin:22px 0 8px;border-left:4px solid #0d6e8c;padding-left:9px}
  .sub{color:#7b8b9c;font-size:12px;margin-bottom:18px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
  th,td{border:1px solid #dde5ee;padding:6px 8px;text-align:left}
  th{background:#f4f8fb} .k{color:#0b7a5e;font-weight:600} .warn{color:#b06a00}</style></head><body>
  <h1>城东污水处理厂 · 运行监测报告</h1>
  <div class="sub">统计时段：${start} 至 ${end} · 生成时间：${new Date().toLocaleString('zh-CN')}</div>
  <h2>一、总体情况</h2>
  <p>统计期内共记录 <b>${rows.length}</b> 个数据点，累计处理水量 <b>${totalVol.toFixed(2)} 万 m³</b>，
  出水达标率 <b class="k">${okRate.toFixed(1)}%</b>。出水 ${ind.name} 平均 ${avgOut.toFixed(ind.digits)} ${ind.unit}，
  最高 ${Math.max.apply(null, outs).toFixed(ind.digits)} ${ind.unit}。</p>
  <h2>二、主要污染物去除情况</h2>
  <table><tr><th>污染物</th><th>平均进水</th><th>平均出水</th><th>去除率</th></tr>
  ${['cod', 'nh3', 'tn', 'tp', 'ss'].map(k => {
    const cfg = HISTORY_IND[k];
    const ai = rows.reduce((a, r) => a + r[cfg.inKey], 0) / rows.length;
    const ao = rows.reduce((a, r) => a + r[cfg.outKey], 0) / rows.length;
    return `<tr><td>${cfg.name}</td><td>${ai.toFixed(cfg.digits)} mg/L</td><td>${ao.toFixed(cfg.digits)} mg/L</td><td>${((ai - ao) / ai * 100).toFixed(1)}%</td></tr>`;
  }).join('')}</table>
  <h2>三、结论与建议</h2>
  <p>1. 统计期内出水各项指标总体稳定，${okRate >= 98 ? '运行控制良好' : '存在少量波动，建议加强巡检'}。<br>
  2. 建议持续关注进水冲击负荷，保持深床滤池碳源投加与氧化沟溶解氧在合理区间。<br>
  3. 建议对氧化沟转刷与曝气系统进行周期性检查，避免溶解氧分布不均影响去除效率。</p>
  <h2>四、数据明细（前 30 条）</h2>
  <table><tr><th>时间</th><th>进水量</th><th>出 COD</th><th>出氨氮</th><th>出总氮</th><th>出总磷</th><th>达标</th></tr>
  ${rows.slice(0, 30).map(r => `<tr><td>${r.date}</td><td>${r.flowIn.toFixed(0)}</td><td>${r.codOut.toFixed(1)}</td><td>${r.nh3Out.toFixed(2)}</td><td>${r.tnOut.toFixed(2)}</td><td>${r.tpOut.toFixed(2)}</td><td>${r.ok ? '达标' : '超标'}</td></tr>`).join('')}
  </table></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { alert('浏览器拦截了新窗口，请允许弹出窗口后重试'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

/* =================== 7. AI 问答 =================== */
function aiAnswer(q) {
  const t = q.toLowerCase();
  const c = current();
  const r = k => nf(removal(k), 1);
  const has = (...ws) => ws.some(w => t.includes(w));

  if (has('cod', '化学需氧')) {
    return `<p>当前出水 COD <b>${nf(c.cod.out, 1)} mg/L</b>，进水 ${nf(c.cod.in, 0)} mg/L，去除率 <b>${r('cod')}%</b>，
      ${c.cod.out <= SPEC.cod.limit ? '稳定优于' : '已超出'}一级 A 标准限值（${SPEC.cod.limit} mg/L）。</p>
      <p class="ai-h">可能原因</p><ul>
      <li>进水负荷突增：工业企业排水或初期雨水冲刷，进水 COD 24 小时波动 ${nf(Math.max.apply(null, state.data.cod.in) - Math.min.apply(null, state.data.cod.in), 0)} mg/L</li>
      <li>氧化沟好氧区溶解氧不足（当前 DO ${nf(c.do.out, 2)} mg/L），有机物降解速率下降</li>
      <li>污泥流失或 MLSS 下降，微生物量不足</li>
      <li>二沉池跑泥，悬浮物携带有机物进入出水</li></ul>
      <p class="ai-h">建议措施</p><ul>
      <li>核对进水 COD 与流量曲线是否同步抬升，排查上游异常排放</li>
      <li>将氧化沟内沟 DO 控制在 2.0–3.0 mg/L，必要时增加转刷开启台数</li>
      <li>检测 MLSS、SV30，若 MLSS &lt; 3000 mg/L 应减少排泥并提高污泥回流比</li></ul>`;
  }
  if (has('总氮', 'tn', '脱氮')) {
    return `<p>当前出水总氮 <b>${nf(c.tn.out, 2)} mg/L</b>（限值 15 mg/L），去除率 <b>${r('tn')}%</b>，
      距限值余量约 ${nf((1 - c.tn.out / 15) * 100, 0)}%，是当前最需要关注的指标。</p>
      <p class="ai-h">去除率偏低的主要原因</p><ul>
      <li>碳源不足：进水 C/N 比偏低，反硝化菌缺乏电子供体</li>
      <li>缺氧区溶解氧偏高，破坏缺氧环境，反硝化受抑制</li>
      <li>混合液内回流比不足（当前 200%），硝酸盐回流至缺氧区不充分</li>
      <li>水温偏低或污泥龄过长，影响反硝化速率</li></ul>
      <p class="ai-h">建议措施</p><ul>
      <li>将内回流比提高至 250%–300%，并监测缺氧区 DO 控制在 0.5 mg/L 以下</li>
      <li>必要时投加乙酸钠等外加碳源，按去除 1 mg 硝态氮约需 4–5 mg COD 估算</li>
      <li>适当缩短污泥龄至 15–18 天，减少内源呼吸带来的氮释放</li></ul>`;
  }
  if (has('氨氮', 'nh3', '硝化')) {
    return `<p>当前出水氨氮 <b>${nf(c.nh3.out, 2)} mg/L</b>，进水 ${nf(c.nh3.in, 2)} mg/L，去除率 <b>${r('nh3')}%</b>，
      优于一级 A 标准（5 mg/L），硝化系统运行正常。</p>
      <p class="ai-h">影响氨氮去除的关键因素</p><ul>
      <li>好氧区 DO：硝化菌需 DO &gt; 2 mg/L，当前 ${nf(c.do.out, 2)} mg/L</li>
      <li>水温：低于 15℃ 时硝化速率明显下降，当前池内水温约 20℃</li>
      <li>污泥龄：硝化菌世代周期长，SRT 建议不低于 12 天</li>
      <li>进水氨氮冲击负荷或 pH 波动</li></ul>
      <p class="ai-h">建议</p><ul>
      <li>保持好氧区末端 DO 在 2.0–2.5 mg/L，避免过度曝气增加能耗</li>
      <li>冬季提前提高污泥龄至 20 天以上，保障硝化菌数量</li></ul>`;
  }
  if (has('总磷', 'tp', '除磷', '磷')) {
    return `<p>当前出水总磷 <b>${nf(c.tp.out, 2)} mg/L</b>（限值 0.5 mg/L），去除率 <b>${r('tp')}%</b>，
      ${c.tp.out <= 0.5 ? '达标排放' : '已接近或超过限值'}。</p>
      <p class="ai-h">除磷效果的影响因素</p><ul>
      <li>厌氧区释磷不充分：VFA 含量不足、硝酸盐进入厌氧区</li>
      <li>污泥龄过长导致排泥量不足，磷随污泥排出减少</li>
      <li>化学除磷药剂（PAC/硫酸亚铁）投加量偏低</li></ul>
      <p class="ai-h">建议</p><ul>
      <li>控制厌氧区 DO &lt; 0.2 mg/L，避免硝酸盐回流至厌氧段</li>
      <li>适当增加排泥量，将 SRT 控制在 15 天左右</li>
      <li>出水总磷超过 0.4 mg/L 时，及时增加化学除磷药剂投加</li></ul>`;
  }
  if (has('溶解氧', 'do', '曝气', '风机')) {
    return `<p>当前好氧区溶解氧 <b>${nf(c.do.out, 2)} mg/L</b>，处于 2.0–3.0 mg/L 的合理控制区间内。
      近 6 小时波动 ${nf(Math.min.apply(null, state.data.do.out.slice(-12)), 2)}–${nf(Math.max.apply(null, state.data.do.out.slice(-12)), 2)} mg/L。</p>
      <p class="ai-h">异常时的常见处置</p><ul>
      <li>DO 持续偏低（&lt; 1.5 mg/L）：检查鼓风机出口压力、曝气头堵塞与管路泄漏，适当提高风量</li>
      <li>DO 持续偏高（&gt; 4 mg/L）：降低风量，防止污泥解体与能耗浪费</li>
      <li>DO 剧烈波动：多为进水负荷或回流比变化引起，需联动调整</li></ul>
      <p class="ai-h">提示</p><p>氧化沟 3# 转刷电流 42.5 A，较 3 日均值高约 9%，建议安排转刷轴承与曝气效果检查。</p>`;
  }
  if (has('预警', '报警', '异常', '告警')) {
    return `<p>当前共有 <b>${ALERTS.length}</b> 条预警信息，其中严重 1 条、警告 1 条、提示 2 条：</p>
      <ul>${ALERTS.map(a => `<li><b>${a.time} ${a.title}</b>（${a.level}）—— ${a.desc}</li>`).join('')}</ul>
      <p class="ai-h">建议处置顺序</p><ul>
      <li>优先处理进水 COD 冲击，确认调节池余量并稳定进水负荷</li>
      <li>同步关注出水总氮，必要时增加碳源投加</li>
      <li>安排对氧化沟 3# 转刷的现场检查</li></ul>`;
  }
  if (has('去除率', '效率', '效果')) {
    return `<p>当前各污染物去除率如下（括号内为设计目标）：</p>
      <ul>
      <li>COD：<b>${r('cod')}%</b>（90%）</li>
      <li>BOD₅：<b>${r('bod5')}%</b>（95%）</li>
      <li>氨氮：<b>${r('nh3')}%</b>（90%）</li>
      <li>总氮：<b>${r('tn')}%</b>（70%）</li>
      <li>总磷：<b>${r('tp')}%</b>（85%）</li>
      <li>悬浮物：<b>${r('ss')}%</b>（95%）</li></ul>
      <p>整体去除效果良好，其中总氮去除率相对最弱，是提标改造的重点方向。</p>`;
  }
  if (has('工艺', '流程', '环节', '生化', '二沉')) {
    return `<p>本站采用 <b>厌氧池 + 奥贝尔氧化沟 + 深度处理</b> 工艺，设计流程为：粗格栅及提升泵房 → 细格栅 → 旋流沉砂池 → 配水井 → 厌氧池 → 奥贝尔氧化沟 → 配水井 → 二沉池 → 二次提升泵房 → 网格絮凝池（投加 PAC）→ 平流沉淀池 → 反硝化深床滤池 → 接触消毒池 → 巴氏计量槽 → 出水。污泥线为：污泥泵房 → 污泥浓缩池 → 贮泥池 → 脱水（投加 PAM）→ 外运。</p>
      <p class="ai-h">各环节核心控制参数</p><ul>
      <li>奥贝尔氧化沟：MLSS 3,860 mg/L、SRT 18.4 d、内沟 DO ${nf(c.do.out, 2)} mg/L</li>
      <li>二沉池：污泥界面 1.92 m、出水 SS ${nf(c.ss.out, 1)} mg/L、回流比 75%</li>
      <li>深度处理：PAC 投加 28 mg/L、深床滤池滤速 6.2 m/h</li>
      <li>消毒：余氯 0.36 mg/L、接触时间 32 min</li></ul>
      <p>当前工艺流程运行稳定，无设备故障导致的非计划停运。</p>`;
  }
  if (has('达标', '水质', '数据', '指标')) {
    return `<p>当前出水各指标状态：COD <b>${nf(c.cod.out, 1)}</b>、氨氮 <b>${nf(c.nh3.out, 2)}</b>、
      总氮 <b>${nf(c.tn.out, 2)}</b>、总磷 <b>${nf(c.tp.out, 2)}</b>、SS <b>${nf(c.ss.out, 1)}</b> mg/L，
      pH <b>${nf(c.ph.out, 2)}</b>，全部满足《城镇污水处理厂污染物排放标准》一级 A 要求。</p>
      <p>出水总氮余量最小（约 ${nf((1 - c.tn.out / 15) * 100, 0)}%），建议作为下一阶段的重点控制指标。</p>`;
  }
  return `<p>我可以结合实时监测数据帮你分析。你可以这样问我：</p>
    <ul>
    <li>「今天出水 COD 为什么升高？」</li>
    <li>「总氮去除率偏低有哪些原因？」</li>
    <li>「氧化沟溶解氧异常怎么处理？」</li>
    <li>「最近的预警有哪些？」</li>
    <li>「当前各指标达标情况如何？」</li>
    </ul>
    <p>也可以直接告诉我具体指标名称（如 COD、氨氮、总磷）或处理环节（生化池、二沉池）。</p>`;
}

function renderChat() {
  if (!state.chat.length) {
    state.chat.push({
      role: 'ai',
      html: `<p>你好，我是污水厂智能助手 👋 已接入本站实时监测数据、工艺参数和历史记录。</p>
        <p>可以问我污染物浓度变化原因、工艺运行问题或异常处置建议，我会结合当前数据给出分析。</p>`,
    });
  }
  $('#chatMsgs').innerHTML = state.chat.map(m => `
    <div class="msg ${m.role}">
      <div class="bubble">${m.role === 'ai' ? '<div class="who">智能助手</div>' : ''}${m.html}</div>
    </div>`).join('');
  $('#chatMsgs').scrollTop = $('#chatMsgs').scrollHeight;

  $('#chatQuick').innerHTML = CHAT_QUICK.map(q => `<button data-q="${esc(q)}">${esc(q)}</button>`).join('');
  $$('#chatQuick button').forEach(b => { b.onclick = () => ask(b.dataset.q); });
}

let asking = false;
function ask(text) {
  if (asking || !text.trim()) return;
  asking = true;
  state.chat.push({ role: 'me', html: `<p>${esc(text)}</p>` });
  renderChat();
  const msgs = $('#chatMsgs');
  const tip = document.createElement('div');
  tip.className = 'msg ai';
  tip.innerHTML = '<div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div>';
  msgs.appendChild(tip);
  msgs.scrollTop = msgs.scrollHeight;
  setTimeout(() => {
    tip.remove();
    state.chat.push({ role: 'ai', html: aiAnswer(text) });
    asking = false;
    renderChat();
    $('#chatMsgs').scrollTop = $('#chatMsgs').scrollHeight;
  }, 700);
}

/* =================== 启动 =================== */
function boot() {
  initData();

  $$('.nav-item').forEach(b => b.addEventListener('click', () => goto(b.dataset.page)));

  // 历史查询默认值
  const today = new Date();
  $('#hStart').value = dateStr(addDays(today, -29));
  $('#hEnd').value = dateStr(today);
  $('#hInd').innerHTML = Object.keys(HISTORY_IND).map(k => `<option value="${k}">${HISTORY_IND[k].name}</option>`).join('');
  $('#hQuery').onclick = renderHistory;
  $('#hExport').onclick = exportCSV;
  $('#hReport').onclick = genReport;
  ['hStart', 'hEnd', 'hGran', 'hInd'].forEach(id => $('#' + id).addEventListener('change', renderHistory));

  // 三维模型工具栏
  const btnRotate = $('#twinRotate');
  btnRotate.onclick = () => {
    const on = !btnRotate.classList.contains('on');
    btnRotate.classList.toggle('on', on);
    if (window.Scene3D) Scene3D.setAutoRotate(on);
  };
  $('#twinReset').onclick = () => { if (window.Scene3D) Scene3D.resetView(); };

  // 问答
  $('#chatSend').onclick = () => {
    const v = $('#chatInput').value;
    $('#chatInput').value = '';
    ask(v);
  };
  $('#chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { const v = e.target.value; e.target.value = ''; ask(v); }
  });

  updateClock();
  const initial = (location.hash || '').replace('#', '');
  if (initial && PAGE_META[initial]) {
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === initial));
    state.page = initial;
    renderPage(initial);
  } else {
    renderPage('home');
  }
  setInterval(tick, 3000);
  setInterval(updateClock, 1000);
}

document.addEventListener('DOMContentLoaded', boot);
