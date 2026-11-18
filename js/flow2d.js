/* 二维设计工艺流程图（对应图 2.1） */
(function () {
  const COLORS = {
    water: '#7ba0b8',
    sludge: '#c08a4a',
    return: '#2f7cf6',
    recycle: '#9aa9b8',
  };
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function render(container, selectedId, onPick) {
    if (!container) return;
    const defs = Object.keys(COLORS).map(k => `
      <marker id="arw-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5"
        orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${COLORS[k]}"/></marker>`).join('');

    const links = FLOW_LINKS.map(l => {
      const d = l.pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
      const dash = l.kind === 'return' ? ' stroke-dasharray="7 4"' : l.kind === 'recycle' ? ' stroke-dasharray="3 4"' : '';
      const width = l.kind === 'water' ? 1.9 : l.kind === 'sludge' ? 1.7 : 1.5;
      return `<g class="flink">
        <path d="${d}" fill="none" stroke="#ffffff" stroke-width="${width + 4}" stroke-linejoin="round" opacity=".95"/>
        <path d="${d}" fill="none" stroke="${COLORS[l.kind]}" stroke-width="${width}" stroke-linejoin="round"
          ${dash} marker-end="url(#arw-${l.kind})"/>
      </g>`;
    }).join('');

    const nodes = PLANT_UNITS.map(u => {
      const f = u.flow, cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      const cls = ['fnode', u.group, u.id === selectedId ? 'sel' : ''].join(' ');
      return `<g class="${cls}" data-unit="${u.id}">
        <rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="8"/>
        <text x="${cx}" y="${cy + 4.5}" text-anchor="middle">${esc(u.name)}</text>
      </g>`;
    }).join('');

    const notes = FLOW_ANNOTATIONS.map(a =>
      `<text x="${a.x}" y="${a.y}" fill="${a.color}" font-size="11" text-anchor="middle"
        ${a.rotate ? `transform="rotate(${a.rotate} ${a.x} ${a.y})"` : ''}>${esc(a.text)}</text>`
    ).join('');

    container.innerHTML = `<svg viewBox="0 0 1100 690" class="schematic" preserveAspectRatio="xMidYMid meet">
      <defs>${defs}</defs>
      ${links}${notes}${nodes}
    </svg>`;

    container.querySelectorAll('.fnode').forEach(g => {
      g.addEventListener('click', () => onPick(g.dataset.unit));
    });
  }

  window.FLOW2D = { render };
})();
