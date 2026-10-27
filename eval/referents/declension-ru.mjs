// eval/referents/declension-ru.mjs — THE DECLENSION FOLD ON RUSSIAN NAMES, against UD Russian's lemma column (pre-registered: PREREG-DECLENSION-RU.md).
//
// It reads whole UD Russian documents through read-core.mjs::readWith (the reader's one core) with and without `declension: true` and scores what the reader itself reports (`entry.cast`) against
// the gold: two proper-name mentions are one name when their lemma sequences are equal ("Пьер", "Пьера", "Пьеру" share the lemma "Пьер"). Nothing here folds a name.
//
//   node eval/referents/declension-ru.mjs [--slice D,T,S] [--out file.json] [--dump-off file.json --dump-only]
//
//   D  UD_Russian-Taiga dev (design)      T  UD_Russian-Taiga test (the confirmation, read once)      S  UD_Russian-GSD test (cross-check; the part-of-speech prior was built from GSD train)
//   --dump-off f --dump-only   hash the entries read without the option (and with declension:false), to be diffed between the base commit and the branch: C2.
import fs from "node:fs";
import crypto from "node:crypto";
import { readWith } from "../../native/the-fold/read-core.mjs";
import { discoverReferents, namesCorefer } from "../../native/adapters/text/surfaces.js";
import { createDeclensionFolder } from "../../native/adapters/text/declension.js";
import { metricsInit, metricsAdd, metricsDone } from "./referent-read.mjs";

const UD = process.env.UD_DIR || "/Users/mlacy/Downloads/workspace/data/ud";
const FILES = { D: "UD_Russian-Taiga/ru_taiga-ud-dev.conllu", T: "UD_Russian-Taiga/ru_taiga-ud-test.conllu", S: "UD_Russian-GSD/ru_gsd-ud-test.conllu" };
const PRIOR = process.env.DECLENSION_RUS || new URL("../../native/priors/declension-rus.json", import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const sha = (x) => crypto.createHash("sha256").update(x).digest("hex");
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c);

/** a conllu file → documents → sentences → gold name runs: { key (lower-cased lemmas), a, b } in the document text */
export function parseUd(file, { blockIfNoDocs = 100 } = {}) {
  const sents = []; let cur = null, doc = -1, sawDoc = false;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# newdoc")) { doc++; sawDoc = true; continue; }
    if (line.startsWith("# text = ")) { cur = { doc: Math.max(doc, 0), text: line.slice(9), tokens: [] }; continue; }
    if (line.startsWith("#")) continue;
    if (!line.trim()) { if (cur && cur.tokens.length) sents.push(cur); cur = null; continue; }
    const f = line.split("\t"); if (!cur || !/^\d+$/.test(f[0])) continue;
    cur.tokens.push({ id: +f[0], form: f[1], lemma: f[2], upos: f[3] });
  }
  if (cur && cur.tokens.length) sents.push(cur);
  if (!sawDoc) sents.forEach((s, i) => { s.doc = Math.floor(i / blockIfNoDocs); });
  const docs = new Map();
  for (const s of sents) { if (!docs.has(s.doc)) docs.set(s.doc, []); docs.get(s.doc).push(s); }
  return [...docs.entries()].map(([id, ss]) => {
    const text = ss.map((s) => s.text).join(" "), names = []; let off = 0;
    for (const s of ss) {
      let p = 0; const placed = s.tokens.map((t) => { const i = s.text.indexOf(t.form, p); if (i >= 0) { p = i + t.form.length; return { ...t, a: off + i, b: off + i + t.form.length }; } return { ...t, a: null, b: null }; });
      for (let i = 0; i < placed.length; i++) {
        if (placed[i].upos !== "PROPN" || placed[i].a === null) continue;
        let j = i; while (j + 1 < placed.length && placed[j + 1].upos === "PROPN" && placed[j + 1].a !== null && placed[j + 1].id === placed[j].id + 1) j++;
        names.push({ key: placed.slice(i, j + 1).map((t) => t.lemma.toLowerCase()).join(" "), a: placed[i].a, b: placed[j].b });
        i = j;
      }
      off += s.text.length + 1;
    }
    return { id: `d${id}`, text, names, sentences: ss.length };
  });
}

const labelFor = (g, spans) => {
  let best = null, bo = 0;
  for (const s of spans) { const ov = overlap(g.a, g.b, s.a, s.b); if (ov > bo || (ov === bo && ov > 0 && (s.a < best.a || (s.a === best.a && s.b - s.a > best.b - best.a)))) { bo = ov; best = s; } }
  return best ? best.label : null;
};
const castSpans = (e) => { const out = []; for (const c of e.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) out.push({ a, b, label: c.ref }); return out; };

/** the ungated arm: the same rule table, the same organs, no part-of-speech gate */
const ungatedOrgans = (prior) => {
  const { sameStem } = createDeclensionFolder(prior);
  return { discoverReferents: (s, o = {}) => discoverReferents(s, { ...o, sameStem }), namesCorefer: (a, b, o = {}) => namesCorefer(a, b, { ...(typeof o === "function" ? { sameStem: o } : o), sameStem }) };
};
/** the shuffled-prior control: the rules' `to` sides permuted (a seeded Fisher-Yates) */
const shuffledPrior = (prior, seed) => {
  const r = rng(seed), tos = prior.rules.map((x) => x.to);
  for (let i = tos.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tos[i], tos[j]] = [tos[j], tos[i]]; }
  return { ...prior, rules: prior.rules.map((x, i) => ({ ...x, to: tos[i] })) };
};

const readArm = (doc, arm, prior) => {
  const base = { language: "ru", minCharacters: 0 };
  if (arm === "plain") return readWith(doc.text, base);
  if (arm === "gated") return readWith(doc.text, { ...base, declension: true });
  if (arm === "ungated") return readWith(doc.text, { ...base, readerOptions: ungatedOrgans(prior) });
  if (arm === "off") return readWith(doc.text, { ...base, declension: false });
  throw new Error(`unknown arm ${arm}`);
};

function scoreArms(docs, prior, arms) {
  const M = Object.fromEntries(arms.map((a) => [a, metricsInit()])), beings = Object.fromEntries(arms.map((a) => [a, 0])), perDoc = [];
  for (const d of docs) {
    const entries = Object.fromEntries(arms.map((a) => [a, readArm(d, a, prior)]));
    const plainSpans = castSpans(entries.plain);
    const G = d.names.filter((g) => plainSpans.some((s) => overlap(g.a, g.b, s.a, s.b) > 0));
    for (const a of arms) { const sp = castSpans(entries[a]); metricsAdd(M[a], G.map((g) => ({ gold: g.key, sys: labelFor(g, sp) }))); beings[a] += entries[a].cast.length; }
    perDoc.push({ id: d.id, names: d.names.length, covered: G.length, sentences: d.sentences });
  }
  return { metrics: Object.fromEntries(arms.map((a) => [a, metricsDone(M[a])])), beings, perDoc };
}

/** recall gain of the shuffled-prior control over plain, per draw */
function nullGains(docs, prior, plainRecall, draws, seed) {
  const gains = [];
  for (let k = 0; k < draws; k++) {
    const sp = shuffledPrior(prior, seed + k), M = metricsInit();
    for (const d of docs) {
      const plain = readWith(d.text, { language: "ru", minCharacters: 0 }), ctl = readWith(d.text, { language: "ru", minCharacters: 0, declension: { prior: sp } });
      const ps = castSpans(plain), cs = castSpans(ctl), G = d.names.filter((g) => ps.some((s) => overlap(g.a, g.b, s.a, s.b) > 0));
      metricsAdd(M, G.map((g) => ({ gold: g.key, sys: labelFor(g, cs) })));
    }
    gains.push(metricsDone(M).pair.r - plainRecall);
  }
  return gains.sort((a, b) => a - b);
}

async function main() {
  const prior = JSON.parse(fs.readFileSync(PRIOR, "utf8"));
  const want = arg("--slice", "D").split(","), draws = 19, margin = 0.005;
  const dump = arg("--dump-off", null), dumped = {}, report = { prereg: "PREREG-DECLENSION-RU.md", slices: {} };
  for (const name of want) {
    const file = path_(name), docs = parseUd(file);
    if (dump) { for (const d of docs) { dumped[`${name}:${d.id}`] = sha(JSON.stringify({ ...readArm(d, "plain", prior), ms: 0 })) + ":" + sha(JSON.stringify({ ...readArm(d, "off", prior), ms: 0 })); } if (process.argv.includes("--dump-only")) continue; }
    const arms = ["plain", "gated", "ungated"], S = scoreArms(docs, prior, arms), P = S.metrics.plain, Gd = S.metrics.gated, U = S.metrics.ungated;
    const gains = nullGains(docs, prior, P.pair.r, draws, 20261127), gain = Gd.pair.r - P.pair.r;
    const bars = {
      B1_recall: gain > 0 && gain > gains.at(-1),
      B2_f1: Gd.pair.f1 >= P.pair.f1,
      B3_gate_costs_nothing: Gd.pair.p >= U.pair.p - margin && Gd.pair.f1 >= U.pair.f1 - margin,
    };
    report.slices[name] = { file: path_(name).split("/").slice(-2).join("/"), sha256: sha(fs.readFileSync(file)), documents: docs.length, goldNames: docs.reduce((n, d) => n + d.names.length, 0), covered: S.perDoc.reduce((n, d) => n + d.covered, 0), metrics: S.metrics, beings: S.beings, control: { draws, seed: 20261127, gains, max: gains.at(-1), mean: gains.reduce((a, b) => a + b, 0) / draws }, gain, bars };
    const f3 = (x) => x.toFixed(3);
    console.log(`\nslice ${name} (${report.slices[name].file}): ${docs.length} documents, ${report.slices[name].goldNames} gold names, ${report.slices[name].covered} covered by the plain cast`);
    console.log("arm        pairwise P / R / F1         B-cubed P / R / F1          beings");
    for (const a of arms) { const m = S.metrics[a]; console.log(a.padEnd(10), [m.pair.p, m.pair.r, m.pair.f1].map(f3).join(" / ").padEnd(26), [m.b3.p, m.b3.r, m.b3.f1].map(f3).join(" / ").padEnd(26), S.beings[a]); }
    console.log(`recall gain of gated over plain: ${f3(gain)}; shuffled-prior control over ${draws} draws: mean ${f3(report.slices[name].control.mean)}, max ${f3(gains.at(-1))}`);
    console.log("bars:", Object.entries(bars).map(([k, v]) => `${k} ${v ? "PASS" : "FAIL"}`).join("  "));
  }
  const out = arg("--out", null); if (out) fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  if (dump) { fs.writeFileSync(dump, `${JSON.stringify(dumped, null, 1)}\n`); console.log(`dumped ${Object.keys(dumped).length} entries to ${dump}`); }
}
const path_ = (name) => `${UD}/${FILES[name]}`;
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
