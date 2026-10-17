# Presets and sources

Every number below is in `presets.js` with the same source. **≈** = fitted or assumed (reason given). All values are editable in the app ("PK & sources" on each card).

Educational model only. Real levels vary a lot between people (genes, liver function, food, smoking, other drugs).

## Substances

| Substance | Tmax / absorption | t½ (phases) | F | Metabolites (t½, scaling) | Sources |
|---|---|---|---|---|---|
| Agomelatine (oral) | 1.5 h (1–2 h) | 1.5 h (1–2 h) | 0.05 (<5%) | inactive, not plotted | [Agomelatine SmPC §5.2](https://www.medicines.org.uk/emc/product/6564/smpc) |
| Bupropion XL (oral) | 5 h | 21 h | 1 ≈ (absolute F unknown, no IV form → relative scale) | hydroxy- 20 h ×13; threohydro- 37 h ×7; erythrohydro- 33 h ×1.4 (exposure ratios at steady state) | [Bupropion XL label (FDA)](https://www.accessdata.fda.gov/drugsatfda_docs/label/2003/21515_wellbutrin_lbl.pdf), [bupropion PR SmPC §5.2](https://www.medicines.org.uk/emc/product/2684/smpc) |
| THC (vaporized) | 0.17 h (peak at first 10-min sample) | ≈ 95% @ 0.5 h + 5% @ 25 h | 0.3 ≈ (smoked 2–56%; vaping 1.4–2× smoked peaks in one study, comparable in another) | 11-OH-THC ≈ ×0.1 (much lower than THC after smoking); THC-COOH (inactive, drug-test marker) ≈ 72 h, off | [Huestis 2007](https://doi.org/10.1002/cbdv.200790152), [Huestis 1992](https://doi.org/10.1093/jat/16.5.276), [Spindle 2018](https://doi.org/10.1001/jamanetworkopen.2018.4841), [Newmeyer 2016](https://doi.org/10.1373/clinchem.2016.263475) |
| THC (oral/edible) | 2.5 h | as above | 0.06 (4–12%) | 11-OH-THC ≈ ×1 (first pass) | [Huestis 2007](https://doi.org/10.1002/cbdv.200790152), [Newmeyer 2016](https://doi.org/10.1373/clinchem.2016.263475) |
| CBD (vaporized) | 0.17 h ≈ (as THC) | ≈ 99% @ 4 h + 1% @ 60 h | 0.31 (smoked, 31 ± 13%; vaping assumed similar) | 7-OH-CBD ≈ ×0.4, off | [Ohlsson 1986](https://doi.org/10.1002/bms.1200130206), [Millar 2018](https://doi.org/10.3389/fphar.2018.01365), [cannabidiol SmPC](https://www.medicines.org.uk/emc/product/10781/smpc) |
| CBD (oral) | 3 h (2.5–5 h) | as above; terminal 56–61 h, steady state in 2–4 days | 0.06 ≈ (assumption: no human oral F measured) | 7-OH-CBD ×0.4 (≈ 40% of CBD exposure) | [cannabidiol SmPC §5.2](https://www.medicines.org.uk/emc/product/10781/smpc), [Millar 2018](https://doi.org/10.3389/fphar.2018.01365) |
| Cannabis bud (vaporized) | composite | — | — | 0.2 g of 10% THC / 10% CBD = 20 mg + 20 mg → THC (vaporized) + CBD (vaporized) | as components |
| Caffeine (oral) | 0.75 h | 5 h (1.5–9.5 h) | 1 | paraxanthine 3.1 h, 80%; theobromine 7.2 h, 11%; theophylline 6.2 h, 4% (fraction formed) | [IOM 2001 ch. 2](https://nap.nationalacademies.org/read/10219/chapter/4), [Blanchard 1983](https://pubmed.ncbi.nlm.nih.gov/6832208/), [Lelo 1986a](https://doi.org/10.1111/j.1365-2125.1986.tb05246.x), [Lelo 1986b](https://doi.org/10.1111/j.1365-2125.1986.tb05247.x) |
| Estradiol (oral) | 2 h (0.5–3 h) | 14 h ≈ apparent (13–20 h, estrone reservoir; true E2 t½ ≈ 1 h) | 0.04 (3–5%) | estrone ≈ ×6 (oral E1 ≫ E2) | [estradiol valerate tablets SmPC](https://www.medicines.org.uk/emc/product/1415/smpc), [Kuhl 2005](https://doi.org/10.1080/13697130500148875), [Moreau 2025](https://doi.org/10.1210/jendso/bvaf192) |
| Estradiol cypionate (SC) | ≈ 3 depot steps 32/34/36 h → peak ≈ 4 d, elevated ≈ 11 d | 1 h | 1 | — | [Oriowo 1980](https://doi.org/10.1016/s0010-7824(80)80018-7), [Sierra-Ramírez 2011 (SC = IM, RCT)](https://doi.org/10.1016/j.contraception.2011.03.014), [patch SmPC (E2 t½ ≈ 1 h)](https://www.medicines.org.uk/emc/product/7225/smpc) |
| Estradiol valerate (IM) | ≈ 2 depot steps 29/38 h → peak ≈ 2 d, elevated 7–8 d | 1 h | 1 | — | [Oriowo 1980](https://doi.org/10.1016/s0010-7824(80)80018-7) |
| Estradiol patch 50 µg/day | constant release over 84 h (0.175 mg/patch) | 1 h | 1 (dose = delivered amount) | — | [patch SmPC §5.2](https://www.medicines.org.uk/emc/product/7225/smpc) |
| Estradiol gel | ≈ skin depot t½ 16 h (steady state 3–5 d, baseline ~76 h after stop) | 1 h | 0.1 (~10% absorbed) | — | [gel SmPC §5.2](https://www.medicines.org.uk/emc/product/353/smpc) |
| Progesterone (oral, micronised) | 2.2 h | 16.8 h | 1 ≈ (absolute F unknown → relative scale) | not modelled (no usable time-resolved source) | [micronised progesterone SmPC §5.2](https://www.medicines.org.uk/emc/product/352/smpc) |

## Default regimens

| Regimen | Dose | Schedule |
|---|---|---|
| Agomelatine | 25 mg | 22:00 daily, steady state |
| Bupropion XL | 150 mg | 08:00 daily, steady state |
| Bupropion XL every 2 days | 150 mg | 08:00 every 48 h, steady state (label dosing is daily; shown for comparison, not advice) |
| Cannabis bud (vaporized) | 0.2 g (10% THC, 10% CBD) | 20:00, 3 evenings |
| Caffeine | 100 mg | 08:00 daily, steady state |
| THC oral, CBD oral, estradiol (all routes), progesterone | — | available, off by default |

## Not shipped (no reliable source)

- **Estradiol valerate/enanthate subcutaneous**: only steady-state level studies exist ([Herndon 2023](https://doi.org/10.1016/j.eprac.2023.02.006): SC 3.75 vs IM 4 mg/week, same E2 levels; [Moreau 2025](https://doi.org/10.1210/jendso/bvaf192)), no time-resolved SC curves. Cypionate SC is included because an RCT measured the full SC curve ([Sierra-Ramírez 2011](https://doi.org/10.1016/j.contraception.2011.03.014)).
- **Estradiol enanthate IM, progesterone vaginal/rectal/IM**: no primary time-resolved data retrieved; add as custom substances if you have values.
- **Allopregnanolone** (progesterone metabolite): no usable t½/ratio source.
