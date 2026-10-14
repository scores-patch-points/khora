#!/usr/bin/env node
// eval/callimachus/own-words-mind-run.mjs — the run registered in OWN-WORDS-PREREG.md, Amendment 10 (M1-M6, end to end), COMMITTED BEFORE IT IS RUN.
//
//   node native/eval/callimachus/own-words-mind-run.mjs --essays <dir with the .md essays> --memory <memory dir> --out <results.json>
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
import { spansFromRecord, arrangementOf, splitRegion } from "../../organs/grain.js";
import { foldWithWhom } from "../../organs/whom-standing.js";
import { mindOf, claimKeyOf } from "../../organs/mind-whom.js";
import { whomFromTrail } from "../../organs/trail-whom.js";
import { lintClaims } from "../../organs/claim-lint.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ESSAYS = opt("--essays") && resolve(opt("--essays"));
const MEMORY = opt("--memory") && resolve(opt("--memory"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!ESSAYS || !MEMORY || !OUT) { console.error("usage: own-words-mind-run.mjs --essays <dir> --memory <dir> --out <results.json>"); process.exit(2); }

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





async function regionOf(ask) {
  const record = readCorpus(recs, { question: ask, absences: [] });
  const qv = questionVoid(qg.readQuestion(ask, { model }), record);
  const cands = candidatesOf(record, {});
  const p1 = scoreWith(witnesses(cands, { question: qv, record }), ["perception"], cands.length);
  const activation = new Map(cands.map((a, i) => [a.id, p1.s[i]]));
  return lintClaims((await spansFromRecord(record, { slice, activation })).filter((s) => s.activation > 0).sort((a, b) => b.activation - a.activation)).sound;
}
const R1 = await regionOf(ASKS[0]), R2 = await regionOf(ASKS[1]);
const trail = R1.map((s) => ({ address: s.address, turn: 1, via: "seen" }));
const wFull = R2.map((s) => ({ ...s, side: "W" }));
const regionAddrs = new Set(R2.map((x) => x.address));
const newOf = (f) => { const gen = f.modes.find((m) => m.role === "generate"); const out = []; for (const it of gen?.items ?? []) { const sp = it.spans ?? []; if (f.grain === "Ground") out.push(...sp.filter((a) => regionAddrs.has(a))); else { const last = sp[sp.length - 1]; if (last && regionAddrs.has(last)) out.push(last); } } return [...new Set(out)]; };

// the earlier result, for M1's end-to-end comparison
const prev = JSON.parse(readFileSync(join(dirname(OUT), "results.seen.json"), "utf8"));

const viaTrail = whomFromTrail(trail, { universe: R2 }).spans;
const m = mindOf({ question: ASKS[1], region: R2, trail });
const fvoid = foldWithWhom({ region: R2, whom: [], wFull });
const fOld = foldWithWhom({ region: R2, whom: viaTrail, wFull });
const fMind = foldWithWhom({ region: R2, whom: [], wFull, mind: m });
const mNone = mindOf({ question: ASKS[1], region: R2 });
const fNone = foldWithWhom({ region: R2, whom: [], wFull, mind: mNone });

const keysR2 = new Set(R2.map(claimKeyOf));
const heldAddr = new Set(m.whom.map((s) => s.address));
const shown = newOf(fMind);
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const out = {
  R1: R1.length, R2: R2.length,
  M1: { oldSpans: viaTrail.length, mindSpans: m.whom.length, sameAddresses: sameSet([...new Set(viaTrail.map((s) => s.address))], [...new Set(m.whom.map((s) => s.address))]),
        grain: { old: fOld.grain, mind: fMind.grain, previousRun: prev.grain.seen }, shown: { old: newOf(fOld).length, mind: shown.length, previousRun: prev.shown.seen }, withheld: { mind: new Set(m.whom.map((s) => s.address)).size, previousRun: prev.withheld }, leak: fMind.grain === "Ground" ? null : shown.filter((a) => heldAddr.has(a)).length, previousLeak: prev.leak,
        holds: sameSet([...new Set(viaTrail.map((s) => s.address))], [...new Set(m.whom.map((s) => s.address))]) && fMind.grain === prev.grain.seen && shown.length === prev.shown.seen },
  M2: { readerWitnessed: m.witnessedByReader.length, regionKeys: keysR2.size, onlyRegionKeys: m.witnessedByReader.every((k) => keysR2.has(k)), holds: m.witnessedByReader.length === keysR2.size && m.witnessedByReader.every((k) => keysR2.has(k)) },
  M4: { emptyUnmodelled: fNone.refusals.some((r) => r.code === "mind-unmodelled"), trailUnmodelled: fMind.refusals.some((r) => r.code === "mind-unmodelled"), emptyGap: mNone.gaps.map((g) => g.type), holds: fNone.refusals.some((r) => r.code === "mind-unmodelled") && !fMind.refusals.some((r) => r.code === "mind-unmodelled") },
  M6: { legs: m.legs, grainWithMind: fMind.grain, grainWithSpans: fOld.grain, holds: fMind.grain === fOld.grain },
  reported: { model: m.model, common: m.common, divergence: m.divergence, held: m.held, gaps: m.gaps.map((g) => g.type), standings: fMind.standings.counts, voidGrain: fvoid.grain, voidShown: newOf(fvoid).length },
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
log("wrote", OUT);
console.log(JSON.stringify(out, null, 1));
