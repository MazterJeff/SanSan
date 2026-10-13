/* A little dotted shiba that trots after the cursor, shedding dots as it goes. */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---- sprite: drawn in greys, then sampled into a halftone grid ----
  const SW = 128, SH = 96;            // sprite units (facing right, feet at y≈90)
  const COLS = 40, ROWS = 30;         // dot grid
  const TAN = "#787878", FAR = "#8a8a8a", WHITE = "#ececec", INK = "#141414";

  function leg(g, x, y, angle, color) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.fillStyle = color;
    g.beginPath(); g.roundRect(-4.5, -2, 9, 30, 4.5); g.fill();
    g.fillStyle = WHITE;
    g.beginPath(); g.roundRect(-4.5, 19, 9, 9, 4); g.fill();
    g.restore();
  }

  function ellipse(g, x, y, rx, ry, color, rot = 0) {
    g.fillStyle = color;
    g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill();
  }

  function drawShiba(g, walk, wag) {
    g.clearRect(0, 0, SW, SH);
    const s = Math.sin(walk) * 0.5;

    // far legs
    leg(g, 82, 60, -s, FAR);
    leg(g, 40, 60, s, FAR);

    // tail: a curl over the back, wagging from its base
    g.save();
    g.translate(34, 46);
    g.rotate(Math.sin(wag) * 0.28);
    g.lineCap = "round";
    g.strokeStyle = TAN; g.lineWidth = 8;
    g.beginPath(); g.arc(-4, -10, 9, Math.PI * .45, Math.PI * 2.05); g.stroke();
    g.strokeStyle = WHITE; g.lineWidth = 3;
    g.beginPath(); g.arc(-4, -10, 9, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.restore();

    // body, belly, chest
    ellipse(g, 60, 55, 31, 15, TAN);
    ellipse(g, 62, 65, 22, 5, WHITE);
    g.fillStyle = TAN;
    g.beginPath(); g.moveTo(72, 44); g.lineTo(88, 28); g.lineTo(99, 46); g.lineTo(86, 68); g.closePath(); g.fill();
    ellipse(g, 89, 55, 8, 11, WHITE, -.3);

    // near legs
    leg(g, 76, 61, s, TAN);
    leg(g, 44, 61, -s, TAN);

    // head
    g.fillStyle = TAN;
    g.beginPath(); g.moveTo(83, 26); g.lineTo(85, 7); g.lineTo(95, 20); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(93, 20); g.lineTo(101, 6); g.lineTo(105, 25); g.closePath(); g.fill();
    g.fillStyle = WHITE;
    g.beginPath(); g.moveTo(87, 21); g.lineTo(87, 13); g.lineTo(92, 20); g.closePath(); g.fill();
    ellipse(g, 93, 33, 14, 13, TAN);
    ellipse(g, 98, 41, 10, 6.5, WHITE);
    ellipse(g, 106, 39, 9, 6, WHITE);
    ellipse(g, 99, 26, 2.2, 1.5, WHITE);          // shiba "eyebrow" spot
    ellipse(g, 98, 31, 3.2, 3.4, INK);           // eye
    ellipse(g, 114, 37, 3.2, 2.8, INK);          // nose
  }

  // sample a sprite pose into { lum, alpha } per grid cell
  const sprite = document.createElement("canvas");
  sprite.width = SW; sprite.height = SH;
  const sg = sprite.getContext("2d");
  const grid = document.createElement("canvas");
  grid.width = COLS; grid.height = ROWS;
  const gg = grid.getContext("2d", { willReadFrequently: true });

  function sample(walk, wag) {
    drawShiba(sg, walk, wag);
    gg.clearRect(0, 0, COLS, ROWS);
    gg.drawImage(sprite, 0, 0, COLS, ROWS);
    const px = gg.getImageData(0, 0, COLS, ROWS).data;
    const d = new Float32Array(COLS * ROWS), a = new Float32Array(COLS * ROWS);
    for (let i = 0; i < d.length; i++) {
      a[i] = px[i * 4 + 3] / 255;
      d[i] = 1 - (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
    }
    return { d, a };
  }

  const N = 8;
  const WALK = Array.from({ length: N }, (_, i) => sample((i / N) * Math.PI * 2, (i / N) * Math.PI * 4));
  const IDLE = Array.from({ length: N }, (_, i) => sample(0, (i / N) * Math.PI * 2));

  // ---- palette, matching the portrait ----
  const ZIMA = [26, 167, 232], INDIGO = [43, 47, 143], BUCKETS = 7;
  const COLORS = Array.from({ length: BUCKETS }, (_, b) => {
    const k = b / (BUCKETS - 1);
    return ZIMA.map((z, i) => Math.round(z + (INDIGO[i] - z) * k)).join(",");
  });

  // ---- stage ----
  const canvas = document.createElement("canvas");
  canvas.className = "shiba";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let VW = 0, VH = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    VW = window.innerWidth; VH = window.innerHeight;
    canvas.width = Math.round(VW * dpr); canvas.height = Math.round(VH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const CELL = 2.9;                                // px per dot on screen
  const DOG_W = COLS * CELL, DOG_H = ROWS * CELL;
  const dog = { x: -200, y: -200, vx: 0, vy: 0, face: 1, walk: 0, wag: 0, blend: 0, shown: false, born: 0 };
  const target = { x: 0, y: 0, active: false };
  const scatter = Array.from({ length: COLS * ROWS }, () => [rand(-1, 1), rand(-1, 1)]);
  const motes = [];   // dispersing dots

  function appear(x, y) {
    if (dog.shown) return;
    dog.shown = true; dog.born = performance.now();
    dog.x = x; dog.y = y;
    target.x = x; target.y = y - 34;
  }
  function follow(x, y) {
    target.x = x; target.y = y; target.active = true;
    appear(x - 90, y + 40);
  }
  // mouse, pen and touch (taps, drags) all steer it
  window.addEventListener("pointermove", (e) => follow(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => follow(e.clientX, e.clientY), { passive: true });
  window.addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) follow(t.clientX, t.clientY); }, { passive: true });

  // Without any input it still shows up: once the portrait has rebuilt, it
  // assembles by the frame's lower-right corner and sits there.
  setTimeout(() => {
    const f = document.querySelector(".frame");
    const r = f ? f.getBoundingClientRect() : { right: VW * .7, bottom: VH * .8 };
    appear(Math.min(VW - 70, r.right - 40), Math.min(VH - 20, r.bottom - 12));
  }, reduceMotion ? 0 : 5600);

  function lerpFrame(frames, phase, i) {
    const p = ((phase / (Math.PI * 2)) % 1 + 1) % 1 * N;
    const i0 = Math.floor(p) % N, i1 = (i0 + 1) % N, f = p - Math.floor(p);
    return [
      frames[i0].d[i] * (1 - f) + frames[i1].d[i] * f,
      frames[i0].a[i] * (1 - f) + frames[i1].a[i] * f,
    ];
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(2.5, (now - last) / 16.67); last = now;
    ctx.clearRect(0, 0, VW, VH);

    if (dog.shown) {
      // follow: feet aim just below the cursor, stopping a little short
      const tx = target.x, ty = target.y + 34;
      const dx = tx - dog.x, dy = ty - dog.y, dist = Math.hypot(dx, dy);
      const want = Math.min(6.5, Math.max(0, dist - 46) * 0.07);
      const ux = dist ? dx / dist : 0, uy = dist ? dy / dist : 0;
      dog.vx += (ux * want - dog.vx) * 0.12 * dt;
      dog.vy += (uy * want - dog.vy) * 0.12 * dt;
      dog.x += dog.vx * dt; dog.y += dog.vy * dt;
      const speed = Math.hypot(dog.vx, dog.vy);
      if (Math.abs(dog.vx) > 0.35) dog.face = dog.vx > 0 ? 1 : -1;
      else if (speed < 0.2 && Math.abs(dx) > 20) dog.face = dx > 0 ? 1 : -1;
      dog.blend += ((speed > 0.3 ? 1 : 0) - dog.blend) * 0.12 * dt;
      dog.walk += speed * 0.11 * dt;
      dog.wag += (speed > 0.3 ? 0.25 : 0.32) * dt;

      const born = Math.min(1, (now - dog.born) / 900);
      const assemble = 1 - Math.pow(1 - born, 3);
      const bob = Math.sin(dog.walk * 2) * dog.blend * 1.2;
      const ox = dog.x - DOG_W / 2, oy = dog.y - DOG_H + 4 + bob;

      // soft ground shadow
      ctx.fillStyle = `rgba(${COLORS[0]},${0.18 * assemble})`;
      for (let k = -5; k <= 5; k++) {
        ctx.beginPath(); ctx.arc(dog.x + k * CELL * 1.6, dog.y + 3, CELL * .3 * (1 - Math.abs(k) / 7), 0, Math.PI * 2); ctx.fill();
      }

      // the dog, one dot per cell, batched by colour
      const buckets = Array.from({ length: BUCKETS }, () => []);
      const back = [];
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const idx = j * COLS + i;
        const [wd, wa] = lerpFrame(WALK, dog.walk, idx);
        const [id, ia] = lerpFrame(IDLE, dog.wag, idx);
        const a = ia + (wa - ia) * dog.blend;
        if (a < 0.14) continue;
        const d = 0.14 + 0.72 * (id + (wd - id) * dog.blend);    // softened like the portrait
        const col = dog.face > 0 ? i : COLS - 1 - i;
        let x = ox + (col + .5) * CELL, y = oy + (j + .5) * CELL;
        const sc = scatter[idx];
        x += sc[0] * 140 * (1 - assemble); y += sc[1] * 140 * (1 - assemble);
        if (dog.blend > .05) { x += Math.sin(now / 90 + idx) * .35 * dog.blend; }
        const r = CELL * .5 * (0.28 + 0.72 * Math.pow(d, .9)) * Math.min(1, a * 1.25);
        buckets[Math.min(BUCKETS - 1, Math.floor(d * BUCKETS))].push(x, y, r);
        back.push(x, y);

        // shed a dot now and then while moving
        if (!reduceMotion && speed > .6 && Math.random() < speed * 0.0016 * dt) {
          motes.push({ x, y, vx: -dog.vx * rand(.1, .4) + rand(-.4, .4), vy: -dog.vy * rand(.1, .4) + rand(-.7, .1), r, b: Math.min(BUCKETS - 1, Math.floor(d * BUCKETS)), life: 0, max: rand(40, 80) });
        }
      }
      // a slow sparkle when resting
      if (!reduceMotion && speed < .2 && Math.random() < .04 * dt) {
        motes.push({ x: ox + rand(.2, .8) * DOG_W, y: oy + rand(.2, .6) * DOG_H, vx: rand(-.15, .15), vy: rand(-.5, -.2), r: CELL * .35, b: 1, life: 0, max: rand(60, 100) });
      }
      // a white backing so the dog reads clearly on top of the dotted portrait
      ctx.fillStyle = `rgba(255,255,255,${0.9 * assemble})`;
      ctx.beginPath();
      for (let k = 0; k < back.length; k += 2) {
        ctx.moveTo(back[k] + CELL * 1.1, back[k + 1]);
        ctx.arc(back[k], back[k + 1], CELL * 1.1, 0, Math.PI * 2);
      }
      ctx.fill();
      for (let b = 0; b < BUCKETS; b++) {
        const list = buckets[b];
        if (!list.length) continue;
        ctx.fillStyle = `rgba(${COLORS[b]},${0.35 + 0.65 * assemble})`;
        ctx.beginPath();
        for (let k = 0; k < list.length; k += 3) {
          ctx.moveTo(list[k] + list[k + 2], list[k + 1]);
          ctx.arc(list[k], list[k + 1], list[k + 2], 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }

    // dispersing dots
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.life += dt;
      if (m.life > m.max) { motes.splice(i, 1); continue; }
      m.x += m.vx * dt; m.y += m.vy * dt; m.vy -= 0.004 * dt;
      const k = 1 - m.life / m.max;
      ctx.fillStyle = `rgba(${COLORS[m.b]},${k * .8})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.fill();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
