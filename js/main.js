/* SanSan — rebuilt from light, as light */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const IMG_W = 1159, IMG_H = 1283;
const ZIMA = [26, 167, 232], INDIGO = [43, 47, 143];

// Face landmarks, normalized to the photo (traced by hand).
const LM = {
  browL: [.315, .175], fore: [.50, .15], browR: [.733, .148],
  eyeLo: [.217, .236], eyeL: [.315, .244], eyeLi: [.403, .246],
  eyeRi: [.647, .235], eyeR: [.709, .214], eyeRo: [.828, .201],
  bridge: [.604, .320], tip: [.578, .507], nosL: [.535, .511], nosR: [.611, .508],
  mouthL: [.414, .602], lipU: [.543, .585], mouthR: [.657, .590], lipD: [.526, .641],
  chin: [.526, .762],
  jL1: [.168, .281], jL2: [.181, .475], jL3: [.267, .655], jL4: [.371, .729],
  jR1: [.835, .304], jR2: [.811, .460], jR3: [.733, .631], jR4: [.656, .701],
};
const EDGES = (
  "jL1-jL2 jL2-jL3 jL3-jL4 jL4-chin chin-jR4 jR4-jR3 jR3-jR2 jR2-jR1 " +
  "browL-fore fore-browR browL-eyeLo browL-eyeLi browR-eyeRi browR-eyeRo " +
  "eyeLo-eyeL eyeL-eyeLi eyeRi-eyeR eyeR-eyeRo jL1-eyeLo jR1-eyeRo jL1-browL jR1-browR " +
  "eyeLi-bridge eyeRi-bridge fore-bridge bridge-tip tip-nosL tip-nosR nosL-eyeLi nosR-eyeRi " +
  "nosL-lipU nosR-lipU mouthL-lipU lipU-mouthR mouthL-lipD lipD-mouthR lipD-chin " +
  "mouthL-jL3 mouthR-jR3 mouthL-jL4 mouthR-jR4 lipD-jL4 lipD-jR4 nosL-jL2 nosR-jR2 " +
  "eyeLo-jL2 eyeRo-jR2 nosL-mouthL nosR-mouthR"
).split(" ").map((e) => e.split("-"));

/* ---------------- RECONSTRUCTION ---------------- */
// Her photo lives here only as a brightness grid (js/dots.js), drawn as
// halftone dots. The original image is never shown.
const canvas = $("#recon");
const ctx = canvas.getContext("2d");
const barEl = $("#bar");
const GRID = window.SANSAN_DOTS;
const LUM = Uint8Array.from(atob(GRID.data), (c) => c.charCodeAt(0));
const BUCKETS = 7;
const COLORS = Array.from({ length: BUCKETS }, (_, b) => {
  const k = b / (BUCKETS - 1);
  return `rgb(${ZIMA.map((z, i) => Math.round(z + (INDIGO[i] - z) * k))})`;
});

let W = 0, H = 0, cell = 4;
let dots = [];     // { x, y, sx, sy, r, b, delay }
let t0 = 0, done = false;
const pointer = { x: 0, y: 0, in: false, k: 0 };   // k eases the lens in/out
let glitch = null, nextGlitch = 0, nextSweep = 0, sweepStart = -1;

const T = { fly: 1100, meshIn: 1300, scanStart: 2100, scanDur: 2000, meshOut: 4300 };
const SWEEP_MS = 1800;

function build() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth;
  H = W * IMG_H / IMG_W;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cell = W / GRID.cols;
  const cx = W * .5, cy = H * .4, maxD = Math.hypot(W, H) * .6;
  dots = [];
  for (let j = 0; j < GRID.rows; j++) for (let i = 0; i < GRID.cols; i++) {
    const d = 1 - LUM[j * GRID.cols + i] / 255;   // darkness 0..1
    const x = (i + .5) * cell, y = (j + .5) * cell;
    const a = rand(0, Math.PI * 2), far = rand(.7, 1.5) * maxD;
    dots.push({
      x, y,
      sx: cx + Math.cos(a) * far, sy: cy + Math.sin(a) * far,
      r: cell * .5 * (0.1 + 0.9 * Math.pow(d, .9)),
      b: Math.min(BUCKETS - 1, Math.floor(d * BUCKETS)),
      delay: (Math.hypot(x - cx, y - cy) / maxD) * 700 + rand(0, 300),
    });
  }
}

function render(now) {
  const t = now - t0;
  ctx.clearRect(0, 0, W, H);

  // intro state
  const scanK = done ? 1 : clamp01((t - T.scanStart) / T.scanDur);
  const scanY = done ? Infinity : easeInOut(scanK) * (H + 20);

  // idle effects
  const sweepK = sweepStart < 0 ? -1 : (now - sweepStart) / SWEEP_MS;
  const sweepY = sweepK >= 0 && sweepK <= 1 ? easeInOut(sweepK) * (H + 80) - 40 : -1e9;
  const g = glitch && now < glitch.until ? glitch : null;
  pointer.k += ((pointer.in ? 1 : 0) - pointer.k) * .15;
  const R = W * .14, R2 = R * R;

  for (let b = -1; b < BUCKETS; b++) {
    // pass -1: dots still waiting below the scan line, drawn as a plain grid
    ctx.fillStyle = b < 0 ? "rgba(26,167,232,.55)" : COLORS[b];
    ctx.beginPath();
    for (const d of dots) {
      const locked = d.y < scanY;
      if (b < 0 ? locked : (!locked || d.b !== b)) continue;

      let x = d.x, y = d.y, r = locked ? d.r : d.r * .55 + cell * .06;
      if (!done) {
        const k = clamp01((t - d.delay) / T.fly);
        if (k <= 0) continue;
        const e = easeOut(k);
        x = d.sx + (d.x - d.sx) * e;
        y = d.sy + (d.y - d.sy) * e;
        r *= 0.4 + 0.6 * e;
      }
      if (g && y > g.y0 && y < g.y1) x += g.dx;
      const dy = y - sweepY;
      if (dy > -40 && dy < 40) r *= 1 + .45 * (1 - Math.abs(dy) / 40);
      if (pointer.k > .01) {
        const px = x - pointer.x, py = y - pointer.y, q = px * px + py * py;
        if (q < R2) {
          const dist = Math.sqrt(q) || 1, f = (1 - dist / R) ** 2 * pointer.k;
          x += (px / dist) * f * R * .22;
          y += (py / dist) * f * R * .22;
          r *= 1 + f * .6;
        }
      }
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  if (!done) {
    // scan line
    if (scanK > 0 && scanK < 1) {
      const grad = ctx.createLinearGradient(0, scanY - 60, 0, scanY);
      grad.addColorStop(0, "rgba(26,167,232,0)");
      grad.addColorStop(1, "rgba(26,167,232,.16)");
      ctx.fillStyle = grad; ctx.fillRect(0, scanY - 60, W, 60);
      ctx.fillStyle = "#1aa7e8"; ctx.fillRect(0, scanY, W, 1);
    }
    drawMesh(Math.min(clamp01((t - T.meshIn) / 500), 1 - clamp01((t - T.meshOut) / 900)));
    barEl.style.width = Math.round((clamp01(t / (T.fly + 1000)) * .35 + scanK * .65) * 100) + "%";
    if (scanK >= 1 && t > T.meshOut + 900) finish(now);
  } else if (sweepY > -1e8) {
    ctx.fillStyle = "rgba(26,167,232,.5)";
    ctx.fillRect(0, sweepY, W, 1);
  }
}

function drawMesh(alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(43,47,143,.6)";
  ctx.lineWidth = .7;
  ctx.beginPath();
  for (const [a, b] of EDGES) {
    ctx.moveTo(LM[a][0] * W, LM[a][1] * H);
    ctx.lineTo(LM[b][0] * W, LM[b][1] * H);
  }
  ctx.stroke();
  ctx.fillStyle = "#2b2f8f";
  for (const k in LM) ctx.fillRect(LM[k][0] * W - 1.5, LM[k][1] * H - 1.5, 3, 3);
  ctx.restore();
}

function finish(now) {
  done = true;
  barEl.style.width = "100%";
  nextGlitch = now + rand(3000, 6000);
  nextSweep = now + 2500;
}

// Redraw only while something is moving; a still portrait costs nothing.
let lastDrawn = false;
function frame(now) {
  if (done) {
    if (now > nextSweep && sweepStart < 0) sweepStart = now;
    if (sweepStart >= 0 && now - sweepStart > SWEEP_MS) { sweepStart = -1; nextSweep = now + rand(6000, 9000); }
    if (now > nextGlitch) {
      const y0 = rand(H * .1, H * .85);
      glitch = { y0, y1: y0 + rand(6, 22), dx: rand(-12, 12), until: now + 140 };
      nextGlitch = now + rand(4000, 8000);
    }
  }
  const moving = !done || sweepStart >= 0 || (glitch && now < glitch.until + 20) || pointer.in || pointer.k > .01;
  if (moving || !lastDrawn) render(now);
  lastDrawn = !moving;
  requestAnimationFrame(frame);
}

function start() {
  build();
  t0 = performance.now();
  if (reduceMotion) finish(t0 + 1e9);
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.in = true;
});
canvas.addEventListener("pointerleave", () => (pointer.in = false));
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (canvas.clientWidth !== W) { build(); lastDrawn = false; } }, 150);
});

start();

/* ---------------- REVEAL ---------------- */
const io = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
}, { threshold: .2 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ---------------- ZIMA ---------------- */
const zima = $("#zima");
zima.addEventListener("click", () => {
  zima.classList.add("on");
  zima.classList.remove("ripple");
  void zima.offsetWidth;
  zima.classList.add("ripple");
});
