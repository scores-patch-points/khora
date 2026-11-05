// same-for-text.js — the text adapter for organs/same-for.js: are two texts the same FOR a perspective?
//
// READ, NEVER SPLIT BY HAND. Each text goes through readFull (reading-full.js): readDocument with the language declared and the parse kept, then the
// grammar's own claims over that parse, every stage reporting ran / skipped / gap. The reader's wiring comes back with the verdict.
// An end is known by the being the reader's cast minted for it (cast mention spans over the end's head row) or, unminted, by its own face.
//
// HEARD AS ARRANGEMENTS, one ledger, two sources (`first`, `second`):
//   an act with two ends              end1 = its first end, label = its relation, end2 = its second end
//   an act's oblique phrase            end1 = the act's first end (else its second), label = `relation·<the phrase's opening word>`, end2 = the phrase
//   a figure on a being                end1 = the measured being, label = `#<measure>`, end2 = the number
// A denial (polarity "-") is heard as a CUT (notes.js: a figure separated from an extent, never a minus sign); a reported act is heard under the
// `reported:` witness kind, so stance is part of what a note is. Nothing here is a word list: every token is the reader's own.
//
// THE GIVERS (`nominate`), each named on every commitment it puts forward:
//   "the reader's cast"            same relation, the ends the same minted beings (faces differ only where the cast joined two surfaces)
//   a caller's `licence(l1, l2)`   two relations the caller's giver nominates as one act ("same" or "converse"), roles bound straight or crossed —
//                                  e.g. an identity organ or usage over a reader's ground; absent, no cross-relation correspondence is nominated
// THE PERSPECTIVE:
//   questions given   each question is read by the same reader; its question word is found by the reader's own morphology (PronType=Int|Rel),
//                     its gap by that word's role; it is answered from a note list by relation (or a licensed one) with its known ends bound
//   none given        the reader's default perspective: every role of every act it heard (who did it, to what, and each oblique), keyed by relation
import { makeNotes } from "../../kernel/notes.js";
import { makeCommitments } from "../../kernel/commitments.js";
import { makeSameFor, verdictFor, OUTCOMES } from "../../organs/same-for.js";

const lc = (t) => String(t ?? "").toLowerCase();
async function readClaims(text, { language = "en", lexicon = false } = {}) {
  // READ THROUGH readFull (reading-full.js): the one entry point that composes the stages in helix order and reports each as ran / skipped / gap.
  // Its claims are the grammar's own (claimsOf over the reader's parse, ends minted from the cast); its wiring is the evidence the cells rest on.
  const { readFull } = await import("../../reading-full.js");
  const r = await readFull(text, { language, lexicon });
  const stageGaps = r.wiring.filter((w) => w.status === "gap").map((w) => ({ gap: `${w.stage}: ${w.reason ?? "gap"}` }));
  return { entry: r.entry, claims: r.claims, parser: r.entry.parseBy ?? r.wiring.find((w) => w.stage === "claims")?.grammar ?? null, gaps: [...(r.entry.gaps ?? []), ...stageGaps], wiring: r.wiring };
}
// a being's KEY is its normalised name, the same key the cast mints its ids from (ref:auto:<normalised surface>), so a being the cast minted in one
// reading and not in the other is still one being by name; the mint itself is kept as the warrant where it exists
const norm = (t) => lc(t).normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/ /g, "_");
const face = (e) => (e ? (e.ref ? String(e.ref).replace(/^ref:auto:/, "") : norm(e.names?.length ? e.names.join(" ") : e.head)) : null);
const opening = (e) => lc(String(e?.text ?? "").trim().split(/\s+/)[0]);

function arrangementsOf(claims, source) {
  const out = [];
  for (const c of claims) {
    const span = [{ ref: source, start: c.at, end: c.at + c.sentence.length }], asserted = c.asserted !== false, cut = c.polarity === "-";
    const push = (end1, label, end2) => { if (end1 && label && end2) out.push({ end1, label, end2, polarity: c.polarity, asserted, spans: span, decider: cut ? c.sentence : undefined }); };
    if (c.rel === "fig") { if (c.ARG0 && c.fig) push(face(c.ARG0), `#${String(c.fig.measure ?? "").split(":")[0]}`, String(c.fig.base ?? c.fig.v ?? "")); continue; }
    push(face(c.ARG0), c.rel, face(c.ARG1));
    for (const o of c.OBL ?? []) push(face(c.ARG0 ?? c.ARG1), `${c.rel}·${opening(o)}`, face(o));
  }
  return out;
}
function hearAll(notes, log, arrs, source) {
  let contests = 0;
  for (const [flag, w] of [[true, source], [false, `reported:${source}`]]) {
    const part = arrs.filter((a) => a.asserted === flag); if (!part.length) continue;
    const r = notes.admit(log, part, { witness: w }); log = r.log; contests += r.contests?.length ?? 0;
  }
  return { log, contests };
}
const stanceOf = (n) => [...new Set((n.witnesses ?? []).map((w) => (String(w).startsWith("reported:") ? "reported" : "asserted")))].sort().join("+");

async function perspectiveFrom(questions, { language, licence }) {
  const binds = (a, b) => !!a && !!b && lc(a) === lc(b);
  if (!questions?.length) return {
    name: "every role of every act", giver: "the reader (default perspective)",
    ask: (list) => { const m = new Map(); for (const n of list) { const add = (q, v) => { if (!m.has(q)) m.set(q, new Set()); m.get(q).add(lc(v)); }; add(`${n.label} | who | ${n.end2}`, n.end1); add(`${n.end1} | ${n.label} | what`, n.end2); } return m; },
  };
  const parsed = [];
  for (const q of questions) {
    const r = await readClaims(q, { language }); const rows = r.entry.parse?.[0]?.rows ?? [], wh = rows.find((x) => /PronType=(Int|Rel)/.test(x.feats ?? ""));
    const acts = r.claims.filter((c) => c.rel && c.rel !== "fig"); let hit = null;
    if (wh) for (const c of acts) { if (c.ARG0?.ids?.includes(wh.id)) hit = { q, label: c.rel, gap: "end1", known: face(c.ARG1) }; else if (c.ARG1?.ids?.includes(wh.id)) hit = { q, label: c.rel, gap: "end2", known: face(c.ARG0) }; if (hit) break; }
    if (!hit && wh) { const c = acts.find((x) => x.vid === wh.head); if (c) hit = { q, label: c.rel, gap: "oblique", known: face(c.ARG0 ?? c.ARG1) }; }
    parsed.push(hit ?? { q, unparsed: true });
  }
  const labelOk = (want, got) => got === want || (licence ? !!licence(want, got) : false);
  return {
    name: `questions: ${questions.join(" / ")}`, giver: "the caller's questions", questions: parsed,
    ask: (list) => { const m = new Map(); for (const p of parsed) { if (p.unparsed) continue; const s = new Set();
      for (const n of list) {
        if (p.gap === "oblique") { if (String(n.label).startsWith(`${p.label}·`) || [...String(n.label).split("·")].length === 2 && labelOk(p.label, String(n.label).split("·")[0])) { if (!p.known || binds(n.end1, p.known)) s.add(lc(n.end2)); } continue; }
        if (!labelOk(p.label, n.label)) continue;
        if (p.gap === "end1" && (!p.known || binds(n.end2, p.known))) s.add(lc(n.end1));
        if (p.gap === "end2" && (!p.known || binds(n.end1, p.known))) s.add(lc(n.end2));
      }
      if (s.size) m.set(p.q, s); } return m; },
  };
}

// ── THE PROFILE BY CELL, for text. Levels, smallest to largest: token < end < act < claim < text (and the reader's ground above them).
// Each cell is computed from what the reader produced at that level, and says its warrant. Cells this reader cannot evidence are GAP, never guessed;
// SYN·Ground is the desert cell (no language has a word for it) and is n/a.
export const LEVELS = Object.freeze(["token", "end", "act", "claim", "text", "ground"]);
export const PERSPECTIVES = Object.freeze({
  meaning: ["INS·Figure@end", "CON·Pattern@act", "DEF·Figure@claim", "EVA·Figure@claim"],   // the same beings, ties of the same kind, the same commitment, true together
  surface: ["SEG·Figure@token", "SIG·Figure@token"],                                          // the same cut and order, the same tokens attended
  ground: ["INS·Ground@text"],                                                                 // about the same field
});
const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
function profileOf(R1, R2, arrs1, arrs2, { licence, contests }) {
  // every cell names its NULL and the cells it RESTS ON (kernel/respects.js L1, L2): exact identity is named as such
  const P = [], cell = (op, grain, level, outcome, warrant, because, { against = "exact identity (no tolerance)", rests = [] } = {}) => P.push({ op, grain, level, outcome, warrant, because, null: warrant ? against : null, rests });
  const tokens = (R) => (R.entry.parse ?? []).flatMap((p) => (p.rows ?? []).filter((r) => r.upos !== "PUNCT").map((r) => lc(r.lemma ?? r.form)));
  const t1 = tokens(R1), t2 = tokens(R2);
  cell("SEG", "Figure", "token", t1.join(" ") === t2.join(" ") ? OUTCOMES.SAME : OUTCOMES.OTHER, "the reader's rows", "the same tokens in the same order");
  const attended = (R) => new Set(R.claims.flatMap((c) => [c.rel !== "fig" ? lc(c.rel) : null, ...[c.ARG0, c.ARG1, ...(c.OBL ?? [])].flatMap((e) => (e?.keys ?? []).map(lc))]).filter(Boolean));
  cell("SIG", "Figure", "token", setEq(attended(R1), attended(R2)) ? OUTCOMES.SAME : OUTCOMES.OTHER, "the reader's claim parts", "the same tokens attended into acts and ends");
  const beings = (R) => new Set(R.claims.flatMap((c) => [c.ARG0, c.ARG1, ...(c.OBL ?? [])].filter(Boolean).map(face)).filter(Boolean));
  const b1 = beings(R1), b2 = beings(R2);
  cell("INS", "Figure", "end", setEq(b1, b2) ? OUTCOMES.SAME : OUTCOMES.OTHER, "the reader's cast (minted beings) and faces", "the same beings, each instance by its mint", { rests: ["SIG·Figure@token"] });
  cell("INS", "Ground", "text", [...b1].some((x) => b2.has(x)) ? OUTCOMES.SAME : OUTCOMES.OTHER, "shared beings", "the two texts stand in one field: at least one being in common", { rests: ["INS·Figure@end"] });
  const key = (a, labelOf = (l) => l) => `${a.end1}|${labelOf(a.label)}|${a.end2}`;
  const acts1 = new Set(arrs1.map((a) => key(a))), acts2 = new Set(arrs2.map((a) => key(a)));
  cell("CON", "Figure", "act", setEq(acts1, acts2) ? OUTCOMES.SAME : OUTCOMES.OTHER, "label identity", "the same ties, instance for instance (relation, ends, obliques, figures)", { rests: ["INS·Figure@end"] });
  // ties as KINDS: two relations are one kind only where a giver licenses it (a converse crosses the ends); without a licence this cell can still be Same
  // (by entailment from Figure) or Other, never a guess
  const labels = [...new Set([...arrs1, ...arrs2].map((a) => String(a.label).split("·")[0]))];
  const kindOf = new Map(labels.map((l) => [l, l])), converse = new Set();
  if (licence) for (const x of labels) for (const y of labels) if (x < y) { const v = licence(x, y), how = typeof v === "string" ? v : v?.how; if (how === "same") kindOf.set(y, kindOf.get(x)); if (how === "converse") { kindOf.set(y, kindOf.get(x)); converse.add(y); } }
  const kinded = (a) => { const [base, ...rest] = String(a.label).split("·"), k = [kindOf.get(base) ?? base, ...rest].join("·"); return converse.has(base) && !rest.length ? `${a.end2}|${k}|${a.end1}` : `${a.end1}|${k}|${a.end2}`; };
  const k1 = new Set(arrs1.map(kinded)), k2 = new Set(arrs2.map(kinded));
  cell("CON", "Pattern", "act", setEq(k1, k2) ? OUTCOMES.SAME : setEq(acts1, acts2) ? OUTCOMES.SAME : OUTCOMES.OTHER, licence ? "the caller's licence (relation kinds)" : "label identity (no giver for relation kinds)", "the same ties, as kinds of tie", { against: licence ? "the caller's licence (its own evidence and null)" : "exact identity (no tolerance)", rests: ["INS·Figure@end"] });
  // DEF: the commitment on each tie both texts make (matched by its kinded key): the same polarity, asserted or reported alike
  const stance = (arrs) => new Map(arrs.map((a) => [kinded({ ...a }), `${a.polarity}|${a.asserted}`]));
  const s1 = stance(arrs1), s2 = stance(arrs2), shared = [...s1.keys()].filter((k) => s2.has(k));
  // a denial is heard as a cut, so its tie keys still match: compare the stance on every tie both texts make, by kind
  cell("DEF", "Figure", "claim", !shared.length ? OUTCOMES.GAP : shared.every((k) => s1.get(k) === s2.get(k)) ? OUTCOMES.SAME : OUTCOMES.OTHER, "the reader's polarity and assertion", shared.length ? `the same commitment on ${shared.length} shared tie(s)` : "no tie both texts make, so no commitment to compare", { rests: ["CON·Pattern@act"] });
  const def = P.at(-1).outcome, con = P.find((c) => c.op === "CON" && c.grain === "Pattern").outcome;
  cell("EVA", "Figure", "claim", contests ? OUTCOMES.OTHER : con === OUTCOMES.SAME && def === OUTCOMES.SAME ? OUTCOMES.SAME : def === OUTCOMES.OTHER ? OUTCOMES.OTHER : OUTCOMES.GAP, contests ? "a contest on the ledger" : "ties and commitment", contests ? "the second contests a link the first asserts" : "true together when the same ties carry the same commitment", { rests: ["CON·Pattern@act", "DEF·Figure@claim"] });
  cell("SYN", "Ground", "text", OUTCOMES.NA, null, "the desert cell: no synthesis from pure ground");
  for (const g of ["Ground", "Figure", "Pattern"]) cell("REC", g, "ground", OUTCOMES.GAP, null, "this reader keeps no ground forward, so no change to it can be compared");
  cell("NUL", "Ground", "text", OUTCOMES.GAP, null, "absences are not compared by this reader yet");
  return P;
}

/**
 * sameForText(first, second, { language, questions, licence, seed }) → the organ's verdict, for the perspective, with every reading it rested on
 *   questions  the asking perspective (strings), or none for the reader's default perspective (every role of every act)
 *   licence    (l1, l2) → "same" | "converse" | { how, kind, giver, evidence } | null : a caller's giver for cross-relation correspondences
 *              (an identity organ, or a hyperlexicon lookup whose evidence KIND — nominated / licensed / discovered — is kept on the commitment)
 */
export async function sameForText(first, second, { language = "en", questions = null, cells = null, licence = null, seed = 0, redeals = 20, lexicon = false } = {}) {
  const notes = makeNotes(), commitments = makeCommitments(), organ = makeSameFor({ notes, commitments });
  const [R1, R2] = [await readClaims(first, { language, lexicon }), await readClaims(second, { language, lexicon })];
  // a reading that produced no claims is the READER's gap, never a difference: say so, typed, with the reader's own gaps (no verdict from nothing)
  const unread = [[R1, "first"], [R2, "second"]].filter(([R]) => !R.claims.length).map(([R, side]) => ({ side, parse: Array.isArray(R.entry.parse) ? R.entry.parse.length : 0, gaps: R.gaps.map((g) => g.gap ?? g) }));
  if (unread.length) return { verdict: "gap", readerGap: true, because: "the reader produced no claims", unread, wiring: { first: R1.wiring, second: R2.wiring }, gaps: [...R1.gaps, ...R2.gaps], parser: R1.parser, standings: [], residue: [], SIG: [], NUL: [], profile: [], byCells: null };
  const perspective = await perspectiveFrom(questions, { language, licence });
  const wantedCells = Array.isArray(cells) ? cells : PERSPECTIVES[cells ?? "meaning"] ?? PERSPECTIVES.meaning;
  let log = notes.createNotes({ frame: { reader: R1.parser, language, perspective: questions?.length ? perspective.name : (typeof cells === "string" ? cells : cells ? "cells" : "meaning"), cells: wantedCells, questions: questions ?? null, lexicon: lexicon || "none" } });   // the perspective IS what this reader stands on (DEF·Ground)
  log = hearAll(notes, log, arrangementsOf(R1.claims, "first"), "first").log;
  const h2 = hearAll(notes, log, arrangementsOf(R2.claims, "second"), "second"); log = h2.log;
  const nominate = (a, b) => {
    if (stanceOf(a) !== stanceOf(b)) return null;
    if (a.label === b.label && a.end1 === b.end1 && a.end2 === b.end2) return { giver: "the reader's cast", grain: "Figure", because: "the same act between the same minted beings" };
    if (!licence || a.label === b.label) return null;
    // a licence answers with a string ("same" | "converse") or a record { how, kind, giver, evidence }: the KIND of evidence is part of the giver's
    // name on the commitment (a giver's nomination is a DEF; a licence earned by use is a repertoire fact), so the two never read as one
    const v = licence(a.label, b.label), how = typeof v === "string" ? v : v?.how ?? null, who = typeof v === "object" && v ? `${v.giver ?? "the caller's licence"}${v.kind ? ` (${v.kind})` : ""}` : "the caller's licence";
    const ev = typeof v === "object" && v?.evidence ? ` — evidence: ${JSON.stringify(v.evidence).slice(0, 160)}` : "";
    if (how === "same" && a.end1 === b.end1 && a.end2 === b.end2) return { giver: who, grain: "Pattern", because: `${a.label} ~ ${b.label}, roles bound${ev}` };
    if (how === "converse" && a.end1 === b.end2 && a.end2 === b.end1) return { giver: who, grain: "Pattern", because: `${a.label} ~ ${b.label} (converse), roles crossed${ev}` };
    return null;
  };
  const judged = organ.judge(log, { first: "first", second: "second", perspective, nominate, seed, redeals, contests: h2.contests });
  // the profile by cell, and the verdict for the perspective's CELLS (a named perspective, a list of cell keys, or "meaning" by default);
  // with questions, the asking perspective's own verdict (judged above, by commitment) stands, and the cell verdict is reported beside it
  const profile = profileOf(R1, R2, arrangementsOf(R1.claims, "first"), arrangementsOf(R2.claims, "second"), { licence, contests: h2.contests });
  const wanted = wantedCells;
  const byCells = verdictFor(profile, wanted, { levels: LEVELS });
  return { ...judged, wiring: { first: R1.wiring, second: R2.wiring }, frame: notes.frameOf(judged.log), verdict: questions?.length ? judged.verdict : byCells.verdict, byQuestions: questions?.length ? judged.verdict : null, byCells, profile, gaps: [...R1.gaps, ...R2.gaps], parser: R1.parser, perspectiveQuestions: perspective.questions ?? null };
}
