// R0 (identify) — the INSTRUMENT is regression-guarded here, not the listener.
// Every case runs the instrument on a toy fixture whose right answer is known by
// construction: a perfect system must score 1, a deranged one must score low, a
// control that does as well as the real arm must be refused, and the stream-level
// statistics must move the way the pre-registration says they do (II.23).
// The cases tagged A2 guard the v2 rule (AMENDMENT A2 in the instrument's header):
// the mutants the reviewer used to pass v1 (noisy, noscript, always-the-stem,
// always-wrong) must FAIL here, a script-determined stem must be a typed gap and
// not a pass or a "broken mechanism", the inventory pin must refuse a changed
// candidate set, and the v1 and A1 pre-registration digests must not move.
// The only cases that touch the real listener/priors check plumbing and that the
// derangement leaves the priors as it found them.
import test from "node:test";
import assert from "node:assert/strict";
import { grammarFor } from "../the-fold/language-grammar.js";
import { createLanguageListener } from "../the-fold/language-listener.js";
import {
  PARAMS, A2P, scoreR0, armStats, startsOf, compareArms, collect, makeStreams, blockOffsets, derangePlan, withDeranged, scramble,
  coverageDrop, analyseSwitch, summariseSwitch, majorityLabel, familyOf, norm, strongest, candidateTable, measure, checkPredictions,
  checkPredictionsA2, equalisedReport, amendmentDigest, amendmentDigestA2, A1_SEEDS, SAME_FAMILY, silenceMoves, verdictInvariance,
  loadPin, checkPin, buildPin, foreignPartnersOf, foreignStreams, readTrainTexts, trainCharModel, makeCharListener, bigramsOf, udhrSentences,
  priorDigest,
} from "../eval/competence/r0-identify.mjs";
import { mulberry32, headerDigest } from "../eval/competence/lib.mjs";

const V = (language, gap = null) => ({ language, gap: language ? null : gap });
const rep = (v, n) => Array.from({ length: n }, () => v);
const streamsOf = (T = 8, per = 10) => Array.from({ length: T }, (_, t) => Array.from({ length: per }, (_, i) => `toy ${t}-${i}`));
const arm = (v, T = 8, per = 10) => Array.from({ length: T }, () => rep(v, per));
const SILENT = V(null, "language_unheard");
// every control licensed; the v2 scramble licence additionally needs the scramble to move the silent rate (the fixtures' scrambled arms are silent)
const allLicensed = { deranged_equalised: { licensed: true }, scrambled_text: { licensed: true }, majority_script: { licensed: true }, foreign: { licensed: true } };
const k3 = { k: 3 };
/** a fixture of a well-behaved listener on stem "eng": right on its own text, wrong-labelled controls, never names eng on foreign text */
const good = (over = {}) => ({
  real: arm(V("eng")), deranged_equalised: [arm(V("spa")), arm(V("spa"))], scrambled_text: arm(SILENT), majority_script: arm(V("spa")), foreign: arm(V("spa")), ...over,
});
const score = (arms, { stem = "eng", licence = allLicensed, ctx = k3, T = 8, per = 10 } = {}) => scoreR0({ stem, streams: streamsOf(T, per), arms, licence, ctx });

// ── the scoring arithmetic (v2) ─────────────────────────────────────────────

test("a perfect system scores 1, the controls score 0, and the v2 rule is met", () => {
  const card = score(good());
  assert.equal(card.score, 1);
  assert.equal(card.controls.deranged_equalised, 0);
  assert.equal(card.control, 0);
  assert.equal(card.margin, 1);
  assert.equal(card.pass, true);
  assert.equal(card.n, 80);
  assert.equal(card.aggregate_eligible, true);
  assert.ok(card.details.tests.majority_script.p_stream < PARAMS.ALPHA);
  assert.equal(card.details.first_decision.median, 1);
  assert.equal(card.details.rule_version, "v2/A2");
  assert.equal(card.details.gates.G2_floor.ok, true);
  assert.equal(card.details.gates.G4_specificity.ok, true);
});

test("a deranged system scores low and fails: it names the wrong language every time", () => {
  const card = score(good({ real: arm(V("spa")), deranged_equalised: [arm(V("deu"))] }));
  assert.equal(card.score, 0);
  assert.equal(card.pass, false);
  assert.equal(card.details.confusions[0].label, "spa");
  assert.equal(card.details.confusions[0].share_of_decided, 1);
});

test("hiding behind language_unheard fails the 50% rule even when no verdict is ever wrong", () => {
  const stream = [...rep(V("eng"), 4), ...rep(SILENT, 6)];
  const card = score(good({ real: Array.from({ length: 8 }, () => stream) }));
  assert.equal(card.details.unheard_rate, 0.6);
  assert.equal(card.details.precision, 1);   // never wrong when it speaks...
  assert.equal(card.pass, false);            // ...but silent for 60% of the stream
  assert.ok(card.gaps.some((g) => g.reason === "language_unheard" && g.count === 48 && g.of === 80));
});

test("the accuracy window starts at the first decision: the cost of being causal is reported, not hidden", () => {
  const stream = [...rep(SILENT, 3), ...rep(V("eng"), 7)];
  const real = Array.from({ length: 8 }, () => stream);
  const card = score(good({ real }));
  assert.deepEqual(card.details.first_decision.per_stream, rep(4, 8));
  assert.equal(card.details.first_decision.median, 4);
  assert.equal(card.score, 1);                         // after the decision it is always right
  assert.equal(card.details.unheard_rate, 0.3);        // but 3 of every 10 sentences were unheard
  assert.deepEqual(startsOf(real), rep(3, 8));
});

test("a control that does as well as the real arm is refused (II.23) and flagged as a broken instrument or mechanism", () => {
  const card = score(good({ deranged_equalised: [arm(V("eng"))] }));
  assert.equal(card.pass, false);
  assert.ok(card.notes.some((n) => /does as well as the real arm/.test(n)));
});

test("an UNlicensed control is reported but never gates: with none licensed the verdict is a typed gap, not a pass", () => {
  const card = score({ real: arm(V("eng")), majority_script: arm(V("eng")), foreign: arm(V("spa")) }, { licence: { majority_script: { licensed: false, reason: "its label is the gold" }, foreign: { licensed: true } } });
  assert.equal(card.controls.majority_script, 1);      // still reported
  assert.equal(card.control, null);                    // never used as `control`
  assert.equal(card.pass, null);                       // nothing built to fail
  assert.ok(card.gaps.some((g) => g.reason === "no_licensed_control"));
  assert.ok(card.gaps.some((g) => g.reason === "control_not_licensed"));
});

test("the unit of significance is the STREAM: 7 wins + 1 loss beat the control, 6 + 2 do not; 5 wins + 3 ties beat it, 4 + 4 ties do not", () => {
  const T = 8, per = 10;
  const mk = (win, loss) => {
    const real = [], ctl = [];
    for (let t = 0; t < T; t++) {
      if (t < win) { real.push(rep(V("eng"), per)); ctl.push(rep(V("spa"), per)); }
      else if (t < win + loss) { real.push(rep(V("spa"), per)); ctl.push(rep(V("eng"), per)); }
      else { real.push(rep(V("eng"), per)); ctl.push(rep(V("eng"), per)); }
    }
    return { real, ctl };
  };
  const run = (w, l) => { const m = mk(w, l); return score({ real: m.real, majority_script: m.ctl, foreign: arm(V("spa")) }, { licence: { majority_script: { licensed: true }, foreign: { licensed: true } } }); };
  const a = run(7, 1), b = run(6, 2), c = run(5, 0), d = run(4, 0);
  assert.equal(a.details.tests.majority_script.wins, 7);
  assert.equal(a.details.tests.majority_script.losses, 1);
  assert.ok(a.details.tests.majority_script.p_stream < 0.05);
  assert.equal(a.pass, true);
  assert.ok(b.details.tests.majority_script.p_stream > 0.05);
  assert.equal(b.pass, false);
  // the sentence-level paired binomial is far smaller for the same data: the anti-conservative number the rule refuses to use
  assert.ok(b.details.tests.majority_script.p_sentence < b.details.tests.majority_script.p_stream);
  // ties are dropped by the sign test: 5 wins with no loss reach alpha (1/32), 4 do not (1/16), though real is perfect in both
  assert.equal(c.details.tests.majority_script.ties, 3);
  assert.equal(c.pass, true);
  assert.equal(d.details.gates.G2_floor.ok, true);
  assert.equal(d.pass, false);
});

test("too few streams cannot reach alpha: pass is a typed gap, not a verdict", () => {
  const card = score(good({ real: arm(V("eng"), 4), deranged_equalised: [arm(V("spa"), 4)], scrambled_text: arm(SILENT, 4), majority_script: arm(V("spa"), 4), foreign: arm(V("spa"), 4) }), { T: 4 });
  assert.equal(card.pass, null);
  assert.ok(card.gaps.some((g) => g.reason === "too_few_streams"));
});

test("cmn vs cmn-hans is strict, and the swap is reported separately", () => {
  const card = score(good({ real: arm(V("cmn")), deranged_equalised: [arm(V("jpn"))] }), { stem: "cmn-hans", ctx: { k: 4 } });
  assert.equal(card.score, 0);
  assert.equal(card.details.collapsed_accuracy, 1);
  assert.equal(card.details.swap_rate, 1);
  assert.ok(card.notes.some((n) => /swap/.test(n)));
  assert.equal(card.pass, false);   // naming the other script variant every time is not a pass
  const other = armStats(arm(V("fra")), "eng", rep(0, 8));
  assert.equal(other.swapRate, null);   // only the two Chinese variants have a swap
});

test("compareArms refuses arms scored over different windows (the comparison must be sentence-for-sentence)", () => {
  const a = armStats(arm(V("eng")), "eng", rep(0, 8)), b = armStats(arm(V("eng")), "eng", rep(2, 8));
  assert.throws(() => compareArms(a, b), /different windows/);
});

test("causality: the instrument hands over ONE sentence at a time, in order, to a fresh listener per stream, and never shows the tail", () => {
  const S = streamsOf(3, 5);
  let created = 0;
  const log = [];
  const factory = () => {
    created += 1;
    const id = created;
    const received = [];
    return {
      listen(...args) {
        assert.equal(args.length, 1, "listen takes the sentence alone");
        assert.equal(typeof args[0], "string");
        received.push(args[0]);
        log.push({ listener: id, upTo: received.length });
        return { language: "eng" };
      },
      revisions: () => [],
    };
  };
  collect(S, factory);
  assert.equal(created, 3);
  for (const e of log) assert.ok(e.upTo >= 1 && e.upTo <= 5);
  // every listener saw exactly its own stream, in order, and nothing else
  const seen = {};
  const spy = () => { const id = Object.keys(seen).length; seen[id] = []; return { listen: (t) => { seen[id].push(t); return { language: null, gap: "language_unheard" }; } }; };
  collect(S, spy);
  assert.deepEqual(Object.values(seen), S);
});

// ── A2 D1: verdict accounting (the dodge of gate (a)) ───────────────────────

test("A2 D1: verdicts are normalised against the TEXT fed: a null is no_script only when the text really has no letter in a known script", () => {
  // legacy (no text): the listener's own typed gap is trusted
  assert.deepEqual(norm({ language: "eng" }), { language: "eng", gap: null });
  assert.deepEqual(norm({ language: null, gap: "language_unheard" }), { language: null, gap: "language_unheard" });
  assert.deepEqual(norm({ language: null, gap: "no letters in a known script" }), { language: null, gap: "no_script" });
  assert.deepEqual(norm({ language: null }), { language: null, gap: "language_unheard" });
  // with the text: "no letters" about a sentence that HAS letters is silence, and the instrument remembers what the listener said
  assert.deepEqual(norm({ language: null, gap: "no letters in a known script" }, "The committee decided."), { language: null, gap: "language_unheard", said: "no_script" });
  assert.deepEqual(norm({ language: null, gap: "something else entirely" }, "The committee decided."), { language: null, gap: "language_unheard", said: "other" });
  assert.deepEqual(norm({ language: null, gap: "language_unheard" }, "The committee decided."), { language: null, gap: "language_unheard" });
  // a sentence with no letters in a known script is legitimately outside the evidence, whatever the listener called the null
  assert.deepEqual(norm({ language: null, gap: "no letters in a known script" }, "12 + 34 = 46 !"), { language: null, gap: "no_script" });
  assert.deepEqual(norm({ language: null, gap: "language_unheard" }, "12 + 34 = 46 !"), { language: null, gap: "no_script", said: "language_unheard" });
  // a non-null verdict is never touched
  assert.deepEqual(norm({ language: "eng" }, "12 + 34 = 46 !"), { language: "eng", gap: null });
});

test("A2 D1: armStats counts every null on a sentence with letters as SILENT; a legitimate no_script is outside the silent denominator", () => {
  const vs = [[V("eng"), V(null, "no_script"), V(null, "weird"), V(null, "language_unheard"), { language: null, gap: "language_unheard", said: "no_script" }]];
  const a = armStats(vs, "eng", [0]);
  assert.equal(a.unheardN, 3);          // "weird", "language_unheard" and the misreport
  assert.equal(a.noScriptN, 1);
  assert.equal(a.evidenceN, 4);
  assert.equal(a.unheard, 0.75);        // 3 of the 4 sentences that have letters
  assert.equal(a.misreportN, 1);
});

// a toy "listener": wraps a perfect-English listener and mutates it exactly as the reviewer did (by sentence index, deterministic)
const ENG = [
  "The committee decided that the new policy would be announced on Tuesday.", "She said that they had not seen the results of the survey.",
  "We are going to the market because there is nothing left in the house.", "He was one of the people who could not believe what had happened.",
  "The children played in the garden until it was too dark to see.", "It is difficult to say what the minister really meant by that.",
  "They walked along the river and talked about their plans for the summer.", "There was a long silence before anyone dared to answer the question.",
  "The report was published last week and has been widely discussed since.", "I would like to thank everyone who helped us to prepare this meeting.",
];
const PER = 100;   // a multiple of 100 makes the index-driven mutants hit their stated rates exactly (37 is coprime with 100)
const engStreams = (T = 8, per = PER) => Array.from({ length: T }, () => Array.from({ length: per }, (_, i) => ENG[i % ENG.length]));
const mutant = (kind, name = "eng") => () => {
  let i = -1;
  return {
    listen() {
      i += 1;
      const h = (i * 37) % 100;   // a fixed, deterministic spread over 0..99
      switch (kind) {
        case "noisy": return h < 45 ? { language: null, gap: "language_unheard" } : h < 70 ? { language: "deu" } : { language: name };
        case "noscript": return h < 80 ? { language: null, gap: "no letters in a known script" } : { language: name };
        case "stem": return { language: name };
        case "wrong": return { language: "deu" };
        default: return { language: name };
      }
    },
    revisions: () => [],
  };
};
const foreignTexts = (T = 8, per = PER) => Array.from({ length: T }, () => Array.from({ length: per }, (_, i) => ["El comité decidió que la nueva política se anunciaría el martes.", "Ella dijo que no habían visto los resultados de la encuesta."][i % 2]));
const armsOfMutant = (kind) => {
  const S = engStreams();
  const real = collect(S, mutant(kind)).map((r) => r.verdicts);
  const foreign = collect(foreignTexts(), mutant(kind)).map((r) => r.verdicts);
  // the controls are the usual constant-wrong ones, as in the dev cards, so the CONTROLS cannot be what rescues or sinks the mutant
  return { S, arms: { real, deranged_equalised: [arm(SILENT, 8, PER)], scrambled_text: arm(SILENT, 8, PER), majority_script: arm(V("ces"), 8, PER), foreign }, licence: allLicensed };
};
const cardOfMutant = (kind) => { const m = armsOfMutant(kind); return scoreR0({ stem: "eng", streams: m.S, arms: m.arms, licence: m.licence, ctx: { k: 37 } }); };

test("A2 mutant: a noisy listener (45% silent, 25% wrong label, 30% right) FAILS the floor; v1 passed it", () => {
  const card = cardOfMutant("noisy");
  assert.ok(card.details.unheard_rate > 0.4 && card.details.unheard_rate < 0.5);
  assert.ok(card.score < 0.5, `accuracy ${card.score}`);
  assert.equal(card.details.gates.G2_floor.ok, false);
  assert.equal(card.pass, false);
  assert.ok(card.notes.some((n) => /FLOOR not met/.test(n)));
  assert.equal(card.details.pass_v1, true, "the v1 rule on the same arms passes the mutant: the very fault the floor closes");
});

test("A2 mutant: a listener that answers 'no letters in a known script' for 80% of sentences that HAVE letters is SILENT, and fails gate (a); v1 counted it as no_script", () => {
  const card = cardOfMutant("noscript");
  assert.ok(card.details.unheard_rate >= 0.75, `silent rate ${card.details.unheard_rate}`);
  assert.equal(card.details.no_script_rate, 0, "none of these sentences is evidence-free");
  assert.equal(card.details.gates.G1_silent.ok, false);
  assert.equal(card.pass, false);
  assert.ok(card.gaps.some((g) => g.reason === "gap_misreport" && g.count > 0));
  // the legacy accounting (listener's own gap string, no text) would have called these no_script and let the stem through gate (a)
  const legacy = collect(engStreams(), mutant("noscript")).map((r) => r.verdicts.map((v) => norm({ language: v.language, gap: v.said === "no_script" ? "no letters in a known script" : v.gap })));
  assert.ok(legacy.flat().filter((v) => v.gap === "no_script").length > 100);
});

test("A2 mutant: a listener that names the stem for ANY text fails the specificity arm (G4), though its own-language accuracy is perfect", () => {
  const card = cardOfMutant("stem");
  assert.equal(card.score, 1);
  assert.equal(card.details.foreign.false_positive_rate, 1);
  assert.equal(card.details.gates.G4_specificity.ok, false);
  assert.equal(card.pass, false);
  assert.ok(card.notes.some((n) => /SPECIFICITY not met/.test(n)));
});

test("A2 mutant: a listener that always names the wrong language fails the floor", () => {
  const card = cardOfMutant("wrong");
  assert.equal(card.score, 0);
  assert.equal(card.pass, false);
  assert.equal(card.details.gates.G2_floor.ok, false);
});

test("A2 mutant control: the unmutated toy listener passes on the same fixture (so the mutants fail for the mutation, not the fixture)", () => {
  const S = engStreams();
  const ok = () => { let i = -1; return { listen: (t) => { i += 1; return /^[A-Za-z]/.test(t) && /The |She |We |He |It |They |There |I /.test(t) ? { language: "eng" } : { language: "spa" }; }, revisions: () => [] }; };
  const real = collect(S, ok).map((r) => r.verdicts), foreign = collect(foreignTexts(), ok).map((r) => r.verdicts);
  const card = scoreR0({ stem: "eng", streams: S, arms: { real, deranged_equalised: [arm(SILENT, 8, PER)], scrambled_text: arm(SILENT, 8, PER), majority_script: arm(V("ces"), 8, PER), foreign }, licence: allLicensed, ctx: { k: 37 } });
  assert.equal(card.score, 1);
  assert.equal(card.details.foreign.false_positive_rate, 0);
  assert.equal(card.pass, true);
});

// ── A2 D5: the floor is derived, not a bare number ──────────────────────────

test("A2 D5: the floor F = chance + EFFECT x (1 - chance) with chance = max(1/k, strongest licensed gating control); k = 1 has chance 0", () => {
  const c37 = score(good(), { ctx: { k: 37 } });
  assert.equal(c37.details.gates.G2_floor.c0, round4(1 / 37));
  assert.equal(c37.details.gates.G2_floor.F, round4(1 / 37 + 0.5 * (1 - 1 / 37)));
  // a strong LICENSED control raises the bar the real arm must clear
  const strongCtl = score(good({ majority_script: Array.from({ length: 8 }, (_, t) => (t < 6 ? rep(V("eng"), 10) : rep(V("spa"), 10))) }), { ctx: { k: 37 } });   // .75 accurate control (licensed)
  assert.equal(strongCtl.details.gates.G2_floor.chance, 0.75);
  assert.equal(strongCtl.details.gates.G2_floor.F, 0.875);
  const one = score(good(), { ctx: { k: 1 } });
  assert.equal(one.details.gates.G2_floor.c0, 0);
  assert.equal(one.details.gates.G2_floor.F, 0.5);
});
const round4 = (x) => Number(x.toFixed(4));

test("A2 D5: pooled accuracy, pooled precision and the stream sign test must ALL clear the floor", () => {
  // 60% right on the window, never silent: below F (~.667 with k=3)
  const real = Array.from({ length: 8 }, () => [...rep(V("eng"), 6), ...rep(V("spa"), 4)]);
  const c = score(good({ real }));
  assert.equal(c.pass, false);
  assert.equal(c.details.gates.G2_floor.pooled_accuracy, 0.6);
  // right on most streams but two streams below the floor: the pooled number clears, the stream test does not (6 of 8, p=.145)
  const mixed = Array.from({ length: 8 }, (_, t) => (t < 6 ? rep(V("eng"), 10) : rep(V("spa"), 10)));
  const m = score(good({ real: mixed }));
  assert.ok(m.details.gates.G2_floor.pooled_accuracy >= m.details.gates.G2_floor.F);
  assert.equal(m.details.gates.G2_floor.streams_at_floor, 6);
  assert.equal(m.pass, false);
});

// ── A2 D3/D4: the scramble must move the verdict; script-determined stems are a typed gap ──

test("A2 D3: silenceMoves and verdictInvariance are the verdict-level licence and the script-determined measurement", () => {
  const real = armStats(arm(V("eng")), "eng", rep(0, 8)), blind = armStats(arm(V("eng")), "eng", rep(0, 8)), quiet = armStats(arm(SILENT), "eng", rep(0, 8));
  assert.equal(silenceMoves(real, blind).licensed, false);
  assert.equal(silenceMoves(real, quiet).licensed, true);
  assert.equal(verdictInvariance(arm(V("eng")), arm(V("eng")), rep(0, 8)), 1);
  assert.equal(verdictInvariance(arm(V("eng")), arm(SILENT), rep(0, 8)), 0);
  assert.equal(verdictInvariance(arm(SILENT), arm(SILENT), rep(0, 8)), 1, "silent on both is the same verdict");
  assert.equal(verdictInvariance([[V("eng"), V("eng")]], [[V("spa"), V("eng")]], [1]), 1, "only the window is compared");
});

test("A2 D3: a scramble control that leaves the listener speaking as before is UNlicensed (the verdict does not move), though coverage dropped", () => {
  const c = score(good({ scrambled_text: arm(V("eng")) }), { ctx: { k: 4 } });
  assert.equal(c.details.licence.scrambled_text.licensed_v1, true);     // coverage dropped: v1 would have licensed it
  assert.equal(c.details.licence.scrambled_text.licensed, false);       // v2: the verdict statistic did not move
  assert.ok(/does not move the verdict statistic/.test(c.details.licence.scrambled_text.reason));
  assert.ok(c.gaps.some((g) => g.reason === "control_not_licensed" && /scrambled_text/.test(g.detail)));
});

test("A2 D4: a stem whose verdict survives the scramble is script_determined: pass null with a typed gap, aggregate_eligible false, score still reported; v1 said false", () => {
  const card = score({ real: arm(V("cmn-hans")), deranged_equalised: [arm(V("jpn"))], scrambled_text: arm(V("cmn-hans")), majority_script: arm(V("jpn")), foreign: arm(V("jpn")), deranged_priors: arm(V("jpn")) },
    { stem: "cmn-hans", ctx: { k: 4 }, licence: { ...allLicensed, deranged_priors: { licensed: true } } });
  assert.equal(card.score, 1);
  assert.equal(card.pass, null);
  assert.equal(card.aggregate_eligible, false);
  assert.ok(card.gaps.some((g) => g.reason === "script_determined" && g.count === 80));
  assert.equal(card.details.gates.script_determined.determined, true);
  assert.equal(card.details.gates.script_determined.structural, false);
  assert.equal(card.details.pass_v1, false, "v1: the scramble control matched the real arm: 'mechanism broken'");
  assert.equal(card.details.pass_deranged_only, true, "the task's literal rule, reported only");
});

test("A2 D4: a one-candidate script is script_determined structurally; the foreign arm still runs, and a floor failure is still a FAIL", () => {
  const ok = score({ real: arm(V("kor")), scrambled_text: arm(SILENT), majority_script: arm(V("kor")), foreign: arm(V("eng")) }, { stem: "kor", ctx: { k: 1 }, licence: { majority_script: { licensed: false, reason: "label is the gold" }, scrambled_text: { licensed: true }, foreign: { licensed: true } } });
  assert.equal(ok.pass, null);
  assert.equal(ok.details.gates.script_determined.structural, true);
  assert.equal(ok.aggregate_eligible, false);
  assert.equal(ok.score, 1);
  // a one-candidate listener that is silent for most of the text is not "script-determined": it fails
  const mute = score({ real: Array.from({ length: 8 }, () => [V("kor"), ...rep(SILENT, 9)]), scrambled_text: arm(SILENT), majority_script: arm(V("kor")), foreign: arm(V("eng")) }, { stem: "kor", ctx: { k: 1 }, licence: { majority_script: { licensed: false }, scrambled_text: { licensed: true }, foreign: { licensed: true } } });
  assert.equal(mute.pass, false);
  // and one that names kor for foreign-script text fails specificity
  const eager = score({ real: arm(V("kor")), scrambled_text: arm(SILENT), majority_script: arm(V("kor")), foreign: arm(V("kor")) }, { stem: "kor", ctx: { k: 1 }, licence: { majority_script: { licensed: false }, scrambled_text: { licensed: true }, foreign: { licensed: true } } });
  assert.equal(eager.pass, false);
});

test("A2 D5: the foreign arm is gating: missing or unlicensed it is a typed gap (never a pass), and an unlicensed one does not fail the listener", () => {
  const missing = score(good({ foreign: undefined }));
  assert.equal(missing.pass, null);
  assert.ok(missing.gaps.some((g) => g.reason === "foreign_arm_not_built"));
  const unlicensed = score(good(), { licence: { ...allLicensed, foreign: { licensed: false } } });
  assert.equal(unlicensed.pass, null);
  assert.ok(unlicensed.gaps.some((g) => g.reason === "foreign_arm_unlicensed"));
  const named = score(good({ foreign: arm(V("eng")) }));
  assert.equal(named.pass, false);
  // a foreign stream may be named the stem occasionally: within the bound 1 - F per stream, and the stream sign test, it passes
  const some = score(good({ foreign: Array.from({ length: 8 }, (_, t) => (t === 0 ? [...rep(V("eng"), 3), ...rep(V("spa"), 7)] : rep(V("spa"), 10))) }));
  assert.equal(some.pass, true);
  assert.ok(some.details.foreign.false_positive_rate > 0);
});

// ── the pinned inventory (A2 D2) ────────────────────────────────────────────

test("A2 D2: the pin declares the 53 candidates, SAME_FAMILY, foreign partners and OOV text; the live inventory matches it", () => {
  const loaded = loadPin();
  assert.ok(loaded, "eval/competence/r0-inventory.json exists");
  assert.match(loaded.sha256, /^[0-9a-f]{64}$/);
  const pin = loaded.pin;
  assert.equal(Object.values(pin.families).flat().length, 53);
  assert.deepEqual(pin.same_family, Object.fromEntries(Object.keys(SAME_FAMILY).sort().map((k) => [k, SAME_FAMILY[k]])));
  assert.equal(pin.same_family.lzh, "cmn");
  const table = candidateTable();
  for (const stem of ["eng", "kor", "cmn-hans", "arb", "spa"]) { const c = checkPin(pin, table, stem); assert.ok(c.ok, `${stem}: ${c.problems.join("; ")}`); }
  assert.deepEqual(pin.foreign_partners.eng, foreignPartnersOf("eng", table, "Latin"));
  assert.deepEqual(pin.foreign_partners.kor, ["eng"]);
  assert.deepEqual(pin.foreign_partners["cmn-hans"], ["jpn", "lzh", "cmn", "eng"]);
  assert.equal(pin.foreign_partners.eng.at(-1), "rus");
  assert.deepEqual(buildPin(table).families, pin.families);
});

test("A2 D2: a changed candidate set, a changed prior, an unpinned stem or a changed partner map REFUSES the card (typed gap inventory_mismatch, nothing run)", async () => {
  const { pin } = loadPin();
  const table = candidateTable();
  const dropped = { ...pin, families: { ...pin.families, Hangul: ["kor", "zzz"] } };
  assert.equal(checkPin(dropped, table, "kor").ok, false);
  assert.ok(checkPin(dropped, table, "kor").problems.some((p) => /family Hangul/.test(p) && /removed: zzz/.test(p)));
  const rebuilt = { ...pin, priors_sha256: { ...pin.priors_sha256, kor: "0".repeat(64) } };
  assert.ok(checkPin(rebuilt, table, "kor").problems.some((p) => /prior content of kor changed/.test(p)));
  const noStem = { ...pin, foreign_partners: Object.fromEntries(Object.entries(pin.foreign_partners).filter(([s]) => s !== "kor")) };
  assert.ok(checkPin(noStem, table, "kor").problems.some((p) => /no pinned foreign partners/.test(p)));
  const remapped = { ...pin, same_family: { ...pin.same_family, eng: "fra" } };
  assert.ok(checkPin(remapped, table, "eng").problems.some((p) => /SAME_FAMILY/.test(p)));
  // a family the stem's card does not touch may change without refusing it (Hebrew vs a Hangul card), but a partner's family may not
  const heb = { ...pin, families: { ...pin.families, Hebrew: ["heb", "zzz"] } };
  assert.equal(checkPin(heb, table, "kor").ok, true);
  const rus = { ...pin, families: { ...pin.families, Latin: pin.families.Latin.filter((s) => s !== "eng") } };
  assert.equal(checkPin(rus, table, "kor").ok, false, "kor's foreign partner is eng: the Latin family is part of its card");
  // measure() refuses end to end, and fast: it runs nothing
  const card = await measure({ stem: "kor", split: "dev", pin: dropped });
  assert.equal(card.pass, null);
  assert.equal(card.score, null);
  assert.equal(card.gaps[0].reason, "inventory_mismatch");
  assert.ok(card.details.inventory.problems.length >= 1);
  const card2 = await measure({ stem: "kor", split: "dev", pin: rebuilt });
  assert.equal(card2.gaps[0].reason, "inventory_mismatch");
  assert.equal(priorDigest("kor"), pin.priors_sha256.kor);
});

// ── the controls and arms (unchanged helpers) ───────────────────────────────

test("derangePlan re-deals the keys across same-script languages, keeps sizes and counts, spares single-language scripts, is seeded", () => {
  const forms = {
    eng: { the: { DET: 9 }, of: { ADP: 7 }, dog: { NOUN: 3 }, runs: { VERB: 2 } },
    spa: { el: { DET: 8 }, de: { ADP: 6 }, perro: { NOUN: 3 }, corre: { VERB: 2 } },
    fra: { le: { DET: 8 }, du: { ADP: 5 }, chien: { NOUN: 2 }, court: { VERB: 2 } },
    kor: { 개: { NOUN: 4 }, 달린다: { VERB: 1 } },
  };
  const fam = { eng: "Latin", spa: "Latin", fra: "Latin", kor: "Hangul" };
  const a = derangePlan(forms, fam, 11), b = derangePlan(forms, fam, 11), c = derangePlan(forms, fam, 12);
  assert.deepEqual(Object.keys(a.plan).sort(), ["eng", "fra", "spa"]);      // kor: one candidate, the identity, not in the plan
  assert.deepEqual(a.plan, b.plan);                                          // same seed, same derangement
  assert.notDeepEqual(a.plan, c.plan);                                       // another seed, another one
  const union = new Set(Object.values(forms).flatMap((f) => Object.keys(f)).filter((k) => !/[가-힣]/.test(k)));
  for (const s of ["eng", "spa", "fra"]) {
    assert.equal(Object.keys(a.plan[s]).length, 4);                          // table size kept
    for (const k of Object.keys(a.plan[s])) assert.ok(union.has(k));         // keys come from the family's pool only
    assert.deepEqual(Object.values(a.plan[s]).map((v) => JSON.stringify(v)).sort(), Object.values(forms[s]).map((v) => JSON.stringify(v)).sort()); // class counts kept
  }
  // somewhere the words moved: the licence number is not zero
  assert.ok(Object.values(a.perturbation).some((x) => x > 0));
});

test("withDeranged runs the unchanged listener on moved priors and then puts the priors back — even when the callback throws; `only` leaves the other families alone", () => {
  const eng = grammarFor("eng").posPrior, spa = grammarFor("spa").posPrior, arb = grammarFor("arb").posPrior;
  const e0 = eng.forms, s0 = spa.forms, a0 = arb.forms;
  const probe = Object.keys(e0).filter((w) => /^[a-z]{4,}$/.test(w)).slice(0, 200);
  const { value, perturbation } = withDeranged(11, () => ({ same: grammarFor("eng").posPrior === eng, forms: eng.forms, inEng: probe.filter((w) => eng.forms[w]).length }));
  assert.equal(value.same, true, "the listener reads the SAME prior object, mutated in place");
  assert.notEqual(value.forms, e0);
  assert.ok(value.inEng < probe.length, "words the prior attested are no longer all attested");
  assert.ok(perturbation.eng > 0.5 && perturbation.spa > 0.5, `eng and spa slots moved (${perturbation.eng}, ${perturbation.spa})`);
  assert.equal(eng.forms, e0);
  assert.equal(spa.forms, s0);
  assert.throws(() => withDeranged(23, () => { throw new Error("boom"); }), /boom/);
  assert.equal(eng.forms, e0);
  assert.equal(spa.forms, s0);
  const only = withDeranged(11, () => ({ arbSame: arb.forms === a0, engMoved: eng.forms !== e0 }), { only: "Latin" });
  assert.equal(only.value.arbSame, true, "an Arabic prior is untouched when only Latin is deranged");
  assert.equal(only.value.engMoved, true);
  assert.equal(arb.forms, a0);
});

test("scramble keeps script, length and the multiset of letter clusters, and changes their order", () => {
  const text = "The committee decided (on 12 May) that nothing would change.";
  const out = scramble(text, mulberry32(101));
  const units = (t) => [...t.matchAll(/\p{L}\p{M}*|\p{N}/gu)].map((m) => m[0]).sort().join("");
  assert.equal(units(out), units(text));
  assert.equal(out.length, text.length);
  assert.notEqual(out, text);
  assert.equal(out.replace(/\p{L}\p{M}*|\p{N}/gu, "_"), text.replace(/\p{L}\p{M}*|\p{N}/gu, "_"));   // punctuation and spaces stay where they were
  assert.equal(familyOf(out), "Latin");
  assert.equal(scramble(text, mulberry32(101)), out);   // deterministic
  assert.equal(scramble("ok", mulberry32(1)).length, 2);
  assert.equal(scramble("A", mulberry32(1)), "A");
});

test("licence by measurement: a control counts only if it lowers what the statistic reads", () => {
  const real = [0.8, 0.7, 0.75, 0.82, 0.78, 0.8, 0.77, 0.79];
  assert.equal(coverageDrop(real, real.map((x) => x / 5)).licensed, true);      // the perturbation bit
  assert.equal(coverageDrop(real, real.slice()).licensed, false);               // it moved nothing
  assert.equal(coverageDrop(real, real.map((x, i) => (i < 3 ? x / 5 : x + 0.01))).licensed, false); // it moved some, not significantly
});

test("the mid-stream switch: first B verdict, settle point, and revisions() events inside B are measured separately", () => {
  const A = rep(V("eng"), 3);
  const B = [V("eng"), V("eng"), V("spa"), V("eng"), V("spa"), V("spa"), V("spa")];
  const r = analyseSwitch([...A, ...B], [{ at: 1, from: "x", to: "y" }, { at: 7, from: "eng", to: "spa" }], { lenA: 3, stemA: "eng", stemB: "spa" });
  assert.equal(r.first_B, 3);
  assert.equal(r.settle_B, 5);               // the run 5..7 is the final unbroken one; the 3..3 hit was not stable
  assert.equal(r.revisions_in_B, 1);         // the revision at index 1 happened before the switch
  assert.equal(r.revised_to_B_at, 5);        // at=7 is the 5th sentence of B (lenA 3)
  assert.equal(r.a_accuracy, 1);
  const never = analyseSwitch([...A, ...rep(V("eng"), 7)], [], { lenA: 3, stemA: "eng", stemB: "spa" });
  assert.equal(never.settle_B, null);
  assert.equal(never.first_B, null);
  const sum = summariseSwitch([r, never], { lenA: 3, lenB: 7 });
  assert.equal(sum.settled_share, 0.5);
  assert.equal(sum.median_settle_B, null);   // the median trial never settled: reported as never, not as a number
});

test("a sentence with no letters breaks the pre-registered settle run, and the reported twin skips it", () => {
  const A = rep(V("eng"), 2);
  const B = [V("spa"), V(null, "no_script"), V("spa"), V("spa")];
  const r = analyseSwitch([...A, ...B], [], { lenA: 2, stemA: "eng", stemB: "spa" });
  assert.equal(r.settle_B, 3);                       // the null at B[1] ends the run, as pre-registered
  assert.equal(r.settle_B_ignoring_no_script, 1);    // no evidence is not a contradiction
  const wrong = analyseSwitch([...A, V("spa"), V("eng"), V(null, "no_script"), V("spa")], [], { lenA: 2, stemA: "eng", stemB: "spa" });
  assert.equal(wrong.settle_B_ignoring_no_script, 4);  // a real eng verdict still breaks it
});

test("the majority-script baseline names the largest received prior of the script, and nothing about the text", () => {
  const table = { Latin: [{ stem: "eng", tokens: 200 }, { stem: "spa", tokens: 450 }, { stem: "fra", tokens: 450 }], Hangul: [{ stem: "kor", tokens: 5 }] };
  assert.equal(majorityLabel(table, "Latin"), "fra");     // tie broken by stem order, deterministic
  assert.equal(majorityLabel(table, "Hangul"), "kor");
  assert.equal(majorityLabel(table, "Greek"), null);
});

test("streams are contiguous, in file order, non-overlapping, and shrink rather than invent sentences", () => {
  const texts = Array.from({ length: 500 }, (_, i) => `s${i}`);
  const { streams, per, offsets } = makeStreams(texts, { streams: 8, limit: 480 });
  assert.equal(per, 60);
  assert.equal(streams.length, 8);
  streams.forEach((s, t) => { assert.equal(s.length, 60); assert.deepEqual(s, texts.slice(offsets[t], offsets[t] + 60)); });
  for (let t = 1; t < 8; t++) assert.ok(offsets[t] >= offsets[t - 1] + 60, "no overlap");
  const small = makeStreams(texts.slice(0, 100), { streams: 8, limit: 480 });
  assert.equal(small.per, 12);
  assert.equal(makeStreams(["a", "b"], { streams: 8 }).streams.length, 0);
  assert.deepEqual(blockOffsets(100, 10, 1), [0]);
});

test("strongest() picks the highest-accuracy arm among seeds", () => {
  const S = armStats(arm(V("eng")), "eng", rep(0, 8)), W = armStats(arm(V("spa")), "eng", rep(0, 8));
  assert.equal(strongest({ 11: W, 23: S, 37: W })[0], "23");
});

test("an unmeasurable stem is a typed gap with pass:null — never a throw and never 'good'", async () => {
  const none = await measure({ stem: "zzz-no-such-stem", split: "dev" });
  assert.equal(none.pass, null);
  assert.equal(none.score, null);
  assert.equal(none.gaps[0].reason, "unmeasured");
  const nosplit = await measure({ stem: "eng", split: "no-such-split" });
  assert.equal(nosplit.pass, null);
  assert.equal(nosplit.gaps[0].reason, "unmeasured");
});

test("the candidate table matches the listener's: every stem with a frame prior sits in exactly one script family, and Han holds the Han-script priors", () => {
  const table = candidateTable();
  const all = Object.values(table).flat().map((c) => c.stem);
  assert.equal(new Set(all).size, all.length);
  for (const must of ["eng", "spa", "arb", "kor", "cmn", "cmn-hans", "jpn", "rus", "ukr"]) assert.ok(all.includes(must), must);
  assert.ok(table.Han.map((c) => c.stem).includes("cmn-hans") && table.Han.map((c) => c.stem).includes("jpn"));
  assert.deepEqual(table.Hangul.map((c) => c.stem), ["kor"]);       // one candidate: the script determines the language
});

test("the instrument runs end to end on the REAL listener over a tiny English stream (plumbing: verdict shape, gaps typed, revisions() exposed)", () => {
  const S = [ENG.slice(0, 4)];
  const [{ verdicts, revisions }] = collect(S, () => createLanguageListener({}));
  assert.equal(verdicts.length, 4);
  for (const v of verdicts) {
    assert.ok(v.language === null || typeof v.language === "string");
    if (v.language === null) assert.ok(["language_unheard", "no_script"].includes(v.gap));
  }
  assert.ok(Array.isArray(revisions));
  // plain, clear English: the listener should have heard it by the end of the prefix
  assert.equal(verdicts.at(-1).language, "eng");
});

test("the listener's own constants are the ones the instrument's replica and licence reason about (STRONG .3, FLOOR .1, MARGIN 1.8)", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../the-fold/language-listener.js", import.meta.url), "utf8");
  assert.match(src, /const STRONG = 0\.3, FLOOR = 0\.1, MARGIN = 1\.8;/);
  // the replica's script table agrees with the listener's: a Hangul, a Han, a Cyrillic and a Latin sentence get the same family
  assert.equal(familyOf("안녕하세요"), "Hangul");
  assert.equal(familyOf("これは日本語です"), "Han");
  assert.equal(familyOf("Привет, мир"), "Cyrillic");
  assert.equal(familyOf("12 + 34"), null);
});

// ── A1 (the gating deranged control since A2) ───────────────────────────────

test("A1: equalising sizes cuts every slot to the family's smallest table, so size cannot name the language", () => {
  const forms = {
    big: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`b${i}`, { NOUN: i + 1 }])),
    mid: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`m${i}`, { NOUN: i + 1 }])),
    small: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`s${i}`, { NOUN: i + 1 }])),
  };
  const fam = { big: "Latin", mid: "Latin", small: "Latin" };
  const raw = derangePlan(forms, fam, 11), eq = derangePlan(forms, fam, 11, { equalise: true });
  assert.deepEqual(Object.values(raw.plan).map((t) => Object.keys(t).length), [30, 20, 10]);   // v1 keeps each size
  assert.deepEqual(Object.values(eq.plan).map((t) => Object.keys(t).length), [10, 10, 10]);    // A1: all the smallest
  assert.deepEqual(derangePlan(forms, fam, 11, { equalise: true }).plan, eq.plan);              // seeded
});

test("A1: the equalised control is the MEAN over seeds per stream, so an all-or-nothing lottery averages out", () => {
  const T = 8, per = 10;
  const real = armStats(arm(V("eng")), "eng", rep(0, T));
  // seed A wins every sentence for its slot (accuracy 1), seed B never does (accuracy 0): v1's "strongest seed" would say 1
  const a = armStats(arm(V("eng")), "eng", rep(0, T)), b = armStats(arm(V("spa")), "eng", rep(0, T));
  const r = equalisedReport(real, [a, b, b, b]);
  assert.equal(r.accuracy, 0.25);
  assert.deepEqual(r.per_stream, rep(0.25, T));
  assert.equal(r.wins, T);
  assert.equal(r.beats, true);
  const lucky = equalisedReport(real, [a, a]);                       // a control that really does as well
  assert.equal(lucky.accuracy, 1);
  assert.equal(lucky.beats, false);
  assert.equal(lucky.ties, T);
  assert.equal(per, 10);
  assert.equal(A1_SEEDS.length, 4);
});

test("A2: the equalised control GATES: a lottery seed that names the stem lowers the mean and the real arm must still beat it", () => {
  // two seeds: one right on every sentence, one never: mean .5 per stream; real 1 beats it (8 wins) and F rises to .75 (k=3: chance .5)
  const c = score(good({ deranged_equalised: [arm(V("eng")), arm(V("spa"))] }));
  assert.equal(c.controls.deranged_equalised, 0.5);
  assert.equal(c.details.gates.G2_floor.chance, 0.5);
  assert.equal(c.details.gates.G2_floor.F, 0.75);
  assert.equal(c.pass, true);
  // all seeds right: the control does as well as the real arm: refused
  const same = score(good({ deranged_equalised: [arm(V("eng")), arm(V("eng"))] }));
  assert.equal(same.pass, false);
});

// ── pre-registration digests ────────────────────────────────────────────────

test("pre-registration digests are stamped and stable: the v1 header and amendments A1 and A2; the v1 and A1 text are the ones the first dev runs stamped", async () => {
  const f = new URL("../eval/competence/r0-identify.mjs", import.meta.url).pathname;
  assert.match(headerDigest(f), /^[0-9a-f]{64}$/);
  assert.match(amendmentDigest(f), /^[0-9a-f]{64}$/);
  assert.match(amendmentDigestA2(f), /^[0-9a-f]{64}$/);
  assert.equal(amendmentDigest(f), amendmentDigest(f));
  // SENTINELS: these two blocks were digested into the 2026-10-05 dev cards. A change here is an edit of a pre-registration after a run (II.5)
  // and must be a new dated amendment, not an edit of v1 or A1.
  assert.equal(headerDigest(f), "2869a4544a0f1b1a408e8f8ac2789881a836152f31a19c582225f03fa1c0826d");
  assert.equal(amendmentDigest(f), "53f067c8c63762df52cc37baa9d4ab6f562298011e9e4fae728c0332b4da5dd8");
});

test("predictions are evaluated mechanically from the card (and an unmeasured card holds none)", () => {
  const card = score(good());
  card.details.family = { name: "Latin", candidates: ["eng", "spa", "deu"] };
  const byId = Object.fromEntries(checkPredictions(card).map((p) => [p.id, p.held]));
  assert.equal(byId.P1, true);       // v1 rule recomputed on the same arms: reported only
  assert.equal(byId.P2, true);
  assert.equal(byId.P7, true);
  const a2 = Object.fromEntries(checkPredictionsA2(card).map((p) => [p.id, p.held]));
  assert.equal(a2["A2-1"], true);
  assert.equal(a2["A2-6"], true);
  assert.equal(a2["A2-4"], true);
  const empty = checkPredictions({ stem: "eng", pass: null, score: null, details: {} });
  assert.equal(empty.find((p) => p.id === "P1").held, null);   // pass:null is "not shown", not "held"
  const kor = score({ real: arm(V("kor")), scrambled_text: arm(V("kor")), majority_script: arm(V("kor")), foreign: arm(V("eng")) }, { stem: "kor", ctx: { k: 1 }, licence: { scrambled_text: { licensed: true }, majority_script: { licensed: false }, foreign: { licensed: true } } });
  const k2 = Object.fromEntries(checkPredictionsA2(kor).map((p) => [p.id, p.held]));
  assert.equal(k2["A2-2"], true);
  assert.equal(k2["A2-6"], true);
});

// ── helpers of the new arms ─────────────────────────────────────────────────

test("TRAIN text is read from the FRONT of the file in the same '# text' shape the gold reader accepts ('# text =X' included), kor from kor-gsd, absent files null", () => {
  const vie = readTrainTexts("vie", 3);
  assert.equal(vie.length, 3);
  assert.ok(vie.every((t) => /\p{L}/u.test(t) && !t.startsWith("=")));
  const kor = readTrainTexts("kor", 3);
  assert.equal(kor.length, 3);
  assert.ok(kor.every((t) => /\p{Script=Hangul}/u.test(t)));
  assert.equal(readTrainTexts("zzz-none", 3), null);
  assert.equal(readTrainTexts("eng", 7).length, 7);
});

test("the character reference is CAUSAL and cumulative: a verdict depends on the prefix only, and the leader can change as evidence accrues", () => {
  const model = trainCharModel({
    eng: ["the cat sat on the mat", "this is the house that they built", "what would you like to do with them"],
    spa: ["el gato se sentó en la alfombra", "esta es la casa que ellos construyeron", "que quieres hacer con ellos"],
  });
  const mk = () => makeCharListener({ Latin: model });
  const sents = ["the thing that they said", "que es lo que dijeron", "this was what we wanted to do", "esta es la casa", "the house"];
  const full = mk(), part = mk();
  const a = sents.map((s) => full.listen(s).language), b = sents.slice(0, 3).map((s) => part.listen(s).language);
  assert.deepEqual(a.slice(0, 3), b, "the first three verdicts do not depend on sentences 4 and 5");
  assert.equal(a[0], "eng");
  assert.equal(mk().listen("12 + 34").language, null);
  assert.equal(mk().listen("12 + 34").gap, "no letters in a known script");
  assert.deepEqual(bigramsOf("Ab c"), ["_a", "ab", "b_", "_c", "c_"]);
  const [{ verdicts }] = collect([sents], mk);
  assert.deepEqual(verdicts.map((v) => v.language), a, "collect() feeds it one sentence at a time and gets the same verdicts");
});

test("foreign streams are round robin over the pinned partners, skip partners without text, and never invent sentences", () => {
  const texts = { aaa: Array.from({ length: 200 }, (_, i) => `a${i}`), bbb: Array.from({ length: 100 }, (_, i) => `b${i}`) };
  const r = foreignStreams(["aaa", "ccc", "bbb"], (p) => texts[p] ?? null, 20, 8);
  assert.deepEqual(r.skipped, ["ccc"]);
  assert.equal(r.streams.length, 8);
  assert.deepEqual(r.plan.map((p) => p.partner), ["aaa", "bbb", "aaa", "bbb", "aaa", "bbb", "aaa", "bbb"]);
  r.streams.forEach((s, t) => { assert.equal(s.length, 20); assert.ok(s.every((x) => x.startsWith(r.plan[t].partner[0]))); });
  assert.equal(foreignStreams(["ccc"], () => null, 20, 8).streams.length, 0);
});

test("UDHR out-of-inventory text is split into sentences in the target script; absent files are null", () => {
  const ydd = udhrSentences("ydd");
  assert.ok(ydd.length > 20);
  assert.ok(ydd.every((s) => s.length >= 8));
  assert.ok(ydd.filter((s) => familyOf(s) === "Hebrew").length > ydd.length * 0.9);
  assert.equal(udhrSentences("zzz-none"), null);
});

test("A2 D7: a stem whose own text is mostly outside the listener's scripts (tam, kat) is the typed gap listener_script_unsupported with its denominator, never a spurious fail", async () => {
  for (const stem of ["tam", "kat"]) {
    const card = await measure({ stem, split: "dev", limit: 80 });
    assert.equal(card.pass, null, stem);
    assert.equal(card.score, null, stem);
    assert.equal(card.aggregate_eligible, false, stem);
    assert.equal(card.gaps[0].reason, "listener_script_unsupported", stem);
    assert.ok(card.gaps[0].count / card.gaps[0].of > PARAMS.UNHEARD_MAX, `${stem}: ${card.gaps[0].count}/${card.gaps[0].of}`);
  }
});

// ── the whole instrument, once, on the real listener (kor: cheap, and the case the review was about) ──

test("end to end on the REAL listener: kor is script_determined (typed gap, not pass, not fail), excluded from aggregates, with the pin and all three digests stamped", async () => {
  const card = await measure({ stem: "kor", split: "dev", limit: 80 });
  assert.equal(card.pass, null);
  assert.equal(card.aggregate_eligible, false);
  assert.ok(card.gaps.some((g) => g.reason === "script_determined"));
  assert.equal(card.rung, "r0");
  assert.equal(card.details.rule_version, "v2/A2");
  assert.ok(card.score >= 0.9, `kor accuracy ${card.score}`);
  assert.match(card.details.inventory.pin_sha256, /^[0-9a-f]{64}$/);
  assert.equal(card.details.inventory.changed_during_run, false);
  assert.match(card.details.prereg_sha256, /^[0-9a-f]{64}$/);
  assert.match(card.details.prereg_amendment_a1_sha256, /^[0-9a-f]{64}$/);
  assert.match(card.details.prereg_amendment_a2_sha256, /^[0-9a-f]{64}$/);
  assert.equal(card.details.gates.script_determined.structural, true);
  assert.ok(card.details.gates.G4_specificity.false_positive_rate <= 0.1);
  assert.ok(card.gaps.some((g) => g.reason === "no_oov_text"), "no Hangul out-of-inventory text on disk: the refusal test is a typed gap");
  for (const c of ["scrambled_text", "majority_script"]) assert.ok(c in card.controls);
});
