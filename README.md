# Halflives

Compare drug levels over time in your browser: absorption + elimination, repeat/skipped doses, steady state, mean lines, metabolites and an optional interaction overlay (typical / worst case). Presets: agomelatine, bupropion XL (daily and every 2 days), vaporized cannabis bud (THC + CBD), caffeine, estradiol (oral, SC cypionate, IM valerate, patch, gel), progesterone. Everything editable, JSON import/export, share links.

**Educational model, not medical advice.**

- Live: GitHub Pages (enable *Settings → Pages → Source: GitHub Actions*; deploys from `main`).
- Run locally: `python3 -m http.server 8080` or Podman ([docs/podman.md](docs/podman.md)).
- Test: `node --test` · Lint: `npx --yes @biomejs/biome@2.5.15 ci .`

Docs: [formulas](docs/formulas.md) · [presets + sources](docs/presets.md) · [interactions](docs/interactions.md) · contributor/agent rules: [CLAUDE.md](CLAUDE.md), [plan.md](plan.md).

Vendored: [uPlot](https://github.com/leeoniya/uPlot) 1.6.32, [marked](https://github.com/markedjs/marked) 18.1.1 (both MIT, licenses in `vendor/`).
