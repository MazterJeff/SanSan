/* SanSan — rebuilt from light */
const CONFIG = {
  // The day it all started, e.g. "2023-05-20". Leave null to show ∞.
  since: null,
};

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
const TAGS = { eyeL: "01 瞳", eyeR: "02 瞳", tip: "03 鼻", lipU: "04 唇" };

/* ---------------- RECONSTRUCTION ---------------- */
const canvas = $("#recon");
const ctx = canvas.getContext("2d");
const img = $("#photo");
const pctEl = $("#pct"), barEl = $("#bar"), statusEl = $("#statusText"), countEl = $("#count");

let W = 0, H = 0, DPR = 1, cell = 6;
let photo, mosaic;            // offscreen canvases
let dots = [];                // { x, y, sx, sy, r, b, delay }
let buckets = 6;
let hasPixels = true;
let t0 = 0, done = false;
const pointer = { x: 0, y: 0, in: false };
let glitchUntil = 0, nextGlitch = 0, glitchSlices = [];

const T = { dots: 2000, meshIn: 1300, scanStart: 2200, scanDur: 2200, meshOut: 4700 };

function offscreen(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

function build() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth;
  H = W * IMG_H / IMG_W;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // the photo, with a faint cool grade
  photo = offscreen(canvas.width, canvas.height);
  const p = photo.getContext("2d");
  p.drawImage(img, 0, 0, photo.width, photo.height);
  p.globalCompositeOperation = "soft-light";
  p.fillStyle = "rgba(26,167,232,.18)";
  p.fillRect(0, 0, photo.width, photo.height);

  // blocky version for the scan band
  cell = Math.max(5, Math.round(W / 92));
  const cols = Math.floor(W / cell), rows = Math.floor(H / cell);
  mosaic = offscreen(cols, rows);
  mosaic.getContext("2d").drawImage(photo, 0, 0, cols, rows);

  // sample brightness → halftone particles
  dots = [];
  try {
    const data = mosaic.getContext("2d").getImageData(0, 0, cols, rows).data;
    let lo = 1, hi = 0;
    const lum = new Float32Array(cols * rows);
    for (let i = 0; i < lum.length; i++) {
      const l = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
      lum[i] = l; lo = Math.min(lo, l); hi = Math.max(hi, l);
    }
    const cx = W * .5, cy = H * .4, maxD = Math.hypot(W, H) * .6;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const d = 1 - (lum[j * cols + i] - lo) / (hi - lo || 1);   // darkness 0..1
      const x = (i + .5) * cell, y = (j + .5) * cell;
      const a = rand(0, Math.PI * 2), far = rand(.5, 1.1) * maxD * 1.4;
      dots.push({
        x, y,
        sx: cx + Math.cos(a) * far, sy: cy + Math.sin(a) * far,
        r: cell * .5 * (0.14 + 0.86 * Math.pow(d, .85)),
        b: Math.min(buckets - 1, Math.floor(d * buckets)),
        delay: (Math.hypot(x - cx, y - cy) / maxD) * 700 + rand(0, 300),
      });
    }
    hasPixels = true;
  } catch {
    // file:// pages can't read pixels; skip straight to the scan
    hasPixels = false;
  }
  countEl.textContent = hasPixels ? `${dots.length.toLocaleString()} PARTICLES` : "— PARTICLES";
}

const bucketColor = (b) => {
  const k = b / (buckets - 1);
  const c = ZIMA.map((z, i) => Math.round(z + (INDIGO[i] - z) * k));
  return `rgb(${c})`;
};

function drawDots(progressAt, clipFn) {
  for (let b = 0; b < buckets; b++) {
    ctx.fillStyle = bucketColor(b);
    ctx.beginPath();
    for (const d of dots) {
      if (d.b !== b) continue;
      const k = Math.min(1, progressAt(d));
      if (k <= 0) continue;
      const e = easeOut(k);
      const x = d.sx + (d.x - d.sx) * e, y = d.sy + (d.y - d.sy) * e;
      if (clipFn && !clipFn(x, y)) continue;
      const r = d.r * (0.4 + 0.6 * e);
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

function drawMesh(alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(26,167,232,.75)";
  ctx.lineWidth = .7;
  ctx.beginPath();
  for (const [a, b] of EDGES) {
    ctx.moveTo(LM[a][0] * W, LM[a][1] * H);
    ctx.lineTo(LM[b][0] * W, LM[b][1] * H);
  }
  ctx.stroke();
  ctx.fillStyle = "#2b2f8f";
  for (const k in LM) ctx.fillRect(LM[k][0] * W - 1.5, LM[k][1] * H - 1.5, 3, 3);
  ctx.font = `${Math.max(9, W / 56)}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = "#2b2f8f";
  for (const k in TAGS) ctx.fillText(TAGS[k], LM[k][0] * W + 6, LM[k][1] * H - 6);
  ctx.restore();
}

function drawPhotoRows(y0, y1) {
  y0 = Math.max(0, y0); y1 = Math.min(H, y1);
  if (y1 <= y0) return;
  ctx.drawImage(photo, 0, y0 * DPR, photo.width, (y1 - y0) * DPR, 0, y0, W, y1 - y0);
}

function drawMosaicRows(y0, y1) {
  y0 = Math.max(0, y0); y1 = Math.min(H, y1);
  if (y1 <= y0) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.beginPath(); ctx.rect(0, y0, W, y1 - y0); ctx.clip();
  ctx.drawImage(mosaic, 0, 0, mosaic.width * cell, mosaic.height * cell);
  ctx.restore();
}

function glitch(y0, y1, n, amp) {
  for (let i = 0; i < n; i++) {
    const y = rand(y0, y1), h = rand(2, 10), dx = rand(-amp, amp);
    ctx.drawImage(photo, 0, y * DPR, photo.width, h * DPR, dx, y, W, h);
    ctx.fillStyle = "rgba(26,167,232,.18)";
    ctx.fillRect(0, y, W, h);
  }
}

function setProgress(p) {
  const v = Math.round(p * 100);
  pctEl.textContent = String(v).padStart(3, "0");
  barEl.style.width = v + "%";
}

function frame(now) {
  const t = now - t0;
  ctx.clearRect(0, 0, W, H);

  if (!done) {
    const dotsK = hasPixels ? clamp01(t / T.dots) : 1;
    const scanK = clamp01((t - (hasPixels ? T.scanStart : 300)) / T.scanDur);
    const scanY = easeInOut(scanK) * (H + 40);

    // revealed photo above the scan line, a blocky band at the line
    drawPhotoRows(0, scanY - 40);
    if (scanK > 0 && scanK < 1) {
      drawMosaicRows(scanY - 40, scanY);
      glitch(scanY - 50, scanY, 3, 14);
    }
    // particles still waiting below the line
    if (hasPixels) drawDots((d) => (t - d.delay) / 1100, (x, y) => y > scanY - 4);

    // scan line
    if (scanK > 0 && scanK < 1) {
      const g = ctx.createLinearGradient(0, scanY - 60, 0, scanY);
      g.addColorStop(0, "rgba(26,167,232,0)");
      g.addColorStop(1, "rgba(26,167,232,.22)");
      ctx.fillStyle = g; ctx.fillRect(0, scanY - 60, W, 60);
      ctx.fillStyle = "#1aa7e8"; ctx.fillRect(0, scanY, W, 1);
    }

    const meshA = hasPixels
      ? Math.min(clamp01((t - T.meshIn) / 500), 1 - clamp01((t - T.meshOut) / 900))
      : 1 - clamp01((t - 2600) / 900);
    drawMesh(meshA);

    const p = hasPixels ? dotsK * .35 + scanK * .65 : scanK;
    setProgress(p);
    statusEl.textContent = scanK > 0 ? "RECONSTRUCTING — 再構成中" : "COLLECTING LIGHT — 光を集めています";
    if (scanK >= 1 && meshA <= 0) finish(now);
  } else {
    ctx.drawImage(photo, 0, 0, W, H);
    // a rare, quiet glitch
    if (now > nextGlitch) {
      glitchUntil = now + 140;
      nextGlitch = now + rand(4000, 8000);
      const y = rand(H * .1, H * .9);
      glitchSlices = Array.from({ length: 3 }, () => [y + rand(-30, 30), rand(2, 8), rand(-10, 10)]);
    }
    if (now < glitchUntil) {
      for (const [y, h, dx] of glitchSlices) {
        ctx.drawImage(photo, 0, y * DPR, photo.width, h * DPR, dx, y, W, h);
        ctx.fillStyle = "rgba(26,167,232,.2)"; ctx.fillRect(0, y, W, h);
      }
    }
    if (pointer.in) lens();
  }
  requestAnimationFrame(frame);
}

function lens() {
  const R = W * .14, { x, y } = pointer;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#fff"; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  if (hasPixels) drawDots(() => 1, (dx, dy) => Math.abs(dx - x) < R + cell && Math.abs(dy - y) < R + cell);
  else drawMosaicRows(y - R, y + R);
  ctx.restore();
  ctx.strokeStyle = "#1aa7e8"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - R - 8, y); ctx.lineTo(x - R + 6, y);
  ctx.moveTo(x + R - 6, y); ctx.lineTo(x + R + 8, y);
  ctx.moveTo(x, y - R - 8); ctx.lineTo(x, y - R + 6);
  ctx.moveTo(x, y + R - 6); ctx.lineTo(x, y + R + 8);
  ctx.stroke();
  ctx.font = `10px "IBM Plex Mono", monospace`;
  ctx.fillStyle = "#2b2f8f";
  ctx.fillText(`x ${(x / W).toFixed(3)}  y ${(y / H).toFixed(3)}`, x + R * .72 + 6, y + R * .72 + 12);
}

function finish(now) {
  done = true;
  setProgress(1);
  statusEl.textContent = "RECONSTRUCTION COMPLETE — 再構成完了";
  $(".hint").classList.add("show");
  nextGlitch = now + 2500;
}

function start() {
  build();
  if (reduceMotion) { finish(performance.now()); }
  t0 = performance.now();
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
  resizeTimer = setTimeout(() => { if (canvas.clientWidth !== W) build(); }, 150);
});

if (img.complete && img.naturalWidth) start();
else img.addEventListener("load", start, { once: true });

/* ---------------- REVEAL ---------------- */
const io = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
}, { threshold: .2 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ---------------- DAYS ---------------- */
if (CONFIG.since) {
  const start = new Date(CONFIG.since).getTime();
  if (!Number.isNaN(start)) $("#days").textContent = Math.max(0, Math.floor((Date.now() - start) / 86400000)).toLocaleString();
}

/* ---------------- ZIMA ---------------- */
const zima = $("#zima");
zima.addEventListener("click", () => {
  zima.classList.add("on");
  zima.classList.remove("ripple");
  void zima.offsetWidth;
  zima.classList.add("ripple");
});
