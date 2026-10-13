/* ==========================================================
   SANSAN.SYS
   ========================================================== */
const CONFIG = {
  // The day it all started — set this to make the TIME SYNCED clock count up.
  // Format: "YYYY-MM-DDTHH:MM:SS". Leave null to show ∞.
  since: null,
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------------- BOOT ---------------- */
const BOOT_LINES = [
  "> SANSAN.SYS 起動中 …",
  "> loading memory archive ........ 10,797 files",
  "> calibrating heart ............. OK",
  "> tracing contour ............... 瞳 · 前髪 · 唇",
  "> encrypting with 愛 ............ OK",
  "> 接続完了 — CONNECTION ESTABLISHED",
];

function boot() {
  const box = $("#boot");
  const log = $("#boot-log");
  const bar = $(".boot-bar i");
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    box.classList.add("done");
    document.body.classList.remove("booting");
    startHero();
  };
  if (reduceMotion) return finish();
  box.addEventListener("click", finish);
  let i = 0;
  const next = () => {
    if (done) return;
    if (i >= BOOT_LINES.length) return setTimeout(finish, 450);
    log.textContent += (i ? "\n" : "") + BOOT_LINES[i];
    i++;
    bar.style.width = (i / BOOT_LINES.length) * 100 + "%";
    setTimeout(next, i === BOOT_LINES.length ? 380 : rand(220, 360));
  };
  setTimeout(next, 300);
}

/* ---------------- PORTRAIT ---------------- */
const svg = $("#portrait");
const DRAW_ORDER = { face: 0, lid: 0.7, lower: 0.9, crease: 1.1, hair: 1.3, strand: 1.9, brow: 2.4, soft: 2.5, lip: 2.6, "blush-ln": 3.3 };

function prepPortrait() {
  $$(".ln", svg).forEach((p) => {
    const len = Math.ceil(p.getTotalLength()) + 2;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = reduceMotion ? 0 : len;
    const key = Object.keys(DRAW_ORDER).find((k) => p.classList.contains(k)) ?? "soft";
    const delay = DRAW_ORDER[key] + rand(0, 0.5);
    const dur = Math.min(2.2, 0.6 + len / 900);
    p.style.transition = `stroke-dashoffset ${dur}s cubic-bezier(.65,0,.35,1) ${delay}s`;
  });
}

function startHero() {
  requestAnimationFrame(() => {
    $$(".ln", svg).forEach((p) => (p.style.strokeDashoffset = 0));
    svg.classList.add("drawn");
  });
  $$(".hero .reveal").forEach((el) => el.classList.add("in"));
  const lockText = $("#lockText");
  const lock = $(".lock");
  setTimeout(() => (lockText.textContent = "CONTOUR TRACE 100% · 輪郭完了"), reduceMotion ? 0 : 2600);
  setTimeout(() => {
    svg.classList.add("locked");
    lock.classList.add("on");
    lockText.textContent = "TARGET LOCKED — 世界で一番かわいい";
    $("#syncBar").style.width = "100%";
    countTo($("#syncPct"), 100, 3500, "%");
  }, reduceMotion ? 0 : 4200);
  if (!reduceMotion) scheduleBlink();
}

function scheduleBlink() {
  setTimeout(() => {
    svg.classList.add("blink");
    setTimeout(() => svg.classList.remove("blink"), 140);
    // occasional double blink
    if (Math.random() < 0.25) setTimeout(() => {
      svg.classList.add("blink");
      setTimeout(() => svg.classList.remove("blink"), 120);
    }, 300);
    scheduleBlink();
  }, rand(2600, 5600));
}

function countTo(el, target, ms, suffix = "") {
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* parallax + gaze: she looks toward you */
const layers = $$(".layer", svg);
const gazes = $$(".gaze", svg);
let pointer = { x: 0, y: 0, inside: false };

function onPointer(e) {
  const r = svg.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * 0.42;
  pointer.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
  pointer.y = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
  pointer.inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
  if (reduceMotion) return;
  layers.forEach((l) => {
    const d = parseFloat(l.dataset.depth);
    l.style.transform = `translate(${pointer.x * d * 18}px, ${pointer.y * d * 12}px)`;
  });
  gazes.forEach((g) => (g.style.transform = `translate(${pointer.x * 9}px, ${pointer.y * 6}px)`));
}
window.addEventListener("pointermove", onPointer, { passive: true });

/* ---------------- ECG ---------------- */
function ecg() {
  const c = $("#ecg");
  const ctx = c.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = 300, H = 70;
  c.width = W * dpr; c.height = H * dpr;
  ctx.scale(dpr, dpr);
  const bpmEl = $("#bpm"), note = $("#bpmNote");
  const pts = new Array(W).fill(H / 2);
  let phase = 0, bpm = 72, last = performance.now();

  // one heartbeat waveform, x in [0,1)
  const wave = (x) => {
    if (x < 0.10) return Math.sin(x / 0.10 * Math.PI) * 4;            // P
    if (x < 0.16) return 0;
    if (x < 0.18) return -6;                                          // Q
    if (x < 0.22) return 28;                                          // R
    if (x < 0.25) return -10;                                         // S
    if (x < 0.40) return 0;
    if (x < 0.55) return Math.sin((x - 0.40) / 0.15 * Math.PI) * 7;   // T
    return 0;
  };
  // the R-peak, drawn as a little heart blip when she's near
  const frame = (t) => {
    const dt = (t - last) / 1000; last = t;
    const target = pointer.inside ? 128 : 72 + Math.sin(t / 2400) * 3;
    bpm += (target - bpm) * Math.min(1, dt * 1.5);
    bpmEl.textContent = Math.round(bpm);
    note.textContent = pointer.inside ? "心拍上昇 ♥" : "";
    const speed = 2;
    for (let s = 0; s < speed; s++) {
      phase = (phase + bpm / 60 / 60 / speed) % 1;
      pts.shift();
      pts.push(H / 2 - wave(phase) + rand(-.6, .6));
    }
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,229,255,.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "rgba(0,229,255,0)");
    g.addColorStop(.7, "rgba(0,229,255,.9)");
    g.addColorStop(1, pointer.inside ? "#ff7ab8" : "#ffffff");
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 8;
    ctx.beginPath();
    pts.forEach((y, x) => (x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.shadowBlur = 0;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ---------------- SKY: stars, petals, grid, hearts ---------------- */
const sky = $("#sky");
const sctx = sky.getContext("2d");
let SW, SH, SDPR;
const stars = [], petals = [], hearts = [], streams = [];
const KATA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン愛恋光夢";

function resizeSky() {
  SDPR = Math.min(2, window.devicePixelRatio || 1);
  SW = window.innerWidth; SH = window.innerHeight;
  sky.width = SW * SDPR; sky.height = SH * SDPR;
  sctx.setTransform(SDPR, 0, 0, SDPR, 0, 0);
  stars.length = 0;
  const n = Math.round((SW * SH) / 6000);
  for (let i = 0; i < n; i++) stars.push({ x: rand(0, SW), y: rand(0, SH), r: rand(.3, 1.4), p: rand(0, 6.28), s: rand(.5, 2) });
  if (!petals.length && !reduceMotion) for (let i = 0; i < Math.round(SW / 38); i++) petals.push(newPetal());
  streams.length = 0;
  const cols = SW < 700 ? 2 : Math.max(4, Math.round(SW / 160));
  for (let i = 0; i < cols; i++) {
    // keep code rain to the edges so the center stays clean
    const edge = i % 2 ? rand(0, SW * 0.18) : rand(SW * 0.82, SW);
    streams.push({ x: edge, y: rand(-SH, SH), v: rand(30, 70), len: Math.round(rand(6, 16)), chars: [] });
  }
}

function newPetal(top = false) {
  return {
    x: rand(-50, SW + 50), y: top ? rand(-60, -10) : rand(0, SH),
    s: rand(5, 11), vx: rand(-14, 6), vy: rand(14, 34),
    rot: rand(0, 6.28), vr: rand(-1.2, 1.2), sway: rand(0, 6.28),
    pink: Math.random() < 0.18, a: rand(.35, .85),
  };
}

function drawPetal(p) {
  sctx.save();
  sctx.translate(p.x, p.y);
  sctx.rotate(p.rot);
  sctx.scale(1, Math.abs(Math.cos(p.sway)) * .7 + .3);
  const s = p.s;
  sctx.beginPath();
  sctx.moveTo(0, -s);
  sctx.bezierCurveTo(s * .9, -s * .7, s * .7, s * .6, 0, s);
  sctx.bezierCurveTo(-s * .7, s * .6, -s * .9, -s * .7, -s * .18, -s * .82);
  sctx.lineTo(0, -s * .6);
  sctx.closePath();
  const c = p.pink ? "255,150,200" : "150,215,255";
  sctx.fillStyle = `rgba(${c},${p.a * .55})`;
  sctx.strokeStyle = `rgba(${c},${p.a})`;
  sctx.lineWidth = .8;
  sctx.shadowColor = p.pink ? "#ff7ab8" : "#00e5ff";
  sctx.shadowBlur = 8;
  sctx.fill(); sctx.stroke();
  sctx.restore();
}

function heartPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * .35);
  ctx.bezierCurveTo(-s * 1.1, -s * .35, -s * .45, -s * 1.15, 0, -s * .45);
  ctx.bezierCurveTo(s * .45, -s * 1.15, s * 1.1, -s * .35, 0, s * .35);
  ctx.closePath();
}

function burst(x, y, n = 14, power = 1) {
  if (reduceMotion) return;
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), v = rand(60, 220) * power;
    hearts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * power, s: rand(5, 13) * Math.sqrt(power), life: 0, max: rand(1.1, 2.2), pink: Math.random() < .55, rot: rand(-.5, .5) });
  }
}

let lastT = performance.now();
function skyFrame(t) {
  const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
  sctx.clearRect(0, 0, SW, SH);

  // stars
  for (const s of stars) {
    const a = .25 + .75 * (0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p));
    sctx.fillStyle = `rgba(205,238,255,${a * .8})`;
    sctx.fillRect(s.x, s.y, s.r, s.r);
  }

  // katakana code rain at the edges
  sctx.font = "14px 'Share Tech Mono', monospace";
  for (const st of streams) {
    st.y += st.v * dt;
    if (st.y - st.len * 18 > SH) { st.y = rand(-200, 0); }
    for (let k = 0; k < st.len; k++) {
      if (!st.chars[k] || Math.random() < .02) st.chars[k] = KATA[(Math.random() * KATA.length) | 0];
      const a = (1 - k / st.len) * .22;
      sctx.fillStyle = k === 0 ? `rgba(220,250,255,.45)` : `rgba(0,229,255,${a})`;
      sctx.fillText(st.chars[k], st.x, st.y - k * 18);
    }
  }

  // perspective grid floor, fades as you scroll away
  const fade = Math.max(.15, 1 - window.scrollY / (SH * 1.2));
  const horizon = SH * .72;
  const gTop = horizon, gH = SH - horizon;
  sctx.save();
  sctx.globalAlpha = .55 * fade;
  const grad = sctx.createLinearGradient(0, gTop, 0, SH);
  grad.addColorStop(0, "rgba(0,229,255,0)");
  grad.addColorStop(1, "rgba(0,229,255,.55)");
  sctx.strokeStyle = grad;
  sctx.lineWidth = 1;
  const vx = SW / 2;
  for (let i = -24; i <= 24; i++) {
    sctx.beginPath();
    sctx.moveTo(vx + i * 12, gTop);
    sctx.lineTo(vx + i * SW / 10, SH);
    sctx.stroke();
  }
  const off = reduceMotion ? 0 : (t / 1000 * .35) % 1;
  for (let i = 0; i < 14; i++) {
    const z = (i + off) / 14;
    const y = gTop + gH * z * z;
    sctx.beginPath(); sctx.moveTo(0, y); sctx.lineTo(SW, y); sctx.stroke();
  }
  sctx.restore();

  // petals
  for (const p of petals) {
    p.sway += dt * 1.6;
    p.x += (p.vx + Math.sin(p.sway) * 18) * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.y > SH + 30 || p.x < -80 || p.x > SW + 80) Object.assign(p, newPetal(true));
    drawPetal(p);
  }

  // hearts
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.life += dt;
    if (h.life > h.max) { hearts.splice(i, 1); continue; }
    h.vy += 140 * dt; h.vx *= .985; h.vy *= .985;
    h.x += h.vx * dt; h.y += h.vy * dt;
    const a = 1 - h.life / h.max;
    sctx.save();
    sctx.translate(h.x, h.y); sctx.rotate(h.rot);
    heartPath(sctx, h.s);
    sctx.fillStyle = h.pink ? `rgba(255,122,184,${a * .8})` : `rgba(0,229,255,${a * .7})`;
    sctx.shadowColor = h.pink ? "#ff7ab8" : "#00e5ff"; sctx.shadowBlur = 14;
    sctx.fill();
    sctx.restore();
  }

  requestAnimationFrame(skyFrame);
}

/* clicks in the hero spill a few hearts */
$(".hero").addEventListener("click", (e) => {
  if (e.target.closest("a, button")) return;
  burst(e.clientX, e.clientY, 10, .7);
});

/* ---------------- SCROLL REVEAL + TYPEWRITER ---------------- */
function typewriter(el, speed) {
  return new Promise((res) => {
    const text = el.dataset.type;
    if (reduceMotion) { el.textContent = text; return res(); }
    el.classList.add("typing");
    let i = 0;
    const tick = () => {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i < text.length) {
        const ch = text[i - 1];
        setTimeout(tick, /[.,。、—]/.test(ch) ? speed * 9 : speed + rand(-8, 8));
      } else { el.classList.remove("typing"); res(); }
    };
    tick();
  });
}

const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    en.target.classList.add("in");
    io.unobserve(en.target);
    if (en.target.classList.contains("letter")) {
      const [enP, jpP] = $$(".type", en.target);
      typewriter(enP, 22).then(() => typewriter(jpP, 55));
    }
  }
}, { threshold: .25 });
$$("main .reveal").forEach((el) => io.observe(el));

/* ---------------- CLOCK ---------------- */
function clock() {
  if (!CONFIG.since) return;
  const start = new Date(CONFIG.since).getTime();
  if (Number.isNaN(start)) return;
  const cells = Object.fromEntries($$("#clock b").map((b) => [b.dataset.k, b]));
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    let s = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    cells.d.textContent = d;
    cells.h.textContent = pad(Math.floor(s / 3600));
    cells.m.textContent = pad(Math.floor((s % 3600) / 60));
    cells.s.textContent = pad(s % 60);
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------------- HEART SYNC (hold) ---------------- */
function heartSync() {
  const core = $("#core"), prog = $("#coreProg"), hint = $("#coreHint"), confess = $("#confess");
  const C = 2 * Math.PI * 88;
  let charge = 0, holding = false, synced = false, last = 0, raf = 0;

  const loop = (t) => {
    const dt = last ? (t - last) / 1000 : 0; last = t;
    charge = holding ? Math.min(1, charge + dt / 1.8) : Math.max(0, charge - dt * 1.2);
    prog.style.strokeDashoffset = C * (1 - charge);
    if (holding && Math.random() < charge * .5) {
      const r = core.getBoundingClientRect();
      burst(r.left + r.width / 2 + rand(-60, 60), r.top + r.height / 2 + rand(-60, 60), 1, .4);
    }
    if (charge >= 1 && !synced) return complete();
    if (holding || charge > 0) raf = requestAnimationFrame(loop);
    else last = 0;
  };
  const complete = () => {
    synced = true; holding = false;
    core.classList.remove("charging");
    core.classList.add("synced");
    const r = core.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    burst(x, y, 70, 2.2);
    setTimeout(() => burst(x, y, 40, 1.4), 220);
    hint.innerHTML = "同期完了<br /><span>HEARTS SYNCED · 100%</span>";
    confess.classList.add("show");
    for (let i = 0; i < 30; i++) petals.push(Object.assign(newPetal(true), { pink: true }));
  };
  const down = (e) => {
    e.preventDefault();
    if (synced) {
      const r = core.getBoundingClientRect();
      return burst(r.left + r.width / 2, r.top + r.height / 2, 30, 1.6);
    }
    holding = true;
    core.classList.add("charging");
    cancelAnimationFrame(raf); last = 0;
    raf = requestAnimationFrame(loop);
  };
  const up = () => {
    if (!holding) return;
    holding = false;
    core.classList.remove("charging");
  };
  core.addEventListener("pointerdown", down);
  window.addEventListener("pointerup", up);
  core.addEventListener("pointerleave", up);
  core.addEventListener("pointercancel", up);
  core.addEventListener("contextmenu", (e) => e.preventDefault());
  // keyboard: hold space / enter
  core.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) down(e); });
  core.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") up(); });
}

/* ---------------- INIT ---------------- */
prepPortrait();
resizeSky();
window.addEventListener("resize", resizeSky);
requestAnimationFrame(skyFrame);
ecg();
clock();
heartSync();
boot();
