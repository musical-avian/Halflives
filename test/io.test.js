import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fromHash, fromJson, toHash, toJson, validate } from "../io.js";
import { buildLines, factorsFor, normalize, presentDrugs } from "../model.js";
import { defaults } from "../presets.js";

test("presets are valid", () => {
  assert.doesNotThrow(() => validate(defaults()));
});

test("every preset/interaction source is listed in the docs", () => {
  const s = defaults();
  const docs = ["presets", "interactions"].map((d) => readFileSync(new URL(`../docs/${d}.md`, import.meta.url), "utf8")).join("\n");
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
  const lines = buildLines(s, times);
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
  const lines = normalize(buildLines(s, times));
  const base = lines.find((l) => l.label === "Caffeine (oral)");
  const inter = lines.find((l) => l.label.startsWith("Caffeine (oral) ·"));
  assert.ok(inter, "interaction line exists");
  assert.ok(Math.max(...inter.values) > Math.max(...base.values), "worst case raises caffeine above its normal peak");
});
