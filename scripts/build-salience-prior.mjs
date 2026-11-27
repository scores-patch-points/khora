#!/usr/bin/env node
// build-salience-prior.mjs — builds native/adapters/text/salience/weights.json (SaliencePrior@1) from gold coreference.
//   node scripts/build-salience-prior.mjs [--allow-noncommercial] [--out file]        (COREFUD_DIR = the CorefUD 1.3 public data directory)
// WHAT IT LEARNS: a conditional-logit mention ranker over generic salience features (see native/adapters/text/salience-prior.js). The weights are not set by hand; they are fitted to the train files below and measured on the DEV
// files, through the module itself (so the module and this trainer cannot drift apart). THE LICENCE GATE: the licence of each corpus is read from its README ("License: ..."), never typed here, and a corpus under a
// non-commercial licence is NOT trained on unless --allow-noncommercial is given (a weight file is a derived statistic; whether such a licence follows it is the owner's to settle, so the default keeps it out). The
// default therefore trains on LitBank (English, CC BY 4.0) and Spanish and Catalan AnCora (CC BY 4.0), and leaves GUM and the Czech PDT (CC BY-NC-SA 4.0) as evaluation-only. EXPLORATORY numbers (CorefUD DEV, read once per build).
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..");
const args = process.argv.slice(2), ALLOW_NC = args.includes("--allow-noncommercial"), OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : path.join(ROOT, "native", "adapters", "text", "salience", "weights.json");
const DATA = process.env.COREFUD_DIR ?? "/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data";
const { makeSaliencePrior, roleOfDeprel, WINDOW } = await import("file://" + ROOT + "/native/adapters/text/salience-prior.js"), { makeDefaultNameGenderPrior } = await import("file://" + ROOT + "/native/adapters/text/gender-of-words.js");
const G = makeDefaultNameGenderPrior({});
const SETS = {   // name -> [directory, file stem], and what kind of anaphor its cases are
  "LitBank (English)": { dir: "CorefUD_English-LitBank", stem: "en_litbank-corefud", kind: "person" }, "GUM (English)": { dir: "CorefUD_English-GUM", stem: "en_gum-corefud", kind: "person" },
  "AnCora (Spanish)": { dir: "CorefUD_Spanish-AnCora", stem: "es_ancora-corefud", kind: "zero" }, "AnCora (Catalan)": { dir: "CorefUD_Catalan-AnCora", stem: "ca_ancora-corefud", kind: "zero" }, "PDT (Czech)": { dir: "CorefUD_Czech-PDT", stem: "cs_pdt-corefud", kind: "zero" },
};
const licenceOf = (dir) => { try { return (fs.readFileSync(path.join(DATA, dir, "README.md"), "utf8").match(/^License:\s*(.+)$/m) ?? [])[1]?.trim() ?? null; } catch { return null; } };   // regex-ok: the README's licence line
const isNC = (lic) => !lic || /NC/.test(lic);   // an unknown licence is treated as non-commercial: refused until read   // regex-ok: a licence name
const fileOf = (S, split) => path.join(DATA, S.dir, `${S.stem}-${split}.conllu`), sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const HE = new Set(["he", "him", "his", "himself"]), SHE = new Set(["she", "her", "hers", "herself"]);
function parse(file) {
  const docs = []; let doc = null, sent = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# newdoc")) { doc = { sents: [] }; docs.push(doc); continue; } if (line === "") { sent = null; continue; } if (line.startsWith("#")) continue;
    const c = line.split("\t"); if (!/^\d+(\.\d+)?$/.test(c[0])) continue;   // regex-ok: a CoNLL-U token id, not language
    if (!sent) { sent = { toks: [], mentions: [], stack: [] }; (doc ?? (doc = { sents: [] }, docs.push(doc))).sents.push(sent); }
    const zero = c[0].includes("."), t = { i: sent.toks.length, id: c[0], form: c[1], upos: c[3], head: c[6], deprel: zero ? (c[8].split(":").slice(1).join(":") || "") : c[7], zero }; sent.toks.push(t);
    const ent = (c[9].split("|").find((x) => x.startsWith("Entity=")) ?? "").slice(7);
    for (let k = 0; k < ent.length;) { if (ent[k] === "(") { let j = k + 1; while (j < ent.length && ent[j] !== "(" && ent[j] !== ")") j++; const [id, type] = ent.slice(k + 1, j).split("-"); sent.stack.push({ id, type, start: t.i }); k = j; } else if (ent[k] === ")") { const m = sent.stack.pop(); if (m) sent.mentions.push({ ...m, end: t.i }); k++; } else k++; }
  }
  return docs;
}
const headOf = (s, m) => { const toks = s.toks.slice(m.start, m.end + 1), ids = new Set(toks.map((x) => x.id)); return toks.find((x) => !ids.has(x.head)) ?? toks[0]; };
const RANK = { S: 3, O: 2, X: 1 };
const roleIn = (doc, si, id, before = Infinity) => { let best = null; if (!doc.sents[si]) return "-"; for (const mm of doc.sents[si].mentions) if (mm.id === id && mm.start < before) { const r = roleOfDeprel(headOf(doc.sents[si], mm).deprel); if (!best || RANK[r] > RANK[best]) best = r; } return best ?? "-"; };
/** the cases of one kind: { anaphorRole, candidates: [{ id, roles, mentions }], gold, kind } for anaphors that have an earlier mention of their entity, with two or more candidates (the chat's situation) */
function cases(docs, kind) {
  const out = [];
  for (const d of docs) { const seen = new Set();
    for (let si = 0; si < d.sents.length; si++) { const s = d.sents[si];
      for (const m of [...s.mentions].sort((a, b) => a.start - b.start)) { const t = s.toks[m.start], isPron = m.start === m.end && t.upos === "PRON"; let want = null;
        if (kind === "person") { const w = t.form.toLowerCase(); if (!t.zero && isPron && (HE.has(w) || SHE.has(w))) want = HE.has(w) ? "m" : "f"; } else if (kind === "it") { if (!t.zero && isPron && t.form.toLowerCase() === "it") want = "i"; } else if (t.zero && isPron) want = "z";
        if (!want) { seen.add(m.id); continue; } if (!seen.has(m.id)) { seen.add(m.id); continue; } seen.add(m.id);
        const aRole = kind === "zero" ? "S" : roleOfDeprel(t.deprel), cand = new Map();
        for (let sj = Math.max(0, si - WINDOW + 1); sj <= si; sj++) for (const mm of d.sents[sj].mentions) { if (mm === m || (sj === si && mm.start >= m.start)) continue; const toks = d.sents[sj].toks.slice(mm.start, mm.end + 1);
          if (kind === "person" && (mm.type !== "person" || !toks.some((x) => x.upos === "PROPN"))) continue; const rec = cand.get(mm.id) ?? cand.set(mm.id, { id: mm.id, names: toks.filter((x) => x.upos === "PROPN").map((x) => x.form), n: 0 }).get(mm.id); rec.n++; }
        let ok = [...cand.values()]; if (kind === "person") ok = ok.filter((c) => { const g = G.explain(c.names).gender; return g === null || g === want; }); if (ok.length < 2) continue;
        out.push({ anaphorRole: aRole, kind, gold: m.id, candidates: ok.map((c) => ({ id: c.id, mentions: c.n, roles: [0, 1, 2].map((j) => roleIn(d, si - j, c.id, j === 0 ? m.start : Infinity)) })) }); } } }
  return out;
}
const ROLE_INDEX = { S: 0, O: 1, X: 2, "-": 3 }, AI = { S: 0, O: 1, X: 2 };
const sc = (w, c) => { let s = 0; for (let j = 0; j < 3; j++) s += w[j * 4 + ROLE_INDEX[c.roles[j]]]; return s + w[12] * Math.log(1 + c.mentions); };
function train(cs) {
  const out = {};
  for (const role of ["S", "O", "X"]) { const tr = cs.filter((c) => c.anaphorRole === role && c.candidates.some((x) => x.id === c.gold)), w = new Float64Array(13);
    for (let ep = 0; tr.length && ep < 300; ep++) { const g = new Float64Array(13);
      for (const c of tr) { const s = c.candidates.map((x) => sc(w, x)), mx = Math.max(...s), ex = s.map((v) => Math.exp(v - mx)), z = ex.reduce((a, b) => a + b, 0);
        c.candidates.forEach((x, i) => { const dlt = (x.id === c.gold ? 1 : 0) - ex[i] / z; for (let j = 0; j < 3; j++) g[j * 4 + ROLE_INDEX[x.roles[j]]] += dlt; g[12] += dlt * Math.log(1 + x.mentions); }); }
      for (let i = 0; i < 13; i++) w[i] += 0.5 * (g[i] / tr.length - 1e-3 * w[i]); }
    out[role] = Array.from(w, (v) => +v.toFixed(4)); }
  return out;
}
const wilson = (k, n) => { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(2), +((c + m) / d).toFixed(2)]; };
const mkTable = (w) => ({ schema: "SaliencePrior@1", weights: w });
function evaluate(w, cs, kindLabel) {
  const prior = makeSaliencePrior({ table: mkTable(w) }); let right = 0, answered = 0, aRight = 0; const bins = Array.from({ length: 5 }, (_, i) => ({ lo: i * 0.2, hi: (i + 1) * 0.2, n: 0, right: 0 }));
  for (const c of cs) { const r = prior.rank({ anaphorRole: c.anaphorRole, candidates: c.candidates, kind: kindLabel }), hit = r.top === c.gold ? 1 : 0; right += hit; const b = bins[Math.min(4, Math.floor(r.confidence * 5))]; b.n++; b.right += hit; if (r.confidence > 0.5) { answered++; aRight += hit; } }
  return { cases: cs.length, right, rate: cs.length ? +(right / cs.length).toFixed(3) : null, wilson: wilson(right, cs.length), answeredAboveHalf: answered, answeredRight: aRight, answeredWilson: wilson(aRight, answered), asked: cs.length - answered, bins: bins.map((b) => ({ ...b, lo: +b.lo.toFixed(1), hi: +b.hi.toFixed(1) })) };
}
// ---- which corpora may be trained on
const info = Object.fromEntries(Object.entries(SETS).map(([n, S]) => [n, { ...S, licence: licenceOf(S.dir) }])), trainSets = [], refused = [];
for (const [n, S] of Object.entries(info)) { const eligible = ["LitBank (English)", "AnCora (Spanish)", "AnCora (Catalan)"].includes(n) || ALLOW_NC; if (!eligible) { refused.push({ name: n, licence: S.licence, reason: "evaluation only by default" }); continue; } if (isNC(S.licence) && !ALLOW_NC) { refused.push({ name: n, licence: S.licence, reason: "non-commercial or unknown licence: refused (use --allow-noncommercial to train on it)" }); continue; } trainSets.push(n); }
if (ALLOW_NC) for (const n of ["GUM (English)", "PDT (Czech)"]) if (!trainSets.includes(n)) trainSets.push(n);
const trainCases = (names, kind) => names.filter((n) => info[n].kind === kind).flatMap((n) => cases(parse(fileOf(info[n], "train")), info[n].kind));
const tc = Object.fromEntries(["person", "zero"].map((k) => [k, trainCases(trainSets, k)]));
const all = [...tc.person, ...tc.zero], W = train(all), Wen = train(tc.person), Wzero = train(tc.zero);
// ---- measured on DEV (the module scores it)
const dev = { person: ["LitBank (English)", "GUM (English)"].flatMap((n) => cases(parse(fileOf(info[n], "dev")), "person")), zero: ["AnCora (Spanish)", "AnCora (Catalan)", "PDT (Czech)"].flatMap((n) => cases(parse(fileOf(info[n], "dev")), "zero")), it: ["LitBank (English)", "GUM (English)"].flatMap((n) => cases(parse(fileOf(info[n], "dev")), "it")) };
const devSubject = dev.person.filter((c) => c.anaphorRole === "S");
const measured = { split: "EXPLORATORY (CorefUD 1.3 DEV; window of three sentences and the one-half level declared before the first run; trained on the sets listed in trainedOn)", persons: evaluate(W, dev.person, "person"), zero: evaluate(W, dev.zero, "zero"), it: { ...evaluate(W, dev.it, "it"), note: "NOT calibrated: do not state a confidence for it" },
  transfer: { zeroDev: { "weights trained on the zero subjects": evaluate(Wzero, dev.zero, "zero").rate, "weights trained on English persons": evaluate(Wen, dev.zero, "zero").rate }, englishSubjectDev: { "weights trained on English persons": evaluate(Wen, devSubject, "person").rate, "weights trained on the zero subjects": evaluate(Wzero, devSubject, "person").rate } },
  calibration: { persons: evaluate(W, dev.person, "person").bins, zero: evaluate(W, dev.zero, "zero").bins } };
const table = { schema: "SaliencePrior@1", window: WINDOW, features: "per anaphor role (S, O, X): 3 slots (this sentence so far, the sentence before, the one before that) x {S, O, X, absent} = 12 weights, plus the weight of log(1 + mentions in the window)", softmax: "the stated confidence is the softmax of the best candidate among the caller's candidates",
  weights: W, optimiser: { passes: 300, step: 0.5, l2: 0.001, note: "fixed, not tuned" },
  provenance: { builtBy: "scripts/build-salience-prior.mjs", when: new Date().toISOString(), commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })(), allowNoncommercial: ALLOW_NC,
    trainedOn: trainSets.map((n) => ({ name: n, licence: info[n].licence, file: path.basename(fileOf(info[n], "train")), sha256: sha(fileOf(info[n], "train")), kind: info[n].kind })), trainedCases: { persons: tc.person.length, zero: tc.zero.length }, notTrainedOn: refused,
    credit: "CorefUD 1.3 (Nedoluzhko et al., LINDAT/CLARIAH-CZ); LitBank (Bamman et al.); AnCora (Taulé, Martí, Recasens); each under the licence recorded above" },
  measured };
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(table, null, 1) + "\n");
const f = (r) => `${r.right}/${r.cases} = ${Math.round(100 * r.rate)}% ${JSON.stringify(r.wilson)}; above one half answers ${r.answeredAboveHalf} right on ${r.answeredAboveHalf ? Math.round(100 * r.answeredRight / r.answeredAboveHalf) : "-"}% ${JSON.stringify(r.answeredWilson)}`;
console.log(`trained on ${trainSets.join(", ")} (persons ${tc.person.length} cases, zero subjects ${tc.zero.length}); refused/evaluation-only: ${refused.map((r) => `${r.name} (${r.licence})`).join(", ") || "none"}\nDEV persons (LitBank + GUM): ${f(measured.persons)}\nDEV zero subjects (es + ca + cs): ${f(measured.zero)}\nDEV it: ${f(measured.it)}\ntransfer: ${JSON.stringify(measured.transfer)}\nwrote ${OUT}`);
