// e2-usage-corroborates.mjs — ANSWER FROM THE PRIORS: does USAGE agree with the embedder about which verbs say the same thing?
// The near-verb stand-in (organs/verb-equivalents.js + standsIn) rests on an embedder's judgement. The ingested lexicon is a second, independent giver: what a verb keeps
// company with across 40 books (its `company` words and the words it attaches to, `heads`). If pairs the embedder calls equivalent (mutual, above the bar) also share more of
// that company than random verb pairs of similar frequency do, usage corroborates them; the pairs where it does not are the ones to doubt (the antonym problem: love/hate).
// Verb vector = idf-weighted counts of its company and head words from the merged `lexicon` of corpus-lexicon-en.json; similarity = cosine. The comparison is a rank statistic
// (the chance that an equivalent pair has more shared usage than a random pair of the same frequency band). A negative result is a finding.   EXPLORATORY.
//   node eval/author-voice/e2-usage-corroborates.mjs [--min 50]
import fs from "node:fs"; import path from "node:path"; import { createHash } from "node:crypto";
const K = new URL("../../native/", import.meta.url).href, HERE = path.dirname(new URL(import.meta.url).pathname);
const MERGED = process.env.CORPUS_LEXICON_MERGED ?? "/Users/mlacy/Downloads/workspace/Zenodotus/derived-priors/corpus-lexicon/corpus-lexicon-en.json";
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; }, MIN = Number(arg("--min", 50));
const M = JSON.parse(fs.readFileSync(MERGED, "utf8")), lex = M.lexicon;
const verbs = Object.entries(lex).filter(([w, e]) => e.upos === "VERB" && /^[a-z]{3,}$/.test(w) && e.uses >= MIN).map(([w, e]) => ({ w, uses: e.uses, ctx: { ...e.company, ...Object.fromEntries(Object.entries(e.heads ?? {}).map(([h, c]) => ["h:" + h, c])) } }));
const df = new Map(); for (const v of verbs) for (const c of Object.keys(v.ctx)) df.set(c, (df.get(c) ?? 0) + 1);
const idf = (c) => Math.log(verbs.length / (df.get(c) ?? 1));
const vec = (v) => { const m = new Map(); let n = 0; for (const [c, x] of Object.entries(v.ctx)) { const wt = Math.log(1 + x) * idf(c); if (wt > 0) { m.set(c, wt); n += wt * wt; } } n = Math.sqrt(n) || 1; for (const [c, x] of m) m.set(c, x / n); return m; };
const V = new Map(verbs.map((v) => [v.w, { ...v, vec: vec(v) }])), cos = (a, b) => { let s = 0; const [x, y] = a.size < b.size ? [a, b] : [b, a]; for (const [c, w] of x) { const o = y.get(c); if (o) s += w * o; } return s; };
const { makeEmbedder } = await import(K + "adapters/text/embed-personhood.js"), { priorsFor } = await import(K + "the-fold/read-core.mjs"), { makeVerbEquivalence, referenceVerbs } = await import(K + "organs/verb-equivalents.js");
const e = makeEmbedder({ prefix: "classification: " }), E = makeVerbEquivalence({ embed: (t) => e.embed(t), reference: referenceVerbs(priorsFor("eng").posPrior) });
const pool = [...V.keys()].sort(), pairs = new Map();
for (const a of pool) for (const x of await E.equivalents(a, pool, { band: 1 })) { const [p, q] = a < x.verb ? [a, x.verb] : [x.verb, a]; pairs.set(`${p}|${q}`, { a: p, b: q, similarity: x.similarity, near_miss: x.near_miss }); }
const spread = await E.spread(); e.save();
const eq = [...pairs.values()].filter((p) => !p.near_miss), miss = [...pairs.values()].filter((p) => p.near_miss);
// a random pair of the same frequency band: for each equivalent pair, 20 pairs (a, r) with r drawn from the verbs whose use count is within a factor 2 of b's, seeded
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const score = (p) => cos(V.get(p.a).vec, V.get(p.b).vec);
const nullFor = (p) => { const b = V.get(p.b), cand = pool.filter((r) => r !== p.a && r !== p.b && V.get(r).uses / b.uses < 2 && V.get(r).uses / b.uses > 0.5); const out = []; for (let i = 0; i < 20 && cand.length; i++) out.push(cos(V.get(p.a).vec, V.get(cand[Math.floor(rnd() * cand.length)]).vec)); return out; };
const stat = (ps) => { let wins = 0, ties = 0, n = 0; const real = []; for (const p of ps) { const s = score(p), nul = nullFor(p); real.push(s); for (const x of nul) { n++; if (s > x) wins++; else if (s === x) ties++; } } real.sort((a, b) => a - b); return { pairs: ps.length, meanCosine: +(real.reduce((s, x) => s + x, 0) / real.length).toFixed(3), median: +real[Math.floor(real.length / 2)].toFixed(3), probMoreSharedUsageThanARandomPairOfTheSameFrequency: +((wins + ties / 2) / n).toFixed(3), comparisons: n }; };
const all = [...pairs.values()].map((p) => ({ ...p, usage: +score(p).toFixed(3) }));
const out = { schema: "E2-usage-corroborates@1", split: "EXPLORATORY", at: new Date().toISOString(), merged: { file: MERGED, sha256: createHash("sha256").update(fs.readFileSync(MERGED)).digest("hex"), reader: M.reader, documents: M.documents }, verbsUsed: verbs.length, minUses: MIN, bar: spread.bar,
  embedderEquivalents: stat(eq), embedderNearMisses: miss.length ? stat(miss) : null,
  lowestUsageAmongEquivalents: all.filter((p) => !p.near_miss).sort((a, b) => a.usage - b.usage).slice(0, 12).map((p) => `${p.a}/${p.b} emb ${p.similarity} usage ${p.usage}`),
  highestUsageAmongEquivalents: all.filter((p) => !p.near_miss).sort((a, b) => b.usage - a.usage).slice(0, 12).map((p) => `${p.a}/${p.b} emb ${p.similarity} usage ${p.usage}`) };
fs.mkdirSync(path.join(HERE, "results"), { recursive: true }); const f = path.join(HERE, "results", `E2-min${MIN}.json`); fs.writeFileSync(f, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1)); console.log("written", f); process.exit(0);
