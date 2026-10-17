// DOM wiring only. Math: pk.js, state → lines: model.js, persistence: io.js.

import { fromHash, fromJson, load, save, toHash, toJson } from "./io.js";
import { buildLines, VIEWS } from "./model.js";
import { defaults } from "./presets.js";
import { marked } from "./vendor/marked.esm.js";

const $ = (sel) => document.querySelector(sel);
const msg = (text) => {
  $("#msg").textContent = text;
};

let state;
try {
  state = fromHash(location.hash) ?? load() ?? defaults();
} catch (e) {
  state = defaults();
  queueMicrotask(() => msg(e.message));
}

/** Tiny element builder: h("input", {type: "number"}, ...children). */
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "style") el.style.cssText = v;
    else if (k.startsWith("data-")) el.setAttribute(k, v);
    else el[k] = v;
  }
  el.append(...kids.flat().filter((x) => x != null));
  return el;
}

const fmt = (x) => (x == null ? "–" : Math.abs(x) >= 100 ? x.toFixed(0) : x.toPrecision(3));
const fmtH = (hrs) => (hrs >= 48 ? `${fmt(hrs / 24)} d` : `${fmt(hrs)} h`);
const clock = (t) => {
  const day = Math.floor(t / 24) + 1;
  const m = Math.round((t - Math.floor(t / 24) * 24) * 60);
  return `d${day} ${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const subOf = (id) => state.substances.find((s) => s.id === id);

function commit({ cards = false } = {}) {
  save(state);
  history.replaceState(null, "", location.pathname);
  if (cards) renderCards();
  renderChart();
}

// ---------- chart ----------
let plot;
function renderChart() {
  const { rangeH, yMode, showMean, interactions } = state.view;
  const n = 1200;
  const times = Array.from({ length: n + 1 }, (_, i) => (i * rangeH) / n);
  const { lines, missing } = buildLines(state, times);
  const series = [{ label: "time", value: (_, v) => (v == null ? "" : clock(v)) }];
  const data = [times];
  const bands = [];
  const helpers = []; // series indices of bands/means/averages, kept out of the legend
  const aux = (cfg, values) => {
    helpers.push(series.length);
    series.push(cfg);
    data.push(values);
  };
  for (const l of lines) {
    if (l.band) {
      // band edges drawn invisibly, filled between by uPlot `bands`
      aux({ label: `${l.label} (95th pct)`, stroke: "transparent", points: { show: false } }, l.band.hi);
      aux({ label: `${l.label} (5th pct)`, stroke: "transparent", points: { show: false } }, l.band.lo);
      bands.push({ series: [series.length - 2, series.length - 1], fill: `${l.color}2e` });
    }
    series.push({ label: l.label, stroke: l.color, width: 2, dash: l.dash ?? undefined, value: (_, v) => (v == null ? "" : fmt(v)) });
    data.push(Array.from(l.values));
    if (l.avg) aux({ label: `${l.label} (τ-avg)`, stroke: l.color, width: 1, dash: [4, 4] }, l.avg);
    if (showMean && l.cavg != null)
      aux(
        { label: `${l.label} (mean)`, stroke: l.color, width: 1, dash: [1, 6] },
        times.map(() => l.cavg),
      );
  }
  const el = $("#chart");
  plot?.destroy();
  const css = getComputedStyle(document.documentElement);
  const axis = { stroke: css.getPropertyValue("--muted"), grid: { stroke: css.getPropertyValue("--line") } };
  plot = new uPlot(
    {
      width: el.clientWidth || 600,
      height: Math.max(220, Math.min(460, window.innerHeight * (window.innerWidth < 768 ? 0.36 : 0.5))),
      scales: { x: { time: false }, y: { range: (_, _min, max) => [0, max > 0 ? max * 1.05 : 1] } },
      axes: [
        { ...axis, values: (_, ticks) => ticks.map(clock), space: 70 },
        { ...axis, label: VIEWS[yMode].label, values: (_, t) => t.map(fmt), size: 60 },
      ],
      series,
      bands,
      legend: { live: true },
    },
    data,
    el,
  );
  const rows = plot.root.querySelectorAll(".u-legend .u-series");
  for (const i of helpers) rows[i]?.style.setProperty("display", "none");
  renderStats(lines, interactions);
  $("#missing").textContent = missing.length ? `No data for this view: ${missing.join(", ")} (see Limits).` : "";
}
new ResizeObserver(() => plot?.setSize({ width: $("#chart").clientWidth, height: plot.height })).observe($("#plot"));

function renderStats(lines, mode) {
  const rows = lines.map((l) =>
    h(
      "tr",
      {},
      h("td", {}, h("span", { className: "swatch", style: `background:${l.color}` }), l.label),
      h("td", {}, `${fmt(l.stats.peak)} ${l.unit}`),
      h("td", {}, clock(l.stats.peakAtH)),
      h("td", {}, fmt(l.stats.cavg)),
      h("td", {}, fmtH(l.stats.effThalfH)),
      h("td", {}, fmt(l.stats.accumulation)),
      h("td", {}, fmtH(l.stats.tssH)),
      h("td", { className: "small" }, mode === "off" ? "" : l.notes.map((r) => `${r.perp}: ${r.note}`).join(" ")),
    ),
  );
  $("#stats").replaceChildren(
    h(
      "tr",
      {},
      ["Line", "Peak", "at", "Mean", "Slowest t½", "Accum.", "≈ steady state", "Interaction notes"].map((x) => h("th", {}, x)),
    ),
    ...rows,
  );
}

// ---------- cards ----------
const field = (label, input) => h("label", {}, h("span", { className: "small" }, label), input);
const numIn = (value, onSet, step = "any") =>
  h("input", {
    type: "number",
    step,
    value,
    oninput: (e) => {
      const v = Number(e.target.value);
      if (e.target.value !== "" && Number.isFinite(v) && v >= 0) {
        onSet(v);
        commit();
      }
    },
  });

/** Number field for an optional nested value: path like "recirc.lagH"; empty or 0 removes it. */
function optField(sub, label, path, title) {
  const keys = path.split(".");
  const get = () => keys.reduce((o, k) => o?.[k], sub);
  const input = h("input", {
    type: "number",
    step: "any",
    value: get() ?? "",
    title,
    style: "width:5.5em",
    oninput: (e) => {
      const v = e.target.value === "" ? null : Number(e.target.value);
      if (v != null && !(v >= 0)) return;
      let o = sub;
      for (const k of keys.slice(0, -1)) o = o[k] ??= {};
      o[keys.at(-1)] = v || undefined;
      commit();
    },
  });
  return field(label, input);
}

const phasesText = (phases) => phases.map((p) => `${p.f}@${p.thalfH}`).join("; ");
const parsePhases = (text) => {
  const ph = text.split(";").map((x) => {
    const [f, t] = x.split("@").map(Number);
    return { f, thalfH: t };
  });
  const ok = ph.every((p) => p.f >= 0 && p.thalfH > 0) && Math.abs(ph.reduce((a, p) => a + p.f, 0) - 1) < 1e-6;
  return ok ? ph : null;
};

function pkEditor(sub) {
  if (sub.components)
    return h(
      "div",
      { className: "row" },
      sub.components.map((c) =>
        field(
          `${subOf(c.id).name} %`,
          numIn(c.mgPerUnit / 10, (v) => {
            c.mgPerUnit = v * 10;
          }),
        ),
      ),
    );
  const absorptionField =
    sub.tmaxH != null
      ? field(
          "Tmax h",
          numIn(sub.tmaxH, (v) => {
            if (v > 0) sub.tmaxH = v;
          }),
        )
      : sub.absStepsH
        ? field(
            "depot steps t½ h",
            h("input", {
              value: sub.absStepsH.join(", "),
              oninput: (e) => {
                const v = e.target.value.split(",").map(Number);
                if (v.every((x) => x > 0)) {
                  sub.absStepsH = v;
                  commit();
                }
              },
            }),
          )
        : field(
            "release h",
            numIn(sub.releaseH, (v) => {
              if (v > 0) sub.releaseH = v;
            }),
          );
  return h(
    "div",
    {},
    h(
      "div",
      { className: "row" },
      absorptionField,
      field(
        "F",
        numIn(sub.F, (v) => {
          if (v <= 1) sub.F = v;
        }),
      ),
      field(
        "phases f@t½h",
        h("input", {
          value: phasesText(sub.phases),
          title: "fraction@half-life; fractions sum to 1, e.g. 0.95@0.5; 0.05@25",
          oninput: (e) => {
            const ph = parsePhases(e.target.value);
            e.target.setCustomValidity(ph ? "" : "fractions must sum to 1");
            if (ph) {
              sub.phases = ph;
              commit();
            }
          },
        }),
      ),
    ),
    h(
      "div",
      { className: "row" },
      optField(sub, "lag h", "tlagH", "absorption lag time"),
      optField(sub, "transit n", "transit.n", "number of transit compartments (Savic 2007), max 6"),
      optField(sub, "MTT h", "transit.mttH", "mean transit time"),
      optField(sub, "recirc share", "recirc.fraction", "share of dose re-absorbed later (0–1)"),
      optField(sub, "recirc after h", "recirc.lagH", "delay of the re-absorbed share"),
      optField(sub, "effect t½eq h", "pd.ke0ThalfH", "effect-site equilibration half-life (Sheiner 1979)"),
      optField(sub, `V for ${sub.conc?.unit ?? "ng/mL"} (L)`, "conc.vL", "scaling volume for concentration view"),
    ),
    sub.metabolites?.length
      ? h(
          "div",
          { className: "row" },
          sub.metabolites.map((m) =>
            h(
              "label",
              { className: "small" },
              h("input", {
                type: "checkbox",
                checked: m.on,
                onchange: (e) => {
                  m.on = e.target.checked;
                  commit();
                },
              }),
              `${m.name} (t½ ${m.thalfH} h${m.active ? "" : ", inactive"})`,
            ),
          ),
        )
      : null,
  );
}

function card(reg, idx) {
  const sub = subOf(reg.substanceId);
  return h(
    "div",
    { className: `card${reg.on ? "" : " off"}`, style: `--c:${reg.color}` },
    h(
      "div",
      { className: "row" },
      h("input", {
        type: "checkbox",
        checked: reg.on,
        title: "show",
        onchange: (e) => {
          reg.on = e.target.checked;
          commit({ cards: true });
        },
      }),
      h("input", {
        type: "color",
        value: reg.color,
        oninput: (e) => {
          reg.color = e.target.value;
          e.target.closest(".card").style.setProperty("--c", reg.color);
          commit();
        },
      }),
      h("input", {
        className: "grow",
        value: reg.name,
        "aria-label": "name",
        oninput: (e) => {
          reg.name = e.target.value;
          commit();
        },
      }),
      h("button", {
        textContent: "✕",
        title: "remove",
        onclick: () => {
          state.regimens.splice(idx, 1);
          commit({ cards: true });
        },
      }),
    ),
    h(
      "div",
      { className: "row" },
      field(
        `dose ${sub.unit ?? "mg"}`,
        numIn(reg.dose, (v) => {
          reg.dose = v;
        }),
      ),
      field(
        "first at h",
        numIn(reg.startH, (v) => {
          reg.startH = v;
        }),
      ),
      field(
        "every h",
        numIn(reg.intervalH, (v) => {
          if (v > 0) reg.intervalH = v;
        }),
      ),
    ),
    h(
      "div",
      { className: "row" },
      h(
        "label",
        {},
        h("input", {
          type: "checkbox",
          checked: reg.steadyState,
          onchange: (e) => {
            reg.steadyState = e.target.checked;
            commit({ cards: true });
          },
        }),
        "steady state",
      ),
      reg.steadyState
        ? null
        : field(
            "doses",
            numIn(
              reg.count,
              (v) => {
                if (v >= 1) reg.count = Math.round(v);
              },
              1,
            ),
          ),
      field(
        "skip #",
        h("input", {
          value: (reg.skip ?? []).join(", "),
          placeholder: "e.g. 3, 5",
          style: "width:7em",
          oninput: (e) => {
            reg.skip = e.target.value
              .split(",")
              .map((x) => Number.parseInt(x, 10))
              .filter((x) => x >= 1);
            commit();
          },
        }),
      ),
    ),
    sub.conc
      ? h(
          "label",
          { className: "small", title: sub.conc.basis },
          h("input", {
            type: "checkbox",
            checked: state.view.yMode === "conc",
            onchange: (e) => {
              state.view.yMode = e.target.checked ? "conc" : "normalized";
              commit({ cards: true });
            },
          }),
          `absolute (${sub.conc.unit}) ⓘ`,
        )
      : null,
    h(
      "details",
      {},
      h("summary", {}, "PK & sources"),
      pkEditor(sub),
      sub.approx ? h("p", { className: "small" }, `≈ ${sub.approx}`) : null,
      h(
        "p",
        { className: "small" },
        sub.sources.map((s, i) => [i ? " · " : "", h("a", { href: s.url, target: "_blank", rel: "noopener", textContent: s.title })]),
      ),
      h("p", { className: "small" }, "Shared by all regimens using this substance."),
    ),
  );
}

function renderCards() {
  $("#cards").replaceChildren(...state.regimens.map(card));
  $("#add-sub").replaceChildren(...state.substances.map((s) => h("option", { value: s.id, textContent: s.name })));
  for (const el of document.querySelectorAll("[data-view]")) {
    const v = state.view[el.dataset.view];
    if (el.type === "checkbox") el.checked = v;
    else el.value = String(v);
  }
  renderInteractions();
}

function renderInteractions() {
  const factorIn = (rule, key, i) =>
    rule[key]
      ? numIn(rule[key][i], (v) => {
          if (v > 0) rule[key][i] = v;
        })
      : "–";
  $("#ix").replaceChildren(
    h(
      "tr",
      {},
      ["Perpetrator → victim", "Typical", "Worst", "Evidence"].map((x) => h("th", {}, x)),
    ),
    ...state.interactions.map((r) => {
      const key = r.keFactor ? "keFactor" : "fFactor";
      const label = r.keFactor ? "ke ×" : r.fFactor ? "F ×" : "note";
      return h(
        "tr",
        { title: r.note },
        h("td", {}, `${r.perp} → ${r.victim} (${label})`),
        h("td", {}, factorIn(r, key, 0)),
        h("td", {}, factorIn(r, key, 1)),
        h("td", {}, h("a", { href: r.source.url, target: "_blank", rel: "noopener", textContent: r.evidence })),
      );
    }),
  );
}

// ---------- toolbar ----------
for (const el of document.querySelectorAll("[data-view]")) {
  el.addEventListener("change", () => {
    const k = el.dataset.view;
    state.view[k] = el.type === "checkbox" ? el.checked : k === "rangeH" ? Number(el.value) : el.value;
    commit({ cards: k === "yMode" }); // cards show the "absolute" toggle
  });
}

async function openDoc(name) {
  const res = await fetch(`docs/${name}.md`);
  const text = res.ok ? await res.text() : `Could not load docs/${name}.md`;
  $("#doc-title").textContent = name[0].toUpperCase() + name.slice(1);
  $("#doc-body").innerHTML = marked.parse(text); // our own repo docs, not user input
  for (const a of $("#doc-body").querySelectorAll("a")) a.target = "_blank";
  $("#doc").showModal();
}

const actions = {
  import: () => $("#file").click(),
  export: () => {
    const a = h("a", {
      href: URL.createObjectURL(new Blob([toJson(state)], { type: "application/json" })),
      download: "halflives.json",
    });
    a.click();
    URL.revokeObjectURL(a.href);
  },
  link: async () => {
    const url = location.origin + location.pathname + toHash(state);
    try {
      await navigator.clipboard.writeText(url);
      msg("Link copied.");
    } catch {
      history.replaceState(null, "", url);
      msg("Link is in the address bar.");
    }
  },
  reset: () => {
    if (confirm("Reset everything to presets?")) {
      state = defaults();
      commit({ cards: true });
    }
  },
  custom: () => {
    const sub = structuredClone(subOf($("#add-sub").value));
    Object.assign(sub, { id: `s-${Date.now()}`, name: `Custom (from ${sub.name})`, approx: "Custom values.", sources: [] });
    state.substances.push(sub);
    $("#add-sub").replaceChildren(...state.substances.map((s) => h("option", { value: s.id, textContent: s.name })));
    $("#add-sub").value = sub.id;
    actions.add();
  },
  add: () => {
    const sub = subOf($("#add-sub").value);
    state.regimens.push({
      id: `r-${Date.now()}`,
      name: sub.name,
      substanceId: sub.id,
      color: sub.color,
      dose: sub.components ? 0.2 : 10,
      startH: 8,
      intervalH: 24,
      count: 1,
      steadyState: false,
      skip: [],
      on: true,
    });
    commit({ cards: true });
  },
  close: () => $("#doc").close(),
};

document.addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  const doc = e.target.closest("[data-doc]")?.dataset.doc;
  if (act) actions[act]();
  if (doc) openDoc(doc);
});

$("#file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    state = fromJson(await f.text());
    msg(`Imported ${f.name}.`);
    commit({ cards: true });
  } catch (err) {
    msg(err.message);
  }
  e.target.value = "";
});

renderCards();
renderChart();
