// law-corpus: the corpus layer of the LAW-FALSIFICATION instrument (eval/law/corpus.mjs) is regression-guarded here on a PLANTED TOY whose every
// number is known by construction (hand-counted in the comments), with controls built to fail (the header's C1-C7). Nothing here reads a real
// held-out TEST split: the toy files are written under os.tmpdir(), the only real-data test touches TRAIN files and is skipped when they are absent.
// The toy languages are AUTHORED by the model (labelled so); they measure no real language.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import * as C from "../eval/law/corpus.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const mkdir = (tag) => fs.mkdtempSync(path.join(os.tmpdir(), `law-corpus-${tag}-`));
const row = (id, form, upos, head, deprel, misc = "_") => [id, form, form.toLowerCase(), upos, "X", "_", head, deprel, "_", misc].join("\t");

// ── the planted toy (AUTHORED) ────────────────────────────────────────────────────────────────────────────────────
// 3 sentences, 2 documents. Hand counts: words 10 (s1 4, s2 4, s3 2), ranges 1, empty nodes 1, malformed 1 (a row with fields<10), newdocs 2,
// id anomalies 1 (s3 jumps 1 -> 3 because the malformed row 2 is skipped). Heard stream (UPOS PUNCT removed): s1 [the cat sat], s2 [de el mar], s3 [cat sat]
// = 8 units; all 8 are in E (DET NOUN VERB / ADP DET NOUN / PROPN VERB).
const TOY = [
  "# newdoc id = d1", "# sent_id = s1", "# text = The cat sat .",
  row(1, "The", "DET", 2, "det"), row(2, "cat", "NOUN", 3, "nsubj"), row(3, "sat", "VERB", 0, "root"), row(4, ".", "PUNCT", 3, "punct", "SpaceAfter=No"), "",
  "# sent_id = s2", "# text = Del mar .",
  ["1-2", "Del", "_", "_", "_", "_", "_", "_", "_", "_"].join("\t"),
  row(1, "de", "ADP", 3, "case"), row(2, "el", "DET", 3, "det"), row(3, "mar", "NOUN", 0, "root"),
  ["3.1", "ghost", "_", "_", "_", "_", "_", "_", "_", "_"].join("\t"),
  row(4, ".", "PUNCT", 3, "punct"), "",
  "# newdoc id = d2", "# sent_id = s3",
  row(1, "Cat", "PROPN", 0, "root"), "2\tbad row with spaces only", row(3, "sat", "VERB", 1, "dep"),     // no trailing blank line, no final newline
].join("\n");

test("C5 rows: ranges and empty nodes are never words; malformed rows are counted; CRLF, a missing final newline and gzip give the same counts", () => {
  for (const variant of [TOY, TOY.replace(/\n/g, "\r\n"), TOY + "\n", TOY + "\n\n"]) {
    const s = C.parseConllu(variant);
    assert.equal(s.length, 3);
    assert.deepEqual(s.map((x) => x.words.length), [4, 4, 2]);
    assert.equal(s.meta.words, 10);
    assert.equal(s.meta.ranges, 1); assert.equal(s.meta.empties, 1);
    assert.equal(s.meta.malformed, 1); assert.equal(s.meta.malformedSamples[0].reason, "fields<10");
    assert.equal(s.meta.newdocs, 2); assert.equal(s.meta.idAnomalies, 1);
    assert.deepEqual(s.map((x) => x.doc), [0, 0, 1]); assert.deepEqual(s.map((x) => x.docId), ["d1", "d1", "d2"]);
    assert.deepEqual(s.map((x) => x.newdoc), [true, false, true]);
    assert.ok(s.every((x) => x.words.every((w) => Number.isInteger(w.id))), "every word has an integer id");
    assert.equal(s[1].nRanges, 1); assert.equal(s[1].nEmpty, 1);
    assert.ok(!s[1].words.some((w) => w.form === "Del" || w.form === "ghost"), "range surface form and empty node are not words");
  }
  const dir = mkdir("rows");
  fs.writeFileSync(path.join(dir, "toy.conllu"), TOY);
  fs.writeFileSync(path.join(dir, "toy.conllu.gz"), zlib.gzipSync(Buffer.from(TOY)));
  const a = C.loadConllu(path.join(dir, "toy.conllu"), { cache: false }), b = C.loadConllu(path.join(dir, "toy.conllu.gz"), { cache: false });
  assert.deepEqual(a.map((s) => s.words.map((w) => w.form)), b.map((s) => s.words.map((w) => w.form)));
  assert.equal(b.meta.gz, true);
  assert.deepEqual(C.parseConllu(TOY, { limit: 2 }).length, 2, "limit keeps the first N sentences");
});

test("D2/D3 the stream drops PUNCT and carries no label; the gold array is parallel, with heads remapped to stream indices", () => {
  const s = C.parseConllu(TOY);
  const st = C.streamOf(s);
  assert.deepEqual(st.sentences.map((x) => x.idents), [["the", "cat", "sat"], ["de", "el", "mar"], ["cat", "sat"]]);
  assert.equal(st.nUnits, 8); assert.equal(st.nWords, 10);
  for (const sent of st.sentences) assert.deepEqual(Object.keys(sent).sort(), ["doc", "forms", "id", "idents", "n", "newdoc", "s", "wordIds"], "the stream has no label field");
  const g = C.goldOf(s);
  assert.deepEqual(g.map((r) => r.map((t) => t.upos)), [["DET", "NOUN", "VERB"], ["ADP", "DET", "NOUN"], ["PROPN", "VERB"]]);
  assert.deepEqual(g.map((r) => r.map((t) => t.head)), [[1, 2, -1], [2, 2, -1], [-1, 0]]);
  assert.deepEqual(g.map((r) => r.map((t) => t.deprelBase)), [["det", "nsubj", "root"], ["case", "det", "root"], ["root", "dep"]]);
  assert.equal(C.evalPositions(g).length, 8);
  // READ variant keeps the punctuation and the case
  const rd = C.streamOf(s, { heard: false });
  assert.deepEqual(rd.sentences[0].idents, ["The", "cat", "sat", "."]);
  const gr = C.goldOf(s, { heard: false });
  assert.equal(gr[0][3].upos, "PUNCT"); assert.equal(gr[0][3].inE, false); assert.equal(gr[0][3].head, 2);
  // NFC and lowercase identity
  assert.equal(C.identOf("ÉCOLE"), "école");
  assert.equal(C.identOf("ÉCOLE", false), "ÉCOLE");
});

test("C1 control built to fail: permuting the gold columns leaves the stream hash identical under punct:'unicode' and CHANGES it under punct:'upos' (the disclosed dependency)", () => {
  const base = C.parseConllu(TOY);
  const shifted = C.parseConllu(TOY);
  const words = shifted.flatMap((s) => s.words);
  const cols = words.map((w) => ({ upos: w.upos, deprel: w.deprel, head: w.head, feats: w.feats }));
  words.forEach((w, k) => Object.assign(w, cols[(k + 1) % words.length]));       // cyclic shift of every gold column across the words
  assert.equal(C.streamDigest(C.streamOf(base, { punct: "unicode" })), C.streamDigest(C.streamOf(shifted, { punct: "unicode" })), "unicode mode is gold-free");
  assert.notEqual(C.streamDigest(C.streamOf(base)), C.streamDigest(C.streamOf(shifted)), "upos mode reads one gold value (is-PUNCT): the control must fail exactly there");
  assert.notDeepEqual(C.goldOf(base, { punct: "unicode" }).map((r) => r.map((t) => t.upos)), C.goldOf(shifted, { punct: "unicode" }).map((r) => r.map((t) => t.upos)), "the gold itself does change");
  // and the unicode stream keeps symbol words (SYM is not PUNCT by category P)
  const sym = C.parseConllu([row(1, "a", "NOUN", 0, "root"), row(2, "$", "SYM", 1, "dep"), row(3, "!", "PUNCT", 1, "punct"), ""].join("\n"));
  assert.deepEqual(C.streamOf(sym, { punct: "unicode" }).sentences[0].forms, ["a", "$"]);
});

test("grains: labelOf at G1-G4 with the derived DEPREL label set", () => {
  const g = C.goldOf(C.parseConllu(TOY)).flat();
  const by = Object.fromEntries(g.map((t) => [t.wordId + ":" + t.upos, t]));
  assert.equal(C.labelOf(by["2:NOUN"], "G1"), "NOUN");
  assert.equal(C.labelOf(by["2:NOUN"], "G2"), "nominal"); assert.equal(C.labelOf(by["3:VERB"], "G2"), "other");
  assert.equal(C.labelOf(by["2:NOUN"], "G3"), "NOUN"); assert.equal(C.labelOf(by["1:PROPN"], "G3"), "PROPN"); assert.equal(C.labelOf(by["3:VERB"], "G3"), null);
  assert.equal(C.labelOf(by["2:NOUN"], "G4"), "nsubj");
  assert.equal(C.labelOf(by["3:VERB"], "G4", { deprelSet: ["nsubj"] }), null, "root is outside the restricted set");
  assert.equal(C.labelOf({ inE: false, upos: "PUNCT" }, "G1"), null);
  assert.throws(() => C.labelOf(by["2:NOUN"], "G9"));
  const ls = C.deprelLabelSet([new Map([["nsubj", 600], ["obj", 300], ["dep", 99], ["clf", 1]])]);
  assert.deepEqual(ls.labels, ["dep", "nsubj", "obj"], "0.5 percent of 1000 = 5 tokens: dep (99) is kept, clf (1) is not");
  assert.deepEqual(ls.excluded.map((r) => r.label), ["clf"]);
});

test("D9/C3 strata: H0/H1/H2, nbin and nSeen by hand; nSeen and h0 are causal, the whole-stream selector h1 is NOT", () => {
  const s = C.parseConllu(TOY);
  const st = C.streamOf(s), gold = C.goldOf(s);
  const exp = new Map([["cat", 3], ["de", 1]]);
  const { strata, summary } = C.exposureStrata(st, exp, { gold });
  const flat = strata.flat();
  assert.deepEqual(flat.map((r) => r.stratum), ["H1", "H2", "H0", "H2", "H1", "H1", "H2", "H2"]);
  assert.deepEqual(flat.map((r) => r.nSeen), [0, 3, 0, 1, 0, 0, 4, 1]);
  assert.deepEqual(flat.map((r) => r.nbin), [0, 2, 0, 1, 0, 0, 3, 1]);
  assert.deepEqual(flat.map((r) => r.h1), [true, false, false, false, true, true, false, false]);
  assert.ok(flat.every((r) => !r.h1 || r.h0), "H1 is a subset of H0");
  assert.deepEqual(summary.all, { H0: 4, H1: 3, H2: 4, tokens: 8 });
  assert.deepEqual(summary.E, { H0: 4, H1: 3, H2: 4, tokens: 8 });
  assert.deepEqual(summary.byStratum, { H1: 3, H0: 1, H2: 4 });
  assert.deepEqual(summary.nbin, { 0: 4, 1: 2, 2: 1, 3: 1 });
  // later sentences replaced: the first sentence's nSeen and h0 must not move; h1 of 'sat' MUST move (its later repeat is gone) - the selector is not causal
  const altered = C.parseConllu(TOY.replace("# sent_id = s2", "# sent_id = s2x").replace(/de\b/g, "zz").replace("Cat\t", "Dog\t").replace(/\tsat\t/g, (m, off) => (off > TOY.indexOf("# newdoc id = d2") ? "\tqqq\t" : m)));
  const alt = C.exposureStrata(C.streamOf(altered), exp).strata;
  assert.deepEqual(alt[0].map((r) => [r.nSeen, r.h0]), strata[0].map((r) => [r.nSeen, r.h0]), "causal fields are invariant to later sentences");
  assert.equal(strata[0][2].h1, false);
  assert.equal(alt[0][2].h1, true, "the whole-stream selector changed: it is a selector, not a causal feature");
  // a plain object exposure works as well as a Map
  const obj = C.exposureStrata(st, { cat: 3, de: 1 }).strata.flat();
  assert.deepEqual(obj.map((r) => r.nSeen), flat.map((r) => r.nSeen));
});

test("D7 capSample: the longest prefix of a seeded permutation within the cap; deterministic; seed required", () => {
  const sents = Array.from({ length: 60 }, (_, k) => ({ words: Array.from({ length: 3 + ((k * 7) % 9) }, (_, w) => ({ id: w + 1, form: "w", upos: w === 0 ? "PUNCT" : "NOUN" })) }));
  const total = sents.reduce((a, s) => a + s.words.length, 0);
  const seed = C.seedFor("toy", "train", "cap");
  const cap = C.capSample(sents, { nCap: 120, seed });
  assert.ok(cap.tokens <= 120 && cap.tokens > 0);
  assert.equal(cap.tokens, cap.sentences.reduce((a, s) => a + s.words.length, 0));
  const perm = C.permutation(sents.length, seed);
  assert.deepEqual(cap.indices, perm.slice(0, cap.nSentences), "a prefix of the permutation");
  const next = sents[perm[cap.nSentences]];
  assert.ok(cap.tokens + next.words.length > 120, "the next sentence would overflow: the prefix is the longest");
  assert.deepEqual(C.capSample(sents, { nCap: 120, seed }).indices, cap.indices, "deterministic");
  assert.notDeepEqual(C.capSample(sents, { nCap: 120, seed: seed + 1 }).indices, cap.indices);
  assert.equal(C.capSample(sents, { nCap: 1e9, seed }).complete, true);
  assert.equal(C.capSample(sents, { nCap: 1e9, seed }).tokens, total);
  const u = C.capSample(sents, { nCap: 100, seed, unit: "unit" });
  assert.ok(u.tokens <= 100 && u.units === u.tokens, "unit:'unit' counts stream units (PUNCT removed)");
  assert.throws(() => C.capSample(sents, { nCap: 10 }), /seed/);
  assert.equal(C.seedFor("a", "b"), parseInt(createHash("sha256").update("khora-law-v2\x1fa\x1fb").digest("hex").slice(0, 8), 16));
  assert.notEqual(C.seedFor("eng", "train", "cap"), C.seedFor("eng", "dev", "cap"));
});

test("C4 nestedness: exposureFractions are nested prefixes; a deliberately non-nested implementation MUST fail the same checker", () => {
  const sents = Array.from({ length: 200 }, (_, k) => ({ id: k, words: Array.from({ length: 5 + (k % 11) }, (_, w) => ({ id: w + 1, form: "w", upos: "NOUN" })) }));
  const total = sents.reduce((a, s) => a + s.words.length, 0);
  const fr = C.exposureFractions(sents, C.DEFAULT_FRACTIONS, 12345);
  assert.equal(fr.length, 7);
  assert.deepEqual(fr.map((x) => x.f), [...C.DEFAULT_FRACTIONS].sort((a, b) => a - b));
  assert.deepEqual(C.checkNested(fr), { ok: true, at: -1 });
  for (const x of fr) assert.ok(x.tokens <= x.f * total + 1e-6 || x.nSentences === 1, "within f * total (or the one-sentence floor)");
  assert.equal(fr.at(-1).nSentences, 200); assert.equal(fr.at(-1).tokens, total);
  assert.ok(fr.every((x, k) => k === 0 || x.tokens >= fr[k - 1].tokens));
  // the broken design: independent resamples per fraction
  const naive = C.DEFAULT_FRACTIONS.map((f, k) => ({ f, sentences: C.permutation(200, 900 + k).slice(0, Math.max(1, Math.round(200 * f))).map((i) => sents[i]) }));
  assert.equal(C.checkNested(naive).ok, false, "independent resampling is not nested and the checker must say so");
  // tiny f never yields an empty exposure
  const one = [{ words: Array.from({ length: 50 }, (_, w) => ({ id: w + 1, form: "w", upos: "NOUN" })) }];
  assert.equal(C.exposureFractions(one, [1 / 64], 1)[0].nSentences, 1);
});

test("D5/D6 the frozen family table equals design 3.1 and every partition passes the leak audit; C2 planted leaks must be flagged", () => {
  // the design's own 3.1 table, parsed from the document
  const docPath = path.join(HERE, "..", "docs", "LAW-FALSIFICATION.md");
  if (fs.existsSync(docPath)) {
    const doc = fs.readFileSync(docPath, "utf8");
    const at = doc.indexOf("| family (strict) | languages |");
    assert.ok(at > 0, "design 3.1 table found");
    const rows = doc.slice(at).split("\n").slice(2).filter((l) => l.startsWith("|") && /\(\d+\)/.test(l.split("|")[1]));
    const fromDoc = {};
    for (const l of rows) {
      const [, fam, langs] = l.split("|");
      const name = fam.replace(/\s*\(\d+\)\s*/, "").trim();
      for (const seg of langs.split(";")) {
        const toks = seg.trim().split(/\s+/);
        const stems = toks.length > 1 && /^[A-Z]/.test(toks[0]) ? toks.slice(1) : toks;     // drop a branch name
        for (const s of stems) if (/^[a-z-]+$/.test(s)) fromDoc[s] = name;
      }
    }
    const mine = Object.fromEntries(C.FROZEN_STEMS.map((s) => [s, C.FAMILY_OF[s]]));
    assert.deepEqual(mine, Object.fromEntries(Object.entries(fromDoc).sort()), "FAMILY_OF (frozen) equals the design table");
    assert.equal(Object.keys(fromDoc).length, 41);
  }
  assert.equal(C.FROZEN_STEMS.length, 41);
  assert.ok(C.FROZEN_STEMS.includes("cmn-hans") && !C.FROZEN_STEMS.includes("cmn"), "cmn counts once, as cmn-hans");
  assert.deepEqual([...C.CONTROL_STEMS], ["cmn"]);
  assert.ok(C.LATE_STEMS.every((s) => !C.FROZEN_STEMS.includes(s)));
  assert.equal(C.PARTITION_P1.folds.length, 10);
  assert.equal(C.PARTITION_P2.folds.length, 6);
  assert.equal(C.PARTITION_P3.folds.length, 8);
  assert.equal(C.PARTITION_CODE.folds.length, 6);
  assert.equal(C.PARTITION_COREF.folds.length, 5);
  assert.ok(C.PARTITION_P2.folds.every((f) => f.train.includes("hye")), "hye is never held out in P2");
  assert.ok(C.PARTITION_P3.folds.find((f) => f.group === "Armenian").heldOut.includes("hye"), "the declared Armenian completion");
  assert.equal(C.PARTITION_P1.folds.find((f) => f.group === "Indo-European").heldOut.length, 29);
  for (const k of ["P1", "P2", "P3", "CODE", "COREF"]) assert.deepEqual(C.checkPartition(C.PARTITIONS[k]), { ok: true, violations: [] }, k);
  assert.deepEqual(C.foldsFor("P1"), C.PARTITION_P1.folds);
  assert.throws(() => C.foldsFor("P9"));
  // the code families partition exactly 51 languages; no language in two families
  const codeLangs = Object.values(C.CODE_FAMILIES).flat();
  assert.equal(codeLangs.length, 51); assert.equal(new Set(codeLangs).size, 51);
  // C2: planted leaks
  const clone = (p) => JSON.parse(JSON.stringify(p));
  const leak = clone(C.PARTITION_P1); leak.folds[0].train.push(leak.folds[0].heldOut[0]);
  const r1 = C.checkPartition(leak);
  assert.equal(r1.ok, false); assert.ok(r1.violations.some((v) => v.kind === "train_heldout_overlap"), "a held-out stem also in train");
  const rel = clone(C.PARTITION_P1);                                                    // a family relative moved into train while its family is held out
  const uralic = rel.folds.find((f) => f.group === "Uralic");
  uralic.heldOut = uralic.heldOut.filter((s) => s !== "est"); uralic.train.push("est");
  const r2 = C.checkPartition(rel);
  assert.ok(r2.violations.some((v) => v.kind === "group_leak" && v.unit === "est"), "family relative in train is a group leak");
  assert.ok(r2.violations.some((v) => v.kind === "coverage" && v.unit === "est"), "and est is then held out nowhere");
  const dup = clone(C.PARTITION_P1); dup.folds[1].heldOut.push("eng");
  assert.ok(C.checkPartition(dup).violations.some((v) => v.kind === "heldout_overlap_across_folds" && v.unit === "eng"));
  const missing = clone(C.PARTITION_P1); missing.folds[1].train = missing.folds[1].train.filter((s) => s !== "eng");
  assert.ok(C.checkPartition(missing).violations.some((v) => v.kind === "never_held_missing_from_train"));
  const unk = clone(C.PARTITION_P3); unk.folds[0].train.push("xxx");
  assert.ok(C.checkPartition(unk).violations.some((v) => v.kind === "unknown_unit"));
});
