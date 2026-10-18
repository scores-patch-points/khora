#!/usr/bin/env node
// eval/callimachus/own-words-wired-run.mjs — the run registered in OWN-WORDS-PREREG.md, Amendment 8 (D1–D5), COMMITTED BEFORE IT IS RUN.
//
//   node native/eval/callimachus/own-words-wired-run.mjs --essays <dir with the .md essays> --memory <memory dir> --out <results.json>
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
import { mentionsOf } from "../../organs/referent-held.js";
import { foldWithWhom } from "../../organs/whom-standing.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ESSAYS = opt("--essays") && resolve(opt("--essays"));
const MEMORY = opt("--memory") && resolve(opt("--memory"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!ESSAYS || !MEMORY || !OUT) { console.error("usage: own-words-wired-run.mjs --essays <dir> --memory <dir> --out <results.json>"); process.exit(2); }

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




// ---- the wired fold: foldWithWhom with `referents`, end to end ---------------------------------------------------------------------
const sampleBlocks = (blocks, k, rnd) => blocks.map((b, i) => [rnd(), i]).sort((p, q) => p[0] - q[0]).slice(0, k).map(([, i]) => blocks[i]);
const textOfBlocks = (bs) => bs.map((x) => x.b).join("\n\n");
const cellItems = (f) => JSON.stringify(f.modes.map((m) => [m.mode, m.items.map((i) => (i.spans ?? []).join("|"))]));
const results = { prereg: "native/eval/callimachus/OWN-WORDS-PREREG.md#amendment-8", asks: {} };
for (const ask of ASKS) {
  log(`ask: ${ask}`);
  const record = readCorpus(recs, { question: ask, absences: [] });
  const qv = questionVoid(qg.readQuestion(ask, { model }), record);
  const cands = candidatesOf(record, {});
  const p1 = scoreWith(witnesses(cands, { question: qv, record }), ["perception"], cands.length);
  const activation = new Map(cands.map((a, i) => [a.id, p1.s[i]]));
  const region = lintClaims((await spansFromRecord(record, { slice, activation })).filter((s) => s.activation > 0)).sound.sort((a, b) => b.activation - a.activation);
  const byAddr = new Map(region.map((s) => [s.address, s]));
  const ents = record.entities;
  const nameOf = new Map(ents.map((e) => [e.id, (e.surfaces ?? [e.name])[0]]));
  const sets = {
    void: [],
    unrelated: WX,
    dst: dstBlocks.length > WX.length ? sampleBlocks(dstBlocks, WX.length, mulberry(901)) : dstBlocks,
    wnp: wnpBlocks,
    ...Object.fromEntries(DRAW_SEEDS.map((seed) => [`draw-${seed}`, sampleBlocks(WF, WX.length, mulberry(seed))])),
  };
  const arm = (blocks) => {
    const mentioned = mentionsOf(textOfBlocks(blocks), ents);
    const wired = foldWithWhom({ region, whom: [], referents: { entities: ents, mentioned } });
    const plain = foldWithWhom({ region, whom: [] });
    const t = wired.topic;
    const cleared = region.filter((u) => (u.activation ?? 0) > 0).map((u) => u.address);
    const all = [...t.newAboutHeld, ...t.newThings];
    const exact = all.length === cleared.length && new Set(all).size === all.length && cleared.every((a) => new Set(all).has(a)) && all.every((a) => byAddr.has(a));
    return {
      mentioned: mentioned.size, counts: t.counts, exact,
      unchanged: wired.grain === plain.grain && cellItems(wired) === cellItems(plain),
      share: t.counts.cleared ? t.counts.newAboutHeld / t.counts.cleared : null,
      newAboutHeld: t.newAboutHeld, referentsOf: Object.fromEntries(Object.entries(t.referentsOf).map(([a, ids]) => [a, ids.map((i) => nameOf.get(i))])),
      newThings: t.newThings,
    };
  };
  const arms = Object.fromEntries(Object.entries(sets).map(([k, b]) => [k, arm(b)]));
  const drawKeys = Object.keys(arms).filter((k) => k.startsWith("draw-"));
  const ctl = ["unrelated", "dst", "wnp"];
  const dMin = Math.min(...drawKeys.map((k) => arms[k].counts.newAboutHeld));
  const cMax = Math.max(...ctl.map((k) => arms[k].counts.newAboutHeld));
  const sample = (a, n, k) => a[k].newAboutHeld.slice(0, n).map((addr) => byAddr.get(addr)?.text.replace(/\s+/g, " ").trim().slice(0, 220));
  results.asks[ask] = {
    region: region.length, referents: ents.length,
    counts: Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, { mentioned: v.mentioned, ...v.counts, share: v.share }])),
    predictions: {
      D1: { allExact: Object.values(arms).every((a) => a.exact), holds: Object.values(arms).every((a) => a.exact) },
      D2: { void: arms.void.counts, holds: arms.void.counts.newAboutHeld === 0 && arms.void.counts.newThings === arms.void.counts.cleared },
      D3: { drawsMin: dMin, controlsMax: cMax, drawsMax: Math.max(...drawKeys.map((k) => arms[k].counts.newAboutHeld)), holds: dMin > cMax },
      D4: { unchangedAll: Object.values(arms).every((a) => a.unchanged), holds: Object.values(arms).every((a) => a.unchanged) },
      D5: { maxShare: Math.max(...Object.values(arms).map((a) => a.share ?? 0)), holds: Object.values(arms).every((a) => (a.share ?? 0) < 0.5) },
    },
    reading: {
      draw801: { newAboutHeld: sample(arms, 6, "draw-801", ) , byReferent: Object.values(arms["draw-801"].referentsOf).slice(0, 6) },
      unrelated: { newAboutHeld: sample(arms, 6, "unrelated"), byReferent: Object.values(arms.unrelated.referentsOf).slice(0, 6) },
    },
  };
  // the sample helper reads {arms}[k].newAboutHeld; also a few new things for one draw
  results.asks[ask].reading.draw801.newThings = arms["draw-801"].newThings.slice(0, 6).map((addr) => byAddr.get(addr)?.text.replace(/\s+/g, " ").trim().slice(0, 220));
}
writeFileSync(OUT, JSON.stringify(results, null, 1));
log("wrote", OUT);
console.log(JSON.stringify(Object.fromEntries(Object.entries(results.asks).map(([k, A]) => [k, { region: A.region, counts: { void: A.counts.void, unrelated: A.counts.unrelated, dst: A.counts.dst, wnp: A.counts.wnp, draw801: A.counts["draw-801"] }, predictions: A.predictions }])), null, 1));
