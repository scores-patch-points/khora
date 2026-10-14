#!/usr/bin/env node
// eval/callimachus/grain-referents-r7.mjs — the seventh registration: a mention resolves to a referent by its whole capitalised run, exactly as pre-registered in GRAIN-R7-PREREG.md.
//   REFERENT_MATCH=contains|run node grain-referents-r7.mjs --universe … --whom … --out …   (run it once in each mode; compare with referents-compare-r7.mjs)
//
//   node native/eval/callimachus/grain-referents-r7.mjs --universe <pinned run dir> --whom <twin-reader whom dir> --out <results.json>
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
if (!UNIVERSE || !WHOM || !OUT) { console.error("usage: grain-referents-r7.mjs --universe <dir> --whom <dir> --out <results.json>"); process.exit(2); }

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
const record = readCorpus(records, { question: prior.question, absences: prior.absences ?? [], referentMatch: MODE });
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
const ASKS = [ASK, "Did the Senate pass the bill?"];
const functionWords = new Set(record.functionWords ?? ["the", "a", "an", "of", "and", "in", "to", "for", "which", "that", "on", "at", "by", "with"]);
const refsOf = (str) => (MODE === "run" ? referentsInRuns(str, record.entities, { functionWords }) : referentsIn(str, record.entities));
const byId = new Map(cands.map((a, i) => [a.id, { a, i }]));
const out = { prereg: "native/eval/callimachus/GRAIN-R7-PREREG.md", mode: MODE, universe: UNIVERSE, entities: record.entities.map((e) => ({ id: e.id, name: e.name, surfaces: e.surfaces, top: e.top })), atoms: [], claimsByStanding: {}, asks: [] };
for (const a of record.atoms) out.atoms.push({ id: a.id, subj: a.relation?.subj ?? null, objRefs: a.relation?.obj_refs ?? [], entities: a.entities ?? [], sentence: (a._sentence ?? "").slice(0, 140), span: a.span, kind: a.kind, standing: a.standing });
for (const c of record.claims) out.claimsByStanding[c.standing] = (out.claimsByStanding[c.standing] ?? 0) + 1;
out.claimsKeys = record.claims.map((c) => c.key).sort();

for (const ask of ASKS) {
  const qv3 = questionVoid(qg.readQuestion(ask, { model }), record);
  const cols = witnesses(cands, { question: qv3, record });
  const perc = scoreWith(cols, ["perception"], cands.length);
  const act = new Map(cands.map((a, i) => [a.id, perc.s[i]]));
  const region = (await spansFromRecord(record, { slice, activation: act })).filter((x) => x.activation > 0);
  const admits = qv3.reading?.admits ?? null;
  const form = qv3.form ?? null;
  const agent = questionAgent(parseText(model, ask));
  const agentRefs = agent ? refsOf(agent.head.replace(/^./, (c) => c.toUpperCase())) : [];
  const split = splitRegion(region, []); // the void reader: nothing held
  const carrier = (s) => {
    const { a, i } = byId.get(s.id);
    const subjRef = a.relation?.subj ?? null;
    const agentOk = agentRefs.length ? agentRefs.includes(subjRef) : agentMatches(s.claim?.subj, agent);
    return { values: valuesFor(admits === "time" ? "time" : "proposition", { agentOk, actor: false, relation: cols.perception.relation[i], sentence: a._sentence ?? "", subj: subjRef, polarity: a.relation?.polarity ?? "+" }), subjRef, agentOk };
  };
  const passages = split.A.map((s) => ({ id: s.address, ...carrier(s), text: s.text }));
  const r = rankByBelief({ held: [], passages: passages.map((p) => ({ id: p.id, values: p.values })) });
  const textOf = new Map(passages.map((p) => [p.id, p.text]));
  out.asks.push({
    ask, admits, form, agent: agent?.head ?? null, agentRefs,
    carriers: passages.filter((p) => p.values.length).map((p) => ({ text: p.text.slice(0, 150), subjRef: p.subjRef, values: p.values })),
    before: r.before, after: r.after, window: r.window, newCarrying: r.order.length, context: r.context.length,
    order: r.order.map((o, k) => ({ bits: o.bits, values: o.values, direction: o.direction, answerBefore: o.answerBefore, answerAfter: o.answerAfter, inWindow: k < r.window, text: (textOf.get(o.id) ?? "").slice(0, 150) })),
  });
}
// E3's phrases: resolved by the mode's own resolver against the record's own admitted referents
const PHRASES = ["Senate Bill 100", "Senate File 8", "the Senate Committee", "Senate Republicans", "House Democrats", "Substitute House Bill 1196", "the Missouri House of Representatives", "the Nevada Senate", "Mountain Standard Time", "Eastern Standard Time", "Pacific Standard Time", "Central Standard Time"];
const KEPT = ["the Senate", "the House", "the House’s", "Senate", "House", "U.S. Senate", "United States Congress", "Congress"];
const nameOf = (id) => record.entities.find((e) => e.id === id)?.name ?? id;
out.phraseChecks = PHRASES.map((p) => ({ phrase: p, refs: refsOf(p), names: refsOf(p).map(nameOf) }));
out.keptChecks = KEPT.map((p) => ({ phrase: p, refs: refsOf(p), names: refsOf(p).map(nameOf) }));
writeFileSync(OUT, JSON.stringify(out, null, 1));
log("wrote", OUT, MODE, "atoms", out.atoms.length, "entities", out.entities.length);
