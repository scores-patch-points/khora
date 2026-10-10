// Barker, the profile: tests on a PLANTED TOY treebank (closed-form expectations), the controls built to fail, and the
// hygiene rules of eval/barker/profiles.mjs (EO-free, zero-model, split guard, gap typing, determinism).
// The toy: two sentence types, "the dog sees a cat ." in SVO order and the same words in SOV order; every A, B, F, G
// cell then has a value computable by hand (stated beside each assertion).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSeededRng } from "../kernel/rng.js";
import * as P from "../eval/barker/profiles.mjs";
import * as ST from "../eval/barker/profile-stats.mjs";

const SVO = (i) => `# sent_id = svo-${i}\n# text = the dog sees a cat .\n` + [
  "1\tthe\tthe\tDET\t_\tDefinite=Def\t2\tdet\t_\t_", "2\tdog\tdog\tNOUN\t_\tNumber=Sing\t3\tnsubj\t_\t_",
  "3\tsees\tsee\tVERB\t_\tMood=Ind|Number=Sing|Person=3|Tense=Pres|VerbForm=Fin\t0\troot\t_\t_",
  "4\ta\ta\tDET\t_\tDefinite=Ind\t5\tdet\t_\t_", "5\tcat\tcat\tNOUN\t_\tNumber=Sing\t3\tobj\t_\tSpaceAfter=No", "6\t.\t.\tPUNCT\t_\t_\t3\tpunct\t_\t_"].join("\n") + "\n\n";
const SOV = (i) => `# sent_id = sov-${i}\n# text = the dog a cat sees .\n` + [
  "1\tthe\tthe\tDET\t_\tDefinite=Def\t2\tdet\t_\t_", "2\tdog\tdog\tNOUN\t_\tNumber=Sing\t5\tnsubj\t_\t_",
  "3\ta\ta\tDET\t_\tDefinite=Ind\t4\tdet\t_\t_", "4\tcat\tcat\tNOUN\t_\tNumber=Sing\t5\tobj\t_\t_",
  "5\tsees\tsee\tVERB\t_\tMood=Ind|Number=Sing|Person=3|Tense=Pres|VerbForm=Fin\t0\troot\t_\t_", "6\t.\t.\tPUNCT\t_\t_\t5\tpunct\t_\tSpaceAfter=No"].join("\n") + "\n\n";
const toyText = (a, b) => Array.from({ length: a }, (_, i) => SVO(i)).join("") + Array.from({ length: b }, (_, i) => SOV(i)).join("");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "barker-profiles-"));
const toyFile = (a, b, name = "toy.conllu") => { const f = path.join(tmp, name); fs.writeFileSync(f, toyText(a, b)); return f; };
const stats = (text) => { const c = P.parseConllu(text); const V = new Float64Array(P.STAT_LEN); for (const s of c.sentences) { const st = P.sentenceStats(s).st; for (let k = 0; k < V.length; k++) V[k] += st[k]; } return { c, V, cells: P.additiveCells(V) }; };
const close = (x, y, tol = 1e-9, msg) => assert.ok(Math.abs(x - y) <= tol, `${msg ?? ""} expected ${y}, got ${x}`);

test("planted toy: every typological, hierarchical, morphology and role-marking cell equals its closed form", () => {
  const a = 60; const b = 20; const S = a + b; const { cells, c } = stats(toyText(a, b));
  assert.equal(c.sentences.length, S); assert.equal(c.nTokens, 6 * S); assert.equal(c.nBlocks, S);
  close(cells.a01.v, 1.0, 1e-12, "a01 nsubj always before its head");
  close(cells.a02.v, b / S, 1e-12, "a02 obj before only in SOV");
  close(cells.a09.v, 1.0, 1e-12, "a09 det before");
  close(cells.a12.v, (3 * a + 4 * b) / (4 * S), 1e-12, "a12 share of arcs with dependent first");
  close(cells.a14.v, 40, 1e-12, "a14 two dets per five words per 100");
  close(cells.a20.v, ST.entropyBits([2, 2, 1]), 1e-12, "a20 UPOS entropy of DET DET NOUN NOUN VERB");
  close(cells.a22.v, (5 * a + 6 * b) / (4 * S), 1e-12, "a22 mean dependency length");
  close(cells.b01.v, 3, 1e-12, "b01 height"); close(cells.b02.v, 11 / 5, 1e-12, "b02 mean depth");
  close(cells.b03.v, 0.2, 1e-12); close(cells.b04.v, 0.4, 1e-12); close(cells.b05.v, 0.4, 1e-12);
  close(cells.b09.v, 4 / 3, 1e-12, "b09 children over non-leaf"); close(cells.b10.v, 0.4, 1e-12, "b10 leaf share");
  close(cells.b11.v, 0, 1e-12, "b11 no clause relations"); close(cells.b13.v, 0.8, 1e-12, "b13 Strahler order 1 share"); close(cells.b14.v, 0.2, 1e-12, "b14 order 2 share");
  const xs = [2, 3, 4, 5].map(Math.log10); const ys = [0.6, 0.2, 0.2, 0.2].map(Math.log10); const fit = ST.olsFit(xs, ys);
  close(cells.b12.v, fit.slope, 1e-12, "b12 subtree tail slope");
  close(cells.f01.v, 9 / 5, 1e-12, "f01 FEATS per non-PUNCT word"); close(cells.f02.v, 0, 1e-12); close(cells.f04.v, 0, 1e-12);
  close(cells.f05.v, 1, 1e-12, "f05 finite verbs agree"); close(cells.f06.v, 1, 1e-12, "f06 nouns with det"); close(cells.f07.v, 1, 1e-12, "f07 verbs with tense");
  close(cells.g01.v, ST.entropyBits([a, b]), 1e-12, "g01 SVO/SOV order entropy");
  close(cells.g02.v, 0, 1e-12); close(cells.g03.v, 0, 1e-12); close(cells.g04.v, 1, 1e-12, "g04 subject heads bear agreement");
  assert.equal(cells.a07.v, null, "a07 acl: zero arcs is a GAP, never an imputed 0.5");
  assert.equal(cells.a06.v, null, "a06 aux: below the arc floor is a gap");
  assert.equal(cells.a01.n, S); assert.equal(cells.a07.n, 0, "the denominator of a gap is reported");
});

test("floors: a cell with fewer than MIN_ARCS arcs is a gap with its denominator, at exactly the floor it is defined", () => {
  const F = P.PROVISIONAL.MIN_ARCS;
  assert.equal(stats(toyText(F - 1, 0)).cells.a01.v, null);
  assert.equal(stats(toyText(F, 0)).cells.a01.v, 1);
  assert.equal(stats(toyText(F - 1, 0)).cells.a01.n, F - 1);
});

test("g05 role identifiability: a perfectly informative cue reads 1, an uninformative cue reads about 0", () => {
  const perfect = P.roleIdentifiability(Array.from({ length: 400 }, (_, i) => (i % 2 === 0 ? 0 : 1) + 2 * (i % 2 === 0 ? 1 : 0)));
  close(perfect.v, 1, 1e-9);
  const rng = createSeededRng({ seed: 5, purpose: "g05" });
  const noise = P.roleIdentifiability(Array.from({ length: 4000 }, () => (rng() < 0.5 ? 0 : 1) + 2 * (rng() < 0.5 ? 1 : 0)));
  assert.ok(noise.v < 0.02, `uninformative cue should read near 0, got ${noise.v}`);
});

test("control built to fail: a within-sentence word shuffle sends order shares to chance, dependency length up", () => {
  const c = P.parseConllu(toyText(1500, 500)); const rng = createSeededRng({ seed: 11, purpose: "t" });
  const shuf = c.sentences.map((s) => P.shuffleSentenceWords(s, rng));
  const V = new Float64Array(P.STAT_LEN); for (const s of shuf) { const st = P.sentenceStats(s).st; for (let k = 0; k < V.length; k++) V[k] += st[k]; }
  const cells = P.additiveCells(V); const V0 = new Float64Array(P.STAT_LEN); for (const s of c.sentences) { const st = P.sentenceStats(s).st; for (let k = 0; k < V0.length; k++) V0[k] += st[k]; }
  assert.ok(Math.abs(cells.a01.v - 0.5) < 0.06, `a01 after shuffle ${cells.a01.v}`);
  assert.ok(Math.abs(cells.a09.v - 0.5) < 0.06, `a09 after shuffle ${cells.a09.v}`);
  assert.ok(cells.a22.v > P.additiveCells(V0).a22.v, "dependency length rises under shuffling (dependency length minimisation is a real regularity)");
});

test("power check: planted head-final / head-initial re-linearisation moves a12 and a02 to 1 and 0", () => {
  const c = P.parseConllu(toyText(50, 50));
  const run = (mode) => { const V = new Float64Array(P.STAT_LEN); for (const s of c.sentences) { const st = P.sentenceStats(P.lineariseSentence(s, mode)).st; for (let k = 0; k < V.length; k++) V[k] += st[k]; } return P.additiveCells(V); };
  const fin = run("final"); const ini = run("initial");
  assert.ok(fin.a12.v >= 0.99 && fin.a02.v >= 0.99, `head-final a12 ${fin.a12.v} a02 ${fin.a02.v}`);
  assert.ok(ini.a12.v <= 0.01 && ini.a02.v <= 0.01, `head-initial a12 ${ini.a12.v} a02 ${ini.a02.v}`);
});

test("numerics: exact binomial, Hurwitz zeta, planted discrete power law, DFA control and power", () => {
  close(ST.binomUpperTail(8, 9, 0.5), 10 / 512, 1e-12, "P(X>=8 | 9, 1/2)");
  close(ST.hurwitzZeta(2, 1), Math.PI ** 2 / 6, 1e-9, "zeta(2)");
  close(ST.hurwitzZeta(3, 1), 1.2020569031595942, 1e-9, "zeta(3)");
  const c = P.powerChecks(); const st = P.cellStatus();
  // P3 as pre-registered: the CSN estimator d01 is labelled UNDERPOWERED exactly when its planted check fails (it read 0.77 for a planted 1.0: ADDENDUM B)
  assert.equal(st.d01.pass, c.P3.pass); assert.equal(st.d01.status, c.P3.pass ? "OK" : "UNDERPOWERED");
  assert.ok(c.P3.readings.every((x) => Number.isFinite(x)), "P3 readings exist");
  assert.ok(c.P3o.pass, `P3o: OLS rank-frequency exponent on a planted 1.0 reads ${c.P3o.readings}`);
  assert.ok(c.P3r.pass, "P3r: both estimators order planted exponents 0.8 < 1.0 < 1.2");
  const rng = createSeededRng({ seed: 2, purpose: "dfa" }); const white = Array.from({ length: 16000 }, () => rng());
  assert.ok(Math.abs(ST.dfaHurst(white) - 0.5) <= 0.06, `DFA on white noise ${ST.dfaHurst(white)}`);
  let acc = 0; const walk = white.map((x) => (acc += x - 0.5)); assert.ok(ST.dfaHurst(walk) >= 1.2, "DFA reads a random walk as H>1");
});

test("sequence cells: a planted exchangeable series reads no excess burstiness; a planted persistent series is detected (N3, P4)", () => {
  const N = P.PROVISIONAL.N;
  const ex = P.plantedSeries(N, 60, false, 5); const pe = P.sequenceCellsOf(ex, N, "planted-exchangeable", { shuffles: 6 }); const we = P.windowStats(ex, 50, 5);
  assert.ok(Math.abs(we.B - pe.shuffleB) <= 0.05, `exchangeable burstiness excess ${we.B - pe.shuffleB}`);
  assert.ok(Math.abs(we.H - 0.5) <= 0.06, `exchangeable Hurst ${we.H}`);
  const ps = P.plantedSeries(N, 60, true, 7); const pp = P.sequenceCellsOf(ps, N, "planted-persistent", { shuffles: 6 }); const wp = P.windowStats(ps, 50, 5);
  assert.ok(wp.B - pp.shuffleB >= 0.10, `persistent burstiness excess ${wp.B - pp.shuffleB}`);
  assert.ok(wp.H >= 0.55, `persistent Hurst ${wp.H}`);
});

test("Strahler orders: a complete binary tree of height h has order h; a path has order 1", () => {
  const head = [0, 1, 1, 2, 2, 3, 3]; // complete binary tree, 7 nodes, root = word 1
  const d = ST.depthsOf(head); const parent = Int32Array.from(head, (h) => h - 1); const ord = ST.strahlerOrders(parent, d, new Uint8Array(7).fill(1));
  assert.equal(ord[0], 3); assert.equal(Math.max(...ord), 3);
  const pathHead = [0, 1, 2, 3, 4]; const dp = ST.depthsOf(pathHead); const op = ST.strahlerOrders(Int32Array.from(pathHead, (h) => h - 1), dp, new Uint8Array(5).fill(1));
  assert.equal(Math.max(...op), 1);
  assert.equal(ST.depthsOf([2, 1]), null, "a cycle is not a tree");
});

test("boundary model: a planted language whose words start with a high-entropy letter has a positive boundary gap that peaks at offset 0", () => {
  const rng = createSeededRng({ seed: 9, purpose: "boundary" }); const streams = []; const starts = [];
  for (let k = 0; k < 400; k++) { const st = []; const B = new Set(); for (let w = 0; w < 6; w++) { B.add(st.length); st.push("ABCDEFGHIJKLMNOP"[Math.floor(rng() * 16)]); for (let j = 0; j < 3; j++) st.push("ab"[Math.floor(rng() * 2)]); } streams.push(st); starts.push(B); }
  const m = ST.boundaryModel(streams, starts);
  assert.ok(m.gap[0] > 0.5, `planted boundary gap ${m.gap[0]}`);
  assert.ok(m.gap[0] > Math.max(m.gap[-2], m.gap[-1], m.gap[1], m.gap[2]), "peak at the true boundary");
});

test("EO-free: ban list, contamination is rejected, the registry and real-looking cells pass", () => {
  assert.equal(P.assertEoFree({ cells: { x01_cell_ground: { id: "x01_cell_ground", group: "A", channel: "ud:deprel", definitionId: "x", builder: "b" } } }).ok, false);
  for (const bad of ["ground_share", "Figure", "kind:basin", "Case=Nom", "stance_x", "terrain", "grain_a", "operatorShare", "byFace"]) assert.equal(P.assertEoFree([bad]).ok, false, bad);
  for (const good of ["a01_nsubj_before_head", "case_rate", "g05_role_identifiability_ratio", "ud:deprel", "prior:pos-eng", "grammar:tree-sitter"]) assert.equal(P.assertEoFree([good]).ok, true, good);
  for (const [id, r] of Object.entries(P.FEATURE_REGISTRY)) assert.equal(P.assertEoFree({ cells: { [id]: { id, group: r.group, channel: r.channel, definitionId: r.definitionId } } }).ok, true, id);
});

test("split guard: only train and dev are readable; no source line names the held-out split; no model, network or EO import", () => {
  assert.deepEqual([...P.SPLITS_READ], ["train", "dev"]);
  assert.throws(() => P.conlluPath("eng", "te" + "st"), /refused/);
  assert.throws(() => P.assertSplit("held-out"), /refused/);
  const here = path.join(path.dirname(new URL(import.meta.url).pathname), "../eval/barker");
  const scan = new RegExp(["model" + "-server", "mouth\\" + ".js", "node:" + "https?", "fetch" + "\\(", "anthro" + "pic", "open" + "ai", "embed" + "ding"].join("|"), "i");
  const held = new RegExp(["te" + "st", "conllu"].join("\\."));
  const eoImport = new RegExp("(?:import|from)\\s*[\"'][^\"']*(" + ["cube\\.js", "phase" + "post", "relation" + "-kinds", "act" + "-prior", "case" + "-priors", "hyper" + "lexicon"].join("|") + ")");
  for (const f of ["profiles.mjs", "profile-stats.mjs", "profiles-smoke.mjs", "ast_extract.py"]) {
    const lines = fs.readFileSync(path.join(here, f), "utf8").split("\n");
    lines.forEach((l, i) => { assert.ok(!scan.test(l), `${f}:${i + 1} model/network token`); assert.ok(!held.test(l), `${f}:${i + 1} names the held-out split`); assert.ok(!eoImport.test(l), `${f}:${i + 1} EO import`); });
  }
});

test("pre-registration header: first, with claims, definitions, nulls, power checks, pass rules and predictions, and its digest is stamped", () => {
  const src = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "../eval/barker/profiles.mjs"), "utf8");
  assert.ok(src.startsWith("// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══"));
  for (const word of ["CLAIMS", "DEFINITIONS", "NULLS AND CONTROLS BUILT TO FAIL", "POWER CHECKS", "PASS RULES", "RECORDED PREDICTIONS", "SPLITS"]) assert.ok(src.includes(word), word);
  assert.match(P.PREREG_SHA, /^[0-9a-f]{64}$/);
});

test("planted toy through the whole pipeline: provenance on every cell, typed gaps, deterministic content hash, EO-free", () => {
  const file = toyFile(450, 150); const row = { system: "nl:toy", kind: "nl", stem: "toy", dir: "toy", treebank: "toy", family: "toy", lineage: "toy", macro: "toy", genealogyTyped: false, twinOf: null, trainFile: file, trainSha256: "0".repeat(64), devFile: null };
  const a = P.buildNlProfile(row, { N: 2000 }); const b = P.buildNlProfile(row, { N: 2000 });
  assert.equal(a.schema, "SystemProfile@1"); assert.equal(a.contentHash, b.contentHash, "determinism"); assert.equal(a.eoFree, true);
  assert.equal(a.labels.family, "toy"); assert.deepEqual(a.budget.seeds, [1, 2, 3, 4, 5]);
  assert.ok(Object.keys(a.cells).length >= 55, `cells ${Object.keys(a.cells).length}`);
  for (const [id, cell] of Object.entries(a.cells)) {
    for (const f of ["id", "group", "channel", "definitionId", "builder", "giver"]) assert.ok(cell[f], `${id}.${f}`);
    assert.ok(Number.isFinite(cell.value), `${id} value`); assert.ok("ci95" in cell && cell.ci95Policy, `${id} ci policy`); assert.equal(a.features[id], cell.value);
    assert.ok(a.provenance[id].source.includes(cell.channel), `${id} provenance`); assert.match(cell.builder, /^profiles\.mjs@[0-9a-f]{12}#/);
  }
  close(a.cells.a01.value, 1, 1e-12); close(a.cells.a12.value, 0.8125, 0.03, "a12 near the closed form for a 3:1 mixture ((3*3+4*1)/16)");
  close(a.cells.e01.value, 0.4, 1e-12, "e01 two closed-class words (the, a) of five"); close(a.cells.f03.value, 1, 1e-12, "f03 one form per lemma in the toy");
  assert.equal(a.cells.a01.resamples.length, 10, "five seeds by two halves");
  assert.ok(a.cells.a01.ci95 && a.cells.a01.ci95[0] <= 1 && a.cells.a01.ci95[1] >= a.cells.a01.value - 1e-9, "bootstrap interval brackets the value");
  assert.equal(a.cells.d01, undefined, "a toy vocabulary of five types cannot support a power-law fit: a typed gap");
  const gap = a.gaps.find((g) => g.feature === "d01"); assert.ok(gap && "have" in gap.denominator && "need" in gap.denominator, "gaps carry denominators");
  assert.ok(a.gaps.every((g) => g.feature && g.reason && g.denominator), "every gap is typed");
  for (const id of Object.keys(a.targets)) assert.equal(P.FEATURE_REGISTRY[id], undefined, "targets are never features");
  assert.equal(Object.keys(a.features).some((k) => /^t0/.test(k)), false);
});

test("below the budget a system gets typed gaps and never a smaller N", () => {
  const file = toyFile(30, 10, "tiny.conllu"); const row = { system: "nl:tiny", kind: "nl", stem: "tiny", dir: "tiny", treebank: "tiny", family: "toy", lineage: "toy", macro: "toy", genealogyTyped: false, twinOf: null, trainFile: file, trainSha256: "1".repeat(64), devFile: null };
  const p = P.buildNlProfile(row, { N: 2000 });
  assert.equal(Object.keys(p.cells).length, 0); const g = p.gaps.find((x) => x.reason === "below_budget"); assert.ok(g && g.denominator.need === 2000 && g.denominator.have < 2000);
});

test("loadProfiles refuses a contaminated or malformed profile file", () => {
  const dir = fs.mkdtempSync(path.join(tmp, "load-"));
  const ok = P.buildNlProfile({ system: "nl:toy", kind: "nl", stem: "toy", dir: "toy", treebank: "toy", family: "toy", lineage: "toy", macro: "toy", genealogyTyped: false, twinOf: null, trainFile: toyFile(450, 150, "ok.conllu"), trainSha256: "2".repeat(64), devFile: null }, { N: 2000 });
  P.writeProfiles(dir, [ok]); assert.equal(P.loadProfiles(dir).length, 1);
  const bad = JSON.parse(JSON.stringify(ok)); bad.system = "nl:bad"; bad.cells.x_cell_one = { ...bad.cells.a01, id: "x_cell_one" };
  fs.writeFileSync(path.join(dir, "nl__bad.json"), JSON.stringify(bad)); assert.throws(() => P.loadProfiles(dir), /contamination/);
  const mal = JSON.parse(JSON.stringify(ok)); mal.system = "nl:mal"; delete mal.cells.a01.giver;
  fs.rmSync(path.join(dir, "nl__bad.json")); fs.writeFileSync(path.join(dir, "nl__mal.json"), JSON.stringify(mal)); assert.throws(() => P.loadProfiles(dir), /malformed/);
});

test("genealogy answer keys: typed lineages and branches, unknown stems are unlabelled (a typed gap), twins share their language's labels", () => {
  assert.deepEqual(P.genealogyOf("eng"), { branch: "Germanic", lineage: "Indo-European", macro: "Indo-European", typed: true });
  assert.equal(P.genealogyOf("fin").lineage, "Uralic"); assert.equal(P.genealogyOf("hun").branch, "Ugric"); assert.equal(P.genealogyOf("kor-kaist").lineage, "Koreanic");
  assert.equal(P.genealogyOf("xxx").branch, "unlabelled"); assert.equal(P.genealogyOf("xxx").typed, false);
  assert.equal(P.genealogyOf("cmn").lineage, P.genealogyOf("cmn-hans").lineage);
});

test("discovery on the live data tree (skipped if absent): hashes, same-file prior resolution, twins, code systems, no held-out files", { skip: !fs.existsSync(P.DIRS.tb) }, () => {
  const m = P.discoverSystems({ refreshFirstSeen: false });
  const eng = m.systems.find((s) => s.system === "nl:eng"); if (eng) { assert.match(eng.trainSha256, /^[0-9a-f]{64}$/); assert.equal(eng.family, "Germanic"); assert.equal(eng.priorSourceMatchesTrain, true); }
  const kor = m.systems.find((s) => s.system === "nl:kor"); if (kor && fs.existsSync(path.join(P.DIRS.tb, "kor-gsd"))) { assert.equal(kor.dir, "kor-gsd", "the Korean prior was built from the GSD treebank, never the KAIST one"); assert.equal(kor.priorSourceMatchesTrain, true); }
  const twin = m.systems.find((s) => s.twinOf); if (twin) { assert.equal(twin.devFile, null, "a twin treebank never borrows another treebank's dev split"); }
  for (const s of m.systems) { assert.ok(s.system && s.kind && s.family && s.lineage && s.firstSeen, s.system); if (s.devFile) assert.ok(s.devFile.endsWith("dev.conllu")); if (s.trainFile) assert.ok(s.trainFile.endsWith("train.conllu")); }
  assert.ok(m.gaps.every((g) => g.reason && g.denominator), "manifest gaps are typed");
  assert.ok(m.gaps.some((g) => g.system === "notation:*"), "no notation corpus yet: a typed gap, not a feature vector");
  const code = m.systems.filter((s) => s.kind === "code"); for (const s of code) assert.ok(!("testFiles" in s), "code rows never carry the held-out list");
});

test("family labels for leave-family-out: branch, lineage, macro; notation without a corpus is a typed gap profile, never features", () => {
  const p = { kind: "nl", labels: { family: "Slavic", lineage: "Indo-European", macro: "Indo-European", script: "Cyrillic" } };
  assert.equal(P.familyOf(p, "branch"), "Slavic"); assert.equal(P.familyOf(p, "lineage"), "Indo-European"); assert.equal(P.familyOf(p, "macro"), "Indo-European"); assert.equal(P.familyOf(p, "script"), "Cyrillic");
  assert.equal(P.familyOf(p, "codeFamily"), null); assert.throws(() => P.familyOf(p, "nope"), /unknown family key/);
  const n = P.buildNotationProfile("chess-pgn", { dir: path.join(tmp, "no-such-notation-dir") });
  assert.equal(n.kind, "notation"); assert.equal(Object.keys(n.cells).length, 0); assert.equal(n.features && Object.keys(n.features).length, 0);
  assert.ok(n.gaps[0].reason.includes("no_notation_corpus")); assert.equal(n.gaps[0].denominator.have, 0);
});

test("a cell whose planted check failed is WITHHELD (not in cells or features) with a typed gap, never silently offered", () => {
  // a toy with a rich vocabulary so that d01 is computable: SVO sentences whose three lexical slots are planted Zipf words
  const words = P.plantedZipfWords(3 * 900, 1.0, 4000, 1); let k = 0; const lines = [];
  for (let i = 0; i < 900; i++) {
    const [a, b, c] = [words[k++], words[k++], words[k++]];
    lines.push(`# sent_id = z-${i}\n# text = the ${a} ${b} a ${c} .\n` + [`1\tthe\tthe\tDET\t_\tDefinite=Def\t2\tdet\t_\t_`, `2\t${a}\t${a}\tNOUN\t_\tNumber=Sing\t3\tnsubj\t_\t_`,
      `3\t${b}\t${b}\tVERB\t_\tMood=Ind|Number=Sing|Person=3|Tense=Pres|VerbForm=Fin\t0\troot\t_\t_`, `4\ta\ta\tDET\t_\tDefinite=Ind\t5\tdet\t_\t_`, `5\t${c}\t${c}\tNOUN\t_\tNumber=Sing\t3\tobj\t_\t_`, `6\t.\t.\tPUNCT\t_\t_\t3\tpunct\t_\t_`].join("\n") + "\n\n");
  }
  const file = path.join(tmp, "zipf.conllu"); fs.writeFileSync(file, lines.join(""));
  const row = { system: "nl:zipf", kind: "nl", stem: "zipf", dir: "zipf", treebank: "zipf", family: "toy", lineage: "toy", macro: "toy", genealogyTyped: false, twinOf: null, trainFile: file, trainSha256: "3".repeat(64), devFile: null };
  const p = P.buildNlProfile(row, { N: 2000 }); const st = P.cellStatus();
  const unpowered = Object.entries(st).filter(([, v]) => v.pass === false).map(([id]) => id);
  for (const id of unpowered) {
    assert.equal(p.cells[id], undefined, `${id} must not be offered`); assert.equal(p.features[id], undefined);
    if (p.withheld[id]) { assert.ok(Number.isFinite(p.withheld[id].value)); assert.ok(p.gaps.some((g) => g.feature === id && /^withheld:/.test(g.reason)), `${id} needs its typed gap`); }
  }
  for (const id of Object.keys(st).filter((x) => !unpowered.includes(x))) assert.equal(p.withheld[id], undefined, `${id} passed its check and may be offered`);
  if (st.d01.pass === false) assert.ok(p.withheld.d01 && p.cells.d01 === undefined, "P3 failed in this build: the Zipf-MLE cell is withheld"); else assert.ok(p.cells.d01);
  assert.ok(p.cells.d01o, "the OLS estimator passed its check and is offered");
});
