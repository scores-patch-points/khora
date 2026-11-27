// EXPLORATORY (the rules, the window N = 2 and the kinds were fixed before the run; N = 1 and 3 reported; DEV sets of CorefUD 1.3 only). THE OWNER, 2026-11-24, on the activation idea ("falsify; I mean try it on
// other things, it makes sense to me"): a sentence leaves a trace of activation on its referents, and the next sentence is read against it (Eisenstein: adjacent shots connect whatever the maker meant). The first
// test (activation-binding.mjs, he/she with two open named candidates) found the SUBJECT-CONTINUES rule at the level of a random pick and recency / most-mentions a modest 6 in 10. So: other things.
//   (1) a ZERO subject: the dropped subject of a pro-drop language (Spanish, Catalan, Czech, Hungarian, Polish, Ancient Greek, Turkish), annotated in CorefUD as an empty node. Here the grammar says "the subject continues".
//   (2) English "it" (any entity, not only persons); (3) an English definite description ("the man", "the house") that has an earlier mention of its entity.
// Candidates are ALL entities that have a mention in the window (the sentence so far and the one before) before the anaphor; only anaphors whose entity has an earlier mention are scored (an antecedent exists). With 2 or more
// candidates the four rules (no weight or threshold) pick one: SUBJECT (the nearest earlier sentence holding a candidate: its subject if a candidate is one, else its first), RECENT, FIRST, MOST (most mentions in the window, ties
// to the latest). Reference: a random pick (the mean of 1 over the candidates). Right = the anaphor's gold entity. "Antecedent outside the window" counts as wrong. Intervals Wilson 95%.
//   node eval/chat-register/activation-other.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const DATA = process.env.COREFUD_DIR ?? "/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data";
const L = (d, f) => `${DATA}/${d}/${f}`;
const SETS = [
  { name: "Spanish AnCora dev", file: L("CorefUD_Spanish-AnCora", "es_ancora-corefud-dev.conllu"), kinds: ["zero"] }, { name: "Catalan AnCora dev", file: L("CorefUD_Catalan-AnCora", "ca_ancora-corefud-dev.conllu"), kinds: ["zero"] },
  { name: "Czech PDT dev", file: L("CorefUD_Czech-PDT", "cs_pdt-corefud-dev.conllu"), kinds: ["zero"] }, { name: "Hungarian Szeged dev", file: L("CorefUD_Hungarian-SzegedKoref", "hu_szegedkoref-corefud-dev.conllu"), kinds: ["zero"] },
  { name: "Polish PCC dev", file: L("CorefUD_Polish-PCC", "pl_pcc-corefud-dev.conllu"), kinds: ["zero"] }, { name: "Ancient Greek PROIEL dev", file: L("CorefUD_Ancient_Greek-PROIEL", "grc_proiel-corefud-dev.conllu"), kinds: ["zero"] },
  { name: "Turkish ITCC dev", file: L("CorefUD_Turkish-ITCC", "tr_itcc-corefud-dev.conllu"), kinds: ["zero"] },
  { name: "English GUM dev", file: L("CorefUD_English-GUM", "en_gum-corefud-dev.conllu"), kinds: ["it", "definite"] }, { name: "English LitBank dev", file: L("CorefUD_English-LitBank", "en_litbank-corefud-dev.conllu"), kinds: ["it", "definite"] },
];
const wilson = (k, n) => { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(2), +((c + m) / d).toFixed(2)]; };
function parse(file) {
  const docs = []; let doc = null, sent = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# newdoc")) { doc = { sents: [] }; docs.push(doc); continue; } if (line === "") { sent = null; continue; } if (line.startsWith("#")) continue;
    const c = line.split("\t"); if (!/^\d+(\.\d+)?$/.test(c[0])) continue;   // regex-ok: a CoNLL-U token id (an empty node has a decimal one), not language
    if (!sent) { sent = { toks: [], mentions: [], stack: [] }; (doc ?? (doc = { sents: [] }, docs.push(doc))).sents.push(sent); }
    const zero = c[0].includes("."), t = { i: sent.toks.length, id: c[0], form: c[1], upos: c[3], head: c[6], deprel: zero ? (c[8].split(":").slice(1).join(":") || "") : c[7], zero, feats: c[5] }; sent.toks.push(t);
    const ent = (c[9].split("|").find((x) => x.startsWith("Entity=")) ?? "").slice(7);
    for (let k = 0; k < ent.length;) { if (ent[k] === "(") { let j = k + 1; while (j < ent.length && ent[j] !== "(" && ent[j] !== ")") j++; const [id, type] = ent.slice(k + 1, j).split("-"); sent.stack.push({ id, type, start: t.i }); k = j; } else if (ent[k] === ")") { const m = sent.stack.pop(); if (m) sent.mentions.push({ ...m, end: t.i }); k++; } else k++; }
  }
  return docs;
}
const headOf = (s, m) => { const toks = s.toks.slice(m.start, m.end + 1), ids = new Set(toks.map((x) => x.id)); return toks.find((x) => !ids.has(x.head)) ?? toks[0]; };
const KINDS = { zero: (s, m) => m.start === m.end && s.toks[m.start].zero && s.toks[m.start].upos === "PRON", it: (s, m) => m.start === m.end && !s.toks[m.start].zero && s.toks[m.start].upos === "PRON" && s.toks[m.start].form.toLowerCase() === "it",
  definite: (s, m) => { const t = s.toks[m.start]; return !t.zero && /^the$/i.test(t.form) && t.upos === "DET" && m.end > m.start && ["NOUN"].includes(headOf(s, m).upos); } };   // regex-ok: the English article as a token form
const RULES = ["subject of the nearest earlier sentence", "most recent mention", "first mention in the window", "most mentions (ties to the latest)"], SHORT = { "subject of the nearest earlier sentence": "subject", "most recent mention": "recent", "first mention in the window": "first", "most mentions (ties to the latest)": "count" };
function run(docs, kind, N) {
  const T = { n: 0, random: 0, one: [0, 0], rules: Object.fromEntries(RULES.map((r) => [r, 0])), outside: 0 };
  for (const d of docs) { const seen = new Set();   // entities mentioned so far in the document
    for (let si = 0; si < d.sents.length; si++) { const s = d.sents[si];
      for (const m of [...s.mentions].sort((a, b) => a.start - b.start)) { if (!KINDS[kind](s, m)) { seen.add(m.id); continue; }
        if (!seen.has(m.id)) { seen.add(m.id); continue; }   // no earlier mention: no antecedent to find
        const cand = new Map();
        for (let sj = Math.max(0, si - N + 1); sj <= si; sj++) for (const mm of d.sents[sj].mentions) { if (mm === m || (sj === si && mm.start >= m.start && mm.end >= m.start)) continue; if (mm.id === undefined) continue; const hd = headOf(d.sents[sj], mm), rec = cand.get(mm.id) ?? cand.set(mm.id, { id: mm.id, ms: [] }).get(mm.id); rec.ms.push({ sj, at: mm.start, subj: /^nsubj/.test(hd.deprel) }); }   // regex-ok: a UD relation label
        seen.add(m.id); const ok = [...cand.values()]; if (!ok.length) { T.outside++; continue; }
        if (ok.length === 1) { T.one[1]++; if (ok[0].id === m.id) T.one[0]++; continue; }
        T.n++; T.random += 1 / ok.length; const all = ok.flatMap((c) => c.ms.map((x) => ({ ...x, id: c.id }))).sort((a, b) => a.sj - b.sj || a.at - b.at), earlier = Math.max(...all.filter((x) => x.sj < si || true).map((x) => (x.sj < si ? x.sj : -1))), pool = earlier >= 0 ? all.filter((x) => x.sj === earlier) : all;
        const pick = { [RULES[0]]: (pool.find((x) => x.subj) ?? pool[0]).id, [RULES[1]]: all[all.length - 1].id, [RULES[2]]: all[0].id, [RULES[3]]: [...ok].sort((a, b) => b.ms.length - a.ms.length || Math.max(...b.ms.map((x) => x.sj * 1000 + x.at)) - Math.max(...a.ms.map((x) => x.sj * 1000 + x.at)))[0].id };
        for (const r of RULES) if (pick[r] === m.id) T.rules[r]++; } } }
  return T;
}
const out = { stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY (DEV: CorefUD 1.3 dev sets; kinds, rules and N = 2 fixed before the run; N = 1 and 3 reported)", commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })() }, results: {}, pooled: {} };
const pool = {};
for (const S of SETS) { if (!fs.existsSync(S.file)) { console.log(`${S.name}: file not found (a typed gap: set COREFUD_DIR)`); continue; } const docs = parse(S.file); out.results[S.name] = {};
  for (const kind of S.kinds) for (const N of [1, 2, 3]) { const T = run(docs, kind, N); out.results[S.name][`${kind} N${N}`] = T;
    const P = (pool[`${kind} N${N}`] ??= { n: 0, random: 0, one: [0, 0], rules: Object.fromEntries(RULES.map((r) => [r, 0])), outside: 0 }); P.n += T.n; P.random += T.random; P.one[0] += T.one[0]; P.one[1] += T.one[1]; P.outside += T.outside; for (const r of RULES) P.rules[r] += T.rules[r];
    if (N === 2) console.log(`${S.name}, ${kind}: ${T.n} with two or more candidates (random ${T.n ? Math.round(100 * T.random / T.n) : "-"}%); ${RULES.map((r) => `${SHORT[r]} ${T.rules[r]} (${T.n ? Math.round(100 * T.rules[r] / T.n) : "-"}%)`).join(", ")}; exactly one candidate: ${T.one[0]} of ${T.one[1]} right; antecedent outside the window: ${T.outside}`); } }
console.log("\nPOOLED over the sets of each kind:");
for (const [k, P] of Object.entries(pool)) { out.pooled[k] = { n: P.n, random: P.n ? +(P.random / P.n).toFixed(2) : null, oneCandidate: P.one, outside: P.outside, rules: Object.fromEntries(RULES.map((r) => [r, { right: P.rules[r], rate: P.n ? +(P.rules[r] / P.n).toFixed(2) : null, wilson: wilson(P.rules[r], P.n) }])) };
  console.log(`${k.padEnd(13)} n=${String(P.n).padStart(5)} random ${P.n ? Math.round(100 * P.random / P.n) : "-"}% | ${RULES.map((r) => `${SHORT[r]} ${Math.round(100 * P.rules[r] / P.n)}% ${JSON.stringify(wilson(P.rules[r], P.n))}`).join(" | ")} | one candidate ${P.one[0]}/${P.one[1]} (${P.one[1] ? Math.round(100 * P.one[0] / P.one[1]) : "-"}%)`); }
fs.writeFileSync(path.join(HERE, "activation-other.json"), JSON.stringify(out, null, 1) + "\n");
