#!/usr/bin/env node
// eval/callimachus/whom-standing-run.mjs — the run registered in WHOM-STANDING-PREREG.md (S1–S7, Amendment 1), COMMITTED BEFORE IT IS RUN.
//
//   node native/eval/callimachus/whom-standing-run.mjs --universe <permanent-dst> --whom <twin-reader whom dir> --out <results.json>
//
// Reads the universe and the twin-reader W files, writes only --out. No model. House ask only (Amendment 1.4): there is no per-ask
// `wFull` for the other three asks. Two instruments: R0 (recurrence-only) and R2 (the record's earned vocabulary; circular, Amendment 1.3).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax, makeSpan, quoteOf, parseAddress } from "../../organs/pinax.js";
import { readCorpus } from "../../organs/callimachus.js";
import { candidatesOf, witnesses, scoreWith } from "../../organs/answer-ladder.js";
import { questionVoid } from "../../organs/question-void.js";
import { foldGrain, spansFromRecord, arrangementOf } from "../../organs/grain.js";
import { foldWithWhom, standingsOf, coverageOf } from "../../organs/whom-standing.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const UNIVERSE = opt("--universe") && resolve(opt("--universe"));
const WHOM = opt("--whom") && resolve(opt("--whom"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!UNIVERSE || !WHOM || !OUT) { console.error("usage: whom-standing-run.mjs --universe <dir> --whom <dir> --out <results.json>"); process.exit(2); }

const ASK = "When did the House pass the Sunshine Protection Act?";
const HALF_SEEDS = Array.from({ length: 19 }, (_, i) => 501 + i);
const SHUF_SEEDS = Array.from({ length: 19 }, (_, i) => 601 + i);
const DENSE_NULLS = Array.from({ length: 19 }, (_, i) => `null-${i + 1}`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const log = (...m) => console.error(new Date().toISOString().slice(11, 19), ...m);

// ---- the universe, replayed from its pinned layers (as grain-arms-r2.mjs) -------------------------------------------------------
const EXTRACTOR = { name: "web.js#extractReadable", sha256: sha(readFileSync(join(here, "../../organs/web.js"))) };
const prior = JSON.parse(readFileSync(join(UNIVERSE, "record.json"), "utf8"));
const store = {};
const records = [];
for (const s of prior.sources) {
  const raw = readFileSync(join(UNIVERSE, "layers", `${s.id}.raw`));
  const text = readFileSync(join(UNIVERSE, "layers", `${s.id}.txt`), "utf8");
  const rec = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, fetch: s.fetch, raw: new Uint8Array(raw), text, extractor: EXTRACTOR });
  if (rec.entry.id !== s.id || rec.entry.text.sha256 !== s.text.sha256) { console.error(`replay: ${s.id} does not reproduce from its layers`); process.exit(3); }
  rec.declared = s.declared;
  store[rec.entry.id] = rec;
  records.push(rec);
}
const slice = async (address) => {
  const p = parseAddress(address);
  const rec = store[p.pinax];
  if (!rec) return null;
  const sp = await makeSpan(rec, p.layer, p.start, p.end);
  if (sp.ok === false) return null;
  const q = await quoteOf(sp, rec);
  return q.ok ? q.text : null;
};
const record = readCorpus(records, { question: prior.question, absences: prior.absences ?? [] });
const verdicts = { ...(prior.fixity ?? {}) };
const qg = (await import("../../adapters/text/question-grammar.en.js")).default;
const model = loadModel(JSON.parse(readFileSync(join(here, "../../priors/parser-eng-ewt.json"), "utf8")));
const qv = questionVoid(qg.readQuestion(ASK, { model }), record);
const cands = candidatesOf(record, verdicts);
const p1 = scoreWith(witnesses(cands, { question: qv, record }), ["perception"], cands.length);
const activation = new Map(cands.map((a, i) => [a.id, p1.s[i]]));
const region = (await spansFromRecord(record, { slice, activation })).filter((s) => s.activation > 0).sort((a, b) => b.activation - a.activation);
log(`region: ${region.length} spans`);

// ---- readers and materials ------------------------------------------------------------------------------------------------------
const READERS = { R0: null, R2: { verbs: new Set(record.vocab) } };
const blocksOf = (t) => t.split(/\n\s*\n/).map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffleWords = (b, rnd) => { const w = b.split(/\s+/).filter(Boolean); for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } return w.join(" "); };
const pick = (xs, k, rnd) => { const a = xs.map((x, i) => [rnd(), i]).sort((p, q) => p[0] - q[0]).slice(0, k).map(([, i]) => i).sort((p, q) => p - q); return a.map((i) => xs[i]); };
const textOf = (name) => readFileSync(join(WHOM, name, "thread.md"), "utf8");

let pinN = 0;
/** Read blocks as W with a reader. Spans carry provenance {kind:"pinax", ref:<pinax id>} (true: they are read from a pinned record). */
async function readW(blocks, reader) {
  const text = blocks.join("\n\n") + "\n";
  const raw = Buffer.from(text, "utf8");
  const rec = await makePinax({ url: `whom-standing:${pinN++}`, raw: new Uint8Array(raw), text, extractor: { name: "whom-standing run: local text" } });
  store[rec.entry.id] = rec;
  const r = readCorpus([rec], { question: "", received: reader });
  const spans = await spansFromRecord(r, { slice, side: "W" });
  return spans.map((s) => ({ ...s, provenance: { kind: "pinax", ref: rec.entry.id } }));
}
const strip = (spans) => spans.map(({ provenance, ...s }) => s);

const regionBlocks = region.map((s) => s.text.replace(/\s+/g, " ").trim());
const denseBlocks = blocksOf(textOf("dense"));
const bBlocks = blocksOf(textOf("B"));

// ---- one arm: grain.js as it is, and the layer over it ---------------------------------------------------------------------------
const itemSets = (f) => JSON.stringify(f.modes.map((m) => [m.mode, m.items.map((it) => (it.spans ?? []).join("|"))]));
function arm(name, whomSpans, wFull) {
  const base = foldGrain({ region, whom: strip(whomSpans).map((s) => ({ ...s })) });
  const mine = foldWithWhom({ region, whom: whomSpans, wFull });
  const sameGrain = base.grain === mine.grain;
  const pooledAgree = mine.standings.items.filter((i) => i.n.u.holds + i.n.w.holds >= 2 && i.n.u.refused + i.n.w.refused === 0).length;
  const apartAgree = mine.standings.items.filter((i) => i.n.u.holds >= 2 && i.n.u.refused === 0).length;
  return {
    name, claims: whomSpans.length,
    gJs: base.grain, mine: mine.grain, sameGrain,
    held: base.distance.held, absent: base.distance.absent, nullReal: base.distance.null.real, nullP: base.distance.null.p,
    selector: { minP: mine.selection.margin?.minP ?? null, p: mine.selection.margin?.p ?? null, recall: mine.selection.margin?.recall ?? null, expectedAbsent: mine.selection.margin?.expectedAbsent ?? null, instrumentSilent: !!mine.selection.instrumentSilent, underpowered: !!mine.selection.underpowered, measured: mine.selection.margin?.measured !== false },
    itemsEqualWhenGrainEqual: sameGrain ? itemSets(base) === itemSets(mine) : null,
    standings: mine.standings.counts, left: mine.standings.left.length, leadingMode: mine.standings.leadingMode,
    both: mine.standings.items.filter((i) => i.record === "both").length,
    readerNothing: mine.standings.items.filter((i) => i.reader === "nothing").length, propositions: mine.standings.items.length,
    pooledAgree, apartAgree,
    refusals: mine.refusals.map((r) => r.code), refused: mine.refused, closed: mine.closure.closed,
  };
}

// ---- run -------------------------------------------------------------------------------------------------------------------------
const results = { prereg: "native/eval/callimachus/WHOM-STANDING-PREREG.md", ask: ASK, region: region.length, readers: {} };
for (const [rname, reader] of Object.entries(READERS)) {
  log(`reader ${rname}`);
  const wFull = await readW(regionBlocks, reader);
  const coverage = coverageOf(region, wFull);
  const shufRecall = [];
  for (const seed of SHUF_SEEDS) {
    const rnd = mulberry(seed);
    const sw = await readW(regionBlocks.map((b) => shuffleWords(b, rnd)), reader);
    shufRecall.push({ claims: sw.length, recall: coverageOf(region, sw).recall });
  }
  const R = { coverage, wFullClaims: wFull.length, shuffledRecall: { mean: shufRecall.reduce((a, b) => a + b.recall, 0) / shufRecall.length, max: Math.max(...shufRecall.map((x) => x.recall)), claimsMean: shufRecall.reduce((a, b) => a + b.claims, 0) / shufRecall.length }, arms: {} };

  R.arms.void = arm("void", [], wFull);
  R.arms.dense = arm("dense", await readW(denseBlocks, reader), wFull);
  R.arms.B = arm("B", await readW(bBlocks, reader), wFull);
  R.arms.shown = arm("shown", wFull, wFull);

  R.halves = [];
  for (const seed of HALF_SEEDS) {
    const hb = pick(regionBlocks, Math.floor(regionBlocks.length / 2), mulberry(seed));
    R.halves.push({ seed, ...arm(`half-${seed}`, await readW(hb, reader), wFull) });
  }
  R.denseNulls = [];
  for (const nm of DENSE_NULLS) {
    if (!existsSync(join(WHOM, nm, "thread.md"))) { R.denseNulls.push({ name: nm, missing: true }); continue; }
    R.denseNulls.push(arm(nm, await readW(blocksOf(textOf(nm)), reader), wFull));
  }
  // S3: the same threads with provenance stripped (a forged/salted thread)
  const salted = [];
  for (const [name, blocks] of [["dense", denseBlocks], ["shown", regionBlocks]]) salted.push(arm(`salted-${name}`, strip(await readW(blocks, reader)), wFull));
  for (const h of HALF_SEEDS.slice(0, 19)) salted.push(arm(`salted-half-${h}`, strip(await readW(pick(regionBlocks, Math.floor(regionBlocks.length / 2), mulberry(h)), reader)), wFull));
  R.salted = salted;
  results.readers[rname] = R;
}

// ---- the predictions, computed -----------------------------------------------------------------------------------------------------
const P = (results.predictions = {});
for (const [rname, R] of Object.entries(results.readers)) {
  const nulls = R.denseNulls.filter((n) => !n.missing);
  const all = [R.arms.void, R.arms.dense, R.arms.B, R.arms.shown, ...R.halves, ...nulls];
  P[rname] = {
    recall: R.coverage.recall, shuffledRecallMean: R.shuffledRecall.mean,
    S1: { shown: { gJs: R.arms.shown.gJs, mine: R.arms.shown.mine, selector: R.arms.shown.selector }, holds: R.arms.shown.mine === "Pattern" },
    S1b: (() => {
      const g = R.halves.map((h) => h.mine);
      return { n: g.length, Figure: g.filter((x) => x === "Figure").length, Pattern: g.filter((x) => x === "Pattern").length, Ground: g.filter((x) => x === "Ground").length, underpowered: R.halves.filter((h) => h.selector.underpowered).length, instrumentSilent: R.halves.filter((h) => h.selector.instrumentSilent).length, gJsGrains: Object.fromEntries(["Ground", "Figure", "Pattern"].map((x) => [x, R.halves.filter((h) => h.gJs === x).length])), minP: R.halves[0]?.selector.minP ?? null, holds: rname === "R2" ? R.halves.every((h) => h.mine !== "Pattern") && R.halves.filter((h) => h.mine === "Figure").length > 0 : R.halves.filter((h) => h.mine === "Figure").length > R.halves.length / 2 };
    })(),
    S2: { arms: all.length, differ: all.filter((a) => (a.gJs === "Ground") !== (a.mine === "Ground")).map((a) => a.name), holds: all.every((a) => (a.gJs === "Ground") === (a.mine === "Ground")) },
    S3: { arms: R.salted.length, notGround: R.salted.filter((a) => a.mine !== "Ground").map((a) => a.name), allWhomEmpty: R.salted.every((a) => a.refusals.includes("whom-empty")), holds: R.salted.every((a) => a.mine === "Ground" && a.refusals.includes("whom-empty")) },
    S4: { arms: all.filter((a) => a.sameGrain).length, equal: all.filter((a) => a.itemsEqualWhenGrainEqual === true).length, differ: all.filter((a) => a.itemsEqualWhenGrainEqual === false).map((a) => a.name), holds: all.filter((a) => a.sameGrain).every((a) => a.itemsEqualWhenGrainEqual === true) },
    S5: { propositions: R.arms.void.propositions, readerNothing: R.arms.void.readerNothing, holds: R.arms.void.propositions === R.arms.void.readerNothing },
    S6: { dense: { pooledAgree: R.arms.dense.pooledAgree, apartAgree: R.arms.dense.apartAgree }, holds: R.arms.dense.pooledAgree > R.arms.dense.apartAgree },
    S7: { void: R.arms.void.both, dense: R.arms.dense.both, B: R.arms.B.both, standingsDense: R.arms.dense.standings },
    stampsAndRefusals: { refusedAnyRender: all.filter((a) => a.refused).map((a) => a.name), closedAll: all.every((a) => a.closed) },
  };
}
writeFileSync(OUT, JSON.stringify(results, null, 1));
log("wrote", OUT);
console.log(JSON.stringify(results.predictions, null, 1));
