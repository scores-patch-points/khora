#!/usr/bin/env node
// eval/callimachus/grain-arms-r3.mjs — the third registration (GRAIN-R3-PREREG.md): the second registration's runner, recomputed as a regression,
// plus a per-ask block that checks the new is never left unshown. COMMITTED BEFORE IT IS RUN, and not edited after.
//
//   node native/eval/callimachus/grain-arms-r3.mjs --universe <pinned run dir> --whom <twin-reader whom dir> --out <results.json>
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
if (!UNIVERSE || !WHOM || !OUT) { console.error("usage: grain-arms-r3.mjs --universe <dir> --whom <dir> --out <results.json>"); process.exit(2); }

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
const results = { prereg: "native/eval/callimachus/GRAIN-R3-PREREG.md (and GRAIN-R2-PREREG.md, recomputed)", universe: UNIVERSE, ask: ASK, reader: { received: "record.vocab", verbs: RECEIVED.verbs.size }, region: { atoms: record.atoms.length, candidates: cands.length, touched: touched.length, spans: region.length }, arms: {}, predictions: {} };
log(`R: ${touched.length} touched candidates, ${region.length} with a readable claim; reader vocabulary ${RECEIVED.verbs.size} verbs`);

const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffleWords = (b, rnd) => { const w = b.split(/\s+/).filter(Boolean); for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } return w.join(" "); };
const blocksOf = (t) => t.split(/\n\s*\n/).map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);

const arms = {};
arms.void = await armOf("void", []);
{
  const w = await readW("dense", whomText("dense")); arms.dense = await armOf("dense", w.spans, { sha256: w.sha256, atoms: w.atoms, why: w.why });
  const b = await readW("B", whomText("B")); arms.B = await armOf("B", b.spans, { sha256: b.sha256, atoms: b.atoms, why: b.why });
  const shownBlocks = region.map((s) => s.text.replace(/\s+/g, " ").trim());
  const sh = await readW("shown", shownBlocks.join("\n\n") + "\n"); arms.shown = await armOf("shown", sh.spans, { sha256: sh.sha256, atoms: sh.atoms, why: sh.why });
  arms._shownBlocks = shownBlocks;
}
const shownBlocks = arms._shownBlocks; delete arms._shownBlocks;
const dAgain = await readW("dense", whomText("dense"));
const denseAgain = await armOf("dense", dAgain.spans, { sha256: dAgain.sha256, atoms: dAgain.atoms, why: dAgain.why });

// the re-dealt readers (twin-reader's files, byte for byte), read by the same reader
const nulls = { dense: [], B: [] };
for (const kind of ["dense", "B"]) for (const name of NULL_SEEDS[kind]) {
  if (!existsSync(join(WHOM, name, "thread.md"))) { nulls[kind].push({ name, missing: true }); continue; }
  const w = await readW(name, whomText(name));
  nulls[kind].push(await armOf(name, w.spans, { sha256: w.sha256, atoms: w.atoms }));
}

// the accumulating chain
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

// calibration of the SELECTOR: the record's pages word-shuffled, folded against dense (G8 of the first registration, again)
const SHUFFLE_U_SEEDS = Array.from({ length: 19 }, (_, i) => 201 + i);
const shuffledU = [];
for (const seed of SHUFFLE_U_SEEDS) {
  const recs = [];
  for (let i = 0; i < prior.sources.length; i++) {
    const s0 = prior.sources[i];
    const rnd = mulberry(seed * 1000 + i);
    const text = readFileSync(join(UNIVERSE, "layers", `${s0.id}.txt`), "utf8").split(/\n\s*\n/).map((p) => shuffleWords(p, rnd)).join("\n\n");
    const rec = await makePinax({ url: `${s0.url}#shuffled-${seed}`, raw: new Uint8Array(Buffer.from(text, "utf8")), text, extractor: { name: "word-shuffled control (paragraph-wise, seeded)" } });
    rec.declared = s0.declared;
    store[rec.entry.id] = rec;
    recs.push(rec);
  }
  const rec2 = readCorpus(recs, { question: prior.question, absences: [] });
  const qv2 = questionVoid(qg.readQuestion(ASK, { model }), rec2);
  const c2 = candidatesOf(rec2, {});
  const s2 = scoreWith(witnesses(c2, { question: qv2, record: rec2 }), ["perception"], c2.length);
  const act2 = new Map(c2.map((a, i) => [a.id, s2.s[i]]));
  const region2 = (await spansFromRecord(rec2, { slice, activation: act2 })).filter((x) => x.activation > 0);
  const f = foldGrain({ region: region2, whom: arms.dense._whomSpans });
  shuffledU.push({ seed, atoms: rec2.atoms.length, regionSpans: region2.length, grain: f.grain, held: f.distance.held, nullReal: f.distance.null.real });
}

// calibration of the READER: the W itself word-shuffled, read by the same reader, folded against the real record
const SHUFFLE_W_SEEDS = Array.from({ length: 19 }, (_, i) => 401 + i);
const shuffledW = { shown: [], dense: [] };
for (const [kind, blks] of [["shown", shownBlocks], ["dense", blocksOf(whomText("dense"))]]) {
  for (const seed of SHUFFLE_W_SEEDS) {
    const rnd = mulberry(seed);
    const w = await readW(`shuf-${kind}-${seed}`, blks.map((b) => shuffleWords(b, rnd)).join("\n\n") + "\n");
    const a = await armOf(`shuf-${kind}-${seed}`, w.spans);
    shuffledW[kind].push({ seed, claims: a.claims, grain: a.grain, held: a.distance.held, nullReal: a.distance.null.real });
  }
}

// ---- the predictions, computed ----------------------------------------------------------------------------------------------------
const P = results.predictions;
const clearing = arms.void.modes.find((m) => m.mode === "Clearing");
P.N1 = { holds: arms.void.grain === "Ground" && clearing.seamCount === 0 && arms.void.closure.closed };
P.N2 = arms.shown.claims === 0 ? { uninformative: "shown W admitted no claim" } : { claims: arms.shown.claims, held: arms.shown.distance.held, absent: arms.shown.distance.absent, nullReal: arms.shown.distance.null.real, grain: arms.shown.grain, holds: arms.shown.distance.null.real && arms.shown.grain === "Pattern" };
P.N3 = arms.shown.claims === 0 ? { uninformative: "shown W admitted no claim" } : (() => {
  const g = shuffledW.shown.filter((x) => x.grain === "Ground").length;
  const lower = shuffledW.shown.every((x) => x.held < arms.shown.distance.held);
  return { shuffled: shuffledW.shown.length, ground: g, heldBelowReal: lower, claims: { min: Math.min(...shuffledW.shown.map((x) => x.claims)), max: Math.max(...shuffledW.shown.map((x) => x.claims)) }, heldMax: Math.max(...shuffledW.shown.map((x) => x.held)), holds: g >= 18 && lower };
})();
const heldNull = nulls.dense.filter((n) => !n.missing).map((n) => n.distance.held);
P.N4 = arms.dense.claims === 0 ? { uninformative: "dense W admitted no claim" } : { grain: arms.dense.grain, nullReal: arms.dense.distance.null.real, held: arms.dense.distance.held, redealtMaxHeld: heldNull.length ? Math.max(...heldNull) : null, redealt: heldNull.length, holds: arms.dense.distance.null.real && ["Figure", "Pattern"].includes(arms.dense.grain) && heldNull.length > 0 && arms.dense.distance.held > Math.max(...heldNull) };
P.N5 = arms.B.claims === 0 ? { uninformative: "B's W admitted no claim" } : (() => {
  const heldByB = new Set(arms.B._whomSpans.map((s) => arrangementOf(s)).filter(Boolean));
  const byAddr = new Map(region.map((s) => [s.address, s]));
  const making = arms.B._fold.modes.find((m) => m.mode === "Making");
  const news = (making?.items ?? []).map((it) => byAddr.get(it.spans[it.spans.length - 1])).filter(Boolean);
  const leaked = news.filter((s) => heldByB.has(arrangementOf(s))).map((s) => s.address);
  return { claims: arms.B.claims, held: arms.B.distance.held, nullReal: arms.B.distance.null.real, grain: arms.B.grain, makingItems: making?.items.length ?? 0, leaked, holds: arms.B.distance.null.real && arms.B.grain === "Figure" && leaked.length === 0 };
})();
const grains = chain.map((c) => c.grain);
const sets = chain.map((c) => JSON.stringify(c.copied));
const monotone = grains.every((g, i) => i === 0 || rankOf(g) >= rankOf(grains[i - 1]));
const twoCycle = sets.some((s, i) => i >= 2 && s === sets[i - 2] && s !== sets[i - 1]);
const stopped = chain.length > 1 && sets[sets.length - 1] === sets[sets.length - 2];
P.N6 = { grains, steps: chain.length - 1, monotone, twoCycle, stopped, holds: monotone && !twoCycle && stopped };
P.N7 = { seeds: shuffledU.length, withRegion: shuffledU.filter((c) => c.regionSpans > 0).length, nonGround: shuffledU.filter((c) => c.grain !== "Ground").length, nullReal: shuffledU.filter((c) => c.nullReal).length, holds: shuffledU.filter((c) => c.grain !== "Ground").length <= 1 };
const FOLD_FIELDS = ["grain", "why_grain", "selectorUnreadable", "distance", "verdicts", "modes", "closure", "contract", "resliceFailures", "copied", "copiedU", "claims"];
const foldOf = (a) => JSON.stringify(Object.fromEntries(FOLD_FIELDS.map((k) => [k, a[k]])));
const d1 = strip(arms.dense), d2 = strip(denseAgain);
P.N8 = { holds: foldOf(arms.dense) === foldOf(denseAgain), differingFieldsBetweenRuns: [...new Set([...Object.keys(d1), ...Object.keys(d2)])].filter((k) => JSON.stringify(d1[k]) !== JSON.stringify(d2[k])).sort() };
const informative = [arms.void, arms.dense, ...(arms.B.claims > 0 ? [arms.B] : []), arms.shown, ...chain.slice(1)].filter((a) => a.informative);
const ok = (a) => a.contract && a.closure.closed && a.closure.mouthConfined && a.resliceFailures === 0;
P.N9 = { checked: informative.length, holds: informative.every(ok), failures: informative.filter((a) => !ok(a)).map((a) => a.name) };

// ---- third registration: the new is never left unshown (GRAIN-R3-PREREG.md) -------------------------------------------------------
const ASKS = [ASK, "Should the United States make daylight saving time permanent?", "Who opposes permanent daylight saving time?", "Did the Senate pass the bill?"];
const regionFor = async (ask) => {
  const qv3 = questionVoid(qg.readQuestion(ask, { model }), record);
  const sc = scoreWith(witnesses(cands, { question: qv3, record }), ["perception"], cands.length);
  const act = new Map(cands.map((a, i) => [a.id, sc.s[i]]));
  return (await spansFromRecord(record, { slice, activation: act })).filter((x) => x.activation > 0);
};
const normText = (t) => String(t).normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
const READERS3 = [["void", []], ["dense", arms.dense._whomSpans], ["B", arms.B._whomSpans], ["shown", arms.shown._whomSpans], ...nulls.dense.filter((n) => !n.missing).map((n) => [n.name, n._whomSpans])];
const shownBeyondClearing = (f) => new Set(f.modes.filter((m) => m.mode !== "Clearing").flatMap((m) => m.items.flatMap((i) => i.spans)));
const perAsk = [];
const m1Fail = [], m2Fail = [], m3Fail = [];
let forcedChecked = 0;
for (const ask of ASKS) {
  const regionA = await regionFor(ask);
  for (const [rname, spans] of READERS3) {
    const wKeys = new Set(spans.map((x) => arrangementOf(x)).filter(Boolean));
    const absent = regionA.filter((u) => { const k = arrangementOf(u); return !(k && wKeys.has(k)); }).map((u) => u.address);
    const f = foldGrain({ region: regionA, whom: spans });
    const shown = shownBeyondClearing(f);
    const missing = absent.filter((a) => !shown.has(a));
    if (missing.length) m1Fail.push({ ask, reader: rname, grain: f.grain, missing: missing.length });
    let forcedOk = null;
    if (f.grain === "Figure" || f.grain === "Pattern") {
      forcedOk = {};
      for (const g of ["Figure", "Pattern"]) {
        const ff = foldGrain({ region: regionA, whom: spans, forceGrain: g });
        const sh = shownBeyondClearing(ff);
        const miss = absent.filter((a) => !sh.has(a));
        forcedChecked++;
        forcedOk[g] = miss.length === 0;
        if (miss.length) m2Fail.push({ ask, reader: rname, forced: g, missing: miss.length });
      }
    }
    const tr = f.modes.find((m) => m.mode === "Tracing");
    let echoes = 0, chains = 0;
    if (tr) for (const it of tr.items) {
      const srcs = it.segs.filter((g) => g.kind === "source");
      const echoExpected = it.hops === 1 && srcs.length === 2 && normText(srcs[0].t) === normText(srcs[1].t);
      if (it.echo !== echoExpected || it.hops !== it.spans.length - 1) m3Fail.push({ ask, reader: rname, hops: it.hops, echo: it.echo });
      if (it.echo) echoes++; else chains++;
    }
    const comp = f.modes.find((m) => m.mode === "Composing");
    perAsk.push({ ask, reader: rname, grain: f.grain, held: f.distance.held, absent: f.distance.absent, margin: f.distance.margin, echoes, chains, newEdges: comp ? comp.items.filter((i) => !i.unrelated).length : null, unrelatedNew: comp ? comp.items.filter((i) => i.unrelated).length : null, absentShown: absent.length - missing.length, absentTotal: absent.length, forcedOk });
  }
}
P.M1 = { checked: perAsk.length, failures: m1Fail, holds: m1Fail.length === 0 };
P.M2 = { forcedFoldsChecked: forcedChecked, failures: m2Fail, holds: m2Fail.length === 0 && forcedChecked > 0 };
P.M3 = { patternFoldsWithTracing: perAsk.filter((x) => x.echoes + x.chains > 0).length, failures: m3Fail, holds: m3Fail.length === 0 };
const prevPath = join(dirname(UNIVERSE), "grain-r2-2026-10-14", "results.json");
const r2 = JSON.parse(readFileSync(prevPath, "utf8"));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const m4 = {
  voidCopied: same(strip(arms.void).copied, r2.arms.void.copied),
  selection: ["dense", "B", "shown"].map((k) => ({ k, same: arms[k].grain === prev.arms[k].grain && arms[k].distance.held === prev.arms[k].distance.held && arms[k].distance.absent === prev.arms[k].distance.absent })),
  shuffledWGround: shuffledW.shown.filter((x) => x.grain === "Ground").length,
  shuffledUNonGround: shuffledU.filter((c) => c.grain !== "Ground").length,
  determinism: P.N8.holds,
};
P.M4 = { ...m4, previous: prevPath, holds: m4.voidCopied && m4.selection.every((x) => x.same) && m4.shuffledWGround === 19 && m4.shuffledUNonGround <= 1 && m4.determinism };
results.perAsk = perAsk;

// reported, not predicted
results.hashes = { pinned: Object.keys(PINNED).length, mismatches: hashMismatches };
results.arms = Object.fromEntries(Object.entries(arms).map(([k, a]) => [k, strip(a)]));
results.chain = chain;
results.nulls = Object.fromEntries(Object.entries(nulls).map(([k, ns]) => [k, ns.map((n) => (n.missing ? n : { name: n.name, claims: n.claims, grain: n.grain, held: n.distance.held, nullReal: n.distance.null.real }))]));
results.shuffledU = shuffledU;
results.shuffledW = shuffledW;
writeFileSync(OUT, JSON.stringify(results, null, 1));

// the side-by-side: what each reader is shown for the ask
const demo = [`# What each reader is shown\n`, `Ask: ${ASK}\n`, `Universe: ${prior.question}\n`];
for (const [label, a] of [["void (nobody)", arms.void], ["dense (holds the House/Senate material)", arms.dense], ["B (holds the void fold's own sentences)", arms.B], ["shown (holds exactly what Clearing displayed)", arms.shown]]) {
  demo.push(`\n## ${label}\n`, `W admitted ${a.claims} claims. Held ${a.distance.held} of ${a.distance.region} spans of the region; absent ${a.distance.absent}. Grain: **${a.grain}**. ${a.why_grain}\n`);
  for (const m of a._fold.modes) {
    if (m.mode === "Clearing") { demo.push(`- **${m.mode}** (${m.stance.mode}): ${m.items.length} spans, ${m.seams.seamCount} seams. Not listed here: the whole region, in activation order.\n`); continue; }
    demo.push(`- **${m.mode}** (${m.stance.mode}): ${m.items.length} items, ${m.seams.seamCount} seams${m.items.length ? "" : " — nothing for this reader"}\n`);
    for (const it of m.items.slice(0, 4)) demo.push(`  - ${it.text.replace(/\n/g, "  ⟷  ")}\n    \`${it.spans.join(" | ")}\`\n`);
    if (m.items.length > 4) demo.push(`  - … and ${m.items.length - 4} more\n`);
  }
}
writeFileSync(OUT.replace(/\.json$/, ".demo.md"), demo.join("\n"));
log("wrote", OUT);
console.log(JSON.stringify({ hashMismatches: hashMismatches.length, predictions: P }, null, 1));
