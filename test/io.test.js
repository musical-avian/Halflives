import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fromHash, fromJson, toHash, toJson, validate } from "../io.js";
import { buildLines, factorsFor, presentDrugs } from "../model.js";
import { defaults } from "../presets.js";

test("presets are valid", () => {
  assert.doesNotThrow(() => validate(defaults()));
});

test("every preset/interaction source is listed in the docs", () => {
  const s = defaults();
  const docs = ["presets", "interactions", "limits"]
    .map((d) => readFileSync(new URL(`../docs/${d}.md`, import.meta.url), "utf8"))
    .join("\n");
  const urls = [...s.substances.flatMap((x) => x.sources), ...s.interactions.map((r) => r.source)].map((x) => x.url);
  for (const u of new Set(urls)) assert.ok(docs.includes(u), `missing in docs: ${u}`);
});

test("JSON and share-link roundtrip", () => {
  const s = defaults();
  assert.deepEqual(fromJson(toJson(s)), s);
  assert.deepEqual(fromHash(toHash(s)), s);
});

test("bad input is rejected with a readable message", () => {
  assert.throws(() => fromJson("{}"), /version/);
  const s = defaults();
  s.substances[0].phases[0].f = 0.5;
  assert.throws(() => validate(s), /sum to 1/);
  const t = defaults();
  t.regimens[0].substanceId = "nope";
  assert.throws(() => validate(t), /unknown substance/);
});

test("cannabis bud expands into THC + CBD lines with grams × mg/g", () => {
  const s = defaults();
  for (const r of s.regimens) r.on = r.id === "r-bud";
  const times = Array.from({ length: 200 }, (_, i) => i * 0.5);
  const { lines } = buildLines(s, times);
  const labels = lines.map((l) => l.label);
  assert.ok(labels.some((l) => l.includes("THC")));
  assert.ok(labels.some((l) => l.includes("CBD")));
  assert.deepEqual([...presentDrugs(s)].sort(), ["cbd", "thc"]);
});

test("interactions: typical vs worst case, only when perpetrator is active", () => {
  const s = defaults();
  const present = new Set(["caffeine", "estradiol", "cbd"]);
  const typ = factorsFor("caffeine", present, s.interactions, "typical");
  const worst = factorsFor("caffeine", present, s.interactions, "worst");
  assert.ok(Math.abs(typ.ke - 0.71 / 1.1) < 1e-12);
  assert.ok(Math.abs(worst.ke - 0.5 / 1.95) < 1e-12, "worst = all perpetrators at max, multiplied");
  assert.equal(factorsFor("caffeine", new Set(["caffeine"]), s.interactions, "worst").changed, false);

  for (const r of s.regimens) r.on = ["r-caf", "r-e2-oral"].includes(r.id);
  s.view.interactions = "worst";
  const times = Array.from({ length: 97 }, (_, i) => i);
  const { lines } = buildLines(s, times);
  const base = lines.find((l) => l.label === "Caffeine (oral)");
  const inter = lines.find((l) => l.label.startsWith("Caffeine (oral) ·"));
  assert.ok(inter, "interaction line exists");
  assert.ok(Math.max(...inter.values) > Math.max(...base.values), "worst case raises caffeine above its normal peak");
});

test("views: concentration/effect/occupancy only for substances with data; missing ones are listed", () => {
  const s = defaults();
  const times = Array.from({ length: 241 }, (_, i) => i * 0.5);
  s.view.yMode = "conc";
  const conc = buildLines(s, times);
  assert.ok(conc.missing.includes("Agomelatine (oral)"), "agomelatine has no concentration scale");
  assert.ok(conc.lines.some((l) => l.label.startsWith("Bupropion") && l.unit === "ng/mL"));
  s.view.yMode = "occupancy";
  for (const r of s.regimens) r.on = r.id === "r-bup";
  s.regimens.find((r) => r.id === "r-bup").dose = 300; // the PET reference regimen
  const occ = buildLines(s, times).lines[0].values;
  const mean = occ.slice(-48).reduce((a, x) => a + x, 0) / 48; // last 24 h at steady state
  assert.ok(Math.abs(mean - 26) < 1.5, `mean DAT occupancy ${mean.toFixed(1)}% ≈ 26% (Learned-Coughlin 2003)`);
});

test("variability band is deterministic and ordered", () => {
  const s = defaults();
  for (const r of s.regimens) r.on = r.id === "r-caf";
  s.view.showBand = true;
  s.view.yMode = "amount";
  const times = Array.from({ length: 97 }, (_, i) => i);
  const a = buildLines(s, times).lines[0];
  const b = buildLines(s, times).lines[0];
  assert.deepEqual(a.band, b.band, "same seed → same band");
  for (let i = 0; i < times.length; i++) assert.ok(a.band.lo[i] <= a.band.hi[i] + 1e-12);
  const iPeak = a.values.indexOf(Math.max(...a.values));
  assert.ok(a.band.lo[iPeak] <= a.values[iPeak] && a.values[iPeak] <= a.band.hi[iPeak], "typical person inside band at peak");
});
