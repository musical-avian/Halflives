# Halflives

Compare drug levels over time in your browser: absorption (incl. lag, transit, second peak) + elimination, repeat/skipped doses, steady state, mean lines, metabolites, variability band, effect-site and occupancy views, calibrated ng/mL where data exist, and an optional interaction overlay (typical / worst case). Presets: agomelatine, bupropion XL (daily and every 2 days), vaporized cannabis bud (THC + CBD), caffeine, estradiol (oral, SC cypionate, IM valerate, patch, gel), progesterone. Everything editable, JSON import/export, share links.

**Educational model, not medical advice.**

- Live: GitHub Pages (enable *Settings → Pages → Source: GitHub Actions*; deploys from `main`).
- Run locally: `make start` / `make stop` (Podman, [docs/podman.md](docs/podman.md)) or `make serve` (Python).
- Test: `make test` · Lint: `make lint`

Docs: [formulas](docs/formulas.md) · [presets + sources](docs/presets.md) · [interactions](docs/interactions.md) · [limits + evidence](docs/limits.md) · contributor/agent rules: [CLAUDE.md](CLAUDE.md), [plan.md](plan.md).

Vendored: [uPlot](https://github.com/leeoniya/uPlot) 1.6.32, [marked](https://github.com/markedjs/marked) 18.1.1 (both MIT, licenses in `vendor/`).
