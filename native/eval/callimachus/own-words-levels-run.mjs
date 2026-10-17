#!/usr/bin/env node
// eval/callimachus/own-words-levels-run.mjs — the run registered in OWN-WORDS-PREREG.md, Amendment 1 (E1–E3), COMMITTED BEFORE IT IS RUN.
//
//   node native/eval/callimachus/own-words-levels-run.mjs --essays <dir with the .md essays> --memory <memory dir> --out <results.json>
//
// Reads the essays and the memory store, writes --out and --out.new-to-you.md. No model. Local only: nothing is sent anywhere.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
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
const ESSAYS = opt("--essays") && resolve(opt("--essays"));
const MEMORY = opt("--memory") && resolve(opt("--memory"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!ESSAYS || !MEMORY || !OUT) { console.error("usage: own-words-levels-run.mjs --essays <dir> --memory <dir> --out <results.json>"); process.exit(2); }

const FILES = ["the-theory-of-the-fold", "the-mechanical-fold", "the-readers-nomos", "standing-is-earned", "identity-at-a-point", "the-third-person", "the-orders-of-the-read", "the-canonical-cycle", "the-compression", "the-ninth-layer", "the-stages-of-real-reasoning", "defining-the-void-recursively", "the-substrate-the-tapestry-is-the-holograph", "the-telling-spec", "the-twenty-seven-stages"].map((f) => `${f}.md`);
const ASKS = ["What makes a claim stand?", "Who is the reader of a fold?"];
const UNRELATED = /hyphae|headless|screenshots|shared_checkout|stranded|npj|eviction|mnpd|alpr|caselink|tn_county|opencode|intelechia|workflow_agents|subagent|suite_diff|empty_grep|fastest_by_default|heimdall|houdini|youtube|matrix|apprentice|goethe|sullivan|commoncite|eopm|podcast|oauth|metro|holodeck_(reader_ux|data|login|sealed|matrix|surface|layered|ingest|ohs|workspaces|generate|youtube)/i;
const SHUF_SEEDS = Array.from({ length: 19 }, (_, i) => 701 + i);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const log = (...m) => console.error(new Date().toISOString().slice(11, 19), ...m);

// ---- U: the essays, pinned, byline declared ----------------------------------------------------------------------------------------
const store = {};
const recs = [];
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
for (const f of FILES) {
  const text = readFileSync(join(ESSAYS, f), "utf8");
  const raw = `<html><head><title>${f}</title><meta name="author" content="Michael Lacy"></head><body><pre>${esc(text)}</pre></body></html>`;
  const rec = await makePinax({ url: `https://essays.local/${f}`, raw: new Uint8Array(Buffer.from(raw, "utf8")), text, extractor: { name: "local essay: text layer is the file, read as UTF-8" } });
  rec.declared = { role: "source" };
  store[rec.entry.id] = rec;
  recs.push(rec);
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
const qg = (await import("../../adapters/text/question-grammar.en.js")).default;
const model = loadModel(JSON.parse(readFileSync(join(here, "../../priors/parser-eng-ewt.json"), "utf8")));

// ---- W: the memory store, split by name -------------------------------------------------------------------------------------------
const memFiles = readdirSync(MEMORY).filter((n) => n.endsWith(".md") && n !== "MEMORY.md" && /^(feedback|project|reference)_/.test(n)).sort();
const bodyBlocks = (name) => {
  let t = readFileSync(join(MEMORY, name), "utf8").replace(/^---[\s\S]*?\n---\s*\n/, "").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\*\*/g, "");
  return t.split(/\n\s*\n/).map((b) => b.replace(/\s+/g, " ").trim()).filter((b) => b.length > 20);
};
const X = memFiles.filter((n) => UNRELATED.test(n));
const F = memFiles.filter((n) => !UNRELATED.test(n));
const blocksOfFiles = (names) => names.flatMap((n) => bodyBlocks(n).map((b) => ({ b, ref: n })));
const WF = blocksOfFiles(F), WX = blocksOfFiles(X);
log(`U: ${recs.length} essays; W_F: ${F.length} files / ${WF.length} blocks; W_X: ${X.length} files / ${WX.length} blocks`);

const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffleWords = (b, rnd) => { const w = b.split(/\s+/).filter(Boolean); for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } return w.join(" "); };

let pinN = 0;
/** Read blocks ({b, ref}) as W: one pinned record per call, spans carry the provenance of the memory file their block came from. */
async function readW(blocks, reader, record) {
  const text = blocks.map((x) => x.b).join("\n\n") + "\n";
  const rec = await makePinax({ url: `whom:own-words:${pinN++}`, raw: new Uint8Array(Buffer.from(text, "utf8")), text, extractor: { name: "own-words: memory blocks as text" } });
  store[rec.entry.id] = rec;
  const r = readCorpus([rec], { question: "", received: reader });
  const spans = await spansFromRecord(r, { slice, side: "W" });
  // provenance: the block each span's bytes fall in (by byte offset into the joined text), so a span names its own memory file
  const enc = new TextEncoder();
  const starts = []; let off = 0;
  for (const x of blocks) { starts.push([off, x.ref]); off += enc.encode(x.b).length + 2; }
  return spans.map((s) => {
    const m = /#b(\d+)-/.exec(s.address); const at = m ? Number(m[1]) : 0;
    let ref = blocks[0]?.ref ?? "memory"; for (const [o, r2] of starts) if (o <= at) ref = r2;
    return { ...s, provenance: { kind: "memory", ref } };
  });
}


// ---- holdings per grain: entities, then claims (OWN-WORDS-PREREG.md, Amendment 1) --------------------------------------------------
const nrm = (t) => {
  const w = String(t ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s'’-]/gu, " ").split(/\s+/).filter(Boolean);
  while (w.length > 1 && ["the", "a", "an"].includes(w[0])) w.shift();
  return w.join(" ");
};
const entitiesOf = (s) => [s.claim?.subj, s.claim?.obj].map(nrm).filter(Boolean);
const entitySet = (spans) => new Set(spans.flatMap(entitiesOf));
const claimSet = (spans) => new Set(spans.map((s) => arrangementOf(s)).filter(Boolean));
function partition(region, whomSpans) {
  const E = entitySet(whomSpans), C = claimSet(whomSpans);
  let newThings = 0, newAboutHeld = 0, heldClaims = 0, entityHeld = 0;
  for (const u of region) {
    const eh = entitiesOf(u).some((e) => E.has(e));
    const ch = C.has(arrangementOf(u));
    if (eh) entityHeld++;
    if (ch) heldClaims++;
    else if (eh) newAboutHeld++;
    else newThings++;
  }
  return { entityHeld, heldClaims, newThings, newAboutHeld, wEntities: E.size, wClaims: whomSpans.length };
}

const results = { prereg: "native/eval/callimachus/OWN-WORDS-PREREG.md#amendment-1", asks: {} };
for (const ask of ASKS) {
  log(`ask: ${ask}`);
  const record = readCorpus(recs, { question: ask, absences: [] });
  const qv = questionVoid(qg.readQuestion(ask, { model }), record);
  const cands = candidatesOf(record, {});
  const p1 = scoreWith(witnesses(cands, { question: qv, record }), ["perception"], cands.length);
  const activation = new Map(cands.map((a, i) => [a.id, p1.s[i]]));
  const region = (await spansFromRecord(record, { slice, activation })).filter((s) => s.activation > 0);
  const READERS = { R0: null, R2: { verbs: new Set(record.vocab) } };
  const A = { region: region.length, readers: {} };
  for (const [rname, reader] of Object.entries(READERS)) {
    const R = { arms: {}, shuffled: [] };
    R.arms.void = partition(region, []);
    R.arms.fold = partition(region, await readW(WF, reader, record));
    R.arms.unrelated = partition(region, await readW(WX, reader, record));
    for (const seed of SHUF_SEEDS) {
      const rnd = mulberry(seed);
      R.shuffled.push(partition(region, await readW(WF.map((x) => ({ ...x, b: shuffleWords(x.b, rnd) })), reader, record)));
    }
    const f = R.arms.fold, x = R.arms.unrelated, v = R.arms.void;
    const sMax = Math.max(...R.shuffled.map((s) => s.entityHeld));
    R.predictions = {
      E1: { entityHeld: f.entityHeld, shuffledMax: sMax, shuffledMean: R.shuffled.reduce((a, s) => a + s.entityHeld, 0) / R.shuffled.length, holds: f.entityHeld > sMax },
      E2: { fold: f.entityHeld, unrelated: x.entityHeld, holds: f.entityHeld > x.entityHeld },
      E3: { fold: { newThings: f.newThings, newAboutHeld: f.newAboutHeld, heldClaims: f.heldClaims }, void: { newThings: v.newThings, region: region.length }, holds: f.newThings > 0 && f.newAboutHeld > 0 && v.newThings === region.length },
    };
    A.readers[rname] = R;
  }
  results.asks[ask] = A;
}
writeFileSync(OUT, JSON.stringify(results, null, 1));
log("wrote", OUT);
console.log(JSON.stringify(Object.fromEntries(Object.entries(results.asks).map(([k, A]) => [k, { region: A.region, readers: Object.fromEntries(Object.entries(A.readers).map(([rn, R]) => [rn, R.predictions])) }])), null, 1));
