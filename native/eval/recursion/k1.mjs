// eval/recursion/k1.mjs — K1, THE MIDDLE EARNED OR DECORATIVE: does the record-mediator change behavior, or is a two-term,
// in-place system identical? The falsification that decides whether any "third term" has a place. Self-contained.
//
//   node eval/recursion/k1.mjs [--json]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5 / II.23). Written BEFORE the first run. ═══════════════════════════════════════
// Two arms on the SAME planted history (the Tesla/Edison arc):
//   b0  "Tesla rival of Edison"                          (the original belief)
//   w1  weak, single-witness counter: "Tesla friend of Edison"   (evidence 1)
//   c2  corroborated counter:          "Tesla collaborated with Edison"  (evidence 3)
// A correct recursive reader must (i) NOT flip on one weak witness, (ii) adopt the corroborated counter — non-retroactively,
// (iii) keep b0 recoverable at its original cursor even after c2.
// ARM A — DYAD (two-term): an in-place editor. meaning(key) := latest. No cursor, no gate, no past.
// ARM B — RECORD (three-term): append-only log; a revision re-keys (never rewrites); a candidate revision hangs until its
//   evidence clears EVIDENCE_BAR (declared 2); a corroborated revision adopts from its own seq onward (asOf preserves the past).
// METRICS: pastRecoverable (b0's original returned at its cursor), stableUnderWeak (current unchanged after w1), reKeyed
//   (the corroborated counter read now). VERDICT: the record EARNS its place iff B passes all three while A exhibits at least
//   one two-term failure (past-loss or drift). FALSIFIED iff B == A (decoration).
// SCOPE: tests the RECORD as the mediating third (mechanical-side coherence). The participatory generating middle is ABSENT;
//   absent halves stay unproven and unclaimed (our honesty rule).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
// The organ lives in the kernel now (2026-10-07): this falsifier measures the
// SHIPPED self-record, not a private copy (house rule: an experiment that holds
// moves its organ into the khora).
import { createRecord, valueAt } from "../../kernel/self-record.js";

const key = "tesla|rival";

// ── ARM A: the dyad (in-place editor) ──
function dyad() {
  const value = { s: null };
  return { apply: (v) => { value.s = v; }, current: () => value.s };
}

// ── ARM B: the record (append-only, re-key, evidence-gated, cursor-fold) ──
const B = createRecord([{ seq: 0, key, value: "rival of Edison" }]);
const bProject = (at = Infinity) => valueAt(B, at, key);   // last adopted entry/revision <= at

const r = await (async () => {
  const A = dyad();
  // b0
  A.apply("rival of Edison"); const aB0 = A.current();
  // w1 — single weak witness
  A.apply("friend of Edison"); const aAfterWeak = A.current();      // DYAD FLIPS
  B.revisions.push({ seq: 1.5, key, to: "friend of Edison", evidence: 1, standing: "candidate" });   // candidate hangs
  const bAfterWeak = bProject();
  const aPastRecoverable = false;                 // dyad has no cursor; "b0" is unrecoverable after the flip
  const bPast0 = bProject(0);                     // cursor 0
  // c2 — corroborated
  A.apply("collaborated with Edison");
  B.revisions.push({ seq: 2.5, key, to: "collaborated with Edison", evidence: 3, standing: "candidate" }); // adopts >= 2.5
  const bNow = bProject();                        // current (>= 2.5)
  const bBeforeC = bProject(2.4);                 // a cursor between w1 and c2: should still be b0 (candidate never applied)
  return {
    armA: { pastRecoverable: aPastRecoverable, stableUnderWeak: aAfterWeak === "rival of Edison", afterWeak: aAfterWeak },
    armB: { pastRecoverable: bPast0 === "rival of Edison", stableUnderWeak: bAfterWeak === "rival of Edison", beforeC: bBeforeC, now: bNow, candidateHung: bAfterWeak === "rival of Edison" },
  };
})();

const A_hasTwoTermFailure = !r.armA.pastRecoverable || !r.armA.stableUnderWeak;
const B_clears = r.armB.pastRecoverable && r.armB.stableUnderWeak && r.armB.now === "collaborated with Edison";
const verdict = B_clears && A_hasTwoTermFailure
  ? "MIDDLE EARNS ITS PLACE — the record-mediator does work a two-term system cannot (past kept, weak evidence suspended, corroboration re-keys)."
  : !B_clears && !A_hasTwoTermFailure ? "B == A => DECORATIVE, cut it." : "AMBIGUOUS — rerun with clean arms.";

console.log(process.argv.includes("--json") ? JSON.stringify({ ...r, verdict }, null, 1) : [
  "# K1 — does the record-mediator actually do work?",
  "",
  `arm A (dyad):      past-recoverable=${r.armA.pastRecoverable}  stable-under-weak=${r.armA.stableUnderWeak}  (flipped to '${r.armA.afterWeak}' on one witness)`,
  `arm B (record):    past-recoverable=${r.armB.pastRecoverable}  stable-under-weak=${r.armB.stableUnderWeak}  cursor-before-c2='${r.armB.beforeC}'  now='${r.armB.now}'`,
  "",
  verdict,
].join("\n"));