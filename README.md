# SanSan

A wordless page in white, zima blue and indigo.

1. **Her portrait, digitized.** About 16,000 halftone dots fly in and form her face. A face-mesh traces her features, then a scan line locks each row of dots into its final size and colour. A thin zima line underneath fills as it happens. The portrait stays dotted: a faint scan line passes over it now and then, a row occasionally glitches, and hovering or touching it pushes the dots aside.
2. **A zima-blue square.** Hover over it and a white heart draws itself. Tap it and the heart fills.

## Run it

```sh
npx serve .
```

Opening `index.html` straight from disk works too. For GitHub Pages: Settings → Pages → deploy from branch → `/ (root)`.

The page never loads the photo. It draws from `js/dots.js`, a brightness grid generated from `img/sansan.jpg`. To regenerate it (for example with more or fewer dots), run:

```sh
python3 tools/make_dots.py 120 1.1   # columns, gamma
```

If you swap the photo, also update the face landmarks in `LM` in `js/main.js`.
