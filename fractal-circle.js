// FractalCircle: SVG рендер, геометрія, hit-test
export function createFractalCircle(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const R = Math.min(width, height) * 0.26;
  const cx = width / 2;
  const cy = height / 2;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);

  // Core
  const core = document.createElementNS(svg.namespaceURI, 'circle');
  core.setAttribute('cx', cx);
  core.setAttribute('cy', cy);
  core.setAttribute('r', 0.5 * R);
  core.setAttribute('fill', 'var(--core)');
  svg.appendChild(core);

  const coreText = document.createElementNS(svg.namespaceURI, 'text');
  coreText.setAttribute('x', cx);
  coreText.setAttribute('y', cy);
  coreText.textContent = 'Yearly Quarter';
  svg.appendChild(coreText);

  // Middle ring: 12 sectors
  const numSmall = 12;
  const anglePer = 360 / numSmall;
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  const quarterForSmall = [0,1,1,1,2,2,2,3,3,3,0,0]; // Q1=0 etc.
  const midColors = ['var(--mid-q1)', 'var(--mid-q2)', 'var(--mid-q3)', 'var(--mid-q4)'];

  for (let i = 0; i < numSmall; i++) {
    const startDeg = i * anglePer;
    const endDeg = (i + 1) * anglePer;
    const startRad = startDeg * Math.PI / 180;
    const endRad = endDeg * Math.PI / 180;
    const pathD = arcPath(cx, cy, 0.5 * R, 0.75 * R, startRad, endRad);
    const sector = document.createElementNS(svg.namespaceURI, 'path');
    sector.setAttribute('d', pathD);
    sector.setAttribute('fill', midColors[quarterForSmall[i]]);
    svg.appendChild(sector);

    // Label
    const midRad = (startRad + endRad) / 2;
    const rText = (0.5 * R + 0.75 * R) / 2;
    const text = document.createElementNS(svg.namespaceURI, 'text');
    const pos = polarToCartesian(cx, cy, rText, midRad);
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y);
    text.textContent = months[i];
    svg.appendChild(text);
  }

  // Outer ring: 4 quarters, handle crossing for Q1
  const outerQuarters = [
    {quarter: 0, startDeg: 300, endDeg: 390, label: 'Q1', color: 'var(--outer-q1)'},
    {quarter: 1, startDeg: 30, endDeg: 120, label: 'Q2', color: 'var(--outer-q2)'},
    {quarter: 2, startDeg: 120, endDeg: 210, label: 'Q3', color: 'var(--outer-q3)'},
    {quarter: 3, startDeg: 210, endDeg: 300, label: 'Q4', color: 'var(--outer-q4)'}
  ];

  for (const q of outerQuarters) {
    let startRad = q.startDeg * Math.PI / 180;
    let endRad = q.endDeg * Math.PI / 180;
    if (q.endDeg > 360) {
      // Split for crossing
      const pathD1 = arcPath(cx, cy, 0.75 * R, R, startRad, 2 * Math.PI);
      const sector1 = document.createElementNS(svg.namespaceURI, 'path');
      sector1.setAttribute('d', pathD1);
      sector1.setAttribute('fill', q.color);
      svg.appendChild(sector1);

      const pathD2 = arcPath(cx, cy, 0.75 * R, R, 0, endRad - 2 * Math.PI);
      const sector2 = document.createElementNS(svg.namespaceURI, 'path');
      sector2.setAttribute('d', pathD2);
      sector2.setAttribute('fill', q.color);
      svg.appendChild(sector2);
    } else {
      const pathD = arcPath(cx, cy, 0.75 * R, R, startRad, endRad);
      const sector = document.createElementNS(svg.namespaceURI, 'path');
      sector.setAttribute('d', pathD);
      sector.setAttribute('fill', q.color);
      svg.appendChild(sector);
    }

    // Label
    let midDeg = (q.startDeg + (q.endDeg % 360)) / 2;
    if (q.endDeg > 360) midDeg += 180; // Adjust for crossing
    const midRad = midDeg * Math.PI / 180 % (2 * Math.PI);
    const rText = (0.75 * R + R) / 2;
    const pos = polarToCartesian(cx, cy, rText, midRad);
    const text = document.createElementNS(svg.namespaceURI, 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y);
    text.textContent = q.label;
    svg.appendChild(text);
  }

  return svg;
}

export function polarToCartesian(cx, cy, r, angleRad) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad)
  };
}

export function arcPath(cx, cy, rInner, rOuter, startAngle, endAngle) {
  if (endAngle < startAngle) endAngle += 2 * Math.PI;
  const a1 = polarToCartesian(cx, cy, rOuter, endAngle);
  const a2 = polarToCartesian(cx, cy, rOuter, startAngle);
  const b1 = polarToCartesian(cx, cy, rInner, startAngle);
  const b2 = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;
  return [
    `M ${a1.x} ${a1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 0 ${a2.x} ${a2.y}`,
    `L ${b1.x} ${b1.y}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 1 ${b2.x} ${b2.y}`,
    'Z'
  ].join(' ');
}

export function hitTest(x, y, cx, cy, R) {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI);

  const R_core = 0.5 * R;
  const R_middle_inner = 0.5 * R;
  const R_middle_outer = 0.75 * R;
  const R_outer_inner = 0.75 * R;
  const R_outer = R;

  if (dist <= R_core) return { ring: 'core' };

  if (dist > R_middle_inner && dist <= R_middle_outer) {
    const numSmall = 12;
    const anglePer = 2 * Math.PI / numSmall;
    const index = Math.floor(angle / anglePer);
    const quarter = [0,1,1,1,2,2,2,3,3,3,0,0][index];
    return { ring: 'middle', index, quarter };
  }

  if (dist > R_outer_inner && dist <= R_outer) {
    const anglePerOuter = 2 * Math.PI / 4;
    let quarter = Math.floor(angle / anglePerOuter);
    // Adjust for Q1 crossing if needed, but since angle 0-2pi, fine
    return { ring: 'outer', quarter };
  }

  return null;
}