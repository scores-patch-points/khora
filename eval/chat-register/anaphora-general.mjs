// EXPLORATORY (the models, the window N = 3, the history length and the one-half decision level were fixed before the run; fitted on CorefUD 1.3 TRAIN, scored ONCE on DEV). THE OWNER, 2026-11-24: "find where this is a more
// general anaphora concept that works, so this isn't hand tooling." role-persistence.mjs hand-picked its contexts (the anaphor's role x a holder existed x two candidates or more). The literature has the general form:
//   - ENTITY GRID (Barzilay & Lapata 2008; Centering, Grosz, Joshi & Weinstein 1995): an entity's grammatical role across consecutive sentences (S, O, X, absent) is a sequence; the transitions are LEARNED, not chosen.
//   - BASE-LEVEL ACTIVATION (Anderson & Schooler 1991, ACT-R): the activation of a referent is ln of the sum over its mentions of (distance)^-d; d = 0.5 is the standard declared constant, not fitted here.
// So three models, all general (no context chosen by hand, any language that has UD roles and coreference, any kind of anaphor):
//   GRID  learned from every mention of every entity in the train files (self-supervised: no pronoun is special): P(role of the mention | the entity's roles in the three sentences before, and whether the entity is already mentioned
//         earlier in this sentence), smoothed (+1 over three roles). An anaphor with role r picks the candidate with the highest P(r | history); the NORMALISED values across the candidates are the stated confidence.
//   ACTR  base-level activation with d = 0.5 and sentence distance (this sentence = 1); the most active candidate.
//   RANK  a conditional-logit mention RANKER (the standard form of a learned pronoun resolver) over generic salience features only: the candidate's role in this sentence so far and in each of the two before (S, O, X, absent) and the log of its
//         mention count, each crossed with the anaphor's own role; weights learned on the train anaphors (softmax over the candidates, gradient ascent, L2 1e-3, 300 passes); the softmax of the best is the stated confidence.
//   TABLE the hand-contexted role-persistence rule of role-persistence.mjs (for reference).
// Candidates as before: English he / she = persons with a proper-noun mention minus the given-name prior's other gender; English "it" and zero subjects (es, ca, cs) = every entity in the window; two or more candidates.
//   node eval/chat-register/anaphora-general.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const DATA = process.env.COREFUD_DIR ?? "/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data", L = (d, f) => `${DATA}/${d}/${f}`;
const FAMILIES = {
  "English": (sp) => [L("CorefUD_English-GUM", `en_gum-corefud-${sp}.conllu`), L("CorefUD_English-LitBank", `en_litbank-corefud-${sp}.conllu`)],
  "es+ca+cs": (sp) => [L("CorefUD_Spanish-AnCora", `es_ancora-corefud-${sp}.conllu`), L("CorefUD_Catalan-AnCora", `ca_ancora-corefud-${sp}.conllu`), L("CorefUD_Czech-PDT", `cs_pdt-corefud-${sp}.conllu`)],
};
const KINDS = [{ name: "English he/she (persons)", fam: "English", kind: "pron" }, { name: "English it", fam: "English", kind: "it" }, { name: "zero subject (es, ca, cs)", fam: "es+ca+cs", kind: "zero" }];
const { makeDefaultNameGenderPrior } = await import("file://" + ROOT + "/native/adapters/text/gender-of-words.js"), P = makeDefaultNameGenderPrior({});
const HE = new Set(["he", "him", "his", "himself"]), SHE = new Set(["she", "her", "hers", "herself"]);
const N = 3, D = 0.5;
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
const roleOf = (deprel) => (/^nsubj/.test(deprel) ? "S" : /^(obj|iobj)/.test(deprel) ? "O" : "X");   // regex-ok: a UD relation label
const headOf = (s, m) => { const toks = s.toks.slice(m.start, m.end + 1), ids = new Set(toks.map((x) => x.id)); return toks.find((x) => !ids.has(x.head)) ?? toks[0]; };
const RANK = { S: 3, O: 2, X: 1 };
const roleIn = (doc, si, id, before = Infinity) => { let best = null; if (!doc.sents[si]) return "-"; for (const mm of doc.sents[si].mentions) if (mm.id === id && mm.start < before) { const r = roleOf(headOf(doc.sents[si], mm).deprel); if (!best || RANK[r] > RANK[best]) best = r; } return best ?? "-"; };
const slot = (doc, si, id) => (si >= 0 ? roleIn(doc, si, id) : "-");
const histKey = (doc, si, id, before) => `${slot(doc, si - 1, id)}${slot(doc, si - 2, id)}${slot(doc, si - 3, id)}|${roleIn(doc, si, id, before) === "-" ? "n" : "c"}`;   // the roles in the three sentences before, and whether the entity is already mentioned earlier in this one
// train the grid: every mention of every entity already mentioned earlier in the document is an event (history -> role)
function trainGrid(docs) {
  const G = {}; for (const d of docs) { const seen = new Set();
    for (let si = 0; si < d.sents.length; si++) for (const m of [...d.sents[si].mentions].sort((a, b) => a.start - b.start)) { if (seen.has(m.id)) { const h = histKey(d, si, m.id, m.start), r = roleOf(headOf(d.sents[si], m).deprel), g = (G[h] ??= { S: 0, O: 0, X: 0 }); g[r]++; } seen.add(m.id); } }
  return G;
}
const gridP = (G, h, r) => { const g = G[h] ?? { S: 0, O: 0, X: 0 }, tot = g.S + g.O + g.X + 3; return (g[r] + 1) / tot; };
function cases(docs, kind, G) {
  const out = [];
  for (const d of docs) { const seen = new Set();
    for (let si = 0; si < d.sents.length; si++) { const s = d.sents[si];
      for (const m of [...s.mentions].sort((a, b) => a.start - b.start)) { const t = s.toks[m.start], isPron = m.start === m.end && t.upos === "PRON"; let want = null;
        if (kind === "pron") { const w = t.form.toLowerCase(); if (!t.zero && isPron && (HE.has(w) || SHE.has(w))) want = HE.has(w) ? "m" : "f"; } else if (kind === "it") { if (!t.zero && isPron && t.form.toLowerCase() === "it") want = "i"; } else if (t.zero && isPron) want = "z";
        if (!want) { seen.add(m.id); continue; } if (!seen.has(m.id)) { seen.add(m.id); continue; } seen.add(m.id);
        const aRole = kind === "zero" ? "S" : roleOf(t.deprel), cand = new Map();
        for (let sj = Math.max(0, si - N + 1); sj <= si; sj++) for (const mm of d.sents[sj].mentions) { if (mm === m || (sj === si && mm.start >= m.start)) continue; const toks = d.sents[sj].toks.slice(mm.start, mm.end + 1);
          if (kind === "pron" && (mm.type !== "person" || !toks.some((x) => x.upos === "PROPN"))) continue; const rec = cand.get(mm.id) ?? cand.set(mm.id, { id: mm.id, names: toks.filter((x) => x.upos === "PROPN").map((x) => x.form), ms: [] }).get(mm.id); rec.ms.push({ sj, at: mm.start, role: roleOf(headOf(d.sents[sj], mm).deprel) }); }
        let ok = [...cand.values()]; if (kind === "pron") ok = ok.filter((c) => { const g = P.explain(c.names).gender; return g === null || g === want; }); if (ok.length < 2) continue;
        // GRID: P(anaphor's role | the candidate's history), normalised across the candidates
        const gs = ok.map((c) => ({ id: c.id, p: gridP(G, histKey(d, si, c.id, m.start), aRole) })), tot = gs.reduce((a, x) => a + x.p, 0), top = gs.sort((a, b) => b.p - a.p)[0];
        // ACT-R base-level activation, d = 0.5, sentence distance (this sentence = 1)
        const act = ok.map((c) => ({ id: c.id, a: Math.log(c.ms.reduce((a, x) => a + (si - x.sj + 1) ** -D, 0)) })).sort((a, b) => b.a - a.a)[0];
        // TABLE: the hand-contexted role-persistence rule (the last holder of the anaphor's role, else the latest mention)
        const all = ok.flatMap((c) => c.ms.map((x) => ({ ...x, id: c.id }))).sort((a, b) => b.sj - a.sj || b.at - a.at), holders = all.filter((x) => x.role === aRole), table = (holders[0] ?? all[0]).id;
        const ROLES = { S: 0, O: 1, X: 2, "-": 3 }, AR = { S: 0, O: 1, X: 2 }[aRole], feats = ok.map((c) => { const x = []; for (let j = 0; j < 3; j++) x.push(AR * 13 + j * 4 + ROLES[roleIn(d, si - j, c.id, j === 0 ? m.start : Infinity)]); x.push(AR * 13 + 12); return { id: c.id, x, lc: Math.log(1 + c.ms.length) }; });
        out.push({ aRole, feats, goldIdx: ok.findIndex((c) => c.id === m.id), k: ok.length, grid: top.id === m.id ? 1 : 0, conf: top.p / tot, actr: act.id === m.id ? 1 : 0, table: table === m.id ? 1 : 0, random: 1 / ok.length }); } } }
  return out;
}
const loadAll = (files) => files.filter((f) => fs.existsSync(f)).flatMap((f) => parse(f));
const wilson = (k, n) => { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(2), +((c + m) / d).toFixed(2)]; };
const out = { stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY (fitted on CorefUD 1.3 TRAIN, scored once on DEV; models, N = 3, history of three sentences and the one-half level fixed before the run)", commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })() }, results: {} };
const STORE = {};
const grids = {}, devDocs = {}; for (const [fam, f] of Object.entries(FAMILIES)) { grids[fam] = trainGrid(loadAll(f("train"))); devDocs[fam] = loadAll(f("dev")); }
const NF = 39;
const scoreOf = (w, f) => f.x.slice(0, 3).reduce((a, i) => a + w[i], 0) + w[f.x[3]] * f.lc;
function trainRank(cs) { const w = new Float64Array(NF); const tr = cs.filter((c) => c.goldIdx >= 0); for (let ep = 0; ep < 300; ep++) { const g = new Float64Array(NF); for (const c of tr) { const sc = c.feats.map((f) => scoreOf(w, f)), mx = Math.max(...sc), ex = sc.map((v) => Math.exp(v - mx)), z = ex.reduce((a, b) => a + b, 0); c.feats.forEach((f, ci) => { const pr = ex[ci] / z, dlt = (ci === c.goldIdx ? 1 : 0) - pr; for (let j = 0; j < 3; j++) g[f.x[j]] += dlt; g[f.x[3]] += dlt * f.lc; }); } for (let i = 0; i < NF; i++) w[i] += 0.5 * (g[i] / Math.max(1, tr.length) - 1e-3 * w[i]); } return w; }
for (const K of KINDS) {
  const trainCases = cases(loadAll(FAMILIES[K.fam]("train")), K.kind, grids[K.fam]), W = trainRank(trainCases);
  const dv = cases(devDocs[K.fam], K.kind, grids[K.fam]).map((c) => { const sc = c.feats.map((f) => scoreOf(W, f)), mx = Math.max(...sc), ex = sc.map((v) => Math.exp(v - mx)), z = ex.reduce((a, b) => a + b, 0), bi = sc.indexOf(mx); return { ...c, rank: bi === c.goldIdx ? 1 : 0, rconf: 1 / z }; }), n = dv.length, sum = (f) => dv.reduce((a, c) => a + f(c), 0), rate = (f) => `${Math.round(100 * sum(f) / n)}% ${JSON.stringify(wilson(sum(f), n))}`;
  STORE[K.name] = { W, dv };
  const bins = {}; for (const c of dv) { const b = Math.min(4, Math.floor(c.rconf * 5)); const e = (bins[b] ??= { n: 0, hit: 0, conf: 0 }); e.n++; e.hit += c.rank; e.conf += c.rconf; }
  const answered = dv.filter((c) => c.rconf > 0.5), aRight = answered.reduce((a, c) => a + c.rank, 0), brier = dv.reduce((a, c) => a + (c.rconf - c.rank) ** 2, 0) / n, base = sum((c) => c.rank) / n, brier0 = dv.reduce((a, c) => a + (base - c.rank) ** 2, 0) / n;
  out.results[K.name] = { trainCases: trainCases.length, devCases: n, random: +(sum((c) => c.random) / n).toFixed(2), table: { right: sum((c) => c.table), wilson: wilson(sum((c) => c.table), n) }, actr: { right: sum((c) => c.actr), wilson: wilson(sum((c) => c.actr), n) }, grid: { right: sum((c) => c.grid), wilson: wilson(sum((c) => c.grid), n) }, rank: { right: sum((c) => c.rank), wilson: wilson(sum((c) => c.rank), n) },
    rankConfidence: { brier: +brier.toFixed(3), brierConstant: +brier0.toFixed(3), answeredAboveHalf: answered.length, answeredRight: aRight, answeredWilson: wilson(aRight, answered.length), asked: n - answered.length, bins: Object.fromEntries(Object.entries(bins).map(([b, e]) => [`${(b * 0.2).toFixed(1)}-${((+b + 1) * 0.2).toFixed(1)}`, { n: e.n, stated: +(e.conf / e.n).toFixed(2), right: +(e.hit / e.n).toFixed(2) }])) }, weights: Array.from(W).map((v) => +v.toFixed(2)) };
  console.log(`${K.name}: ${n} dev cases (train ${trainCases.length}); random ${Math.round(100 * sum((c) => c.random) / n)}% | hand TABLE ${rate((c) => c.table)} | ACT-R ${rate((c) => c.actr)} | role GRID ${rate((c) => c.grid)} | learned RANKER ${rate((c) => c.rank)}\n   ranker confidence: Brier ${brier.toFixed(3)} against ${brier0.toFixed(3)} for the constant; above one half it answers ${answered.length} (${Math.round(100 * answered.length / n)}%), right on ${answered.length ? Math.round(100 * aRight / answered.length) : "-"}% ${JSON.stringify(wilson(aRight, answered.length))}, asks ${n - answered.length}\n   stated vs realised: ${Object.entries(out.results[K.name].rankConfidence.bins).map(([b, e]) => `${b}: n=${e.n} stated ${e.stated} right ${e.right}`).join(" | ")}`);
}

// TRANSFER: is the learned salience model one model? Weights trained on English he/she scored on the zero subjects of es / ca / cs, and the reverse (subject-role cases only: the zero subjects have no other role)
const accOf = (W, cs) => { let r = 0; for (const c of cs) { const sc = c.feats.map((f) => scoreOf(W, f)); if (sc.indexOf(Math.max(...sc)) === c.goldIdx) r++; } return r; };
const enW = STORE["English he/she (persons)"].W, zeroW = STORE["zero subject (es, ca, cs)"].W, zeroDev = STORE["zero subject (es, ca, cs)"].dv, enS = STORE["English he/she (persons)"].dv.filter((c) => c.aRole === "S");
const tz = { "zero dev with weights trained on zero subjects": accOf(zeroW, zeroDev), "zero dev with weights trained on ENGLISH he/she": accOf(enW, zeroDev) }, te = { "English he/she (subject role) with weights trained on English he/she": accOf(enW, enS), "English he/she (subject role) with weights trained on ZERO subjects (es, ca, cs)": accOf(zeroW, enS) };
out.transfer = { zero: Object.fromEntries(Object.entries(tz).map(([k, v]) => [k, { right: v, of: zeroDev.length, wilson: wilson(v, zeroDev.length) }])), english: Object.fromEntries(Object.entries(te).map(([k, v]) => [k, { right: v, of: enS.length, wilson: wilson(v, enS.length) }])) };
console.log("\nTRANSFER (one model?):"); for (const [k, v] of Object.entries(out.transfer.zero)) console.log(`   ${k}: ${v.right} of ${v.of} (${Math.round(100 * v.right / v.of)}% ${JSON.stringify(v.wilson)})`); for (const [k, v] of Object.entries(out.transfer.english)) console.log(`   ${k}: ${v.right} of ${v.of} (${Math.round(100 * v.right / v.of)}% ${JSON.stringify(v.wilson)})`);
fs.writeFileSync(path.join(HERE, "anaphora-general.json"), JSON.stringify(out, null, 1) + "\n");
