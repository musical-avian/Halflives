// Closed-form math checked against an independent RK4 ODE integration of the same compartment model.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  area,
  convolve,
  curve,
  disposition,
  doseTimes,
  rate,
  rollingAverage,
  slowest,
  solveKa,
  stats,
  unitAt,
  units,
  withFactors,
} from "../pk.js";

// ---- RK4 oracle: gut/depot chain → phase compartments (mixture) → metabolites ----
// state = [depot_1..depot_n, central_1..central_p, metabolite_1..metabolite_m]
function ode(sub, ka, doses, dose, tEnd, dt = 0.002) {
  const steps = sub.absStepsH?.map(rate) ?? (ka ? [ka] : []);
  const ks = sub.phases.map((p) => rate(p.thalfH));
  const fs = sub.phases.map((p) => p.f);
  const G = disposition(sub.phases);
  const mets = (sub.metabolites ?? []).map((m) => {
    const km = rate(m.thalfH);
    return { km, r: m.fm != null ? m.fm / area(G) : m.aucRatio * km };
  });
  const nA = steps.length;
  const nP = ks.length;
  const T = sub.releaseH;
  // `t` = start of the current RK4 step: patch on/off switches only on grid points, so input is constant per step
  const deriv = (y, t) => {
    const d = new Array(y.length).fill(0);
    for (let i = 0; i < nA; i++) {
      d[i] -= steps[i] * y[i];
      if (i + 1 < nA) d[i + 1] += steps[i] * y[i];
    }
    // input rate into the body: last absorption step, or zero-order patch release
    let input = nA ? steps[nA - 1] * y[nA - 1] : 0;
    if (!nA && T) for (const td of doses) if (t >= td && t < td + T) input += (sub.F * dose) / T;
    let P = 0;
    for (let j = 0; j < nP; j++) P += y[nA + j];
    for (let j = 0; j < nP; j++) d[nA + j] += fs[j] * input - ks[j] * y[nA + j];
    mets.forEach((m, j) => {
      d[nA + nP + j] += m.r * P - m.km * y[nA + nP + j];
    });
    return d;
  };
  let y = new Array(nA + nP + mets.length).fill(0);
  const out = [];
  const pending = [...doses].sort((a, b) => a - b);
  const n = Math.round(tEnd / dt);
  for (let s = 0; s <= n; s++) {
    const t = s * dt;
    while (pending.length && pending[0] <= t + dt / 2) {
      pending.shift();
      if (nA) y[0] += sub.F * dose;
      else if (!T) for (let j = 0; j < nP; j++) y[nA + j] += fs[j] * sub.F * dose;
    }
    let P = 0;
    for (let j = 0; j < nP; j++) P += y[nA + j];
    out.push([P, ...y.slice(nA + nP)]);
    const k1 = deriv(y, t);
    const k2 = deriv(
      y.map((v, i) => v + (dt / 2) * k1[i]),
      t,
    );
    const k3 = deriv(
      y.map((v, i) => v + (dt / 2) * k2[i]),
      t,
    );
    const k4 = deriv(
      y.map((v, i) => v + dt * k3[i]),
      t,
    );
    y = y.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  return { at: (t, idx = 0) => out[Math.round(t / dt)][idx] };
}

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);

function compare(sub, doses, dose, tEnd, tol = 1e-6) {
  const us = units(sub);
  const ka = sub.tmaxH != null && !sub.absStepsH ? solveKa(sub.tmaxH, disposition(sub.phases)) : null;
  // Patch: release window must align with ODE grid; dt chosen so doses land on grid points.
  const ref = ode(sub, ka, doses, dose, tEnd);
  // sample on the ODE grid (dt = 0.002 h) so no time-rounding error enters the comparison
  const ts = Array.from({ length: 38 }, (_, i) => Math.round((0.25 + (i * (tEnd - 0.25)) / 37) * 500) / 500);
  us.forEach((u, idx) => {
    const exact = curve(u, doses, dose, ts);
    const peak = Math.max(...exact);
    assert.ok(peak > 0, `${u.name} has a curve`);
    ts.forEach((t, i) => {
      close(exact[i], ref.at(t, idx), tol * peak, `${sub.name}/${u.name} t=${t.toFixed(2)}`);
    });
  });
}

const oral1 = { name: "oral1", F: 0.8, tmaxH: 2, phases: [{ f: 1, thalfH: 6 }] };
const oral2 = {
  name: "oral2",
  F: 0.3,
  tmaxH: 1,
  phases: [
    { f: 0.9, thalfH: 1.5 },
    { f: 0.1, thalfH: 30 },
  ],
};

test("convolve matches the Bateman equation", () => {
  const ka = 1.3;
  const ke = 0.2;
  const terms = convolve([{ c: ka, k: ka }], [{ c: 1, k: ke }]);
  for (const t of [0, 0.5, 2, 10, 40]) {
    const bateman = (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
    close(
      terms.reduce((s, { c, k }) => s + c * Math.exp(-k * t), 0),
      bateman,
      1e-12,
      `t=${t}`,
    );
  }
});

test("solveKa reproduces the textbook Tmax formula, both branches", () => {
  const ke = rate(10);
  for (const tmax of [0.2, 1, 5, 1 / ke, 30]) {
    const ka = solveKa(tmax, [{ c: 1, k: ke }]);
    // at tmax = 1/ke (ka = ke) the equal-rate nudge costs ~NUDGE/4 relative
    close(Math.log(ka / ke) / (ka - ke), tmax, 1e-5 * tmax, `tmax=${tmax}`);
  }
});

test("single oral dose: ODE oracle, peak at Tmax, AUC = F·D/ke", () => {
  compare(oral1, [0], 100, 48);
  const [u] = units(oral1);
  const ts = Array.from({ length: 20001 }, (_, i) => i * 0.0005);
  const v = curve(u, [0], 100, ts);
  const s = stats(u, { intervalH: 24, count: 1 }, 100, ts, v);
  close(s.peakAtH, 2, 0.001, "peak time");
  close(100 * u.auc, (0.8 * 100) / rate(6), 1e-9, "AUC");
});

test("two-phase disposition (THC/CBD shape): ODE oracle + peak at Tmax", () => {
  compare(oral2, [0], 10, 72);
  const [u] = units(oral2);
  const ts = Array.from({ length: 4001 }, (_, i) => i * 0.001);
  const v = curve(u, [0], 10, ts);
  close(ts[v.indexOf(Math.max(...v))], 1, 0.002, "peak");
  close(u.auc, 0.3 * (0.9 / rate(1.5) + 0.1 / rate(30)), 1e-9, "AUC");
});

test("metabolites: ODE oracle, fm mass balance and exposure-ratio form", () => {
  const sub = {
    ...oral1,
    metabolites: [
      { name: "m-fm", thalfH: 3, fm: 0.8 },
      { name: "m-ratio", thalfH: 20, aucRatio: 13 },
    ],
  };
  compare(sub, [0], 100, 60);
  const [p, mFm, mRatio] = units(sub);
  close(mFm.auc, (0.8 * 0.8) / rate(3), 1e-9, "fm: AUC_M = fm·F·D/km");
  close(mRatio.auc / p.auc, 13, 1e-9, "ratio: AUC_M/AUC_P");
});

test("depot injection (2 absorption steps): ODE oracle, delayed peak", () => {
  const depot = { name: "depot", F: 1, absStepsH: [29, 38], phases: [{ f: 1, thalfH: 1 }] };
  compare(depot, [0], 5, 24 * 14);
  const [u] = units(depot);
  const ts = Array.from({ length: 24 * 14 * 10 }, (_, i) => i / 10);
  const v = curve(u, [0], 5, ts);
  const tPeak = ts[v.indexOf(Math.max(...v))];
  assert.ok(tPeak > 40 && tPeak < 56, `peak ~2 d, got ${tPeak} h`);
});

test("equal absorption steps are handled (nudge), still match ODE", () => {
  compare({ name: "eq", F: 1, absStepsH: [30, 30], phases: [{ f: 1, thalfH: 1 }] }, [0], 5, 300, 1e-4);
});

test("patch (zero-order release): ODE oracle and total absorbed = R·T", () => {
  const patch = { name: "patch", F: 1, releaseH: 84, phases: [{ f: 1, thalfH: 1 }] };
  compare(patch, [0, 84], 0.175, 200);
  const [u] = units(patch);
  close(0.175 * u.auc, 0.175 / rate(1), 1e-12, "AUC");
  close(unitAt(u, 42), 1 / 84 / rate(1), 1e-6, "plateau = R/ke");
});

test("repeat doses with a skipped dose == regimen without that dose; matches ODE", () => {
  const reg = { startH: 0, intervalH: 24, count: 5, skip: [3] };
  const doses = doseTimes(reg, 200, 0.1);
  assert.deepEqual(doses, [0, 24, 72, 96]);
  compare(oral1, doses, 50, 150);
});

test("steady state: history sum == closed form 1/(1−e^(−kτ)) and matches long ODE run", () => {
  const ke = rate(21);
  const sub = { name: "ss", F: 1, tmaxH: 5, phases: [{ f: 1, thalfH: 21 }] };
  const [u] = units(sub);
  const reg = { startH: 0, intervalH: 24, steadyState: true };
  const doses = doseTimes(reg, 48, slowest(u));
  const ka = solveKa(5, [{ c: 1, k: ke }]);
  for (const s of [0, 3, 5, 12, 23]) {
    const exact = curve(u, doses, 150, [s])[0];
    const closed = ((150 * ka) / (ka - ke)) * (Math.exp(-ke * s) / (1 - Math.exp(-ke * 24)) - Math.exp(-ka * s) / (1 - Math.exp(-ka * 24)));
    close(exact, closed, 1e-9 * closed, `s=${s}`);
  }
  // ODE: 40 daily doses (~46 half-lives of history), compare the last day with SS.
  const long = Array.from({ length: 40 }, (_, i) => i * 24);
  const ref = ode(sub, ka, long, 150, 40 * 24, 0.005);
  for (const s of [1, 5, 12]) close(curve(u, doses, 150, [s])[0], ref.at(39 * 24 + s), 1e-5 * 150, `ode s=${s}`);
});

test("τ-average at steady state == Cavg = F·D·AUC/τ", () => {
  const [u] = units(oral2);
  const reg = { startH: 0, intervalH: 12, steadyState: true };
  const ts = Array.from({ length: 4801 }, (_, i) => i * 0.01);
  const v = curve(u, doseTimes(reg, 48, slowest(u)), 25, ts);
  const avg = rollingAverage(ts, v, 12);
  close(avg[avg.length - 1], stats(u, reg, 25, ts, v).cavg, 1e-5 * Math.max(...v), "avg (trapezoid, dt 0.01 h)");
});

test("interaction factors scale AUC as expected", () => {
  const [base] = units(oral1);
  const [slowed] = units(withFactors(oral1, { ke: 1 / 1.95 }));
  close(slowed.auc / base.auc, 1.95, 1e-9, "ke ÷ 1.95 → AUC × 1.95");
  const low = { ...oral1, F: 0.05 };
  close(units(withFactors(low, { f: 3 }))[0].auc / units(low)[0].auc, 3, 1e-9, "F × 3");
  assert.equal(withFactors(oral1, { f: 5 }).F, 1, "F capped at 1");
});

test("property check: 300 random parameter sets keep AUC and peak identities", () => {
  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 300; i++) {
    const thalf = 0.5 + rnd() * 60;
    const tmax = 0.1 + rnd() * 10;
    const F = 0.01 + rnd() * 0.99;
    const f = 0.5 + rnd() * 0.5;
    const sub = {
      F,
      tmaxH: tmax,
      phases: [
        { f, thalfH: thalf },
        { f: 1 - f, thalfH: thalf * (2 + rnd() * 20) },
      ],
    };
    const [u] = units(sub);
    const G = disposition(sub.phases);
    close(u.auc, F * area(G), 1e-9 * u.auc, `auc #${i}`);
    // numeric AUC of the closed-form curve (Simpson out to 40 slowest half-lives)
    const tEnd = (40 * Math.LN2) / slowest(u);
    const simpson = (a, b, n) => {
      const h = (b - a) / n;
      let s = unitAt(u, a) + unitAt(u, b);
      for (let j = 1; j < n; j++) s += (j % 2 ? 4 : 2) * unitAt(u, a + j * h);
      return (s * h) / 3;
    };
    // segments resolve the fast rise near tmax and the long tail alike
    const cuts = [0, 2, 10, 50, 250].map((x) => Math.min(x * tmax, tEnd)).concat(tEnd);
    let num = 0;
    for (let j = 0; j + 1 < cuts.length; j++) num += simpson(cuts[j], cuts[j + 1], 20000);
    close(num, u.auc, 1e-6 * u.auc, `numeric auc #${i}`);
    // slope changes sign at tmax
    const sl = (t) => u.terms.reduce((s, { c, k }) => s - k * c * Math.exp(-k * t), 0);
    assert.ok(sl(tmax * 0.98) > 0 && sl(tmax * 1.02) < 0, `peak at tmax #${i}`);
  }
});
