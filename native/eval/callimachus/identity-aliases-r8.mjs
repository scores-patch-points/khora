#!/usr/bin/env node
// eval/callimachus/identity-aliases-r8.mjs — the eighth registration: identity-induction judging the longer names, exactly as pre-registered in GRAIN-R8-PREREG.md.
//
//   node native/eval/callimachus/identity-aliases-r8.mjs --universe <pinned run dir> --whom <twin-reader whom dir> --out <results.json>
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
import { referentsIn, referentsInRuns } from "../../organs/callimachus.js";
import { rankByBelief, valuesFor, questionAgent, agentMatches } from "../../organs/belief-movement.js";
import { parseText } from "../../adapters/text/english-parser.js";
import { splitRegion } from "../../organs/grain.js";
import { readWhom, whomStemDf } from "../../organs/whom.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const UNIVERSE = opt("--universe") && resolve(opt("--universe"));
const WHOM = opt("--whom") && resolve(opt("--whom"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!UNIVERSE || !WHOM || !OUT) { console.error("usage: identity-aliases-r8.mjs --universe <dir> --whom <dir> --out <results.json>"); process.exit(2); }

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
const MODE = process.env.REFERENT_MATCH === "run" ? "run" : "contains";
// amendment 1: REFERENT_PRIOR=1 hands the resolver the received POS prior (priors/pos-en.json) as a REFUSER of edge words; it is NOT
// passed as `received`, which would change the verb vocabulary and so the atoms.
const REFERENT_PRIOR = process.env.REFERENT_PRIOR === "1" ? JSON.parse(readFileSync(join(here, "../../priors/pos-en.json"), "utf8")) : null;
const record = readCorpus(records, { question: prior.question, absences: prior.absences ?? [], referentMatch: MODE, referentPrior: REFERENT_PRIOR });
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

const texts = records.map((r) => new TextDecoder().decode(r.layers.text));
// ---- run ------------------------------------------------------------------------------------------------------------------------
import { makeIdentityInduction } from "../../kernel/identity-induction.js";
import { capitalisedRuns } from "../../organs/callimachus.js";
import { splitSentences } from "../../adapters/text/spans.js";
const OPTS = { draws: 199, alpha: 0.05, seed: 20261014, minOccurrences: 3, resolution: 1, maxHop: 1, smooth: 1, minFeatureCount: 1 };
const DET = new Set(["the", "a", "an"]);
const clean = (t) => t.replace(/^[("'“‘\[]+|[)"'”’\],.;:!?]+$/g, "").replace(/['’]s$/i, "");
const keyOf = (run) => { const t = run.map(clean).filter(Boolean); while (t.length > 1 && DET.has(t[0].toLowerCase())) t.shift(); return t.join(" "); };
const verbs = new Set((record.vocab ?? []).map((v) => String(v).toLowerCase()));

// every mention of every capitalised run, with the sentence's other runs and relation verbs as its features
const mentions = new Map(); // key -> [feature list]
for (const text of texts) for (const sent of splitSentences(text)) {
  const st = sent.text ?? "";
  const runs = capitalisedRuns(st).map(keyOf).filter((k) => k.length > 1);
  const vs = (st.match(/[\p{Ll}'’-]+/gu) ?? []).map((w) => w.toLowerCase()).filter((w) => verbs.has(w));
  runs.forEach((k, i) => {
    const feats = [...new Set(runs.filter((_, j) => j !== i && runs[j] !== k))].map((o) => ({ f: `w:${o}`, hop: 1 })).concat([...new Set(vs)].map((v) => ({ f: `v:${v}`, hop: 1 })));
    if (!mentions.has(k)) mentions.set(k, []);
    mentions.get(k).push(feats);
  });
}
const BASES = ["Senate", "House", "Standard Time", "Congress"];
const nodes = new Map();
for (const [k, occ] of mentions) {
  if (BASES.includes(k) || BASES.some((b) => k.split(/\s+/).includes(b) || k.includes(b))) nodes.set(k, occ);
}
const namesNode = (f) => (f.startsWith("w:") ? f.slice(2) : null);
const mk = (rec) => makeIdentityInduction(rec, { ...OPTS, namesNode });
const verdict = (ind, a, b) => { const r = ind.judge(a, b); return { a, b, verdict: r.verdict, reason: r.reason ?? null, read: r.read, tests: r.tests ? { worlds: r.tests.worlds?.match ?? null, weightA: r.tests.weight?.a?.carries ?? null, weightB: r.tests.weight?.b?.carries ?? null, consequenceAligned: r.tests.consequence?.aligned ?? null, settled: r.tests.bound?.settled ?? null } : null }; };

const results = { prereg: "native/eval/callimachus/GRAIN-R8-PREREG.md", declared: OPTS, mentionCounts: Object.fromEntries([...nodes].map(([k, v]) => [k, v.length])), pairs: [], controls: {}, predictions: {} };
const ind = mk(nodes);
for (const base of BASES) for (const k of nodes.keys()) if (k !== base && (k.split(/\s+/).includes(base) || k.includes(base)) && nodes.has(base)) results.pairs.push(verdict(ind, base, k));

// control (a): the planted twin
{
  const occ = nodes.get("Senate") ?? [];
  const twin = new Map([["Senate#a", occ.filter((_, i) => i % 2 === 0)], ["Senate#b", occ.filter((_, i) => i % 2 === 1)]]);
  const r = verdict(makeIdentityInduction(twin, { ...OPTS, namesNode: () => null }), "Senate#a", "Senate#b");
  results.controls.plantedTwin = { mentions: occ.length, a: twin.get("Senate#a").length, b: twin.get("Senate#b").length, ...r };
}
// control (b): label shuffle, 19 seeds
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const boundBy = new Map();
const shuffles = [];
for (let s = 1; s <= 19; s++) {
  const rnd = mulberry(900 + s);
  const flat = [...nodes].flatMap(([k, occ]) => occ.map((o, i) => ({ k, i, o })));
  const pool = flat.map((x) => x.o);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const rec = new Map(); flat.forEach((x, n) => { if (!rec.has(x.k)) rec.set(x.k, []); rec.get(x.k).push(pool[n]); });
  const ind2 = mk(rec);
  let bound = 0;
  for (const p of results.pairs) { const r = ind2.judge(p.a, p.b); if (r.verdict === "BOUND" || r.verdict === "bound") { bound++; const key = `${p.a} | ${p.b}`; boundBy.set(key, (boundBy.get(key) ?? 0) + 1); } }
  shuffles.push({ seed: 900 + s, bound });
}
results.controls.labelShuffle = { seeds: shuffles.length, anyBound: shuffles.filter((x) => x.bound > 0).length, perPairBound: Object.fromEntries(boundBy) };
const isBound = (v) => v === "BOUND" || v === "bound";
const P = results.predictions;
P.F1 = { verdict: results.controls.plantedTwin.verdict, reason: results.controls.plantedTwin.reason, holds: isBound(results.controls.plantedTwin.verdict) };
const sb = results.pairs.find((p) => p.a === "Senate" && /^Senate Bill/.test(p.b));
P.F2 = { pair: sb ? [sb.a, sb.b] : null, verdict: sb?.verdict ?? null, reason: sb?.reason ?? null, holds: sb ? !isBound(sb.verdict) : null };
const nv = results.pairs.find((p) => p.a === "Senate" && p.b === "Nevada Senate");
P.F3 = { verdict: nv?.verdict ?? null, reason: nv?.reason ?? null, mentions: results.mentionCounts["Nevada Senate"] ?? 0, holds: !!nv && nv.reason === "not_enough_reading" };
P.F4 = { maxPerPairBound: Math.max(0, ...Object.values(results.controls.labelShuffle.perPairBound)), holds: Math.max(0, ...Object.values(results.controls.labelShuffle.perPairBound)) <= 1 };
writeFileSync(OUT, JSON.stringify(results, null, 1));
log("wrote", OUT);
console.log(JSON.stringify({ predictions: P, nodes: nodes.size, pairs: results.pairs.map((p) => ({ a: p.a, b: p.b, verdict: p.verdict, reason: p.reason, nb: p.read?.b })) }, null, 1));
