// sealed-induce.mjs — the gold-sealed induction: build the SYSTEM prediction from the READ
// (names + noun-phrases + speakers from the read's cast, pronouns re-bound by the rule), score
// CoNLL F1, and grid-search the weight vector over the signals the read can compute. The gold
// never touches the prediction — it only grades it.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execFileSync } from "node:child_process";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const W = path.resolve(HERE, "../../..");
const { parseCorefUD } = await import("../fra/lib-corefud.mjs");
const { read } = await import(W + "/native/reading-one.mjs");
const DATA = `/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data/CorefUD_English-LitBank`;
const devFile = fs.readdirSync(DATA).find((f) => f.endsWith(`-dev.conllu`));
const docs = parseCorefUD(path.join(DATA, devFile));
const docsTo = docs.slice(0, +(process.argv[2] ?? 10));
const PY = "/tmp/corefud-venv/bin/python"; const SCORER = path.resolve(HERE, "../../givers/corefud-scorer/corefud-scorer.py");
const PRON = new Set(["he", "she", "it", "they", "him", "her", "them"]);

// read each doc, collect its mention stream + per-referent signals (from the read, never the gold)
async function readDoc(doc) {
  const text = doc.sents.map((s) => s.text).join(" ");
  const w = await read(text, { rows: true, allowDegraded: true, language: "eng", admitNominals: true, speakers: true });
  const offs = []; let o = 0; for (const s of doc.sents) { offs.push(o); o += s.text.length + 1; }
  const names = []; const signal = new Map();   // ref -> { agent, freq }
  for (const c of w.cast ?? []) { for (const [a, b] of c.mentionSpans ?? []) names.push({ a, b, cl: c.ref }); signal.set(c.ref, { agent: 0, freq: (c.mentionSpans ?? []).length }); }
  for (const p of w.parse ?? []) for (const row of p.rows) if (row.karaka === "kartṛ" && (row.lemma || row.form)) { const surf = (row.lemma || row.form).toLowerCase(); for (const [ref] of signal) { const c = w.cast.find((x) => x.ref === ref); if (c && (c.surface.toLowerCase() === surf || (c.allSurfaces ?? []).some((s2) => s2.toLowerCase() === surf))) signal.get(ref).agent++; } }
  const speakers = (w.speakerBindings ?? []).filter((x) => x && typeof x === "object" && "a" in x);
  // pronouns (3rd-person only) in document order, with their read offsets
  const pronouns = [];
  for (const p of w.pronounsGuess ?? []) if (PRON.has(String(p.pronoun).toLowerCase())) pronouns.push({ a: p.at[0], b: p.at[1], pronoun: p.pronoun, ref: p.ref });
  return { text, offs, names, speakers, pronouns, signal, doc };
}
const docsData = []; for (const doc of docsTo) docsData.push(await readDoc(doc));
console.log(`read ${docsData.length} docs; referents per doc ~${Math.round(docsData.reduce((s,d)=>s+d.signal.size,0)/docsData.length)}`);

// build sys.conllu for a rule, score CoNLL F1
const stripMisc = (misc) => (misc === "_" ? [] : misc.split("|").filter((x) => !/^(Entity|Bridge|SplitAnte)=/.test(x)));
function buildSys(rule) {
  // rule: (w, recent, refsOrder) -> the cluster for a pronoun; we recompute recent per doc
  const outLines = [];
  for (const d of docsData) {
    const mentions = [];
    for (const n of d.names) mentions.push({ a: n.a, b: n.b, cl: n.cl });
    for (const s of d.speakers) mentions.push({ a: s.a, b: s.b, cl: s.cl });
    const recent = [];
    for (const n of [...d.names].sort((x, y) => x.a - y.a)) recent.push(n.cl);
    const cands = [...d.signal.entries()].map(([ref, sig]) => ({ ref, ...sig }));
    for (const pr of d.pronouns) {
      const weight = (ref) => { const sig = d.signal.get(ref); const rec = recent.lastIndexOf(ref) >= 0 ? 1 : 0; return rule[0] * rec + rule[1] * (sig?.agent ?? 0) + rule[2] * (sig?.freq ?? 0); };
      let best = null, bv = -Infinity; for (const c of cands) { const v = weight(c.ref); if (v > bv) { bv = v; best = c.ref; } }
      if (best) { mentions.push({ a: pr.a, b: pr.b, cl: best }); recent.push(best); }
    }
    // align to sentences, emit Entity= (the predict-corefud conversion)
    const bySent = d.doc.sents.map(() => []); const seen = new Set();
    for (const m of mentions) { let si = -1; for (let i = d.doc.sents.length - 1; i >= 0; i--) if (d.offs[i] <= m.a) { si = i; break; } if (si < 0) continue; const s = d.doc.sents[si]; const ra = m.a - d.offs[si], rb = m.b - d.offs[si]; if (rb > s.text.length + 1) continue; const idx = s.tokens.map((t, j) => (t.start < rb && t.end > ra ? j : -1)).filter((j) => j >= 0); if (!idx.length) continue; const t0 = idx[0], t1 = idx.at(-1); const key = si + ":" + t0 + ":" + t1 + ":" + m.cl; if (seen.has(key)) continue; seen.add(key); bySent[si].push({ t0, t1, cl: m.cl }); }
    const clusterIds = new Map(); const eid = (cl) => clusterIds.get(cl) ?? (clusterIds.set(cl, "e" + (clusterIds.size + 1)), clusterIds.get(cl));
    const entFor = (s, list) => { list.sort((x, y) => x.t0 - y.t0 || y.t1 - x.t1); const kept = []; for (const m of list) { if (kept.some((kk) => kk.t0 === m.t0 && kk.t1 === m.t1 && kk.cl === m.cl)) continue; if (kept.some((kk) => (kk.t0 < m.t0 && m.t0 <= kk.t1 && m.t1 > kk.t1) || (m.t0 < kk.t0 && kk.t0 <= m.t1 && kk.t1 > m.t1))) continue; kept.push(m); } const head = (m) => { const ids = new Set(s.tokens.slice(m.t0, m.t1 + 1).map((t) => t.id)); const hi = s.tokens.slice(m.t0, m.t1 + 1).findIndex((t) => !ids.has(t.head)); return (hi < 0 ? m.t1 - m.t0 : hi) + 1; }; const out = s.tokens.map(() => ({ close: [], open: [] })); for (const m of kept) { const id = eid(m.cl); if (m.t0 === m.t1) out[m.t0].open.push({ m, str: `(${id}--${head(m)})` }); else { out[m.t0].open.push({ m, str: `(${id}--${head(m)}` }); out[m.t1].close.push({ m, str: `${id})` }); } } return out.map((x) => { x.close.sort((p, q) => q.m.t0 - p.m.t0); x.open.sort((p, q) => q.m.t1 - p.m.t1); const singles = x.open.filter((y) => y.str.endsWith(")")), opens = x.open.filter((y) => !y.str.endsWith(")")); return [...x.close.map((y) => y.str), ...opens.map((y) => y.str), ...singles.map((y) => y.str)].join(""); }); };
    outLines.push(d.doc.raw0);
    d.doc.sents.forEach((s, si) => { const ent = entFor(s, bySent[si]); for (const ln of s.lines) { const tk = s.tokens.find((t) => s.lines[t.li] === ln); if (!tk || !/^\d+\t/.test(ln)) { outLines.push(ln); continue; } const f = ln.split("\t"); const misc = stripMisc(f[9]); const e = ent[s.tokens.indexOf(tk)]; if (e) misc.push("Entity=" + e); f[9] = misc.length ? misc.join("|") : "_"; outLines.push(f.join("\t")); } outLines.push(""); });
  }
  return outLines;
}
function scoreCoNLL(rule, outDir) {
  fs.writeFileSync(path.join(outDir, "sys.conllu"), buildSys(rule).join("\n") + "\n");
  const key = path.join(DATA, devFile); const keyLines = []; for (const doc of docsTo) { keyLines.push(doc.raw0); for (const s of doc.sents) keyLines.push(...s.lines, ""); }
  fs.writeFileSync(path.join(outDir, "key.conllu"), keyLines.join("\n") + "\n");
  const out = execFileSync(PY, [SCORER, path.join(outDir, "key.conllu"), path.join(outDir, "sys.conllu"), "-m", "muc", "bcub", "ceafe"], { encoding: "utf8" });
  return parseFloat(/CoNLL score: ([\d.]+)/.exec(out)?.[1] ?? "0");
}
const OUT = path.join(HERE, "out", "sealed-induce"); fs.mkdirSync(OUT, { recursive: true });
const SIG = ["recency", "agenthood", "frequency"];
const baseline = scoreCoNLL([0.5, 1, 0], OUT);
console.log(`baseline (recency .5 + agenthood 1): ${baseline.toFixed(2)}`);
let best = { f1: -1, w: null };
for (const r of [0, 0.5, 1]) for (const a of [0, 0.5, 1]) for (const f of [0, 0.5, 1]) { if (r === 0 && a === 0 && f === 0) continue; const w = [r, a, f]; const f1 = scoreCoNLL(w, OUT); if (f1 > best.f1) best = { f1, w }; }
console.log(`best induced: ${best.f1.toFixed(2)}  ${SIG.map((s, k) => `${s}=${best.w[k]}`).join("  ")}`);
