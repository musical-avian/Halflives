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

## 8. Why no ODE solver

All models above are linear first-order, so they have exact closed-form solutions. A numerical ODE solver would compute the same curves with step-size error, more code and more CPU. ODEs only pay off for nonlinear or time-varying effects (saturable metabolism, concentration-dependent interactions, enzyme induction), which need parameters we don't have (see §7).

An ODE solver **is** used in the tests: an independent RK4 integration of the same compartment model checks every closed form (oral, 2-phase, metabolites, depot, patch, repeat + skip, steady state) to 10⁻⁶ of peak, plus 300 random parameter sets for the AUC and Tmax identities.

## 9. What "amount" means

Y axis "amount (mg-eq)" = drug in the body after bioavailability, not a blood concentration (that would need the volume of distribution, which varies a lot between people). "% of own peak" makes drugs with very different doses comparable.
