// eval/referents/referent-read.mjs — THE REFERENT LEDGER AGAINST THE PLAIN INDEX, ON GUM'S GOLD PROPER NAMES (pre-registered: PREREG-REFERENT-READ.md).
//
// It reads whole GUM documents through the master pipeline (reading.js::readDocument, the same call as pronoun-golden.mjs) with `referents: true` and scores
// what the pipeline itself reports: the plain arm is `entry.cast` (ref:auto:<slug>), the ledger arm is `entry.referents` (ref_<hash>). Nothing here resolves a name.
//
//   GUM_TRAIN=/path/en_gum-ud-train.conllu WIKTIONARY_READER=... node eval/referents/referent-read.mjs [--slice A,E] [--out file.json] [--dump-off file.json]
//
//   --slice A,E   A is the design slice (seed 20261110), E the fresh confirmation slice (seed 20261201). Default A.
//   --dump-only   with --dump-off: dump the hashes and score nothing
//   --dump-off f  write, for every document read and every fixture, the sha256 of the entry read WITHOUT the option (ms zeroed); run it on the base commit and on the branch
//                 and diff the two files: C2 of the pre-registration, zero differing bytes.
// Without GUM_TRAIN or the lexicon giver the eval says so and exits 0.
import fs from "node:fs";
import crypto from "node:crypto";
import { readDocument } from "../../native/reading.js";
import { localLexicon } from "../../native/adapters/text/wiktionary-pack.js";
import { parseGum, slicesOf, GUM_TRAIN_SHA256 } from "./pronoun-golden.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
/** mulberry32 and the Fisher-Yates the golden uses (copied: pronoun-golden does not export them) */
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const shuffled = (n, r) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sha = (x) => crypto.createHash("sha256").update(x).digest("hex");

/** slices A (design) and E (fresh), built as the golden builds its slices; D is rebuilt as a check that these helpers are the golden's own */
export function slicesAE(docs) {
  const ord = docs.filter((d) => d.sents.length >= 20).sort((a, b) => (a.id < b.id ? -1 : 1));
  const A = shuffled(ord.length, rng(20261110)).slice(0, 30).map((i) => ord[i]), inA = new Set(A.map((d) => d.id));
  const { B, C, D } = slicesOf(docs);
  const inB = new Set(B.map((d) => d.id)), inC = new Set(C.map((d) => d.id)), inD = new Set(D.map((d) => d.id));
  const unused = ord.filter((d) => !inA.has(d.id) && !inB.has(d.id) && !inC.has(d.id));
  const aside = new Set(shuffled(unused.length, rng(20261140)).slice(0, 65).map((i) => unused[i].id)), left = unused.filter((d) => !aside.has(d.id));
  const recheckD = shuffled(left.length, rng(20261141)).slice(0, 30).map((i) => left[i]);
  if (recheckD.map((d) => d.id).join() !== D.map((d) => d.id).join()) throw new Error("referent-read: the rebuilt slice D is not the golden's: the helpers drifted");
  const restE = left.filter((d) => !inD.has(d.id));
  const E = shuffled(restE.length, rng(20261201)).slice(0, 30).map((i) => restE[i]);
  for (const d of E) if (inA.has(d.id) || inB.has(d.id) || inC.has(d.id) || inD.has(d.id) || aside.has(d.id)) throw new Error("referent-read: slice E is not fresh");
  return { A, E };
}

const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c);

/** the gold names of a document: PROPN-headed, not strictly contained in another gold mention; { ent, a, b } in the document text */
export function goldNames(doc) {
  const text = doc.sents.map((s) => s.text).join(" ");
  const offs = []; let o = 0; for (const s of doc.sents) { offs.push(o); o += s.text.length + 1; }
  const out = [];
  doc.sents.forEach((s, si) => {
    for (const m of s.mentions) {
      if (m.goldHead.upos !== "PROPN") continue;
      const nested = s.mentions.some((x) => x !== m && x.start <= m.start && m.end <= x.end && (x.start < m.start || m.end < x.end));
      if (!nested) out.push({ ent: m.ent, a: offs[si] + m.c0, b: offs[si] + m.c1 });
    }
  });
  return { text, names: out };
}

/** the label a set of spans [{a, b, label}] gives a gold name: the label of the span overlapping most (ties: the earlier), or null */
const labelFor = (g, spans) => {
  let best = null, bo = 0;
  for (const s of spans) { const ov = overlap(g.a, g.b, s.a, s.b); if (ov > bo) { bo = ov; best = s; } }
  return best ? best.label : null;
};

// ── metrics (micro-pooled over a slice): counts are summed per document, then divided ──
export function metricsInit() { return { n: 0, p: 0, r: 0, pairSys: 0, pairGold: 0, pairBoth: 0 }; }
/** add one document: items are [{ gold, sys }] with sys a label (a null sys is a singleton of its own) */
export function metricsAdd(M, items) {
  const keyed = items.map((x, i) => ({ gold: x.gold, sys: x.sys ?? `~singleton${i}` }));
  const bySys = new Map(), byGold = new Map();
  for (const x of keyed) { (bySys.get(x.sys) ?? bySys.set(x.sys, []).get(x.sys)).push(x); (byGold.get(x.gold) ?? byGold.set(x.gold, []).get(x.gold)).push(x); }
  for (const x of keyed) {
    const S = bySys.get(x.sys), T = byGold.get(x.gold), both = S.filter((y) => y.gold === x.gold).length;
    M.p += both / S.length; M.r += both / T.length; M.n++;
  }
  const c2 = (k) => (k * (k - 1)) / 2;
  for (const g of bySys.values()) { M.pairSys += c2(g.length); const per = new Map(); for (const y of g) per.set(y.gold, (per.get(y.gold) ?? 0) + 1); for (const k of per.values()) M.pairBoth += c2(k); }
  for (const g of byGold.values()) M.pairGold += c2(g.length);
}
export function metricsDone(M) {
  const f = (p, r) => (p + r ? (2 * p * r) / (p + r) : 0);
  const bp = M.n ? M.p / M.n : 0, br = M.n ? M.r / M.n : 0, pp = M.pairSys ? M.pairBoth / M.pairSys : 0, pr = M.pairGold ? M.pairBoth / M.pairGold : 0;
  return { n: M.n, b3: { p: bp, r: br, f1: f(bp, br) }, pair: { p: pp, r: pr, f1: f(pp, pr) } };
}

function selfcheck() {
  const items = [{ gold: 1, sys: "a" }, { gold: 1, sys: "a" }, { gold: 2, sys: "b" }, { gold: 2, sys: "b" }, { gold: 2, sys: "b" }];
  const M = metricsInit(); metricsAdd(M, items); const perfect = metricsDone(M);
  const S = metricsInit(); metricsAdd(S, items.map((x) => ({ gold: x.gold, sys: null }))); const singles = metricsDone(S);
  const L = metricsInit(); metricsAdd(L, items.map((x) => ({ gold: x.gold, sys: "all" }))); const lump = metricsDone(L);
  if (perfect.b3.f1 !== 1 || perfect.pair.f1 !== 1) throw new Error("metric selfcheck: a perfect clustering must score 1");
  if (!(singles.b3.p === 1 && singles.b3.r < 1 && singles.pair.r === 0)) throw new Error("metric selfcheck: all singletons must have precision 1 and lower recall");
  if (!(lump.b3.r === 1 && lump.b3.p < 1)) throw new Error("metric selfcheck: one lump must have recall 1 and lower precision");
}

/** one document, both arms: [{ gold, plain, ledger }] over the evaluation set G, plus the entries and the timings */
export async function scoreDocument(doc, lexicon) {
  const { text, names } = goldNames(doc);
  // the lexicon answers a form once and remembers it, so a first read pays the asks: read once without the option to warm it, then time the read with the option
  await readDocument(text, { language: "en", minCharacters: 0, lexicon });
  const t0 = Date.now();
  const entry = await readDocument(text, { language: "en", minCharacters: 0, lexicon, referents: true });
  const ms = Date.now() - t0;
  const plainSpans = []; for (const c of entry.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) plainSpans.push({ a, b, label: c.ref });
  const L = entry.referents;
  const ledgerOf = new Map(); for (const r of L?.referents ?? []) for (const sid of r.mentions) ledgerOf.set(sid, r.id);
  const ledgerSpans = []; for (const s of L?.spans ?? []) if (s.kind === "name" && ledgerOf.has(s.id)) ledgerSpans.push({ a: s.at[0], b: s.at[1], label: ledgerOf.get(s.id) });
  const G = [];
  for (const g of names) {
    if (!plainSpans.some((s) => overlap(g.a, g.b, s.a, s.b) > 0)) continue;
    G.push({ gold: g.ent, plain: labelFor(g, plainSpans), ledger: labelFor(g, ledgerSpans) });
  }
  const gaps = {}; for (const x of entry.gaps ?? []) gaps[x.gap] = (gaps[x.gap] ?? 0) + 1;
  return { G, gaps, ms, entry, text };
}

const mulberryPick = (seed) => rng(seed);
/** the shuffled-assignment control: within each document the ledger labels of G are permuted among its mentions; `draws` draws; the pooled B-cubed F1 of each */
export function shuffledNull(perDoc, draws, seed) {
  const r = mulberryPick(seed), fs_ = [];
  for (let d = 0; d < draws; d++) {
    const M = metricsInit();
    for (const G of perDoc) { const lab = G.map((x) => x.ledger), idx = shuffled(lab.length, r); metricsAdd(M, G.map((x, i) => ({ gold: x.gold, sys: lab[idx[i]] }))); }
    fs_.push(metricsDone(M).b3.f1);
  }
  fs_.sort((a, b) => a - b);
  return { draws, seed, mean: fs_.reduce((a, b) => a + b, 0) / draws, p95: fs_[Math.ceil(0.95 * draws) - 1], max: fs_.at(-1) };
}

async function stability(doc, lexicon, whole) {
  // reported, not barred: the share of the prefix read's beings whose id appears in the whole read; the prefix is the first half of the sentences, the same address
  const half = doc.sents.slice(0, Math.ceil(doc.sents.length / 2)).map((s) => s.text).join(" ");
  const full = doc.sents.map((s) => s.text).join(" ");
  const opts = { language: "en", minCharacters: 0, lexicon, referents: true, address: `gum:${doc.id}` };
  const p = await readDocument(half, opts), w = whole ?? await readDocument(full, opts);
  const plainP = new Set((p.cast ?? []).map((c) => c.ref)), plainW = new Set((w.cast ?? []).map((c) => c.ref));
  const ledP = new Set((p.referents?.referents ?? []).map((r) => r.id)), ledW = new Set((w.referents?.referents ?? []).map((r) => r.id));
  return { plain: [[...plainP].filter((x) => plainW.has(x)).length, plainP.size], ledger: [[...ledP].filter((x) => ledW.has(x)).length, ledP.size] };
}

const FIXTURES = [
  "Mr. Bennet walked to the village and Mrs. Bennet stayed at Longbourn. Mr. Bennet read his book in the library all evening. Mrs. Bennet complained about the neighbours at length. This sentence is only padding so the text clears the minimum length for reading at all.",
  "Yesterday Anna Smith visited Paris. Yesterday Boris Smith visited Paris. Later Carla Jones met Boris Jones in Rome. Later Carla Jones met Boris Smith in Rome. This sentence is only padding so the text clears the minimum length for reading at all.",
  "Henry IV ruled in England for years. Later Henry V followed him and fought in France. Then Henry VIII came to the throne in London. Henry IV was remembered, and Henry V too. This sentence is only padding so the text clears the minimum length.",
];

async function main() {
  selfcheck();
  const file = process.env.GUM_TRAIN || arg("--gum", null);
  if (!file || !fs.existsSync(file)) { console.log("referent-read: skipped — set GUM_TRAIN to UD_English-GUM's en_gum-ud-train.conllu (CC BY-SA, not vendored)."); return; }
  const gsha = sha(fs.readFileSync(file));
  console.log(`GUM train sha256 ${gsha}${gsha === GUM_TRAIN_SHA256 ? " (the file the pre-registration names)" : " — NOT the file the pre-registration names"}`);
  const lexicon = localLexicon("en");
  await lexicon.want(["office"]);
  if (!lexicon.giver) { console.log(`referent-read: skipped — no lexicon giver on this machine (${lexicon.log.at(-1)?.gap ?? "no answer"}).`); return; }
  const slices = slicesAE(parseGum(file));
  const want = arg("--slice", "A").split(",");
  const dump = arg("--dump-off", null), dumped = {};
  const report = { prereg: "PREREG-REFERENT-READ.md", gum: gsha, slices: {} };
  if (dump) {
    for (const [i, t] of FIXTURES.entries()) { const e = await readDocument(t, { language: "en", minCharacters: 0, lexicon: false }); dumped[`fixture${i}`] = sha(JSON.stringify({ ...e, ms: 0 })); }
  }
  if (process.argv.includes("--dump-only")) {
    // C2 only: the entries read without the option, hashed; nothing is scored (run on the base commit and on the branch, then diff)
    for (const name of want) for (const d of slices[name]) { const { text } = goldNames(d); const off = await readDocument(text, { language: "en", minCharacters: 0, lexicon }); dumped[`${name}:${d.id}`] = sha(JSON.stringify({ ...off, ms: 0 })); }
    fs.writeFileSync(dump, `${JSON.stringify(dumped, null, 1)}\n`); console.log(`dumped ${Object.keys(dumped).length} entries to ${dump}`); return;
  }
  for (const name of want) {
    const perDoc = [], Mp = metricsInit(), Ml = metricsInit(), gapTotals = {}; let bound = 0, total = 0, msOn = 0, msOff = 0, stab = { plain: [0, 0], ledger: [0, 0] };
    for (const d of slices[name]) {
      const r = await scoreDocument(d, lexicon);
      perDoc.push(r.G);
      metricsAdd(Mp, r.G.map((x) => ({ gold: x.gold, sys: x.plain }))); metricsAdd(Ml, r.G.map((x) => ({ gold: x.gold, sys: x.ledger })));
      for (const x of r.G) { total++; if (x.ledger) bound++; }
      for (const [k, v] of Object.entries(r.gaps)) gapTotals[k] = (gapTotals[k] ?? 0) + v;
      msOn += r.ms;
      const t0 = Date.now(); const off = await readDocument(r.text, { language: "en", minCharacters: 0, lexicon }); msOff += Date.now() - t0;
      if (dump) dumped[`${name}:${d.id}`] = sha(JSON.stringify({ ...off, ms: 0 }));
      if (name === "A") { const s = await stability(d, lexicon, null); stab.plain[0] += s.plain[0]; stab.plain[1] += s.plain[1]; stab.ledger[0] += s.ledger[0]; stab.ledger[1] += s.ledger[1]; }
    }
    const plain = metricsDone(Mp), ledger = metricsDone(Ml), nul = shuffledNull(perDoc, 199, 20261111);
    const margin = 0.005;
    const bars = {
      B1_b3: ledger.b3.f1 >= plain.b3.f1 - margin, B2_pair: ledger.pair.f1 >= plain.pair.f1 - margin, B3_bound: bound / total >= 1 - margin,
      C1_control: ledger.b3.f1 > nul.p95,
    };
    report.slices[name] = { documents: slices[name].length, goldNames: plain.n, plain, ledger, bound: [bound, total], shuffled: nul, bars, gaps: gapTotals, ms: { on: msOn, off: msOff }, ...(name === "A" ? { stability: { plain: stab.plain, ledger: stab.ledger } } : {}) };
    const f3 = (x) => x.toFixed(3);
    console.log(`\nslice ${name}: ${slices[name].length} documents, ${plain.n} gold names covered by the plain cast`);
    console.log("            B3 P / R / F1            pairwise P / R / F1");
    console.log("plain       ", [plain.b3.p, plain.b3.r, plain.b3.f1].map(f3).join(" / "), "      ", [plain.pair.p, plain.pair.r, plain.pair.f1].map(f3).join(" / "));
    console.log("ledger      ", [ledger.b3.p, ledger.b3.r, ledger.b3.f1].map(f3).join(" / "), "      ", [ledger.pair.p, ledger.pair.r, ledger.pair.f1].map(f3).join(" / "));
    console.log(`ledger binds ${bound}/${total} of the covered names (${f3(bound / total)}); shuffled control: mean ${f3(nul.mean)}, p95 ${f3(nul.p95)}, max ${f3(nul.max)} over ${nul.draws} draws (seed ${nul.seed})`);
    console.log("bars:", Object.entries(bars).map(([k, v]) => `${k} ${v ? "PASS" : "FAIL"}`).join("  "), `(margin ${margin})`);
    console.log("gaps:", JSON.stringify(gapTotals));
    console.log(`ms on / off: ${msOn} / ${msOff}`);
    if (name === "A") console.log(`id stability across prefix and whole (reported): plain ${stab.plain[0]}/${stab.plain[1]}, ledger ${stab.ledger[0]}/${stab.ledger[1]}`);
  }
  const out = arg("--out", null);
  if (out) fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  if (dump) fs.writeFileSync(dump, `${JSON.stringify(dumped, null, 1)}\n`);
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
