#!/usr/bin/env node
// eval/callimachus/own-words-run.mjs — the run registered in OWN-WORDS-PREREG.md (O1–O6), COMMITTED BEFORE IT IS RUN.
//
//   node native/eval/callimachus/own-words-run.mjs --essays <dir with the .md essays> --memory <memory dir> --out <results.json>
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
import { foldGrain, spansFromRecord, arrangementOf } from "../../organs/grain.js";
import { foldWithWhom, coverageOf } from "../../organs/whom-standing.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ESSAYS = opt("--essays") && resolve(opt("--essays"));
const MEMORY = opt("--memory") && resolve(opt("--memory"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!ESSAYS || !MEMORY || !OUT) { console.error("usage: own-words-run.mjs --essays <dir> --memory <dir> --out <results.json>"); process.exit(2); }

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

// ---- one ask -------------------------------------------------------------------------------------------------------------------
const itemSets = (f) => JSON.stringify(f.modes.map((m) => [m.mode, m.items.map((it) => (it.spans ?? []).join("|"))]));
const shownNew = (f, regionAddrs) => {
  const gen = f.modes.find((m) => m.role === "generate");
  if (!gen) return [];
  const out = [];
  for (const it of gen.items) {
    const spans = it.spans ?? [];
    if (f.grain === "Ground") out.push(...spans.filter((a) => regionAddrs.has(a)));
    else { const last = spans[spans.length - 1]; if (last && regionAddrs.has(last)) out.push(last); }
  }
  return [...new Set(out)];
};
const jaccardD = (a, b) => { const A = new Set(a), B = new Set(b); const u = new Set([...A, ...B]).size; return u ? 1 - [...A].filter((x) => B.has(x)).length / u : 0; };

const results = { prereg: "native/eval/callimachus/OWN-WORDS-PREREG.md", universe: { essays: FILES, sha256: Object.fromEntries(recs.map((r, i) => [FILES[i], r.entry.text.sha256.slice(0, 12)])) }, memory: { fold: F, unrelated: X, blocks: { fold: WF.length, unrelated: WX.length } }, asks: {} };
const sheet = [`# What is new to you? (blind)\n`, `Two lists per question: **A** and **B**. One is what the fold shows a reader who holds nothing; the other is what it shows *you*. Mark which list contains more that you did not already know, and whether anything in the held list should have been shown. The key is in results.json under \`blind.key\`.\n`];

for (const ask of ASKS) {
  log(`ask: ${ask}`);
  const record = readCorpus(recs, { question: ask, absences: [] });
  const qv = questionVoid(qg.readQuestion(ask, { model }), record);
  const cands = candidatesOf(record, {});
  const p1 = scoreWith(witnesses(cands, { question: qv, record }), ["perception"], cands.length);
  const activation = new Map(cands.map((a, i) => [a.id, p1.s[i]]));
  const region = (await spansFromRecord(record, { slice, activation })).filter((s) => s.activation > 0).sort((a, b) => b.activation - a.activation);
  const regionAddrs = new Set(region.map((s) => s.address));
  const regionBlocks = region.map((s) => ({ b: s.text.replace(/\s+/g, " ").trim(), ref: "region" }));
  const A = { region: region.length, candidates: cands.length, atoms: record.atoms.length, vocab: record.vocab.length, readers: {} };
  const READERS = { R0: null, R2: { verbs: new Set(record.vocab) } };

  for (const [rname, reader] of Object.entries(READERS)) {
    const wFull = (await readW(regionBlocks, reader, record)).map((s) => ({ ...s }));
    const coverage = coverageOf(region, wFull);
    const arm = (name, whomSpans) => {
      const base = foldGrain({ region, whom: whomSpans });
      const mine = foldWithWhom({ region, whom: whomSpans, wFull });
      const heldKeys = new Set(base.contacts.length ? [] : []);
      const hKeys = new Set(whomSpans.map((w) => arrangementOf(w)).filter(Boolean));
      const heldAddr = new Set(region.filter((u) => hKeys.has(arrangementOf(u))).map((u) => u.address));
      const shown = shownNew(mine, regionAddrs);
      return {
        name, claims: whomSpans.length, held: base.distance.held, absent: base.distance.absent, nullReal: base.distance.null.real, nullP: base.distance.null.p,
        gJs: base.grain, mine: mine.grain, margin: mine.selection.margin ?? null, instrumentSilent: !!mine.selection.instrumentSilent, underpowered: !!mine.selection.underpowered,
        shown, shownN: shown.length, leak: mine.grain === "Ground" ? null : shown.filter((a) => heldAddr.has(a)).length,
        standings: mine.standings.counts, propositions: mine.standings.items.length,
        heldStandings: mine.standings.items.filter((i) => i.reader !== "nothing").length,
        both: mine.standings.items.filter((i) => i.record === "both").length,
        refusals: mine.refusals.map((r) => r.code), refused: mine.refused, closed: mine.closure.closed,
        _heldAddr: [...heldAddr],
      };
    };
    const R = { coverage, wFullClaims: wFull.length, arms: {} };
    R.arms.void = arm("void", []);
    R.arms.fold = arm("W_F", await readW(WF, reader, record));
    R.arms.unrelated = arm("W_X", await readW(WX, reader, record));
    R.shuffled = [];
    for (const seed of SHUF_SEEDS) {
      const rnd = mulberry(seed);
      R.shuffled.push(arm(`shuf-${seed}`, await readW(WF.map((x) => ({ ...x, b: shuffleWords(x.b, rnd) })), reader, record)));
    }
    // ---- predictions
    const f = R.arms.fold, x = R.arms.unrelated, v = R.arms.void;
    const sMaxHeld = Math.max(...R.shuffled.map((s) => s.held));
    const dReal = jaccardD(v.shown, f.shown);
    const dShuf = R.shuffled.map((s) => jaccardD(v.shown, s.shown));
    R.predictions = {
      informative: f.claims >= 5,
      O1: { held: f.held, shuffledMax: sMaxHeld, nullReal: f.nullReal, holds: f.claims >= 5 ? f.held > sMaxHeld && f.nullReal : null },
      O2: { fold: f.held, unrelated: x.held, unrelatedNullReal: x.nullReal, holds: f.claims >= 5 ? f.held > x.held && !x.nullReal : null },
      O3: { grain: f.mine, leak: f.leak, gJsGrain: f.gJs, holds: f.mine === "Ground" ? null : f.leak === 0 },
      O4: { dReal, dShufMax: Math.max(...dShuf), holds: f.claims >= 5 ? dReal > Math.max(...dShuf) : null },
      O5: { grains: { void: [v.gJs, v.mine], fold: [f.gJs, f.mine], unrelated: [x.gJs, x.mine] }, shuffledGrains: Object.fromEntries(["Ground", "Figure", "Pattern"].map((g) => [g, [R.shuffled.filter((s) => s.gJs === g).length, R.shuffled.filter((s) => s.mine === g).length]])), margin: f.margin },
      O6: { foldHeldShare: f.propositions ? f.heldStandings / f.propositions : null, unrelatedHeldShare: x.propositions ? x.heldStandings / x.propositions : null, holds: f.propositions && x.propositions ? f.heldStandings / f.propositions > x.heldStandings / x.propositions : null, both: f.both, refusedOrContradicted: (f.standings["held-refuted"] ?? 0) + (f.standings["held-contradicted"] ?? 0) },
    };
    A.readers[rname] = R;

    // the blind sheet, once per ask (R2 if it is informative, else R0)
    if (rname === "R2" || !A.readers.R2) {
      const key = mulberry(sha(ask).charCodeAt(0) * 7919 + 17)() < 0.5 ? "A=void,B=W_F" : "A=W_F,B=void";
      const top = (addrs, n) => region.filter((s) => addrs.includes(s.address)).slice(0, n);
      const list = (spans) => spans.map((s) => `- ${s.text}`).join("\n");
      const vs = top(v.shown, 6), fs = top(f.shown, 6), held = top(f._heldAddr.filter((a) => regionAddrs.has(a)), 6);
      const [first, second] = key.startsWith("A=void") ? [vs, fs] : [fs, vs];
      if (rname === "R2" || !A.sheetDone) {
        sheet.push(`\n## ${ask}\n`, `**A**\n${list(first) || "_(nothing)_"}\n`, `**B**\n${list(second) || "_(nothing)_"}\n`, `**Held by you and so withheld from B (up to 6):**\n${list(held) || "_(nothing held)_"}\n`);
        A.blind = { key, instrument: rname };
        A.sheetDone = true;
      }
    }
  }
  delete A.sheetDone;
  results.asks[ask] = A;
}
// strip private working fields from the stored record
for (const A of Object.values(results.asks)) for (const R of Object.values(A.readers)) { for (const a of Object.values(R.arms)) delete a._heldAddr; for (const a of R.shuffled) delete a._heldAddr; }
writeFileSync(OUT, JSON.stringify(results, null, 1));
writeFileSync(OUT.replace(/\.json$/, ".new-to-you.md"), sheet.join("\n"));
log("wrote", OUT);
const summary = Object.fromEntries(Object.entries(results.asks).map(([k, A]) => [k, { region: A.region, candidates: A.candidates, readers: Object.fromEntries(Object.entries(A.readers).map(([rn, R]) => [rn, { recall: R.coverage.recall, wFullClaims: R.wFullClaims, claims: { fold: R.arms.fold.claims, unrelated: R.arms.unrelated.claims }, predictions: R.predictions }])) }]));
console.log(JSON.stringify(summary, null, 1));
