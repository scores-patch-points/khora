// e1-lexical-preference.mjs — DO THE INGESTED PRIORS CARRY AN AUTHOR'S VOICE, AS A PREFERENCE AMONG NEAR-SYNONYMS?
// The owner, 2026-11-24: "see if we can use these priors to answer from and to answer in the voice of one of the authors."
// A voice, without a model, can only be a CHOICE the author makes where the content would be the same: of two verbs that say the same thing (the DMD guard of
// native/organs/verb-equivalents.js: mutual and above the bar of random verb pairs), which one the author reaches for. This tests whether that choice is the author's:
//   from book T by an author, the smoothed log-ratio of the counts of verb a and verb b (the per-document `lex` of the ingestion session's corpus-lexicon build)
//   predicts which of the two the SAME author uses more in another book S, better than (1) the pooled preference of every other author, and
//   better than (2) the preference taken from each OTHER author's book, one at a time (the rank of the same-author book among them is the test).
// A negative result is a finding. EXPLORATORY until a PREREG for the fresh pair is stamped (eval/author-voice/PREREG-E1.md).
//   node eval/author-voice/e1-lexical-preference.mjs --test Looking_Glass --train Alice_s [--k 5] [--band 0]
import fs from "node:fs"; import readline from "node:readline"; import path from "node:path"; import { createHash } from "node:crypto";
const K = new URL("../../native/", import.meta.url).href, HERE = path.dirname(new URL(import.meta.url).pathname);
const LEX = process.env.CORPUS_LEXICON_CHECKPOINT ?? "/Users/mlacy/Downloads/workspace/Zenodotus/derived-priors/corpus-lexicon/checkpoint-en-v3.jsonl";
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const TEST = arg("--test"), TRAIN = arg("--train"), KMIN = Number(arg("--k", 5)), BAND = Number(arg("--band", 0));
if (!TEST || !TRAIN) { console.error("usage: --test <part of the test book's file name> --train <part of the training book's file name> [--k 5] [--band 0]"); process.exit(2); }
const authors = JSON.parse(fs.readFileSync(path.join(HERE, "authors.json"), "utf8")).authors;
const stemOf = (f) => path.basename(f).replace(/\.txt$/, "");

// ---- the per-book verb counts (the lexicon is by lemma)
const docs = new Map();
for await (const line of readline.createInterface({ input: fs.createReadStream(LEX), crlfDelay: Infinity })) {
  if (!line.trim()) continue; const r = JSON.parse(line), stem = stemOf(r.file), v = new Map();
  for (const [w, e] of Object.entries(r.lex)) if (e.upos === "VERB" && /^[a-z]{3,}$/.test(w)) v.set(w, e.count);
  docs.set(stem, { stem, author: authors[stem] ?? `?${stem}`, verbs: v, reader: r.reader });
}
const pick = (part) => { const m = [...docs.values()].filter((d) => d.stem.includes(part)); if (m.length !== 1) throw new Error(`"${part}" matches ${m.length} books: ${m.map((d) => d.stem).join(", ")}`); return m[0]; };
const S = pick(TEST), T = pick(TRAIN);
if (S.author !== T.author) throw new Error(`train and test must be one author: ${T.author} / ${S.author}`);
const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");

// ---- the near-synonym pairs: the organ's own rule (mutual, above the bar), over the verbs both books use at least K times
const { makeEmbedder } = await import(K + "adapters/text/embed-personhood.js"), { priorsFor } = await import(K + "the-fold/read-core.mjs"), { makeVerbEquivalence, referenceVerbs } = await import(K + "organs/verb-equivalents.js");
const e = makeEmbedder({ prefix: "classification: " }), E = makeVerbEquivalence({ embed: (t) => e.embed(t), reference: referenceVerbs(priorsFor("eng").posPrior) });
const eligible = [...S.verbs].filter(([w, c]) => c >= KMIN && (T.verbs.get(w) ?? 0) >= KMIN).map(([w]) => w).sort();
const pairs = new Map();
for (const a of eligible) for (const x of await E.equivalents(a, eligible, { band: BAND })) { const [p, q] = a < x.verb ? [a, x.verb] : [x.verb, a]; pairs.set(`${p}|${q}`, { a: p, b: q, similarity: x.similarity, near_miss: x.near_miss }); }
const spread = await E.spread(); e.save();
const P = [...pairs.values()];

// ---- predictors
const lr = (m, a, b) => Math.log(((m.get(a) ?? 0) + 0.5) / ((m.get(b) ?? 0) + 0.5));
const pooled = new Map(); for (const d of docs.values()) if (d.author !== S.author) for (const [w, c] of d.verbs) pooled.set(w, (pooled.get(w) ?? 0) + c);
const truth = (p) => Math.sign((S.verbs.get(p.a) ?? 0) - (S.verbs.get(p.b) ?? 0));
const live = P.filter((p) => truth(p) !== 0);
const credit = (guess, y) => (guess === 0 ? 0.5 : guess === y ? 1 : 0);
const acc = (m) => live.reduce((s, p) => s + credit(Math.sign(lr(m, p.a, p.b)), truth(p)), 0) / live.length;
const aT = acc(T.verbs), a0 = acc(pooled);
const others = [...docs.values()].filter((d) => d.author !== S.author).map((d) => ({ book: d.stem, author: d.author, acc: acc(d.verbs) })).sort((x, y) => y.acc - x.acc);
const rank = 1 + others.filter((o) => o.acc >= aT).length;   // 1 = the same author's book predicts better than every other author's book
// McNemar, exact, same-author book against the pooled preference, on the pairs where exactly one of them is right
let b = 0, c = 0; for (const p of live) { const y = truth(p), t = Math.sign(lr(T.verbs, p.a, p.b)) === y, z = Math.sign(lr(pooled, p.a, p.b)) === y; if (t && !z) b++; if (!t && z) c++; }
const binom = (n, k) => { let s = 0, lc = (x) => { let r = 0; for (let i = 2; i <= x; i++) r += Math.log(i); return r; }; for (let i = 0; i <= k; i++) s += Math.exp(lc(n) - lc(i) - lc(n - i) - n * Math.log(2)); return s; };
const n = b + c, pTwo = n ? Math.min(1, 2 * binom(n, Math.min(b, c))) : 1;
const out = { schema: "E1-lexical-preference@1", split: "EXPLORATORY", at: new Date().toISOString(), checkpoint: { file: LEX, sha256: sha(LEX), reader: T.reader }, test: S.stem, train: T.stem, author: S.author, dials: { kMin: KMIN, band: BAND, bar: spread.bar, floor: spread.nearMissFloor, why: "kMin: a verb used fewer than K times in either book has a count dominated by chance; the bar is the organ's (mean + 2.5 sd of random verb pairs)" },
  eligibleVerbs: eligible.length, pairs: P.length, pairsWithATestPreference: live.length, accuracy: { sameAuthorBook: +aT.toFixed(3), pooledOtherAuthors: +a0.toFixed(3), otherAuthorBooks: { n: others.length, mean: +(others.reduce((s, o) => s + o.acc, 0) / others.length).toFixed(3), best: others.slice(0, 3), worst: others.slice(-1) } },
  rankOfSameAuthorBook: { rank, of: others.length + 1, note: "1 = best; under no author effect the rank is uniform" }, mcnemarVsPooled: { sameAuthorRightPooledWrong: b, pooledRightSameAuthorWrong: c, pTwoSided: +pTwo.toFixed(4) },
  examples: live.slice(0, 12).map((p) => ({ pair: `${p.a}/${p.b}`, similarity: p.similarity, test: [S.verbs.get(p.a) ?? 0, S.verbs.get(p.b) ?? 0], train: [T.verbs.get(p.a) ?? 0, T.verbs.get(p.b) ?? 0] })) };
fs.mkdirSync(path.join(HERE, "results"), { recursive: true }); const f = path.join(HERE, "results", `E1-${S.stem}-from-${T.stem}-k${KMIN}-b${BAND}.json`); fs.writeFileSync(f, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ test: S.stem, train: T.stem, pairs: P.length, live: live.length, accSame: out.accuracy.sameAuthorBook, accPooled: out.accuracy.pooledOtherAuthors, accOtherMean: out.accuracy.otherAuthorBooks.mean, bestOther: others[0], rank: out.rankOfSameAuthorBook, mcnemar: out.mcnemarVsPooled, bar: spread.bar }, null, 1)); console.log("written", f);
process.exit(0);
