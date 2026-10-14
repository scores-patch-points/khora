#!/usr/bin/env node
// eval/callimachus/w-reader-roundtrip.mjs — the W-reader experiment, exactly as pre-registered in W-READER-PREREG.md (committed first).
//
//   node native/eval/callimachus/w-reader-roundtrip.mjs --universe <permanent-dst copy> --whom <twin-reader whom dir> --out <results.json>
//
// COMMITTED BEFORE IT IS RUN, and not edited after. Reads the universe and the twin-reader W files, writes only --out. No model.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax, makeSpan, quoteOf, parseAddress } from "../../organs/pinax.js";
import { readCorpus } from "../../organs/callimachus.js";
import { candidatesOf, witnesses, scoreWith } from "../../organs/answer-ladder.js";
import { questionVoid } from "../../organs/question-void.js";
import { spansFromRecord, arrangementOf } from "../../organs/grain.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const UNIVERSE = opt("--universe") && resolve(opt("--universe"));
const WHOM = opt("--whom") && resolve(opt("--whom"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!UNIVERSE || !WHOM || !OUT) { console.error("usage: w-reader-roundtrip.mjs --universe <dir> --whom <dir> --out <results.json>"); process.exit(2); }
const ASK = "When did the House pass the Sunshine Protection Act?";
const SEEDS = Array.from({ length: 19 }, (_, i) => 301 + i);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const log = (...m) => console.error(new Date().toISOString().slice(11, 19), ...m);

// ---- the universe, replayed from its pinned layers (as grain-arms.mjs) ---------------------------------------------------------------
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
const regionKeys = new Set(region.map((s) => arrangementOf(s)).filter(Boolean));
log(`region: ${region.length} spans, ${regionKeys.size} distinct arrangements`);

// ---- the received prior, and the three readers -------------------------------------------------------------------------------------
const posPrior = JSON.parse(readFileSync(join(here, "../../priors/pos-en.json"), "utf8"));
const READERS = {
  R0: null,
  R1: { posPrior, minSurfaces: 1 },
  R2: { verbs: new Set(record.vocab) },
};

// ---- materials -----------------------------------------------------------------------------------------------------------------------
const blocksOf = (text) => text.split(/\n\s*\n/).map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffleBlock = (b, rnd) => { const w = b.split(/\s+/).filter(Boolean); for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } return w.join(" "); };
const MATERIALS = {
  W92: region.map((s) => s.text.replace(/\s+/g, " ").trim()),
  Wdense: blocksOf(readFileSync(join(WHOM, "dense", "thread.md"), "utf8")),
  WB: blocksOf(readFileSync(join(WHOM, "B", "thread.md"), "utf8")),
};

let pinN = 0;
async function claimsOf(blocks, reader) {
  const text = blocks.join("\n\n") + "\n";
  const raw = Buffer.from(text, "utf8");
  const rec = await makePinax({ url: `w-reader:${pinN++}`, raw: new Uint8Array(raw), text, extractor: { name: "w-reader experiment: local text" } });
  store[rec.entry.id] = rec;
  const r = readCorpus([rec], { question: "", received: reader });
  const spans = await spansFromRecord(r, { slice, side: "W" });
  return { spans, atoms: r.atoms.length, vocab: r.vocab ?? [] };
}
const keysOf = (spans) => new Set(spans.map((s) => arrangementOf(s)).filter(Boolean));
function measures(spans) {
  const keys = keysOf(spans);
  const recovered = region.filter((s) => keys.has(arrangementOf(s))).length;
  const hit = spans.filter((s) => regionKeys.has(arrangementOf(s))).length;
  return { claims: spans.length, recall: region.length ? recovered / region.length : null, recovered, precision: spans.length ? hit / spans.length : null };
}

// ---- run ---------------------------------------------------------------------------------------------------------------------------
const results = { prereg: "native/eval/callimachus/W-READER-PREREG.md", universe: UNIVERSE, ask: ASK, region: { spans: region.length, arrangements: regionKeys.size }, materials: Object.fromEntries(Object.entries(MATERIALS).map(([k, b]) => [k, { blocks: b.length, sha256: sha(Buffer.from(b.join("\n\n") + "\n", "utf8")) }])), cells: {} };
const vocabSeen = {};
for (const [mname, blocks] of Object.entries(MATERIALS)) {
  for (const [rname, reader] of Object.entries(READERS)) {
    const real = await claimsOf(blocks, reader);
    const m = measures(real.spans);
    const shuffled = [];
    for (const seed of SEEDS) {
      const rnd = mulberry(seed);
      shuffled.push((await claimsOf(blocks.map((b) => shuffleBlock(b, rnd)), reader)).spans.length);
    }
    const mean = shuffled.reduce((a, b) => a + b, 0) / shuffled.length;
    results.cells[`${rname}/${mname}`] = { ...m, atoms: real.atoms, shuffledClaims: { mean, min: Math.min(...shuffled), max: Math.max(...shuffled), seeds: shuffled.length }, shuffledOverReal: m.claims ? mean / m.claims : null };
    if (mname === "W92") vocabSeen[rname] = new Set(real.vocab);
  }
}
const diff = (a, b) => [...a].filter((x) => !b.has(x)).sort();
results.verbs = { onlyR1: diff(vocabSeen.R1 ?? new Set(), vocabSeen.R0 ?? new Set()), onlyR0: diff(vocabSeen.R0 ?? new Set(), vocabSeen.R1 ?? new Set()), R0: [...(vocabSeen.R0 ?? [])].sort(), R1: [...(vocabSeen.R1 ?? [])].sort() };

const c = results.cells;
results.predictions = {
  H1: { recall: { R0: c["R0/W92"].recall, R1: c["R1/W92"].recall }, holds: c["R1/W92"].recall > c["R0/W92"].recall },
  H2: { shuffledOverReal: { R0: c["R0/W92"].shuffledOverReal, R1: c["R1/W92"].shuffledOverReal }, claims: { R0: c["R0/W92"].claims, R1: c["R1/W92"].claims }, holds: c["R1/W92"].shuffledOverReal !== null && c["R0/W92"].shuffledOverReal !== null ? c["R1/W92"].shuffledOverReal <= c["R0/W92"].shuffledOverReal : null },
  H3: { claims: { R0: c["R0/WB"].claims, R1: c["R1/WB"].claims }, holds: c["R1/WB"].claims >= 1 },
  H4: { precision: { R0: c["R0/W92"].precision, R1: c["R1/W92"].precision }, holds: c["R1/W92"].precision !== null && c["R0/W92"].precision !== null ? c["R1/W92"].precision >= c["R0/W92"].precision : null },
};
writeFileSync(OUT, JSON.stringify(results, null, 1));
log("wrote", OUT);
console.log(JSON.stringify(results.predictions, null, 1));
