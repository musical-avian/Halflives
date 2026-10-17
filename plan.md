# plan.md — blackboard

Shared state for humans and agents. Read first, write back after. Newest log entry on top.

## Goal
Browser-only, self-contained page (GitHub Pages) comparing drug levels over time: rising + falling flank, single/repeat/skipped doses, steady state, mean/average, metabolites, optional interaction overlay (typical / worst case). Custom values, JSON import/export, share link. Desktop + mobile.

## Facts (verified)
- Linear first-order models only → exact closed forms; RK4 oracle in tests agrees to 1e-6 of peak.
- Sources per value: `presets.js` ↔ `docs/presets.md` (test enforces URL presence).
- No reliable time-resolved SC data for estradiol valerate/enanthate → not shipped. Cypionate SC = IM (RCT, Sierra-Ramírez 2011).
- Vaporizing avoids combustion → CYP1A2 induction from smoking not applied.
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
| D7 | Y axis: amount (mg-eq) or % of own peak | concentration needs Vd, too uncertain |
| D8 | `model.js` added between app and pk | keeps pk.js pure math, app.js DOM-only |

## Tasks
| Task | Status | Owner |
|---|---|---|
| Math core + RK4 tests | done | claude |
| Presets + sources + docs | done | claude |
| UI desktop/mobile | done | claude |
| CI + Pages workflow | done | claude |
| Enable Pages (Settings → Pages → Source: GitHub Actions), merge to `main` | open | user |
| Concentration mode (needs sourced Vd per substance) | idea | — |
| Tap dose marker on chart to skip it | idea (YAGNI for now) | — |
| Estradiol enanthate, progesterone vaginal/rectal/IM presets | blocked: need primary time-resolved sources | — |

## Open questions
- Time-varying interactions (ODE) only if sourced Ki/Vd data appears.
- Oral CBD absolute F unknown in humans (6% assumed).

## Log
- 2026-10-17 claude: initial build — pk/model/io/presets, 19 tests, docs, CI, Containerfile.
