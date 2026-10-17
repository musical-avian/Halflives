# CLAUDE.md

Static, browser-only drug-level plotter. GitHub Pages. No framework, no build step.

## First
1. Read `plan.md` (blackboard). Claim a task there before working, update Facts/Decisions/Log after.
2. Keep `docs/` in sync with code: formulas → `docs/formulas.md`, preset values → `docs/presets.md`, interaction factors → `docs/interactions.md`, evidence/limits → `docs/limits.md`.

## Rules
- DRY, KISS, YAGNI, SOLID. Small code. No new dependency unless it clearly beats ~50 lines of own code.
- **No number without a source.** Every PK value in `presets.js` has `sources`; fitted/assumed values get an `approx` reason. Tests fail if a source URL is missing from the docs.
- Generic drug names only.
- Math changes need a test against the RK4 oracle in `test/pk.test.js`.
- Every value has an evidence level (measured / derived / fitted / assumed / no data); anything not measured is listed in `docs/limits.md`.
- Educational tool: never phrase output as dosing advice.

## Layout (dependency direction: app → model → pk; io and presets are leaves)
| File | Role |
|---|---|
| `pk.js` | pure math (exponential sums, convolution, dosing) |
| `model.js` | state → plot lines (composites, metabolites, interactions, views, variability band) |
| `presets.js` | substances, regimens, interaction rules + sources |
| `io.js` | validate, JSON, share link, localStorage |
| `app.js` | DOM only |
| `vendor/` | uPlot 1.6.32, marked 18.1.1 (MIT), vendored on purpose (self-contained) |

## Commands
```sh
make test        # node --test
make lint        # biome ci   (make fmt to fix)
make start/stop  # podman preview on :8080 (make dev = live mount, make serve = python)
```
CI (`.github/workflows/pages.yml`): lint → test → deploy to Pages on `main`.
