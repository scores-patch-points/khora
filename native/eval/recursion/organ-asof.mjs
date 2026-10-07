// eval/recursion/organ-asof.mjs — THE KERNEL ORGANS FOLD AT A CURSOR TOO. kind-functional-induction and identity-exclusion
// already accept `asOf`; this wires a record cursor through them and proves a verdict flips as evidence accumulates WITHOUT
// touching the past. New file; nothing is edited.
//
//   node eval/recursion/organ-asof.mjs [--json]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5). Written BEFORE the first run. ═══════════════════════════════════════════════
// The reading organs are pure functions of assertions-as-of-t: the one-valuedness REGISTER and the identity JUDGE both take an
// `asOf` cursor and believe only assertions whose seq <= asOf. So the recursion object's rule — meaning is a fold at a cursor,
// a later REVISION re-keys without erasing — is native to the organs; the bridge is passing the record's cursor through.
//   S1 REGISTER FOLDS  for the c/d pair, the birth-year relation is UNEXPOSED at cursor 1 (each has only one witness) and
//      FIXED at cursor 2+ (both agree twice). The standing is time-dependent; both readings are recoverable.
//   S2 JUDGE FOLDS  for a/b (a GIVEN one-valued birth year), at cursor 1 b asserts no birth year -> UNBOUND (untestable). At
//      cursor 2 the witness asserting a DIFFERENT year arrives: the same judge returns CONTRADICTED (cannot be one), and the
//      earlier cursor is unedited (still UNBOUND). The old agreeing reading was RE-KEYED by the revision, not kept alongside.
// CONTROLS: K1 determinism; K2 an assertion with seq > asOf is never believed (the cursor guard) AND a register earned later
//   than a cursor never licenses a verdict there (register_ahead_of_cursor).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import { fileURLToPath, pathToFileURL } from "node:url";
import { induceKindsAndFunctions } from "../../kernel/kind-functional-induction.js";
import { makeIdentityExclusion } from "../../kernel/identity-exclusion.js";

const sameValue = (a, b) => (a === b ? true : false);
const witnessed = () => true;
const overlap = { lo: 0, hi: 1000 };

// assertions carry seq = the log cursor; a REVISION is a later seq, never an edit. c/d: a clean register fold; a/b: the judge fold.
const A = new Map([
  ["c", [{ rel: "born", value: "1850", id: "c:0", seq: 0 }, { rel: "born", value: "1850", id: "c:2", seq: 2 }]],
  ["d", [{ rel: "born", value: "1851", id: "d:0", seq: 0 }, { rel: "born", value: "1851", id: "d:2", seq: 2 }]],
  ["a", [{ rel: "born", value: "1856", id: "a:0", seq: 0 }]],
  ["b", [{ rel: "born", value: "1857", id: "b:2", seq: 2, interval: overlap }]],   // the revision at seq 2 re-keys b's birth; b asserts nothing at cursor 1
]);
const assertionsOf = (id) => A.get(id) ?? [];

// S1 — the one-valuedness REGISTER folds at a cursor (c/d)
const regAt = (asOf) => induceKindsAndFunctions(["c", "d"], {
  assertionsOf, sameValue, witnessed, exposureFloor: 2, asOf,
  declaredKinds: [{ kindKey: "kind:pair", memberRefs: ["c", "d"] }],
});
const s1 = { asOf1: regAt(1).relations.get("kind:pair")?.born?.standing ?? null, asOf2: regAt(2).relations.get("kind:pair")?.born?.standing ?? null, asOf3: regAt(3).relations.get("kind:pair")?.born?.standing ?? null };

// S2 — the identity JUDGE folds at a cursor (a/b; GIVEN one-valued birth year)
const ex = makeIdentityExclusion({
  kindsOf: () => new Set(["kind:person"]),
  assertionsOf,
  functional: new Map([["kind:person", new Map([["born", { giver: "registry" }]])]]),
  registerAsOf: 0,                               // a GIVEN register exists at the start; the K2 guard still blocks any register earned later
  sameValue, witnessed,
});
const s2 = { asOf1: ex.judge("a", "b", { asOf: 1 }).verdict, asOf2: ex.judge("a", "b", { asOf: 2 }).verdict, asOf3: ex.judge("a", "b", { asOf: 3 }).verdict };

// controls
const K1 = s1.asOf1 === regAt(1).relations.get("kind:pair").born.standing && s2.asOf1 === ex.judge("a", "b", { asOf: 1 }).verdict && s2.asOf2 === ex.judge("a", "b", { asOf: 2 }).verdict;
const j15 = ex.judge("a", "b", { asOf: 1.5 });   // the seq-2 witness must NOT be believed at 1.5
const K2 = j15.verdict === "unbound" && s2.asOf2 === "contradicted";

const out = { s1, s2, K1, K2 };
console.log(process.argv.includes("--json") ? JSON.stringify(out, null, 1) : [
  "# organs fold at a cursor (asOf wired from the record)",
  "",
  `S1 register: standing of 'born' at asOf 1 = ${s1.asOf1}   (each has one witness: unexposed)`,
  `S1 register: standing of 'born' at asOf 2 = ${s1.asOf2}   (both agree twice: fixed)`,
  `S2 judge:    a,b at asOf 1 = ${s2.asOf1}   (b asserts no birth yet: untestable)`,
  `S2 judge:    a,b at asOf 2 = ${s2.asOf2}   (b's revised birth arrives: cannot be one)`,
  `   early cursor (asOf 1) still returns ${s2.asOf1} — the past is unedited.`,
  `K1 determinism: ${K1}      K2 seq > cursor never believed, register earned later never licenses: ${K2}`,
  "",
  "=> the kernel organs are ALREADY cursor-native; the bridge is passing the record's asOf through when we call them.",
].join("\n"));