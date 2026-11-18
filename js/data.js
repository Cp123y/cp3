/* ================= 监测指标定义 ================= */
const SPEC = {
  cod:  { name: 'COD',   full: '化学需氧量',      unit: 'mg/L', inBase: 382,  outBase: 26.2,  inAmp: 46,  outAmp: 3.4,  limit: 50,   digits: 0, group: '有机污染' },
  bod5: { name: 'BOD₅',  full: '五日生化需氧量',  unit: 'mg/L', inBase: 168,  outBase: 5.6,   inAmp: 22,  outAmp: 1.0,  limit: 10,   digits: 1, group: '有机污染' },
  nh3:  { name: '氨氮',  full: '氨氮 (NH₄-N)',    unit: 'mg/L', inBase: 31.2, outBase: 1.68,  inAmp: 4.8, outAmp: 0.42, limit: 5,    digits: 2, group: '氨磷污染' },
  tn:   { name: '总氮',  full: '总氮 (TN)',       unit: 'mg/L', inBase: 41.5, outBase: 8.9,   inAmp: 5.2, outAmp: 0.9,  limit: 15,   digits: 2, group: '氨磷污染' },
  tp:   { name: '总磷',  full: '总磷 (TP)',       unit: 'mg/L', inBase: 4.55, outBase: 0.34,  inAmp: 0.7, outAmp: 0.07, limit: 0.5,  digits: 2, group: '氨磷污染' },
  ss:   { name: '悬浮物', full: '悬浮物 (SS)',    unit: 'mg/L', inBase: 176,  outBase: 7.3,   inAmp: 26,  outAmp: 1.6,  limit: 10,   digits: 1, group: '物理指标' },
  ph:   { name: 'pH',    full: 'pH 值',           unit: '',     inBase: 7.18, outBase: 7.26,  inAmp: 0.18, outAmp: 0.12, limit: null, range: [6, 9], digits: 2, group: '物理指标' },
  do:   { name: '溶解氧', full: '溶解氧 (DO)',    unit: 'mg/L', inBase: 0.65, outBase: 5.35,  inAmp: 0.28, outAmp: 0.5,  limit: null, refMin: 2, digits: 2, group: '水质及运行参数' },
  temp: { name: '水温',  full: '水温',            unit: '℃',   inBase: 19.4, outBase: 20.3,  inAmp: 0.9, outAmp: 0.7,  limit: null, digits: 1, group: '物理指标' },
  orp:  { name: 'ORP',   full: '氧化还原电位',    unit: 'mV',   inBase: -118, outBase: 176,   inAmp: 20,  outAmp: 16,   limit: null, digits: 0, group: '水质及运行参数' },
};

const FLOW = { inBase: 1245, outBase: 1232, inAmp: 52, outAmp: 45 };

/* ============================================================
   全厂处理单元 —— 对应图 2.1 设计工艺流程
   flow: 二维流程图画布坐标 (viewBox 0 0 1100 690)
   model: 三维厂区模型参数
   ============================================================ */
const PLANT_UNITS = [
  {
    id: 'inlet', name: '污水', short: '进水', group: 'water',
    desc: '厂外管网来水，经进水渠道进入预处理系统',
    flow: { x: 20, y: 54, w: 66, h: 46 },
    model: { type: 'pit', x: 3.5, z: -13, r: 1.1, h: 2.4 },
    params: [
      ['进水流量', '1,245', 'm³/h'], ['进水 COD', '382', 'mg/L'], ['进水氨氮', '31.2', 'mg/L'],
      ['进水总磷', '4.55', 'mg/L'], ['进水 pH', '7.18', ''], ['进水水温', '19.4', '℃'],
    ],
  },
  {
    id: 'coarse', name: '粗格栅及提升泵房', short: '粗格栅', group: 'water',
    desc: '拦截大块漂浮物与杂物，提升水位至后续构筑物',
    flow: { x: 120, y: 54, w: 140, h: 46 },
    model: { type: 'building', x: 9, z: -13, w: 6, d: 4.6, h: 3.6 },
    params: [
      ['栅前液位', '1.84', 'm'], ['栅后液位', '1.71', 'm'], ['栅隙压差', '0.13', 'm'],
      ['栅隙', '20', 'mm'], ['提升泵运行', '2 用 1 备', '台'], ['泵组频率', '42.5', 'Hz'],
    ],
  },
  {
    id: 'fine', name: '细格栅', short: '细格栅', group: 'water',
    desc: '进一步去除细小悬浮物，保护后续生物处理系统',
    flow: { x: 294, y: 54, w: 86, h: 46 },
    model: { type: 'building', x: 15.2, z: -13, w: 4.4, d: 4, h: 2.9 },
    params: [
      ['栅隙', '6', 'mm'], ['过栅流速', '0.72', 'm/s'], ['栅渣量', '1.2', 't/d'],
      ['压差', '0.18', 'm'], ['除污机', '运行中', ''],
    ],
  },
  {
    id: 'grit', name: '旋流沉砂池', short: '沉砂池', group: 'water',
    desc: '利用旋流离心作用去除无机砂粒，避免管道与设备磨损',
    flow: { x: 414, y: 54, w: 104, h: 46 },
    model: { type: 'round', x: 21.5, z: -13, r: 1.5, h: 2.4, count: 2, gap: 3.6 },
    params: [
      ['水力停留时间', '42', 's'], ['曝气量', '60', 'm³/h'], ['除砂效率', '86', '%'],
      ['排砂周期', '4', 'h'], ['砂水分离器', '运行中', ''],
    ],
  },
  {
    id: 'dist1', name: '配水井', short: '配水井', group: 'water',
    desc: '均匀分配水量至厌氧池，保证各系列负荷均衡',
    flow: { x: 552, y: 54, w: 76, h: 46 },
    model: { type: 'round', x: 27.5, z: -13, r: 1.3, h: 2.8 },
    params: [
      ['井内液位', '2.35', 'm'], ['出水堰负荷', '6.8', 'L/(s·m)'], ['配水均匀度', '96', '%'],
      ['分配系列', '2', '组'],
    ],
  },
  {
    id: 'anaer', name: '厌氧池', short: '厌氧池', group: 'water',
    desc: '聚磷菌释磷并吸收挥发性脂肪酸，为后续好氧吸磷创造条件',
    flow: { x: 662, y: 54, w: 80, h: 46 },
    model: { type: 'tank', x: 8.5, z: -5.5, w: 7.5, d: 6, h: 2.8 },
    params: [
      ['溶解氧 DO', '0.15', 'mg/L'], ['ORP', '-118', 'mV'], ['水力停留时间', '1.8', 'h'],
      ['MLSS', '3,860', 'mg/L'], ['搅拌器', '2 台运行', ''],
    ],
  },
  {
    id: 'orbal', name: '奥贝尔氧化沟', short: '氧化沟', group: 'water',
    desc: '三环沟交替缺氧—好氧运行，同步脱氮除磷，抗冲击负荷能力强',
    flow: { x: 776, y: 54, w: 126, h: 46 },
    model: { type: 'ditch', x: 21, z: -5.5, w: 17, d: 9, h: 1.7 },
    params: [
      ['外沟 DO', '0.35', 'mg/L'], ['中沟 DO', '1.20', 'mg/L'], ['内沟 DO', '2.40', 'mg/L'],
      ['污泥龄 SRT', '18.4', 'd'], ['混合液浓度 MLSS', '3,860', 'mg/L'], ['水力停留时间', '12.5', 'h'],
      ['转刷运行', '6 / 8', '台'],
    ],
  },
  {
    id: 'dist2', name: '配水井', short: '配水井', group: 'water',
    desc: '氧化沟出水的二次分配井，均衡进入二沉池',
    flow: { x: 1014, y: 176, w: 76, h: 46 },
    model: { type: 'round', x: 33, z: -5.5, r: 1.3, h: 2.8 },
    params: [
      ['井内液位', '2.10', 'm'], ['出水堰负荷', '6.2', 'L/(s·m)'], ['配水均匀度', '95', '%'],
    ],
  },
  {
    id: 'secondary', name: '二沉池', short: '二沉池', group: 'water',
    desc: '泥水分离，上清液进入深度处理，污泥部分回流至厌氧池',
    flow: { x: 884, y: 176, w: 90, h: 46 },
    model: { type: 'round', x: 18.5, z: 3.5, r: 3.2, h: 3.2, count: 2, gap: 7.8 },
    params: [
      ['表面负荷', '0.86', 'm³/(m²·h)'], ['污泥界面', '1.92', 'm'], ['出水 SS', '7.3', 'mg/L'],
      ['回流污泥浓度', '8,240', 'mg/L'], ['污泥回流比', '75', '%'], ['刮吸泥机', '运行中', ''],
    ],
  },
  {
    id: 'lift2', name: '二次提升泵房', short: '二次提升', group: 'water',
    desc: '提升二沉池出水水头，满足深度处理构筑物水力高程要求',
    flow: { x: 734, y: 176, w: 120, h: 46 },
    model: { type: 'building', x: 7, z: 3.5, w: 5, d: 4.4, h: 3.4 },
    params: [
      ['运行泵组', '2 用 1 备', '台'], ['泵组频率', '45', 'Hz'], ['提升扬程', '6.5', 'm'],
      ['出水流量', '1,238', 'm³/h'],
    ],
  },
  {
    id: 'floc', name: '网格絮凝池', short: '絮凝池', group: 'water',
    desc: '投加 PAC 后经网格多级絮凝，形成可沉降较大的矾花',
    flow: { x: 572, y: 176, w: 108, h: 46 },
    model: { type: 'tank', x: 7, z: 12.5, w: 6.5, d: 5, h: 2.6 },
    params: [
      ['PAC 投加量', '28', 'mg/L'], ['混合时间', '2.0', 'min'], ['絮凝时间', '12.5', 'min'],
      ['絮凝池 G 值', '45', 's⁻¹'], ['进水流量', '1,238', 'm³/h'],
    ],
  },
  {
    id: 'primary', name: '平流沉淀池', short: '平流池', group: 'water',
    desc: '重力沉降去除絮体，降低后续滤池负荷，产生化学污泥',
    flow: { x: 446, y: 176, w: 108, h: 46 },
    model: { type: 'tank', x: 16.5, z: 12.5, w: 10, d: 5, h: 2.8 },
    params: [
      ['表面负荷', '1.12', 'm³/(m²·h)'], ['出水 SS', '42', 'mg/L'], ['停留时间', '2.1', 'h'],
      ['排泥量', '180', 'm³/d'], ['刮泥机', '运行中', ''],
    ],
  },
  {
    id: 'dnf', name: '反硝化深床滤池', short: '深床滤池', group: 'water',
    desc: '滤料层截留悬浮物并投加碳源进行反硝化，保障出水总氮',
    flow: { x: 282, y: 176, w: 132, h: 46 },
    model: { type: 'filter', x: 26.5, z: 12.5, w: 8, d: 5.5, h: 3.2 },
    params: [
      ['滤速', '6.2', 'm/h'], ['水头损失', '0.92', 'm'], ['反冲洗周期', '36', 'h'],
      ['碳源投加', '18', 'mg/L'], ['出水 TN', '8.9', 'mg/L'], ['滤池组数', '4', '格'],
    ],
  },
  {
    id: 'contact', name: '接触消毒池', short: '消毒池', group: 'water',
    desc: '次氯酸钠接触消毒，灭活病原微生物，保障卫生学指标',
    flow: { x: 180, y: 300, w: 106, h: 46 },
    model: { type: 'tank', x: 6.5, z: 20.5, w: 6, d: 4.6, h: 2.4 },
    params: [
      ['接触时间', '32', 'min'], ['余氯', '0.36', 'mg/L'], ['投加量', '3.2', 'mg/L'],
      ['粪大肠菌群', '<1000', '个/L'],
    ],
  },
  {
    id: 'measure', name: '巴氏计量槽', short: '计量槽', group: 'water',
    desc: '明渠流量计量，作为排放总量统计与环保上报依据',
    flow: { x: 320, y: 300, w: 100, h: 46 },
    model: { type: 'channel', x: 13.5, z: 20.5, w: 3.2, d: 2.4, h: 1.6 },
    params: [
      ['槽宽', '0.60', 'm'], ['槽内水位', '0.42', 'm'], ['瞬时流量', '1,232', 'm³/h'],
      ['累计流量', '1,286.4', '万 m³'],
    ],
  },
  {
    id: 'outlet', name: '出水', short: '出水', group: 'water',
    desc: '达标排放至受纳水体，在线监测数据实时上传环保平台',
    flow: { x: 456, y: 300, w: 70, h: 46 },
    model: { type: 'platform', x: 18.5, z: 20.5, w: 2.6, d: 2.6, h: 1.2 },
    params: [
      ['执行标准', '一级 A', ''], ['出水 COD', '26.2', 'mg/L'], ['出水氨氮', '1.68', 'mg/L'],
      ['出水总磷', '0.34', 'mg/L'], ['达标情况', '达标', ''],
    ],
  },
  /* ---------- 污泥处理线 ---------- */
  {
    id: 'sludgePump', name: '污泥泵房', short: '污泥泵房', group: 'sludge',
    desc: '收集二沉池生物污泥与平流沉淀池化学污泥，提升至浓缩池',
    flow: { x: 940, y: 470, w: 100, h: 46 },
    model: { type: 'building', x: 36.5, z: 12.5, w: 4.5, d: 4, h: 3 },
    params: [
      ['污泥量', '1,850', 'm³/d'], ['含固率', '0.8', '%'], ['运行泵组', '2 用 1 备', '台'],
      ['泵送压力', '0.32', 'MPa'],
    ],
  },
  {
    id: 'thickener', name: '污泥浓缩池', short: '浓缩池', group: 'sludge',
    desc: '重力浓缩降低污泥体积，上清液回流至进水端',
    flow: { x: 796, y: 470, w: 104, h: 46 },
    model: { type: 'round', x: 36, z: 20, r: 2.8, h: 3.4 },
    params: [
      ['进泥浓度', '0.8', '%'], ['出泥浓度', '2.6', '%'], ['上清液 SS', '180', 'mg/L'],
      ['停留时间', '14', 'h'], ['浓缩机', '运行中', ''],
    ],
  },
  {
    id: 'storage', name: '贮泥池', short: '贮泥池', group: 'sludge',
    desc: '调节污泥量，保证脱水系统连续稳定运行',
    flow: { x: 642, y: 470, w: 84, h: 46 },
    model: { type: 'round', x: 41, z: 26, r: 2.2, h: 3 },
    params: [
      ['池内液位', '2.60', 'm'], ['停留时间', '8', 'h'], ['搅拌器', '运行中', ''],
      ['污泥浓度', '2.6', '%'],
    ],
  },
  {
    id: 'dewater', name: '脱水机房', short: '脱水机房', group: 'sludge',
    desc: '投加 PAM 后机械脱水，泥饼外运处置，滤液回流至进水端',
    flow: { x: 506, y: 470, w: 86, h: 46 },
    model: { type: 'building', x: 32, z: 27, w: 6, d: 5, h: 4.2 },
    params: [
      ['脱水机', '2 台运行', ''], ['PAM 投加', '3.2', 'kg/tDS'], ['泥饼含水率', '78', '%'],
      ['处理量', '42', 't/d'], ['滤液回流', '320', 'm³/d'],
    ],
  },
  {
    id: 'transport', name: '外运', short: '外运', group: 'sludge',
    desc: '泥饼装车外运至焚烧或综合利用处置单位',
    flow: { x: 396, y: 470, w: 76, h: 46 },
    model: { type: 'platform', x: 38, z: 31, w: 3, d: 2, h: 1 },
    params: [
      ['日外运泥量', '42', 't/d'], ['运输频次', '6', '车/日'], ['含水率', '78', '%'],
      ['处置方式', '焚烧 + 建材利用', ''],
    ],
  },
];

/* 二维流程连接线：pts 为画布坐标路径点 */
const FLOW_LINKS = [
  { from: 'inlet', to: 'coarse', kind: 'water', pts: [[86, 77], [120, 77]] },
  { from: 'coarse', to: 'fine', kind: 'water', pts: [[260, 77], [294, 77]] },
  { from: 'fine', to: 'grit', kind: 'water', pts: [[380, 77], [414, 77]] },
  { from: 'grit', to: 'dist1', kind: 'water', pts: [[518, 77], [552, 77]] },
  { from: 'dist1', to: 'anaer', kind: 'water', pts: [[628, 77], [662, 77]] },
  { from: 'anaer', to: 'orbal', kind: 'water', pts: [[742, 77], [776, 77]] },
  { from: 'orbal', to: 'dist2', kind: 'water', pts: [[902, 77], [1052, 77], [1052, 176]] },
  { from: 'dist2', to: 'secondary', kind: 'water', pts: [[1014, 199], [974, 199]] },
  { from: 'secondary', to: 'lift2', kind: 'water', pts: [[884, 199], [854, 199]] },
  { from: 'lift2', to: 'floc', kind: 'water', pts: [[734, 199], [680, 199]] },
  { from: 'floc', to: 'primary', kind: 'water', pts: [[572, 199], [554, 199]] },
  { from: 'primary', to: 'dnf', kind: 'water', pts: [[446, 199], [414, 199]] },
  { from: 'dnf', to: 'contact', kind: 'water', pts: [[348, 222], [348, 268], [233, 268], [233, 300]] },
  { from: 'contact', to: 'measure', kind: 'water', pts: [[286, 323], [320, 323]] },
  { from: 'measure', to: 'outlet', kind: 'water', pts: [[420, 323], [456, 323]] },

  { from: 'secondary', to: 'anaer', kind: 'return', pts: [[929, 176], [929, 26], [702, 26], [702, 54]] },
  { from: 'secondary', to: 'sludgePump', kind: 'sludge', pts: [[955, 222], [955, 438], [975, 438], [975, 470]] },
  { from: 'primary', to: 'sludgePump', kind: 'sludge', pts: [[554, 222], [554, 400], [1005, 400], [1005, 470]] },
  { from: 'sludgePump', to: 'thickener', kind: 'sludge', pts: [[940, 493], [900, 493]] },
  { from: 'thickener', to: 'storage', kind: 'sludge', pts: [[796, 493], [726, 493]] },
  { from: 'storage', to: 'dewater', kind: 'sludge', pts: [[642, 493], [592, 493]] },
  { from: 'dewater', to: 'transport', kind: 'sludge', pts: [[506, 493], [472, 493]] },
  { from: 'dewater', to: 'inlet', kind: 'recycle', pts: [[549, 516], [549, 632], [53, 632], [53, 100]] },
  { from: 'thickener', to: 'inlet', kind: 'recycle', pts: [[848, 516], [848, 632], [549, 632]] },
];

const FLOW_ANNOTATIONS = [
  { text: 'PAC', x: 618, y: 163, color: '#0d6e8c' },
  { text: 'PAM', x: 549, y: 460, color: '#0d6e8c' },
  { text: '生物污泥', x: 1014, y: 462, color: '#a9762f' },
  { text: '化学污泥', x: 566, y: 316, rotate: 90, color: '#a9762f' },
  { text: '回流污泥', x: 806, y: 18, color: '#2f7cf6' },
  { text: '上清液回流', x: 300, y: 622, color: '#7a8ba0' },
];

const EQUIPMENTS = [
  { name: '粗格栅除污机 1#', area: '预处理', status: '运行', current: 12.4, hours: 18420 },
  { name: '细格栅除污机 2#', area: '预处理', status: '运行', current: 8.6, hours: 18310 },
  { name: '旋流沉砂器', area: '预处理', status: '运行', current: 6.2, hours: 12960 },
  { name: '厌氧池搅拌器 1#', area: '生化段', status: '运行', current: 7.2, hours: 15230 },
  { name: '氧化沟转刷 3#', area: '生化段', status: '运行', current: 42.5, hours: 9870 },
  { name: '氧化沟转刷 7#', area: '生化段', status: '待机', current: 0, hours: 9640 },
  { name: '二沉池刮吸泥机', area: '二沉池', status: '运行', current: 9.4, hours: 20110 },
  { name: '二次提升泵 1#', area: '提升泵房', status: '运行', current: 68.2, hours: 11280 },
  { name: '絮凝搅拌机', area: '深度处理', status: '运行', current: 5.8, hours: 7640 },
  { name: '平流池刮泥机', area: '深度处理', status: '运行', current: 6.4, hours: 8430 },
  { name: '深床滤池反冲洗泵', area: '深度处理', status: '运行', current: 54.1, hours: 6310 },
  { name: '次氯酸钠加药泵', area: '消毒', status: '运行', current: 3.1, hours: 6420 },
  { name: '污泥回流泵 2#', area: '污泥线', status: '运行', current: 34.6, hours: 12980 },
  { name: '污泥浓缩机', area: '污泥线', status: '运行', current: 11.2, hours: 8760 },
  { name: '带式脱水机 1#', area: '污泥线', status: '检修', current: 0, hours: 9120 },
];

const ALERTS = [
  { level: '严重', time: '11:20', title: '进水 COD 短时升高', desc: '进水 COD 达 462 mg/L，超近 7 日均值 18%，氧化沟外沟溶解氧短时下降。' },
  { level: '警告', time: '10:05', title: '出水总氮接近限值', desc: '当前 13.8 mg/L，限值 15 mg/L，深床滤池碳源投加已自动上调。' },
  { level: '提示', time: '08:42', title: '氧化沟转刷 3# 电流偏高', desc: '电流 42.5 A，较 3 日均值高 9%，建议检查转刷轴承与曝气效果。' },
  { level: '提示', time: '07:15', title: '污泥回流比自动调整', desc: '依据进水负荷，系统将回流比由 70% 调整至 75%。' },
];

const ANOMALIES = [
  { time: '13:24', ind: '进水 COD', value: '459 mg/L', dev: '+18.2%', conf: '96%', level: '高' },
  { time: '11:02', ind: '出水总氮', value: '13.8 mg/L', dev: '+9.4%', conf: '88%', level: '中' },
  { time: '09:47', ind: '氧化沟外沟 DO', value: '1.62 mg/L', dev: '−21.5%', conf: '92%', level: '中' },
  { time: '07:18', ind: '进水流量', value: '1,386 m³/h', dev: '+11.7%', conf: '81%', level: '低' },
];

const RULES = [
  ['出水 COD', '> 45 mg/L 持续 2 小时', '严重', '短信 + 平台 + 声光'],
  ['出水 氨氮', '> 4 mg/L 持续 1 小时', '严重', '短信 + 平台'],
  ['出水 总氮', '> 13 mg/L', '警告', '平台推送'],
  ['出水 总磷', '> 0.45 mg/L', '警告', '平台推送'],
  ['氧化沟外沟 DO', '< 1.5 mg/L 持续 30 分钟', '警告', '平台推送'],
  ['进水 COD', '24h 均值偏离 > 15%', '提示', '平台消息'],
  ['进水流量', '> 1,450 m³/h', '提示', '平台消息'],
];

const HISTORY_IND = {
  cod:  { name: 'COD',      unit: 'mg/L', inKey: 'codIn',  outKey: 'codOut',  limit: 50,  digits: 0 },
  nh3:  { name: '氨氮',     unit: 'mg/L', inKey: 'nh3In',  outKey: 'nh3Out',  limit: 5,   digits: 2 },
  tn:   { name: '总氮',     unit: 'mg/L', inKey: 'tnIn',   outKey: 'tnOut',   limit: 15,  digits: 2 },
  tp:   { name: '总磷',     unit: 'mg/L', inKey: 'tpIn',   outKey: 'tpOut',   limit: 0.5, digits: 2 },
  ss:   { name: '悬浮物',   unit: 'mg/L', inKey: 'ssIn',   outKey: 'ssOut',   limit: 10,  digits: 1 },
  flow: { name: '处理水量', unit: 'm³/d', inKey: 'flowIn', outKey: 'flowOut', limit: null, digits: 0 },
};

const CHAT_QUICK = [
  '今天出水 COD 为什么升高？',
  '总氮去除率偏低有哪些原因？',
  '氧化沟溶解氧异常怎么处理？',
  '最近的预警有哪些？',
  '当前各指标达标情况如何？',
];
