# SanSan

A wordless page in white, zima blue and indigo.

1. **Her photo, reconstructed.** Halftone particles of light gather into her face. A face-mesh traces her features, and then a scan line resolves the real photo. A thin zima line underneath fills as it happens. Afterwards, hover or touch the photo to see her as particles again.
2. **A zima-blue square.** Hover over it and a white heart draws itself. Tap it and the heart fills.

## Run it

```sh
npx serve .
```

Serve the folder rather than opening `index.html` from disk, so the particle effect can read the photo. GitHub Pages works too: Settings → Pages → deploy from branch → `/ (root)`.

The photo is `img/sansan.jpg`. If you swap it, update the face landmarks in `LM` in `js/main.js`.
