// eval/recursion/middle.mjs — THE PARTICIPATORY MIDDLE: a distinctioning organ that GENERATES on misfit, gated on evidence,
// recorded, self-referential. The one half we had refused to claim. New file; nothing is edited.
//
//   node eval/recursion/middle.mjs [--json]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5 / II.23). Written BEFORE the first run. ═══════════════════════════════════════
// WHAT THIS ADDS. Until now the record re-keyed only when a revision was APPENDED by us. This organ is the thing that, on a
// MEANING-GAP (an arriving witness that conflicts with the fold at a cursor), GENERATES the candidate revision itself:
//   mechanical  the arrival is consistent with the fold -> reuse, nothing appended (habit; "leave on the fly for on the fly").
//   participatory  the arrival CONFLICTS -> the middle builds a re-key (key -> arrival's value), records it as a candidate with
//               cumulative evidence, and ADOPTS it from its own seq once the cumulative evidence clears EVIDENCE_BAR. Repeated
//               refutation is what turns a single weak whisper into a re-keyed reading — the middle is what transforms
//               corroboration into meaning, rather than waiting for someone to hand it a revision.
//   self-referential  when the conflicting "inherited" meaning is standing GIVEN, the generated re-key is marked `reopens:true`:
//               it re-opens an inherited/habit distinction under new consequence (Kegan subject->object; anti-habit).
//   recorded  everything it generates is an entry with seq, key, to, evidence, standing — nothing unlogged.
// K1 — DOES IT EARN ITS PLACE? Two rows, same arrival stream:
//   ROW A "no middle": the record folds but nothing generates; two contradictory witnesses arrive and the fold NEVER changes
//       (it cannot learn — re-key requires a human-appended revision).
//   ROW B "with middle": the same two witnesses accumulate evidence to the bar; the middle generates the re-key and the fold
//       changes AT ITS CURSOR, past still recoverable earlier. THE MIDDLE EARNS ITS PLACE iff B's fold re-keys at the bar while
//       A's never does (and B preserves the past at the old cursor). FALSIFIED iff B == A (decoration).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import { fileURLToPath, pathToFileURL } from "node:url";

export const EVIDENCE_BAR = 2;
const GET = Symbol("get");

function logWith(seed = []) {
  const R = { entries: [], revisions: [] };
  for (const e of seed ?? []) R.entries.push({ ...e });
  return R;
}
const adopt = (r) => r.standing !== "candidate" || Number(r.evidence ?? 0) >= EVIDENCE_BAR;
const valueAt = (R, asOf, key) => {
  let v = null;
  for (const e of R.entries) if (e.seq <= asOf && e.key === key) v = e.value;
  for (const r of R.revisions) if (r.seq <= asOf && r.key === key && adopt(r)) v = r.to;
  return v;
};

/** THE MIDDLE. One witness arrives; it is reconciled with the fold at the cursor. */
export function distinguish(R, { asOf, key, arrival, weight = 1 }) {
  const cur = valueAt(R, asOf, key);
  const conflict = cur != null && Number(cur) !== Number(arrival) && String(cur) !== String(arrival);
  if (!conflict) return { mode: "mechanical", key, cur, appended: false };
  const prior = (R.revisions ?? []).filter((r) => r.key === key && r.seq <= asOf).reduce((a, x) => a + Number(x.evidence ?? 1), 0);
  const evidence = prior + weight;
  const inherited = R.entries.find((e) => e.key === key)?.standing === "given";
  const rev = { seq: asOf + 0.5, key, to: arrival, evidence, standing: "candidate", kind: "generated", ...(inherited ? { reopens: true } : {}) };
  R.revisions.push(rev);                                             // recorded, append-only
  const adoptedNow = adopt(rev);
  return {
    mode: "participatory", key, cur, to: arrival, evidence, appended: true,
    standing: adoptedNow ? "adopted" : "pending", reopens: inherited || undefined,
    now: valueAt(R, asOf + 0.5, key),
  };
}

// ── K1: the middle vs no-middle on the same arrival stream ──
const KEY = "tesla|rival";
const mkSeed = (v, standing = "given") => [{ seq: 0, key: KEY, value: v, standing }];
const run = () => {
  // ROW A — no middle: two contradictory arrivals, the fold is DEAF to them
  const A = logWith(mkSeed("rival of Edison", "given"));
  valueAt(A, 0, KEY);
  distinguishNONE(A, 0, "friend of Edison", 1);                        // no-op by definition
  distinguishNONE(A, 1, "collaborated with Edison", 1);
  const aNow = valueAt(A, 10, KEY);

  // ROW B — with middle
  const B = logWith(mkSeed("rival of Edison", "given"));
  const w1 = distinguish(B, { asOf: 0, key: KEY, arrival: "friend of Edison", weight: 1 });
  const bAfterW1 = valueAt(B, 0.6, KEY);
  const w2 = distinguish(B, { asOf: 1, key: KEY, arrival: "collaborated with Edison", weight: 1 });
  const bNow = valueAt(B, 10, KEY);
  const bPast = valueAt(B, 0, KEY);

  return {
    rowA: { now: aNow, everChanged: aNow !== "rival of Edison" },
    rowB: { w1: { mode: w1.mode, standing: w1.standing }, afterW1: bAfterW1, w2: { mode: w2.mode, standing: w2.standing }, now: bNow, past: bPast, reopens: w2.reopens },
  };
};
function distinguishNONE(R, asOf, arrival, weight) { return { mode: "mechanical", appended: false }; }   // the record without a generator

const R = run();
const B_learns = R.rowB.now === "collaborated with Edison" && R.rowB.past === "rival of Edison";
const A_deaf = R.rowA.everChanged === false;
const verdict = B_learns && A_deaf
  ? "THE MIDDLE EARNS ITS PLACE — corroboration became a re-keyed reading only where a generator reconciled the misfit; the no-middle row never learned."
  : "FALSIFIED — B == A (the middle changed nothing); cut it.";

console.log(process.argv.includes("--json") ? JSON.stringify({ ...R, verdict }, null, 1) : [
  "# the participatory middle: generate on misfit, gate on evidence, record everything",
  "",
  `row A (no middle):  after two contradictory witnesses, fold = '${R.rowA.now}'  (everChanged=${R.rowA.everChanged})  — deaf`,
  `row B (with middle): w1 -> ${R.rowB.w1.mode}/${R.rowB.w1.standing}  (afterW1='${R.rowB.afterW1}')`,
  `                     w2 -> ${R.rowB.w2.mode}/${R.rowB.w2.standing}  (reopens=${R.rowB.reopens})  now='${R.rowB.now}', past='${R.rowB.past}'`,
  "",
  verdict,
].join("\n"));