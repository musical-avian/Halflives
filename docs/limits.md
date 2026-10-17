# Limits and evidence

What the numbers in this app are based on, where they stop being data, and what to revisit. Educational model, not medical advice.

## Evidence levels

| Level | Meaning |
|---|---|
| **measured** | taken from a label, SmPC or study |
| **derived** | calculated from measured values (calculation shown) |
| **fitted** | chosen so the model reproduces measured curves or numbers |
| **assumed** | no data; a plausible placeholder, editable |
| **no data** | not modelled |

## What has no real base in data

| Item | Level | Note |
|---|---|---|
| Transit compartments | available, **no preset uses them** | no sourced n/MTT for these products |
| Oral estradiol recirculation share 30% | **assumed** | only the timing (2nd peak 6–8 h) is in the SmPC |
| Bupropion occupancy driver = hydroxybupropion | **assumed** | measured occupancy (26%) was flat 3–24 h, consistent with the long-lived metabolite |
| Variability σ = 0.3 where no range is published | **assumed** | agomelatine, bupropion, progesterone, depots, patch, gel, Tmax everywhere |
| Caffeine ng/mL: 70 kg body weight | **assumed** | V scales with weight |
| THC/CBD fast/slow split | **fitted by eye** | see *Formulas* §2 |
| THC/CBD metabolite ratios | **estimated** from described curves | no exposure ratios found |
| THC oral lag 0.5 h | **derived** from label onset 0.5–1 h | plasma first appears later with food |
| THC effect-site t½eq 1 h | **measured range** 39–85 min (inhaled study), applied to oral too | |
| Depot step half-lives (injections) | **fitted by eye** to peak/duration in Oriowo 1980 | |
| Gel skin-depot t½ 16 h | **fitted** to steady state 3–5 d and washout ~76 h | |
| CBD oral F 6% | **assumed** | no human absolute F measured |
| Bupropion, progesterone absolute F | **no data** → relative scale (bupropion: calibrated to ng/mL instead) | |
| Agomelatine, THC, CBD, progesterone concentration | **no data** for a checked scale → not shown in ng/mL view | |
| Interaction factors "typical" for CBD → caffeine and estrogen → agomelatine | **assumed** magnitudes | see *Interactions* |
| Estradiol enanthate SC | **no data** found (PubMed: 0 hits) → not shipped | |

## Model vs measured (checks not used for fitting)

| Check | Model | Measured | Source |
|---|---|---|---|
| Bupropion XL 300 mg steady-state Cmax | 108.5 ng/mL | 111.9 ng/mL | [Zhang 2019](https://doi.org/10.1007/s13318-018-0537-z) |
| Bupropion occupancy at 300 mg/day | 26% (calibration point) | 26% | [Learned-Coughlin 2003](https://doi.org/10.1016/s0006-3223(02)01834-6) |
| Estradiol gel 1.5 mg/day, steady state | mean 128, max 176 pg/mL | mean 76.8, max 117 pg/mL | [gel SmPC](https://www.medicines.org.uk/emc/product/353/smpc) — model ~1.7× high |
| Estradiol cypionate SC 2 mg/week | mean 243 (177–291) pg/mL | 100–300 pg/mL reached in 52% at median 2 mg/week | [Aaron 2025](https://doi.org/10.1089/trgh.2024.0264) |
| Estradiol valerate 4 mg/week (IM shape, used as SC proxy) | mean 486 (197–719) pg/mL | SC: 100–300 pg/mL reached in 75% at median 4 mg/week | [Aaron 2025](https://doi.org/10.1089/trgh.2024.0264) — model ~1.5–2.5× high |
| Patch 50 µg/day | flat 43 pg/mL (constant release) | Cmax 57 / Cmin 28 pg/mL | [patch SmPC](https://www.medicines.org.uk/emc/product/7225/smpc) (calibration source) |

Reading: absolute estradiol levels from injections and gel are **too high by up to ~2×** against these cohorts. Likely reasons: depot absorption shapes come from IM data in women on contraceptives (Oriowo 1980), patch-derived clearance is applied to everyone, cohort levels were measured at variable times after injection. Use the % view for shapes; treat pg/mL as order of magnitude.

### Steady-state SC injection data found (no enanthate)

| Study | Ester, route | Dose | Levels |
|---|---|---|---|
| [Aaron 2025](https://doi.org/10.1089/trgh.2024.0264), n = 40, age ≤ 25 | SC valerate | median 4 mg/week (IQR 4–5.5) | 75% reached 100–300 pg/mL |
| same | SC cypionate | median 2 mg/week (IQR 2–2.5) | 52% reached 100–300 pg/mL (shortage limited titration) |
| [Herndon 2023](https://doi.org/10.1016/j.eprac.2023.02.006), n = 130 | SC vs IM, ester mix | 3.75 vs 4 mg/week | E2 levels not different |
| [Moreau 2025](https://doi.org/10.1210/jendso/bvaf192), n = 25 SC | SC (17β-estradiol ester) | individual | all 75–250 pg/mL; estrone median 76 pg/mL (oral: 907) |

**Enanthate, subcutaneous: no published study found.** Add it as a custom substance if you have your own lab values.

## Revisit later: long-term enzyme changes

The interaction overlay uses **static** factors: an inhibitor or inducer is assumed to act fully and constantly while present. Real enzyme changes take time:

- **Induction** builds up over days to ~2 weeks (new enzyme protein), and fades after stopping.
- **Inhibition** follows the inhibitor's level hour by hour.

Reliable time-course data found so far: **only one**. After quitting heavy smoking, CYP1A2 activity falls with a half-life of **38.6 h** (27–54 h), and caffeine clearance drops by **36%** to a new steady state ([Faber & Fuhr 2004](https://doi.org/10.1016/j.clpt.2004.04.003)).

**No reliable data** (so not modelled, revisit when studies appear):

- onset/offset of estrogen inhibition of CYP1A2 (agomelatine, caffeine);
- CBD's effect on CYP enzymes under long-term low-dose use (the label data are 750–1500 mg/day);
- time course of CYP1A2 induction by smoked cannabis (only steady-state data, Jusko 1978);
- any induction or tolerance from vaporized cannabis.

When data exist, the clean way to add this is a time-varying clearance `ke(t)`, which needs an ODE solver in the app (*Formulas* §8).

## Other model limits

- Linear kinetics only: no saturation (CBD absorption is saturable at high doses; agomelatine first-pass saturates at high doses).
- No tolerance or receptor down-regulation (relevant for daily THC).
- For 2-phase substances (THC, CBD, bupropion) the curve is a plasma-like shape; "amount (mg-eq)" is that shape scaled by dose, not the physical amount in fat stores.
- Interactions: only the pairs listed under *Interactions*; no pharmacodynamic interactions (e.g. seizure threshold with bupropion, sedation adding up).
- One "typical" person; the variability band shows spread only for the parameters above.
