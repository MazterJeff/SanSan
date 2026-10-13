# SanSan — 再構成

A minimal love letter: white, zima blue and indigo.

- **01 — 再構成 (reconstruction).** Her photo is rebuilt from light. About 9,000 halftone particles fly in and form her face. A face-mesh traces her eyes, nose and lips, and then a scan line resolves the real photo row by row. After that, the photo stays. Hover or touch it to see her as particles of light under a lens. A quiet glitch flickers now and then.
- **02 — 手紙 (letter).** A short letter in Japanese and English.
- **03 — 時間 (time).** A count of the days you've been together.
- **04 — 最後に (last).** A zima-blue square. Hover or tap it: 大好き.

## Run it

Serve the folder so the particle effect can read the photo's pixels:

```sh
npx serve .
```

If you open `index.html` straight from disk, the photo still reconstructs, just without the particle phase. GitHub Pages also works: Settings → Pages → deploy from branch → `/ (root)`.

## Make it yours

- **Day you met:** set `CONFIG.since` at the top of `js/main.js`, e.g. `"2023-05-20"`. If it's left `null`, it shows ∞.
- **Photo:** `img/sansan.jpg`. If you change the photo, update the landmark positions in `LM` in `js/main.js`.
- **Text:** edit it directly in `index.html`.
