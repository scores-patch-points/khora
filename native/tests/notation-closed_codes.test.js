// tests/notation-closed_codes.test.js — the closed_codes INSTRUMENT is regression-guarded on a toy fixture, and the
// ADAPTER is pinned on facts the givers state. Nothing here measures the reader on held-out data
// (eval/notation-competence/closed_codes.mjs does that, against /private/tmp/.../corpus).
//
//  * a PERFECT reader (answers from the toy truth) scores 1 on every rung and passes;
//  * a DERANGED reader (answers wrong) scores low and fails;
//  * every control is built to fail: licensed controls score low against the perfect reader, an unlicensed control is
//    reported but never gates, and a licensed control that matches the real arm FAILS the sub (control_matches_real);
//  * AMENDMENT 1: the table-aware alternative readers (script+lexicon, table membership, token-count-matched) are licensed controls,
//    a perfect-scoring alternative reader GATES (it is not exempt), a lookahead mutant is caught by the R0 causal gate, the
//    hard decoy tier / heavy-noise forms / table-determined statuses are typed, and the original PRE-REGISTRATION hash is pinned;
//  * the plumbing never throws for missing data (typed gap, pass null); the leak check forces pass=false;
//  * R3/R4 are typed not-applicable; the pre-registration hash is stamped and re-computable;
//  * the adapter reads facts of the standards (SOS, the ITU signs, UEB numeric mode, ICAO words), REFUSES a token the
//    giver does not carry, hands the plaintext off (beings/relations empty by kind), and is prefix-consistent.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as I from "../eval/notation-competence/closed_codes.mjs";
import * as A from "../adapters/notation/closed_codes.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── toy encoders (independent of the adapter and of the Python gold encoder; subset alphabet, typed here) ─────────────
const MORSE = { A: ".-", E: ".", I: "..", M: "--", N: "-.", O: "---", S: "...", T: "-" };
const BRAILLE = { a: "⠁", e: "⠑", i: "⠊", m: "⠍", n: "⠝", o: "⠕", s: "⠎", t: "⠞" };
const CAP = "⠠";
const NATO = { A: "Alfa", E: "Echo", I: "India", M: "Mike", N: "November", O: "Oscar", S: "Sierra", T: "Tango" };
const TEXTS = ["Moon Seat Time", "Team Note Stone", "Steam Tone Same", "Mean Mint Sent", "Sea Moat Note", "Noise Stone Mime", "Tea Nest Mist", "Mist Aeon Some"];   // >= 3 words (run-on forms need nMin=3 tokens); capitalised so Braille lexemes are not all single cells

function morseForm(text, { wordgap = " / ", unspaced = false, noisyEvery = 0 } = {}) {
  const words = text.split(" "); let out = ""; const toks = []; const uwords = [];
  words.forEach((w, wi) => {
    if (wi) { const a = wordgap.indexOf("/") >= 0 ? wordgap.indexOf("/") : 0, b = wordgap.indexOf("/") >= 0 ? a + 1 : wordgap.length; toks.push({ s: out.length + a, e: out.length + b, cls: "wordgap", value: " " }); out += wordgap; }
    if (unspaced) { const sigs = [...w.toUpperCase()].map((c) => MORSE[c]); out += sigs.join(""); uwords.push({ word: w.toUpperCase(), letters: [...w.toUpperCase()], sigs }); return; }
    [...w.toUpperCase()].forEach((c, ci) => {
      if (ci) out += " ";
      let sig = MORSE[c], cls = "letter";
      if (noisyEvery && (toks.length + 1) % noisyEvery === 0) { sig = "......"; cls = "unassigned"; }
      toks.push({ s: out.length, e: out.length + sig.length, cls, value: c, signal: sig }); out += sig;
    });
  });
  return { text: out, truth: unspaced ? uwords : toks };
}
function keylogForm(text, T0 = 60, sigma = 0) {
  const parts = []; const toks = []; let k = 0;
  const jit = (r) => Math.max(1, Math.round(r * T0 * (1 + sigma * Math.sin(++k * 1.7))));
  const words = text.toUpperCase().split(" ");
  words.forEach((w, wi) => {
    [...w].forEach((c, li) => {
      const sig = MORSE[c];
      [...sig].forEach((sym, ei) => {
        const ms = jit(sym === "." ? 1 : 3); parts.push(`+${ms}`); toks.push({ sign: "+", ms, cls: sym === "." ? "dit" : "dah" });
        if (ei < sig.length - 1) { const g = jit(1); parts.push(`-${g}`); toks.push({ sign: "-", ms: g, cls: "intra" }); }
      });
      if (li < w.length - 1) { const g = jit(3); parts.push(`-${g}`); toks.push({ sign: "-", ms: g, cls: "letter" }); }
    });
    if (wi < words.length - 1) { const g = jit(7); parts.push(`-${g}`); toks.push({ sign: "-", ms: g, cls: "word" }); }
  });
  return { text: parts.join(" "), truth: { tokens: toks, T0_ms: T0, sigma } };
}
function brailleForm(text, blank, noisy = false) {
  const cells = []; const push = (cell, role, ls) => cells.push({ cell, role, lexeme_start: ls });
  text.split(" ").forEach((w, wi) => {
    if (wi) push(blank, "space", true);
    [...w].forEach((c) => { const up = c !== c.toLowerCase(); if (up) push(CAP, "capital_indicator", true); push(BRAILLE[c.toLowerCase()], "letter", !up); });
  });
  if (noisy) { const i = cells.findIndex((c, k) => c.role === "letter" && k > 3); cells[i] = { cell: "⠿", role: "unassigned", lexeme_start: cells[i].lexeme_start }; }
  return { text: cells.map((c) => c.cell).join(""), truth: cells.map((c, i) => ({ s: i, e: i + 1, role: c.role, lexeme_start: c.lexeme_start })) };
}
function natoForm(text, { concat = false, noisy = false } = {}) {
  let out = ""; const toks = []; let first = true; let nWord = 0;
  text.toUpperCase().split(" ").forEach((w) => {
    if (!first) { toks.push({ s: out.length + 1, e: out.length + 2, cls: "wordgap", value: " " }); out += " / "; }
    first = false;
    [...w].forEach((c, ci) => {
      if (ci && !concat) out += " ";
      let word = NATO[c], cls = "letter";
      if (noisy && (++nWord) % 7 === 0) { word = "Xqzv"; cls = "unassigned"; }
      toks.push({ s: out.length, e: out.length + word.length, cls, value: c, word }); out += word;
    });
  });
  return { text: out, truth: toks };
}
function toyCorpus() {
  const units = TEXTS.map((text, k) => {
    const forms = {}, truth = {};
    const put = (name, r) => { forms[name] = r.text; truth[name] = r.truth; };
    put("morse_spaced", morseForm(text)); put("morse_ws", morseForm(text, { wordgap: "   " })); put("morse_unspaced", morseForm(text, { unspaced: true }));
    put("morse_spaced_noisy", morseForm(text, { noisyEvery: 3 }));
    put("keylog_s0", keylogForm(text, 60 + 3 * k, 0)); put("keylog_s15", keylogForm(text, 60 + 3 * k, 0.15)); put("keylog_s30", keylogForm(text, 60 + 3 * k, 0.3));
    const blank = k % 2 ? " " : "⠀";
    put("braille", brailleForm(text, blank)); put("braille_noisy", brailleForm(text, blank, true));
    put("nato", natoForm(text)); put("nato_concat", natoForm(text, { concat: true })); put("nato_noisy", natoForm(text, { noisy: true }));
    return { id: `toy:${k}`, source: k < 4 ? "toyA" : "toyB", split: "dev", text, alnum: text.toUpperCase().replace(/[^A-Z0-9 ]/g, ""), forms, truth };
  });
  const kinds = ["prose", "prose_ellipsis_dash", "rules", "noise_dotdash", "binary", "hex", "dna", "unicode_pattern", "pseudo_nato"];
  const samples = { prose: "the quick brown fox jumps over", prose_ellipsis_dash: "well ... I -- suppose so ...", rules: "------------------ ============ ************", noise_dotdash: ".-.-..- ..---.-. -..--.-- .-.-.-.- ---..--.", binary: "01101000 01100101 01101100 01101100", hex: "68 65 6c 6c 6f 20 77", dna: "ACG TTA GCA TGC AAT", unicode_pattern: "█▓ ▒░ █▓ ▒░", pseudo_nato: "Qxlmv Brtuz Hhgsd Jwpqa Plmnr" };
  const decoys = kinds.flatMap((kind) => [0, 1].map((i) => ({ id: `decoy:dev:${kind}:${i}`, kind, text: samples[kind] + " ".repeat(0) + (i ? " again" : ""), authored: true })));
  // the HARD tier (A4): gated kinds the reader must refuse, and one ambiguous-by-construction kind that is reported, never gated
  const hardSamples = { braille_outside_inventory: ["⡵⢙⣲⣣ ⡦⠯⡡⡐⡔ ⣙⣰⣗⡕", "⢝⡢⢸⠌ ⢍⢶⡩⢳⣒ ⡢⡙⡘⡈"], prose_embeds_nato_words: ["the Alfa of Echo went home today", "my Mike was in the old house"], dotdash_short_unassigned: ["..-- .-.- ---. ----", "---. ---. ..-- .-.-"], dotdash_short_valid_gibberish: ["... .. . .-", "-- - .. ..."] };
  for (const [kind, texts] of Object.entries(hardSamples)) texts.forEach((text, i) => decoys.push({ id: `decoy:dev:hard:${kind}:${i}`, kind, tier: "hard", gated: kind !== "dotdash_short_valid_gibberish", text, authored: true }));
  return { split: "dev", units, decoys, manifest: { units: { dev: units.length } } };
}

// ── a fake reader that answers FROM THE TOY TRUTH (perfect), or wrongly (deranged) ───────────────────────────────────
const brailleClass = (r) => (r === "punctuation_in_number" ? "punctuation" : r);
function truthReader(corpus, { wrong = false, trainSources = ["pretrain"], selfDerange = false, nCommit = 3, lookahead = false } = {}) {
  const byText = new Map(); const decoyTexts = new Set(corpus.decoys.map((d) => d.text));
  const tokOf = (text, name, truth) => {
    if (name.startsWith("keylog")) { let pos = 0; return truth.tokens.map((t) => { const s = text.indexOf(t.sign + t.ms, pos); pos = s + String(t.ms).length + 1; return { start: s, end: pos, text: t.sign + t.ms, kind: "run", sign: t.sign, ms: t.ms, class: t.cls, element: t.sign === "+" ? t.cls : undefined, gap: t.sign === "-" ? t.cls : undefined, open: false }; }); }
    if (name === "morse_unspaced") { const toks = []; let pos = 0; truth.forEach((w, i) => { if (i) { const s = text.indexOf("/", pos); toks.push({ start: s, end: s + 1, text: "/", class: "wordgap", value: " ", open: false }); pos = s + 1; } const run = w.sigs.join(""); const s = text.indexOf(run, pos); toks.push({ start: s, end: s + run.length, text: run, class: "word", value: w.word, open: false }); pos = s + run.length; }); return toks; }
    if (name.startsWith("braille")) return truth.map((t) => ({ start: t.s, end: t.e, text: text[t.s], class: brailleClass(t.role), value: "", lexemeStart: !!t.lexeme_start, open: false }));
    return truth.map((t) => ({ start: t.s, end: t.e, text: text.slice(t.s, t.e), class: t.cls, value: t.value, open: false }));
  };
  for (const u of corpus.units) for (const [name, text] of Object.entries(u.forms)) byText.set(text, { name, unit: u, tokens: tokOf(text, name, u.truth[name]) });
  for (const u of corpus.units) for (const name of I.R0_HEAVY) { const t = I.heavyText(u, name); if (t != null && !byText.has(t)) byText.set(t, { name, unit: u, tokens: [] }); }   // heavy-noise forms are R0 streams (A4); a short toy stream may escape corruption and equal its base form: keep the base
  const sys = (name) => (name.startsWith("braille") ? "braille" : name.startsWith("nato") ? "nato" : "morse");
  const degraded = (ab) => !!ab && ["tempo", "thresholds", "lmOrder", "unspaced", "chunk", "contextFree"].some((k) => ab[k] !== undefined);
  const R = {
    name: wrong ? "wrong" : "perfect",
    listen(text) {
      let hit = byText.get(text); let isKnown = hit !== undefined || decoyTexts.has(text);
      if (!isKnown) { for (const [t, h] of byText) if (t.startsWith(text)) { hit = h; isKnown = true; break; } if (!isKnown) for (const d of decoyTexts) if (d.startsWith(text)) { isKnown = true; break; } }
      if (selfDerange || wrong) return { verdict: wrong ? (hit ? "none" : "morse") : "none", first: 3, trace: [], llr: null };
      // an honest, causal reader that answers from the toy truth once nCommit tokens have been seen; trace has one entry per token
      const sysName = hit ? sys(hit.name) : "none";
      const trace = []; let n = 0, first = null;
      for (const t of A.tokenize(text)) {
        if (t.text === "/") { trace.push({ n, verdict: trace.length ? trace[trace.length - 1].verdict : null }); continue; }
        n++;
        const v = n >= nCommit ? sysName : null; if (v !== null && first === null) first = n;
        const llr = sysName === "none" ? { morse: v ? -9 : 0, braille: v ? -9 : 0, nato: v ? -9 : 0 } : { morse: 0, braille: 0, nato: 0, ...(v ? { [sysName]: 20 } : {}) };
        trace.push({ n, verdict: v, llr });
      }
      if (lookahead && trace.length) { const fin = trace[trace.length - 1]; for (const e of trace) if (e.n >= 1) { e.verdict = fin.verdict; if (fin.llr) e.llr = { ...fin.llr }; } }   // MUTANT: every entry reports the whole-stream final answer
      const last = trace.length ? trace[trace.length - 1] : { verdict: null, llr: null };
      return { verdict: last.verdict, first, trace, llr: last.llr };
    },
    ear(text, { system, ablate } = {}) {
      const hit = byText.get(text);
      if (!hit || wrong) return { system: system || null, form: null, tokens: [], units: [], gaps: [] };
      if (degraded(ablate)) return { system, form: null, tokens: hit.tokens.map((t) => ({ ...t, class: "unassigned", gap: hit.name.startsWith("keylog") ? "intra" : t.gap, element: t.element, lexemeStart: false, value: "?" })), units: [], gaps: [] };
      return { system, form: null, tokens: hit.tokens, units: [], gaps: [] };
    },
    read(text) {
      const hit = byText.get(text);
      if (!hit || wrong) return { system: null, form: null, decoded: { text: "?" } };
      return { system: sys(hit.name), form: "x", decoded: { text: hit.unit.alnum } };
    },
    stat: { runLogProb: () => -10 },
    priorsInfo: () => ({ train_sources: trainSources }),
  };
  R.derange = (kinds, seed) => (selfDerange ? R : (() => { const w = truthReader(corpus, { wrong: true }); w.stat = { runLogProb: () => -40 }; return w; })());
  return R;
}

// ── instrument: arithmetic ──────────────────────────────────────────────────────────────────────────────────────────
test("sign test: exact one-sided, ties dropped", () => {
  assert.ok(Math.abs(I.signTestP(8, 0) - 1 / 256) < 1e-9);
  assert.ok(Math.abs(I.signTestP(5, 0) - 1 / 32) < 1e-12);
  assert.equal(I.signTestP(0, 0), 1);
  assert.ok(I.signTestP(3, 3) > 0.5);
  const t = I.pairedSign([1, 1, 1, 0, 1], [0, 0, 0, 0, 1]);
  assert.deepEqual([t.wins, t.losses, t.ties], [3, 0, 2]);
});
test("macro-F1 ignores classes below support, levenshtein/sim behave", () => {
  const pairs = [["a", "a"], ["a", "a"], ["a", "b"], ["b", "b"], ["b", "b"], ["b", "b"], ["c", "c"]];
  const m = I.macroF1(pairs, 2);
  assert.deepEqual(Object.keys(m.per).sort(), ["a", "b"]);
  assert.ok(m.f1 > 0.7 && m.f1 < 1);
  assert.equal(I.lev("kitten", "sitting"), 3);
  assert.equal(I.sim("abc", "abc"), 1);
  assert.equal(I.sim("abc", "xyz"), 0);
});
test("pre-registration hash is stamped and re-computable; the block names its own rules", () => {
  const h = I.preregSha256();
  assert.match(h, /^[0-9a-f]{64}$/);
  const src = fs.readFileSync(path.join(HERE, "../eval/notation-competence/closed_codes.mjs"), "utf8");
  assert.ok(src.includes("PRE-REGISTRATION (FOLD-CONSTITUTION II.5)"));
  for (const must of ["CONTROLS, BUILT TO FAIL", "PASS RULE", "PREDICTIONS", "LICENCE", "TAUTOLOGY FLOOR", "NOT CLAIMED / TYPED GAPS"]) assert.ok(src.includes(must), must);
});

// ── instrument: perfect reader scores 1, deranged control low ───────────────────────────────────────────────────────
// the table-aware alternative readers (A2) read the GIVER tables; handing them a DERANGED giver makes them unable to read the toy
// streams, so a perfect reader can beat them (a plumbing test of the pass path). The true giver is tested next, where they match.
const derangedGiver = () => { let raw = A.loadRawPriors(); for (const k of ["morse_table", "braille_table", "nato_lexicon"]) raw = I.derangeRaw(raw, k, 7); raw.morse.signals = raw.morse.signals.map((x) => ({ ...x, signal: x.signal + "." })); return raw; };   // a re-dealt table that cannot read the toy streams (within-length re-dealing alone keeps every <=3-symbol letter readable)
test("a PERFECT reader scores 1 on every rung and passes; the controls built to fail are low", () => {
  const corpus = toyCorpus();
  const out = I.measureWith({ corpus, reader: truthReader(corpus), split: "dev", giver: derangedGiver() });
  assert.equal(out.family, "closed_codes");
  const { r0, r1, r2, r3, r4, r5 } = out.rungs;
  assert.equal(r0.score, 1);
  assert.equal(r0.details.decoy_false_alarm, 0);
  for (const [name, c] of Object.entries(r0.controls)) assert.ok(c < 0.9, `${name} ${c}`);
  assert.equal(r0.pass, true, JSON.stringify(r0.notes));
  for (const k of ["r1a", "r1b", "r1c", "r1d"]) assert.equal(r1.details.subs[k].score, 1, k);
  for (const k of ["r2a", "r2b", "r2c"]) assert.equal(r2.details.subs[k].score, 1, k);
  assert.ok(r5.score > 0.999);
  assert.ok(r1.control < 0.9 && r2.control < 0.9 && r5.control < 0.9, JSON.stringify({ r1: r1.controls, r2: r2.controls, r5: r5.controls }));
  assert.equal(r1.pass, true, JSON.stringify(r1.notes));
  assert.equal(r2.pass, true, JSON.stringify([r2.notes, r2.details.subs.r2a.tests, r2.details.subs.r2a.per_class]));
  assert.equal(r5.pass, true, JSON.stringify(r5.notes));
  assert.equal(r3.applicable, false); assert.equal(r4.applicable, false);
  assert.match(r3.details.reason, /no beings/); assert.match(r4.details.reason, /no relations/);
  for (const r of Object.values(out.rungs)) { assert.equal(r.details.prereg_sha256, I.preregSha256()); assert.ok("controls" in r && "gaps" in r && "notes" in r && "details" in r); assert.equal(r.id, `closed_codes.${r.rung}`); }
  assert.ok(r1.gaps.some((g) => /semaphore/.test(g.reason)) && r0.gaps.some((g) => /keylog_identification/.test(g.reason)));
});
test("a DERANGED reader scores low and does not pass", () => {
  const corpus = toyCorpus();
  const out = I.measureWith({ corpus, reader: truthReader(corpus, { wrong: true }), split: "dev" });
  assert.ok(out.rungs.r0.score < 0.5);
  assert.notEqual(out.rungs.r0.pass, true);
  assert.notEqual(out.rungs.r1.pass, true);
  assert.notEqual(out.rungs.r2.pass, true);
  assert.ok(out.rungs.r1.score < 0.5 && out.rungs.r2.score < 0.5);
  assert.ok(out.rungs.r5.score < 0.6);
});
test("a licensed control that matches the real arm FAILS the sub (control_matches_real: instrument or mechanism broken)", () => {
  const corpus = toyCorpus();
  const out = I.measureWith({ corpus, reader: truthReader(corpus, { selfDerange: true }), split: "dev", giver: derangedGiver() });
  // every deranged arm IS the real arm now: perturbation controls are unlicensed (the statistic did not move) and never gate;
  // the alternative-reader controls stay licensed. Inject a matching alternative control directly through judgeSub's rule:
  const r0 = out.rungs.r0;
  const lic = r0.details.controls_detail;
  assert.equal(lic.inventory_deranged.licensed, false, "an unperturbed 'deranged' arm must not be licensed");
  assert.ok(String(lic.inventory_deranged.why).includes("did not lower the statistic"));
  // control equal to the real arm, licensed as an alternative reader: simulate with a reader whose alphabet-only twin is the SUT
  const same = truthReader(corpus);
  same.listen = (t) => I.alphabetOnlyVerdict ? { ...I.alphabetOnlyVerdict(t), first: 3, trace: [], llr: null } : null;
  const out2 = I.measureWith({ corpus, reader: same, split: "dev", giver: derangedGiver() });
  // the SUT here IS the alphabet-only reader: the control equals the real arm -> margin 0 -> the sub must fail
  assert.equal(out2.rungs.r0.pass, false);
  assert.ok(out2.rungs.r0.notes.some((n) => /control_matches_real:alphabet_only/.test(n)), JSON.stringify(out2.rungs.r0.notes));
});
test("AMENDMENT 1 A1: an alternative-reader control that scores ~1 is LICENSED and GATES (it is not exempt); table readers type the sub table_determined", () => {
  const real = Array(20).fill(1);
  const mk = (name) => I.judgeSub({ name: "x", score: 1, floor: 0.9, realUnits: real, controls: { [name]: { score: 1, values: real.slice(), ...I.licenceAlt(1) } } });
  const a = mk("alphabet_only");
  assert.equal(a.licensed.includes("alphabet_only"), true, "perfect control is licensed");
  assert.equal(a.pass, false); assert.equal(a.status, "control_matches_real");
  assert.ok(a.notes.some((n) => /^control_matches_real:alphabet_only/.test(n)));
  const t = mk("table_lookup");
  assert.equal(t.pass, false); assert.equal(t.status, "table_determined");
  assert.ok(t.notes.some((n) => /^table_determined:table_lookup/.test(n)));
  assert.equal(I.licenceAlt(1).cannot_fail, true); assert.equal(I.licenceAlt(0.4).cannot_fail, false); assert.equal(I.licenceAlt(null).licensed, false);
  // a weak control cannot hide a strong one: the strongest licensed control binds
  const weak = I.judgeSub({ name: "y", score: 1, floor: 0.9, realUnits: real, controls: { majority: { score: 0.2, values: Array(20).fill(0), ...I.licenceAlt(0.2) }, table_lookup: { score: 1, values: real.slice(), ...I.licenceAlt(1) } } });
  assert.equal(weak.control, 1); assert.equal(weak.pass, false);
  const ok = I.judgeSub({ name: "z", score: 1, floor: 0.9, realUnits: real, controls: { majority: { score: 0.2, values: Array(20).fill(0), ...I.licenceAlt(0.2) } } });
  assert.equal(ok.pass, true); assert.equal(ok.status, "pass");
});
test("AMENDMENT 1 A2: against the TRUE giver the table-membership baseline reads the toy streams as well as a perfect reader: R0 is control_matches_real / table_determined", () => {
  const corpus = toyCorpus();
  const out = I.measureWith({ corpus, reader: truthReader(corpus), split: "dev", giver: A.loadRawPriors() });
  const r0 = out.rungs.r0;
  for (const k of ["script_lexicon_baseline", "table_membership_baseline", "script_lexicon_prefix_matched", "table_membership_prefix_matched"]) assert.ok(k in r0.controls, k);
  assert.ok(r0.details.sub.licensed.includes("table_membership_baseline"));
  assert.equal(r0.pass, false, JSON.stringify(r0.notes));
  assert.equal(r0.details.status, "table_determined");
  assert.ok(r0.notes.some((n) => /control_matches_real:(table_membership|script_lexicon)/.test(n)));
  assert.ok(r0.details.baseline_dose_curves.table_membership_baseline.dose["0.8"] != null, "the dose curve over the declared tau grid is reported");
  // and without any giver the instrument cannot license R0 at all (strawmen only): pass is null, typed
  const none = I.measureWith({ corpus, reader: truthReader(corpus), split: "dev", giver: null });
  assert.equal(none.rungs.r0.pass, null); assert.ok(none.rungs.r0.notes.some((n) => /no giver tables/.test(n)));
  for (const k of ["r1", "r2"]) assert.notEqual(none.rungs[k].pass, true, `${k}: a table-only control that could not be built forbids pass`);
});
test("AMENDMENT 1 A3: the R0 causal gate passes an honest reader and CATCHES a lookahead mutant; latency is to the first correct STABLE verdict", () => {
  const corpus = toyCorpus();
  const honest = I.measureWith({ corpus, reader: truthReader(corpus), split: "dev", giver: derangedGiver() });
  assert.equal(honest.rungs.r0.details.causal.violations, 0, JSON.stringify(honest.rungs.r0.details.causal.examples));
  assert.ok(honest.rungs.r0.details.causal.checked > 100, "the gate really checked prefixes");
  assert.equal(honest.rungs.r0.pass, true, JSON.stringify([honest.rungs.r0.notes, honest.rungs.r0.details.sub.tests]));
  assert.equal(honest.rungs.r0.details.median_latency_tokens, 3);
  const mutant = I.measureWith({ corpus, reader: truthReader(corpus, { lookahead: true }), split: "dev", giver: derangedGiver() });
  assert.ok(mutant.rungs.r0.details.causal.violations > 0, "a reader whose k-th verdict depends on later tokens must violate the gate");
  assert.equal(mutant.rungs.r0.pass, false);
  assert.ok(mutant.rungs.r0.notes.some((n) => /causality violation/.test(n)));
  assert.ok(mutant.rungs.r0.details.score === undefined && mutant.rungs.r0.score > 0.9, "the mutant scores high on accuracy: only the causal gate stops it");
  // stableCorrect: earliest index from which every later verdict is gold; a late flip resets it; a wrong final verdict is null
  assert.deepEqual(I.stableCorrect([{ n: 1, verdict: null }, { n: 2, verdict: "morse" }, { n: 3, verdict: "none" }, { n: 4, verdict: "morse" }, { n: 5, verdict: "morse" }], "morse"), { j: 3, n: 4 });
  assert.equal(I.stableCorrect([{ n: 1, verdict: "morse" }, { n: 2, verdict: "none" }], "morse"), null);
  assert.deepEqual(I.stableCorrect([{ n: 3, verdict: "nato" }], "nato"), { j: 0, n: 3 });
});
test("AMENDMENT 1 A4: hard decoys are gated per tier, the ambiguous-by-construction kind is reported never gated; heavy-noise forms are deterministic authored positives", () => {
  const corpus = toyCorpus();
  const out = I.measureWith({ corpus, reader: truthReader(corpus), split: "dev", giver: derangedGiver() });
  const d = out.rungs.r0.details;
  assert.equal(d.false_alarm.hard.n, 6, "3 gated hard kinds x 2");
  assert.equal(d.false_alarm.hard.rate, 0);
  assert.ok(d.ambiguous_decoys && d.ambiguous_decoys.n === 2 && d.ambiguous_decoys.kinds[0] === "dotdash_short_valid_gibberish");
  assert.ok(out.rungs.r0.gaps.some((g) => /ambiguous_by_construction/.test(g.reason)));
  for (const f of I.R0_HEAVY) assert.ok(d.by_form[f] && d.by_form[f].n === 8, f);
  const u = corpus.units[0];
  for (const f of I.R0_HEAVY) { const a = I.heavyText(u, f), b = I.heavyText(u, f); assert.equal(a, b, `${f} deterministic`); assert.notEqual(a, u.forms[I.CONST.heavy[f].base], `${f} really corrupts`); }
  // a reader that calls every ambiguous decoy a system fails nothing here (ungated); one that falsely alarms on a gated hard decoy fails the hard floor
  const bad = truthReader(corpus); const base = bad.listen; bad.listen = (t) => { const o = base(t); return t === "⡵⢙⣲⣣ ⡦⠯⡡⡐⡔ ⣙⣰⣗⡕" || t === "⢝⡢⢸⠌ ⢍⢶⡩⢳⣒ ⡢⡙⡘⡈" ? { ...o, verdict: "braille", trace: o.trace.map((e) => ({ ...e, verdict: e.n >= 3 ? "braille" : null })) } : o; };
  const outBad = I.measureWith({ corpus, reader: bad, split: "dev", giver: derangedGiver() });
  assert.ok(outBad.rungs.r0.details.false_alarm.hard.rate > 0.3);
  assert.equal(outBad.rungs.r0.pass, false); assert.ok(outBad.rungs.r0.notes.some((n) => /hard-tier decoy_false_alarm/.test(n)));
  // a corpus without the hard tier cannot pass R0: typed gap
  const noHard = { ...corpus, decoys: corpus.decoys.filter((x) => x.tier !== "hard"), hardMissing: true };
  const outNH = I.measureWith({ corpus: noHard, reader: truthReader(noHard), split: "dev", giver: derangedGiver() });
  assert.notEqual(outNH.rungs.r0.pass, true); assert.ok(outNH.rungs.r0.notes.some((n) => /hard_decoys_missing/.test(n)));
});
test("AMENDMENT 1 A2/A5 alternative readers read the giver and nothing else: facts the registered baselines must get right", () => {
  const G = I.giverTables(A.loadRawPriors());
  assert.ok(G.morse.has("...") && G.morse.has("-----") && !G.morse.has("..--") && G.maxMorseLen === 8);
  assert.ok(G.cells.has("⠁") && !G.cells.has("⡵") && G.lex.get("alfa") === "letter" && G.lex.get("niner") === "digit");
  const bv = (t, mode, tau = 0.8, limit = null) => I.baselineVerdict(t, G, { mode, tau, limit });
  // Braille-block cells outside the inventory: a script test says braille, the giver table refuses
  assert.equal(bv("⡵⢙⣲⣣ ⡦⠯⡡⡐⡔", "script_lexicon"), "braille"); assert.equal(bv("⡵⢙⣲⣣ ⡦⠯⡡⡐⡔", "table_membership"), "none");
  assert.equal(bv("⠠⠊ ⠁⠍ ⠓⠑⠗⠑", "table_membership"), "braille");
  // short dot/dash tokens the ITU table does not assign: alphabet test says morse, the table refuses
  assert.equal(bv("..-- .-.- ---. ----", "script_lexicon"), "morse"); assert.equal(bv("..-- .-.- ---. ----", "table_membership"), "none");
  assert.equal(bv("... --- ... / .-", "table_membership"), "morse");
  // run-on Morse: tokens longer than any ITU signal with a '/' word separator
  assert.equal(bv("-.-..-.-.-..--- / .-..-..--.--.", "table_membership"), "morse");
  // NATO: lexicon parse share; prose with a minority of NATO words is not NATO
  assert.equal(bv("Alfa Bravo Charlie Delta", "table_membership"), "nato"); assert.equal(bv("AlfaBravoCharlie / DeltaEcho", "table_membership"), "nato");
  assert.equal(bv("the Alfa of Echo went home today in rain", "table_membership"), "none");
  // the prefix limit: only the first k tokens are read
  assert.equal(bv("... --- ... ..-- .-.- ---. ----", "table_membership", 0.8, 3), "morse"); assert.equal(bv("... --- ... ..-- .-.- ---. ----", "table_membership", 0.8, 7), "none");
  assert.equal(bv("", "table_membership"), null);
  // R1d / R2 table readers
  assert.deepEqual([...I.greedyLexiconStarts("AlfaBravoX-ray", G)].sort((a, b) => a - b), [0, 4, 9]);
  assert.equal(I.tableLookupMorse("...", G), "letter"); assert.equal(I.tableLookupMorse("-----", G), "figure"); assert.equal(I.tableLookupMorse("......", G), "unassigned"); assert.equal(I.tableLookupMorse("/", G), "wordgap");
  assert.equal(I.tableLookupNato("Echo", G), "letter"); assert.equal(I.tableLookupNato("Fife", G), "digit"); assert.equal(I.tableLookupNato("Xqzv", G), "unassigned");
});
test("AMENDMENT 1 A5: R1d/R2a/R2c get table-only controls, delimiters are dropped from the macro-F1 and reported with and without", () => {
  const corpus = toyCorpus();
  const out = I.measureWith({ corpus, reader: truthReader(corpus), split: "dev", giver: A.loadRawPriors() });
  assert.ok("greedy_longest_lexicon" in out.rungs.r1.details.subs.r1d.controls);
  assert.ok("table_lookup" in out.rungs.r2.details.subs.r2a.controls && "table_lookup" in out.rungs.r2.details.subs.r2c.controls);
  for (const k of ["r2a", "r2c"]) { const sub = out.rungs.r2.details.subs[k]; assert.equal(sub.status, "table_determined", k); assert.equal(sub.pass, false, k); assert.ok("score_with_delimiters" in sub); assert.ok(!("wordgap" in sub.per_class), `${k} per_class has no delimiter`); }
  assert.equal(out.rungs.r1.details.subs.r1d.status, "table_determined");
  assert.ok(!("space" in out.rungs.r2.details.subs.r2b.per_class));
  assert.equal(out.rungs.r2.pass, false); assert.equal(out.rungs.r1.pass, false);
});
test("an unperturbed 'deranged' arm is flagged unlicensed, reported, and never used as `control`; a perfect alternative reader is not exempt (A1)", () => {
  const corpus = toyCorpus();
  const out = I.measureWith({ corpus, reader: truthReader(corpus, { selfDerange: true }), split: "dev", giver: derangedGiver() });
  const sub = out.rungs.r0.details.sub;
  assert.ok(sub.unlicensed.some((u) => u.control === "inventory_deranged"));
  assert.ok(!sub.licensed.includes("inventory_deranged"));
  assert.ok("inventory_deranged" in out.rungs.r0.controls, "reported in controls{}");
  assert.ok(sub.licensed.includes("alphabet_only") && sub.licensed.includes("majority"), "alternative readers are licensed");
});
test("typed gaps, never a throw: missing corpus -> pass null; no licensed control -> pass null", async () => {
  const out = await I.measure({ split: "dev", limit: 3, root: "/nonexistent/closed_codes" }).catch((e) => ({ threw: String(e) }));
  assert.ok(!out.threw, out.threw);
  for (const k of ["r0", "r1", "r2", "r5"]) { assert.equal(out.rungs[k].pass, null); assert.ok(out.rungs[k].gaps.some((g) => /unmeasured/.test(g.reason))); }
  assert.equal(out.rungs.r3.applicable, false);
  const miss = I.loadCorpus({ split: "dev", root: "/nonexistent/closed_codes" });
  assert.equal(miss.units.length, 0);
  assert.ok(miss.error);
});
test("leak check: priors trained on a source of this split force pass=false and a typed gap", () => {
  const corpus = toyCorpus();
  const out = I.measureWith({ corpus, reader: truthReader(corpus, { trainSources: ["toyA"] }), split: "dev" });
  assert.equal(out.stamp.leak.ok, false);
  for (const k of ["r0", "r1", "r2", "r5"]) { assert.equal(out.rungs[k].pass, false); assert.ok(out.rungs[k].gaps.some((g) => /leak/.test(g.reason))); }
  assert.equal(out.rungs.r3.pass, null);
});
test("derangeRaw: each derangement really changes what the prior attests", () => {
  const raw = A.loadRawPriors();
  const sig = (r) => JSON.stringify(r.morse.signals.map((s) => s.signal));
  assert.notEqual(sig(I.derangeRaw(raw, "morse_table", 101)), sig(raw));
  assert.notEqual(JSON.stringify(I.derangeRaw(raw, "braille_table", 101).braille.letters), JSON.stringify(raw.braille.letters));
  assert.notEqual(JSON.stringify(I.derangeRaw(raw, "nato_lexicon", 101).nato.letters), JSON.stringify(raw.nato.letters));
  assert.notEqual(JSON.stringify(Object.keys(I.derangeRaw(raw, "lm", 101).lm.contexts).slice(0, 40)), JSON.stringify(Object.keys(raw.lm.contexts).slice(0, 40)) + "x");
  assert.deepEqual(I.derangeRaw(raw, "timing", 101).morse.timing_ratios, { dot: 1, dash: 2, intra_letter_gap: 1, letter_gap: 2, word_gap: 4 });
  assert.deepEqual(raw.morse.timing_ratios, { dash: 3, intra_letter_gap: 1, letter_gap: 3, word_gap: 7, dot: 1 }, "the original priors are not mutated");
});
test("control transforms: scramble keeps each token's characters, shuffleGaps keeps the multiset of gaps", () => {
  const src = "abc def .-.- -..";
  const t = I.scrambleTokens(src, 5);
  const srt = (x) => [...x].sort().join("");
  assert.deepEqual(t.split(" ").map(srt), src.split(" ").map(srt));
  assert.notEqual(t, src);
  const s = I.shuffleGaps("+60 -61 +180 -58 +62 -180 +70", 3).split(" ");
  assert.deepEqual(s.filter((x) => x[0] === "-").sort(), ["-180", "-58", "-61"]);
  assert.deepEqual(s.filter((x) => x[0] === "+"), ["+60", "+180", "+62", "+70"]);
  assert.equal(I.alphabetOnlyVerdict("... --- ... / .-").verdict, "morse");
  assert.equal(I.alphabetOnlyVerdict("⠁⠃ ⠀⠉").verdict, "braille");
  assert.equal(I.alphabetOnlyVerdict("Alfa Bravo").verdict, "none", "alphabet-only cannot hear a spelling alphabet (that is the point)");
});

// ── adapter: pinned on facts the givers state ──────────────────────────────────────────────────────────────────────
test("adapter priors name their givers and were built from TRAIN only; train sources are disjoint from dev/test sources", () => {
  const raw = A.loadRawPriors();
  for (const k of ["morse", "braille", "nato", "lm", "null"]) { assert.ok(raw[k], k); assert.equal(raw[k].schema, "NotationPrior@1"); assert.ok(raw[k].giver?.name, `${k} names its giver`); assert.ok(raw[k].train.sources.length === 4); }
  const train = new Set(raw.morse.train.sources);
  for (const s of ["frankenstein", "on-liberty", "sherlock-holmes", "dracula", "art-of-war", "time-machine", "un-udhr-1948"]) assert.ok(!train.has(s), s);
  assert.match(raw.morse.giver.name, /ITU-R M\.1677-1/);
  assert.deepEqual(raw.morse.timing_ratios, { dash: 3, intra_letter_gap: 1, letter_gap: 3, word_gap: 7, dot: 1 });
  const byChar = Object.fromEntries(raw.morse.signals.map((s) => [s.char, s.signal]));
  assert.equal(byChar.S, "..."); assert.equal(byChar.O, "---"); assert.equal(byChar["0"], "-----"); assert.equal(byChar["."], ".-.-.-"); assert.equal(byChar["@"], ".--.-.");
  assert.ok(!raw.morse.signals.some((s) => s.signal === "-.-.--"), "'!' is not in ITU-R M.1677-1: refused");
});
test("adapter reads the standards: Morse, Braille (UEB numeric mode, capitals), ICAO words", () => {
  const rd = (t, o) => A.read(t, o);
  assert.equal(rd("... --- ... / .- -...").decoded.text, "SOS AB");
  assert.equal(rd("... --- ...   .- -...").decoded.text, "SOS AB", "three spaces are a word gap");
  assert.equal(rd("⠠⠠⠝⠁⠎⠁⠂ ⠼⠁⠃⠲⠑ ⠠⠊ ⠁⠍ ⠼⠉⠰⠁⠲").decoded.text, "NASA, 12.5 I am 3a.");
  assert.equal(rd("Alfa Bravo / Charlie").decoded.text, "AB C");
  assert.equal(rd("AlfaBravo / CharlieDelta", { system: "nato" }).decoded.text, "AB CD");
  assert.equal(rd("AlfaBravo / CharlieDelta").system, null, "two tokens are not enough evidence to name a system: unheard");
  assert.equal(rd("Alpha Juliet X-ray Niner").decoded.text, "AJX9", "variants named by the giver are read");
  assert.equal(rd("... --- ... .-", {}).system, "morse");
});
test("adapter REFUSES what its giver does not carry: an out-of-table token is `unassigned`, never the nearest letter", () => {
  const e = A.ear(".... ...... .-", { system: "morse", ablate: { form: "spaced" } });
  assert.deepEqual(e.tokens.map((t) => t.class), ["letter", "unassigned", "letter"]);
  assert.equal(e.tokens[1].value, "?");
  assert.ok(e.gaps.some((g) => g.reason === "signal_not_in_giver"));
  const bang = A.ear("-.-.--", { system: "morse", ablate: { form: "spaced" } });
  assert.equal(bang.tokens[0].class, "unassigned", "'!' (-.-.--) is not in ITU-R M.1677-1");
  const err = A.ear("........", { system: "morse", ablate: { form: "spaced" } });
  assert.equal(err.tokens[0].class, "signal", "the ITU error signal is a signal, not a letter");
  const g2 = A.ear("⠠⠿⠁", { system: "braille" });
  assert.equal(g2.tokens[1].class, "unassigned", "a cell outside the grade-1 prior (a grade-2 contraction candidate) is not guessed");
  const nat = A.ear("Alfa Brave Charlie", { system: "nato" });
  assert.deepEqual(nat.tokens.map((t) => t.class), ["letter", "unassigned", "letter"]);
});
test("adapter identifies causally from content; prose, rules, noise are not closed codes", () => {
  assert.equal(A.listen("... --- ... / .- -... -.-. -.. . ..-. --. ....").verdict, "morse");
  assert.equal(A.listen("⠠⠊ ⠁⠍ ⠎⠊⠍⠇⠑ ⠏⠁⠎⠎").verdict, "braille");
  assert.equal(A.listen("Alfa Bravo Charlie Delta Echo").verdict, "nato");
  assert.equal(A.listen("The quick brown fox jumps over the lazy dog").verdict, "none");
  assert.equal(A.listen("------------------ ================ ****************").verdict, "none");
  assert.equal(A.listen("... ---").verdict, null, "two tokens are not enough evidence: unheard, not a guess");
  const tr = A.listen("Alfa Bravo Charlie Delta Echo Foxtrot").trace;
  assert.ok(tr[0].verdict === null && tr[1].verdict === null, "no verdict before nMin tokens");
  assert.equal(A.listen("+60 -61 +180 -58 +62 -60 +61 -180").form, "keylog");
});
test("adapter hears keylog by tempo from the prefix (first run seeds T): SOS at 60 ms", () => {
  const sos = "+60 -60 +60 -60 +60 -180 +180 -60 +180 -60 +180 -180 +60 -60 +60 -60 +60";
  const r = A.read(sos, { system: "morse" });
  assert.equal(r.decoded.text, "SOS");
  assert.equal(r.form, "keylog");
  const gaps = A.ear(sos, { system: "morse" }).tokens.filter((t) => t.sign === "-").map((t) => t.gap);
  assert.deepEqual(gaps, ["intra", "intra", "letter", "intra", "intra", "letter", "intra", "intra"]);
});
test("adapter returns beings/relations EMPTY BY KIND, typed, and hands the plaintext off", () => {
  const r = A.read("... --- ... / .- -...");
  assert.deepEqual(r.beings, []); assert.deepEqual(r.relations, []);
  assert.deepEqual(r.typed.map((t) => [t.rung, t.applicable]), [["r3", false], ["r4", false]]);
  assert.equal(r.handoff.text, "SOS AB"); assert.equal(r.handoff.channel, "text");
  const none = A.read("The quick brown fox");
  assert.equal(none.system, null); assert.equal(none.decoded, null);
  assert.ok(none.gaps.some((g) => g.reason === "not_a_closed_code"));
});
test("adapter is prefix-consistent: committed tokens of a prefix equal the full run's", () => {
  const cases = [["morse", "... --- ... / .- -... -.-. / -.. . ..-."], ["braille", "⠠⠊ ⠼⠁⠲⠑ ⠐⠣⠁⠐⠜"], ["nato", "AlfaBravo / Charlie Delta"], ["morse", "+60 -60 +60 -180 +180 -60 +180 -420 +60"]];
  for (const [sys, text] of cases) {
    const full = A.ear(text, { system: sys }).tokens;
    for (let cut = 3; cut < text.length; cut++) {
      const pre = A.ear(text.slice(0, cut), { system: sys }).tokens;
      for (let i = 0; i < pre.length - 1; i++) {
        if (pre[i].open) continue;
        assert.deepEqual([pre[i].start, pre[i].end, pre[i].class, pre[i].value ?? ""], [full[i].start, full[i].end, full[i].class, full[i].value ?? ""], `${sys} cut ${cut} token ${i}`);
      }
    }
  }
});
test("adapter: a two-cell punctuation stays OPEN until its second cell arrives; a '.' inside a number does not revise", () => {
  const e = A.ear("⠐", { system: "braille" });
  assert.equal(e.tokens[0].open, true);
  const e2 = A.ear("⠐⠣", { system: "braille" });
  assert.equal(e2.tokens[0].open, false); assert.equal(e2.tokens[1].value, "(");
  const num = A.read("⠼⠁⠲⠑", { system: "braille" }).decoded.text;
  assert.equal(num, "1.5");
  const end = A.read("⠼⠁⠲", { system: "braille" }).decoded.text;
  assert.equal(end, "1.");
});
test("adapter run-on Morse: the TRAIN letter 4-gram segments a word; greedy (no language prior) does worse on a set", () => {
  const P = A.loadPriors();
  const enc = (w) => [...w.toUpperCase()].map((c) => P.morse.charSignal.get(c)).join("");
  const words = ["THE", "AND", "WAS", "HAVE", "WHICH", "THEIR", "WOULD", "ABOUT", "THERE", "WHERE", "PEOPLE", "SHOULD"];
  let beam = 0, greedy = 0;
  for (const w of words) {
    const s = enc(w);
    if (A.decodeRun(s, P.morse, P.lm, { mode: "beam" }).letters.map((l) => l.value).join("") === w) beam++;
    if (A.decodeRun(s, P.morse, P.lm, { mode: "greedy" }).letters.map((l) => l.value).join("") === w) greedy++;
  }
  assert.ok(beam > greedy, `beam ${beam} vs greedy ${greedy}`);
});
test("the original PRE-REGISTRATION block is byte-unchanged (pinned); AMENDMENT 1 is hashed on its own and dated", () => {
  assert.equal(I.preregSha256(), "74a4e6ac5bcb11ee45fc64ee0a32917e20b4728e2e6ee8ffa37790985fd855d6", "the registered block must never be edited: amend with a dated block instead");
  assert.match(I.amendment1Sha256(), /^[0-9a-f]{64}$/);
  const src = fs.readFileSync(path.join(HERE, "../eval/notation-competence/closed_codes.mjs"), "utf8");
  assert.ok(src.includes("AMENDMENT 1 (dated 2026-10-06"));
  for (const must of ["A1  LICENCE RULE", "A2  R0 ALTERNATIVE READERS", "A3  R0 CAUSAL GATE", "A4  HARD DECOY TIER", "A5  R1d / R2a / R2c", "A6  PROVENANCE", "A7  PREDICTIONS"]) assert.ok(src.includes(must), must);
  assert.ok(src.indexOf("END PRE-REGISTRATION") < src.indexOf("AMENDMENT 1 (dated"), "the amendment follows the registered block, it does not live inside it");
  const out = I.measureWith({ corpus: toyCorpus(), reader: truthReader(toyCorpus()), split: "dev", giver: derangedGiver() });
  assert.equal(out.stamp.amendment1_sha256, I.amendment1Sha256());
  for (const r of Object.values(out.rungs)) assert.equal(r.details.amendment1_sha256, I.amendment1Sha256());
});
test("real-corpus smoke (skipped when the derived corpus is not on this machine): the instrument runs, never throws, the adapter passes the R0 causal gate", { skip: !fs.existsSync(path.join(I.CORPUS_ROOT, "corpus", "dev.jsonl")) }, async () => {
  const out = await I.measure({ split: "dev", limit: 12 });
  assert.equal(out.family, "closed_codes");
  assert.deepEqual(Object.keys(out.rungs), ["r0", "r1", "r2", "r3", "r4", "r5"]);
  assert.equal(out.rungs.r3.applicable, false);
  const d = out.rungs.r0.details;
  assert.equal(d.causal.violations, 0, JSON.stringify(d.causal.examples));
  assert.ok(d.causal.checked > 50);
  assert.ok(d.false_alarm.hard && d.false_alarm.hard.n >= 8, "the hard decoy tier is measured");
  assert.ok(d.giver_tables && d.giver_tables.lexicon_words > 40);
  assert.ok(Object.keys(out.rungs.r0.controls).includes("table_membership_baseline"));
});
test("real corpus (skipped when absent): the hard decoy tier loads on dev and test, the ambiguous kind is ungated, UDHR is out of the TEST split", { skip: !fs.existsSync(path.join(I.CORPUS_ROOT, "corpus", "dev-decoys-hard.jsonl")) }, () => {
  for (const split of ["dev", "test"]) {
    const rows = fs.readFileSync(path.join(I.CORPUS_ROOT, "corpus", `${split}-decoys-hard.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(rows.length, 160, split);
    assert.deepEqual([...new Set(rows.map((r) => r.kind))].sort(), ["braille_outside_inventory", "dotdash_short_unassigned", "dotdash_short_valid_gibberish", "prose_embeds_nato_words"]);
    assert.equal(rows.filter((r) => r.gated === false).length, 40); assert.ok(rows.every((r) => r.authored === true && r.tier === "hard"));
  }
  const units = fs.readFileSync(path.join(I.CORPUS_ROOT, "corpus", "units", "test.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.deepEqual([...new Set(units.map((u) => u.source))].sort(), ["art-of-war", "dracula", "sherlock-holmes", "time-machine"]);
});
