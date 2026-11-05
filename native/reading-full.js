// reading-full.js — THE COMPOSED READING: one entry point that runs the stages that exist in khora but sat outside the reading path.
//
// WHY. readDocument returns a parse, a cast and thin edges. The claims, the Thrax lens over parts of speech, the notes ledger and the phasepost
// classification were separate modules, each with its own tests, that no reader called (a static trace from reading.js reached 77 of 802
// organ/adapter/kernel/fold modules). This composes them in the helix order, one stage after another, and says what each stage did:
//
//   read     readDocument (language declared, parse kept)                      — the existing pipeline, unchanged
//   claims   the language's grammar claimsOf over the reader's own cut and parse, ends minted from the cast
//   units    every parsed token as an addressed unit, with what the claims placed it as (end / act / figure / polarity / unread / nothing)
//   class    Thrax's categories laid over each token's INSTANCE class (the parse's UPOS, through the giver-declared THRAX_MAP), with the measured
//            type-level prior (pos-<lang>.json) beside it as an independent witness; a relation label's class through grammar-lens when a minShare is declared
//   notes    the claims heard onto a notes ledger (INS/SYN, denials as cuts, reported speech under its own witness)
//   moves    each act's phasepost (operator × grain) where a received act prior exists for the language
//
// EVERY STAGE REPORTS. `wiring` lists each stage as ran / skipped / gap with its reason and counts, so "what was read, and by what" is on the result and
// a missing prior is a typed gap, never a silent fill. Nothing here alters readDocument, read-core.mjs, or any default.
//
// NOT WIRED, and said so in `wiring`: the embedding-ablation class witness (needs an embedding model and a built centroid set), the attention binder
// and castIdentity (opt-in repairs owned elsewhere; pass `read: { castIdentity: true }` to turn the latter on in readDocument).
import fs from "node:fs";
import path from "node:path";
import { readDocument, rowsOfFor, priorsFor } from "./reading.js";
import { makeNotes } from "./kernel/notes.js";
import { cellOf } from "./kernel/cube.js";
import { priorsHome } from "./the-fold/prior-source.mjs";
import { classifyWord, dominantClass, THRAX_MAP, THRAX_META } from "./legacy-ported/packages/engine/perceiver/text/wordclass.js";
import { makeGrammarLens } from "./organs/grammar-lens.js";
import { makePhasepost } from "./adapters/text/phasepost.js";
import { DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS } from "./adapters/text/priors.js";

const lc = (t) => String(t ?? "").toLowerCase();
const OPEN = new Set(["NOUN", "PROPN", "VERB", "ADJ", "ADV", "NUM", "INTJ"]);   // UD's open classes (+ NUM): the tokens a reading may not silently drop

// ── claims, from the language's own grammar over the reader's own parse
async function claimsOfEntry(entry, language) {
  const stem = entry.language?.stem ?? language;
  const P = await rowsOfFor(stem);
  if (!P?.claimsOf) return { sentences: [], by: null, gap: P?.gap ?? `no claims grammar for ${stem}` };
  const spans = (entry.cast ?? []).flatMap((c) => (c.mentionSpans ?? []).map(([s, t]) => ({ ref: c.ref, s, t })));
  const refAt = (a, b) => spans.find((x) => x.s <= a && b <= x.t)?.ref ?? null;
  const sentences = (entry.parse ?? []).map((p) => {
    const mint = (e) => { if (!e) return e; const r = p.rows.find((x) => x.id === e.hid) ?? p.rows.find((x) => (e.ids ?? []).includes(x.id)); return { ...e, ref: r ? refAt(p.offset + r.start, p.offset + r.end) : null }; };
    let cs = []; try { cs = P.claimsOf(p.text, p.rows); } catch { cs = []; }
    return { offset: p.offset, text: p.text, rows: p.rows, claims: cs.map((c) => ({ ...c, at: p.offset, ARG0: mint(c.ARG0), ARG1: mint(c.ARG1), OBL: (c.OBL ?? []).map(mint) })) };
  });
  return { sentences, by: P.by ?? null, gap: null };
}

// ── units: every parsed token, addressed, with what the claims placed it as
function unitsOf(sentences, posPrior) {
  const units = [];
  for (const [si, s] of sentences.entries()) {
    const placed = new Map(), mark = (ids, role) => { for (const id of ids ?? []) if (!placed.has(id)) placed.set(id, role); };
    const markEnd = (e, depth = 0) => { if (!e || depth > 6) return; mark(e.ids, "end"); for (const n of e.nmods ?? []) markEnd(n, depth + 1); };
    const unread = new Set();
    for (const c of s.claims) {
      if (c.rel === "fig") { mark(c.ids, "figure"); continue; }
      for (const e of [c.ARG0, c.ARG1, c.ARG2, ...(c.OBL ?? [])]) markEnd(e);
      if (c.vid != null) mark([c.vid], "act");
      for (const u of c.unread ?? []) unread.add(lc(typeof u === "string" ? u : u?.text ?? u?.head));
    }
    for (const r of s.rows) {
      let role = placed.get(r.id) ?? null;
      if (!role && /Polarity=Neg/.test(r.feats ?? "") && s.claims.some((c) => c.vid === r.head && c.polarity === "-")) role = "polarity";
      if (!role && (unread.has(lc(r.lemma)) || unread.has(lc(r.form)))) role = "unread";
      const cls = classifyWord(r.form, { posPrior }), attested = cls.found ? cls.candidates.map((c) => ({ upos: c.upos, share: +c.share.toFixed(3) })) : null;
      units.push({
        sentence: si, id: r.id, form: r.form, lemma: r.lemma ?? null, upos: r.upos, feats: r.feats ?? null, start: s.offset + r.start, end: s.offset + r.end,
        placed: role, open: OPEN.has(r.upos),
        class: { thrax: THRAX_MAP[r.upos] ?? null, attested, witness: !posPrior ? "no-prior" : !cls.found ? "form-unseen" : cls.candidates.some((c) => c.upos === r.upos) ? "agrees" : "not-attested-as-this-class" },
      });
    }
  }
  return units;
}

// ── arrangements for the notes ledger (denials as cuts; reported speech under its own witness)
const face = (e) => (e ? (e.ref ? String(e.ref).replace(/^ref:auto:/, "") : lc(e.names?.length ? e.names.join(" ") : e.head).normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "")) : null);
const opening = (e) => lc(String(e?.text ?? "").trim().split(/\s+/)[0]);
export function arrangementsOf(claims, source) {
  const out = [];
  for (const c of claims) {
    const span = [{ ref: source, start: c.at, end: c.at + (c.sentence?.length ?? 0) }], asserted = c.asserted !== false, cut = c.polarity === "-";
    const push = (end1, label, end2) => { if (end1 && label && end2) out.push({ end1, label, end2, polarity: c.polarity, asserted, spans: span, decider: cut ? c.sentence : undefined }); };
    if (c.rel === "fig") { if (c.ARG0 && c.fig) push(face(c.ARG0), `#${String(c.fig.measure ?? "").split(":")[0]}`, String(c.fig.base ?? c.fig.v ?? "")); continue; }
    push(face(c.ARG0), c.rel, face(c.ARG1));
    for (const o of c.OBL ?? []) push(face(c.ARG0 ?? c.ARG1), `${c.rel}·${opening(o)}`, face(o));
  }
  return out;
}

const actPriorFor = (stem2) => {
  try { const dir = priorsHome().dir; const f = path.join(dir, `act-prior-${stem2}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; } catch { return null; }
};

/**
 * readFull(text, { language, lexicon, read, lens, source }) → { entry, claims, units, notes, moves, wiring }
 *   language  declared, as readDocument takes it ("en", "eng", "fra", …)
 *   read      extra options for readDocument (e.g. { castIdentity: true })
 *   lens      { minShare } — declare it to classify each relation label through grammar-lens; absent, that part is skipped and says so (minShare is never defaulted)
 *   source    the ledger witness for these claims (default "text")
 */
export async function readFull(text, { language = "en", lexicon = false, read = {}, lens = null, source = "text" } = {}) {
  const wiring = [], stage = (name, status, detail = {}) => wiring.push({ stage: name, status, ...detail });
  const entry = await readDocument(text, { language, rows: true, lexicon, minCharacters: 0, ...read });
  stage("read", "ran", { parseBy: entry.parseBy ?? null, sentences: (entry.parse ?? []).length, gaps: (entry.gaps ?? []).map((g) => g.gap ?? g) });

  const { sentences, by, gap } = await claimsOfEntry(entry, language);
  const claims = sentences.flatMap((s) => s.claims.map((c) => ({ ...c, sentence: s.text })));
  stage("claims", gap ? "gap" : "ran", gap ? { reason: gap } : { grammar: by, claims: claims.length, twoEnded: claims.filter((c) => c.ARG0 && c.ARG1 && c.rel !== "fig").length });

  const pri = priorsFor(entry.language?.stem ?? language), posPrior = pri?.posPrior ?? null;
  const units = unitsOf(sentences, posPrior);
  const open = units.filter((u) => u.open);
  stage("units", "ran", { tokens: units.length, open: open.length, placed: open.filter((u) => u.placed).length, silent: open.filter((u) => !u.placed).length });

  stage("class", posPrior ? "ran" : "gap", posPrior
    ? { measuredBy: posPrior.provenance?.giver ?? null, declaredBy: THRAX_META.giver, witnessAgrees: units.filter((u) => u.class.witness === "agrees").length, notAttested: units.filter((u) => u.class.witness === "not-attested-as-this-class").length, formUnseen: units.filter((u) => u.class.witness === "form-unseen").length }
    : { reason: `no measured POS prior for ${entry.language?.stem ?? language}: units carry Thrax's class from the parse alone` });

  let relationClasses = null;
  if (lens && Number.isFinite(lens.minShare) && posPrior) {
    const classify = makeGrammarLens({ classifyWord, dominantClass, posPrior, posPriorMeta: { giver: posPrior.provenance?.giver ?? null, scope: posPrior.language ?? null }, thraxMeta: THRAX_META });
    relationClasses = claims.filter((c) => c.rel && c.rel !== "fig").map((c) => { const r = classify({ label: c.rel }, { minShare: lens.minShare }); return { rel: c.rel, thraxClass: r.thraxClass, settled: r.settled, found: r.found }; });
    stage("lens", "ran", { minShare: lens.minShare, relations: relationClasses.length, notVerb: relationClasses.filter((r) => r.settled && r.thraxClass !== "verb").length });
  } else stage("lens", "skipped", { reason: !lens ? "no minShare declared: how dominant a class must be is never a default" : !Number.isFinite(lens.minShare) ? "minShare must be a number in [0,1]" : "no measured POS prior" });

  const notes = makeNotes();
  let log = notes.createNotes({ frame: { reader: by ?? "none", language: entry.language?.stem ?? language, stages: "readFull" } }), contests = 0;
  const arr = arrangementsOf(claims, source);
  for (const [flag, w] of [[true, source], [false, `reported:${source}`]]) { const part = arr.filter((a) => a.asserted === flag); if (!part.length) continue; const r = notes.admit(log, part, { witness: w }); log = r.log; contests += r.contests?.length ?? 0; }
  const rows = notes.fold(log), cuts = arr.filter((a) => a.polarity === "-").map(({ end1, label, end2 }) => ({ end1, label, end2 }));   // a denial is a cut: kept off the link fold on purpose, so it is listed here
  // the ledger hears an arrangement of two ends and a label; an act with an end missing cannot be heard, and is listed, never dropped silently
  const unheard = claims.filter((c) => c.rel && c.rel !== "fig" && !(c.ARG0 && c.ARG1)).map((c) => ({ rel: c.rel, polarity: c.polarity, missing: !c.ARG0 && !c.ARG1 ? "both" : !c.ARG0 ? "ARG0" : "ARG1" }));
  stage("notes", "ran", { arrangements: arr.length, notes: rows.length, cuts: cuts.length, contests, unheard: unheard.length, unheardDenials: unheard.filter((u) => u.polarity === "-").length });

  const stem2 = (entry.language?.declared ?? language).slice(0, 2).toLowerCase(), actPrior = actPriorFor(stem2) ?? actPriorFor(entry.language?.stem === "eng" ? "en" : stem2);
  let moves = null;
  if (actPrior) {
    const pp = makePhasepost({ actPrior, cellOf, definiteDeterminers: DEFINITE_DETERMINERS, indefiniteDeterminers: INDEFINITE_DETERMINERS });
    moves = claims.filter((c) => c.rel && c.rel !== "fig").map((c) => { let v; try { v = pp.classify({ end1: c.ARG0?.text ?? "", label: c.rel, end2: c.ARG1?.text ?? null }); } catch { v = { standing: "gap" }; } return { rel: c.rel, op: v.op ?? null, grain: v.grain ?? null, cell: v.cell ? `${v.cell.op}·${v.cell.grain}` : null, standing: v.standing, candidates: (v.candidates ?? []).map((x) => x.op) }; });
    stage("moves", "ran", { acts: moves.length, decided: moves.filter((m) => m.op).length, contested: moves.filter((m) => m.standing === "contested").length, gaps: moves.filter((m) => m.standing === "gap").length });
  } else stage("moves", "gap", { reason: `no act prior (act-prior-${stem2}.json) for this language` });

  stage("ablation-pos", "gap", { reason: "not wired: needs an embedding model and a built centroid set (scripts/build-ablation-grain-prior.mjs)" });
  return { entry, claims, units, relationClasses, notes: { log, rows, cuts, unheard }, moves, wiring };
}
