// tests/barker-eo-claims.test.js — the EO falsification battery (eval/barker/eo-claims.mjs) on PLANTED TOYS and on its own registry.
// No real treebank is read here, no test-split path is opened, and nothing needs a network or a model.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as eo from "../eval/barker/eo-claims.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, "..", "eval", "barker", "eo-claims.mjs"), "utf8");

// ── registry, lint, verdict function ────────────────────────────────────────────────────────
test("registry lint passes; the freeze (strict) lint refuses unsigned SESOI rows", () => {
  assert.equal(eo.registryLint(), true);
  assert.throws(() => eo.registryLint({ strict: true }), /unsigned/);
  const roles = new Map();
  for (const r of eo.RIVAL_REGISTRY) { assert.ok(!roles.has(r.id), `${r.id} registered twice`); roles.set(r.id, r.role); assert.match(r.mappingSha, /^[0-9a-f]{64}$/); assert.ok(r.giver && typeof r.k === "number"); }
  assert.equal(eo.roleOf("P3"), "must-beat"); assert.equal(eo.roleOf("D9"), "reference"); assert.equal(eo.roleOf("N1b"), "null");
  assert.throws(() => eo.roleOf("NOT-A-RIVAL"), /never registered/);
  assert.match(eo.RIVAL_REGISTRY.find((r) => r.id === "TR").status, /NOT_RUN/);   // no received operational mapping: not run, never invented
  for (const s of Object.values(eo.SESOI)) assert.equal(s.signedBy, "");
  for (const s of Object.values(eo.EO_SENTENCES)) assert.equal(s.licensed, false);
});
test("the reachability table of BARKER.md 4.6", () => {
  const k = (n) => eo.reachability(n);
  assert.deepEqual([9, 8, 7, 6, 5].map((n) => k(n).kNeeded), [8, 7, 7, 6, 5]);
  assert.equal(k(4).unreachable, true); assert.equal(k(0).unreachable, true);
  assert.ok(Math.abs(k(9).p - 0.0195) < 1e-3);
});
test("verdict function: an unlicensed bridge can never return REFUTED; controls and gates behave", () => {
  const ok = { theta: 0.1, ci95: [0.06, 0.14], sesoi: 0.02, powerUp: true, powerDown: true, tinyOk: true, controlsOk: true, nullOk: true, mustBeatOk: true, signGate: null, channelsOk: null, bridge: "licensed", consumed: false };
  const v = eo.minimumEffectVerdict(ok); assert.equal(v.verdict, "SURVIVES"); assert.equal(v.headline, true);
  const u = eo.minimumEffectVerdict({ ...ok, bridge: "unlicensed" }); assert.equal(u.verdict, "SURVIVES"); assert.equal(u.headline, false); assert.equal(u.bridge, "unlicensed");
  const fail = { ...ok, theta: 0, ci95: [-0.005, 0.005] };
  assert.equal(eo.minimumEffectVerdict(fail).verdict, "REFUTED");
  const w = eo.minimumEffectVerdict({ ...fail, bridge: "unlicensed" }); assert.equal(w.verdict, "WEAKENED"); assert.equal(w.bridge, "failed");   // unlicensed: never REFUTED
  assert.notEqual(w.verdict, "REFUTED");
  assert.equal(eo.minimumEffectVerdict({ ...ok, ci95: [0.01, 0.14] }).verdict, "UNDERPOWERED");            // straddles the SESOI
  assert.equal(eo.minimumEffectVerdict({ ...ok, controlsOk: false }).verdict, "INSTRUMENT_FAILED");
  assert.equal(eo.minimumEffectVerdict({ ...ok, withheld: true }).verdict, "UNDERPOWERED");
  assert.equal(eo.minimumEffectVerdict({ ...ok, powerUp: false }).verdict, "UNDERPOWERED");                // could not have confirmed
  assert.equal(eo.minimumEffectVerdict({ ...fail, powerDown: false }).verdict, "UNDERPOWERED");            // could not have refuted
  assert.equal(eo.minimumEffectVerdict({ ...ok, mustBeatOk: false }).verdict, "WEAKENED");
  assert.equal(eo.minimumEffectVerdict({ ...ok, signGate: false }).verdict, "WEAKENED");
  assert.equal(eo.minimumEffectVerdict({ ...ok, reachable: false }).verdict, "UNDERPOWERED");
  assert.equal(eo.minimumEffectVerdict({ ...ok, consumed: true }).headline, false);
  assert.equal(eo.minimumEffectVerdict({ ...ok, nearForegone: true }).headline, false);
});
test("the SESOI trio on the verdict function (a Gaussian estimator): 2s SURVIVES, 0.5s REFUTED, exactly s neither above alpha, 0.1s at 10x n not SURVIVES", () => {
  const s = 0.02, rng = eo.makeRng("trio"), N = 2000, se = 0.15 * s,   // small enough that a 2s effect clears the SESOI AND a 0.5s effect falls under it, both at power >= 0.8
     run = (theta, sd) => { const out = { SURVIVES: 0, REFUTED: 0 }; for (let i = 0; i < N; i++) { const est = theta + sd * eo.gauss(rng), ci = [est - 1.96 * sd, est + 1.96 * sd]; const v = eo.minimumEffectVerdict({ theta: est, ci95: ci, sesoi: s, powerUp: true, powerDown: true, tinyOk: true, controlsOk: true, nullOk: true, mustBeatOk: true, bridge: "licensed", consumed: false }).verdict; if (v in out) out[v]++; } return out; };
  assert.ok(run(2 * s, se).SURVIVES / N >= 0.8);
  assert.ok(run(0.5 * s, se).REFUTED / N >= 0.8);
  const at = run(s, se); assert.ok(at.SURVIVES / N <= eo.ALPHA && at.REFUTED / N <= eo.ALPHA, JSON.stringify(at));
  assert.ok(run(0.1 * s, se / Math.sqrt(10)).SURVIVES / N <= eo.ALPHA);
});
test("power gate: tiny-world rate rejected as <= alpha fails the gate; Holm slots; binomial rule", () => {
  const g = (tinyHits) => eo.powerGate({ up: { hits: 40, n: 40 }, down: { hits: 40, n: 40 }, tiny: { hits: tinyHits, n: 40 }, reps: 40 });
  assert.equal(g(4).pass, true); assert.equal(g(5).pass, false);       // P(X >= 5 | 40, .05) = 0.034 < .05 rejects "<= alpha"
  assert.equal(eo.rejectsRateLE(16, 200), true); assert.equal(eo.rejectsRateLE(15, 200), false);   // BARKER.md F1: 16 of 200
  const hb = eo.holmBattery({ S1b: 0.0002 }); assert.equal(hb.S1b.reject, true); assert.equal(hb.S2.reject, false); assert.equal(hb.S2.p, 1);
  assert.ok(eo.holmBattery({ S1b: 0.03 }).S1b.reject === false, "0.03 does not survive Holm over nine slots");
});

// ── source rules (BARKER.md 8.3), enforced by a static scan ────────────────────────────────
test("source rules: zero model, no network, no BIC-style penalty, no delta = MDE", () => {
  for (const bad of [/model-server/, /mouth\.js/, /node:https?/, /fetch\(/, /anthropic/i, /openai/i, /embedding/i, /(^|[^A-Za-z_])dl\(/, /\bBIC\b/, /delta\s*=\s*MDE/]) assert.ok(!bad.test(SRC), `forbidden pattern ${bad} in eo-claims.mjs`);
});
test("EO's own instruments are read ONLY inside functions named underTest*", () => {
  assert.ok(!/^import .*cube\.js/m.test(SRC), "no static import of cube.js");
  const lines = SRC.split("\n"); let inside = false, name = null; const offenders = [];
  lines.forEach((l, i) => {
    const m = /^export function (underTest\w+)/.exec(l); if (m) { inside = true; name = m[1]; }
    if (!inside && !/^\s*\/\//.test(l)) {
      // an actual READ of an EO instrument: a require/import/readFile naming it (file names inside registry TEXT are not reads)
      if (/require\(["']\.\.\/\.\.\/kernel\/cube\.js["']\)/.test(l) || /["'][^"']*act-prior-en\.json["']/.test(l) || /(import|require|readFileSync)\b.*(phasepost|relation-kinds|hyperlexicon|case-priors)/.test(l)) offenders.push(`${i + 1}: ${l.trim().slice(0, 100)}`);
    }
    if (inside && /^}/.test(l)) inside = false;
  });
  assert.deepEqual(offenders.filter((o) => !/source:/.test(o)), []);
  assert.ok(/export function underTestGrammarCells/.test(SRC) && /export function underTestActTable/.test(SRC));
});
test("the TEST split is refused without a freeze lock and a confirmation flag; dev never names a test path", () => {
  assert.throws(() => eo.makeCtx({ split: "test" }), /refused/);
  assert.throws(() => eo.makeCtx({ split: "bogus" }), /dev\|test/);
  const ctx = eo.makeCtx({ split: "dev" });
  assert.match(eo.heldOutPath(ctx, "eng"), /dev\.conllu$/); assert.match(eo.cardPath(ctx, "r1", "eng"), /-dev\.json$/);
  assert.deepEqual(eo.eo2Files(ctx, "eng").map((f) => path.basename(f)), ["train.conllu"]);       // EO-2 dev = train files (header choice 16)
  // every non-comment line that names test.conllu is inside the eo2Files test branch
  const hits = SRC.split("\n").filter((l) => /test\.conllu/.test(l) && !/^\s*\/\//.test(l));
  assert.ok(hits.every((l) => /ctx\.split === "dev"/.test(l)), hits.join("\n"));
});
test("the header pre-registration is the first thing in the file and its digest is stable", () => {
  assert.ok(SRC.startsWith("// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══"));
  assert.match(eo.makeCtx({ split: "dev" }).headerSha, /^[0-9a-f]{64}$/);
  assert.match(eo.cellOfGrammarSha(), /^[0-9a-f]{64}$/); assert.equal(eo.cellOfGrammarSha(), eo.cellOfGrammarSha());
});

// ── the grammar table: the triple inventory from the table alone (BARKER.md F7) ─────────────────
test("tripleInventory(): 47 triples over 7 features, 36 Case, Number has none; a language's inventory follows its token counts", () => {
  const inv = eo.tripleInventory();
  assert.equal(inv.nTriples, 47); assert.equal(inv.features.Case.triples, 36); assert.equal(inv.features.Number.triples, 0);
  assert.equal(Object.values(inv.features).filter((f) => f.triples > 0).length, 7);
  assert.deepEqual(inv.strata, { oblique: 16, mixed: 20, "non-Case": 11 });
  assert.equal(inv.independentContrasts.total, 17); assert.equal(inv.independentContrasts.H1, 9); assert.equal(inv.independentContrasts.H2, 7);
  const lang = eo.tripleInventory({ counts: { Case: { Nom: 500, Acc: 400, Gen: 150, Ins: 120, Dat: 99 }, Person: { 1: 300, 2: 200, 3: 900 } } });
  assert.equal(lang.features.Case.values.length, 4);                 // Dat is below the 100-token floor
  assert.equal(lang.features.Person.triples, 1);
  assert.ok(lang.independentContrasts.total >= 1);
  assert.ok(eo.tripleInventory({ counts: {} }).nTriples === 0);
});
test("count equalisation: identical profiles with unequal counts show a raw divergence artefact that equalisation removes", () => {
  const rng = eo.makeRng("art"), A = 20, draw = (n) => Int32Array.from({ length: n }, () => Math.floor(rng() * A));
  const toks = { big: draw(3000), mid: draw(600), small: draw(120) };
  const e = eo.equalisedJsd(toks, A, { floor: 100, downsamples: 100, rng: eo.makeRng("art2") });
  assert.equal(e.nMin, 120);
  assert.ok(e.raw["big|small"] > 3 * e.raw["big|mid"] * 0.5 && e.raw["mid|small"] > e.raw["big|mid"], `raw artefact: ${JSON.stringify(e.raw)}`);
  const ds = Object.values(e.d); assert.ok(Math.max(...ds) / Math.min(...ds) < 1.35, `equalised distances should agree: ${JSON.stringify(e.d)}`);
  assert.equal(eo.equalisedJsd({ a: draw(50), b: draw(500) }, A, { floor: 100, downsamples: 5, rng }), null);   // below the floor: no divergence
});
test("EO-2 pipeline on a PLANTED language set: a grain-structured world is detected, an identical-profile (artefact) world reads chance after equalisation", () => {
  const grains = eo.tableGrains();
  const mk = (lambda, key, eps = 0.25) => {
    const rng = eo.makeRng("toy2", key), A = 24, invs = {};
    for (const stem of ["tA", "tB", "tC"]) {
      const tokens = {}, counts = {}; tokens.Case = {}; counts.Case = {};
      const u = {}; for (const g of ["Ground", "Figure", "Pattern"]) u[g] = Float64Array.from({ length: A }, () => lambda * eo.gauss(rng));
      for (const [v, n] of Object.entries({ Nom: 2500, Acc: 1800, Gen: 500, Ins: 400, Dat: 330, Loc: 260, Abl: 200 })) {
        const p = Float64Array.from({ length: A }, (_, a) => Math.exp(u[grains.Case[v]][a] + eps * eo.gauss(rng))), z = p.reduce((x, y) => x + y, 0), cum = []; let t = 0; for (const x of p) { t += x / z; cum.push(t); }
        tokens.Case[v] = { o1: Int32Array.from({ length: n }, () => { const r = rng(); return Math.min(A - 1, cum.findIndex((c) => c >= r)); }), o2: new Int32Array(0) }; counts.Case[v] = { o1: n, o2: 0 };
      }
      invs[stem] = { stem, tokens, counts, A: { o1: A, o2: 1 }, sha256: "toy" };
    }
    return invs;
  };
  const run = (invs) => eo.eo2Analyse(invs, "o1", { draws: 199, downsamples: 30, boot: 100, withNull: true });
  const strong = run(mk(1.2, "s")), none = run(mk(0, "z"));
  const g = (a) => Object.values(a.langStats).map((l) => l.obs.caseAll.gamma);
  assert.ok(g(strong).every((x) => x > 0.75), `planted grain structure should be detected: ${g(strong)}`);
  assert.ok(Math.abs(eo.mean(g(none)) - 0.5) < 0.12, `no planted structure reads near chance after equalisation: ${g(none)}`);
  assert.ok(Object.values(strong.langStats).every((l) => l.obs.H2.contrasts >= 3 || l.obs.H2.contrasts === 0));
  // a language set built for the artefact check (c4): identical profiles, real unequal counts
  const art = eo.plantArtefact(mk(1.2, "a"), "o1", "t"), a = run(art);
  assert.ok(Math.abs(eo.mean(g(a)) - 0.5) < 0.12, `artefact world after equalisation: ${g(a)}`);
});

// ── EO-1 on planted toys ─────────────────────────────────────────────────────────────────────
const sig = { M: 0.4, C: 0.3, L: 0.3 };
test("EO-1 plumbing: N1b keeps each major group's act multiset; N1c is contiguous in Levin order", () => {
  const base = eo.toyEo1Base(), draws = eo.withinMajorGroupPermutations(base.eoG, base.classMajor, { draws: 20, seed: "t" });
  assert.equal(draws.length, 20);
  const byMajor = (g) => { const m = new Map(); base.classMajor.forEach((mj, c) => { (m.get(mj) ?? m.set(mj, []).get(mj)).push(g[c]); }); return [...m].map(([k, v]) => [k, v.slice().sort().join(",")]).sort(); };
  assert.deepEqual(byMajor(draws[3]), byMajor(base.eoG));
  const c = eo.contiguousLevinCoarsenings(base.C, base.eoSizes, { draws: 6, seed: "t" });
  for (const g of c) { for (let i = 1; i < g.length; i++) assert.ok(g[i] >= g[i - 1], "blocks are contiguous in class order"); assert.equal(new Set(g).size, base.K); }
  // the design signatures of BARKER.md 8.2
  const classToAct = { "a-9.1": "NUL", "b-9.2": "SIG", "c-9.3": "SIG", "d-10.1": "CON", "e-10.2": "CON", "f-11": "INS" };
  const dsg = eo.withinMajorGroupPermutations(classToAct, { draws: 5, seed: "d" }); assert.equal(dsg.length, 5);
  for (const d of dsg) { assert.equal(d["a-9.1"] === "NUL" || d["a-9.1"] === "SIG", true); assert.equal(d["f-11"], "INS"); assert.deepEqual(Object.keys(d).length, 6); assert.equal(d["d-10.1"] === "CON" && d["e-10.2"] === "CON", true); }
  const dc = eo.contiguousLevinCoarsenings(Object.keys(classToAct), { sizeProfile: [2, 2, 2], draws: 4, seed: "d" }); assert.equal(dc.length, 4); assert.ok(dc.every((g) => g.length === 6));
  const plain = eo.redealPlain(base.eoG, eo.makeRng("p")); assert.equal(plain.slice().sort().join(), Array.from(base.eoG).sort().join());
});
test("EO-1 S1: a planted group effect passes both structure-preserving nulls; with none it does not, yet plain N1 is passed anyway (K6)", () => {
  const base = eo.toyEo1Base({ seed: "s1" });
  const read = (gamma) => {
    const w = eo.plantEo1World(base, { sig, gamma, key: `s1-${gamma}` }), nulls = eo.eo1Nulls(w, { draws: 399, bootDraws: 99 }), ce = eo.ceUnits(w, { g: w.eoG, K: w.K });
    return { w, nulls, s1: eo.eo1S1(w, nulls, ce, { boot: 150 }), ce };
  };
  const strong = read(1), none = read(0);
  assert.ok(strong.s1.N1b.p <= 0.01 && strong.s1.N1c.p <= 0.01 && strong.s1.thetaCI[0] > 0.02, JSON.stringify([strong.s1.N1b.p, strong.s1.N1c.p, strong.s1.thetaCI]));
  assert.ok(none.s1.N1b.p > eo.ALPHA || none.s1.N1c.p > eo.ALPHA || none.s1.thetaCI[0] <= 0.02, "no planted group effect must not pass N1b and N1c and the SESOI");
  assert.ok(none.s1.N1.p <= eo.ALPHA, "plain N1 is vacuous: class locality alone passes it");
  const ctl = eo.eo1Controls(none.w, none.nulls, { nCtrl: 40 });
  assert.equal(ctl.every((c) => !c.survived), true, JSON.stringify(ctl.map((c) => [c.id, c.survived])));
  assert.equal(ctl.find((c) => c.id.startsWith("iii")).calibrationReproduced, true);   // a Levin-range table with no EO input passes plain N1 and fails N1b/N1c
});
test("EO-1 S2: the exact enumeration has 362,880 placements and a planted additive grid is found at its own placement", () => {
  const P = eo.additiveProjections(); assert.equal(P.length, 9);
  for (const { P: M } of P) { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { let s = 0; for (let k = 0; k < 8; k++) s += M[i][k] * M[k][j]; assert.ok(Math.abs(s - M[i][j]) < 1e-9, "P is idempotent"); assert.ok(Math.abs(M[i][j] - M[j][i]) < 1e-9, "P is symmetric"); } }
  const base = eo.toyEo1Base({ seed: "s2" }), w = eo.plantEo1World(base, { sig: { M: 0.05, C: 0.05, L: 0.05 }, gamma: 1.4, structure: "additive", scale: 6, key: "add" });
  const r = eo.eo1S2(w, { boot: 0 }); assert.equal(r.placements, 362880);
  assert.ok(r.p2 < 0.2 && r.NA_EO < r.medianNA, `planted additive grid: NA_EO ${r.NA_EO} median ${r.medianNA} p2 ${r.p2}`);
  const g = eo.plantEo1World(base, { sig: { M: 0.05, C: 0.05, L: 0.05 }, gamma: 1.4, structure: "group", scale: 6, key: "grp" }), rg = eo.eo1S2(g, { boot: 0 });
  assert.ok(rg.theta < r.theta, "independent group vectors are less additive than a planted grid");
});
test("EO-1 S3, rivals and the end-to-end runner on a planted toy: a group effect SURVIVES the registered rule, no effect does not", () => {
  const base = eo.toyEo1Base({ seed: "e2e" }), ctx = eo.makeCtx({ split: "dev", outDir: path.join("/private/tmp/claude-501/barker/toyout", "tests") });
  const stub = { cached: true, sigmaCalibration: {}, reps: {}, seconds: 0, S1: { pass: true, P_up: true, P_down: true, tinyOk: true, zeroOk: true }, S2: { pass: false, P_up: false, P_down: false, tinyOk: true, zeroOk: true }, S3: { pass: true, P_up: true, P_down: true, tinyOk: true, zeroOk: true } };
  const strong = eo.runEo1(ctx, { ds: eo.plantEo1World(base, { sig, gamma: 1, key: "e2e1", scale: 2 }), powerCard: stub, nDraws: 299, boot: 100 });
  assert.equal(strong.subTests.S1.verdict, "SURVIVES"); assert.equal(strong.subTests.S1.bridge, "unlicensed"); assert.equal(strong.headline, false);   // unlicensed: never counted for or against EO
  assert.equal(strong.subTests.S2.outcome, "underpowered");                                                                                          // power gate failed: withheld
  assert.equal(strong.statistic.S2.withheld, true);
  assert.ok(strong.statistic.S3.r > 0.5);
  assert.equal(strong.scope, "english-ewt-only: one language, one treebank, one lineage");
  assert.ok(strong.control.every((c) => c.survived === false));
  const none = eo.runEo1(ctx, { ds: eo.plantEo1World(base, { sig, gamma: 0, key: "e2e0", scale: 2 }), powerCard: stub, nDraws: 299, boot: 100 });
  assert.notEqual(none.subTests.S1.verdict, "SURVIVES");
  for (const f of ["claim", "steelman", "outcome", "statistic", "null", "control", "power", "alternativeScores", "heldOutSystems", "notes"]) assert.ok(f in strong, `card field ${f}`);
  assert.deepEqual(Object.keys(strong.alternativeScores).filter((k) => ["P3", "EO@3", "L9", "LN", "V311", "D9"].includes(k)).sort(), ["D9", "EO@3", "L9", "LN", "P3", "V311"]);
});
test("EO-1 power card plumbing (quick mode on a toy): the trio, the calibration and the gate are computed and cached", { timeout: 240000 }, () => {
  const base = eo.toyEo1Base({ seed: "pw" }); base.fingerprint = "toy-pw";
  const ctx = eo.makeCtx({ split: "dev", quick: true, outDir: path.join("/private/tmp/claude-501/barker/toyout", "tests-pw") });
  const card = eo.eo1PowerCard(base, ctx, { force: true });
  for (const k of ["S1", "S2", "S3"]) for (const f of ["P_up", "P_down", "tinyOk", "zeroOk", "pass", "up", "down", "tiny", "zero", "gammas", "targets"]) assert.ok(f in card[k], `${k}.${f}`);
  assert.ok(card.S1.targets.up === 2 * eo.SESOI["EO-1.S1"].value && card.S1.targets.down === 0.5 * eo.SESOI["EO-1.S1"].value);
  assert.ok(card.S1.P_up, "a planted 2s effect is detected on the toy"); assert.ok(card.S1.gammas.up.gamma > card.S1.gammas.down.gamma);
  assert.equal(eo.eo1PowerCard(base, ctx).cached, true);
});

// ── EO-3 and EO-4 ───────────────────────────────────────────────────────────────────────────────
test("EO-3: a planted context source reads rung 1 and no rung 2; a character shuffle erases rung 1", { timeout: 120000 }, () => {
  const text = eo.eo3Generate(1, 50000, "t1"), r = eo.eo3System(text.slice(0, 40000), text.slice(40000), { boot: 100, rngKey: "t" });
  assert.ok(r.ci[0][0] > 0.5, `rung 1 read: ${r.delta}`); assert.ok(r.ci[1][1] < 0.01 + 0.005, `no rung 2 in a pure Markov source: ${r.ci[1]}`);
  const sh = eo.eo3System(eo.shuffleText(text.slice(0, 40000), "a"), eo.shuffleText(text.slice(40000), "b"), { boot: 100, rngKey: "s" });
  assert.ok(sh.ci[0][1] < 0.01, `shuffled text: rung 1 vanishes: ${sh.ci[0]}`);
  assert.equal(eo.shuffleText("abcdef", "k").split("").sort().join(""), "abcdef");
});
test("EO-4: the scalogram, the 24 orders, a planted Guttman world and the permutation null", () => {
  assert.equal(eo.EO4_ORDERS.length, 24);
  assert.equal(eo.scalogramErrors([true, true, false, false], [0, 1, 2, 3]).errors, 0);
  assert.equal(eo.scalogramErrors([false, true, true, true], [0, 1, 2, 3]).errors, 1);
  assert.equal(eo.scalogramErrors([true, null, null, false], [0, 1, 2, 3]), null);                    // fewer than 3 non-missing rungs
  const perfect = {}; for (let i = 0; i < 20; i++) { const h = i % 5; perfect[`L${i}`] = [0, 1, 2, 3].map((j) => j < h); }
  const st = eo.eo4Statistic(perfect); assert.equal(st.crEO, 1); assert.equal(st.first, true); assert.ok(st.theta > 0.1);
  const rnd = eo.plantGuttmanWorld(perfect, 0, "r"); assert.ok(Math.abs(eo.eo4Statistic(rnd).theta) < 0.15);
  const scaled = eo.plantGuttmanWorld(perfect, 1, "s", { copies: 3 }); assert.ok(eo.eo4Statistic(scaled).theta > 0.08);
  const a = eo.eo4Analyse(scaled, { stems: Object.keys(scaled), draws: 199, boot: 80, rngKey: "t" }); assert.ok(a.pPermutation <= 0.05 && a.first);
  assert.equal(eo.scriptOfText("привет мир"), "Cyrillic"); assert.equal(eo.scriptOfText("hello world"), "Latin"); assert.equal(eo.scriptOfText("中文文本测试"), "Han"); assert.equal(eo.scriptOfText("こんにちは"), "Kana");
});

// ── calibrations, crosswalk, typed gaps, dispatch ──────────────────────────────────────────────
test("calibrations K2 and K3 reproduce EO's own refutations on planted analogues; K1, K4, K5 are delegated and never counted as passed", () => {
  const cards = eo.calibration(null, { quick: true }), by = Object.fromEntries(cards.map((c) => [c.id.split(" ")[0], c]));
  assert.equal(by.K2.pass, true); assert.equal(by.K3.pass, true);
  for (const k of ["K1", "K4", "K5"]) { assert.equal(by[k].pass, null); assert.match(by[k].verdict, /DELEGATED/); }
  const kc = eo.labelStability(Array.from({ length: 30 }, () => ["a", "b", "c", "d", "e", "f"]), (w) => w, { boot: 50, key: "x" });
  assert.ok(kc.contentDetermined, "a labeler that reads only word identity is content-determined");
});
test("crosswalk has no verdicts; untestable claims carry the exact missing data; the summary has no aggregate EO score", () => {
  assert.ok(eo.crosswalk().every((r) => r.verdict === null && r.phase === "COMPARATIVE"));
  const ctx = eo.makeCtx({ split: "dev" });
  for (const id of ["EO-7", "EO-8", "EO-9", "EO-10"]) { const c = eo.runClaim(id, ctx); assert.equal(c.outcome, "untestable"); assert.ok(c.gaps[0].missing.length > 20); }
  assert.equal(eo.runClaim("EO-5", ctx, { quick: true }).outcome, "refuted");        // on record
  assert.throws(() => eo.runClaim("EO-99", ctx), /unknown claim/);
  const s = eo.batterySummary([{ id: "a", verdict: "SURVIVES", outcome: "survives" }, { id: "b", verdict: "INSTRUMENT_FAILED", outcome: "instrument_failed" }, { id: "c", verdict: "UNDERPOWERED", outcome: "underpowered" }, { id: "d", verdict: "SURVIVES", nearForegone: true }]);
  assert.deepEqual(s.failuresFirst.map((r) => r.id), ["b", "c", "a"]); assert.equal(s.nearForegone.length, 1); assert.equal(s.aggregateEoScore, null);
});
test("EO-4 on an empty card set is a typed gap, never a pass", () => {
  const ctx = eo.makeCtx({ split: "dev" }), c = eo.runEo4(ctx, { cards: { matrix: {}, gaps: [], stems: [] } });
  assert.equal(c.outcome, "untestable"); assert.match(c.verdictReasons[0], /non-missing rungs/);
});
test("CLI argument parsing", () => {
  const o = eo.parseCli(["--split", "dev", "--claim", "EO-1", "--quick"]); assert.deepEqual([o.split, o.claim, o.quick], ["dev", "EO-1", true]);
  assert.throws(() => eo.parseCli(["--wat"]), /unknown argument/);
});
