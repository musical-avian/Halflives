# Formulas

Everything the app draws comes from the formulas on this page (code: `pk.js`). All of it is **linear first-order pharmacokinetics**, solved exactly in closed form.

## 1. Building block: sums of exponentials

Every curve is a sum of exponentials:

```
A(t) = Σ cᵢ · e^(−kᵢ·t)      for t ≥ 0   (0 before the dose)
```

`k = ln 2 / t½` turns a half-life into a rate.

The one operation needed is **convolution** ("feed curve a into a system whose response is b"):

```
(a ⊛ b)(t) = ∫₀ᵗ a(u)·b(t−u) du
e^(−αt) ⊛ e^(−βt) = (e^(−αt) − e^(−βt)) / (β − α)
```

so a convolution of two exponential sums is again an exponential sum (every pair of terms gives two terms).
If α = β the exact result is `t·e^(−αt)`, which is not an exponential sum; the code moves β by a relative 10⁻⁵ instead (effect on the curve ≈ 10⁻⁵, far below the uncertainty of any input value).

Sources: Gibaldi & Perrier, *Pharmacokinetics*, 2nd ed. (1982), ch. 1–4 and appendix on Laplace transforms; Rowland & Tozer, *Clinical Pharmacokinetics and Pharmacodynamics*, 4th ed. (2011), ch. 6 (absorption) and ch. 11 (multiple dosing).

## 2. Disposition: what happens after the drug is in the body

```
G(t) = Σ fᵢ · e^(−keᵢ·t),     Σ fᵢ = 1
```

`G(t)` = fraction of an absorbed dose still in the body.

- **1 phase** (most drugs): `G(t) = e^(−ke·t)`.
- **2 phases** (THC, CBD): a fast drop as the drug moves into fat/tissue, then a long tail as it leaks back out. This sum of exponentials is the same shape as the textbook two-compartment solution in "macro-constant" form (Gibaldi & Perrier ch. 2).
- **Fast-phase fraction** `f_fast` = share of the curve in the fast drop. **Approximate**: papers report the half-lives of the phases, but rarely a split usable in this simplified model (they fit 2–3-compartment models with IV data), and values vary a lot between people. Presets fit it by eye to published curves; it is editable.

## 3. Absorption routes

| Route | Input into the body | Amount in body |
|---|---|---|
| Oral, gel, inhaled (first-order) | `ka·e^(−ka·t)` | `A = F·D · (ka·e^(−ka·t)) ⊛ G` |
| Transit chain (Savic 2007) + oral | `transit ⊛ ka·e^(−ka·t)` | `A = F·D · transit ⊛ (ka·e^(−ka·t)) ⊛ G` |
| Depot injection (2–3 steps) | `(k₁e^(−k₁t)) ⊛ (k₂e^(−k₂t)) ⊛ …` | `A = F·D · steps ⊛ G` |
| Patch (zero-order release R = D/T over wear time T) | constant R | `A = F·R · Σ cᵢ/kᵢ · (e^(−kᵢ·max(0, t−T)) − e^(−kᵢ·t))` |

With one phase, the oral row is the **Bateman equation** (Bateman 1910, *Proc. Camb. Phil. Soc.* 15:423):

```
A(t) = F·D · ka/(ka − ke) · (e^(−ke·t) − e^(−ka·t))
```

The `e^(−ka·t)` term makes the **rising flank**, the `e^(−ke·t)` term the **falling flank**.

**Tmax → ka.** People know Tmax, not ka. For one phase `Tmax = ln(ka/ke)/(ka − ke)` (Rowland & Tozer ch. 6). The code solves `A′(Tmax) = 0` for ka by bisection, which also works for 2-phase disposition. Tmax decreases monotonically as ka grows, so the solution is unique (if Tmax > 1/ke the slow "flip-flop" branch, ka < ke, is chosen automatically).

**Depot** steps in series give a delayed, rounded peak; the slowest step sets the terminal slope ("flip-flop" kinetics, typical for oil depots).

## 4. Metabolites

A metabolite is formed from the parent and eliminated with its own rate `k_m`:

```
dM/dt = r·P(t) − k_m·M   ⇒   M = (r·P) ⊛ e^(−k_m·t)
```

Two ways to set `r`:

- **fraction formed `fm`** (mass balance, e.g. caffeine → paraxanthine 80%): `r = fm / ∫G`, giving `AUC_M = fm·F·D/k_m`.
- **exposure ratio** reported in labels (e.g. hydroxybupropion ≈ 13× bupropion): `r = ratio·k_m`, giving `AUC_M/AUC_P = ratio`. Label ratios compare *concentrations*, so these lines are on a concentration-like scale relative to the parent (molecular weight and volume of distribution are not modelled).

A metabolite can't fall faster than it is formed: if its own t½ is shorter than the parent's, its curve follows the parent ("formation-limited").

## 5. Repeated, skipped and steady-state dosing

**Superposition** (linear kinetics, Rowland & Tozer ch. 11):

```
A_total(t) = Σₙ D · A₁(t − tₙ),    tₙ = start + n·τ
```

- **Skipped dose**: that `tₙ` is simply left out.
- **Steady state**: dosing has been going on "forever". The code adds past doses until the oldest one contributes < 10⁻⁹. For one exponential this equals the closed form `c·e^(−k·s)/(1 − e^(−k·τ))` (s = time since last dose); the tests check both agree to 10⁻⁹.
- **Accumulation factor**: `R = 1/(1 − e^(−k·τ))` with the slowest rate k.
- **Time to steady state** ≈ 5 × slowest t½ (97%).

## 6. Mean and average

```
AUC per dose = F·D · Σ cᵢ/kᵢ
Mean at steady state  Cavg = AUC / τ
```

The dotted "mean" line shows `Cavg`. The optional "rolling avg" is the trailing average over one interval τ, computed numerically.

## 7. Interactions

Static factors per perpetrator → victim pair (sources in *Interactions*):

- inhibits clearance: every `keᵢ × factor` (factor < 1 → longer t½, AUC ÷ factor)
- raises bioavailability (first pass): `F × factor` (capped at 1)

**Typical** uses the usual factor; **worst case** assumes *all* active perpetrators at peak effect at the same time, each at its largest sourced effect, multiplied together (an upper bound; inducers are left out because they lower levels). The interaction line is normalised to the *uninteracted* peak so the rise stays visible.

Limitation: real inhibition follows the perpetrator's level hour by hour, and induction ramps up over 1–2 weeks. Modelling that needs inhibition constants (Ki), volumes and induction rates that the literature doesn't give reliably for these drugs, so it is not done.

## 8. Why no ODE solver — and what the "independent numerical solver" is

All models here are linear first-order, so they have exact closed-form solutions. A numerical ODE solver would compute the same curves with step-size error, more code and more CPU. ODEs only pay off for nonlinear or time-varying effects (saturable metabolism, concentration-dependent interactions, enzyme induction), which need parameters we don't have (see §7 and *Limits*).

**The independent solver lives only in the tests** (`test/pk.test.js`). It is a classic **4th-order Runge–Kutta (RK4)** integrator: it writes the model as plain rate equations — "gut loses ka·gut per hour, body gains it", "body loses ke·body", "metabolite gains r·parent, loses k_m·metabolite", "effect site moves towards plasma at ke0" — and steps all amounts forward in 0.002-hour steps. It never uses any of the formulas on this page, so if the closed forms were wrong, the two would disagree. They agree to 10⁻⁶ of peak for: oral (1 and 2 phases), metabolites, depot, transit chain, patch, lag time, recirculation, effect compartment, repeat + skipped doses and steady state. On top, 300 random parameter sets check the AUC and Tmax identities.

## 9. What "amount" means

Y axis "amount (mg-eq)" = drug in the body after bioavailability, not a blood concentration (that would need the volume of distribution, which varies a lot between people). "% of own peak" makes drugs with very different doses comparable.

## 10. Lag time

`A_lag(t) = A(t − t_lag)` (zero before). Tmax entered by the user includes the lag; ka is solved for `Tmax − t_lag`.
Sources: Rowland & Tozer ch. 6; Zhang 2019 found a lag improves the bupropion XL fit ([doi](https://doi.org/10.1007/s13318-018-0537-z)).

## 11. Transit compartments

A chain of n first-order steps with mean transit time MTT gives an S-shaped, delayed rise (Savic 2007, [doi](https://doi.org/10.1007/s10928-007-9066-0)). The exact form with equal rates (`ktr = n/MTT`, density `ktr^n·t^(n−1)·e^(−ktr·t)/(n−1)!`) is not an exponential sum, so the rates are spread ±20% around ktr while keeping `Σ 1/kᵢ = MTT` exactly. Measured difference to the exact form: **0.94% of peak** for n = 4 (test). n is capped at 6 to keep floating-point error negligible.

## 12. Enterohepatic recirculation (second peak)

A share `f` of the dose is absorbed again after `t_re`:

```
A(t) = (1 − f)·A₁(t − t_lag) + f·A₁(t − t_lag − t_re)
```

Total exposure is unchanged (shares sum to 1). Used for oral estradiol (SmPC: second maximum after 6–8 h); `f = 0.3` is an **assumption**.

## 13. Effect compartment (pharmacodynamics)

Effects often lag behind blood levels (hysteresis). Sheiner 1979 ([doi](https://doi.org/10.1002/cpt1979253358)) adds a virtual "effect site" that follows plasma with rate `ke0`:

```
dCe/dt = ke0·(C − Ce)   ⇒   Ce = C ⊛ ke0·e^(−ke0·t)
```

Same area as plasma, later and flatter peak. `ke0 = ln 2 / t½eq`. THC: t½eq 39–85 min for CNS effects, 7.7 min for heart rate (Strougo 2008, [doi](https://doi.org/10.1177/0269881108089870)); 1 h used. View: *effect site (% of peak)*.

## 14. Occupancy (Emax / Hill, n = 1)

```
occupancy = C / (C + EC50)
EC50 = C_ref · (1 − occ_ref) / occ_ref
```

Hill n = 1 is single-site binding (mass action). EC50 is calibrated so a measured reference gives the measured value: bupropion **26% dopamine-transporter occupancy** at steady state on 300 mg/day (Learned-Coughlin 2003, [doi](https://doi.org/10.1016/s0006-3223(02)01834-6)), level = mean steady-state hydroxybupropion. Choosing hydroxybupropion as the driver is an **assumption** (the measured occupancy stayed flat 3–24 h, like the long-lived metabolite). Units cancel, so this works on the relative scale too.

## 15. Concentration (ng/mL, pg/mL)

`C = amount / V`. V is an **apparent scaling volume** chosen so the model reproduces measured exposure; it is not a physiological volume.

| Substance | V | How |
|---|---|---|
| Bupropion XL | 1203 L | fitted with the 2-phase shape and 1.5 h lag to Zhang 2019 day-1 Cmax 49.9 ng/mL and AUC₀₋₂₄ 498 h·ng/mL; total AUC from steady-state AUCτ 1166 (linear kinetics: AUCτ,ss = AUC∞,single). **Independent check:** steady-state 300 mg Cmax model 108.5 vs measured 111.9 ng/mL (−3%). |
| Estradiol (non-oral) | 70.7 L | patch 50 µg/day → mean ≈ 42.5 pg/mL ⇒ CL ≈ 49 L/h; V = CL/ke with t½ 1 h |
| Estradiol (oral) | 990 L | same CL, apparent t½ 14 h (not checked against oral data) |
| Caffeine | 49 L | Vss 0.7 L/kg (Lelo 1986) × 70 kg (assumed weight) |

Model vs measured for checks that were **not** used to fit: see *Limits*.

## 16. Variability band (5–95%)

30 simulated people (seeded, so the band is stable). Each gets `F·e^(σ_F·z₁)` (capped at 1), all half-lives `× e^(σ_t·z₂)`, Tmax `× e^(σ_m·z₃)`, z ~ N(0,1). In % views the band is relative to the typical person's peak, so it can exceed 100%. σ comes from a published range read as the 5–95% range, `σ = ln(max/min)/3.29`, where one exists (caffeine t½, THC and CBD F, oral estradiol F); otherwise **σ = 0.3 is assumed** (≈ 30% CV, a common order of magnitude, not a measurement). Shown as a shaded band.
