#!/usr/bin/env node
// eval/callimachus/grain-arms.mjs — the grain experiment, exactly as pre-registered in GRAIN-PREREG.md (ratified first).
//
//   node native/eval/callimachus/grain-arms.mjs --universe <pinned run dir> --whom <twin-reader whom dir> --out <results.json>
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
import { foldGrain, spansFromRecord, arrangementOf, GRAINS } from "../../organs/grain.js";
import { claimsOfWhom } from "../../organs/holdings.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const UNIVERSE = opt("--universe") && resolve(opt("--universe"));
const WHOM = opt("--whom") && resolve(opt("--whom"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!UNIVERSE || !WHOM || !OUT) { console.error("usage: grain-arms.mjs --universe <dir> --whom <dir> --out <results.json>"); process.exit(2); }

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
async function readW(name, text) {
  const raw = Buffer.from(text, "utf8");
  const rec = await makePinax({ url: `whom:${name}`, raw: new Uint8Array(raw), text, extractor: { name: "whom: local file, read as UTF-8" } });
  store[rec.entry.id] = rec;
  const got = await claimsOfWhom([rec], { slice });
  return { pinax: rec.entry.id, sha256: sha(raw), spans: got.spans, atoms: got.atoms ?? 0, why: got.why };
}
const whomText = (name) => readFileSync(join(WHOM, name, "thread.md"), "utf8");

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
const results = { prereg: "native/eval/callimachus/GRAIN-PREREG.md", universe: UNIVERSE, ask: ASK, region: { atoms: record.atoms.length, candidates: cands.length, touched: touched.length, spans: region.length }, arms: {}, predictions: {} };
log(`R: ${touched.length} touched candidates, ${region.length} with a readable claim`);

const arms = {};
arms.void = await armOf("void", []);
for (const name of ["dense", "B"]) {
  const w = await readW(name, whomText(name));
  arms[name] = await armOf(name, w.spans, { sha256: w.sha256, atoms: w.atoms, why: w.why });
  if (PREREG_SHA[name] && w.sha256 !== PREREG_SHA[name]) arms[name].shaMismatch = { registered: PREREG_SHA[name], found: w.sha256 };
}
// determinism (G6): dense, again, from the same bytes
const denseAgain = await armOf("dense", (await readW("dense-again", whomText("dense"))).spans);
// re-dealt nulls
const nulls = { dense: [], B: [] };
for (const kind of ["dense", "B"]) for (const name of NULL_SEEDS[kind]) {
  if (!existsSync(join(WHOM, name, "thread.md"))) { nulls[kind].push({ name, missing: true }); continue; }
  const w = await readW(name, whomText(name));
  nulls[kind].push(await armOf(name, w.spans, { sha256: w.sha256, atoms: w.atoms }));
}
// the accumulating chain: W_{k+1} = W_k plus the copied bytes of the fold at step k, one block per addressed span, in output order
const chain = [{ k: 0, w: "∅", ...strip(arms.void) }];
let blocks = [];
let prev = arms.void;
for (let k = 1; k <= CHAIN_MAX; k++) {
  const seen = new Set(blocks.map((b) => b.at));
  for (const m of prev._fold.modes) for (const it of m.items) for (const g of it.segs) if (g.kind === "source" && !seen.has(g.address)) { seen.add(g.address); blocks.push({ at: g.address, text: g.t }); }
  const w = await readW(`chain-${k}`, blocks.map((b) => b.text.replace(/\n\s*\n/g, "\n")).join("\n\n") + "\n");
  const cur = await armOf(`chain-${k}`, w.spans, { sha256: w.sha256, atoms: w.atoms, why: w.why });
  chain.push({ k, w: `${blocks.length} blocks`, ...strip(cur) });
  const same = JSON.stringify(cur.copied) === JSON.stringify(prev.copied);
  prev = cur;
  if (same) break;
}

// ---- the predictions, computed ----------------------------------------------------------------------------------------------------
const voidSet = arms.void.copied;
const dOf = (a) => jaccardD(a.copied, voidSet);
const dUOf = (a) => jaccardD(a.copiedU, arms.void.copiedU);
const nullD = (kind) => nulls[kind].filter((n) => !n.missing && n.informative).map(dOf);
const beats = (d, ds) => ({ d, nullMax: ds.length ? Math.max(...ds) : null, beats: ds.filter((x) => d > x).length, of: ds.length, all: ds.length > 0 && ds.every((x) => d > x) });
const P = results.predictions;
const v = arms.void;
const clearing = v.modes.find((m) => m.mode === "Clearing");
P.G1 = { holds: v.grain === "Ground" && clearing.seamCount === 0 && (clearing.items === 0 || clearing.addressedShare === 1) && v.closure.closed };
const dn = arms.dense, bn = arms.B;
const dNulls = nullD("dense");
P.G2 = dn.claims === 0
  ? { uninformative: "dense W admitted no claim" }
  : dNulls.length === 0
    ? { uninformative: "no re-dealt null was found under --whom" }
    : (() => { const b = beats(dOf(dn), dNulls); return { grain: dn.grain, nullReal: dn.distance.null.real, movement: b, holds: dn.distance.null.real && ["Figure", "Pattern"].includes(dn.grain) && b.all }; })();
P.G3 = bn.claims === 0
  ? { uninformative: "B's W admitted no claim" }
  : (() => {
      // Making's items are [anchor (held), new (absent)] or [new]; the new span is the LAST address. It must not be on an arrangement B holds.
            const heldByB = new Set(bn._whomSpans.map((s) => arrangementOf(s)).filter(Boolean));
      const byAddr = new Map(region.map((s) => [s.address, s]));
      const making = bn._fold.modes.find((m) => m.mode === "Making");
      const news = (making?.items ?? []).map((it) => byAddr.get(it.spans[it.spans.length - 1])).filter(Boolean);
      const leaked = news.filter((s) => heldByB.has(arrangementOf(s))).map((s) => s.address);
      return { grain: bn.grain, makingItems: making?.items.length ?? 0, leaked, holds: bn.grain === "Figure" && leaked.length === 0 };
    })();
const chainGrains = chain.map((c) => c.grain);
const monotone = chainGrains.every((g, i) => i === 0 || rankOf(g) >= rankOf(chainGrains[i - 1]));
const sets = chain.map((c) => JSON.stringify(c.copied));
const twoCycle = sets.some((s, i) => i >= 2 && s === sets[i - 2] && s !== sets[i - 1]);
const stopped = chain.length > 1 && sets[sets.length - 1] === sets[sets.length - 2];
P.G4 = { grains: chainGrains, steps: chain.length - 1, monotone, twoCycle, stopped, holds: monotone && !twoCycle && stopped };
const informativeFolds = [arms.void, arms.dense, arms.B, ...chain.slice(1)].filter((a) => a.informative);
P.G5 = { checked: informativeFolds.length, holds: informativeFolds.every((a) => a.contract && a.closure.closed && a.closure.mouthConfined && a.resliceFailures === 0), failures: informativeFolds.filter((a) => !(a.contract && a.closure.closed && a.closure.mouthConfined && a.resliceFailures === 0)).map((a) => a.name) };
const whole = (a) => JSON.stringify({ ...strip(a), name: null, sha256: null, informative: null });
P.G6 = { holds: whole(arms.dense) === whole(denseAgain) };
const unread = informativeFolds.filter((a) => a.claims > 0 && Object.keys(a.verdicts).length > 0 && Object.keys(a.verdicts).every((c) => c === "UNDETERMINED"));
P.G7 = unread.length ? { arms: unread.map((a) => a.name), holds: unread.every((a) => a.grain === "Ground" && a.selectorUnreadable) } : { uninformative: "no informative arm had all-UNDETERMINED contacts, so the fallback was not exercised" };

results.arms = Object.fromEntries(Object.entries(arms).map(([k, a]) => [k, strip(a)]));
results.chain = chain;
results.nulls = Object.fromEntries(Object.entries(nulls).map(([k, ns]) => [k, ns.map((n) => (n.missing ? n : { name: n.name, claims: n.claims, grain: n.grain, d: dOf(n), dU: dUOf(n) }))]));
// reported, not predicted
results.reported = {
  movementUOnly: { dense: dUOf(arms.dense), B: dUOf(arms.B), note: "U-side copied addresses only; the registered measure (above) includes W-side addresses" },
  nullPower: Object.fromEntries(Object.entries(arms).map(([k, a]) => [k, { exceeded: a.distance.null.exceeded, p: a.distance.null.p, mean: a.distance.null.mean, permutations: a.distance.null.permutations }])),
};
writeFileSync(OUT, JSON.stringify(results, null, 1));
log("wrote", OUT);
console.log(JSON.stringify({ predictions: P, grains: { void: arms.void.grain, dense: arms.dense.grain, B: arms.B.grain, chain: chainGrains } }, null, 1));
