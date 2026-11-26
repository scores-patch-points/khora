// tests/reading-standard.test.mjs — THE READING STANDARD, EXECUTABLE: each clause of the-fold/reading-standard.mjs is a test here. A clause the pipeline meets is a passing test; one it does not meet is a TODO test that
// carries its measured baseline and turns green when fixed. The standard does not hide non-conformance (todo tests run and report; they do not fail the suite).
// Boundary: the round-trip clauses R3, R4, R5 need janus's nl-eot.mjs, and khora never imports another repo (AGENTS.md rule 1 of the nexus): they are TODO here, with the measured baseline, and their real tests belong in janus.
// Needs the reader's priors (KHORA_PRIORS_DIR) and the pharos clone (PHAROS_HOME); skips without them, saying why.
import test from "node:test"; import assert from "node:assert/strict";
import { STANDARD, STANDARD_LAYERS, layerLedger } from "../the-fold/reading-standard.mjs";
import { foldCodec } from "../the-fold/codec-fold.mjs";
let readFramed = null, why = null, readDocument = null;
try { ({ readFramed } = await import("../the-fold/read-framed.mjs")); ({ readDocument } = await import("../reading.js")); await readFramed("Mr. Bennet made no answer. ".repeat(10), { language: "eng" }); } catch (e) { why = String(e?.message ?? e).slice(0, 140); readFramed = null; }
const T = { skip: readFramed ? false : `no canonical reader here: ${why}` };
const DOC = ["“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”", "Mr. Bennet replied that he had not.", "And God said, Let there be light: and there was light.", "Mr. Bennet made no answer."].join("\n\n") + "\n\n" + "Mr. Bennet made no answer. ".repeat(4);

test("the standard is data: every clause has an id, a rule, a status and its evidence; the round trip (R1-R6) and the layer rules (L1-L9) are all there", () => {
  const ids = STANDARD.map((c) => c.id); assert.equal(new Set(ids).size, ids.length); for (const id of ["R1", "R2", "R3", "R4", "R5", "R6", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10"]) assert.ok(ids.includes(id), id);
  for (const c of STANDARD) assert.ok(c.rule && c.status && c.evidence, c.id);
});

// ── L1: every layer is run or skipped WITH A REASON ──
test("L1: an English read has a ledger row for every standard layer, each run or carrying why", T, async () => {
  const w = await readFramed(DOC, { language: "eng" }); assert.deepEqual(w.layers.map((r) => r.layer), [...STANDARD_LAYERS]);
  for (const r of w.layers) { assert.ok([true, false, "ablated"].includes(r.ran), r.layer); if (r.ran === false) assert.ok(r.why, `${r.layer} skipped without a reason`); }
  assert.ok(w.layers.find((r) => r.layer === "frames.quotes").ran === true && w.layers.find((r) => r.layer === "frames.speech").ran === true);
});
test("L1: a language the canonical reader only partly holds says WHICH layers are missing and why, instead of leaving fields absent (Russian: no parser, no clause tree, the speaker rung is English-only)", T, async () => {
  const RU = "Он сказал, что он не пойдёт туда. Она ответила, что знает об этом. ".repeat(8);
  const w = await readFramed(RU, { language: "rus", allowDegraded: true }), by = Object.fromEntries(w.layers.map((r) => [r.layer, r]));
  assert.equal(by.parse.ran, false); assert.match(by.parse.why, /no_parser/); assert.equal(by.clauses.ran, false); assert.match(by.clauses.why, /rus/); assert.equal(by.speakers.ran, false); assert.match(by.speakers.why, /English-only/);
  assert.equal(by["frames.quotes"].ran, false, "no frames were computed: the ledger says so, not 'false'");
});
test("L1 (found by the probe): the canonical entry itself leaves the speaker rung ABSENT for a non-English language, with no typed gap on the entry", { todo: "KNOWN NON-CONFORMANCE: read-core.mjs:577-583 sets no speakerBindings and files no gap for a non-English read; the ledger names it from outside, the reader should file it" }, async () => {
  if (!readDocument) throw new Error("no reader"); const w = await readDocument("Он сказал, что он не пойдёт туда. Она ответила, что знает об этом. ".repeat(8), { language: "rus", rows: true, allowDegraded: true });
  assert.ok(w.speakerBindings !== undefined || (w.gaps ?? []).some((g) => /speaker/.test(g.gap ?? g)), "the entry files nothing about the speaker rung");
});

// ── L2: every layer is ablatable ──
test("L2: ablating the speech layer makes `reported` UNKNOWN (null), never false, and the ledger says ablated; the marks layer is untouched", T, async () => {
  const base = await readFramed(DOC, { language: "eng" }), w = await readFramed(DOC, { language: "eng", ablate: ["speech"] });
  assert.ok(base.frames.frames.some((f) => f.reported === true), "the un-ablated read finds reported speech"); assert.ok(w.frames.frames.every((f) => f.reported === null), "ablated: unknown, not false");
  assert.equal(w.layers.find((r) => r.layer === "frames.speech").ran, "ablated"); assert.equal(w.layers.find((r) => r.layer === "frames.quotes").ran, true);
  assert.ok(w.frames.frames.some((f) => f.framed === true), "the quotation-mark layer still ran");
});
test("L2: ablating the quotation layer makes `framed` UNKNOWN (null) and leaves the speech layer", T, async () => {
  const w = await readFramed(DOC, { language: "eng", ablate: ["quotes"] });
  assert.ok(w.frames.frames.every((f) => f.framed === null), "ablated: unknown"); assert.equal(w.layers.find((r) => r.layer === "frames.quotes").ran, "ablated"); assert.ok(w.frames.frames.some((f) => f.reported === true));
});
test("L2: ablating both leaves every frame unknown and the read otherwise intact (cast, clauses, parse still ran)", T, async () => {
  const w = await readFramed(DOC, { language: "eng", ablate: ["quotes", "speech"] }); assert.ok(w.frames.frames.every((f) => f.framed === null && f.reported === null));
  for (const l of ["parse", "cast", "clauses"]) assert.equal(w.layers.find((r) => r.layer === l).ran, true, l);
});

// ── R1: the codec is found by surprise reduction ──
test("R1: the codec for an English read is found by surprise, as a distribution, and the open-world term is high", async () => {
  const r = await foldCodec("Mr. Bennet replied that he had not. The woman said that the serpent beguiled her. My dear, you must know that Netherfield is taken by a young man of large fortune."); assert.equal(r.chosen, "eng"); assert.ok(r.pOwn > 0.7);
});
test("R1: casual speech and a typo do not lose the codec", async () => {
  const t = "mr bennet replied that he had not the woman said that the serpent beguiled her my dear you must know that netherfield is taken by a young man of large fortune";
  assert.equal((await foldCodec(t)).chosen, "eng"); assert.equal((await foldCodec(t.replace("netherfield", "nehterfield"))).chosen, "eng");
});

// ── L4: the language is never guessed ──
test("L4: no language, or one no held codec explains, gives a typed gap and NO frames from the framed door", T, async () => {
  const a = await readFramed("Mr. Bennet made no answer. ".repeat(10), {}); assert.equal(a.frames.frames.length, 0); assert.equal(a.frames.gaps[0].gap, "language_not_declared");
  const b = await readFramed("Mr. Bennet made no answer. ".repeat(10), { language: "xxx" }); assert.equal(b.frames.frames.length, 0); assert.equal(b.frames.gaps[0].gap, "language_not_held");
});
test("L4: the canonical readDocument still READS an unheld language as English beside its unknown_language gap", { todo: "KNOWN NON-CONFORMANCE: readDocument({ language: 'xxx' }) returns clauses and a cast read with the default English priors (20 clauses on a 10-sentence English probe) next to the gap; the framed door refuses, the canonical door does not" }, async () => {
  if (!readDocument) throw new Error("no reader"); const w = await readDocument("Mr. Bennet replied that he had not. ".repeat(10), { language: "xxx", rows: true });
  assert.ok(!Array.isArray(w.clauses) || w.clauses.length === 0, `read ${w.clauses?.length} clauses as English`);
});

// ── L6: two doors agree ──
test("L6: the chat and the canonical door agree on the cast of an ordinary passage (names, titles ignored)", { todo: "KNOWN NON-CONFORMANCE: the two cast builders agree on 0.73 of names over five real texts (0.88 on the novel, 0.68 on Genesis); on this passage the chat splits 'Mr.' from 'Bennet'" }, async () => {
  if (!readDocument) throw new Error("no reader"); const { makeThread } = await import("../chat/thread.mjs"), { ingestDocument } = await import("../chat/ingest.mjs");
  const text = ["Mr. Bennet replied that he had not.", "Mrs. Long has just been here, and she told me all about it.", "Mr. Bennet made no answer.", "A young man of large fortune from the north of England has taken Netherfield Park."].join("\n\n") + "\n\n" + "Mr. Bennet made no answer. ".repeat(4);
  const w = await readDocument(text, { language: "eng", rows: true }), th = await makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null }); await ingestDocument(th, text);
  const canon = new Set((w.cast ?? []).map((c) => c.surface)), chat = new Set((th.engine.S.read?.cast?.referents ?? []).filter((b) => b.kind === "name").map((b) => b.forms?.[0]?.[0]));
  assert.deepEqual([...chat].filter((x) => !canon.has(x)).sort(), [], "the chat names someone the canonical reader does not"); assert.deepEqual([...canon].filter((x) => !chat.has(x)).sort(), [], "the canonical reader names someone the chat does not");
});

// ── the round trip: R3, R4, R5, L7. They need janus's nl-eot.mjs; khora never imports another repo, so they are TODO here with the measured baseline; the real tests belong in janus. ──
test("R3: a transform takes EOT and returns new EOT (modify, reason) with no surface string in between", { todo: "NOT BUILT as one interface: the Stage reasoner (kernel/stage.js) consumes atoms; no EOT-to-EOT transform API found. Owner: define it, then test it in janus beside nl-eot.mjs" }, () => { throw new Error("no EOT->EOT transform interface exists"); });
test("R4: encode PROSIFIES: the target codec restores natural order, negation placement, punctuation, capitalisation and sentence boundaries", { todo: "NOT BUILT. Baseline measured 2026-11-26 on 25 English sentences with janus nl-eot.mjs: surface identical to the original 16% (4 of 25); form_unattested on 13.8% of content nodes; 'Mr. Bennet replied that he had not.' -> ['Mr', 'Bennet replied that he not had']; 'It is a truth universally acknowledged' -> 'is it a truth universally acknowledged'. Test belongs in janus." }, () => { throw new Error("the codec carries a form table and order parameters, not prosification rules"); });
test("R5: for a sentence the codec fully attests (no gaps), decode(encode(decode(x))) is the same EOT as decode(x)", { todo: "FAILS today. Baseline: the EOT is a fixed point for 24% of 25 English sentences (6 of 25), counting gap-bearing ones. The invariant is conditional (gap-free sentences only) so it needs no tuned bar: it must hold for 100% of them. Test belongs in janus." }, () => { throw new Error("round trip is not an EOT fixed point"); });
test("L7: the read's codec, layer ledger, quotation spans and frames are woven into the pharos by cell and kind (the reading is stored in khora's own entries; the log is the record)", { skip: !process.env.PHAROS_HOME ? "set PHAROS_HOME to a pharos checkout" : (readFramed ? false : T.skip) }, async () => {
  const fs = await import("node:fs"), os = await import("node:os"), path = await import("node:path"), { weaveFramedReading } = await import("../the-fold/pharos-framed.mjs"), d = fs.mkdtempSync(path.join(os.tmpdir(), "kl7-"));
  const r = await weaveFramedReading(DOC, { language: "eng", log: "t", dir: d, actPrior: null }); for (const k of ["text-codec", "text-layers", "text-quotes", "text-frames"]) assert.ok(r.written.includes(k), k);
});
test("L7 (the rest): an EOT, a promoted trail-rule, and the round trip are woven by cell and kind", { todo: "NOT BUILT: the EOT of a text is Janus's to write (it reads text and text-codec by kind; a kind and cell for it are not declared); a promoted trail-rule is a proposal at EVA·Pattern, and EVA is Penelope's; the round trip (R3 to R5) has no entries" }, () => { throw new Error("not woven"); });

// ── L10: the codec carries its conventions ──
test("L10: the codec foldCodec finds carries its quote table, read from the text where the text gives evidence and from the codec default where it does not", async () => {
  const quoted = "“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?” Mr. Bennet replied that he had not. “But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.” Mr. Bennet made no answer. “Do you not want to know who has taken it?” cried his wife impatiently. “You want to tell me, and I have no objection to hearing it.”";
  const a = await foldCodec(quoted); assert.ok(a.chosen, "a codec was chosen"); assert.ok(a.quotes.table.pairs.some((p) => p[0] === "“")); assert.ok(["inferred+codec", "inferred"].includes(a.quotes.source), a.quotes.source);
  const b = await foldCodec("Mr. Bennet replied that he had not. The woman said that the serpent beguiled her. My dear, you must know that Netherfield is taken by a young man of large fortune."); assert.ok(b.chosen); if (b.quotes.table) assert.equal(b.quotes.source, "codec"); else assert.equal(b.quotes.gap.gap, "no_quote_table", "a codec with no table and a text with no marks: the typed gap, not a guess");
});

test("R1 (found while testing L10): an English novel passage is explained best by the English codec, with p that does not saturate on a one-bit difference", { todo: "KNOWN NON-CONFORMANCE (tested 2026-11-26, not fixed): an English novel passage is chosen as pcm (Nigerian Pidgin, an English-lexified codec) at p = 1.00. TWO causes, measured: (1) a known word is priced log2(table size), and the table size is the TREEBANK's (eng 13287, pcm 3967, tgl 209), so a small table makes every known word cheaper: on the 80-word-longer passage eng covers MORE (0.86 v 0.82) yet pcm wins on bits; (2) on the shorter passage pcm's coverage is genuinely HIGHER (0.87 v 0.85), because its table holds English words. TRIED: one language-independent price per known word (CODEC_FOLD_BITS=constant): fixes cause 1 (the long passage chooses eng) but NOT cause 2, and it LOSES a Genesis edition (Tagalog goes to Indonesian: 92 of 97 against 93), so it fails the no-regression gate and is not adopted. NEXT, untested: evidence from words only the candidate holds (pcm's own function words dey, na, wey are absent from English text)" }, async () => {
  const q = "“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?” Mr. Bennet replied that he had not. “But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.” Mr. Bennet made no answer."; const r = await foldCodec(q);
  assert.equal(r.chosen, "eng", `chose ${r.chosen}: ${JSON.stringify(r.distribution.slice(0, 3).map((d) => [d.code, +d.p.toFixed(2), +d.coverage.toFixed(2), +d.bitsPerToken.toFixed(1)]))}`);
});
