// Pharmacokinetic math. Pure functions, no DOM. Derivations + sources: docs/formulas.md
// A curve is an exponential sum `terms = [{c, k}]`: A(t) = Σ c·e^(−k·t) for t ≥ 0, else 0.

export const rate = (thalfH) => Math.LN2 / thalfH;

export const at = (terms, t) => {
  if (t < 0) return 0;
  let s = 0;
  for (const { c, k } of terms) s += c * Math.exp(-k * t);
  return s;
};

export const slope = (terms, t) => terms.reduce((s, { c, k }) => s - k * c * Math.exp(-k * t), 0);

/** ∫₀^∞ A(t) dt */
export const area = (terms) => terms.reduce((s, { c, k }) => s + c / k, 0);

export const scale = (terms, f) => terms.map(({ c, k }) => ({ c: c * f, k }));

const merge = (terms) => {
  const byK = new Map();
  for (const { c, k } of terms) byK.set(k, (byK.get(k) ?? 0) + c);
  return [...byK].filter(([, c]) => c !== 0).map(([k, c]) => ({ c, k }));
};

// Relative gap forced between equal rates (the exact limit t·e^(−kt) is not an exponential sum).
const NUDGE = 1e-5;

/** (a ⊛ b)(t) = ∫₀ᵗ a(u)·b(t−u) du, closed form for exponential sums. */
export function convolve(a, b) {
  const out = [];
  for (const x of a) {
    for (const y of b) {
      const ky = Math.abs(y.k - x.k) <= NUDGE * Math.max(x.k, y.k) ? x.k * (1 + NUDGE) : y.k;
      const c = (x.c * y.c) / (ky - x.k);
      out.push({ c, k: x.k }, { c: -c, k: ky });
    }
  }
  return merge(out);
}

/** Disposition: fraction of an absorbed dose still in the body, Σ fᵢ·e^(−keᵢ·t). */
export const disposition = (phases) => phases.map((p) => ({ c: p.f, k: rate(p.thalfH) }));

const step = (k) => [{ c: k, k }];

/** First-order absorption rate ka that puts the peak of pre ⊛ (ka·e^(−ka·t)) ⊛ G at tmax (bisection, log scale). */
export function solveKa(tmaxH, G, pre = null) {
  let lo = Math.log(1e-4);
  let hi = Math.log(1e4);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const input = pre ? convolve(pre, step(Math.exp(mid))) : step(Math.exp(mid));
    // Still rising at tmax → peak comes later → absorption must be faster.
    if (slope(convolve(input, G), tmaxH) > 0) lo = mid;
    else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}

/**
 * Transit chain (Savic 2007): n steps with mean transit time MTT. Rates are spread ±20% around n/MTT
 * (keeping Σ 1/kᵢ = MTT) because the exact equal-rate form t^n·e^(−kt) is not an exponential sum.
 */
export function transitSteps({ n: nIn, mttH }) {
  const n = Math.min(6, Math.max(1, Math.round(nIn)));
  const f = Array.from({ length: n }, (_, i) => (n > 1 ? 0.8 + (0.4 * i) / (n - 1) : 1));
  const S = f.reduce((a, x) => a + 1 / x, 0);
  return f.map((x) => step((x * S) / mttH));
}

/** Input density of the absorption route (transit chain, then depot steps or Tmax-solved ka), or null for a patch. */
export function absorption(sub, G) {
  const pre = sub.transit?.n && sub.transit?.mttH ? transitSteps(sub.transit).reduce(convolve) : null;
  const chain = (steps) => [pre, ...steps].filter(Boolean).reduce(convolve);
  if (sub.absStepsH?.length) return chain(sub.absStepsH.map((h) => step(rate(h))));
  if (sub.tmaxH != null) return chain([step(solveKa(Math.max(1e-3, sub.tmaxH - (sub.tlagH ?? 0)), G, pre))]);
  return pre;
}

/** Metabolite impulse response: r·(G ⊛ e^(−km·t)). r from fraction formed (fm) or reported exposure ratio. */
export function metaboliteResponse(G, m) {
  const km = rate(m.thalfH);
  const r = m.fm != null ? m.fm / area(G) : m.aucRatio * km;
  return scale(convolve(G, [{ c: 1, k: km }]), r);
}

/** Apply interaction factors: keFactor multiplies every elimination rate, fFactor multiplies F (capped at 1). */
export const withFactors = (sub, { ke = 1, f = 1 } = {}) => ({
  ...sub,
  F: Math.min(1, sub.F * f),
  phases: sub.phases.map((p) => ({ ...p, thalfH: p.thalfH / ke })),
});

/**
 * Per-mg responses of one substance: parent first, then metabolites.
 * Each unit = { name, terms, boxH, auc, parts }: amount in body after 1 mg dosed at t = 0.
 * parts = [{w, lagH}]: lag time, and enterohepatic recirculation as a delayed share of the dose.
 */
export function units(sub) {
  const G = disposition(sub.phases);
  const abs = absorption(sub, G);
  const outputs = [
    { name: sub.name, ir: G, metabolite: null },
    ...(sub.metabolites ?? []).map((m) => ({ name: m.name, ir: metaboliteResponse(G, m), metabolite: m })),
  ];
  const lag = sub.tlagH ?? 0;
  const re = sub.recirc;
  const parts = re?.fraction
    ? [
        { w: 1 - re.fraction, lagH: lag },
        { w: re.fraction, lagH: lag + re.lagH },
      ]
    : [{ w: 1, lagH: lag }];
  return outputs.map(({ name, ir, metabolite }) => ({
    name,
    metabolite,
    parts,
    boxH: abs ? 0 : sub.releaseH,
    terms: scale(abs ? convolve(abs, ir) : ir, sub.F),
    auc: sub.F * area(ir),
  }));
}

/** Amount at time t after 1 mg dosed at 0, summed over the lagged parts. */
export const unitAt = (u, t) => (u.parts ?? [{ w: 1, lagH: 0 }]).reduce((s, p) => s + p.w * shapeAt(u, t - p.lagH), 0);

/** Zero-order release over boxH: (1/T)·Σ c/k·(e^(−k·max(0,t−T)) − e^(−kt)). */
function shapeAt(u, t) {
  if (t < 0) return 0;
  if (!u.boxH) return at(u.terms, t);
  const T = u.boxH;
  let s = 0;
  for (const { c, k } of u.terms) s += (c / k) * (Math.exp(-k * Math.max(0, t - T)) - Math.exp(-k * t));
  return s / T;
}

/** Effect-site curve (Sheiner 1979): Ce = A ⊛ ke0·e^(−ke0·t). Same area, delayed and smoothed. */
export const effectSite = (u, ke0) => ({ ...u, terms: convolve(u.terms, step(ke0)) });

/** Single-site binding (Hill n = 1): occupancy = C/(C + EC50). */
export const occupancy = (c, ec50) => c / (c + ec50);

/** EC50 that makes level `cRef` give occupancy `occ`. */
export const ec50For = (occ, cRef) => (cRef * (1 - occ)) / occ;

export const slowest = (u) => Math.min(...u.terms.map((x) => x.k));

/** Dose times of a regimen up to tEnd. Steady state = dosing has been running long enough that older doses add < 1e-9. */
export function doseTimes(reg, tEnd, kMin) {
  const tau = reg.intervalH;
  const skip = new Set(reg.skip ?? []);
  const first = reg.steadyState ? -Math.min(5000, Math.ceil(Math.log(1e9) / (kMin * tau))) : 0;
  const last = reg.steadyState ? Math.floor((tEnd - reg.startH) / tau) : (reg.count ?? 1) - 1;
  const times = [];
  for (let n = first; n <= last; n++) {
    if (n >= 0 && skip.has(n + 1)) continue; // skip list is 1-based dose numbers
    times.push(reg.startH + n * tau);
  }
  return times;
}

/** Superposition of all doses → Float64Array of amounts at `times`. */
export function curve(u, doses, dose, times) {
  const out = new Float64Array(times.length);
  for (const td of doses) for (let i = 0; i < times.length; i++) out[i] += dose * unitAt(u, times[i] - td);
  return out;
}

/** Trailing moving average over window w (uniform grid), trapezoid rule. */
export function rollingAverage(times, values, w) {
  const dt = times[1] - times[0];
  const n = Math.max(1, Math.round(w / dt));
  const cum = new Float64Array(values.length);
  for (let i = 1; i < values.length; i++) cum[i] = cum[i - 1] + ((values[i] + values[i - 1]) / 2) * dt;
  return Array.from(values, (_, i) => (i < n ? null : (cum[i] - cum[i - n]) / (n * dt)));
}

/** Summary numbers for one line. */
export function stats(u, reg, dose, times, values) {
  let iMax = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[iMax]) iMax = i;
  const k = slowest(u);
  const tau = reg.intervalH;
  const repeated = reg.steadyState || (reg.count ?? 1) > 1;
  return {
    peak: values[iMax],
    peakAtH: times[iMax],
    cavg: repeated ? (dose * u.auc) / tau : null,
    effThalfH: Math.LN2 / k,
    accumulation: repeated ? 1 / (1 - Math.exp(-k * tau)) : null,
    tssH: (5 * Math.LN2) / k,
  };
}
