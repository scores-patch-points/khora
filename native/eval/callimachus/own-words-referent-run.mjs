#!/usr/bin/env node
// eval/callimachus/own-words-referent-run.mjs — the run registered in OWN-WORDS-PREREG.md, Amendment 7 (T1–T4), COMMITTED BEFORE IT IS RUN.
//
//   node native/eval/callimachus/own-words-referent-run.mjs --essays <dir with the .md essays> --memory <memory dir> --out <results.json>
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
import { lintClaims } from "../../organs/claim-lint.js";
import { mentionsOf, heldByReferent } from "../../organs/referent-held.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ESSAYS = opt("--essays") && resolve(opt("--essays"));
const MEMORY = opt("--memory") && resolve(opt("--memory"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!ESSAYS || !MEMORY || !OUT) { console.error("usage: own-words-referent-run.mjs --essays <dir> --memory <dir> --out <results.json>"); process.exit(2); }

const FILES = ["the-theory-of-the-fold", "the-mechanical-fold", "the-readers-nomos", "standing-is-earned", "identity-at-a-point", "the-third-person", "the-orders-of-the-read", "the-canonical-cycle", "the-compression", "the-ninth-layer", "the-stages-of-real-reasoning", "defining-the-void-recursively", "the-substrate-the-tapestry-is-the-holograph", "the-telling-spec", "the-twenty-seven-stages"].map((f) => `${f}.md`);
const ASKS = ["What makes a claim stand?", "Who is the reader of a fold?"];
const UNRELATED = /hyphae|headless|screenshots|shared_checkout|stranded|npj|eviction|mnpd|alpr|caselink|tn_county|opencode|intelechia|workflow_agents|subagent|suite_diff|empty_grep|fastest_by_default|heimdall|houdini|youtube|matrix|apprentice|goethe|sullivan|commoncite|eopm|podcast|oauth|metro|holodeck_(reader_ux|data|login|sealed|matrix|surface|layered|ingest|ohs|workspaces|generate|youtube)/i;
const SHUF_SEEDS = Array.from({ length: 19 }, (_, i) => 701 + i);
const DRAW_SEEDS = Array.from({ length: 19 }, (_, i) => 801 + i);
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

const CONTROL_DST = opt("--dst") && resolve(opt("--dst"));
const CONTROL_WNP = opt("--wnp") && resolve(opt("--wnp"));
const parasOf = (t, ref) => t.split(/\n\s*\n/).map((b) => b.replace(/\s+/g, " ").trim()).filter((b) => b.length > 20).map((b) => ({ b, ref }));
const dstBlocks = CONTROL_DST ? readdirSync(join(CONTROL_DST, "layers")).filter((n) => n.endsWith(".txt")).sort().flatMap((n) => parasOf(readFileSync(join(CONTROL_DST, "layers", n), "utf8"), n)) : [];
const wnpBlocks = CONTROL_WNP ? parasOf(readFileSync(CONTROL_WNP, "utf8"), "war-and-peace-narrated.md") : [];
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



// ---- the referent witness: no claim reader on W, only mentions of the record's own referents ---------------------------------------
const sampleBlocks = (blocks, k, rnd) => blocks.map((b, i) => [rnd(), i]).sort((p, q) => p[0] - q[0]).slice(0, k).map(([, i]) => blocks[i]);
const textOfBlocks = (bs) => bs.map((x) => x.b).join("\n\n");
const results = { prereg: "native/eval/callimachus/OWN-WORDS-PREREG.md#amendment-7", asks: {} };
for (const ask of ASKS) {
  log(`ask: ${ask}`);
  const record = readCorpus(recs, { question: ask, absences: [] });
  const qv = questionVoid(qg.readQuestion(ask, { model }), record);
  const cands = candidatesOf(record, {});
  const p1 = scoreWith(witnesses(cands, { question: qv, record }), ["perception"], cands.length);
  const activation = new Map(cands.map((a, i) => [a.id, p1.s[i]]));
  const region = lintClaims((await spansFromRecord(record, { slice, activation })).filter((s) => s.activation > 0)).sound;
  const ents = record.entities;
  const sets = {
    void: [],
    unrelated: WX,
    dst: dstBlocks.length > WX.length ? sampleBlocks(dstBlocks, WX.length, mulberry(901)) : dstBlocks,
    wnp: wnpBlocks,
  };
  const measure = (blocks) => {
    const m = mentionsOf(textOfBlocks(blocks), ents);
    const h = heldByReferent(region, m, ents);
    return { blocks: blocks.length, mentioned: m.size, perBlock: blocks.length ? m.size / blocks.length : 0, heldSpans: h.held.length, share: h.share, ids: [...m] };
  };
  const arms = Object.fromEntries(Object.entries(sets).map(([k, b]) => [k, measure(b)]));
  const draws = DRAW_SEEDS.map((seed) => measure(sampleBlocks(WF, WX.length, mulberry(seed))));
  const controls = ["unrelated", "dst", "wnp"].map((k) => arms[k]);
  const ctlMax = (f) => Math.max(...controls.map(f));
  const dMin = (f) => Math.min(...draws.map(f));
  const nameOf = new Map(ents.map((e) => [e.id, (e.surfaces ?? [e.name])[0]]));
  const ctlIds = new Set([...arms.dst.ids, ...arms.wnp.ids]);
  const distinct = (ids) => ids.filter((id) => !ctlIds.has(id));
  const dMinDistinct = Math.min(...draws.map((d) => distinct(d.ids).length));
  const ctlMaxDistinct = Math.max(...controls.map((c) => distinct(c.ids).length));
  results.asks[ask] = {
    region: region.length, referents: ents.length, arms: Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, { ...v, ids: v.ids.map((i) => nameOf.get(i)) }])),
    draws: { min: dMin((d) => d.mentioned), mean: draws.reduce((a, d) => a + d.mentioned, 0) / draws.length, max: Math.max(...draws.map((d) => d.mentioned)), shareMin: dMin((d) => d.share), shareMax: Math.max(...draws.map((d) => d.share)) },
    drawsReferentFreq: Object.fromEntries(ents.map((e) => [nameOf.get(e.id), draws.filter((d) => d.ids.includes(e.id)).length])),
    predictions: {
      T1: { drawsMin: dMin((d) => d.mentioned), controlsMax: ctlMax((c) => c.mentioned), holds: dMin((d) => d.mentioned) > ctlMax((c) => c.mentioned) },
      T2: { drawsMin: dMin((d) => d.perBlock), controlsMax: ctlMax((c) => c.perBlock), holds: dMin((d) => d.perBlock) > ctlMax((c) => c.perBlock) },
      T3: { drawsShareMin: dMin((d) => d.share), controlsShareMax: ctlMax((c) => c.share ?? 0), holds: dMin((d) => d.share) > ctlMax((c) => c.share ?? 0) },
      T4: { distinctivePool: ents.filter((e) => !ctlIds.has(e.id)).map((e) => nameOf.get(e.id)), drawsMinDistinct: dMinDistinct, controlsMaxDistinct: ctlMaxDistinct, holds: dMinDistinct > ctlMaxDistinct },
    },
  };
}
writeFileSync(OUT, JSON.stringify(results, null, 1));
log("wrote", OUT);
console.log(JSON.stringify(Object.fromEntries(Object.entries(results.asks).map(([k, A]) => [k, { region: A.region, draws: A.draws, controls: Object.fromEntries(["unrelated", "dst", "wnp"].map((c) => [c, { mentioned: A.arms[c].mentioned, share: A.arms[c].share }])), predictions: A.predictions }])), null, 1));
