// State → plot lines. Expands composites, applies interaction overlays, view modes and variability bands. No DOM.
import { curve, doseTimes, ec50For, effectSite, occupancy, rate, rollingAverage, slowest, stats, units, withFactors } from "./pk.js";

const byId = (list) => new Map(list.map((x) => [x.id, x]));

/** Substances (with per-unit mg) a regimen actually delivers; composites expand to their components. */
export const parts = (sub, subs) =>
  sub.components ? sub.components.map((c) => ({ sub: subs.get(c.id), mgPerUnit: c.mgPerUnit })) : [{ sub, mgPerUnit: 1 }];

/** Molecules present in the active selection. */
export function presentDrugs(state) {
  const subs = byId(state.substances);
  return new Set(
    state.regimens
      .filter((r) => r.on)
      .flatMap((r) => parts(subs.get(r.substanceId), subs).map((p) => p.sub.drug))
      .filter(Boolean),
  );
}

/** Combined factors for one victim drug. mode: "typical" → index 0, "worst" → index 1 (all perpetrators at peak at once). */
export function factorsFor(drug, present, rules, mode) {
  const i = mode === "worst" ? 1 : 0;
  const hits = rules.filter((r) => r.victim === drug && r.perp !== drug && present.has(r.perp));
  const ke = hits.reduce((x, r) => x * (r.keFactor?.[i] ?? 1), 1);
  const f = hits.reduce((x, r) => x * (r.fFactor?.[i] ?? 1), 1);
  return { ke, f, hits, changed: ke !== 1 || f !== 1 };
}

/** Lighten a #rrggbb colour towards white for metabolite lines. */
const tint = (hex, amount = 0.45) =>
  `#${[1, 3, 5]
    .map((i) => Math.round(Number.parseInt(hex.slice(i, i + 2), 16) * (1 - amount) + 255 * amount))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;

const PER_MG_L = { "ng/mL": 1e3, "pg/mL": 1e6 }; // 1 mg/L in these units

/** Y-axis views. needs(sub) → false when the substance has no data for that view. */
export const VIEWS = {
  normalized: { label: "% of own peak", needs: () => true, normalize: true },
  amount: { label: "amount in body (mg-eq)", needs: () => true },
  conc: { label: "concentration", needs: (s) => s.conc?.vL > 0 },
  effect: { label: "effect site (% of peak)", needs: (s) => Boolean(s.pd?.ke0ThalfH), normalize: true },
  occupancy: { label: "occupancy (%)", needs: (s) => Boolean(s.pd?.occupancy) },
};

/** Curves of one substance for one regimen in the chosen view: [{ name, index, u, values, factor }]. */
export function outputsFor(sub, reg, dose, times, view) {
  let us = units(sub);
  const doses = doseTimes(reg, times[times.length - 1], Math.min(...us.map(slowest)));
  if (view === "occupancy") {
    const o = sub.pd.occupancy;
    const driver = us.find((u) => u.name === o.driver) ?? us[0];
    const ec50 = ec50For(o.value, (o.ref.dose * driver.auc) / o.ref.intervalH);
    const values = curve(driver, doses, dose, times).map((c) => 100 * occupancy(c, ec50));
    return [{ name: o.label, index: 0, u: driver, values, factor: null }];
  }
  if (view === "effect") us = us.map((u) => effectSite(u, rate(sub.pd.ke0ThalfH)));
  const factor = view === "conc" ? PER_MG_L[sub.conc.unit ?? "ng/mL"] / sub.conc.vL : 1;
  return us
    .map((u, index) => ({ u, index }))
    .filter(({ u, index }) => index === 0 || u.metabolite.on)
    .map(({ u, index }) => ({ name: u.name, index, u, factor, values: curve(u, doses, dose, times).map((x) => x * factor) }));
}

// ---- variability: seeded log-normal Monte Carlo ----
const DEFAULT_SIGMA = 0.3;
const rng = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const gauss = (r) => Math.sqrt(-2 * Math.log(r())) * Math.cos(2 * Math.PI * r());

/** One random individual: F, all half-lives and Tmax scaled by e^(σ·z). */
export function perturb(sub, r) {
  const v = sub.variability ?? {};
  const k = (key) => Math.exp((v[key] ?? DEFAULT_SIGMA) * gauss(r));
  const kt = k("thalf");
  return {
    ...sub,
    F: Math.min(1, sub.F * k("F")),
    tmaxH: sub.tmaxH == null ? sub.tmaxH : sub.tmaxH * k("tmax"),
    phases: sub.phases.map((p) => ({ ...p, thalfH: p.thalfH * kt })),
  };
}

const percentile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

/** 5th/95th percentile band per output index, N simulated individuals. */
export function band(sub, reg, dose, times, view, n = 30, seed = 7) {
  const r = rng(seed);
  const runs = Array.from({ length: n }, () => outputsFor(perturb(sub, r), reg, dose, times, view));
  return runs[0].map((_, j) => {
    const lo = new Array(times.length);
    const hi = new Array(times.length);
    for (let i = 0; i < times.length; i++) {
      const col = runs.map((run) => run[j].values[i]).sort((a, b) => a - b);
      lo[i] = percentile(col, 0.05);
      hi[i] = percentile(col, 0.95);
    }
    return { lo, hi };
  });
}

/**
 * Build plot lines for all active regimens in the current view.
 * returns { lines, missing }; line = { label, color, dash, values, avg, band, stats, cavg, unit, notes, normPeak }
 * missing = labels with no data for this view.
 */
export function buildLines(state, times) {
  const subs = byId(state.substances);
  const present = presentDrugs(state);
  const { interactions: mode, yMode: view, showAvg, showBand } = state.view;
  const lines = [];
  const missing = [];
  for (const reg of state.regimens.filter((r) => r.on)) {
    const regSub = subs.get(reg.substanceId);
    if (!regSub) continue;
    const comps = parts(regSub, subs);
    for (const { sub, mgPerUnit } of comps) {
      const base = comps.length > 1 ? `${reg.name} → ${sub.name}` : reg.name;
      if (!VIEWS[view].needs(sub)) {
        missing.push(base);
        continue;
      }
      const dose = reg.dose * mgPerUnit;
      const color = comps.length > 1 ? sub.color : reg.color;
      const variants = [{ s: sub, suffix: "", dash: null, notes: [] }];
      if (mode !== "off") {
        const fx = factorsFor(sub.drug, present, state.interactions, mode);
        if (fx.changed) variants.push({ s: withFactors(sub, fx), suffix: ` · ${mode} interaction`, dash: [8, 5], notes: fx.hits });
        else if (fx.hits.length) variants[0].notes = fx.hits;
      }
      // interaction lines are normalised to the uninteracted peak, so the rise stays visible
      const basePeaks = [];
      for (const v of variants) {
        const outs = outputsFor(v.s, reg, dose, times, view);
        const bands = showBand && v === variants[0] ? band(v.s, reg, dose, times, view) : null;
        outs.forEach((o, j) => {
          const st = stats(o.u, reg, dose, times, o.values);
          st.cavg = o.factor && st.cavg != null ? st.cavg * o.factor : null;
          if (v === variants[0]) basePeaks[j] = st.peak;
          lines.push({
            normPeak: basePeaks[j],
            label: `${o.index || view === "occupancy" ? `${base} → ${o.name}` : base}${v.suffix}`,
            color: o.index ? tint(color) : color,
            dash: v.dash ?? (o.index ? [2, 4] : null),
            values: o.values,
            avg: showAvg && reg.intervalH ? rollingAverage(times, o.values, reg.intervalH) : null,
            band: bands?.[j] ?? null,
            stats: st,
            cavg: st.cavg,
            unit: { conc: sub.conc?.unit ?? "ng/mL", occupancy: "%" }[view] ?? "mg", // unit of stats.peak (raw, before normalising)
            notes: v.notes,
          });
        });
      }
    }
  }
  if (VIEWS[view].normalize) return { lines: normalize(lines), missing };
  return { lines, missing };
}

/** Scale every line (average, band) to % of its own peak (interaction lines: of the uninteracted peak). */
export const normalize = (lines) =>
  lines.map((l) => {
    const k = l.normPeak > 0 ? 100 / l.normPeak : 0;
    const sc = (arr) => arr?.map((x) => (x == null ? null : x * k)) ?? null;
    return {
      ...l,
      values: sc(l.values),
      avg: sc(l.avg),
      band: l.band ? { lo: sc(l.band.lo), hi: sc(l.band.hi) } : null,
      cavg: l.stats.cavg == null ? null : l.stats.cavg * k,
    };
  });
