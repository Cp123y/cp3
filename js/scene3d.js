/* 厂区三维模型（Three.js）—— 按设计总平面图布置 */
(function () {
  let renderer, scene, camera, controls, clock;
  let ready = false, autoRotate = true, selectedId = null, onPickCb = null;
  let labelLayer = null, stageEl = null;
  let pickables = [], groups = {}, labels = [], particles = [], waterMats = [], ring = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const MAT = {};
  const HOME = { pos: [0, 82, 112], target: [0, 0, 2] };

  function initMats() {
    MAT.concrete = new THREE.MeshStandardMaterial({ color: 0xd6e0e8, roughness: 0.84, metalness: 0.05 });
    MAT.concreteDark = new THREE.MeshStandardMaterial({ color: 0xa9b9c6, roughness: 0.86, metalness: 0.04 });
    MAT.roof = new THREE.MeshStandardMaterial({ color: 0x7e94a8, roughness: 0.72, metalness: 0.16 });
    MAT.window = new THREE.MeshStandardMaterial({ color: 0x0d4055, emissive: 0x2c9fc4, emissiveIntensity: 0.85, roughness: 0.3 });
    MAT.water = new THREE.MeshStandardMaterial({
      color: 0x1b6c88, emissive: 0x0b3a4d, emissiveIntensity: 0.55,
      metalness: 0.35, roughness: 0.22, transparent: true, opacity: 0.94,
    });
    MAT.waterDark = new THREE.MeshStandardMaterial({
      color: 0x14506a, emissive: 0x082c3b, emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.28,
    });
    MAT.metal = new THREE.MeshStandardMaterial({ color: 0x9fb6c7, roughness: 0.4, metalness: 0.65 });
    MAT.pipe = new THREE.MeshStandardMaterial({ color: 0x2ba7bd, emissive: 0x14707f, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.4 });
    MAT.sludgePipe = new THREE.MeshStandardMaterial({ color: 0xb98a52, emissive: 0x6a4a21, emissiveIntensity: 0.4, roughness: 0.5, metalness: 0.3 });
    MAT.returnPipe = new THREE.MeshStandardMaterial({ color: 0x4a7fd8, emissive: 0x1e3f7a, emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.35 });
    MAT.flowDot = new THREE.MeshBasicMaterial({ color: 0xa8f2ff });
    MAT.ground = new THREE.MeshStandardMaterial({ color: 0x07141d, roughness: 1, metalness: 0 });
    MAT.slab = new THREE.MeshStandardMaterial({ color: 0x0c2130, roughness: 0.96, metalness: 0.04 });
    MAT.road = new THREE.MeshStandardMaterial({ color: 0x15303f, roughness: 1, metalness: 0 });
    MAT.lawn = new THREE.MeshStandardMaterial({ color: 0x14402f, roughness: 1, metalness: 0 });
    MAT.ring = new THREE.MeshBasicMaterial({ color: 0x38e0f0, transparent: true, opacity: 0.85 });
    waterMats = [MAT.water, MAT.waterDark];
  }

  const box = (w, h, d, mat, x, y, z, shadow) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  };
  const cylinder = (rt, rb, h, seg, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const plane = (w, d, mat, y) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y || 0;
    m.receiveShadow = true;
    return m;
  };

  function ellipseShape(rx, rz, irx) {
    const s = new THREE.Shape();
    s.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
    if (irx != null) {
      const h = new THREE.Path();
      h.absellipse(0, 0, irx, irx * rz / rx, 0, Math.PI * 2, true, 0);
      s.holes.push(h);
    }
    return s;
  }

  /* ---------- 构筑物 ---------- */
  function makeBuilding(m) {
    const g = new THREE.Group();
    const w = m.w, d = m.d, h = m.h;
    g.add(box(w, h, d, MAT.concrete, 0, h / 2, 0));
    g.add(box(w + 0.4, 0.24, d + 0.4, MAT.roof, 0, h + 0.11, 0));
    if (Math.min(w, d) > 2) {
      g.add(box(w * 0.8, h * 0.13, d + 0.06, MAT.window, 0, h * 0.64, 0, false));
      g.add(box(0.14, h * 0.4, d * 0.36, MAT.window, w / 2 + 0.02, h * 0.22, 0, false));
    }
    return g;
  }

  function makeLShape(m) {
    const g = new THREE.Group();
    const w = m.w, d = m.d, h = m.h;
    g.add(box(w, h, d * 0.46, MAT.concrete, 0, h / 2, -d * 0.27));
    g.add(box(w + 0.3, 0.22, d * 0.46 + 0.3, MAT.roof, 0, h + 0.1, -d * 0.27));
    g.add(box(w * 0.6, h * 0.72, d * 0.54, MAT.concrete, -w * 0.2, h * 0.36, d * 0.23));
    g.add(box(w * 0.6 + 0.3, 0.2, d * 0.54 + 0.3, MAT.roof, -w * 0.2, h * 0.72 + 0.1, d * 0.23));
    g.add(box(w * 0.8, h * 0.1, 0.1, MAT.window, 0, h * 0.62, -d * 0.27 + d * 0.46 / 2 + 0.03, false));
    return g;
  }

  function makePump(m) {
    const g = new THREE.Group();
    const w = m.w, d = m.d, h = m.h;
    const bh = h, bd = d * 0.52;
    g.add(box(w, bh, bd, MAT.concrete, 0, bh / 2, -d * 0.24));
    g.add(box(w + 0.35, 0.22, bd + 0.35, MAT.roof, 0, bh + 0.1, -d * 0.24));
    g.add(box(w * 0.8, bh * 0.12, bd + 0.06, MAT.window, 0, bh * 0.66, -d * 0.24, false));
    // 泵组
    for (let i = 0; i < (m.pumps || 2); i++) {
      const px = (i - (m.pumps - 1) / 2) * w * 0.34;
      g.add(cylinder(0.42, 0.42, 0.9, 14, MAT.metal, px, 0.45, -d * 0.24 + bd / 2 + 0.55));
    }
    // 进水格栅渠道
    const chD = d * 0.34;
    for (let i = 0; i < (m.channels || 2); i++) {
      const cw = w / (m.channels || 2);
      const cx = -w / 2 + cw * i + cw / 2;
      g.add(box(0.16, 1.5, chD, MAT.concreteDark, cx - cw / 2 + 0.08, 0.75, d * 0.33));
      g.add(box(cw - 0.2, 0.06, chD - 0.3, MAT.water, cx, 1.1, d * 0.33, false));
    }
    g.add(box(0.16, 1.5, chD, MAT.concreteDark, w / 2 - 0.08, 0.75, d * 0.33));
    return g;
  }

  function makeTank(m) {
    const g = new THREE.Group();
    const w = m.w, d = m.d, h = m.h, t = 0.3;
    g.add(box(w, h, t, MAT.concrete, 0, h / 2, d / 2));
    g.add(box(w, h, t, MAT.concrete, 0, h / 2, -d / 2));
    g.add(box(t, h, d, MAT.concrete, w / 2, h / 2, 0));
    g.add(box(t, h, d, MAT.concrete, -w / 2, h / 2, 0));
    const water = plane(w - t * 1.8, d - t * 1.8, MAT.water, h * 0.78);
    g.add(water);
    g.add(box(w + 0.3, 0.07, 0.36, MAT.metal, 0, h + 0.05, -d / 2 - 0.04, false));
    if (m.baffles) {
      for (let i = 1; i <= m.baffles; i++) {
        const bx = -w / 2 + w * i / (m.baffles + 1);
        const odd = i % 2 === 0;
        g.add(box(0.14, h * 0.9, d * 0.62, MAT.concreteDark, bx, h * 0.45, odd ? d * 0.15 : -d * 0.15));
      }
    }
    if (m.mixers) {
      const n = m.mixers;
      for (let i = 0; i < n; i++) {
        const mz = (i - (n - 1) / 2) * d * 0.42;
        g.add(cylinder(0.12, 0.12, 1.2, 8, MAT.metal, w * 0.18, h + 0.6, mz));
        g.add(cylinder(0.5, 0.5, 0.12, 12, MAT.metal, w * 0.18, h + 0.1, mz));
      }
    }
    return g;
  }

  function makeGrit(m) {
    const g = makeTank(m);
    const w = m.w, d = m.d, h = m.h;
    const n = m.cells || 6;
    for (let i = 1; i < n; i++) {
      const z = -d / 2 + d * i / n;
      g.add(box(w - 0.1, h * 0.92, 0.12, MAT.concreteDark, 0, h * 0.46, z));
    }
    for (let i = 0; i < n; i++) {
      const z = -d / 2 + d * (i + 0.5) / n;
      g.add(box(w * 0.3, 0.05, d / n * 0.55, MAT.waterDark, -w * 0.12, h * 0.8, z, false));
    }
    // 砂水分离器
    g.add(cylinder(0.5, 0.5, 1.4, 12, MAT.metal, w / 2 + 0.9, 0.7, d * 0.28));
    return g;
  }

  function makeRound(m) {
    const g = new THREE.Group();
    const r = m.r, h = m.h;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48, 1, true), MAT.concrete);
    wall.material.side = THREE.DoubleSide;
    wall.position.y = h / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
    const water = new THREE.Mesh(new THREE.CircleGeometry(r * 0.94, 48), MAT.water);
    water.rotation.x = -Math.PI / 2;
    water.position.y = h * 0.8;
    g.add(water);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 8, 48), MAT.metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = h;
    g.add(rim);
    // 刮吸泥桥
    const bg = new THREE.Group();
    bg.add(box(r * 1.92, 0.1, 0.42, MAT.metal, 0, h + 0.12, 0, false));
    bg.add(box(r * 1.92, 0.05, 0.06, MAT.metal, 0, h + 0.55, -0.18, false));
    bg.add(box(r * 1.92, 0.05, 0.06, MAT.metal, 0, h + 0.55, 0.18, false));
    bg.add(cylinder(0.3, 0.3, 0.62, 12, MAT.concreteDark, 0, h + 0.28, 0));
    bg.rotation.y = m.bridge === 'diag' ? Math.PI / 4 : 0;
    g.add(bg);
    return g;
  }

  function makeDitch(m) {
    const g = new THREE.Group();
    const rx = m.rx, rz = m.rz, h = m.h;
    const widths = [3.0, 3.0, 3.0];
    let outerX = rx, outerZ = rz;
    for (let i = 0; i < 3; i++) {
      const t = widths[i];
      const geo = new THREE.ExtrudeGeometry(ellipseShape(outerX, outerZ, outerX - t), {
        depth: h, bevelEnabled: false, curveSegments: 64,
      });
      geo.rotateX(-Math.PI / 2);
      const wall = new THREE.Mesh(geo, MAT.concrete);
      wall.castShadow = true; wall.receiveShadow = true;
      g.add(wall);
      // 沟内水面
      const wGeo = new THREE.ShapeGeometry(ellipseShape(outerX - 0.35, outerZ - 0.35, outerX - t + 0.02), 64);
      wGeo.rotateX(-Math.PI / 2);
      const water = new THREE.Mesh(wGeo, MAT.water);
      water.position.y = h * 0.74;
      water.receiveShadow = true;
      g.add(water);
      outerX -= t + 0.55;
      outerZ -= t + 0.55;
    }
    // 中心岛
    const islGeo = new THREE.ExtrudeGeometry(ellipseShape(outerX - 0.3, outerZ - 0.3), { depth: h * 0.62, bevelEnabled: false, curveSegments: 48 });
    islGeo.rotateX(-Math.PI / 2);
    const isl = new THREE.Mesh(islGeo, MAT.concreteDark);
    isl.castShadow = true; isl.receiveShadow = true;
    g.add(isl);
    // 走道桥
    g.add(box(rx * 2.02, 0.16, 0.7, MAT.metal, 0, h + 0.1, 0, false));
    for (const s of [-1, 1]) {
      g.add(box(rx * 2.02, 0.05, 0.05, MAT.metal, 0, h + 0.62, s * 0.32, false));
      g.add(box(rx * 2.02, 0.5, 0.04, MAT.metal, 0, h + 0.34, s * 0.36, false));
    }
    // 转刷（沿 z 轴）
    for (const sx of [-0.62, -0.2, 0.24, 0.66]) {
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, rz * 0.62, 10), MAT.metal);
      rotor.rotation.x = Math.PI / 2;
      rotor.position.set(rx * sx, h + 0.02, 0);
      g.add(rotor);
    }
    return g;
  }

  function makeGrid(m) {
    const g = makeTank(m);
    const w = m.w, d = m.d, h = m.h;
    const cols = m.cols || 8, rows = m.rows || 3;
    for (let i = 1; i < cols; i++) {
      g.add(box(0.1, h * 0.72, d - 0.2, MAT.concreteDark, -w / 2 + w * i / cols, h * 0.36, 0, false));
    }
    for (let j = 1; j < rows; j++) {
      g.add(box(w - 0.2, h * 0.72, 0.1, MAT.concreteDark, 0, h * 0.36, -d / 2 + d * j / rows, false));
    }
    return g;
  }

  function makeLane(m) {
    const g = makeTank(m);
    const w = m.w, d = m.d, h = m.h;
    const n = m.lanes || 2;
    for (let i = 1; i < n; i++) {
      g.add(box(0.16, h * 0.95, d, MAT.concreteDark, -w / 2 + w * i / n, h * 0.47, 0));
    }
    // 进水挡板 + 排泥斗
    g.add(box(0.12, h * 0.8, d * 0.9, MAT.concreteDark, -w / 2 + 1.0, h * 0.4, 0));
    g.add(box(w * 0.86, 0.06, 1.1, MAT.metal, 0, h + 0.32, -d / 2 + 1.6, false));
    g.add(box(w * 0.86, 0.06, 1.1, MAT.metal, 0, h + 0.32, d / 2 - 1.6, false));
    return g;
  }

  function makeFilter(m) {
    const g = makeTank(m);
    const w = m.w, d = m.d, h = m.h;
    const groupsN = m.groups || 2, cells = m.cells || 6;
    const gw = w / groupsN;
    for (let gi = 1; gi < groupsN; gi++) {
      g.add(box(0.5, h + 0.2, d, MAT.concreteDark, -w / 2 + gw * gi, (h + 0.2) / 2, 0));
    }
    for (let gi = 0; gi < groupsN; gi++) {
      const x0 = -w / 2 + gw * gi;
      for (let ci = 1; ci < cells; ci++) {
        g.add(box(0.1, h * 0.9, d - 0.3, MAT.concreteDark, x0 + gw * ci / cells, h * 0.45, 0, false));
      }
      // 反冲洗排水槽
      g.add(box(gw * 0.9, 0.12, 0.3, MAT.metal, x0 + gw / 2, h + 0.28, -d / 2 + 0.7, false));
    }
    return g;
  }

  function makeFlume(m) {
    const g = new THREE.Group();
    const w = m.w, d = m.d, h = m.h;
    g.add(box(w, 0.35, d, MAT.concrete, 0, 0.17, 0));
    g.add(box(w, h, 0.24, MAT.concrete, 0, h / 2, d / 2));
    g.add(box(w, h, 0.24, MAT.concrete, 0, h / 2, -d / 2));
    // 喉部
    g.add(box(w * 0.28, h, 0.22, MAT.concreteDark, 0, h / 2, d * 0.28));
    g.add(box(w * 0.28, h, 0.22, MAT.concreteDark, 0, h / 2, -d * 0.28));
    g.add(plane(w * 0.96, d * 0.5, MAT.water, h * 0.62));
    g.add(box(0.18, 2.0, 0.18, MAT.metal, -w / 2 + 0.5, 1.0, d / 2 + 0.25, false));
    return g;
  }

  function makeOutfall(m) {
    const g = new THREE.Group();
    g.add(box(m.w, m.h * 0.6, m.d, MAT.concreteDark, 0, m.h * 0.3, 0));
    g.add(plane(m.w * 0.9, m.d * 0.9, MAT.water, m.h * 0.6 + 0.01));
    g.add(box(0.2, 1.2, m.d, MAT.concrete, m.w / 2, 0.6, 0, false));
    return g;
  }

  function buildItem(it) {
    let g;
    const t = it.type;
    if (t === 'building') g = makeBuilding(it);
    else if (t === 'lshape') g = makeLShape(it);
    else if (t === 'pump') g = makePump(it);
    else if (t === 'grit') g = makeGrit(it);
    else if (t === 'tank') g = makeTank(it);
    else if (t === 'round' || t === 'well') g = makeRound(Object.assign({ h: it.h }, it));
    else if (t === 'ditch') g = makeDitch(it);
    else if (t === 'grid') g = makeGrid(it);
    else if (t === 'lane') g = makeLane(it);
    else if (t === 'filter') g = makeFilter(it);
    else if (t === 'flume') g = makeFlume(it);
    else g = makeOutfall(it);

    g.position.set(it.x, 0, it.z);
    if (it.pick !== false) {
      g.traverse(o => {
        if (o.isMesh) { o.userData.itemId = it.id; pickables.push(o); }
      });
    }
    groups[it.id] = { group: g, item: it };
    scene.add(g);

    if (it.label) {
      const el = document.createElement('div');
      el.className = 'twin-label' + (it.unit && it.unit.indexOf('thick') === 0 ? ' sludge' : '');
      el.dataset.item = it.id;
      el.innerHTML = `<i></i><span>${it.short}</span>`;
      el.addEventListener('click', () => { select(it.id); if (onPickCb) onPickCb(it.id); });
      labelLayer.appendChild(el);
      labels.push({ el, id: it.id, y: (it.h || 2) + 1.4, x: it.x, z: it.z });
    }
  }

  /* 管线：正交折线（A → 途经点 → B） */
  function pipePath(l) {
    const a = groups[l.from], b = groups[l.to];
    if (!a || !b) return null;
    const A = a.item, B = b.item;
    const via = (l.via || []).slice();
    const pts = [[A.x, A.z]].concat(via, [[B.x, B.z]]);
    const out = [];
    pts.forEach(p => out.push(new THREE.Vector3(p[0], 0.55, p[1])));
    // 在拐点处补 45° 过渡，让走向更自然
    return out;
  }

  function buildPipes() {
    PLAN.pipes.forEach(l => {
      const pts = pipePath(l);
      if (!pts || pts.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.06);
      const mat = l.kind === 'sludge' ? MAT.sludgePipe
        : l.kind === 'return' ? MAT.returnPipe
        : l.kind === 'recycle' ? MAT.concreteDark : MAT.pipe;
      const rad = l.kind === 'water' ? 0.17 : 0.12;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 16), rad, 8, false), mat);
      tube.castShadow = true;
      scene.add(tube);

      const n = l.kind === 'water' ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(l.kind === 'water' ? 0.2 : 0.15, 8, 8), MAT.flowDot);
        scene.add(dot);
        particles.push({ mesh: dot, curve, t: k / n + Math.random() * 0.15, speed: 0.035 + Math.random() * 0.03 });
      }
    });
  }

  function initLights() {
    scene.add(new THREE.HemisphereLight(0x9ad6ef, 0x0a1a24, 0.66));
    const dir = new THREE.DirectionalLight(0xffffff, 1.05);
    dir.position.set(34, 78, 42);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -72;
    dir.shadow.camera.right = 72;
    dir.shadow.camera.top = 72;
    dir.shadow.camera.bottom = -72;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 240;
    dir.shadow.bias = -0.0007;
    scene.add(dir);

    const p1 = new THREE.PointLight(0x2fd4e0, 0.55, 120);
    p1.position.set(-16, 16, -6);
    scene.add(p1);
    const p2 = new THREE.PointLight(0xf0a15a, 0.3, 110);
    p2.position.set(28, 12, 18);
    scene.add(p2);
  }

  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061520);
    scene.fog = new THREE.Fog(0x061520, 170, 330);

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
    camera.position.set(HOME.pos[0], HOME.pos[1], HOME.pos[2]);

    clock = new THREE.Clock();

    // 大地
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), MAT.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(300, 120, 0x1a4a60, 0x0f2c3c);
    grid.position.y = 0.008;
    grid.material.transparent = true;
    grid.material.opacity = 0.32;
    scene.add(grid);

    // 厂区基座
    const slab = box(PLAN.site.w, 0.8, PLAN.site.d, MAT.slab, 0, -0.4, 0);
    slab.castShadow = false;
    scene.add(slab);

    // 道路与绿化
    PLAN.roads.forEach(r => {
      const p = plane(r.w, r.d, MAT.road, 0.05);
      p.position.set(r.x, 0.05, r.z);
      scene.add(p);
    });
    PLAN.lawns.forEach(l => {
      const p = plane(l.w, l.d, MAT.lawn, 0.035);
      p.position.set(l.x, 0.035, l.z);
      scene.add(p);
    });

    // 围墙
    const fw = PLAN.site.w / 2, fd = PLAN.site.d / 2;
    [[0, -fd, PLAN.site.w, 0.3], [0, fd, PLAN.site.w, 0.3], [-fw, 0, 0.3, PLAN.site.d], [fw, 0, 0.3, PLAN.site.d]]
      .forEach(([x, z, w, d]) => {
        scene.add(box(w, 0.9, d, MAT.concreteDark, x, 0.45, z, false));
      });

    initLights();
    PLAN.items.forEach(buildItem);
    buildPipes();

    ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.1, 8, 64), MAT.ring);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    ring.visible = false;
    scene.add(ring);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(HOME.target[0], HOME.target[1], HOME.target[2]);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 26;
    controls.maxDistance = 230;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.32;
    controls.update();
  }

  /* ---------- 交互 ---------- */
  function updateLabels() {
    if (!renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    labels.forEach(l => {
      const pos = new THREE.Vector3(l.x, l.y, l.z).project(camera);
      const visible = pos.z < 1 && Math.abs(pos.x) < 1.15 && Math.abs(pos.y) < 1.15;
      const x = (pos.x * 0.5 + 0.5) * rect.width;
      const y = (-pos.y * 0.5 + 0.5) * rect.height;
      l.el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
      l.el.style.opacity = visible ? '1' : '0';
      l.el.style.pointerEvents = visible ? 'auto' : 'none';
    });
  }

  function pickAt(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    return hits.length ? hits[0].object.userData.itemId : null;
  }

  function itemRadius(it) {
    if (it.r) return it.r + 1.0;
    if (it.rx) return Math.max(it.rx, it.rz) + 0.9;
    return Math.max(it.w || 2, it.d || 2) / 2 + 1.0;
  }

  function select(id) {
    selectedId = id;
    labels.forEach(l => l.el.classList.toggle('active', l.id === id));
    const g = groups[id];
    if (g && ring) {
      const it = g.item;
      ring.geometry.dispose();
      ring.geometry = new THREE.TorusGeometry(itemRadius(it), 0.09, 8, 64);
      ring.position.set(it.x, 0.12, it.z);
      ring.visible = true;
    } else if (ring) {
      ring.visible = false;
    }
  }

  let downX = 0, downY = 0, downT = 0;
  function bindEvents() {
    const el = renderer.domElement;
    el.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; downT = Date.now(); });
    el.addEventListener('pointerup', e => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved < 5 && Date.now() - downT < 600) {
        const id = pickAt(e.clientX, e.clientY);
        select(id);
        if (onPickCb) onPickCb(id || null);
      }
    });
    el.addEventListener('pointermove', e => {
      el.style.cursor = pickAt(e.clientX, e.clientY) ? 'pointer' : 'grab';
    });
    window.addEventListener('resize', resize);
    if (window.ResizeObserver && stageEl) new ResizeObserver(resize).observe(stageEl);
  }

  function resize() {
    if (!renderer || !stageEl) return;
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    if (!w || !h) return;
    if (renderer.domElement.width === Math.round(w * renderer.getPixelRatio()) &&
        renderer.domElement.height === Math.round(h * renderer.getPixelRatio())) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !stageEl) return;
    if (!stageEl.clientWidth) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    controls.update();

    particles.forEach(p => {
      p.t += dt * p.speed;
      if (p.t > 1) p.t -= 1;
      p.mesh.position.copy(p.curve.getPoint(p.t));
    });
    waterMats.forEach(m => { m.emissiveIntensity = 0.5 + Math.sin(t * 1.3) * 0.09; });
    if (ring && ring.visible) {
      ring.material.opacity = 0.5 + Math.sin(t * 3) * 0.3;
      ring.rotation.z = t * 0.5;
    }
    renderer.render(scene, camera);
    updateLabels();
  }

  function init(canvas, labelEl, stage, cb) {
    if (ready) return true;
    labelLayer = labelEl;
    stageEl = stage;
    onPickCb = cb;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    } catch (err) {
      if (labelEl) labelEl.innerHTML = '<div class="twin-fallback">当前浏览器不支持 WebGL，无法显示三维模型</div>';
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;

    initMats();
    initScene();
    resize();
    bindEvents();
    animate();
    ready = true;
    return true;
  }

  window.Scene3D = {
    init, select, resize,
    isReady: () => ready,
    setAutoRotate(v) { autoRotate = v; if (controls) controls.autoRotate = v; },
    resetView() {
      if (!camera) return;
      camera.position.set(HOME.pos[0], HOME.pos[1], HOME.pos[2]);
      controls.target.set(HOME.target[0], HOME.target[1], HOME.target[2]);
      controls.update();
    },
    selected: () => selectedId,
    getScene: () => scene,
  };
})();
