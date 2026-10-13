# SANSAN.SYS — 光で描いたラブレター

A love letter for SanSan, drawn in light. A blue, Japanese, future-anime single page:

- **Neon contour portrait.** Hand-traced from her photo as SVG line art. It draws itself stroke by stroke, then her eyes lock on, blink, and follow your cursor.
- **HUD readout.** Subject panel, heart-sync meter and a live ECG. Her heart rate rises when your cursor is on her portrait.
- **Sky.** Falling blue sakura, katakana code rain, and a neon grid horizon.
- **Transmission.** A typed love letter in English and Japanese.
- **Memory archive.** Data-file cards: 瞳 · 前髪 · その視線 · 未来.
- **Time synced.** A clock that counts up from the day you met.
- **Heart sync.** Press and hold the core until it bursts → 大好き.

## Run it

It's a static site, so you can open `index.html` directly, or serve it:

```sh
npx serve .
```

GitHub Pages works too: Settings → Pages → deploy from branch → `/ (root)`.

## Make it yours

- **Day you met:** set `CONFIG.since` at the top of `js/main.js`, e.g. `"2023-05-20T19:30:00"`. If it's left `null`, the clock shows ∞.
- **Letter text:** the `data-type` attributes in the `#signal` section of `index.html`.
- **Memory cards:** the `<article class="card">` blocks in `#archive`.

The original photo is not part of this repo. Only the traced contour lines are.
