// organs/claim-lint.js — a claim has to make sense before it can be held, absent, or shown. Pure: spans in, verdicts out. No model, no clock.
//
// The user, 2026-10-14: "claims need full logos linting, they need to make sense." Two things were running unlinted:
//   - the claim reader admits a "claim" from nearly any recurring noun-and-verb (ledger L34: more claims from word-shuffled text than from
//     real text; own-words run 1: 3,101 claims from 726 blocks of notes against 3,490 from their shuffled copies), and
//   - whatever it admits became a held span, an absent span, or a shown span with no test that it says anything.
//
// TWO KINDS OF LAW, kept apart because they do different things:
//
//   FORM laws REFUSE a claim (it never enters H, A, or a cell). A claim that fails one does not make sense by itself.
//     CL1  a declarative relation   subject and predicate present; not a question; the subject is not the object; the predicate is not
//                                   the subject.
//     CL2  grounded in its own bytes  the subject surface, the predicate's stem and (when present) the object surface occur in the
//                                   span's own text (callimachus P5.2: a claim names the bytes it stands on).
//     CL3  the subject is a thing   the subject carries at least one content token (a run of four or more letters: answer-ladder's own
//                                   `contentWords` rule, declared there, reused here, not tuned).
//
//   LOGOS laws FLAG a claim (it stays; the finding rides it). They judge the set, and a set is legitimately contradictory (a record that
//   says both, a reader who holds both are the `both` row), so disclosure only (P186) and never a silent drop.
//     CL4  no begging the question   the claim graph subject → object has no directed cycle (reasoning-lint.js `findClaimCycle`, the
//                                   engine's own, unchanged).
//     CL5  unscoped contradiction     `lintGfp` over the claims as EOGfpClaim@1 (kernel/gfp-claim.js): grounds, roles ARG0/ARG1, polarity.
//                                   With no functional relation declared it convicts nobody and counts what it did not judge: that count
//                                   is reported, never read as a pass.
//
// DECLARED, not measured (Constitution II.11): CL3's four letters, giver answer-ladder.js `contentWords`; CL2's stem of four letters,
// giver answer-ladder.js `stemOf`. Both owed a null; the own-words registration measures what the laws remove from real text against
// word-shuffled text, which is the null that matters here.
import { claimFromTriple, caselessIdentity } from "../kernel/gfp-claim.js";
import { findClaimCycle, lintGfp } from "./reasoning-lint.js";

export const CLAIM_LAWS = Object.freeze({
  CL1: { kind: "form", says: "a claim is a declarative relation: subject and predicate present, not a question, subject is not the object, predicate is not the subject", giver: "the author, 2026-10-14 (the user: claims need full logos linting)" },
  CL2: { kind: "form", says: "the subject, the predicate's stem and the object occur in the claim's own span", giver: "callimachus P5.2: a claim names the bytes it stands on" },
  CL3: { kind: "form", says: "the subject carries a content token (four or more letters)", giver: "answer-ladder.js contentWords (declared there, reused)" },
  CL4: { kind: "logos", says: "the claim graph has no directed cycle (begging the question)", giver: "reasoning-lint.js findClaimCycle (Degrees Kelsen)" },
  CL5: { kind: "logos", says: "no unscoped contradiction among claims at one ground", giver: "reasoning-lint.js lintGfp over kernel/gfp-claim.js" },
});

const norm = (t) => {
  const w = String(t ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s'’-]/gu, " ").split(/\s+/).filter(Boolean);
  while (w.length > 1 && ["the", "a", "an"].includes(w[0])) w.shift();
  return w.join(" ");
};
const squash = (t) => ` ${norm(t)} `;
const stemOf = (w) => norm(w).slice(0, 4);
const hasContentToken = (t) => /[\p{L}]{4,}/u.test(String(t ?? ""));

/**
 * Declared relations (the logos lint is inert without them). A declaration is `{ rel, role?, giver }` and **must name its giver**: a
 * relation is functional, symmetric or acyclic because someone on the record said so, never because it looks so. An entry with no
 * giver (or a bare string) is returned in `ignored`, typed, and is not used.
 *   declared = { functional: [{ rel, role = "ARG1", giver }], symmetric: [{ rel, giver }], acyclic: [{ rel, giver }] }
 */
export function declarationsOf(declared) {
  const out = { functional: [], symmetric: [], acyclic: [], used: [], ignored: [] };
  for (const kind of ["functional", "symmetric", "acyclic"]) {
    for (const d of declared?.[kind] ?? []) {
      if (d && typeof d === "object" && d.rel && String(d.giver ?? "").trim()) { out[kind].push(d); out.used.push({ kind, rel: d.rel, giver: d.giver }); }
      else out.ignored.push({ kind, rel: typeof d === "string" ? d : d?.rel ?? null, why: "no giver" });
    }
  }
  return out;
}

/** The form laws on one span. Returns the ids of the laws it breaks. */
export function formLaws(s) {
  const c = s?.claim ?? null;
  const broken = [];
  const subj = norm(c?.subj), pred = norm(c?.pred), obj = norm(c?.obj);
  const text = squash(s?.text);
  if (!c || !subj || !pred || /\?\s*$/.test(String(s?.text ?? "")) || (obj && obj === subj) || pred === subj) broken.push("CL1");
  if (subj && pred) {
    const stem = stemOf(c.pred);
    const grounded = text.includes(` ${subj} `) || text.includes(subj);
    const predIn = stem ? squash(s.text).includes(stem) || text.split(" ").some((w) => w.startsWith(stem)) : false;
    const objIn = !obj || text.includes(obj);
    if (!(grounded && predIn && objIn)) broken.push("CL2");
  }
  if (subj && !hasContentToken(c?.subj)) broken.push("CL3");
  return broken;
}

/**
 * Lint a list of claim spans ({ id, address, text, claim: { subj, pred, obj, polarity } }).
 *   sound    the spans that pass every form law, in order (flags ride them as `lint`)
 *   refused  [{ id, address, laws }] — typed, never silent
 *   flagged  [{ id, address, laws }] — logos findings on spans that stay
 *   logos    { cycle, gfp: { ok, counts, unjudged } }
 */
export function lintClaims(spans = [], { identity = caselessIdentity, declared = null } = {}) {
  const decl = declarationsOf(declared);
  const sound = [], refused = [];
  for (const s of spans) {
    const laws = formLaws(s);
    if (laws.length) refused.push({ id: s?.id ?? null, address: s?.address ?? null, laws });
    else sound.push(s);
  }
  // CL4: the claim graph over what passed the form laws
  const notes = sound.filter((s) => norm(s.claim.obj)).map((s) => ({ end1: s.claim.subj, label: s.claim.pred, end2: s.claim.obj, id: s.id }));
  const cyc = findClaimCycle(notes);
  const onCycle = new Set();
  if (cyc) {
    const names = new Set(cyc.cycle.map((x) => norm(x)));
    for (const s of sound) if (s.claim.obj && names.has(norm(s.claim.subj)) && names.has(norm(s.claim.obj))) onCycle.add(s.id);
  }
  // CL5: lintGfp over the same claims, as the engine reads a claim
  const gfps = sound.map((s) => claimFromTriple(s.claim.subj, s.claim.pred, s.claim.obj ?? "", { id: s.id, polarity: s.claim.polarity === "-" ? "-" : "+", ground: "/" }));
  let gfp = { ok: true, counts: {}, unjudged: null };
  const apartIds = new Set();
  try {
    const r = lintGfp(gfps, { strictness: "standard", identity, functional: decl.functional, symmetric: decl.symmetric, acyclic: decl.acyclic });
    gfp = { ok: r.ok, counts: r.counts ?? {}, unjudged: r.unjudged ?? null };
    for (const f of r.findings ?? []) for (const id of f.claims ?? f.ids ?? []) apartIds.add(id);
  } catch (e) { gfp = { ok: null, error: String(e?.message ?? e), counts: {}, unjudged: null }; }
  const flagged = [];
  const flaggedSound = sound.map((s) => {
    const laws = [...(onCycle.has(s.id) ? ["CL4"] : []), ...(apartIds.has(s.id) ? ["CL5"] : [])];
    if (laws.length) flagged.push({ id: s.id, address: s.address, laws });
    return laws.length ? { ...s, lint: laws } : s;
  });
  return { sound: flaggedSound, refused, flagged, logos: { cycle: cyc ? cyc.cycle : null, gfp, declared: { used: decl.used, ignored: decl.ignored } }, counts: { in: spans.length, sound: sound.length, refused: refused.length, flagged: flagged.length } };
}
