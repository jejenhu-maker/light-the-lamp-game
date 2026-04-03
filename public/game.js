// ============================================================
// Light the Lamp — Plug in & Light up!
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Responsive sizing ---
let W, H, SCALE;
function resize() {
  W = canvas.width = window.innerWidth * devicePixelRatio;
  H = canvas.height = window.innerHeight * devicePixelRatio;
  SCALE = Math.min(W, H) / 800;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resize);
resize();

// --- Game state ---
let state = 'title'; // title | playing | gameover | levelcomplete
let currentLevel = 0;
let wirePath = [];
let plugPos = { x: 0, y: 0 };
let dragging = false;
let lampGlow = 0;
let failAlpha = 0;
let winAlpha = 0;
let wireSnapPoint = null;
let wireSnapTimer = 0;

// --- Levels ---
// Coordinates are in 0-1 normalized space (mapped to canvas)
// plugStart: starting position of plug
// origin: where the wire comes from (wall outlet origin)
// socket: target socket position
// lamp: lamp position
// knives: array of {x, y, angle, w, h}
const levels = [
  // Level 1: Tutorial — no knives
  {
    plugStart: { x: 0.15, y: 0.7 },
    origin: { x: 0.15, y: 0.7 },
    socket: { x: 0.85, y: 0.3 },
    lamp: { x: 0.85, y: 0.12 },
    knives: []
  },
  // Level 2: One knife in the middle
  {
    plugStart: { x: 0.1, y: 0.8 },
    origin: { x: 0.1, y: 0.8 },
    socket: { x: 0.9, y: 0.2 },
    lamp: { x: 0.9, y: 0.05 },
    knives: [
      { x: 0.5, y: 0.5, angle: 0.3, w: 0.12, h: 0.03 }
    ]
  },
  // Level 3: Two knives blocking diagonal
  {
    plugStart: { x: 0.1, y: 0.85 },
    origin: { x: 0.1, y: 0.85 },
    socket: { x: 0.85, y: 0.15 },
    lamp: { x: 0.85, y: 0.02 },
    knives: [
      { x: 0.35, y: 0.6, angle: -0.4, w: 0.14, h: 0.03 },
      { x: 0.65, y: 0.35, angle: 0.5, w: 0.14, h: 0.03 }
    ]
  },
  // Level 4: Maze-like path
  {
    plugStart: { x: 0.1, y: 0.5 },
    origin: { x: 0.1, y: 0.5 },
    socket: { x: 0.9, y: 0.5 },
    lamp: { x: 0.9, y: 0.35 },
    knives: [
      { x: 0.35, y: 0.25, angle: 1.57, w: 0.4, h: 0.025 },
      { x: 0.65, y: 0.75, angle: 1.57, w: 0.4, h: 0.025 }
    ]
  },
  // Level 5: Three knives in a zigzag
  {
    plugStart: { x: 0.08, y: 0.9 },
    origin: { x: 0.08, y: 0.9 },
    socket: { x: 0.92, y: 0.1 },
    lamp: { x: 0.92, y: 0.02 },
    knives: [
      { x: 0.3, y: 0.7, angle: 0.0, w: 0.18, h: 0.025 },
      { x: 0.55, y: 0.45, angle: 0.8, w: 0.16, h: 0.025 },
      { x: 0.75, y: 0.25, angle: -0.3, w: 0.15, h: 0.025 }
    ]
  },
  // Level 6: Tight corridor
  {
    plugStart: { x: 0.1, y: 0.9 },
    origin: { x: 0.1, y: 0.9 },
    socket: { x: 0.9, y: 0.9 },
    lamp: { x: 0.9, y: 0.75 },
    knives: [
      { x: 0.25, y: 0.65, angle: 1.57, w: 0.35, h: 0.025 },
      { x: 0.5, y: 0.35, angle: 1.57, w: 0.35, h: 0.025 },
      { x: 0.75, y: 0.65, angle: 1.57, w: 0.35, h: 0.025 }
    ]
  },
  // Level 7: Four knives box
  {
    plugStart: { x: 0.08, y: 0.92 },
    origin: { x: 0.08, y: 0.92 },
    socket: { x: 0.5, y: 0.08 },
    lamp: { x: 0.5, y: 0.01 },
    knives: [
      { x: 0.3, y: 0.3, angle: 0, w: 0.15, h: 0.025 },
      { x: 0.7, y: 0.3, angle: 0, w: 0.15, h: 0.025 },
      { x: 0.3, y: 0.65, angle: 0.5, w: 0.18, h: 0.025 },
      { x: 0.7, y: 0.65, angle: -0.5, w: 0.18, h: 0.025 }
    ]
  },
  // Level 8: Gauntlet — 5 knives
  {
    plugStart: { x: 0.05, y: 0.95 },
    origin: { x: 0.05, y: 0.95 },
    socket: { x: 0.95, y: 0.05 },
    lamp: { x: 0.95, y: 0.01 },
    knives: [
      { x: 0.2, y: 0.78, angle: 0.3, w: 0.16, h: 0.025 },
      { x: 0.38, y: 0.58, angle: -0.4, w: 0.18, h: 0.025 },
      { x: 0.55, y: 0.42, angle: 0.6, w: 0.14, h: 0.025 },
      { x: 0.72, y: 0.28, angle: -0.2, w: 0.17, h: 0.025 },
      { x: 0.85, y: 0.15, angle: 0.7, w: 0.13, h: 0.025 }
    ]
  },
  // Level 9: Spiral approach
  {
    plugStart: { x: 0.5, y: 0.92 },
    origin: { x: 0.5, y: 0.92 },
    socket: { x: 0.5, y: 0.08 },
    lamp: { x: 0.5, y: 0.01 },
    knives: [
      { x: 0.25, y: 0.75, angle: 0, w: 0.3, h: 0.02 },
      { x: 0.75, y: 0.55, angle: 0, w: 0.3, h: 0.02 },
      { x: 0.25, y: 0.35, angle: 0, w: 0.3, h: 0.02 },
      { x: 0.75, y: 0.2, angle: 0, w: 0.2, h: 0.02 }
    ]
  },
  // Level 10: Final boss
  {
    plugStart: { x: 0.05, y: 0.5 },
    origin: { x: 0.05, y: 0.5 },
    socket: { x: 0.95, y: 0.5 },
    lamp: { x: 0.95, y: 0.35 },
    knives: [
      { x: 0.2, y: 0.3, angle: 1.2, w: 0.18, h: 0.025 },
      { x: 0.2, y: 0.7, angle: -1.2, w: 0.18, h: 0.025 },
      { x: 0.5, y: 0.2, angle: 0.4, w: 0.2, h: 0.025 },
      { x: 0.5, y: 0.8, angle: -0.4, w: 0.2, h: 0.025 },
      { x: 0.75, y: 0.4, angle: 0.8, w: 0.15, h: 0.025 },
      { x: 0.75, y: 0.6, angle: -0.8, w: 0.15, h: 0.025 }
    ]
  }
];

// --- Helpers ---
function nx(v) { return v * W; }
function ny(v) { return v * H; }
function s(v) { return v * SCALE; }

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Line segment vs rotated rectangle collision
function lineSegIntersectsKnife(p1, p2, knife) {
  const cx = nx(knife.x), cy = ny(knife.y);
  const hw = nx(knife.w) / 2, hh = ny(knife.h) / 2 + s(8); // add padding for blade
  const cos = Math.cos(-knife.angle), sin = Math.sin(-knife.angle);

  // Transform points into knife's local space
  function toLocal(p) {
    const dx = p.x - cx, dy = p.y - cy;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  }

  const a = toLocal(p1), b = toLocal(p2);

  // Check line segment vs AABB in local space
  return lineSegIntersectsAABB(a, b, -hw, -hh, hw, hh);
}

function lineSegIntersectsAABB(p1, p2, minX, minY, maxX, maxY) {
  // Cohen-Sutherland style clipping test
  function code(p) {
    let c = 0;
    if (p.x < minX) c |= 1;
    else if (p.x > maxX) c |= 2;
    if (p.y < minY) c |= 4;
    else if (p.y > maxY) c |= 8;
    return c;
  }

  let c1 = code(p1), c2 = code(p2);
  if ((c1 & c2) !== 0) return false;
  if ((c1 | c2) === 0) return true;

  // Parametric line intersection with each edge
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const edges = [
    { nx: -1, ny: 0, d: minX }, { nx: 1, ny: 0, d: -maxX },
    { nx: 0, ny: -1, d: minY }, { nx: 0, ny: 1, d: -maxY }
  ];

  let tMin = 0, tMax = 1;
  for (const e of edges) {
    const denom = e.nx * dx + e.ny * dy;
    const num = -(e.nx * p1.x + e.ny * p1.y + e.d);
    if (Math.abs(denom) < 1e-10) {
      if (num < 0) return false;
    } else {
      const t = num / denom;
      if (denom < 0) { if (t > tMin) tMin = t; }
      else { if (t < tMax) tMax = t; }
    }
  }
  return tMin <= tMax;
}

// Check entire wire path against all knives
function checkWireKnifeCollision() {
  const level = levels[currentLevel];
  if (wirePath.length < 2) return null;
  for (let i = 0; i < wirePath.length - 1; i++) {
    for (const knife of level.knives) {
      if (lineSegIntersectsKnife(wirePath[i], wirePath[i + 1], knife)) {
        return { segIndex: i, knife };
      }
    }
  }
  return null;
}

// --- Init level ---
function initLevel() {
  const level = levels[currentLevel];
  plugPos = { x: nx(level.plugStart.x), y: ny(level.plugStart.y) };
  wirePath = [{ x: plugPos.x, y: plugPos.y }];
  dragging = false;
  lampGlow = 0;
  failAlpha = 0;
  winAlpha = 0;
  wireSnapPoint = null;
  wireSnapTimer = 0;
  state = 'playing';
}

// --- Drawing functions ---

function drawBackground() {
  // Dark room gradient
  const grad = ctx.createRadialGradient(W / 2, H / 3, s(50), W / 2, H / 2, Math.max(W, H));
  grad.addColorStop(0, '#2a2a4a');
  grad.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Floor line
  ctx.strokeStyle = '#333355';
  ctx.lineWidth = s(2);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.92);
  ctx.lineTo(W, H * 0.92);
  ctx.stroke();
}

function drawWire() {
  if (wirePath.length < 2) return;

  // Wire shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = s(10);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x + s(3), wirePath[0].y + s(3));
  for (let i = 1; i < wirePath.length; i++) {
    ctx.lineTo(wirePath[i].x + s(3), wirePath[i].y + s(3));
  }
  ctx.stroke();

  // Wire main
  ctx.strokeStyle = '#2d2d2d';
  ctx.lineWidth = s(7);
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x, wirePath[0].y);
  for (let i = 1; i < wirePath.length; i++) {
    ctx.lineTo(wirePath[i].x, wirePath[i].y);
  }
  ctx.stroke();

  // Wire highlight
  ctx.strokeStyle = 'rgba(80,80,80,0.4)';
  ctx.lineWidth = s(3);
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x - s(1), wirePath[0].y - s(2));
  for (let i = 1; i < wirePath.length; i++) {
    ctx.lineTo(wirePath[i].x - s(1), wirePath[i].y - s(2));
  }
  ctx.stroke();
}

function drawSnappedWire() {
  if (!wireSnapPoint || wirePath.length < 2) return;
  const idx = wireSnapPoint.segIndex;

  // Draw wire up to snap point
  ctx.strokeStyle = '#2d2d2d';
  ctx.lineWidth = s(7);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x, wirePath[0].y);
  for (let i = 1; i <= Math.min(idx + 1, wirePath.length - 1); i++) {
    ctx.lineTo(wirePath[i].x, wirePath[i].y);
  }
  ctx.stroke();

  // Spark at snap point
  const sp = wirePath[Math.min(idx + 1, wirePath.length - 1)];
  const sparkSize = s(15) * (1 + Math.sin(wireSnapTimer * 15) * 0.5);
  ctx.fillStyle = `rgba(255, 200, 50, ${0.8 - wireSnapTimer * 0.8})`;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, sparkSize, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlug(x, y) {
  const ps = s(18);

  // Plug body
  ctx.fillStyle = '#555';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = s(2);

  // Rounded rectangle plug body
  const bw = ps * 1.8, bh = ps * 2.4;
  ctx.beginPath();
  roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, s(4));
  ctx.fill();
  ctx.stroke();

  // Prongs
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(x - ps * 0.5, y - bh / 2 - ps * 0.6, ps * 0.25, ps * 0.7);
  ctx.fillRect(x + ps * 0.25, y - bh / 2 - ps * 0.6, ps * 0.25, ps * 0.7);

  // Grip lines
  ctx.strokeStyle = '#444';
  ctx.lineWidth = s(1.5);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x - ps * 0.5, y + i * ps * 0.25);
    ctx.lineTo(x + ps * 0.5, y + i * ps * 0.25);
    ctx.stroke();
  }
}

function drawSocket(sx, sy) {
  const ss = s(30);

  // Wall plate
  ctx.fillStyle = '#e8e0d0';
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = s(2);
  ctx.beginPath();
  roundRect(ctx, sx - ss, sy - ss * 1.2, ss * 2, ss * 2.4, s(6));
  ctx.fill();
  ctx.stroke();

  // Socket holes
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(sx - ss * 0.3, sy - ss * 0.15, s(5), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx + ss * 0.3, sy - ss * 0.15, s(5), 0, Math.PI * 2);
  ctx.fill();

  // Ground hole (bottom)
  ctx.beginPath();
  roundRect(ctx, sx - s(4), sy + ss * 0.2, s(8), s(12), s(2));
  ctx.fill();

  // Screws
  ctx.fillStyle = '#999';
  ctx.beginPath();
  ctx.arc(sx, sy - ss * 0.85, s(4), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx, sy + ss * 0.85, s(4), 0, Math.PI * 2);
  ctx.fill();
}

function drawLamp(lx, ly, glowAmount) {
  const ls = s(35);

  // Lamp shade (trapezoid)
  ctx.fillStyle = '#8B7355';
  ctx.strokeStyle = '#6B5335';
  ctx.lineWidth = s(2);
  ctx.beginPath();
  ctx.moveTo(lx - ls * 0.3, ly);
  ctx.lineTo(lx + ls * 0.3, ly);
  ctx.lineTo(lx + ls * 0.8, ly + ls * 1.2);
  ctx.lineTo(lx - ls * 0.8, ly + ls * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bulb
  if (glowAmount > 0) {
    // Glow effect
    const glowRad = ls * 2 * glowAmount;
    const glow = ctx.createRadialGradient(lx, ly + ls * 0.6, s(5), lx, ly + ls * 0.6, glowRad);
    glow.addColorStop(0, `rgba(255, 230, 120, ${0.6 * glowAmount})`);
    glow.addColorStop(0.5, `rgba(255, 200, 50, ${0.2 * glowAmount})`);
    glow.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - glowRad, ly + ls * 0.6 - glowRad, glowRad * 2, glowRad * 2);

    // Lit bulb
    ctx.fillStyle = `rgba(255, 240, 150, ${glowAmount})`;
    ctx.beginPath();
    ctx.arc(lx, ly + ls * 0.6, ls * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Unlit bulb
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(lx, ly + ls * 0.6, ls * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lamp post
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(lx - s(4), ly + ls * 1.2, s(8), ls * 0.8);

  // Base
  ctx.fillStyle = '#4a3a2a';
  ctx.beginPath();
  roundRect(ctx, lx - ls * 0.5, ly + ls * 2, ls, ls * 0.25, s(3));
  ctx.fill();
}

function drawKnife(knife) {
  const cx = nx(knife.x), cy = ny(knife.y);
  const kw = nx(knife.w), kh = Math.max(ny(knife.h), s(20));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(knife.angle);

  // Blade
  const bladeW = kw * 0.7;
  const bladeH = kh;
  ctx.fillStyle = '#d0d0d8';
  ctx.strokeStyle = '#a0a0a8';
  ctx.lineWidth = s(1.5);
  ctx.beginPath();
  ctx.moveTo(-bladeW / 2, -bladeH);
  ctx.lineTo(bladeW / 2, -bladeH);
  ctx.lineTo(bladeW / 2 + s(3), 0);
  ctx.lineTo(bladeW / 2, bladeH);
  ctx.lineTo(-bladeW / 2, bladeH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Blade shine
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.moveTo(-bladeW / 2 + s(3), -bladeH + s(2));
  ctx.lineTo(-bladeW / 2 + s(8), -bladeH + s(2));
  ctx.lineTo(-bladeW / 2 + s(8), bladeH - s(2));
  ctx.lineTo(-bladeW / 2 + s(3), bladeH - s(2));
  ctx.closePath();
  ctx.fill();

  // Handle
  const handleW = kw * 0.35;
  ctx.fillStyle = '#c0392b';
  ctx.strokeStyle = '#962d22';
  ctx.lineWidth = s(1.5);
  ctx.beginPath();
  roundRect(ctx, -bladeW / 2 - handleW, -bladeH * 0.7, handleW, bladeH * 1.4, s(3));
  ctx.fill();
  ctx.stroke();

  // Handle rivets
  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.arc(-bladeW / 2 - handleW / 2, -bladeH * 0.25, s(3), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-bladeW / 2 - handleW / 2, bladeH * 0.25, s(3), 0, Math.PI * 2);
  ctx.fill();

  // Danger zone indicator (subtle red glow)
  ctx.shadowColor = 'rgba(255, 50, 50, 0.3)';
  ctx.shadowBlur = s(15);
  ctx.strokeStyle = 'rgba(255, 50, 50, 0.15)';
  ctx.lineWidth = s(2);
  ctx.strokeRect(-bladeW / 2 - handleW - s(4), -bladeH - s(4), bladeW + handleW + s(8), bladeH * 2 + s(8));
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawLevelIndicator() {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `bold ${s(22)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`Level ${currentLevel + 1}`, W / 2, s(40));
}

function drawTitleScreen() {
  drawBackground();

  // Title
  ctx.fillStyle = '#ffe066';
  ctx.font = `bold ${s(60)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💡', W / 2, H * 0.25);
  ctx.fillText('Light the Lamp', W / 2, H * 0.35);

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `${s(24)}px sans-serif`;
  ctx.fillText('Plug in & Light up!', W / 2, H * 0.44);

  // Play button
  const bw = s(220), bh = s(70);
  const bx = W / 2 - bw / 2, by = H * 0.58;

  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  roundRect(ctx, bx, by, bw, bh, s(15));
  ctx.fill();

  ctx.fillStyle = '#1a1a2e';
  ctx.font = `bold ${s(32)}px sans-serif`;
  ctx.fillText('PLAY', W / 2, by + bh / 2);

  // Store button bounds for click detection
  drawTitleScreen._btn = { x: bx, y: by, w: bw, h: bh };
}

function drawGameOverScreen() {
  // Overlay
  ctx.fillStyle = `rgba(180, 30, 30, ${failAlpha * 0.5})`;
  ctx.fillRect(0, 0, W, H);

  if (failAlpha >= 0.8) {
    ctx.fillStyle = '#ff6666';
    ctx.font = `bold ${s(52)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ Oops! Wire Cut!', W / 2, H * 0.4);

    // Retry button
    const bw = s(220), bh = s(70);
    const bx = W / 2 - bw / 2, by = H * 0.55;

    ctx.fillStyle = '#ff6666';
    ctx.beginPath();
    roundRect(ctx, bx, by, bw, bh, s(15));
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${s(30)}px sans-serif`;
    ctx.fillText('TRY AGAIN', W / 2, by + bh / 2);

    drawGameOverScreen._btn = { x: bx, y: by, w: bw, h: bh };
  }
}

function drawLevelCompleteScreen() {
  ctx.fillStyle = `rgba(50, 180, 50, ${winAlpha * 0.3})`;
  ctx.fillRect(0, 0, W, H);

  if (winAlpha >= 0.5) {
    ctx.fillStyle = '#ffe066';
    ctx.font = `bold ${s(56)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉 You did it!', W / 2, H * 0.45);

    if (currentLevel >= levels.length - 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${s(28)}px sans-serif`;
      ctx.fillText('You beat all levels! 🏆', W / 2, H * 0.55);
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// --- Touch / Mouse input ---
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: (touch.clientX - rect.left) * devicePixelRatio,
    y: (touch.clientY - rect.top) * devicePixelRatio
  };
}

function onStart(e) {
  e.preventDefault();
  const pos = getPos(e);

  if (state === 'title') {
    const btn = drawTitleScreen._btn;
    if (btn && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
      currentLevel = 0;
      initLevel();
    }
    return;
  }

  if (state === 'gameover') {
    const btn = drawGameOverScreen._btn;
    if (btn && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
      initLevel();
    }
    return;
  }

  if (state === 'playing') {
    // Check if touching near plug
    if (dist(pos, plugPos) < s(50)) {
      dragging = true;
    }
  }
}

function onMove(e) {
  e.preventDefault();
  if (!dragging || state !== 'playing') return;

  const pos = getPos(e);
  plugPos.x = pos.x;
  plugPos.y = pos.y;

  // Add point to wire path (throttle to avoid too many points)
  const last = wirePath[wirePath.length - 1];
  if (dist(last, pos) > s(5)) {
    wirePath.push({ x: pos.x, y: pos.y });
  }

  // Check knife collision
  const hit = checkWireKnifeCollision();
  if (hit) {
    state = 'gameover';
    wireSnapPoint = hit;
    dragging = false;
    return;
  }

  // Check socket collision
  const level = levels[currentLevel];
  const socketPos = { x: nx(level.socket.x), y: ny(level.socket.y) };
  if (dist(pos, socketPos) < s(35)) {
    state = 'levelcomplete';
    dragging = false;
  }
}

function onEnd(e) {
  e.preventDefault();
  dragging = false;
}

canvas.addEventListener('touchstart', onStart, { passive: false });
canvas.addEventListener('touchmove', onMove, { passive: false });
canvas.addEventListener('touchend', onEnd, { passive: false });
canvas.addEventListener('mousedown', onStart);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onEnd);

// --- Main game loop ---
let lastTime = 0;
function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  resize();
  drawBackground();

  if (state === 'title') {
    drawTitleScreen();
  } else if (state === 'playing') {
    const level = levels[currentLevel];

    // Draw elements
    drawLamp(nx(level.lamp.x), ny(level.lamp.y), lampGlow);
    drawSocket(nx(level.socket.x), ny(level.socket.y));
    level.knives.forEach(drawKnife);
    drawWire();
    drawPlug(plugPos.x, plugPos.y);
    drawLevelIndicator();

    // Hint: pulsing circle around plug if not dragging
    if (!dragging) {
      const pulse = 0.5 + Math.sin(time * 0.005) * 0.3;
      ctx.strokeStyle = `rgba(255, 224, 100, ${pulse})`;
      ctx.lineWidth = s(2);
      ctx.beginPath();
      ctx.arc(plugPos.x, plugPos.y, s(30) + Math.sin(time * 0.003) * s(5), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (state === 'gameover') {
    const level = levels[currentLevel];

    // Draw static scene
    drawLamp(nx(level.lamp.x), ny(level.lamp.y), 0);
    drawSocket(nx(level.socket.x), ny(level.socket.y));
    level.knives.forEach(drawKnife);
    drawSnappedWire();
    drawLevelIndicator();

    // Animate fail overlay
    failAlpha = Math.min(failAlpha + dt * 2, 1);
    wireSnapTimer = Math.min(wireSnapTimer + dt, 1);
    drawGameOverScreen();
  } else if (state === 'levelcomplete') {
    const level = levels[currentLevel];

    // Animate lamp glow
    lampGlow = Math.min(lampGlow + dt * 2, 1);
    winAlpha = Math.min(winAlpha + dt * 1.5, 1);

    drawLamp(nx(level.lamp.x), ny(level.lamp.y), lampGlow);
    drawSocket(nx(level.socket.x), ny(level.socket.y));
    level.knives.forEach(drawKnife);
    drawWire();
    drawPlug(nx(level.socket.x), ny(level.socket.y)); // Plug snaps to socket
    drawLevelIndicator();
    drawLevelCompleteScreen();

    // Auto advance
    if (winAlpha >= 1) {
      setTimeout(() => {
        if (currentLevel < levels.length - 1) {
          currentLevel++;
          initLevel();
        } else {
          state = 'title';
        }
      }, 1200);
      winAlpha = 0.999; // Prevent re-triggering
    }
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
