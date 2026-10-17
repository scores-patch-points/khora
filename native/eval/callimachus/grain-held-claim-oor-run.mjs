#!/usr/bin/env node
// eval/callimachus/grain-held-claim-oor-run.mjs — GRAIN-HELD-CLAIM-PREREG.md Amendment 2 (Q1-Q4), COMMITTED BEFORE IT IS RUN, COMMITTED BEFORE IT IS RUN.
//
//   node native/eval/callimachus/grain-held-claim-oor-run.mjs --essays <dir with the .md essays> --memory <memory dir> --out <results.json>
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
import { arrangementOf, foldGrain, spansFromRecord, splitRegion } from "../../organs/grain.js";
import { execSync } from "node:child_process";
import { foldWithWhom, verifyFold } from "../../organs/whom-standing.js";
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
if (!ESSAYS || !MEMORY || !OUT) { console.error("usage: grain-held-claim-oor-run.mjs --essays <dir> --memory <dir> --out <results.json>"); process.exit(2); }

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




const universe = [...new Map([...R1, ...R2].map((s) => [s.id, s])).values()];
const off = mindOf({ question: ASKS[1], region: R2, universe, trail });
const on = mindOf({ question: ASKS[1], region: R2, universe, trail, includeOutOfRegion: true });
const regionAddr = new Set(R2.map((x) => x.address));
const shownOf = (f) => new Set(newOf(f));
const fClm = foldGrain({ region: R2, whom: on.whom, held: "claim" });
const fArr = foldGrain({ region: R2, whom: on.whom, held: "arrangement" });
const fClmOff = foldGrain({ region: R2, whom: off.whom, held: "claim" });
const wAddrOn = new Set(on.whom.map((w) => w.address));
const contacts = (f, only) => JSON.stringify(f.contacts.filter((c) => only.has(c.w)).map((c) => [c.w, c.case]).sort());
const inRegionW = new Set(off.whom.map((w) => w.address));
const heldClm = new Set(R2.filter((u) => !(fClm.related ?? []).some((r) => r.address === u.address) && !fClm.distance.held ? false : false).map((u) => u.address));
const relOn = fClm.related ?? [];
const aboutOutOfRegion = relOn.filter((r) => r.about.some((a) => !regionAddr.has(a))).length;
const out = {
  ladder: { khoraHead: execSync("git rev-parse HEAD", { cwd: here }).toString().trim() },
  counts: { whomOff: off.whom.length, whomOn: on.whom.length, outOfRegion: on.counts.outOfRegion },
  Q1: { related: relOn.length, kinds: relOn.reduce((c, r) => ((c[r.kind] = (c[r.kind] ?? 0) + 1), c), {}), aboutOutOfRegion, allAbout: relOn.every((r) => r.about.length > 0), holds: relOn.length === 8 && relOn.every((r) => r.kind === "same-subject-predicate") && relOn.every((r) => r.about.length > 0) },
  Q2: { claimHeldOn: fClm.distance.held, claimHeldOff: fClmOff.distance.held, shownOn: shownOf(fClm).size, grain: fClm.grain, leak: fClm.grain === "Ground" ? null : [...shownOf(fClm)].filter((a) => wAddrOn.has(a)).length, contactsSameInRegion: contacts(fClm, inRegionW) === contacts(fClmOff, inRegionW), holds: fClm.distance.held === 21 && shownOf(fClm).size === 156 && fClm.grain === "Figure" },
  Q3: { arrangementHeld: fArr.distance.held, arrangementShown: shownOf(fArr).size, previousSeenRun: { withheld: 29, shown: 148 }, holds: fArr.distance.held === 29 && shownOf(fArr).size === 148 },
  Q4: { defaultSpans: off.whom.length, run12Spans: 21, holds: off.whom.length === 21 },
  null: { claim: { held: fClm.distance.held, mean: fClm.distance.null.mean, exceeded: fClm.distance.null.exceeded, p: fClm.distance.null.p, real: fClm.distance.null.real }, arrangement: { held: fArr.distance.held, mean: fArr.distance.null.mean, exceeded: fArr.distance.null.exceeded, p: fArr.distance.null.p, real: fArr.distance.null.real } },
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
log("wrote", OUT);
console.log(JSON.stringify(out, null, 1));
