// State → plot lines. Expands composites, applies interaction overlays. No DOM.
import { curve, doseTimes, rollingAverage, slowest, stats, units, withFactors } from "./pk.js";

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

/**
 * Build plot lines for all active regimens.
 * line = { label, color, dash, values, avg, stats, cavg, notes }
 */
export function buildLines(state, times) {
  const subs = byId(state.substances);
  const present = presentDrugs(state);
  const mode = state.view.interactions;
  const lines = [];
  for (const reg of state.regimens.filter((r) => r.on)) {
    const regSub = subs.get(reg.substanceId);
    if (!regSub) continue;
    const comps = parts(regSub, subs);
    for (const { sub, mgPerUnit } of comps) {
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
        const us = units(v.s);
        const doses = doseTimes(reg, times[times.length - 1], Math.min(...us.map(slowest)));
        const base = comps.length > 1 ? `${reg.name} → ${sub.name}` : reg.name;
        us.forEach((u, i) => {
          if (i > 0 && !u.metabolite.on) return;
          const values = curve(u, doses, dose, times);
          const st = stats(u, reg, dose, times, values);
          if (v === variants[0]) basePeaks[i] = st.peak;
          lines.push({
            normPeak: basePeaks[i],
            label: `${i ? `${base} → ${u.name}` : base}${v.suffix}`,
            color: i ? tint(color) : color,
            dash: v.dash ?? (i ? [2, 4] : null),
            values,
            avg: state.view.showAvg && reg.intervalH ? rollingAverage(times, values, reg.intervalH) : null,
            stats: st,
            cavg: st.cavg,
            notes: v.notes,
          });
        });
      }
    }
  }
  return lines;
}

/** Scale every line (and its average) to % of its own peak (interaction lines: of the uninteracted peak). */
export const normalize = (lines) =>
  lines.map((l) => {
    const k = l.normPeak > 0 ? 100 / l.normPeak : 0;
    return {
      ...l,
      values: Array.from(l.values, (x) => x * k),
      avg: l.avg?.map((x) => (x == null ? null : x * k)) ?? null,
      cavg: l.stats.cavg == null ? null : l.stats.cavg * k,
    };
  });
