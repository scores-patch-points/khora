// speaker-model.js — the instrument's durable theory of mind of the person.
// Vendored at the proxy's native/the-fold seam. PURE logic with a thin file
// store, so the theory of mind survives across sessions while conversation
// SPECIFICS stay in the per-session history.
//
// THE HOLOGRAPH OF THE PERSON (2026-10-09). The material the person offers is
// bound into EDGES — subject — action — object — read from the turn's
// structural parse (CoNLL-U), exactly as the mind-wandering holograph binds
// beings from a read. Held only when the edge is actually bound (a subject
// names the claim); an unbound or unresolved claim is DISCLOSED, never
// laundered into prose. NO WORD LISTS here, and no pattern over the person's
// meaning: which turn is a statement is the intent reader's structural read
// (organs/intent-reader.js — phatic / question / imperative / statement, from
// Universal Dependencies structure, omnilingually), and the edge is bound from
// the parser's own deprels (nsubj / root / obj / neg). This file parses
// nothing and lists no words.
//
// REVISION IS THE HOLOGRAPH'S REC, ON THE PERSON'S OWN CLAIMS. When the person
// asserts something that conflicts with what they already hold (same subject,
// different action or truth), the old edge is SUPERSEDED — kept, never erased
// (perspective.js's own REC law) — and the new edge is admitted. The record is
// append-only. A question, a greeting, or an unbounded turn declares NO claim:
// a gap is a result, never a guess (P4).
//
// Every durable row is ATTRIBUTED (a hypothesis the instrument holds about the
// person, revisable) and phrased, when it reaches the mouth, at the object
// level — firewall-clean, covert-clean, never another conversation's detail.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SPEAKER_MODEL_DIR = () => path.join(HERE, "speaker-models");
export const speakerModelPath = (userId) => path.join(SPEAKER_MODEL_DIR(), `${sanitizeId(userId)}.json`);

// Injective by construction (falsified 2026-10-09: `user:a` and `user_a`
// collided onto one file).
export function sanitizeId(userId) {
  const raw = String(userId ?? "anon");
  const safe = raw.replace(/[^a-zA-Z0-9.-]/g, (c) => `_${c.charCodeAt(0).toString(16).padStart(2, "0")}`);
  return safe.slice(0, 96) || "anon";
}

export const EMPTY_MODEL = Object.freeze({
  schema: "SpeakerModel@2",
  // { edge:{subject,verb,object,negated}, phrase, stance, standing, times,
  //   first, last, witness, statedConfidence, supersededAt }
  claims: Object.freeze([]),
  assertions: 0, // statement turns that bound an edge
  revisions: 0, // the person superseded a claim they held (the holograph's REC)
  misreadings: 0, // the person said the instrument misread THEM (declared only)
  lastMisreading: null, // { at }
  lastSeen: null,
});

/** A CoNLL-U row, reduced to the fields the edge bind needs. */
function rowsOf(records) {
  const rows = [];
  for (const rec of Array.isArray(records) ? records : [records]) {
    for (const line of rec?.surface?.lines ?? []) {
      if (!/^\d+\t/.test(line)) continue;
      const c = line.split("\t"); if (c.length < 8) continue;
      rows.push({
        id: Number(c[0]), form: c[1], lemma: c[2], upos: c[3],
        feats: c[5] === "_" ? {} : Object.fromEntries(c[5].split("|").filter(Boolean).map((kv) => { const [k, ...v] = kv.split("="); return [k, v.join("=")]; })),
        head: Number(c[6]), deprel: c[7],
      });
    }
  }
  rows.sort((a, b) => a.id - b.id);
  return rows;
}

// A clause is negated by the parser's OWN sign: a token with Polarity=Neg
// (PART "n't"/"not") or the "neg" deprel, HEADED AT this clause. The English
// parser emits Polarity=Neg as `advmod`, not `neg` — a "not" that doesn't
// bound the clause must not silence it, and one that does must (falsified
// 2026-10-09: "I don't think the mayor is corrupt" bound {mayor,corrupt}
// with negated:false, storing the OPPOSITE of what the person said).
const hasNeg = (rows, headId) => rows.some(
  (r) => r.head === headId && (r.deprel === "neg" || r.feats.Polarity === "Neg"),
);
const hasSubj = (rows, headId) => rows.some((r) => (r.deprel === "nsubj" || r.deprel?.startsWith("nsubj:")) && r.head === headId);
const subjOf = (rows, headId) => rows.find((r) => (r.deprel === "nsubj" || r.deprel?.startsWith("nsubj:")) && r.head === headId)?.form ?? null;
const actWord = (r) => String(r?.lemma || r?.form || "").toLowerCase();

/** The deepest clause with its own subject: a matrix "I think [clause that
 *  has a subject]" binds the embedded clause, whose claim IS what the person
 *  holds. Negation is carried from the matrix when the claim is embedded
 *  under a negated verb ("I don't think X" holds ¬X — falsified: binding X
 *  would record the opposite of what the person said). */
function bindClause(rows, headId) {
  const embedded = rows.find((r) => r.head === headId && (r.deprel === "ccomp" || r.deprel === "xcomp" || r.deprel === "advcl") && hasSubj(rows, r.id));
  const base = embedded ?? rows.find((r) => r.id === headId);
  const subject = subjOf(rows, base.id);
  if (!subject) return null;
  const obj = rows.find((r) => (r.deprel === "obj" || r.deprel === "iobj") && r.head === base.id)?.form ?? null;
  const negated = hasNeg(rows, headId) || hasNeg(rows, base.id);
  return { subject: subject.toLowerCase(), verb: actWord(base), object: obj ? obj.toLowerCase() : null, negated };
}

/**
 * edgeFromRecords(records) -> { ok, edge } | { gap }
 * Bind the turn's proposition to one edge, STRUCTURALLY. No word lists: the
 * subject is the parser's nsubj, the action the clause root, the object the
 * obj, the sign the neg deprel. No subject → no bound claim (a greeting, a
 * fragment, an imperative): a typed gap, never a guess.
 */
export function edgeFromRecords(records) {
  const rows = rowsOf(records);
  if (!rows.length) return { ok: false, gap: "no parse rows — the turn binds nothing" };
  const root = rows.find((r) => r.head === 0) ?? null;
  if (!root) return { ok: false, gap: "no root in the parse — nothing to bind" };
  const bound = bindClause(rows, root.id);
  if (!bound) return { ok: false, gap: "no subject bound — a bare claim holds nothing (greeting, fragment, imperative)" };
  return { ok: true, edge: bound };
}

// ── pure: the standing the instrument's record earned ───────────────────
// "established" — a caller DECLARED corroboration, measured by the real
// corroboration instrument; this file re-derives none from surfaced material
// (lexical overlap cannot tell SUPPORT from ATTACK — falsified 2026-10-09).
export function standingOfTurn({ surfVoid = false, corroborated = false } = {}) {
  if (corroborated) return "established";
  if (surfVoid) return "contested";
  return "unexamined";
}

const bounded = (s, n = 200) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const edgeKey = (e) => `${e.subject}\u0000${e.verb}\u0000${e.object ?? ""}\u0000${e.negated ? 1 : 0}`;

/**
 * updateSpeakerModel(model, { turn, surfVoid, corroborated }) — one DECLARED
 * turn. `turn` is the structural read's output:
 *   { intent: "statement"|"question"|"phatic"|"imperative"|...,  (from readIntent)
 *     claim:   the person's own words (verbatim, bounded),
 *     edge:    edgeFromRecords().edge  — the bound proposition, or null,
 *     witness: the turn's address (`turn:<n>`),
 *     statedConfidence: declared, or null }
 * A non-statement or an unbound edge declares NO claim. A statement whose edge
 * conflicts with one the person already holds SUPERSEDES it (append-only);
 * an identical claim is reaffirmed (times++).
 */
export function updateSpeakerModel(model, { turn = null, surfVoid = false, corroborated = false } = {}) {
  const m = model && String(model.schema ?? "").startsWith("SpeakerModel@") ? model : { ...EMPTY_MODEL };
  const now = new Date().toISOString();
  const out = {
    ...m,
    schema: "SpeakerModel@2",
    claims: [...(m.claims ?? [])],
    assertions: m.assertions ?? 0,
    revisions: m.revisions ?? 0,
    misreadings: m.misreadings ?? 0,
    lastMisreading: m.lastMisreading ?? null,
    lastSeen: now,
  };
  if (!turn || typeof turn !== "object") return out; // a gap is a result, never a guess
  if (turn.misread === true) {
    out.misreadings += 1;
    out.lastMisreading = { at: now };
  }
  if (turn.intent !== "statement") return out; // a question, greeting, or demand declares no claim
  if (!turn.edge || typeof turn.edge !== "object") return out; // no bound proposition

  const claim = bounded(turn.claim);
  const key = edgeKey(turn.edge);
  const existing = out.claims.findIndex((c) => edgeKey(c.edge ?? {}) === key);
  if (existing >= 0) {
    out.assertions += 1;
    out.claims[existing] = {
      ...out.claims[existing],
      standing: standingOfTurn({ surfVoid, corroborated }),
      statedConfidence: turn.statedConfidence ?? out.claims[existing].statedConfidence ?? null,
      witness: turn.witness ?? out.claims[existing].witness ?? null,
      times: out.claims[existing].times + 1,
      last: now,
    };
    return out;
  }

  // REVISION: the same subject, a different action or sign — the person
  // superseded what they held. Kept, never erased (the holograph's REC).
  const conflict = out.claims.findIndex(
    (c) => c.stance !== "superseded" && c.edge?.subject === turn.edge.subject && edgeKey(c.edge) !== key,
  );
  if (conflict >= 0) {
    out.revisions += 1;
    out.claims[conflict] = { ...out.claims[conflict], stance: "superseded", supersededAt: now };
  }

  out.claims.push({
    edge: { ...turn.edge },
    phrase: claim || actWord(turn.edge.verb),
    stance: "holds",
    standing: standingOfTurn({ surfVoid, corroborated }),
    statedConfidence: turn.statedConfidence ?? null,
    witness: turn.witness ?? null,
    times: 1,
    first: now,
    last: now,
  });
  out.claims = out.claims.slice(-24); // bounded — type-level, not a transcript
  out.assertions += 1;
  return out;
}

// ── pure: the durable facts, phrased for the mouth ───────────────────────
const STANDING_PHRASE = Object.freeze({
  contested: "it has been contested — not settled",
  established: "it has been supported by what has come up",
  unexamined: "nothing has checked it yet",
});
const CONFIDENCE_PHRASE = Object.freeze({
  high: "you said you were sure",
  medium: "you said you thought so",
  low: "you said you weren't sure",
});

export function durableFacts(model) {
  const m = model && String(model.schema ?? "").startsWith("SpeakerModel@") ? model : EMPTY_MODEL;
  const facts = [];
  const seen = new Set();
  for (const c of m.claims ?? []) {
    if (c.stance === "superseded") continue; // kept in the record, not spoken
    if (seen.has(c.phrase)) continue;
    seen.add(c.phrase);
    const theirs = CONFIDENCE_PHRASE[c.statedConfidence];
    const standing = STANDING_PHRASE[c.standing] ?? STANDING_PHRASE.unexamined;
    facts.push(`you've said before that ${c.phrase} — ${theirs ? `${theirs}, and ` : ""}${standing}.`);
  }
  if (m.revisions > 0) facts.push("you've changed what you held before — I keep the record of both.");
  if (m.misreadings > 0) facts.push("you've told me before that I read you wrong — your account of you is the one I keep.");
  return facts;
}

// ── thin store ───────────────────────────────────────────────────────────
export function loadSpeakerModel(userId) {
  try {
    const p = speakerModelPath(userId);
    if (!fs.existsSync(p)) return { ...EMPTY_MODEL, claims: [] };
    const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!String(parsed?.schema ?? "").startsWith("SpeakerModel@")) return { ...EMPTY_MODEL, claims: [] };
    return parsed;
  } catch {
    return { ...EMPTY_MODEL, claims: [] };
  }
}

export function saveSpeakerModel(userId, model) {
  try {
    fs.mkdirSync(SPEAKER_MODEL_DIR(), { recursive: true });
    fs.writeFileSync(speakerModelPath(userId), JSON.stringify(model, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

// ── the person's own record, theirs to see and remove ────────────────────
export function exportSpeakerModel(userId) { return loadSpeakerModel(userId); }

export function deleteSpeakerModel(userId) {
  try {
    const p = speakerModelPath(userId);
    if (!fs.existsSync(p)) return false;
    fs.unlinkSync(p);
    return true;
  } catch {
    return false;
  }
}

export function listSpeakerModels() {
  try {
    fs.mkdirSync(SPEAKER_MODEL_DIR(), { recursive: true });
    return fs.readdirSync(SPEAKER_MODEL_DIR()).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

export const SPEAKER_MODEL = {
  schema: "SpeakerModel@2",
  describe: "the person's holograph: their bound assertion edges (subject—action—object) admitted from the turn's structural parse, supersessions kept append-only, no word lists",
};