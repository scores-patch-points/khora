// same-for.js — sameness as a DEFEASIBLE COMMITMENT, for a declared perspective. Medium-blind; notes and commitments injected.
//
// THE MODEL (kernel/commitments.js already holds it; this organ is its first caller). Two readings are the same FOR A PURPOSE when no difference
// between them makes a difference to that purpose. Sameness is never a fact in the bytes: it is a reader's commitment, and it follows the helix.
//   SEG, CON, INS  each reading is heard onto ONE notes ledger under its own source; parts stay distinct instances, never merged
//   DEF            a `same-as` over two notes, from a named GIVER (whatever nominated the correspondence) and a PURPOSE (the perspective):
//                  it lands as a WISH. A part of the second reading that nothing nominates is put forward as `does-not-matter` for that purpose.
//   EVA            each commitment is TESTED against the perspective, with a named null (commitments.js's rule: no verdict without one):
//                    same-as         holds when its two members answer every question the perspective asks of them alike, and a redealt
//                                    commitment of the same shape (random members from the same universe) does not pass as often
//                    does-not-matter holds when withholding its members changes no answer the perspective gets (Bateson's criterion, by ablation)
//   REC            a refused commitment is conceded, its trigger recorded verbatim; nothing is deleted
// SIGNAL AND NOISE, in the cube's own operators (the person's words): a residual difference that makes a difference to the perspective is SIG (○),
// a difference registered as making one; a difference that makes none is NUL (∅), encountered and held, transforming nothing for that perspective.
// The kernel holds this distinction (commitments.js KINDS.NOISE / KINDS.SIGNAL, differencesOf): a `noise` that stands after its ablation is NUL, one refused by it is SIG.
// THE VERDICT, for the perspective, read UNDER the commitments standing as testimony (readUnder):
//   same   every note of the second reading is folded into a class with a note of the first, or withheld by a standing does-not-matter,
//          and the perspective answered at least one question
//   other  some note of the second reading stands apart (its difference makes a difference), or the two readings contest a link
//   gap    the perspective could answer nothing of either reading: it cannot tell
// Every verdict says what it was read under, who gave each commitment, and the perspective it is for.
//
// WHAT IS INJECTED, so this file names no medium:
//   notes        a makeNotes() instance          commitments  a makeCommitments() instance over the same task-log
//   perspective  { name, giver, ask(noteList) → Map<question, Set<answer>> }   — the asking, and its answerer over notes
//   nominate     (firstNote, secondNote) → { giver, grain, because } | null   — every giver that may put a correspondence forward
import { lcg, shuffled } from "../kernel/continuation.js";

export const VERDICTS = Object.freeze({ SAME: "same", OTHER: "other", GAP: "gap" });

const agree = (a, b) => [...(a ?? [])].some((x) => (b ?? new Set()).has(x));
function compareAnswers(A, B) {   // per question: both answered and agreeing, differing, one side only, or neither
  const per = [];
  for (const q of new Set([...A.keys(), ...B.keys()])) {
    const a = A.get(q) ?? new Set(), b = B.get(q) ?? new Set();
    per.push({ q, st: a.size && b.size ? (agree(a, b) ? "same" : "differ") : a.size || b.size ? "one-side" : "neither" });
  }
  const answered = per.filter((x) => x.st !== "neither");
  return { per, answered: answered.length, alike: answered.every((x) => x.st === "same") };
}

/**
 * makeSameFor({ notes, commitments }) → { judge }
 * judge(log, { first, second, perspective, nominate, seed, redeals }) → { log, verdict, standings, under, perspective, readings }
 *   first, second  the two readings' SOURCES (witness sources on the ledger), e.g. the two documents
 */
export function makeSameFor({ notes, commitments }) {
  if (!notes?.fold || !commitments?.declare) throw new TypeError("makeSameFor: notes (makeNotes()) and commitments (makeCommitments()) are injected");
  const C = commitments;

  function judge(log, { first, second, perspective, nominate = () => null, seed = 0, redeals = 20, contests = 0 } = {}) {   // contests: what admit() landed when the second reading met the first
    if (!perspective?.ask || !perspective?.name) throw new TypeError("judge: a perspective { name, giver, ask } is required — sameness is always for something");
    const purpose = `${perspective.name}`;
    const heard = notes.fold(log);
    const sources = (n) => new Set((n.witnesses ?? []).map((w) => String(w).replace(/^reported:/, "").split("#")[0].split("~")[0]));
    const of = (src) => heard.filter((n) => sources(n).has(src));
    const A = of(first), B = of(second), onlyB = B.filter((n) => !sources(n).has(first));   // a note both readings heard is already one note (the ledger's join)
    const ask = (list) => perspective.ask(list);

    // DEF: same-as for every nominated correspondence, does-not-matter for what nothing nominates
    const declared = [];
    for (const b of onlyB) {
      let nominated = false;
      for (const a of A) {
        if (a.id === b.id) continue;
        const n = nominate(a, b); if (!n) continue;
        const r = C.declare(log, { kind: C.KINDS.SAME_AS, members: [a.id, b.id], giver: n.giver, purpose, grain: n.grain, because: n.because ?? null });
        if (r.refused) continue;
        log = r.log; nominated = true; declared.push({ id: r.id, kind: "same-as", a, b, giver: n.giver });
      }
      if (!nominated) {
        const r = C.declare(log, { kind: C.KINDS.NOISE, members: [b.id], giver: perspective.giver ?? "the perspective", purpose, because: "nothing nominated a correspondence for this part" });
        if (!r.refused) { log = r.log; declared.push({ id: r.id, kind: "noise", b }); }
      }
    }

    // EVA, each against the perspective with a named null; REC for every refusal
    const rng = lcg(seed);
    for (const d of declared) {
      if (d.kind === "same-as") {
        // read UNDER the commitment: folded into the first member's class, the second member carries that class's label (commitments.js keeps the
        // first member's face); the perspective is then asked of both, and only the ends can still differ
        const under = (a, b) => ({ ...b, label: a.label });
        const real = compareAnswers(ask([d.a]), ask([under(d.a, d.b)]));
        // the null is drawn from OTHER pairs of the same two readings, never the real pair itself (a one-pair universe has no null, and says so)
        const others = A.flatMap((x) => onlyB.map((y) => [x, y])).filter(([x, y]) => !(x.id === d.a.id && y.id === d.b.id));
        let nullPass = 0, draws = 0;
        for (let k = 0; k < redeals && others.length; k += 1) { const [ra, rb] = shuffled(others, rng)[0]; const c = compareAnswers(ask([ra]), ask([under(ra, rb)])); draws += 1; if (c.answered && c.alike) nullPass += 1; }
        const rate = draws ? nullPass / draws : null, holds = real.answered > 0 && real.alike && (rate == null || rate <= 0.5);
        log = C.evaluate(log, d.id, { verdict: holds ? "holds" : "refused", ground: `perspective ${purpose}: the two members' answers`, broken: `redeal: ${draws} other pairs drawn from the same two readings${draws ? "" : " (none exist: no null available)"}`, evidence: { answered: real.answered, alike: real.alike, per: real.per, nullPassRate: rate, nullDraws: draws, nullAvailable: draws > 0 } }).log;
        if (!holds) log = C.concede(log, d.id, { trigger: !real.answered ? "the perspective asked nothing either member answers" : !real.alike ? "the members answer the perspective differently" : `a random pair passes as often (${rate?.toFixed(2)})` }).log;
      } else {
        const withB = compareAnswers(ask(A), ask(B)), without = compareAnswers(ask(A), ask(B.filter((n) => n.id !== d.b.id)));
        const changed = JSON.stringify(withB.per) !== JSON.stringify(without.per);
        log = C.evaluate(log, d.id, { verdict: changed ? "refused" : "holds", ground: `perspective ${purpose}: its answers with and without the member`, broken: "ablation: the member withheld", evidence: { with: withB.per, without: without.per } }).log;
        if (changed) log = C.concede(log, d.id, { trigger: "SIG ○: withholding it changes what the perspective gets" }).log;
      }
    }

    // THE VERDICT, read under testimony
    const read = C.readUnder(log, notes);
    const classOf = new Map(); for (const ms of read.classes) for (const m of ms) classOf.set(m, ms);
    const aIds = new Set(A.map((n) => n.id)), withheld = new Set(read.dropped.map((d) => d.id));
    const placed = (b) => withheld.has(b.id) || (classOf.get(b.id) ?? []).some((m) => aIds.has(m));
    const overall = compareAnswers(ask(A), ask(B));
    const verdict = !overall.answered ? VERDICTS.GAP : contests || !onlyB.every(placed) ? VERDICTS.OTHER : VERDICTS.SAME;
    const diffs = new Map(C.differencesOf(log).map((x) => [x.id, x])), residue = declared.filter((d) => d.kind === "noise").map((d) => { const x = diffs.get(d.id); return { note: d.b.id, op: x?.op ?? null, glyph: x?.glyph ?? null, standing: x?.standing ?? null }; });   // the kernel says what each difference is
    return { log, verdict, residue, SIG: residue.filter((r) => r.op === "SIG").map((r) => r.note), NUL: residue.filter((r) => r.op === "NUL").map((r) => r.note), perspective: { name: perspective.name, giver: perspective.giver ?? null }, answers: overall.per, standings: C.standings(log), under: read.applied, unplaced: onlyB.filter((b) => !placed(b)).map((b) => b.id), readings: { first, second } };
  }
  return { judge, VERDICTS };
}

// ── SAMENESS BY CELL ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Same and Other are always IN SOME RESPECT (the Sophist's greatest kinds), and the respects are the cube's transformations. A judgment is addressed by
// three coordinates, never by one:
//   op     the transformation it is invariant under (NUL SIG INS SEG CON SYN DEF EVA REC)
//   grain  WITHIN the level: Ground = the field the unit stands in, Figure = the unit itself, Pattern = the unit as a kind that recurs
//   level  WHICH holon: the medium's own units, from smallest part to the reader's ground (the adapter declares them, in order)
// and carries its outcome (same | other | gap | n/a) and its WARRANT (where the evidence came from) as separate fields — a warrant is never a grain.
// Two nestings are kept explicit:
//   within a level  Same at Figure entails Same at Pattern (one instance is one kind); Other at Pattern entails Other at Figure. Never the reverse.
//   across levels   a cell at one level is computed from bonds at the level below (the adapter says which), and a level's Pattern seeds the next
//                   level's Ground ("the pattern of a ring seeds the ground of the next").
// A PERSPECTIVE is the set of cells it cares about. The pair's verdict for it is DERIVED, never stored: Other if any cared-for cell is Other,
// else Gap if any cared-for cell is Gap, else Same. A difference in a cell the perspective does not care about is NUL (∅) for it.
export const OUTCOMES = Object.freeze({ SAME: "same", OTHER: "other", GAP: "gap", NA: "n/a" });
export const cellKey = ({ op, grain, level }) => `${op}·${grain}@${level}`;

/** entail(profile) → the profile with the within-level entailments applied (Figure-same ⇒ Pattern-same; Pattern-other ⇒ Figure-other), each marked */
export function entail(profile) {
  const out = profile.map((c) => ({ ...c }));
  const byKey = new Map(out.map((c) => [cellKey(c), c]));
  for (const c of profile) {
    if (c.grain === "Figure" && c.outcome === OUTCOMES.SAME) { const p = byKey.get(cellKey({ ...c, grain: "Pattern" })); if (p && p.outcome === OUTCOMES.GAP) Object.assign(p, { outcome: OUTCOMES.SAME, entailedBy: cellKey(c) }); }
    if (c.grain === "Pattern" && c.outcome === OUTCOMES.OTHER) { const f = byKey.get(cellKey({ ...c, grain: "Figure" })); if (f && f.outcome === OUTCOMES.GAP) Object.assign(f, { outcome: OUTCOMES.OTHER, entailedBy: cellKey(c) }); }
  }
  return out;
}

/** verdictFor(profile, cells) → { verdict, cells: [the cared-for cells with outcomes], idle: [cells that are Other but not cared for: NUL ∅ for this perspective] } */
export function verdictFor(profile, cells) {
  const full = entail(profile), byKey = new Map(full.map((c) => [cellKey(c), c]));
  const cared = cells.map((k) => byKey.get(k) ?? { key: k, outcome: OUTCOMES.GAP, warrant: null, because: "this reader produced no evidence at this cell" });
  const live = cared.filter((c) => c.outcome !== OUTCOMES.NA);
  const verdict = live.some((c) => c.outcome === OUTCOMES.OTHER) ? VERDICTS.OTHER : !live.length || live.some((c) => c.outcome === OUTCOMES.GAP) ? VERDICTS.GAP : VERDICTS.SAME;
  const idle = full.filter((c) => c.outcome === OUTCOMES.OTHER && !cells.includes(cellKey(c))).map((c) => ({ key: cellKey(c), op: "NUL", glyph: "∅" }));
  return { verdict, cells: cared.map((c) => ({ key: c.key ?? cellKey(c), outcome: c.outcome, warrant: c.warrant ?? null, because: c.because ?? null, entailedBy: c.entailedBy ?? null })), idle };
}
