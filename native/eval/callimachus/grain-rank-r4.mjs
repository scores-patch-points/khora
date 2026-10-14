#!/usr/bin/env node
// eval/callimachus/grain-rank-r4.mjs — the fourth registration: the order of what is new and a spread of anchors, exactly as pre-registered in GRAIN-R4-PREREG.md.
//
//   node native/eval/callimachus/grain-rank-r4.mjs --universe <pinned run dir> --whom <twin-reader whom dir> --out <results.json>
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
import { readWhom, whomStemDf } from "../../organs/whom.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const UNIVERSE = opt("--universe") && resolve(opt("--universe"));
const WHOM = opt("--whom") && resolve(opt("--whom"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!UNIVERSE || !WHOM || !OUT) { console.error("usage: grain-rank-r4.mjs --universe <dir> --whom <dir> --out <results.json>"); process.exit(2); }

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
const results = { prereg: "native/eval/callimachus/GRAIN-R4-PREREG.md", universe: UNIVERSE, asks: ASKS, perAsk: [], redealt: [], predictions: {} };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// the dense reader, as W: claims (read through the record's vocabulary) and bytes (for the ladder's own reader prior)
const denseText = whomText("dense");
const denseRead = await readW("dense", denseText);
const denseRec = await makePinax({ url: "whom:dense-bytes", raw: new Uint8Array(Buffer.from(denseText, "utf8")), text: denseText, extractor: { name: "whom: local file, read as UTF-8" } });
const whomBytes = readWhom([denseRec]);
const readerPrior = { m: whomBytes.size, df: whomStemDf(whomBytes) };

async function forAsk(ask) {
  const qv3 = questionVoid(qg.readQuestion(ask, { model }), record);
  const cols = witnesses(cands, { question: qv3, record });
  const perc = scoreWith(cols, ["perception"], cands.length);
  const both = scoreWith(cols, ["perception", "logos"], cands.length, readerPrior);
  const act = new Map(cands.map((a, i) => [a.id, perc.s[i]]));
  const rankBy = new Map(cands.map((a, i) => [a.id, both.s[i]]));
  const plain = (await spansFromRecord(record, { slice, activation: act })).filter((x) => x.activation > 0);
  const ranked = plain.map((s) => ({ ...s, rank: rankBy.get(s.id) ?? 0 }));
  return { plain, ranked };
}
const newOf = (f) => (f.modes.find((m) => m.role === "generate")?.items ?? []).map((it) => ({ anchor: it.spans.length > 1 ? it.spans[0] : null, passage: it.spans[it.spans.length - 1], text: it.segs.filter((g) => g.kind === "source").slice(-1)[0]?.t ?? "", anchorText: it.spans.length > 1 ? it.segs.filter((g) => g.kind === "source")[0]?.t : null, unrelated: !!it.unrelated }));
const distinct = (xs, k) => new Set(xs.slice(0, k).map((x) => x.anchor).filter(Boolean)).size;
const tau = (a, b) => { // Kendall's tau between two orders of the same items
  const pos = new Map(b.map((x, i) => [x, i])); let c = 0, d = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const pi = pos.get(a[i]), pj = pos.get(a[j]); if (pi === undefined || pj === undefined) continue; pi < pj ? c++ : d++; }
  return c + d ? (c - d) / (c + d) : null;
};
const nonGen = (f) => JSON.stringify(f.modes.filter((m) => m.role !== "generate").map((m) => ({ mode: m.mode, items: m.items.map((i) => i.spans) })));

const blind = [];
const rng = mulberry(20261014);
for (const ask of ASKS) {
  const { plain, ranked } = await forAsk(ask);
  const fOld = foldGrain({ region: plain, whom: denseRead.spans, anchor: "first" });
  const fNew = foldGrain({ region: ranked, whom: denseRead.spans, anchor: "shared-most" });
  const nOld = newOf(fOld), nNew = newOf(fNew);
  const rankOfAddr = new Map(ranked.map((s) => [s.address, s.rank]));
  const monotone = nNew.every((x, i) => i === 0 || (rankOfAddr.get(nNew[i - 1].passage) ?? 0) >= (rankOfAddr.get(x.passage) ?? 0));
  const sameSet = JSON.stringify(nOld.map((x) => x.passage).sort()) === JSON.stringify(nNew.map((x) => x.passage).sort());
  const row = { ask, grain: { old: fOld.grain, new: fNew.grain }, newPassages: nNew.length, distinctAnchorsTop10: { first: distinct(nOld, 10), sharedMost: distinct(nNew, 10) }, tau: tau(nOld.map((x) => x.passage), nNew.map((x) => x.passage)), top5Overlap: nOld.slice(0, 5).filter((x) => nNew.slice(0, 5).some((y) => y.passage === x.passage)).length, monotone, sameSet, sameOtherCells: nonGen(fOld) === nonGen(fNew), sameGrain: fOld.grain === fNew.grain, top5: { first: nOld.slice(0, 5), sharedMost: nNew.slice(0, 5) } };
  results.perAsk.push(row);
  const flip = rng() < 0.5;
  blind.push({ ask, one: flip ? nNew.slice(0, 5) : nOld.slice(0, 5), two: flip ? nOld.slice(0, 5) : nNew.slice(0, 5), key: { one: flip ? "ranked+spread" : "original", two: flip ? "original" : "ranked+spread" } });
}
// the 19 re-dealt dense readers, House ask only
{
  const { plain, ranked } = await forAsk(ASK);
  for (const name of NULL_SEEDS.dense) {
    const w = await readW(name, whomText(name));
    const fo = foldGrain({ region: plain, whom: w.spans, anchor: "first" });
    const fn = foldGrain({ region: ranked, whom: w.spans, anchor: "shared-most" });
    results.redealt.push({ name, claims: w.spans.length, grain: fn.grain, distinctAnchorsTop10: { first: distinct(newOf(fo), 10), sharedMost: distinct(newOf(fn), 10) } });
  }
}
const P = results.predictions;
const dense = results.perAsk;
P.R1 = {
  denseAsks: dense.map((r) => ({ ask: r.ask, first: r.distinctAnchorsTop10.first, sharedMost: r.distinctAnchorsTop10.sharedMost })),
  redealtWorse: results.redealt.filter((r) => r.distinctAnchorsTop10.sharedMost < r.distinctAnchorsTop10.first).map((r) => r.name),
  redealtStricter: results.redealt.filter((r) => r.distinctAnchorsTop10.sharedMost > r.distinctAnchorsTop10.first).length,
  holds: dense.every((r) => r.distinctAnchorsTop10.sharedMost >= r.distinctAnchorsTop10.first) && results.redealt.every((r) => r.distinctAnchorsTop10.sharedMost >= r.distinctAnchorsTop10.first) && dense[0].distinctAnchorsTop10.sharedMost > dense[0].distinctAnchorsTop10.first,
};
P.R2 = { perAsk: dense.map((r) => r.monotone), holds: dense.every((r) => r.monotone) };
P.R3 = { perAsk: dense.map((r) => ({ sameGrain: r.sameGrain, sameSet: r.sameSet, sameOtherCells: r.sameOtherCells })), holds: dense.every((r) => r.sameGrain && r.sameSet && r.sameOtherCells) };
P.R4 = { pending: "the user's blind choice on rank-blind.html (4 asks); not computed by this script" };
results.reported = { tau: dense.map((r) => ({ ask: r.ask, tau: r.tau, top5Overlap: r.top5Overlap })) };
writeFileSync(OUT, JSON.stringify(results, null, 1));
writeFileSync(OUT.replace(/\.json$/, ".key.json"), JSON.stringify(blind.map((b) => ({ ask: b.ask, one: b.key.one, two: b.key.two })), null, 1));

// the blind page: two lists per ask, order randomised, no labels
const list = (items) => `<ol>${items.map((x) => `<li>${x.anchorText ? `<div class="anchor"><span class="tag">they already hold</span> ${esc(x.anchorText)}</div>` : ""}<div class="new"><span class="tag new">new to them</span> ${esc(x.text)}</div></li>`).join("")}</ol>`;
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Which list first? (blind)</title><style>
:root{--bg:#fbfaf7;--fg:#1d1c1a;--mute:#6b6a66;--card:#fff;--line:#e3e0d8;--held:#e8f3ea;--heldfg:#1d5a2c;--new:#fdf1dc;--newfg:#8a5a00}
@media (prefers-color-scheme: dark){:root{--bg:#161614;--fg:#ecebe6;--mute:#a09f98;--card:#1f1f1c;--line:#34332e;--held:#1c3023;--heldfg:#8fd19e;--new:#352a12;--newfg:#f0c36a}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 Georgia,serif}main{max-width:900px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:1.6rem}h2{font-size:1.1rem;margin:0}.ask{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin:22px 0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}@media (max-width:700px){.cols{grid-template-columns:1fr}}
.col{border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:var(--bg)}.col h3{margin:.1em 0 .4em;font:600 14px system-ui}
ol{padding-left:1.2em;margin:0}li{margin:.7em 0}.anchor{background:var(--held);border-radius:6px;padding:4px 8px;font-size:.92rem}.new{background:var(--new);border-radius:6px;padding:4px 8px;margin-top:3px;font-size:.92rem}
.tag{font:600 10.5px system-ui;text-transform:uppercase;letter-spacing:.04em;margin-right:6px;color:var(--heldfg)}.tag.new{color:var(--newfg)}.lead{color:var(--mute)}
</style></head><body><main>
<h1>Which list should this reader see first?</h1>
<p class="lead">The same reader (they already know the House and Senate material), four different questions. For each, two lists of the five passages that are <b>new to them</b>. Each new passage is shown beside something they already hold. The lists are in random order and unlabelled. Pick the one you would rather they saw first, per question.</p>
${blind.map((b, i) => `<section class="ask"><h2>${i + 1}. ${esc(b.ask)}</h2><div class="cols"><div class="col"><h3>List 1</h3>${list(b.one)}</div><div class="col"><h3>List 2</h3>${list(b.two)}</div></div></section>`).join("\n")}
</main></body></html>`;
writeFileSync(OUT.replace(/\.json$/, ".blind.html"), page);
log("wrote", OUT);
console.log(JSON.stringify({ hashMismatches: hashMismatches.length, predictions: P, reported: results.reported, anchorsDense: results.perAsk.map((r) => r.distinctAnchorsTop10) }, null, 1));
