// EXPLORATORY (the rule, the window N = 3, the bins and the decision level were fixed before the run; fitted on the TRAIN files of CorefUD 1.3, scored ONCE on the DEV files; N = 2 reported). THE OWNER, 2026-11-24: "within a
// document, keep the assumption of the same role unless we get signaled otherwise, and have the system aware of its confidence level." Read as two parts, both testable:
//   ROLE PERSISTENCE: an anaphor in role R (subject, object, other) refers to the entity that LAST held role R in the window (the sentence so far and the two before); a gender signal against a candidate rules it out (the
//   given-name prior, for English he/she); with no holder of R in the window it falls back to the latest mention. (This is the "parallel role" preference; "the subject continues" is its subject case.)
//   CONFIDENCE: the system states how sure it is. The stated confidence is the rule's accuracy in the same CONTEXT on the train files (context = the anaphor's role, whether a holder of that role existed in the window,
//   candidates 2 or 3+), smoothed (right + 1) / (n + 2): no hand-set number. Scored on dev: is the stated confidence what happens (calibration: Brier score against stating the overall rate, and the rate in each bin), and what the
//   decision "bind when the stated confidence is above one half, otherwise ask" gives: how many it answers, how often those are right, how many it asks.
// Kinds: English he / she (person candidates with a proper-noun mention, minus the given-name prior's other gender; GUM + LitBank) and the zero subject (Spanish, Catalan, Czech AnCora/PDT; every entity a candidate).
//   node eval/chat-register/role-persistence.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const DATA = process.env.COREFUD_DIR ?? "/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data", L = (d, f) => `${DATA}/${d}/${f}`;
const KINDS = {
  "English he/she (persons)": { files: (sp) => [L("CorefUD_English-GUM", `en_gum-corefud-${sp}.conllu`), L("CorefUD_English-LitBank", `en_litbank-corefud-${sp}.conllu`)], pick: "pron" },
  "zero subject (es, ca, cs)": { files: (sp) => [L("CorefUD_Spanish-AnCora", `es_ancora-corefud-${sp}.conllu`), L("CorefUD_Catalan-AnCora", `ca_ancora-corefud-${sp}.conllu`), L("CorefUD_Czech-PDT", `cs_pdt-corefud-${sp}.conllu`)], pick: "zero" },
};
const { makeDefaultNameGenderPrior } = await import("file://" + ROOT + "/native/adapters/text/gender-of-words.js"), P = makeDefaultNameGenderPrior({});
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
const roleOf = (deprel) => (/^nsubj/.test(deprel) ? "S" : /^(obj|iobj)/.test(deprel) ? "O" : "X");   // regex-ok: a UD relation label
const headOf = (s, m) => { const toks = s.toks.slice(m.start, m.end + 1), ids = new Set(toks.map((x) => x.id)); return toks.find((x) => !ids.has(x.head)) ?? toks[0]; };
// the cases of one kind in one set of docs: [{ ctx, hit, gold-in-candidates }] for the persistence rule
function cases(docs, kind, N) {
  const out = [];
  for (const d of docs) { const seen = new Set();
    for (let si = 0; si < d.sents.length; si++) { const s = d.sents[si];
      for (const m of [...s.mentions].sort((a, b) => a.start - b.start)) { const t = s.toks[m.start], isPron = m.start === m.end && t.upos === "PRON";
        let want = null; if (kind === "pron") { const w = t.form.toLowerCase(); if (!t.zero && isPron && (HE.has(w) || SHE.has(w))) want = HE.has(w) ? "m" : "f"; } else if (t.zero && isPron) want = "z";
        if (!want) { seen.add(m.id); continue; } if (!seen.has(m.id)) { seen.add(m.id); continue; } seen.add(m.id);
        const aRole = kind === "zero" ? "S" : roleOf(t.deprel), cand = new Map();
        for (let sj = Math.max(0, si - N + 1); sj <= si; sj++) for (const mm of d.sents[sj].mentions) { if (mm === m || (sj === si && mm.end >= m.start && mm.start >= m.start - 0 && !(mm.end < m.start))) continue; const toks = d.sents[sj].toks.slice(mm.start, mm.end + 1);
          if (kind === "pron" && (mm.type !== "person" || !toks.some((x) => x.upos === "PROPN"))) continue; const hd = headOf(d.sents[sj], mm), rec = cand.get(mm.id) ?? cand.set(mm.id, { id: mm.id, names: toks.filter((x) => x.upos === "PROPN").map((x) => x.form), ms: [] }).get(mm.id); rec.ms.push({ sj, at: mm.start, role: roleOf(hd.deprel) }); }
        let ok = [...cand.values()]; if (kind === "pron") ok = ok.filter((c) => { const g = P.explain(c.names).gender; return g === null || g === want; }); if (ok.length < 2) continue;   // the chat's situation: still ambiguous
        const all = ok.flatMap((c) => c.ms.map((x) => ({ ...x, id: c.id }))).sort((a, b) => b.sj - a.sj || b.at - a.at), holders = all.filter((x) => x.role === aRole), pick = (holders[0] ?? all[0]).id;
        out.push({ ctx: `${aRole}|${holders.length ? "holder" : "no holder"}|${ok.length === 2 ? "2" : "3+"}`, hit: pick === m.id ? 1 : 0, inWindow: ok.some((c) => c.id === m.id) ? 1 : 0, k: ok.length }); } } }
  return out;
}
const loadAll = (files) => files.filter((f) => fs.existsSync(f)).flatMap((f) => parse(f));
const wilson = (k, n) => { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(2), +((c + m) / d).toFixed(2)]; };
const out = { stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY (fitted on CorefUD 1.3 TRAIN, scored once on DEV; rule, N = 3, bins and the one-half decision level fixed before the run; N = 2 reported)", commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })() }, results: {} };
for (const [name, K] of Object.entries(KINDS)) for (const N of [3, 2]) {
  const tr = cases(loadAll(K.files("train")), K.pick, N), dv = cases(loadAll(K.files("dev")), K.pick, N), bins = {}; for (const c of tr) { const b = (bins[c.ctx] ??= [0, 0]); b[0] += c.hit; b[1]++; }
  const overall = tr.reduce((a, c) => a + c.hit, 0) / Math.max(1, tr.length), conf = (ctx) => (bins[ctx] ? (bins[ctx][0] + 1) / (bins[ctx][1] + 2) : overall);
  const brier = dv.reduce((a, c) => a + (conf(c.ctx) - c.hit) ** 2, 0) / Math.max(1, dv.length), brier0 = dv.reduce((a, c) => a + (overall - c.hit) ** 2, 0) / Math.max(1, dv.length), rate = dv.reduce((a, c) => a + c.hit, 0) / Math.max(1, dv.length);
  const answered = dv.filter((c) => conf(c.ctx) > 0.5), asked = dv.length - answered.length, aRight = answered.reduce((a, c) => a + c.hit, 0);
  const byBin = Object.fromEntries(Object.keys(bins).sort().map((b) => { const d = dv.filter((c) => c.ctx === b); return [b, { train: `${bins[b][0]}/${bins[b][1]}`, stated: +conf(b).toFixed(2), dev: d.length ? `${d.reduce((a, c) => a + c.hit, 0)}/${d.length}` : "0/0", devRate: d.length ? +(d.reduce((a, c) => a + c.hit, 0) / d.length).toFixed(2) : null }]; }));
  out.results[`${name} N${N}`] = { trainCases: tr.length, devCases: dv.length, devRate: +rate.toFixed(2), devWilson: wilson(dv.reduce((a, c) => a + c.hit, 0), dv.length), brierStatedByContext: +brier.toFixed(3), brierConstant: +brier0.toFixed(3), answered: answered.length, answeredRight: aRight, answeredRate: answered.length ? +(aRight / answered.length).toFixed(2) : null, answeredWilson: wilson(aRight, answered.length), asked, byBin };
  if (N === 3 || true) console.log(`${name}, window ${N}: train ${tr.length} cases, dev ${dv.length}; the rule is right on dev ${(100 * rate).toFixed(0)}% ${JSON.stringify(wilson(dv.reduce((a, c) => a + c.hit, 0), dv.length))}; Brier of the stated confidence ${brier.toFixed(3)} against ${brier0.toFixed(3)} for stating the overall rate; "bind above one half, else ask": answers ${answered.length} (${(100 * answered.length / Math.max(1, dv.length)).toFixed(0)}%), right on ${answered.length ? (100 * aRight / answered.length).toFixed(0) : "-"}% ${JSON.stringify(wilson(aRight, answered.length))}, asks ${asked}\n   ${Object.entries(byBin).map(([b, v]) => `${b}: train ${v.train}, stated ${v.stated}, dev ${v.dev} (${v.devRate ?? "-"})`).join("\n   ")}`);
}
fs.writeFileSync(path.join(HERE, "role-persistence.json"), JSON.stringify(out, null, 1) + "\n");
