// reading-in-order.mjs — READ A TEXT IN ORDER, from its dependency trees, with the mechanics khora already has.
//
// How the parts fit the whole is two orders and nothing else: DEPENDENCY ORDER inside a sentence (each word's head) and the
// ARROW OF TIME across sentences (the reading order). So the read is:
//   1. the cut      the reader's own sentence splitter and abbreviations (spans.js splitSentences, read-core abbreviationsFor),
//                   once, in reading order
//   2. the trees    each sentence parsed by the canonical parser (reading.js rowsOfFor: the language's dependency parser and
//                   its kāraka labels, karaka-total.mjs). A sentence's tree depends on that sentence alone, so blocks of
//                   sentences go to a pool of workers (reading-in-order.worker.mjs) and come back to their place in order
//   3. the whole    text-mereology.mjs over the trees in reading order: document > paragraph > sentence > phrase > token,
//                   every part addressed in the source, one kāraka frame per action, coverage measured
// Nothing here rescans the text for a part: no relation hypergraph, no surface patterns, no second parse.
//
// MEASURED (War and Peace, 3.29M characters, 2026-11-23, MacBook Air M3, mains power, exploratory): the canonical door 1,751 s;
// these three steps on one core 115 s before the codec work; with the ud-parser feature index and integer features, the
// compiled index, and the whole folded as the trees arrive, 9.1–9.6 s on 4 workers. Trees identical to the string path
// (whole-book sha256 264f90615b09c6dc); the whole identical to text-mereology over the same parse (09cc903184ba0d96).
//
// THE CAST, in reading order off the trees (referents-in-order.mjs): every name mention joins the one being it can be, with every
// written form and the pro-forms its own clauses bind to it; each being woven into pharos (kind `referent`).
// NOT YET IN THIS READ (typed gaps, never silent): referents that are not names (noun phrases), pronouns bound across clauses,
// the gender prior, polarity, containment edges and the competency profile — the canonical door's other passes. They belong on top of these trees, in
// reading order (each clause against what was read before it), not beside them.
import os from "node:os";
import { Worker } from "node:worker_threads";
import { execFileSync } from "node:child_process";
import { splitSentences } from "./adapters/text/spans.js";
import { priorsFor, abbreviationsFor } from "./the-fold/read-core.mjs";
import { mereologyBuilder } from "./adapters/text/text-mereology.mjs";
import { proformsOfParse } from "./adapters/text/gender-from-corpus.js";
import { referentsInOrder } from "./adapters/text/referents-in-order.mjs";
import { classifyWord } from "./adapters/text/wordclass.js";
import { refuseUnlessFull, recordAct, weaveReferents } from "./the-fold/pharos-gate.mjs";

// How many eyes: the PERFORMANCE cores. Measured 2026-11-23 on an Apple M3 (4 performance + 4 efficiency cores), War and Peace:
// 4 workers 40.8 s, 7 workers 63.7 s — efficiency cores and seven model loads contend more than they parse. Where the
// machine does not say, all cores but one.
export function defaultWorkers() {
  if (process.platform === "darwin") { try { const n = Number(execFileSync("sysctl", ["-n", "hw.perflevel0.physicalcpu"], { encoding: "utf8" }).trim()); if (n > 0) return n; } catch { /* not an Apple-silicon machine */ } }
  return Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1);
}

export const NOT_YET = Object.freeze(["nominal_referents", "pronoun_bindings", "gender_prior", "polarity", "containment", "competency"]);

// WRITES TO PHAROS like the door (rules WRITES-TO-PHAROS, FULL-CAPACITY): what this read USES is the trees (clause-reader)
// and the pro-forms they bind (proform-agreement); the language's other capacities (pronoun binding, the name and
// non-personal rulings, the priors) are not in it yet, so a caller must say allowDegraded: true, and the entry is marked
// degraded with what was left out. Refused BEFORE reading, never after.
const DOOR = "native/reading-in-order.mjs#readInOrder", USED = Object.freeze(["clause-reader", "proform-agreement"]);

/** readInOrder(text, { stem, workers, block, allowDegraded }) → { schema, stem, parseBy, sentences, parse, mereology, proforms, gaps, timing } */
export async function readInOrder(text, { stem = "eng", workers = defaultWorkers(), block = 120, allowDegraded = false } = {}) {
  refuseUnlessFull({ door: DOOR, stem, used: [...USED], allowDegraded });
  const T = {}; let t = performance.now(); const lap = (k) => { const n = performance.now(); T[k] = Math.round(n - t); t = n; };
  const src = String(text ?? "");
  const gaps = NOT_YET.map((x) => ({ gap: `not_in_ordered_read:${x}` }));
  // the eyes come up while the cut is made
  const pool = Array.from({ length: workers }, () => new Worker(new URL("./reading-in-order.worker.mjs", import.meta.url), { workerData: { stem } }));
  const ready = Promise.all(pool.map((w) => new Promise((res, rej) => { w.once("message", res); w.once("error", rej); })));
  // 1. the cut, in reading order (the splitter reads newline-normalised text; offsets are mapped back to the source)
  const pr = priorsFor(stem), abbr = abbreviationsFor(src, { priors: pr, aliases: [], abbreviations: null });
  const crBefore = []; { let n = 0; for (let i = 0; i < src.length; i++) { if (src.charCodeAt(i) === 13 && src.charCodeAt(i + 1) === 10) n++; else crBefore.push(n); } }
  const norm = src.split("\r\n").join("\n");
  const cuts = splitSentences(norm, { abbreviations: abbr.set });
  const toSource = (o) => o + (crBefore[o] ?? crBefore[crBefore.length - 1] ?? 0);
  const sentences = cuts.map((c, order) => ({ text: c.text, offset: toSource(c.offset), order }));
  lap("cut");
  const hello = await ready;
  lap("eyes");
  const parseBy = hello[0]?.by ?? null;
  if (hello[0]?.gap) gaps.push({ gap: "no_parser", detail: hello[0].gap });
  // 2. the trees: blocks of sentences to whichever worker is free; each block comes back to its place, and the whole is folded
  //    IN READING ORDER as soon as every sentence before a point has arrived (the arrow of time: sentence k joins the whole
  //    after sentences 0..k-1, never before)
  const rowsOf = new Array(sentences.length).fill(null), arrived = new Uint8Array(sentences.length);
  const whole = mereologyBuilder(src), parse = [];
  let folded = 0;
  const fold = () => {
    while (folded < sentences.length && arrived[folded]) {
      const sn = sentences[folded], r = rowsOf[folded];
      if (Array.isArray(r) && r.length) { const p = { order: sn.order, offset: sn.offset, text: sn.text, rows: r }; parse.push(p); whole.add(p); }
      else if (r?.failed) gaps.push({ gap: "parse_failed", detail: `sentence ${sn.order}: ${r.failed}` });
      folded++;
    }
  };
  let next = 0, workerParseMs = 0;
  await Promise.all(pool.map((w) => new Promise((resolve, reject) => {
    const feed = () => {
      if (next >= sentences.length) { resolve(); return; }
      const id = next; next = Math.min(sentences.length, next + block);
      w.postMessage({ id, texts: sentences.slice(id, next).map((s) => s.text) });
    };
    w.on("message", ({ id, out, ms }) => { if (out) { workerParseMs += ms ?? 0; out.forEach((r, k) => { rowsOf[id + k] = r; arrived[id + k] = 1; }); feed(); fold(); } });
    w.on("error", reject);
    feed();
  })));
  await Promise.all(pool.map((w) => w.terminate()));
  fold();
  lap("trees (folded into the whole as they arrive)");
  // 3. the whole: closed once every sentence is in (coverage, unread characters, gaps)
  const mereology = whole.finish();
  lap("whole");
  const proforms = proformsOfParse(parse);
  // a title is a word the POS prior says is mostly a common noun (the door's own test for the cast, read-core castIdentity)
  const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
  const cast = referentsInOrder(parse, { commonNoun });
  lap("proforms and cast");
  const timing = { ...T, totalMs: Object.values(T).reduce((a, b) => a + b, 0), workerParseMs: Math.round(workerParseMs) };
  const act = recordAct({ door: DOOR, text: src, stem, parse, used: [...USED], allowDegraded, body: { sentences: sentences.length, parsed: parse.length, parseBy, proforms: Object.keys(proforms).length, referents: cast.referents.length, nameMentions: cast.mentions, contestedLinks: cast.contested, gaps: [...new Set(gaps.map((g) => g.gap))].slice(0, 20), totalMs: timing.totalMs } });
  const woven = act ? weaveReferents({ text: src, referents: cast.referents }) : 0;
  return { schema: "OrderedRead@1", stem, parseBy, workers, sentences, parse, mereology, proforms, cast, gaps, timing, pharos: act ? { addr: act.addr ?? null, degraded: allowDegraded, referentsWoven: woven } : null };
}
