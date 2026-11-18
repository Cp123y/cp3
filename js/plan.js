/* ============================================================
   厂区总平面布置数据（依据设计平面图 1:1 位置关系）
   坐标系：以平面图为准，x 向右、z 向下，1 单位 ≈ 10 图元像素
   图纸中心 (453, 331) 对应世界坐标原点
   ============================================================ */
const PLAN = {
  site: { w: 90.6, d: 66.4 },
  /* 道路（相对厂区）：横/纵向主干道 */
  roads: [
    { x: 0, z: -29.2, w: 84, d: 4.4, dir: 'x' },
    { x: 0, z: 30.2, w: 84, d: 4.4, dir: 'x' },
    { x: -42.2, z: 0, w: 4.4, d: 62, dir: 'z' },
    { x: 42.2, z: 0, w: 4.4, d: 62, dir: 'z' },
    { x: -30.4, z: -2, w: 3.0, d: 54, dir: 'z' },
    { x: 23.8, z: -2, w: 3.0, d: 54, dir: 'z' },
    { x: -8, z: 9.8, w: 40, d: 3.0, dir: 'x' },
  ],
  /* 绿化 / 预留用地 */
  lawns: [
    { x: -4, z: 19.4, w: 45, d: 19.4 },
    { x: 37.6, z: 21.5, w: 8, d: 12 },
  ],
  /* 构筑物：type 决定三维造型 */
  items: [
    /* ---------- 预处理区（西侧一列，自北向南） ---------- */
    { id: 'inlet', unit: 'inlet', type: 'well', label: '进水井', short: '进水', x: -40.2, z: -25.4, r: 1.0, h: 2.4 },
    {
      id: 'coarse', unit: 'coarse', type: 'pump', label: '粗格栅及提升泵房', short: '粗格栅', x: -35.8, z: -22.6,
      w: 6.2, d: 8.2, h: 4.4, pumps: 2, channels: 2,
    },
    { id: 'fine', unit: 'fine', type: 'grit', label: '细格栅及旋流沉砂池', short: '细格栅', x: -35.8, z: -0.8, w: 7.0, d: 12.4, h: 2.8, cells: 6 },
    { id: 'dosing', unit: 'floc', type: 'building', label: '加药间（PAC / PAM）', short: '加药间', x: -36.0, z: 10.4, w: 5.6, d: 4.4, h: 3.2, tone: 'light' },
    { id: 'dewater', unit: 'dewater', type: 'lshape', label: '污泥脱水机房', short: '脱水机房', x: -36.4, z: 19.2, w: 6.4, d: 12.6, h: 4.6 },
    { id: 'storage', unit: 'storage', type: 'round', label: '贮泥池', short: '贮泥池', x: -35.6, z: 27.6, r: 1.9, h: 2.8 },
    { id: 'sludgePump', unit: 'sludgePump', type: 'building', label: '污泥泵房', short: '污泥泵房', x: -30.2, z: 27.4, w: 3.2, d: 4.0, h: 3.0 },

    /* ---------- 生化区（中部：2 组厌氧池 + 2 座奥贝尔氧化沟 + 2 座二沉池） ---------- */
    { id: 'anaer1', unit: 'anaer', type: 'tank', label: '厌氧池 1#', short: '厌氧池 1#', x: -24.4, z: -19.2, w: 3.2, d: 6.2, h: 2.8, mixers: 2 },
    { id: 'anaer2', unit: 'anaer', type: 'tank', label: '厌氧池 2#', short: '厌氧池 2#', x: -24.4, z: -1.4, w: 3.2, d: 6.2, h: 2.8, mixers: 2 },
    { id: 'ditch1', unit: 'orbal', type: 'ditch', label: '奥贝尔氧化沟 1#', short: '氧化沟 1#', x: -7.6, z: -19.8, rx: 10.8, rz: 7.7, h: 2.0 },
    { id: 'ditch2', unit: 'orbal', type: 'ditch', label: '奥贝尔氧化沟 2#', short: '氧化沟 2#', x: -7.6, z: -1.4, rx: 10.8, rz: 8.4, h: 2.0 },
    { id: 'sec1', unit: 'secondary', type: 'round', label: '二沉池 1#', short: '二沉池 1#', x: 12.6, z: -20.6, r: 4.3, h: 3.4, bridge: 'diag' },
    { id: 'sec2', unit: 'secondary', type: 'round', label: '二沉池 2#', short: '二沉池 2#', x: 12.2, z: 0.0, r: 4.5, h: 3.4, bridge: 'diag' },
    { id: 'dist1', unit: 'dist1', type: 'well', label: '配水井', short: '配水井', x: -29.8, z: -11.3, r: 0.9, h: 2.6 },
    { id: 'dist2', unit: 'dist2', type: 'well', label: '配水井（二沉池）', short: '配水井 2#', x: 19.2, z: -16.4, r: 0.9, h: 2.6 },
    { id: 'lift2', unit: 'lift2', type: 'building', label: '二次提升泵房', short: '二次提升', x: 19.4, z: -10.8, w: 3.6, d: 4.2, h: 3.6 },

    /* ---------- 深度处理区（东侧一列，自北向南） ---------- */
    { id: 'thick1', unit: 'thickener', type: 'round', label: '污泥浓缩池 1#', short: '浓缩池 1#', x: 27.2, z: -22.9, r: 1.85, h: 2.8, bridge: 'diag' },
    { id: 'thick2', unit: 'thickener', type: 'round', label: '污泥浓缩池 2#', short: '浓缩池 2#', x: 31.6, z: -22.9, r: 1.85, h: 2.8, bridge: 'diag' },
    { id: 'floc', unit: 'floc', type: 'grid', label: '网格絮凝池', short: '絮凝池', x: 30.7, z: -16.4, w: 8.8, d: 3.0, h: 2.6, cols: 8, rows: 3 },
    { id: 'primary', unit: 'primary', type: 'lane', label: '平流沉淀池', short: '平流池', x: 30.7, z: -10.4, w: 8.8, d: 8.8, h: 2.9, lanes: 2 },
    { id: 'dnf', unit: 'dnf', type: 'filter', label: '反硝化深床滤池', short: '深床滤池', x: 29.8, z: -0.2, w: 11.0, d: 9.8, h: 3.3, groups: 2, cells: 6 },
    { id: 'contact', unit: 'contact', type: 'tank', label: '接触消毒池', short: '消毒池', x: 29.9, z: 8.3, w: 8.0, d: 4.6, h: 2.5, baffles: 3 },
    { id: 'measure', unit: 'measure', type: 'flume', label: '巴氏计量槽', short: '计量槽', x: 31.8, z: 12.8, w: 6.8, d: 2.6, h: 1.8 },
    { id: 'outlet', unit: 'outlet', type: 'outfall', label: '出水口', short: '出水', x: 40.2, z: 14.2, w: 2.6, d: 2.6, h: 1.4 },

    /* ---------- 附属建筑（不可点选，仅造型） ---------- */
    { id: 'deco1', type: 'building', x: 27.0, z: -28.2, w: 3.2, d: 2.6, h: 2.6, pick: false },
    { id: 'deco2', type: 'building', x: 32.2, z: -28.4, w: 2.6, d: 2.2, h: 2.4, pick: false },
    { id: 'deco3', type: 'building', x: 24.8, z: -26.4, w: 2.2, d: 1.6, h: 2.0, pick: false },
  ],
  /* 工艺管线（水体 / 污泥 / 回流 / 上清液） */
  pipes: [
    { from: 'inlet', to: 'coarse', kind: 'water' },
    { from: 'coarse', to: 'fine', kind: 'water' },
    { from: 'fine', to: 'dist1', kind: 'water' },
    { from: 'dist1', to: 'anaer1', kind: 'water' },
    { from: 'dist1', to: 'anaer2', kind: 'water' },
    { from: 'anaer1', to: 'ditch1', kind: 'water' },
    { from: 'anaer2', to: 'ditch2', kind: 'water' },
    { from: 'ditch1', to: 'sec1', kind: 'water', via: [[3.4, -20.6]] },
    { from: 'ditch2', to: 'sec2', kind: 'water', via: [[3.4, 0.0]] },
    { from: 'sec1', to: 'lift2', kind: 'water', via: [[19.4, -20.6]] },
    { from: 'sec2', to: 'lift2', kind: 'water', via: [[19.4, 0.0]] },
    { from: 'lift2', to: 'floc', kind: 'water', via: [[26.2, -10.8], [26.2, -16.4]] },
    { from: 'floc', to: 'primary', kind: 'water' },
    { from: 'primary', to: 'dnf', kind: 'water', via: [[30.7, -4.3]] },
    { from: 'dnf', to: 'contact', kind: 'water' },
    { from: 'contact', to: 'measure', kind: 'water' },
    { from: 'measure', to: 'outlet', kind: 'water' },

    { from: 'sec1', to: 'thick1', kind: 'sludge', via: [[24.6, -20.6], [24.6, -22.9]] },
    { from: 'sec2', to: 'thick2', kind: 'sludge', via: [[24.6, 0.0], [24.6, -22.9]] },
    { from: 'primary', to: 'thick1', kind: 'sludge', via: [[24.6, -10.4]] },
    { from: 'thick1', to: 'storage', kind: 'sludge', via: [[24.6, -25.6], [-35.6, -25.6]] },
    { from: 'thick2', to: 'thick1', kind: 'sludge' },
    { from: 'storage', to: 'dewater', kind: 'sludge' },
    { from: 'dewater', to: 'sludgePump', kind: 'sludge' },

    { from: 'sec1', to: 'anaer1', kind: 'return', via: [[16.8, -20.6], [16.8, -25.8], [-24.4, -25.8]] },
    { from: 'sec2', to: 'anaer2', kind: 'return', via: [[16.8, 0.0], [16.8, -25.8], [-24.4, -25.8]] },
    { from: 'dewater', to: 'inlet', kind: 'recycle', via: [[-43.0, 19.2], [-43.0, -25.4]] },
  ],
};
