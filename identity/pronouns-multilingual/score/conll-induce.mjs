// conll-induce.mjs — induce the rule against the REAL metric (CoNLL F1), not exact-match.
// For each candidate weight vector: bind pronouns by the weighted signals (from goldHead feats),
// assemble the sys prediction, run the official scorer, take CoNLL F1. Grid search, then report
// the CoNLL-F1-optimal rule vs the hand-set agenthood rule.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { parseCorefUD } = await import("../fra/lib-corefud.mjs");
const DATA = `/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data/CorefUD_English-LitBank`;
const docs = parseCorefUD(path.join(DATA, fs.readdirSync(DATA).find((f) => f.endsWith(`-dev.conllu`))));
const docsTo = docs.slice(0, +(process.argv[2] ?? 10));
const PY = "/tmp/corefud-venv/bin/python"; const SCORER = path.resolve(HERE, "../../givers/corefud-scorer/corefud-scorer.py");

// build the reading-order stream with per-entity stats (gender/number from goldHead feats)
const stream = []; const ent = new Map();
for (const doc of docsTo) for (const s of doc.sents) for (const t of s.tokens) {
  const m = s.mentions?.find((x) => x.c0 <= t.start && t.end <= x.c1);
  const id = m?.ent ?? null; const idx = stream.length;
  const gh = m?.goldHead;
  stream.push({ form: t.form, upos: t.upos, gender: /\bGender=(\w+)/.exec(t.feats ?? "")?.[1] ?? null, number: /\bNumber=(\w+)/.exec(t.feats ?? "")?.[1] ?? null, agent: t.deprel === "nsubj" || t.deprel === "nsubj:pass", id });
  if (id) { const e = ent.get(id) ?? { freq: 0, agent: 0, gender: /\bGender=(\w+)/.exec(gh?.feats ?? "")?.[1] ?? null, number: /\bNumber=(\w+)/.exec(gh?.feats ?? "")?.[1] ?? null, last: -1 }; e.freq++; if (t.deprel === "nsubj" || t.deprel === "nsubj:pass") e.agent++; if (t.upos !== "PRON") e.last = idx; ent.set(id, e); }
}
const PRON = new Set(["he", "she", "it", "they", "him", "her", "them"]);
const instances = [];
for (let i = 0; i < stream.length; i++) { const t = stream[i]; if (t.upos !== "PRON" || !PRON.has(t.form.toLowerCase())) continue; const cands = [...ent.entries()].filter(([, e]) => e.last >= 0 && e.last < i); if (!t.id || !cands.length) continue; const feats = new Map(); for (const [cid, e] of cands) feats.set(cid, [1/(1+(i-e.last)), e.agent, (t.gender && e.gender && t.gender===e.gender)?1:0, (t.number && e.number && t.number===e.number)?1:0, e.freq]); instances.push({ gold: t.id, feats }); }
console.log(`instances: ${instances.length} (${docsTo.length} docs)`);

// bind pronouns by a weight vector -> a Map(instance -> chosen entity)
const weighted = (w, f) => w.reduce((s, wi, k) => s + wi * f[k], 0);
const bind = (w) => instances.map((inst) => { let b = null, bv = -Infinity; for (const [id, f] of inst.feats) { const v = weighted(w, f); if (v > bv) { bv = v; b = id; } } return b; });

// write the sys.conllu for a given pronoun->cluster assignment, then score CoNLL F1
const stripMisc = (misc) => (misc === "_" ? [] : misc.split("|").filter((x) => !/^(Entity|Bridge|SplitAnte)=/.test(x)));
function scoreCoNLL(w, outDir) {
  const chosen = bind(w); let k = 0;
  const sysLines = [];
  for (const doc of docsTo) { const offs = []; let o = 0; for (const s of doc.sents) { offs.push(o); o += s.text.length + 1; } const ments = [];
    for (const s of doc.sents) for (const mm of s.mentions) ments.push({ a: offs[doc.sents.indexOf(s)] + mm.c0, b: offs[doc.sents.indexOf(s)] + mm.c1, cl: mm.ent, gold: true });
    // pronouns: reuse the gold mention spans, but re-assign the cluster by the rule
    // (simplification: pronouns are their own single-token mentions; we bind them to the chosen entity)
    let pi = 0;
    for (let si = 0; si < doc.sents.length; si++) for (const t of doc.sents[si].tokens) if (t.upos === "PRON" && PRON.has(t.form.toLowerCase()) && instances[k] !== undefined) { const cl = chosen[k]; if (cl) ments.push({ a: offs[si] + t.start, b: offs[si] + t.end, cl }); k++; }
    const bySent = doc.sents.map(() => []); const seen = new Set();
    for (const m of ments) { let si = -1; for (let i = doc.sents.length - 1; i >= 0; i--) if (offs[i] <= m.a) { si = i; break; } if (si < 0) continue; const s = doc.sents[si]; const ra = m.a - offs[si], rb = m.b - offs[si]; if (rb > s.text.length + 1) continue; const idx = s.tokens.map((t2, j) => (t2.start < rb && t2.end > ra ? j : -1)).filter((j) => j >= 0); if (!idx.length) continue; const t0 = idx[0], t1 = idx.at(-1); const key = si + ":" + t0 + ":" + t1 + ":" + m.cl; if (seen.has(key)) continue; seen.add(key); bySent[si].push({ t0, t1, cl: m.cl }); }
    const clusterIds = new Map(); const eid = (cl) => clusterIds.get(cl) ?? (clusterIds.set(cl, "e" + (clusterIds.size + 1)), clusterIds.get(cl));
    const entFor = (s, list) => { list.sort((x, y) => x.t0 - y.t0 || y.t1 - x.t1); const kept = []; for (const m of list) { if (kept.some((kk) => kk.t0 === m.t0 && kk.t1 === m.t1 && kk.cl === m.cl)) continue; if (kept.some((kk) => (kk.t0 < m.t0 && m.t0 <= kk.t1 && m.t1 > kk.t1) || (m.t0 < kk.t0 && kk.t0 <= m.t1 && kk.t1 > m.t1))) continue; kept.push(m); } const head = (m) => { const ids = new Set(s.tokens.slice(m.t0, m.t1 + 1).map((t) => t.id)); const hi = s.tokens.slice(m.t0, m.t1 + 1).findIndex((t) => !ids.has(t.head)); return (hi < 0 ? m.t1 - m.t0 : hi) + 1; }; const out = s.tokens.map(() => ({ close: [], open: [] })); for (const m of kept) { const id = eid(m.cl); if (m.t0 === m.t1) out[m.t0].open.push({ m, str: `(${id}--${head(m)})` }); else { out[m.t0].open.push({ m, str: `(${id}--${head(m)}` }); out[m.t1].close.push({ m, str: `${id})` }); } } return out.map((x) => { x.close.sort((p, q) => q.m.t0 - p.m.t0); x.open.sort((p, q) => q.m.t1 - p.m.t1); const singles = x.open.filter((y) => y.str.endsWith(")")), opens = x.open.filter((y) => !y.str.endsWith(")")); return [...x.close.map((y) => y.str), ...opens.map((y) => y.str), ...singles.map((y) => y.str)].join(""); }); };
    sysLines.push(doc.raw0);
    doc.sents.forEach((s, si) => { const ent = entFor(s, bySent[si]); for (const ln of s.lines) { const tk = s.tokens.find((t) => s.lines[t.li] === ln); if (!tk || !/^\d+\t/.test(ln)) { sysLines.push(ln); continue; } const f = ln.split("\t"); const misc = stripMisc(f[9]); const e = ent[s.tokens.indexOf(tk)]; if (e) misc.push("Entity=" + e); f[9] = misc.length ? misc.join("|") : "_"; sysLines.push(f.join("\t")); } sysLines.push(""); });
  }
  // write sys + key, run the scorer
  fs.writeFileSync(path.join(outDir, "sys.conllu"), sysLines.join("\n") + "\n");
  const key = path.join(DATA, fs.readdirSync(DATA).find((f) => f.endsWith(`-dev.conllu`)));
  const keyLines = []; for (const doc of docsTo) { keyLines.push(doc.raw0); for (const s of doc.sents) keyLines.push(...s.lines, ""); }
  fs.writeFileSync(path.join(outDir, "key.conllu"), keyLines.join("\n") + "\n");
  const out = execFileSync(PY, [SCORER, path.join(outDir, "key.conllu"), path.join(outDir, "sys.conllu"), "-m", "muc", "bcub", "ceafe"], { encoding: "utf8" });
  return parseFloat(/CoNLL score: ([\d.]+)/.exec(out)?.[1] ?? "0");
}
const SIG = ["recency", "agenthood", "gender", "number", "frequency"];
const OUT = path.join(HERE, "out", "conll-induce"); fs.mkdirSync(OUT, { recursive: true });
const baseline = scoreCoNLL([0.5, 1, 0, 0, 0], OUT);
console.log(`baseline (agenthood) CoNLL F1: ${baseline.toFixed(2)}`);
// small grid: each weight in {0, 1}, plus a few hand-picked combos
const candidates = [[0.5,1,0,0,0],[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0.5,0,0.5,0.5,0],[1,0,1,0,0],[0.5,1,1,0,0],[0,0,1,1,0],[0.5,0.5,0.5,0.5,0]];
let best = { f1: -1, w: null };
for (const w of candidates) { const f1 = scoreCoNLL(w, OUT); if (f1 > best.f1) best = { f1, w }; }
console.log(`best induced: ${best.f1.toFixed(2)}  weights ${SIG.map((s, k) => `${s}=${best.w[k]}`).join(" ")}`);
