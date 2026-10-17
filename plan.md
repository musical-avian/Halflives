# plan.md — blackboard

Shared state for humans and agents. Read first, write back after. Newest log entry on top.

## Goal
Browser-only, self-contained page (GitHub Pages) comparing drug levels over time: rising + falling flank, single/repeat/skipped doses, steady state, mean/average, metabolites, optional interaction overlay (typical / worst case). Custom values, JSON import/export, share link. Desktop + mobile.

## Facts (verified)
- Linear first-order models only → exact closed forms; RK4 oracle in tests agrees to 1e-6 of peak.
- Sources per value: `presets.js` ↔ `docs/presets.md` (test enforces URL presence).
- No reliable time-resolved SC data for estradiol valerate/enanthate → not shipped. Cypionate SC = IM (RCT, Sierra-Ramírez 2011).
- Vaporizing avoids combustion → CYP1A2 induction from smoking not applied.
- Bupropion XL calibrated to ng/mL (Zhang 2019): fit day-1 Cmax/AUC, independent SS check −3%.
- Estradiol pg/mL from patch-derived clearance is ~1.5–2.5× above SC/gel cohort data (see docs/limits.md).
- SC estradiol enanthate: no study exists in PubMed; SC valerate/cypionate steady-state data documented.
- Only reliable enzyme time course found: CYP1A2 de-induction t½ 38.6 h after quitting smoking (Faber & Fuhr 2004).
- Sandbox Chromium needs `locale: "en-US"` (system locale `en-US@posix` breaks `Intl` in uPlot) — test-env only.

## Decisions
| # | Decision | Why |
|---|---|---|
| D1 | Vanilla JS + vendored uPlot/marked, no build | static, self-contained, tiny |
| D2 | Everything as exponential sums + one `convolve` | DRY: oral, depot, metabolites, interactions share one path |
| D3 | No ODE solver in app; RK4 only as test oracle | closed forms exact; ODE adds error/code (docs/formulas.md §8) |
| D4 | Steady state = summed dose history (< 1e-9) | same code path as repeat dosing; closed form kept as test |
| D5 | Static interaction factors, worst case = all perpetrators at max, multiplied | no reliable Ki/Vd for time-varying model |
| D6 | Biome only (lint+format), via npx, no package.json | one tool, zero config weight |
| D7 | Y axis: amount (mg-eq), % of own peak; ng/mL only where calibrated (D12) | Vd alone is too uncertain |
| D8 | `model.js` added between app and pk | keeps pk.js pure math, app.js DOM-only |
| D9 | Lag + recirculation as weighted, lagged "parts" of one unit | one mechanism for both (DRY) |
| D10 | Transit rates spread ±20% (n ≤ 6) | stays an exponential sum; 0.94% of peak from exact Erlang |
| D11 | PD = effect compartment (ke0) + occupancy (Hill n=1) calibrated to one measured point | data-anchored, no free EC50 |
| D12 | ng/mL only where a measured exposure calibrates V | no unvalidated absolute numbers |
| D13 | Variability: seeded log-normal MC, σ from published ranges else 0.3 (flagged) | honest spread, stable band |

## Tasks
| Task | Status | Owner |
|---|---|---|
| Math core + RK4 tests | done | claude |
| Presets + sources + docs | done | claude |
| UI desktop/mobile | done | claude |
| CI + Pages workflow | done | claude |
| Enable Pages (Settings → Pages → Source: GitHub Actions), merge to `main` | open | user |
| v2: lag, transit, recirculation, effect site, occupancy, ng/mL, variability band, Makefile, limits doc | done | claude |
| Time-varying enzymes (needs ODE + data) | revisit when data exist (docs/limits.md) | — |
| Calibrate agomelatine/THC/CBD/progesterone ng/mL | blocked: need measured Cmax/AUC in a usable form | — |
| Tap dose marker on chart to skip it | idea (YAGNI for now) | — |
| Estradiol enanthate, progesterone vaginal/rectal/IM presets | blocked: need primary time-resolved sources | — |

## Open questions
- Time-varying interactions (ODE) only if sourced Ki/Vd data appears.
- Oral CBD absolute F unknown in humans (6% assumed).

## Log
- 2026-10-17 claude: v2 — PK/PD extensions, bupropion ng/mL + occupancy, estradiol pg/mL, variability band, docs/limits.md, Makefile, 26 tests.
- 2026-10-17 claude: initial build — pk/model/io/presets, 19 tests, docs, CI, Containerfile.
