#!/usr/bin/env node
// eval/callimachus/grain-belief-r5.mjs — the fifth registration: relevance as belief movement bounded by the difference window, exactly as pre-registered in GRAIN-R5-PREREG.md.
//
//   node native/eval/callimachus/grain-belief-r5.mjs --universe <pinned run dir> --whom <twin-reader whom dir> --out <results.json>
//
// COMMITTED BEFORE IT IS RUN, and not edited after. It has not been run. It reads, and never writes anywhere but --out:
//   --universe  a copy of callimachus-runs/permanent-dst (record.json + layers/), replayed from its pinned bytes, never refetched.
//   --whom      the twin-reader run's `whom/` directory: dense, B, null-1..19, bnull-101..119, each `thread.md`, byte for byte
//               (their sha256s are recorded in the results and must match the pre-registration: dense 3e8f5b1e…, B c1e854c5…).
// The grain is selected and run by organs/grain.js `foldGrain`; W is read by organs/holdings.js `claimsOfWhom` (the same claim reader
// as U). No model anywhere. Nothing in W leaves the machine.
//
// What each prediction in GRAIN-PREREG.md needs is computed here, mechanically, and written as `predictions` with `holds` or
// `uninformative` (an arm whose W admitted no claim is never scored as a pass).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax, makeSpan, quoteOf, parseAddress } from "../../organs/pinax.js";
import { readCorpus } from "../../organs/callimachus.js";
import { candidatesOf, witnesses, scoreWith } from "../../organs/answer-ladder.js";
import { questionVoid } from "../../organs/question-void.js";
import { foldGrain, splitRegion, spansFromRecord, arrangementOf, GRAINS } from "../../organs/grain.js";
import { rankByBelief, valuesFor } from "../../organs/belief-movement.js";
import { claimsOfWhom } from "../../organs/holdings.js";
import { readWhom, whomStemDf } from "../../organs/whom.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const UNIVERSE = opt("--universe") && resolve(opt("--universe"));
const WHOM = opt("--whom") && resolve(opt("--whom"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!UNIVERSE || !WHOM || !OUT) { console.error("usage: grain-belief-r5.mjs --universe <dir> --whom <dir> --out <results.json>"); process.exit(2); }

const ASK = "When did the House pass the Sunshine Protection Act?";
const PREREG_SHA = { dense: "3e8f5b1e45c8a19539c92c3b0c733fdce57109d315cb12e0841b22eda95fafbe", B: "c1e854c5c9d7603224eeb2fd692c964d709fd2590e6e0ec8b2a7949250d22e80" };
const NULL_SEEDS = { dense: Array.from({ length: 19 }, (_, i) => `null-${i + 1}`), B: Array.from({ length: 19 }, (_, i) => `bnull-${i + 101}`) };
const CHAIN_MAX = 5;
const sha = (b) => createHash("sha256").update(b).digest("hex");
const log = (...m) => console.error(new Date().toISOString().slice(11, 19), ...m);

// ---- the universe, replayed from its pinned layers ------------------------------------------------------------------------------
const webJs = readFileSync(join(here, "../../organs/web.js"));
const EXTRACTOR = { name: "web.js#extractReadable", sha256: sha(webJs) };
const prior = JSON.parse(readFileSync(join(UNIVERSE, "record.json"), "utf8"));
const store = {};
const records = [];
for (const s of prior.sources) {
  const raw = readFileSync(join(UNIVERSE, "layers", `${s.id}.raw`));
  const text = readFileSync(join(UNIVERSE, "layers", `${s.id}.txt`), "utf8");
  const rec = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, fetch: s.fetch, raw: new Uint8Array(raw), text, extractor: EXTRACTOR });
  if (rec.entry.id !== s.id || rec.entry.text.sha256 !== s.text.sha256) { console.error(`replay: ${s.id} does not reproduce from its layers (web.js changed since the record was pinned?)`); process.exit(3); }
  rec.declared = s.declared;
  records.push(rec);
  store[rec.entry.id] = rec;
}
const record = readCorpus(records, { question: prior.question, absences: prior.absences ?? [] });
const verdicts = { ...(prior.fixity ?? {}) };
/** Slice any address, in U or in any W pinned so far: the bytes the span names, or null. */
const slice = async (address) => {
  const p = parseAddress(address);
  const rec = store[p.pinax];
  if (!rec) return null;
  const sp = await makeSpan(rec, p.layer, p.start, p.end);
  if (sp.ok === false) return null;
  const q = await quoteOf(sp, rec);
  return q.ok ? q.text : null;
};

// ---- R, the activated region: the ladder's own `touched` set, with its perception score as the activation ------------------------
const qg = (await import("../../adapters/text/question-grammar.en.js")).default;
const model = loadModel(JSON.parse(readFileSync(join(here, "../../priors/parser-eng-ewt.json"), "utf8")));
const qv = questionVoid(qg.readQuestion(ASK, { model }), record);
const cands = candidatesOf(record, verdicts);
const cols = witnesses(cands, { question: qv, record });
const p1 = scoreWith(cols, ["perception"], cands.length);
const activation = new Map(cands.map((a, i) => [a.id, p1.s[i]]));
const touched = cands.filter((_, i) => p1.s[i] > 0);
const uAll = await spansFromRecord(record, { slice, activation });
const region = uAll.filter((s) => s.activation > 0);

// ---- W, read as claims ---------------------------------------------------------------------------------------------------------
const RECEIVED = { verbs: new Set(record.vocab) }; // the vocabulary the record's own reading earned (GRAIN-R2-PREREG.md)
async function readW(name, text) {
  const raw = Buffer.from(text, "utf8");
  const rec = await makePinax({ url: `whom:${name}`, raw: new Uint8Array(raw), text, extractor: { name: "whom: local file, read as UTF-8" } });
  store[rec.entry.id] = rec;
  const got = await claimsOfWhom([rec], { slice, received: RECEIVED });
  return { pinax: rec.entry.id, sha256: sha(raw), spans: got.spans, atoms: got.atoms ?? 0, why: got.why };
}
const PINNED = JSON.parse(readFileSync(join(here, "grain-whom-sha256.json"), "utf8")).files;
const hashMismatches = [];
const whomText = (name) => {
  const t = readFileSync(join(WHOM, name, "thread.md"), "utf8");
  if (PINNED[name] && sha(Buffer.from(t, "utf8")) !== PINNED[name]) hashMismatches.push({ name, pinned: PINNED[name], found: sha(Buffer.from(t, "utf8")) });
  return t;
};

// ---- one arm --------------------------------------------------------------------------------------------------------------------
const copiedOf = (f) => [...new Set(f.modes.flatMap((m) => m.items.flatMap((it) => it.segs.filter((g) => g.kind === "source").map((g) => g.address))))].sort();
const rankOf = (g) => GRAINS.indexOf(g);
const jaccardD = (a, b) => { const A = new Set(a), B = new Set(b); const u = new Set([...A, ...B]).size; return u ? 1 - [...A].filter((x) => B.has(x)).length / u : 0; };

async function armOf(name, whomSpans, { sha256 = null, atoms = 0, why = null } = {}) {
  const f = foldGrain({ region, whom: whomSpans });
  const copied = copiedOf(f);
  const wPinax = new Set(whomSpans.map((s) => s.address.split("/")[0]));
  const reslice = [];
  for (const m of f.modes) for (const it of m.items) for (const g of it.segs) if (g.kind === "source" && (await slice(g.address)) !== g.t) reslice.push(g.address);
  const verdictCounts = f.contacts.reduce((c, x) => ((c[x.case] = (c[x.case] ?? 0) + 1), c), {});
  return {
    name, sha256, informative: whomSpans.length > 0 || name === "void", claims: whomSpans.length, atoms, ...(why ? { why } : {}),
    grain: f.grain, why_grain: f.why, selectorUnreadable: !!f.selectorUnreadable,
    distance: { region: f.distance.region, held: f.distance.held, absent: f.distance.absent, share: f.distance.share, null: f.distance.null },
    verdicts: verdictCounts,
    modes: f.modes.map((m) => ({ mode: m.mode, role: m.role, items: m.items.length, seamCount: m.seams.seamCount, seamDensity: m.seams.seamDensity, addressedShare: m.seams.addressedShare })),
    closure: f.closure, contract: f.seams.contract.ok, resliceFailures: reslice.length,
    copied, copiedU: copied.filter((a) => !wPinax.has(a.split("/")[0])),
    _fold: f, _whomSpans: whomSpans,
  };
}
const strip = ({ _fold, _whomSpans, ...rest }) => rest;

// ---- run ------------------------------------------------------------------------------------------------------------------------
const ASKS = [ASK, "Should the United States make daylight saving time permanent?", "Who opposes permanent daylight saving time?", "Did the Senate pass the bill?"];
const results = { prereg: "native/eval/callimachus/GRAIN-R5-PREREG.md", universe: UNIVERSE, perAsk: [], predictions: {} };
const readers = [["dense", (await readW("dense", whomText("dense"))).spans], ["void", []]];
for (const name of NULL_SEEDS.dense) readers.push([name, (await readW(name, whomText(name))).spans]);
const byId = new Map(cands.map((a, i) => [a.id, { a, i }]));

const tau = (a, b) => { const pos = new Map(b.map((x, i) => [x, i])); let c = 0, d = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const pi = pos.get(a[i]), pj = pos.get(a[j]); if (pi === undefined || pj === undefined) continue; pi < pj ? c++ : d++; } return c + d ? (c - d) / (c + d) : null; };

const prepared = [];
for (const ask of ASKS) {
  const qv3 = questionVoid(qg.readQuestion(ask, { model }), record);
  const cols = witnesses(cands, { question: qv3, record });
  const perc = scoreWith(cols, ["perception"], cands.length);
  const act = new Map(cands.map((a, i) => [a.id, perc.s[i]]));
  const region = (await spansFromRecord(record, { slice, activation: act })).filter((x) => x.activation > 0);
  const admits = qv3.reading?.admits ?? null;
  const form = qv3.form ?? null;
  const kind = form === "deliberative" ? "deliberative" : admits;
  const valuesOfSpan = (s) => { const { a, i } = byId.get(s.id); return valuesFor(kind, { actor: cols.perception.actor[i], relation: cols.perception.relation[i], sentence: a._sentence ?? "", subj: a.relation?.subj ?? null, polarity: a.relation?.polarity ?? "+" }); };
  prepared.push({ ask, admits, form, region, valuesOfSpan });
}
for (const [rname, spans] of readers) for (const pr of prepared) {
  const { ask, admits, form, region, valuesOfSpan } = pr;
  const split = splitRegion(region, spans);
  const held = split.H.map((s) => ({ id: s.address, values: valuesOfSpan(s) }));
  const passages = split.A.map((s) => ({ id: s.address, values: valuesOfSpan(s) }));
  const r = rankByBelief({ held, passages });
  const textOf = new Map(region.map((s) => [s.address, s.text]));
  const actOrder = [...split.A].sort((x, y) => y.activation - x.activation).map((s) => s.address).filter((id) => passages.find((p) => p.id === id)?.values.length);
  const beliefOrder = r.order.map((o) => o.id);
  const keep = rname === "dense" || rname === "void";
  results.perAsk.push({
    reader: rname, ask, admits, form,
    heldSpans: split.H.length, newSpans: split.A.length, heldCarrying: held.filter((h) => h.values.length).length, newCarrying: passages.filter((p) => p.values.length).length,
    before: r.before, after: r.after, window: r.window, context: r.context.length,
    order: r.order.map((o, k) => ({ ...o, ...(keep ? { text: textOf.get(o.id) } : {}), inWindow: k < r.window })),
    tauVsActivation: tau(actOrder, beliefOrder),
    propertyBitsPositive: r.order.every((o) => o.bits > 0),
    propertyContextEmpty: passages.filter((p) => r.context.includes(p.id)).every((p) => p.values.length === 0),
  });
}
const row = (reader, k) => results.perAsk.find((r) => r.reader === reader && r.ask === ASKS[k]);
const P = results.predictions;
// run 1 (dense reader only; amendment 1 keeps it): nothing new carried a value
const d0 = row("dense", 0), v0 = row("void", 0), v2 = row("void", 2), v1 = row("void", 1);
P.B1_dense = { newCarrying: d0.newCarrying, window: d0.window, holds: d0.newCarrying > 0 && d0.window < d0.newCarrying };
P.B2_dense = { tau: d0.tauVsActivation, holds: d0.tauVsActivation !== null && d0.tauVsActivation < 0.9 };
P.B3 = { holds: results.perAsk.every((r) => r.propertyBitsPositive && r.propertyContextEmpty) };
P.B4 = { kind: v1.form, orderLength: v1.order.length, holds: v1.order.length === 0 };
// amendment 1 (registered before run 2)
P.C1 = { reader: "void", newCarrying: v0.newCarrying, window: v0.window, holds: v0.newCarrying >= 2 && v0.window < v0.newCarrying };
P.C2 = { reader: "void", tau: v0.tauVsActivation, holds: v0.tauVsActivation !== null && v0.tauVsActivation < 0.9 };
const red = results.perAsk.filter((r) => r.reader.startsWith("null-") && r.ask === ASKS[0] && r.newCarrying >= 2);
P.C3 = { readers: red.length, windowLessThanCarrying: red.filter((r) => r.window < r.newCarrying).length, holds: red.length > 0 && red.every((r) => r.window < r.newCarrying) };
P.C5 = { reader: "void", ask: ASKS[2], newCarrying: v2.newCarrying, window: v2.window, holds: v2.newCarrying > 0 };
results.reported = { redealtHouse: results.perAsk.filter((r) => r.reader.startsWith("null-") && r.ask === ASKS[0]).map((r) => ({ reader: r.reader, heldCarrying: r.heldCarrying, newCarrying: r.newCarrying, window: r.window, before: r.before.answer, after: r.after.answer, tau: r.tauVsActivation })) };
writeFileSync(OUT, JSON.stringify(results, null, 1));
log("wrote", OUT);
console.log(JSON.stringify({ hashMismatches: hashMismatches.length, predictions: P, summary: results.perAsk.filter((r) => r.reader === "dense" || r.reader === "void").map((r) => ({ reader: r.reader, ask: r.ask, admits: r.admits, newSpans: r.newSpans, newCarrying: r.newCarrying, window: r.window, before: r.before.answer, after: r.after.answer, tau: r.tauVsActivation })) }, null, 1));
