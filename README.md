# SanSan

A wordless page in white, zima blue and indigo.

1. **The portrait, digitized.** About 22,000 halftone dots fly in and form the two of you. A face-mesh traces both faces, then a scan line locks each row of dots into its final size and colour. A thin zima line underneath fills as it happens. The portrait stays dotted: a faint scan line passes over it now and then, a row occasionally glitches, and hovering or touching it pushes the dots aside.
2. **A little shiba.** A dotted shiba in the same palette appears at your cursor the first time you move it, assembling from scattered dots. It trots after the cursor (or your finger), sheds dots that drift away as it moves, and wags its tail when it stops. It's drawn in `js/shiba.js`.
3. **A zima-blue square.** Hover over it and a white heart draws itself. Tap it and the heart fills.

## Run it

```sh
npx serve .
```

Opening `index.html` straight from disk works too. For GitHub Pages: Settings → Pages → deploy from branch → `/ (root)`.

The page never loads the photo. It draws from `js/dots.js`, a brightness grid generated from `img/sansan.jpg`. To regenerate it (for example with more or fewer dots), run:

```sh
python3 tools/make_dots.py 130 0.7 0.1 3.5 0.62   # columns, gamma, local contrast, highlight detail, depth
```

If you swap the photo, also update the face landmarks in `LM` in `js/main.js`.
