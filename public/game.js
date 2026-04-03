// ============================================================
// Light the Lamp v0.2 — Plug in & Light up!
// HuFamilyGame — Created by Kai and Ray
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

const VERSION = 'v0.2';

// --- Game state ---
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
let gameTime = 0; // elapsed time in level

// Dynamic entities (per level, runtime)
let bombs = [];       // { x, y, radius, fuse, exploded, explodeTimer, nx, ny (normalized) }
let birds = [];       // { x, y, vx, vy, nx, ny, frame, biteTimer }
let movingKnives = []; // { x, y, angle, w, h, vx, vy, nx, ny, minX, maxX, minY, maxY }
let explosions = [];   // { x, y, timer, maxRadius }
let failReason = '';

// --- Levels ---
const LAMP_OFFSET_Y = 0.12;

const levels = [
  // Level 1: Tutorial — one static knife blocks direct path
  {
    plugStart: { x: 0.1, y: 0.75 },
    socket: { x: 0.9, y: 0.25 },
    knives: [
      { x: 0.5, y: 0.5, angle: 0.4, w: 0.2, h: 0.03 }
    ],
    movingKnives: [],
    bombs: [],
    birds: []
  },
  // Level 2: Two knives blocking the diagonal
  {
    plugStart: { x: 0.1, y: 0.85 },
    socket: { x: 0.9, y: 0.2 },
    knives: [
      { x: 0.35, y: 0.55, angle: -0.3, w: 0.22, h: 0.03 },
      { x: 0.65, y: 0.45, angle: 0.3, w: 0.22, h: 0.03 }
    ],
    movingKnives: [],
    bombs: [],
    birds: []
  },
  // Level 3: Moving knife + static knife
  {
    plugStart: { x: 0.1, y: 0.8 },
    socket: { x: 0.9, y: 0.2 },
    knives: [
      { x: 0.5, y: 0.35, angle: 0, w: 0.25, h: 0.03 }
    ],
    movingKnives: [
      { x: 0.3, y: 0.6, angle: 0, w: 0.15, h: 0.025, vx: 0.15, vy: 0, minX: 0.15, maxX: 0.7, minY: 0.6, maxY: 0.6 }
    ],
    bombs: [],
    birds: []
  },
  // Level 4: First bomb level
  {
    plugStart: { x: 0.08, y: 0.85 },
    socket: { x: 0.92, y: 0.15 },
    knives: [
      { x: 0.3, y: 0.5, angle: 0.5, w: 0.18, h: 0.025 },
      { x: 0.7, y: 0.4, angle: -0.5, w: 0.18, h: 0.025 }
    ],
    movingKnives: [],
    bombs: [
      { nx: 0.5, ny: 0.6, fuse: 4, radius: 0.12 }
    ],
    birds: []
  },
  // Level 5: Moving knife + bomb combo
  {
    plugStart: { x: 0.08, y: 0.9 },
    socket: { x: 0.92, y: 0.15 },
    knives: [
      { x: 0.5, y: 0.3, angle: 0, w: 0.3, h: 0.025 }
    ],
    movingKnives: [
      { x: 0.2, y: 0.6, angle: 0.3, w: 0.15, h: 0.025, vx: 0.12, vy: 0, minX: 0.1, maxX: 0.6, minY: 0.6, maxY: 0.6 }
    ],
    bombs: [
      { nx: 0.75, ny: 0.55, fuse: 5, radius: 0.1 }
    ],
    birds: []
  },
  // Level 6: First bird level!
  {
    plugStart: { x: 0.1, y: 0.85 },
    socket: { x: 0.9, y: 0.2 },
    knives: [
      { x: 0.4, y: 0.5, angle: 0.3, w: 0.2, h: 0.025 },
      { x: 0.7, y: 0.6, angle: -0.4, w: 0.18, h: 0.025 }
    ],
    movingKnives: [],
    bombs: [],
    birds: [
      { nx: 0.6, ny: 0.7, speed: 0.06 }
    ]
  },
  // Level 7: Two birds + moving knife
  {
    plugStart: { x: 0.05, y: 0.9 },
    socket: { x: 0.95, y: 0.15 },
    knives: [
      { x: 0.5, y: 0.45, angle: 0, w: 0.25, h: 0.025 }
    ],
    movingKnives: [
      { x: 0.3, y: 0.7, angle: 0, w: 0.15, h: 0.025, vx: 0, vy: -0.1, minX: 0.3, maxX: 0.3, minY: 0.3, maxY: 0.7 }
    ],
    bombs: [],
    birds: [
      { nx: 0.2, ny: 0.4, speed: 0.07 },
      { nx: 0.8, ny: 0.6, speed: 0.05 }
    ]
  },
  // Level 8: Bomb + bird + multiple knives
  {
    plugStart: { x: 0.05, y: 0.92 },
    socket: { x: 0.5, y: 0.12 },
    knives: [
      { x: 0.25, y: 0.5, angle: 0.6, w: 0.2, h: 0.025 },
      { x: 0.75, y: 0.5, angle: -0.6, w: 0.2, h: 0.025 },
      { x: 0.5, y: 0.7, angle: 0, w: 0.2, h: 0.025 }
    ],
    movingKnives: [],
    bombs: [
      { nx: 0.5, ny: 0.4, fuse: 3.5, radius: 0.13 }
    ],
    birds: [
      { nx: 0.3, ny: 0.3, speed: 0.08 }
    ]
  },
  // Level 9: Chaos — everything
  {
    plugStart: { x: 0.05, y: 0.5 },
    socket: { x: 0.95, y: 0.5 },
    knives: [
      { x: 0.3, y: 0.35, angle: 0.8, w: 0.18, h: 0.025 },
      { x: 0.3, y: 0.65, angle: -0.8, w: 0.18, h: 0.025 },
      { x: 0.7, y: 0.35, angle: -0.5, w: 0.15, h: 0.025 },
      { x: 0.7, y: 0.65, angle: 0.5, w: 0.15, h: 0.025 }
    ],
    movingKnives: [
      { x: 0.5, y: 0.3, angle: 0, w: 0.12, h: 0.02, vx: 0, vy: 0.15, minX: 0.5, maxX: 0.5, minY: 0.25, maxY: 0.75 }
    ],
    bombs: [
      { nx: 0.5, ny: 0.5, fuse: 3, radius: 0.11 }
    ],
    birds: [
      { nx: 0.4, ny: 0.2, speed: 0.09 }
    ]
  },
  // Level 10: FINAL BOSS — two bombs, two birds, moving knives
  {
    plugStart: { x: 0.05, y: 0.95 },
    socket: { x: 0.95, y: 0.08 },
    knives: [
      { x: 0.25, y: 0.6, angle: 0.4, w: 0.2, h: 0.025 },
      { x: 0.5, y: 0.4, angle: -0.3, w: 0.22, h: 0.025 },
      { x: 0.75, y: 0.25, angle: 0.6, w: 0.18, h: 0.025 }
    ],
    movingKnives: [
      { x: 0.15, y: 0.35, angle: 0.3, w: 0.13, h: 0.02, vx: 0.18, vy: 0, minX: 0.1, maxX: 0.5, minY: 0.35, maxY: 0.35 },
      { x: 0.6, y: 0.7, angle: -0.2, w: 0.13, h: 0.02, vx: 0, vy: -0.12, minX: 0.6, maxX: 0.6, minY: 0.4, maxY: 0.8 }
    ],
    bombs: [
      { nx: 0.35, ny: 0.75, fuse: 3, radius: 0.1 },
      { nx: 0.7, ny: 0.5, fuse: 5, radius: 0.12 }
    ],
    birds: [
      { nx: 0.5, ny: 0.8, speed: 0.1 },
      { nx: 0.8, ny: 0.3, speed: 0.08 }
    ]
  }
];

// --- Helpers ---
function nx(v) { return v * W; }
function ny(v) { return v * H; }
function s(v) { return v * SCALE; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function getLampPos(level) {
  return { x: level.socket.x, y: Math.max(0.06, level.socket.y - LAMP_OFFSET_Y) };
}

// --- Collision: line segment vs rotated rectangle ---
function lineSegIntersectsRect(p1, p2, cx, cy, hw, hh, angle) {
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  function toLocal(p) {
    const dx = p.x - cx, dy = p.y - cy;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  }
  const a = toLocal(p1), b = toLocal(p2);
  return lineSegIntersectsAABB(a, b, -hw, -hh, hw, hh);
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
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const edges = [
    { nx: -1, ny: 0, d: minX }, { nx: 1, ny: 0, d: -maxX },
    { nx: 0, ny: -1, d: minY }, { nx: 0, ny: 1, d: -maxY }
  ];
  let tMin = 0, tMax = 1;
  for (const e of edges) {
    const denom = e.nx * dx + e.ny * dy;
    const num = -(e.nx * p1.x + e.ny * p1.y + e.d);
    if (Math.abs(denom) < 1e-10) { if (num < 0) return false; }
    else {
      const t = num / denom;
      if (denom < 0) { if (t > tMin) tMin = t; } else { if (t < tMax) tMax = t; }
    }
  }
  return tMin <= tMax;
}

function checkKnifeCollision(p1, p2, knife) {
  const cx = nx(knife.x), cy = ny(knife.y);
  const hw = nx(knife.w) / 2, hh = Math.max(ny(knife.h), s(10)) / 2 + s(6);
  return lineSegIntersectsRect(p1, p2, cx, cy, hw, hh, knife.angle);
}

// Check wire against ALL hazards
function checkAllCollisions() {
  if (wirePath.length < 2) return null;
  for (let i = 0; i < wirePath.length - 1; i++) {
    const p1 = wirePath[i], p2 = wirePath[i + 1];
    // Static knives
    const level = levels[currentLevel];
    for (const k of level.knives) {
      if (checkKnifeCollision(p1, p2, k)) return { segIndex: i, reason: 'knife' };
    }
    // Moving knives
    for (const mk of movingKnives) {
      if (checkKnifeCollision(p1, p2, mk)) return { segIndex: i, reason: 'knife' };
    }
  }
  return null;
}

// Check wire against explosion radius
function checkExplosionWire(ex, ey, radius) {
  if (wirePath.length < 2) return -1;
  for (let i = 0; i < wirePath.length; i++) {
    const p = wirePath[i];
    if (Math.hypot(p.x - ex, p.y - ey) < radius) return i;
  }
  return -1;
}

// Check bird bite on wire
function checkBirdBite(bird) {
  if (wirePath.length < 2) return -1;
  const bx = bird.x, by = bird.y;
  const biteRange = s(25);
  for (let i = 0; i < wirePath.length; i++) {
    if (Math.hypot(wirePath[i].x - bx, wirePath[i].y - by) < biteRange) return i;
  }
  return -1;
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
  levelAdvancing = false;
  gameTime = 0;
  failReason = '';
  explosions = [];

  // Init bombs
  bombs = (level.bombs || []).map(b => ({
    x: nx(b.nx), y: ny(b.ny), nx: b.nx, ny: b.ny,
    fuse: b.fuse, fuseLeft: b.fuse,
    radius: b.radius, exploded: false, explodeTimer: 0
  }));

  // Init birds
  birds = (level.birds || []).map(b => {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: nx(b.nx), y: ny(b.ny), nx: b.nx, ny: b.ny,
      vx: Math.cos(angle) * b.speed, vy: Math.sin(angle) * b.speed,
      speed: b.speed, frame: 0, biteTimer: 0, biting: false
    };
  });

  // Init moving knives
  movingKnives = (level.movingKnives || []).map(mk => ({ ...mk }));

  state = 'playing';
}

// ============================================================
// DRAWING FUNCTIONS
// ============================================================

function drawBackground() {
  const grad = ctx.createRadialGradient(W / 2, H / 3, s(50), W / 2, H / 2, Math.max(W, H));
  grad.addColorStop(0, '#2a2a4a');
  grad.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawWire() {
  if (wirePath.length < 2) return;
  // Shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = s(10);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x + s(3), wirePath[0].y + s(3));
  for (let i = 1; i < wirePath.length; i++) ctx.lineTo(wirePath[i].x + s(3), wirePath[i].y + s(3));
  ctx.stroke();
  // Main wire
  ctx.strokeStyle = '#2d2d2d';
  ctx.lineWidth = s(7);
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x, wirePath[0].y);
  for (let i = 1; i < wirePath.length; i++) ctx.lineTo(wirePath[i].x, wirePath[i].y);
  ctx.stroke();
  // Highlight
  ctx.strokeStyle = 'rgba(80,80,80,0.4)';
  ctx.lineWidth = s(3);
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x - s(1), wirePath[0].y - s(2));
  for (let i = 1; i < wirePath.length; i++) ctx.lineTo(wirePath[i].x - s(1), wirePath[i].y - s(2));
  ctx.stroke();
}

function drawPlug(x, y) {
  const ps = s(18);
  ctx.fillStyle = '#555';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = s(2);
  const bw = ps * 1.8, bh = ps * 2.4;
  ctx.beginPath();
  roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, s(4));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(x - ps * 0.5, y - bh / 2 - ps * 0.6, ps * 0.25, ps * 0.7);
  ctx.fillRect(x + ps * 0.25, y - bh / 2 - ps * 0.6, ps * 0.25, ps * 0.7);
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
  ctx.fillStyle = '#e8e0d0';
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = s(2);
  ctx.beginPath();
  roundRect(ctx, sx - ss, sy - ss * 1.2, ss * 2, ss * 2.4, s(6));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(sx - ss * 0.3, sy - ss * 0.15, s(5), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx + ss * 0.3, sy - ss * 0.15, s(5), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  roundRect(ctx, sx - s(4), sy + ss * 0.2, s(8), s(12), s(2));
  ctx.fill();
}

function drawLamp(lx, ly, glowAmount) {
  const ls = s(35);
  // Shade
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
  if (glowAmount > 0) {
    const glowRad = ls * 2 * glowAmount;
    const glow = ctx.createRadialGradient(lx, ly + ls * 0.6, s(5), lx, ly + ls * 0.6, glowRad);
    glow.addColorStop(0, `rgba(255, 230, 120, ${0.6 * glowAmount})`);
    glow.addColorStop(0.5, `rgba(255, 200, 50, ${0.2 * glowAmount})`);
    glow.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - glowRad, ly + ls * 0.6 - glowRad, glowRad * 2, glowRad * 2);
    ctx.fillStyle = `rgba(255, 240, 150, ${glowAmount})`;
  } else {
    ctx.fillStyle = '#666';
  }
  ctx.beginPath();
  ctx.arc(lx, ly + ls * 0.6, ls * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Post + base
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(lx - s(4), ly + ls * 1.2, s(8), ls * 0.8);
  ctx.fillStyle = '#4a3a2a';
  ctx.beginPath();
  roundRect(ctx, lx - ls * 0.5, ly + ls * 2, ls, ls * 0.25, s(3));
  ctx.fill();
}

function drawKnife(knife, isMoving) {
  const cx = nx(knife.x), cy = ny(knife.y);
  const kw = nx(knife.w), kh = Math.max(ny(knife.h), s(20));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(knife.angle);
  const bladeW = kw * 0.7, bladeH = kh;
  // Blade
  ctx.fillStyle = isMoving ? '#e0e0e8' : '#d0d0d8';
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
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(-bladeW / 2 + s(3), -bladeH + s(2), s(5), bladeH * 2 - s(4));
  // Handle
  const handleW = kw * 0.35;
  ctx.fillStyle = isMoving ? '#e74c3c' : '#c0392b';
  ctx.strokeStyle = '#962d22';
  ctx.lineWidth = s(1.5);
  ctx.beginPath();
  roundRect(ctx, -bladeW / 2 - handleW, -bladeH * 0.7, handleW, bladeH * 1.4, s(3));
  ctx.fill();
  ctx.stroke();
  // Danger glow for moving knives
  if (isMoving) {
    ctx.shadowColor = 'rgba(255, 50, 50, 0.5)';
    ctx.shadowBlur = s(12);
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.3)';
    ctx.lineWidth = s(2);
    ctx.strokeRect(-bladeW / 2 - handleW - s(3), -bladeH - s(3), bladeW + handleW + s(6), bladeH * 2 + s(6));
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// --- Bomb drawing ---
function drawBomb(bomb, time) {
  const bx = bomb.x, by = bomb.y;
  const bs = s(22);

  if (bomb.exploded) return; // drawn by explosion system

  // Body
  ctx.fillStyle = '#2c2c2c';
  ctx.beginPath();
  ctx.arc(bx, by, bs, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = s(2);
  ctx.stroke();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(bx - bs * 0.25, by - bs * 0.25, bs * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Fuse
  const fuseRatio = bomb.fuseLeft / bomb.fuse;
  const fuseLen = s(20) * fuseRatio;
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = s(3);
  ctx.beginPath();
  ctx.moveTo(bx, by - bs);
  ctx.lineTo(bx + fuseLen * 0.5, by - bs - fuseLen);
  ctx.stroke();

  // Fuse spark
  if (fuseRatio > 0) {
    const sparkX = bx + fuseLen * 0.5;
    const sparkY = by - bs - fuseLen;
    const flicker = Math.sin(time * 20) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 150, 0, ${flicker})`;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, s(5) * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 100, ${flicker * 0.8})`;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, s(3) * flicker, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warning text when fuse is low
  if (bomb.fuseLeft < 1.5 && bomb.fuseLeft > 0) {
    const blink = Math.sin(time * 15) > 0;
    if (blink) {
      ctx.fillStyle = '#ff4444';
      ctx.font = `bold ${s(16)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚠️', bx, by - bs - s(25));
    }
  }
}

// --- Explosion drawing ---
function drawExplosion(exp, time) {
  const progress = exp.timer / 0.8; // 0.8s animation
  if (progress > 1) return;

  const maxR = exp.maxRadius;
  const r = maxR * Math.min(progress * 2, 1);
  const alpha = 1 - progress;

  // Outer blast
  const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, r);
  grad.addColorStop(0, `rgba(255, 200, 50, ${alpha * 0.8})`);
  grad.addColorStop(0.3, `rgba(255, 100, 0, ${alpha * 0.6})`);
  grad.addColorStop(0.6, `rgba(200, 50, 0, ${alpha * 0.3})`);
  grad.addColorStop(1, `rgba(100, 20, 0, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(exp.x, exp.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner flash
  if (progress < 0.3) {
    ctx.fillStyle = `rgba(255, 255, 200, ${(0.3 - progress) * 3})`;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Debris particles
  const numParticles = 12;
  for (let i = 0; i < numParticles; i++) {
    const angle = (i / numParticles) * Math.PI * 2 + progress * 2;
    const dist = r * (0.5 + progress * 0.8);
    const px = exp.x + Math.cos(angle) * dist;
    const py = exp.y + Math.sin(angle) * dist;
    const pSize = s(4) * (1 - progress);
    ctx.fillStyle = `rgba(255, ${100 + i * 10}, 0, ${alpha * 0.7})`;
    ctx.fillRect(px - pSize / 2, py - pSize / 2, pSize, pSize);
  }

  // Shockwave ring
  if (progress > 0.1 && progress < 0.6) {
    const ringAlpha = (0.6 - progress) * 2;
    ctx.strokeStyle = `rgba(255, 200, 100, ${ringAlpha})`;
    ctx.lineWidth = s(3);
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, r * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// --- Bird drawing ---
function drawBird(bird, time) {
  const bx = bird.x, by = bird.y;
  const bs = s(16);
  const wingFlap = Math.sin(time * 8 + bird.nx * 10) * 0.3;

  ctx.save();
  ctx.translate(bx, by);
  // Face direction of movement
  if (bird.vx < 0) ctx.scale(-1, 1);

  // Body
  ctx.fillStyle = bird.biting ? '#ff4444' : '#44aa44';
  ctx.beginPath();
  ctx.ellipse(0, 0, bs * 1.2, bs * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a7a2a';
  ctx.lineWidth = s(1);
  ctx.stroke();

  // Wing
  ctx.fillStyle = bird.biting ? '#cc3333' : '#338833';
  ctx.beginPath();
  ctx.ellipse(-bs * 0.2, -bs * 0.3, bs * 0.8, bs * 0.4, wingFlap, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(bs * 0.6, -bs * 0.2, bs * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bird.biting ? '#cc0000' : '#111';
  ctx.beginPath();
  ctx.arc(bs * 0.7, -bs * 0.2, bs * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.moveTo(bs * 1.1, -bs * 0.1);
  ctx.lineTo(bs * 1.6, bs * 0.05);
  ctx.lineTo(bs * 1.1, bs * 0.2);
  ctx.closePath();
  ctx.fill();

  // Bite indicator
  if (bird.biting) {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = s(2);
    ctx.beginPath();
    ctx.arc(0, 0, bs * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawLevelIndicator() {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `bold ${s(22)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`Level ${currentLevel + 1}`, W / 2, s(15));
}

// --- Title screen ---
function drawTitleScreen(time) {
  drawBackground();

  // Lamp emoji
  ctx.font = `${s(70)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💡', W / 2, H * 0.18);

  // Title
  ctx.fillStyle = '#ffe066';
  ctx.font = `bold ${s(52)}px sans-serif`;
  ctx.fillText('Light the Lamp', W / 2, H * 0.3);

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `${s(22)}px sans-serif`;
  ctx.fillText('Plug in & Light up!', W / 2, H * 0.38);

  // HuFamilyGame branding
  ctx.fillStyle = 'rgba(255,224,100,0.8)';
  ctx.font = `bold ${s(18)}px sans-serif`;
  ctx.fillText('HuFamilyGame', W / 2, H * 0.45);

  // Created by
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `${s(15)}px sans-serif`;
  ctx.fillText('Created by Kai and Ray', W / 2, H * 0.5);

  // Play button
  const bw = s(220), bh = s(70);
  const bx = W / 2 - bw / 2, by = H * 0.6;
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  roundRect(ctx, bx, by, bw, bh, s(15));
  ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.font = `bold ${s(34)}px sans-serif`;
  ctx.fillText('PLAY', W / 2, by + bh / 2);
  drawTitleScreen._btn = { x: bx, y: by, w: bw, h: bh };

  // Version
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `${s(14)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(VERSION, W / 2, H * 0.95);
}

function drawGameOverScreen() {
  ctx.fillStyle = `rgba(180, 30, 30, ${failAlpha * 0.5})`;
  ctx.fillRect(0, 0, W, H);
  if (failAlpha >= 0.8) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Different messages per fail reason
    let msg = '⚡ Wire Cut!';
    if (failReason === 'bomb') msg = '💥 Boom! Wire Destroyed!';
    else if (failReason === 'bird') msg = '🐦 Bird Bit the Wire!';

    ctx.fillStyle = '#ff6666';
    ctx.font = `bold ${s(44)}px sans-serif`;
    ctx.fillText(msg, W / 2, H * 0.38);

    const bw = s(220), bh = s(70);
    const bx = W / 2 - bw / 2, by = H * 0.52;
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe066';
    ctx.font = `bold ${s(56)}px sans-serif`;
    ctx.fillText('🎉 You did it!', W / 2, H * 0.45);
    if (currentLevel >= levels.length - 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${s(28)}px sans-serif`;
      ctx.fillText('You beat all levels! 🏆', W / 2, H * 0.55);
    }
  }
}

function drawSnappedWire() {
  if (!wireSnapPoint || wirePath.length < 2) return;
  const idx = wireSnapPoint.segIndex;
  ctx.strokeStyle = '#2d2d2d';
  ctx.lineWidth = s(7);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(wirePath[0].x, wirePath[0].y);
  for (let i = 1; i <= Math.min(idx + 1, wirePath.length - 1); i++) {
    ctx.lineTo(wirePath[i].x, wirePath[i].y);
  }
  ctx.stroke();
  // Spark
  const sp = wirePath[Math.min(idx + 1, wirePath.length - 1)];
  const sparkSize = s(15) * (1 + Math.sin(wireSnapTimer * 15) * 0.5);
  ctx.fillStyle = `rgba(255, 200, 50, ${0.8 - wireSnapTimer * 0.8})`;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, sparkSize, 0, Math.PI * 2);
  ctx.fill();
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

// ============================================================
// UPDATE FUNCTIONS
// ============================================================

function updateMovingKnives(dt) {
  for (const mk of movingKnives) {
    mk.x += mk.vx * dt;
    mk.y += mk.vy * dt;
    if (mk.x < mk.minX || mk.x > mk.maxX) mk.vx *= -1;
    if (mk.y < mk.minY || mk.y > mk.maxY) mk.vy *= -1;
    mk.x = Math.max(mk.minX, Math.min(mk.maxX, mk.x));
    mk.y = Math.max(mk.minY, Math.min(mk.maxY, mk.y));
  }
}

function updateBombs(dt, time) {
  for (const bomb of bombs) {
    if (bomb.exploded) continue;
    bomb.fuseLeft -= dt;
    if (bomb.fuseLeft <= 0) {
      bomb.exploded = true;
      bomb.explodeTimer = 0;
      // Create explosion
      const expRadius = nx(bomb.radius);
      explosions.push({ x: bomb.x, y: bomb.y, timer: 0, maxRadius: expRadius });
      // Check if wire is in blast radius
      const hitIdx = checkExplosionWire(bomb.x, bomb.y, expRadius);
      if (hitIdx >= 0 && state === 'playing') {
        state = 'gameover';
        wireSnapPoint = { segIndex: hitIdx };
        failReason = 'bomb';
        dragging = false;
      }
    }
  }
}

function updateBirds(dt, time) {
  for (const bird of birds) {
    // Random walk movement
    bird.frame += dt;
    if (bird.frame > 1.5) {
      bird.frame = 0;
      const angle = Math.random() * Math.PI * 2;
      bird.vx = Math.cos(angle) * bird.speed;
      bird.vy = Math.sin(angle) * bird.speed;
    }

    bird.x += nx(bird.vx) * dt;
    bird.y += ny(bird.vy) * dt;

    // Keep in bounds
    const margin = s(30);
    if (bird.x < margin) { bird.x = margin; bird.vx = Math.abs(bird.vx); }
    if (bird.x > W - margin) { bird.x = W - margin; bird.vx = -Math.abs(bird.vx); }
    if (bird.y < margin) { bird.y = margin; bird.vy = Math.abs(bird.vy); }
    if (bird.y > H - margin) { bird.y = H - margin; bird.vy = -Math.abs(bird.vy); }

    // Try to bite wire
    bird.biting = false;
    if (wirePath.length > 3) {
      // Move toward nearest wire point sometimes
      let nearestDist = Infinity, nearestPt = null;
      for (let i = 0; i < wirePath.length; i++) {
        const d = Math.hypot(wirePath[i].x - bird.x, wirePath[i].y - bird.y);
        if (d < nearestDist) { nearestDist = d; nearestPt = wirePath[i]; }
      }
      // If close to wire, move toward it aggressively
      if (nearestPt && nearestDist < nx(0.2)) {
        const dx = nearestPt.x - bird.x, dy = nearestPt.y - bird.y;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
          bird.x += (dx / len) * nx(bird.speed) * dt * 1.5;
          bird.y += (dy / len) * ny(bird.speed) * dt * 1.5;
        }
      }

      // Bite check
      const biteIdx = checkBirdBite(bird);
      if (biteIdx >= 0) {
        bird.biting = true;
        bird.biteTimer += dt;
        if (bird.biteTimer > 0.8 && state === 'playing') {
          state = 'gameover';
          wireSnapPoint = { segIndex: Math.max(0, biteIdx - 1) };
          failReason = 'bird';
          dragging = false;
        }
      } else {
        bird.biteTimer = 0;
      }
    }
  }
}

function updateExplosions(dt) {
  for (const exp of explosions) {
    exp.timer += dt;
  }
  // Remove old explosions
  for (let i = explosions.length - 1; i >= 0; i--) {
    if (explosions[i].timer > 1) explosions.splice(i, 1);
  }
}

// ============================================================
// INPUT
// ============================================================

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
  const last = wirePath[wirePath.length - 1];
  if (dist(last, pos) > s(5)) {
    wirePath.push({ x: pos.x, y: pos.y });
  }
  // Check knife collision
  const hit = checkAllCollisions();
  if (hit) {
    state = 'gameover';
    wireSnapPoint = hit;
    failReason = 'knife';
    dragging = false;
    return;
  }
  // Check socket
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

// ============================================================
// MAIN GAME LOOP
// ============================================================

let lastTime = 0;
function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  gameTime += dt;

  resize();
  drawBackground();

  if (state === 'title') {
    drawTitleScreen(time / 1000);
  } else if (state === 'playing') {
    const level = levels[currentLevel];
    const lampPos = getLampPos(level);

    // Update dynamic entities
    updateMovingKnives(dt);
    updateBombs(dt, time / 1000);
    updateBirds(dt, time / 1000);
    updateExplosions(dt);

    // Draw
    drawLamp(nx(lampPos.x), ny(lampPos.y), lampGlow);
    drawSocket(nx(level.socket.x), ny(level.socket.y));
    level.knives.forEach(k => drawKnife(k, false));
    movingKnives.forEach(mk => drawKnife(mk, true));
    bombs.forEach(b => drawBomb(b, time / 1000));
    explosions.forEach(exp => drawExplosion(exp, time / 1000));
    birds.forEach(b => drawBird(b, time / 1000));
    drawWire();
    drawPlug(plugPos.x, plugPos.y);
    drawLevelIndicator();

    // Pulsing hint when not dragging
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
    const lampPos = getLampPos(level);

    updateExplosions(dt);

    drawLamp(nx(lampPos.x), ny(lampPos.y), 0);
    drawSocket(nx(level.socket.x), ny(level.socket.y));
    level.knives.forEach(k => drawKnife(k, false));
    movingKnives.forEach(mk => drawKnife(mk, false));
    bombs.forEach(b => drawBomb(b, time / 1000));
    explosions.forEach(exp => drawExplosion(exp, time / 1000));
    birds.forEach(b => drawBird(b, time / 1000));
    drawSnappedWire();
    drawLevelIndicator();

    failAlpha = Math.min(failAlpha + dt * 2, 1);
    wireSnapTimer = Math.min(wireSnapTimer + dt, 1);
    drawGameOverScreen();
  } else if (state === 'levelcomplete') {
    const level = levels[currentLevel];
    const lampPos = getLampPos(level);

    lampGlow = Math.min(lampGlow + dt * 2, 1);
    winAlpha = Math.min(winAlpha + dt * 1.5, 1);

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
          currentLevel++;
          initLevel();
        } else {
          state = 'title';
        }
      }, 1200);
    }
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
