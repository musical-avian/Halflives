// Validation, JSON import/export, share links, local persistence. No DOM.

const KEY = "halflives.v2"; // bump when presets change shape, so stale saved states are not reused
const num = (x, min = 0) => typeof x === "number" && Number.isFinite(x) && x >= min;

/** Throws a readable Error if `s` is not a usable state; returns it otherwise. */
export function validate(s) {
  const fail = (msg) => {
    throw new Error(`Invalid file: ${msg}`);
  };
  if (s?.version !== 1) fail("missing or unknown version");
  for (const k of ["substances", "regimens", "interactions"]) if (!Array.isArray(s[k])) fail(`${k} must be a list`);
  const ids = new Set(s.substances.map((x) => x.id));
  for (const x of s.substances) {
    if (typeof x.id !== "string" || typeof x.name !== "string") fail("substance needs id and name");
    if (x.components) {
      for (const c of x.components) if (!ids.has(c.id) || !num(c.mgPerUnit)) fail(`bad component in ${x.id}`);
      continue;
    }
    if (!num(x.F) || x.F > 1) fail(`${x.id}: F must be 0–1`);
    if (!Array.isArray(x.phases) || !x.phases.length) fail(`${x.id}: phases missing`);
    for (const p of x.phases) if (!num(p.f) || !num(p.thalfH, 1e-6)) fail(`${x.id}: bad phase`);
    const sumF = x.phases.reduce((a, p) => a + p.f, 0);
    if (Math.abs(sumF - 1) > 1e-6) fail(`${x.id}: phase fractions must sum to 1`);
    if (x.tmaxH == null && !x.absStepsH?.length && !num(x.releaseH, 1e-6)) fail(`${x.id}: needs tmaxH, absStepsH or releaseH`);
    for (const m of x.metabolites ?? [])
      if (!num(m.thalfH, 1e-6) || !(num(m.fm) || num(m.aucRatio))) fail(`${x.id}: bad metabolite ${m.name}`);
  }
  for (const r of s.regimens) {
    if (!ids.has(r.substanceId)) fail(`regimen ${r.id}: unknown substance`);
    if (!num(r.dose) || !num(r.intervalH, 1e-6) || !num(r.startH, Number.NEGATIVE_INFINITY)) fail(`regimen ${r.id}: bad numbers`);
  }
  return s;
}

export const toJson = (s) => JSON.stringify(s, null, 2);
export const fromJson = (text) => validate(JSON.parse(text));

const b64 = {
  enc: (str) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(str)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  dec: (str) => new TextDecoder().decode(Uint8Array.from(atob(str.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0))),
};

export const toHash = (s) => `#s=${b64.enc(JSON.stringify(s))}`;
export const fromHash = (hash) => (hash.startsWith("#s=") ? fromJson(b64.dec(hash.slice(3))) : null);

export function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked (private mode etc.) — app still works, just not remembered
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? fromJson(raw) : null;
  } catch {
    return null;
  }
}
