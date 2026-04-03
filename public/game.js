// ============================================================
// Light the Lamp v0.4 — Plug in & Light up!
// HuFamilyGame — Created by Kai and Ray
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

const VERSION = 'v0.4';

// ============ GAME STATES ============
// title → tutorial → playing → levelcomplete → map → playing → ... → allclear → title
let state = 'title';
let currentLevel = 0;
let wirePath = [];
let plugPos = { x: 0, y: 0 };
let dragging = false;
let lampGlow = 0;
let failAlpha = 0;
let winAlpha = 0;
let wireSnapPoint = null;
let wireSnapTimer = 0;
let levelAdvancing = false;
let gameTime = 0;
let failReason = '';
let stateTimer = 0; // generic timer for animations

// Dynamic entities
let bombs = [];
let birds = [];
let movingKnives = [];
let pools = [];
let explosions = [];

// Map state
let mapProgress = 0; // 0-1 animation for moving dot on map
let mapFrom = 0;
let mapTo = 0;

// Tutorial state
let tutorialStep = 0;
let tutorialTimer = 0;

// ============ HELPERS ============
function nx(v) { return v * W; }
function ny(v) { return v * H; }
function s(v) { return v * SCALE; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function getLampPos(level) {
  return { x: level.socket.x, y: Math.max(0.08, level.socket.y - 0.12) };
}
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

// ============ PLAY AREA BOUNDARY ============
const BOUNDARY = 0.04; // 4% margin = walls

// ============ LEVELS (5 levels) ============
const levels = [
  // L1: Easy — one knife + one pool
  {
    name: 'The Garden',
    plugStart: { x: 0.1, y: 0.75 },
    socket: { x: 0.9, y: 0.3 },
    knives: [{ x: 0.5, y: 0.52, angle: 0.35, w: 0.22, h: 0.03 }],
    movingKnives: [], bombs: [], birds: [],
    pools: [{ nx: 0.5, ny: 0.72, r: 0.05 }]
  },
  // L2: Moving knife + pool
  {
    name: 'The Bridge',
    plugStart: { x: 0.1, y: 0.8 },
    socket: { x: 0.9, y: 0.2 },
    knives: [{ x: 0.5, y: 0.38, angle: 0, w: 0.26, h: 0.03 }],
    movingKnives: [
      { x: 0.3, y: 0.62, angle: 0, w: 0.16, h: 0.025, vx: 0.14, vy: 0, minX: 0.15, maxX: 0.7, minY: 0.62, maxY: 0.62 }
    ],
    bombs: [], birds: [],
    pools: [{ nx: 0.7, ny: 0.7, r: 0.05 }]
  },
  // L3: Rolling bomb + knives + pool
  {
    name: 'The Cave',
    plugStart: { x: 0.08, y: 0.85 },
    socket: { x: 0.92, y: 0.18 },
    knives: [
      { x: 0.35, y: 0.52, angle: 0.45, w: 0.2, h: 0.025 },
      { x: 0.7, y: 0.42, angle: -0.4, w: 0.2, h: 0.025 }
    ],
    movingKnives: [],
    bombs: [{ nx: 0.5, ny: 0.68, radius: 0.12, vx: 0.07, vy: 0.04, triggerDist: 0.14 }],
    birds: [],
    pools: [{ nx: 0.2, ny: 0.6, r: 0.045 }]
  },
  // L4: Bird + moving knife + bomb
  {
    name: 'The Forest',
    plugStart: { x: 0.08, y: 0.88 },
    socket: { x: 0.92, y: 0.15 },
    knives: [
      { x: 0.45, y: 0.5, angle: 0.3, w: 0.22, h: 0.025 },
      { x: 0.7, y: 0.6, angle: -0.35, w: 0.18, h: 0.025 }
    ],
    movingKnives: [
      { x: 0.25, y: 0.35, angle: 0, w: 0.14, h: 0.02, vx: 0, vy: 0.12, minX: 0.25, maxX: 0.25, minY: 0.25, maxY: 0.65 }
    ],
    bombs: [{ nx: 0.6, ny: 0.3, radius: 0.1, vx: -0.05, vy: 0.05, triggerDist: 0.13 }],
    birds: [{ nx: 0.5, ny: 0.75, speed: 0.06 }],
    pools: [{ nx: 0.8, ny: 0.75, r: 0.05 }]
  },
  // L5: FINAL BOSS — everything, max chaos
  {
    name: 'The Castle',
    plugStart: { x: 0.06, y: 0.92 },
    socket: { x: 0.94, y: 0.1 },
    knives: [
      { x: 0.3, y: 0.55, angle: 0.5, w: 0.2, h: 0.025 },
      { x: 0.6, y: 0.4, angle: -0.35, w: 0.22, h: 0.025 },
      { x: 0.8, y: 0.25, angle: 0.6, w: 0.16, h: 0.025 }
    ],
    movingKnives: [
      { x: 0.15, y: 0.38, angle: 0.3, w: 0.14, h: 0.02, vx: 0.16, vy: 0, minX: 0.1, maxX: 0.5, minY: 0.38, maxY: 0.38 },
      { x: 0.55, y: 0.7, angle: -0.2, w: 0.12, h: 0.02, vx: 0, vy: -0.13, minX: 0.55, maxX: 0.55, minY: 0.4, maxY: 0.8 }
    ],
    bombs: [
      { nx: 0.35, ny: 0.78, radius: 0.1, vx: 0.06, vy: -0.04, triggerDist: 0.12 },
      { nx: 0.75, ny: 0.5, radius: 0.11, vx: -0.05, vy: 0.06, triggerDist: 0.12 }
    ],
    birds: [
      { nx: 0.4, ny: 0.85, speed: 0.08 },
      { nx: 0.8, ny: 0.35, speed: 0.07 }
    ],
    pools: [
      { nx: 0.45, ny: 0.68, r: 0.045 },
      { nx: 0.85, ny: 0.65, r: 0.04 }
    ]
  }
];

// Map node positions (normalized)
const mapNodes = [
  { x: 0.12, y: 0.82, icon: '🌿' },  // L1 The Garden
  { x: 0.3,  y: 0.62, icon: '🌉' },   // L2 The Bridge
  { x: 0.5,  y: 0.48, icon: '🕳️' },  // L3 The Cave
  { x: 0.7,  y: 0.35, icon: '🌲' },   // L4 The Forest
  { x: 0.88, y: 0.18, icon: '🏰' }    // L5 The Castle
];

// ============ COLLISION ============

function lineSegIntersectsRect(p1, p2, cx, cy, hw, hh, angle) {
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  function toLocal(p) {
    const dx = p.x - cx, dy = p.y - cy;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  }
  return lineSegIntersectsAABB(toLocal(p1), toLocal(p2), -hw, -hh, hw, hh);
}

function lineSegIntersectsAABB(p1, p2, minX, minY, maxX, maxY) {
  function code(p) {
    let c = 0;
    if (p.x < minX) c |= 1; else if (p.x > maxX) c |= 2;
    if (p.y < minY) c |= 4; else if (p.y > maxY) c |= 8;
    return c;
  }
  let c1 = code(p1), c2 = code(p2);
  if ((c1 & c2) !== 0) return false;
  if ((c1 | c2) === 0) return true;
  const ddx = p2.x - p1.x, ddy = p2.y - p1.y;
  const edges = [
    { enx: -1, eny: 0, d: minX }, { enx: 1, eny: 0, d: -maxX },
    { enx: 0, eny: -1, d: minY }, { enx: 0, eny: 1, d: -maxY }
  ];
  let tMin = 0, tMax = 1;
  for (const e of edges) {
    const denom = e.enx * ddx + e.eny * ddy;
    const num = -(e.enx * p1.x + e.eny * p1.y + e.d);
    if (Math.abs(denom) < 1e-10) { if (num < 0) return false; }
    else { const t = num / denom; if (denom < 0) { if (t > tMin) tMin = t; } else { if (t < tMax) tMax = t; } }
  }
  return tMin <= tMax;
}

function checkKnifeCollision(p1, p2, knife) {
  const cx = nx(knife.x), cy = ny(knife.y);
  const hw = nx(knife.w) / 2, hh = Math.max(ny(knife.h), s(10)) / 2 + s(6);
  return lineSegIntersectsRect(p1, p2, cx, cy, hw, hh, knife.angle);
}

function pointInCircle(px, py, cx, cy, r) { return Math.hypot(px - cx, py - cy) < r; }

function segmentIntersectsCircle(p1, p2, cx, cy, r) {
  if (pointInCircle(p1.x, p1.y, cx, cy, r) || pointInCircle(p2.x, p2.y, cx, cy, r)) return true;
  const dx = p2.x - p1.x, dy = p2.y - p1.y, len2 = dx * dx + dy * dy;
  if (len2 === 0) return false;
  let t = Math.max(0, Math.min(1, ((cx - p1.x) * dx + (cy - p1.y) * dy) / len2));
  return Math.hypot(p1.x + t * dx - cx, p1.y + t * dy - cy) < r;
}

function segmentsIntersect(a1, a2, b1, b2) {
  function cross(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
  const d1 = cross(b1, b2, a1), d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1), d4 = cross(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function checkPlugSelfCollision() {
  if (wirePath.length < 10) return -1;
  const plugR = s(20);
  for (let i = 0; i < wirePath.length - 8; i++) {
    if (pointInCircle(plugPos.x, plugPos.y, wirePath[i].x, wirePath[i].y, plugR)) return i;
  }
  return -1;
}

function checkWireCrossing() {
  if (wirePath.length < 8) return -1;
  const last = wirePath.length - 1;
  const p1 = wirePath[last - 1], p2 = wirePath[last];
  for (let i = 0; i < last - 5; i++) {
    if (segmentsIntersect(p1, p2, wirePath[i], wirePath[i + 1])) return i;
  }
  return -1;
}

function checkAllKnifeCollisions() {
  if (wirePath.length < 2) return null;
  const level = levels[currentLevel];
  for (let i = 0; i < wirePath.length - 1; i++) {
    const p1 = wirePath[i], p2 = wirePath[i + 1];
    for (const k of level.knives) { if (checkKnifeCollision(p1, p2, k)) return { segIndex: i, reason: 'knife' }; }
    for (const mk of movingKnives) { if (checkKnifeCollision(p1, p2, mk)) return { segIndex: i, reason: 'knife' }; }
  }
  return null;
}

function checkPoolCollisions() {
  if (wirePath.length < 2) return null;
  for (let i = 0; i < wirePath.length - 1; i++) {
    for (const pool of pools) {
      if (segmentIntersectsCircle(wirePath[i], wirePath[i + 1], pool.x, pool.y, pool.r)) return { segIndex: i, reason: 'pool' };
    }
  }
  return null;
}

function checkBombProximityOne(bomb) {
  const trigR = nx(bomb.triggerDist);
  for (let i = 0; i < wirePath.length; i++) {
    if (Math.hypot(wirePath[i].x - bomb.x, wirePath[i].y - bomb.y) < trigR) return true;
  }
  return false;
}

function checkExplosionWire(ex, ey, radius) {
  for (let i = 0; i < wirePath.length; i++) {
    if (Math.hypot(wirePath[i].x - ex, wirePath[i].y - ey) < radius) return i;
  }
  return -1;
}

function checkBirdBite(bird) {
  if (wirePath.length < 2) return -1;
  const biteRange = s(25);
  for (let i = 0; i < wirePath.length; i++) {
    if (Math.hypot(wirePath[i].x - bird.x, wirePath[i].y - bird.y) < biteRange) return i;
  }
  return -1;
}

// ============ INIT LEVEL ============

function initLevel() {
  const level = levels[currentLevel];
  plugPos = { x: nx(level.plugStart.x), y: ny(level.plugStart.y) };
  wirePath = [{ x: plugPos.x, y: plugPos.y }];
  dragging = false;
  lampGlow = 0; failAlpha = 0; winAlpha = 0;
  wireSnapPoint = null; wireSnapTimer = 0;
  levelAdvancing = false; gameTime = 0; failReason = '';
  explosions = [];

  bombs = (level.bombs || []).map(b => ({
    x: nx(b.nx), y: ny(b.ny), vx: b.vx || 0, vy: b.vy || 0,
    radius: b.radius, triggerDist: b.triggerDist || 0.15,
    exploded: false, triggered: false, fuseLeft: 1.5
  }));

  birds = (level.birds || []).map(b => {
    const angle = Math.random() * Math.PI * 2;
    return { x: nx(b.nx), y: ny(b.ny), vx: Math.cos(angle) * b.speed, vy: Math.sin(angle) * b.speed,
      speed: b.speed, frame: 0, biteTimer: 0, biting: false };
  });

  movingKnives = (level.movingKnives || []).map(mk => ({ ...mk }));
  pools = (level.pools || []).map(p => ({ x: nx(p.nx), y: ny(p.ny), r: nx(p.r) }));

  state = 'playing';
}

// ============ DRAWING ============

function drawBackground() {
  // Cartoon gradient sky
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a1a3e');
  grad.addColorStop(0.5, '#2a2a5a');
  grad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  for (let i = 0; i < 30; i++) {
    const sx = ((i * 137.5) % 1) * W;
    const sy = ((i * 73.7) % 0.5) * H;
    const sr = s(1.5) + Math.sin(gameTime * 2 + i) * s(0.5);
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  }
}

// Cartoon-style boundary walls
function drawBoundary() {
  const bw = nx(BOUNDARY);
  const bh = ny(BOUNDARY);
  // Brick pattern walls
  ctx.fillStyle = '#5a3a2a';
  ctx.fillRect(0, 0, bw, H); // left
  ctx.fillRect(W - bw, 0, bw, H); // right
  ctx.fillRect(0, 0, W, bh); // top
  ctx.fillRect(0, H - bh, W, bh); // bottom

  // Brick lines
  ctx.strokeStyle = '#7a5a4a';
  ctx.lineWidth = s(1);
  const brickH = s(12), brickW = s(24);
  // Left wall bricks
  for (let y = 0; y < H; y += brickH) {
    const offset = (Math.floor(y / brickH) % 2) * brickW / 2;
    for (let x = 0; x < bw; x += brickW) {
      ctx.strokeRect(x + offset, y, brickW, brickH);
    }
  }
  // Right wall bricks
  for (let y = 0; y < H; y += brickH) {
    const offset = (Math.floor(y / brickH) % 2) * brickW / 2;
    for (let x = W - bw; x < W; x += brickW) {
      ctx.strokeRect(x + offset, y, brickW, brickH);
    }
  }
  // Top + bottom simplified
  for (let x = 0; x < W; x += brickW) {
    ctx.strokeRect(x, 0, brickW, bh);
    ctx.strokeRect(x + brickW / 2, H - bh, brickW, bh);
  }

  // Danger markings
  ctx.fillStyle = 'rgba(255,200,0,0.15)';
  ctx.fillRect(bw, bh, s(3), H - bh * 2);
  ctx.fillRect(W - bw - s(3), bh, s(3), H - bh * 2);
  ctx.fillRect(bw, bh, W - bw * 2, s(3));
  ctx.fillRect(bw, H - bh - s(3), W - bw * 2, s(3));
}

function drawWire() {
  if (wirePath.length < 2) return;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = s(10); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x + s(3), wirePath[0].y + s(3));
  for (let i = 1; i < wirePath.length; i++) ctx.lineTo(wirePath[i].x + s(3), wirePath[i].y + s(3));
  ctx.stroke();
  // Main
  ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = s(7);
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x, wirePath[0].y);
  for (let i = 1; i < wirePath.length; i++) ctx.lineTo(wirePath[i].x, wirePath[i].y);
  ctx.stroke();
  // Highlight
  ctx.strokeStyle = 'rgba(120,120,120,0.4)'; ctx.lineWidth = s(2.5);
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x - s(1), wirePath[0].y - s(2));
  for (let i = 1; i < wirePath.length; i++) ctx.lineTo(wirePath[i].x - s(1), wirePath[i].y - s(2));
  ctx.stroke();
}

function drawSnappedWire() {
  if (!wireSnapPoint || wirePath.length < 2) return;
  const idx = wireSnapPoint.segIndex;
  ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = s(7); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x, wirePath[0].y);
  for (let i = 1; i <= Math.min(idx + 1, wirePath.length - 1); i++) ctx.lineTo(wirePath[i].x, wirePath[i].y);
  ctx.stroke();
  const sp = wirePath[Math.min(idx + 1, wirePath.length - 1)];
  const sparkSize = s(15) * (1 + Math.sin(wireSnapTimer * 15) * 0.5);
  ctx.fillStyle = `rgba(255,200,50,${0.8 - wireSnapTimer * 0.8})`;
  ctx.beginPath(); ctx.arc(sp.x, sp.y, sparkSize, 0, Math.PI * 2); ctx.fill();
}

function drawPlug(x, y) {
  const ps = s(18);
  // Cartoon shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x + s(3), y + ps * 1.4, ps * 0.9, ps * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  // Body
  ctx.fillStyle = '#666'; ctx.strokeStyle = '#444'; ctx.lineWidth = s(2.5);
  const bw = ps * 1.8, bh = ps * 2.4;
  ctx.beginPath(); roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, s(5)); ctx.fill(); ctx.stroke();
  // Prongs
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(x - ps * 0.5, y - bh / 2 - ps * 0.6, ps * 0.25, ps * 0.7);
  ctx.fillRect(x + ps * 0.25, y - bh / 2 - ps * 0.6, ps * 0.25, ps * 0.7);
  // Cute face on plug
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x - ps * 0.25, y - ps * 0.1, s(3), 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + ps * 0.25, y - ps * 0.1, s(3), 0, Math.PI * 2); ctx.fill();
  // Smile
  ctx.strokeStyle = '#222'; ctx.lineWidth = s(1.5);
  ctx.beginPath(); ctx.arc(x, y + ps * 0.15, ps * 0.25, 0.1, Math.PI - 0.1); ctx.stroke();
}

function drawSocket(sx, sy) {
  const ss = s(32);
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(sx + s(3), sy + ss * 1.5, ss * 0.8, ss * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  // Plate
  ctx.fillStyle = '#f0e8d8'; ctx.strokeStyle = '#c0b0a0'; ctx.lineWidth = s(2.5);
  ctx.beginPath(); roundRect(ctx, sx - ss, sy - ss * 1.2, ss * 2, ss * 2.4, s(8)); ctx.fill(); ctx.stroke();
  // Holes (eyes!)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(sx - ss * 0.3, sy - ss * 0.1, s(6), 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + ss * 0.3, sy - ss * 0.1, s(6), 0, Math.PI * 2); ctx.fill();
  // Surprised mouth
  ctx.beginPath(); ctx.arc(sx, sy + ss * 0.4, s(8), 0, Math.PI * 2); ctx.fill();
}

function drawLamp(lx, ly, glowAmount) {
  const ls = s(38);
  if (glowAmount > 0) {
    // Big background glow
    const bgGlow = ctx.createRadialGradient(lx, ly + ls * 0.5, 0, lx, ly + ls * 0.5, ls * 4 * glowAmount);
    bgGlow.addColorStop(0, `rgba(255,230,120,${0.15 * glowAmount})`);
    bgGlow.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, W, H);
  }
  // Shade (cartoon trapezoid)
  ctx.fillStyle = glowAmount > 0 ? '#c49b50' : '#8B7355';
  ctx.strokeStyle = '#6B5335'; ctx.lineWidth = s(2.5);
  ctx.beginPath();
  ctx.moveTo(lx - ls * 0.3, ly); ctx.lineTo(lx + ls * 0.3, ly);
  ctx.lineTo(lx + ls * 0.85, ly + ls * 1.2); ctx.lineTo(lx - ls * 0.85, ly + ls * 1.2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Bulb
  if (glowAmount > 0) {
    const glowRad = ls * 2.5 * glowAmount;
    const glow = ctx.createRadialGradient(lx, ly + ls * 0.6, s(5), lx, ly + ls * 0.6, glowRad);
    glow.addColorStop(0, `rgba(255,240,150,${0.7 * glowAmount})`);
    glow.addColorStop(0.4, `rgba(255,200,50,${0.3 * glowAmount})`);
    glow.addColorStop(1, 'rgba(255,200,50,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - glowRad, ly + ls * 0.6 - glowRad, glowRad * 2, glowRad * 2);
    ctx.fillStyle = '#fff8d0';
  } else { ctx.fillStyle = '#888'; }
  ctx.beginPath(); ctx.arc(lx, ly + ls * 0.6, ls * 0.38, 0, Math.PI * 2); ctx.fill();
  // Post
  ctx.fillStyle = '#5a4a3a'; ctx.fillRect(lx - s(5), ly + ls * 1.2, s(10), ls * 0.7);
  ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); roundRect(ctx, lx - ls * 0.55, ly + ls * 1.9, ls * 1.1, ls * 0.22, s(4)); ctx.fill();
}

function drawKnife(knife, isMoving) {
  const cx = nx(knife.x), cy = ny(knife.y);
  const kw = nx(knife.w), kh = Math.max(ny(knife.h), s(22));
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(knife.angle);
  const bladeW = kw * 0.7, bladeH = kh;
  ctx.fillStyle = isMoving ? '#e8e8f0' : '#d8d8e0';
  ctx.strokeStyle = '#a0a0a8'; ctx.lineWidth = s(2);
  ctx.beginPath();
  ctx.moveTo(-bladeW / 2, -bladeH); ctx.lineTo(bladeW / 2, -bladeH);
  ctx.lineTo(bladeW / 2 + s(4), 0); ctx.lineTo(bladeW / 2, bladeH); ctx.lineTo(-bladeW / 2, bladeH);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-bladeW / 2 + s(4), -bladeH + s(3), s(6), bladeH * 2 - s(6));
  const handleW = kw * 0.38;
  ctx.fillStyle = isMoving ? '#e74c3c' : '#c0392b'; ctx.strokeStyle = '#962d22'; ctx.lineWidth = s(2);
  ctx.beginPath(); roundRect(ctx, -bladeW / 2 - handleW, -bladeH * 0.7, handleW, bladeH * 1.4, s(4)); ctx.fill(); ctx.stroke();
  // Angry eyes on knife
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-bladeW * 0.1, -bladeH * 0.15, s(4), 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bladeW * 0.15, -bladeH * 0.15, s(4), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-bladeW * 0.08, -bladeH * 0.12, s(2), 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bladeW * 0.17, -bladeH * 0.12, s(2), 0, Math.PI * 2); ctx.fill();
  if (isMoving) {
    ctx.shadowColor = 'rgba(255,50,50,0.5)'; ctx.shadowBlur = s(15);
    ctx.strokeStyle = 'rgba(255,80,80,0.3)'; ctx.lineWidth = s(2);
    ctx.strokeRect(-bladeW / 2 - handleW - s(4), -bladeH - s(4), bladeW + handleW + s(8), bladeH * 2 + s(8));
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawPool(pool, time) {
  const { x: px, y: py, r } = pool;
  const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
  grad.addColorStop(0, 'rgba(30,160,255,0.65)');
  grad.addColorStop(0.6, 'rgba(0,100,220,0.45)');
  grad.addColorStop(1, 'rgba(0,60,160,0.1)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  // Cartoon ripples
  const r1 = (time * 0.7) % 1, r2 = (time * 0.7 + 0.5) % 1;
  ctx.strokeStyle = `rgba(100,200,255,${0.5 * (1 - r1)})`; ctx.lineWidth = s(2);
  ctx.beginPath(); ctx.arc(px, py, r * r1, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(100,200,255,${0.4 * (1 - r2)})`;
  ctx.beginPath(); ctx.arc(px, py, r * r2, 0, Math.PI * 2); ctx.stroke();
  // Lightning emoji
  ctx.font = `${s(20)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('💧', px, py);
}

function drawBomb(bomb, time) {
  if (bomb.exploded) return;
  const bx = bomb.x, by = bomb.y, bs = s(24);
  const rollAngle = time * 3;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(rollAngle);
  // Cartoon bomb body
  ctx.fillStyle = '#2c2c2c';
  ctx.beginPath(); ctx.arc(0, 0, bs, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = s(2.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.arc(-bs * 0.3, -bs * 0.3, bs * 0.3, 0, Math.PI * 2); ctx.fill();
  // Skull face
  ctx.fillStyle = '#ddd'; ctx.font = `${bs}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('💀', 0, s(1));
  ctx.restore();
  // Fuse
  ctx.strokeStyle = '#8B4513'; ctx.lineWidth = s(3);
  ctx.beginPath(); ctx.moveTo(bx, by - bs); ctx.quadraticCurveTo(bx + s(12), by - bs - s(10), bx + s(6), by - bs - s(18)); ctx.stroke();
  if (bomb.triggered) {
    const sparkX = bx + s(6), sparkY = by - bs - s(18);
    const flicker = Math.sin(time * 25) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,150,0,${flicker})`;
    ctx.beginPath(); ctx.arc(sparkX, sparkY, s(7) * flicker, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,255,100,${flicker * 0.8})`;
    ctx.beginPath(); ctx.arc(sparkX, sparkY, s(4), 0, Math.PI * 2); ctx.fill();
    if (bomb.fuseLeft < 0.8 && Math.sin(time * 20) > 0) {
      ctx.fillStyle = '#ff4444'; ctx.font = `bold ${s(20)}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('⚠️', bx, by - bs - s(35));
    }
  }
  // Trigger range (very subtle)
  ctx.strokeStyle = 'rgba(255,100,50,0.06)'; ctx.lineWidth = s(1);
  ctx.setLineDash([s(4), s(4)]);
  ctx.beginPath(); ctx.arc(bx, by, nx(bomb.triggerDist), 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
}

function drawExplosion(exp) {
  const progress = exp.timer / 0.8;
  if (progress > 1) return;
  const maxR = exp.maxRadius, r = maxR * Math.min(progress * 2, 1), alpha = 1 - progress;
  const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, r);
  grad.addColorStop(0, `rgba(255,200,50,${alpha * 0.9})`);
  grad.addColorStop(0.3, `rgba(255,100,0,${alpha * 0.7})`);
  grad.addColorStop(0.6, `rgba(200,50,0,${alpha * 0.3})`);
  grad.addColorStop(1, 'rgba(100,20,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(exp.x, exp.y, r, 0, Math.PI * 2); ctx.fill();
  if (progress < 0.3) {
    ctx.fillStyle = `rgba(255,255,220,${(0.3 - progress) * 3})`;
    ctx.beginPath(); ctx.arc(exp.x, exp.y, r * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  // Cartoon star burst
  ctx.fillStyle = `rgba(255,${150 + progress * 100},0,${alpha * 0.5})`;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + progress * 3;
    const d = r * (0.4 + progress * 1.2);
    ctx.beginPath();
    ctx.arc(exp.x + Math.cos(angle) * d, exp.y + Math.sin(angle) * d, s(5) * (1 - progress), 0, Math.PI * 2);
    ctx.fill();
  }
  if (progress > 0.1 && progress < 0.5) {
    ctx.strokeStyle = `rgba(255,200,100,${(0.5 - progress) * 2.5})`; ctx.lineWidth = s(3);
    ctx.beginPath(); ctx.arc(exp.x, exp.y, r * 1.3, 0, Math.PI * 2); ctx.stroke();
  }
  // BOOM text
  if (progress < 0.4) {
    ctx.fillStyle = `rgba(255,100,0,${(0.4 - progress) * 2.5})`;
    ctx.font = `bold ${s(40)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('BOOM!', exp.x, exp.y - r * 0.5);
  }
}

function drawBird(bird, time) {
  const bx = bird.x, by = bird.y, bs = s(18);
  const wingFlap = Math.sin(time * 10) * 0.35;
  ctx.save(); ctx.translate(bx, by);
  if (bird.vx < 0) ctx.scale(-1, 1);
  // Body
  ctx.fillStyle = bird.biting ? '#ff5555' : '#55bb55';
  ctx.beginPath(); ctx.ellipse(0, 0, bs * 1.3, bs * 0.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = bird.biting ? '#aa3333' : '#338833'; ctx.lineWidth = s(1.5); ctx.stroke();
  // Wing
  ctx.fillStyle = bird.biting ? '#dd4444' : '#44aa44';
  ctx.beginPath(); ctx.ellipse(-bs * 0.2, -bs * 0.35, bs * 0.9, bs * 0.45, wingFlap, 0, Math.PI * 2); ctx.fill();
  // Eye (bigger, more cartoonish)
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(bs * 0.55, -bs * 0.25, bs * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = bird.biting ? '#cc0000' : '#111';
  ctx.beginPath(); ctx.arc(bs * 0.65, -bs * 0.22, bs * 0.18, 0, Math.PI * 2); ctx.fill();
  // Beak
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath(); ctx.moveTo(bs * 1.2, -bs * 0.1); ctx.lineTo(bs * 1.8, bs * 0.05); ctx.lineTo(bs * 1.2, bs * 0.2); ctx.closePath(); ctx.fill();
  if (bird.biting) {
    // Bite progress ring
    const biteProgress = Math.min(bird.biteTimer / 0.8, 1);
    ctx.strokeStyle = `rgba(255,0,0,0.7)`; ctx.lineWidth = s(3);
    ctx.beginPath(); ctx.arc(0, 0, bs * 2.2, -Math.PI / 2, -Math.PI / 2 + biteProgress * Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawLevelIndicator() {
  const level = levels[currentLevel];
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `bold ${s(24)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`Level ${currentLevel + 1} — ${level.name}`, W / 2, s(18));
}

// ============ TITLE SCREEN ============
function drawTitleScreen(time) {
  drawBackground();
  // Floating lamp
  const floatY = Math.sin(time * 1.5) * s(10);
  ctx.font = `${s(90)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('💡', W / 2, H * 0.17 + floatY);
  // Title (BIG)
  ctx.fillStyle = '#ffe066';
  ctx.font = `bold ${s(64)}px sans-serif`;
  ctx.fillText('Light the Lamp', W / 2, H * 0.32);
  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = `${s(26)}px sans-serif`;
  ctx.fillText('Plug in & Light up!', W / 2, H * 0.4);
  // Branding
  ctx.fillStyle = 'rgba(255,224,100,0.85)'; ctx.font = `bold ${s(22)}px sans-serif`;
  ctx.fillText('HuFamilyGame', W / 2, H * 0.47);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${s(18)}px sans-serif`;
  ctx.fillText('Created by Kai and Ray', W / 2, H * 0.53);
  // PLAY button (bigger)
  const bw = s(260), bh = s(80), bx = W / 2 - bw / 2, by = H * 0.62;
  // Button shadow
  ctx.fillStyle = 'rgba(200,160,0,0.5)';
  ctx.beginPath(); roundRect(ctx, bx + s(3), by + s(3), bw, bh, s(18)); ctx.fill();
  // Button
  ctx.fillStyle = '#ffe066';
  ctx.beginPath(); roundRect(ctx, bx, by, bw, bh, s(18)); ctx.fill();
  ctx.strokeStyle = '#ccb030'; ctx.lineWidth = s(2.5);
  ctx.beginPath(); roundRect(ctx, bx, by, bw, bh, s(18)); ctx.stroke();
  ctx.fillStyle = '#1a1a2e'; ctx.font = `bold ${s(40)}px sans-serif`; ctx.fillText('PLAY', W / 2, by + bh / 2);
  drawTitleScreen._btn = { x: bx, y: by, w: bw, h: bh };
  // Version (BIGGER)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `bold ${s(20)}px sans-serif`;
  ctx.fillText(VERSION, W / 2, H * 0.92);
}

// ============ TUTORIAL ============
function drawTutorial(time) {
  drawBackground();
  const t = tutorialTimer;

  // Scene: a cute map appears
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `${s(60)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  if (tutorialStep === 0) {
    // Map unrolling
    const unroll = Math.min(t / 1.5, 1);
    ctx.fillText('🗺️', W / 2, H * 0.3);
    ctx.fillStyle = '#ffe066'; ctx.font = `bold ${s(36)}px sans-serif`;
    if (unroll > 0.3) ctx.fillText('You found a map!', W / 2, H * 0.45);
    if (unroll > 0.7) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `${s(22)}px sans-serif`;
      ctx.fillText('5 places to light up...', W / 2, H * 0.54);
    }
    if (t > 2.5) { tutorialStep = 1; tutorialTimer = 0; }
  } else if (tutorialStep === 1) {
    // Show plug and socket
    ctx.fillText('🔌', W / 2 - s(60), H * 0.3);
    ctx.fillText('➡️', W / 2, H * 0.3);
    ctx.fillText('🔲', W / 2 + s(60), H * 0.3);
    ctx.fillStyle = '#ffe066'; ctx.font = `bold ${s(30)}px sans-serif`;
    ctx.fillText('Drag the plug to the socket!', W / 2, H * 0.45);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${s(20)}px sans-serif`;
    ctx.fillText('But watch out for dangers...', W / 2, H * 0.54);
    if (t > 3) { tutorialStep = 2; tutorialTimer = 0; }
  } else if (tutorialStep === 2) {
    // Show dangers
    ctx.fillText('🔪', W / 2 - s(80), H * 0.25);
    ctx.fillText('💣', W / 2 - s(25), H * 0.25);
    ctx.fillText('💧', W / 2 + s(30), H * 0.25);
    ctx.fillText('🐦', W / 2 + s(80), H * 0.25);
    ctx.fillStyle = '#ff8866'; ctx.font = `bold ${s(26)}px sans-serif`;
    ctx.fillText('Knives, Bombs, Water, Birds!', W / 2, H * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${s(20)}px sans-serif`;
    ctx.fillText("Don't cross your own wire!", W / 2, H * 0.49);
    // GO button
    if (t > 1.5) {
      const bw = s(220), bh = s(70), bx = W / 2 - bw / 2, by = H * 0.6;
      ctx.fillStyle = '#66dd66';
      ctx.beginPath(); roundRect(ctx, bx, by, bw, bh, s(15)); ctx.fill();
      ctx.fillStyle = '#1a3a1a'; ctx.font = `bold ${s(34)}px sans-serif`;
      ctx.fillText("LET'S GO!", W / 2, by + bh / 2);
      drawTutorial._btn = { x: bx, y: by, w: bw, h: bh };
    }
  }
}

// ============ MAP SCREEN ============
function drawMapScreen(time) {
  // Parchment background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#3a2a1a');
  grad.addColorStop(0.5, '#4a3a2a');
  grad.addColorStop(1, '#2a1a0a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#ffe066'; ctx.font = `bold ${s(30)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Adventure Map', W / 2, s(40));

  // Draw path
  ctx.strokeStyle = 'rgba(255,200,100,0.3)'; ctx.lineWidth = s(4);
  ctx.setLineDash([s(8), s(6)]);
  ctx.beginPath();
  ctx.moveTo(nx(mapNodes[0].x), ny(mapNodes[0].y));
  for (let i = 1; i < mapNodes.length; i++) {
    ctx.lineTo(nx(mapNodes[i].x), ny(mapNodes[i].y));
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw nodes
  for (let i = 0; i < mapNodes.length; i++) {
    const node = mapNodes[i];
    const nodeX = nx(node.x), nodeY = ny(node.y);
    const completed = i < mapTo;
    const current = i === mapTo;

    // Circle
    ctx.fillStyle = completed ? 'rgba(100,200,100,0.7)' : current ? 'rgba(255,224,100,0.7)' : 'rgba(100,100,100,0.4)';
    ctx.beginPath(); ctx.arc(nodeX, nodeY, s(30), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = completed ? '#66cc66' : current ? '#ffcc00' : '#666';
    ctx.lineWidth = s(2.5); ctx.stroke();

    // Icon
    ctx.font = `${s(28)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(node.icon, nodeX, nodeY);

    // Level name
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `${s(14)}px sans-serif`;
    ctx.fillText(levels[i].name, nodeX, nodeY + s(42));

    // Check mark for completed
    if (completed) {
      ctx.fillStyle = '#66ff66'; ctx.font = `bold ${s(22)}px sans-serif`;
      ctx.fillText('✓', nodeX + s(22), nodeY - s(22));
    }
  }

  // Animated player dot moving from mapFrom to mapTo
  if (mapProgress < 1) {
    const fromNode = mapNodes[mapFrom], toNode = mapNodes[mapTo];
    const t = easeInOut(mapProgress);
    const px = lerp(nx(fromNode.x), nx(toNode.x), t);
    const py = lerp(ny(fromNode.y), ny(toNode.y), t);
    // Player icon
    ctx.font = `${s(30)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🔌', px, py - s(25));
    // Trail sparkle
    ctx.fillStyle = 'rgba(255,224,100,0.5)';
    ctx.beginPath(); ctx.arc(px, py, s(6), 0, Math.PI * 2); ctx.fill();
  }
}

// ============ GAME OVER / LEVEL COMPLETE ============
function drawGameOverScreen() {
  ctx.fillStyle = `rgba(180,30,30,${failAlpha * 0.55})`; ctx.fillRect(0, 0, W, H);
  if (failAlpha >= 0.8) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let msg = '⚡ Wire Cut!';
    if (failReason === 'bomb') msg = '💥 BOOM!';
    else if (failReason === 'bird') msg = '🐦 Bird Bit the Wire!';
    else if (failReason === 'pool') msg = '💧 Short Circuit!';
    else if (failReason === 'self') msg = '🔌 Plug Hit the Wire!';
    else if (failReason === 'cross') msg = '⚡ Wires Crossed!';
    ctx.fillStyle = '#ff7777'; ctx.font = `bold ${s(46)}px sans-serif`;
    ctx.fillText(msg, W / 2, H * 0.36);
    const bw = s(240), bh = s(75), bx = W / 2 - bw / 2, by = H * 0.52;
    ctx.fillStyle = '#ff6666'; ctx.beginPath(); roundRect(ctx, bx, by, bw, bh, s(16)); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${s(32)}px sans-serif`; ctx.fillText('TRY AGAIN', W / 2, by + bh / 2);
    drawGameOverScreen._btn = { x: bx, y: by, w: bw, h: bh };
  }
}

function drawLevelCompleteScreen() {
  ctx.fillStyle = `rgba(50,180,50,${winAlpha * 0.35})`; ctx.fillRect(0, 0, W, H);
  if (winAlpha >= 0.5) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe066'; ctx.font = `bold ${s(58)}px sans-serif`;
    ctx.fillText('🎉 You did it!', W / 2, H * 0.42);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `${s(22)}px sans-serif`;
    ctx.fillText(`${levels[currentLevel].name} cleared!`, W / 2, H * 0.52);
  }
}

function drawAllClearScreen(time) {
  drawBackground();
  const bounce = Math.sin(time * 2) * s(8);
  ctx.font = `${s(80)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏆', W / 2, H * 0.22 + bounce);
  ctx.fillStyle = '#ffe066'; ctx.font = `bold ${s(50)}px sans-serif`;
  ctx.fillText('ALL CLEAR!', W / 2, H * 0.38);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `${s(24)}px sans-serif`;
  ctx.fillText('You lit all the lamps!', W / 2, H * 0.47);
  ctx.fillStyle = 'rgba(255,224,100,0.7)'; ctx.font = `bold ${s(20)}px sans-serif`;
  ctx.fillText('HuFamilyGame — Kai & Ray', W / 2, H * 0.55);
  // Play again button
  if (stateTimer > 2) {
    const bw = s(260), bh = s(75), bx = W / 2 - bw / 2, by = H * 0.65;
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); roundRect(ctx, bx, by, bw, bh, s(16)); ctx.fill();
    ctx.fillStyle = '#1a1a2e'; ctx.font = `bold ${s(32)}px sans-serif`; ctx.fillText('PLAY AGAIN', W / 2, by + bh / 2);
    drawAllClearScreen._btn = { x: bx, y: by, w: bw, h: bh };
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// ============ UPDATE ============

function updateMovingKnives(dt) {
  for (const mk of movingKnives) {
    mk.x += mk.vx * dt; mk.y += mk.vy * dt;
    if (mk.x < mk.minX || mk.x > mk.maxX) mk.vx *= -1;
    if (mk.y < mk.minY || mk.y > mk.maxY) mk.vy *= -1;
    mk.x = Math.max(mk.minX, Math.min(mk.maxX, mk.x));
    mk.y = Math.max(mk.minY, Math.min(mk.maxY, mk.y));
  }
}

function updateBombs(dt) {
  for (const bomb of bombs) {
    if (bomb.exploded) continue;
    const margin = s(25);
    bomb.x += nx(bomb.vx) * dt; bomb.y += ny(bomb.vy) * dt;
    if (bomb.x < margin || bomb.x > W - margin) bomb.vx *= -1;
    if (bomb.y < margin || bomb.y > H - margin) bomb.vy *= -1;
    bomb.x = Math.max(margin, Math.min(W - margin, bomb.x));
    bomb.y = Math.max(margin, Math.min(H - margin, bomb.y));
    if (!bomb.triggered) {
      if (checkBombProximityOne(bomb)) { bomb.triggered = true; bomb.fuseLeft = 1.5; }
    } else {
      bomb.fuseLeft -= dt;
      if (bomb.fuseLeft <= 0) {
        bomb.exploded = true;
        const expRadius = nx(bomb.radius);
        explosions.push({ x: bomb.x, y: bomb.y, timer: 0, maxRadius: expRadius });
        const hitIdx = checkExplosionWire(bomb.x, bomb.y, expRadius);
        if (hitIdx >= 0 && state === 'playing') triggerFail(hitIdx, 'bomb');
      }
    }
  }
}

function updateBirds(dt, time) {
  for (const bird of birds) {
    bird.frame += dt;
    if (bird.frame > 1.5) {
      bird.frame = 0;
      const angle = Math.random() * Math.PI * 2;
      bird.vx = Math.cos(angle) * bird.speed; bird.vy = Math.sin(angle) * bird.speed;
    }
    bird.x += nx(bird.vx) * dt; bird.y += ny(bird.vy) * dt;
    const margin = s(40);
    if (bird.x < margin) { bird.x = margin; bird.vx = Math.abs(bird.vx); }
    if (bird.x > W - margin) { bird.x = W - margin; bird.vx = -Math.abs(bird.vx); }
    if (bird.y < margin) { bird.y = margin; bird.vy = Math.abs(bird.vy); }
    if (bird.y > H - margin) { bird.y = H - margin; bird.vy = -Math.abs(bird.vy); }
    bird.biting = false;
    if (wirePath.length > 3) {
      let nearestDist = Infinity, nearestPt = null;
      for (let i = 0; i < wirePath.length; i++) {
        const d = Math.hypot(wirePath[i].x - bird.x, wirePath[i].y - bird.y);
        if (d < nearestDist) { nearestDist = d; nearestPt = wirePath[i]; }
      }
      if (nearestPt && nearestDist < nx(0.2)) {
        const ddx = nearestPt.x - bird.x, ddy = nearestPt.y - bird.y, len = Math.hypot(ddx, ddy);
        if (len > 0) { bird.x += (ddx / len) * nx(bird.speed) * dt * 1.5; bird.y += (ddy / len) * ny(bird.speed) * dt * 1.5; }
      }
      const biteIdx = checkBirdBite(bird);
      if (biteIdx >= 0) {
        bird.biting = true; bird.biteTimer += dt;
        if (bird.biteTimer > 0.8 && state === 'playing') triggerFail(Math.max(0, biteIdx - 1), 'bird');
      } else { bird.biteTimer = 0; }
    }
  }
}

function updateExplosions(dt) {
  for (const exp of explosions) exp.timer += dt;
  for (let i = explosions.length - 1; i >= 0; i--) { if (explosions[i].timer > 1) explosions.splice(i, 1); }
}

// ============ INPUT ============

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return { x: (touch.clientX - rect.left) * devicePixelRatio, y: (touch.clientY - rect.top) * devicePixelRatio };
}

function triggerFail(segIndex, reason) {
  if (state !== 'playing') return;
  state = 'gameover'; wireSnapPoint = { segIndex }; failReason = reason; dragging = false;
}

// Clamp position within play area
function clampToPlayArea(pos) {
  const minX = nx(BOUNDARY) + s(5), maxX = W - nx(BOUNDARY) - s(5);
  const minY = ny(BOUNDARY) + s(5), maxY = H - ny(BOUNDARY) - s(5);
  pos.x = Math.max(minX, Math.min(maxX, pos.x));
  pos.y = Math.max(minY, Math.min(maxY, pos.y));
  return pos;
}

function onStart(e) {
  e.preventDefault();
  const pos = getPos(e);
  if (state === 'title') {
    const btn = drawTitleScreen._btn;
    if (btn && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
      state = 'tutorial'; tutorialStep = 0; tutorialTimer = 0;
    }
    return;
  }
  if (state === 'tutorial' && tutorialStep === 2 && tutorialTimer > 1.5) {
    const btn = drawTutorial._btn;
    if (btn && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
      currentLevel = 0; state = 'map'; mapFrom = 0; mapTo = 0; mapProgress = 1; stateTimer = 0;
    }
    return;
  }
  if (state === 'map' && mapProgress >= 1 && stateTimer > 1.5) {
    initLevel(); return;
  }
  if (state === 'gameover') {
    const btn = drawGameOverScreen._btn;
    if (btn && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) initLevel();
    return;
  }
  if (state === 'allclear' && stateTimer > 2) {
    const btn = drawAllClearScreen._btn;
    if (btn && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
      state = 'title';
    }
    return;
  }
  if (state === 'playing' && dist(pos, plugPos) < s(50)) dragging = true;
}

function onMove(e) {
  e.preventDefault();
  if (!dragging || state !== 'playing') return;
  let pos = getPos(e);
  pos = clampToPlayArea(pos);
  plugPos.x = pos.x; plugPos.y = pos.y;
  const last = wirePath[wirePath.length - 1];
  if (dist(last, pos) > s(5)) wirePath.push({ x: pos.x, y: pos.y });
  const hit = checkAllKnifeCollisions();
  if (hit) { triggerFail(hit.segIndex, 'knife'); return; }
  const poolHit = checkPoolCollisions();
  if (poolHit) { triggerFail(poolHit.segIndex, 'pool'); return; }
  const selfHit = checkPlugSelfCollision();
  if (selfHit >= 0) { triggerFail(selfHit, 'self'); return; }
  const crossHit = checkWireCrossing();
  if (crossHit >= 0) { triggerFail(crossHit, 'cross'); return; }
  const level = levels[currentLevel];
  const socketPos = { x: nx(level.socket.x), y: ny(level.socket.y) };
  if (dist(pos, socketPos) < s(35)) { state = 'levelcomplete'; dragging = false; stateTimer = 0; }
}

function onEnd(e) { e.preventDefault(); dragging = false; }

canvas.addEventListener('touchstart', onStart, { passive: false });
canvas.addEventListener('touchmove', onMove, { passive: false });
canvas.addEventListener('touchend', onEnd, { passive: false });
canvas.addEventListener('mousedown', onStart);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onEnd);

// ============ MAIN LOOP ============

let lastTime = 0;
function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time; gameTime += dt; stateTimer += dt;
  const t = time / 1000;

  resize();

  if (state === 'title') {
    drawTitleScreen(t);
  } else if (state === 'tutorial') {
    tutorialTimer += dt;
    drawTutorial(t);
  } else if (state === 'map') {
    if (mapProgress < 1) mapProgress = Math.min(mapProgress + dt * 0.7, 1);
    drawMapScreen(t);
    // Tap anywhere to start after animation + delay
  } else if (state === 'playing') {
    const level = levels[currentLevel];
    const lampPos = getLampPos(level);
    updateMovingKnives(dt); updateBombs(dt); updateBirds(dt, t); updateExplosions(dt);
    drawBackground();
    drawBoundary();
    drawLamp(nx(lampPos.x), ny(lampPos.y), lampGlow);
    drawSocket(nx(level.socket.x), ny(level.socket.y));
    pools.forEach(p => drawPool(p, t));
    level.knives.forEach(k => drawKnife(k, false));
    movingKnives.forEach(mk => drawKnife(mk, true));
    bombs.forEach(b => drawBomb(b, t));
    explosions.forEach(exp => drawExplosion(exp));
    birds.forEach(b => drawBird(b, t));
    drawWire();
    drawPlug(plugPos.x, plugPos.y);
    drawLevelIndicator();
    if (!dragging) {
      const pulse = 0.5 + Math.sin(time * 0.005) * 0.3;
      ctx.strokeStyle = `rgba(255,224,100,${pulse})`; ctx.lineWidth = s(2);
      ctx.beginPath(); ctx.arc(plugPos.x, plugPos.y, s(30) + Math.sin(time * 0.003) * s(5), 0, Math.PI * 2); ctx.stroke();
    }
  } else if (state === 'gameover') {
    const level = levels[currentLevel];
    const lampPos = getLampPos(level);
    updateExplosions(dt);
    drawBackground(); drawBoundary();
    drawLamp(nx(lampPos.x), ny(lampPos.y), 0);
    drawSocket(nx(level.socket.x), ny(level.socket.y));
    pools.forEach(p => drawPool(p, t));
    level.knives.forEach(k => drawKnife(k, false));
    movingKnives.forEach(mk => drawKnife(mk, false));
    bombs.forEach(b => drawBomb(b, t));
    explosions.forEach(exp => drawExplosion(exp));
    birds.forEach(b => drawBird(b, t));
    drawSnappedWire(); drawLevelIndicator();
    failAlpha = Math.min(failAlpha + dt * 2, 1);
    wireSnapTimer = Math.min(wireSnapTimer + dt, 1);
    drawGameOverScreen();
  } else if (state === 'levelcomplete') {
    const level = levels[currentLevel];
    const lampPos = getLampPos(level);
    lampGlow = Math.min(lampGlow + dt * 2, 1);
    winAlpha = Math.min(winAlpha + dt * 1.5, 1);
    drawBackground(); drawBoundary();
    drawLamp(nx(lampPos.x), ny(lampPos.y), lampGlow);
    drawSocket(nx(level.socket.x), ny(level.socket.y));
    level.knives.forEach(k => drawKnife(k, false));
    drawWire();
    drawPlug(nx(level.socket.x), ny(level.socket.y));
    drawLevelIndicator();
    drawLevelCompleteScreen();
    if (winAlpha >= 1 && !levelAdvancing) {
      levelAdvancing = true;
      setTimeout(() => {
        if (currentLevel < levels.length - 1) {
          mapFrom = currentLevel; mapTo = currentLevel + 1;
          currentLevel++; mapProgress = 0; stateTimer = 0;
          state = 'map';
        } else {
          state = 'allclear'; stateTimer = 0;
        }
      }, 1200);
    }
  } else if (state === 'allclear') {
    drawAllClearScreen(t);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
