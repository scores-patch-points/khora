// speaker-model.test.js — the person's HOLOGRAPH (2026-10-09): their bound
// assertion edges (subject—action—object), read from the turn's structural
// parse via the chain NL → the language's grammar → EOT. These tests pin:
//
//   1. NO WORD LISTS — the module exports no lexicon, no turn-shape classes,
//      and reads its kinds/edges entirely from the parser's deprels and feats;
//   2. an edge is bound structurally (nsubj / root / obj / Polarity=Neg) and a
//      claim with no bound subject is a typed gap, never a guess;
//   3. a statement binds and holds; a question/greeting declares no claim;
//   4. the person REVISING what they hold SUPERSEDES the old edge (kept, never
//      erased — the holograph's REC) and is counted;
//   5. ids never collide onto one stored record.
import test from "node:test";
import assert from "node:assert/strict";
import * as speaker from "../the-fold/speaker-model.js";
import {
  edgeFromRecords,
  standingOfTurn,
  updateSpeakerModel,
  durableFacts,
  sanitizeId,
  speakerModelPath,
  EMPTY_MODEL,
  loadSpeakerModel,
  saveSpeakerModel,
  exportSpeakerModel,
  deleteSpeakerModel,
  listSpeakerModels,
} from "../the-fold/speaker-model.js";
import { readIntent } from "../organs/intent-reader.js";
import { loadEotParser } from "../the-fold/eot-notation.js";

const conlluRec = (rows) => ({
  schema: "EOTRich@1",
  surface: { lines: rows.map((r) => r.join("\t")) },
});

const CLAUSE_MAYOR_CORRUPT = [
  ["1", "The", "the", "DET", "_", "Definite=Def|PronType=Art", "2", "det", "_", "_"],
  ["2", "mayor", "mayor", "NOUN", "_", "Number=Sing", "4", "nsubj", "_", "_"],
  ["3", "is", "be", "AUX", "_", "Mood=Ind|VerbForm=Fin", "4", "cop", "_", "_"],
  ["4", "corrupt", "corrupt", "ADJ", "_", "Degree=Pos", "0", "root", "_", "_"],
];

test("NO WORD LISTS: the module carries no lexicon and no turn-shape classes", () => {
  for (const gone of ["extractClaim", "extractStatedConfidence", "detectMisreading", "corroborationOfClaim", "chatTurnPriorsFor"]) {
    assert.equal(gone in speaker, false, `${gone} must not exist — the model reads structure, never a lexicon`);
  }
});

test("an edge is bound structurally; a claim with no subject is a typed gap", () => {
  const e = edgeFromRecords(conlluRec(CLAUSE_MAYOR_CORRUPT));
  assert.equal(e.ok, true);
  assert.deepEqual(e.edge, { subject: "mayor", verb: "corrupt", object: null, negated: false });
  // a bare addressee / interjection — no subject — binds nothing
  const g = edgeFromRecords(conlluRec([["1", "thanks", "thanks", "INTJ", "_", "_", "0", "root", "_", "_"]]));
  assert.equal(g.ok, false);
  assert.match(g.gap, /no subject/);
  assert.equal(edgeFromRecords([]).ok, false);
});

test("negation is read from the parser's OWN sign (Polarity=Neg), whatever the deprel", () => {
  const rows = CLAUSE_MAYOR_CORRUPT.map((r) => [...r]);
  rows[3] = ["4", "not", "not", "PART", "_", "Polarity=Neg", "5", "advmod", "_", "_"];
  rows.push(["5", "corrupt", "corrupt", "ADJ", "_", "Degree=Pos", "0", "root", "_", "_"]);
  rows[1] = ["2", "mayor", "mayor", "NOUN", "_", "Number=Sing", "5", "nsubj", "_", "_"];
  rows[2] = ["3", "is", "be", "AUX", "_", "Mood=Ind|VerbForm=Fin", "5", "cop", "_", "_"];
  const e = edgeFromRecords(conlluRec(rows));
  assert.equal(e.ok, true);
  assert.equal(e.edge.negated, true, "a Polarity=Neg token headed at the clause negates it, even as advmod, never 'neg'");
});

test("standing: only a DECLARED corroboration establishes; a surfaced count never does", () => {
  assert.equal(standingOfTurn({ corroborated: true }), "established");
  assert.equal(standingOfTurn({ surfVoid: true }), "contested");
  assert.equal(standingOfTurn({}), "unexamined");
  assert.equal(standingOfTurn({ surfaced: 9 }), "unexamined");
});

test("a statement binds and holds; a question declares no claim", () => {
  const m = updateSpeakerModel(EMPTY_MODEL, {
    turn: { intent: "statement", claim: "the mayor is corrupt", edge: { subject: "mayor", verb: "corrupt", object: null, negated: false }, witness: "turn:0" },
  });
  assert.equal(m.claims.length, 1);
  assert.equal(m.claims[0].stance, "holds");
  assert.equal(m.claims[0].phrase, "the mayor is corrupt", "the person's own words are kept");
  assert.equal(m.claims[0].standing, "unexamined");

  for (const intent of ["question", "phatic", "imperative", null]) {
    const q = updateSpeakerModel(EMPTY_MODEL, {
      turn: { intent, claim: "anything", edge: { subject: "mayor", verb: "corrupt", object: null, negated: false }, witness: "turn:1" },
    });
    assert.equal(q.claims.length, 0, `${intent} declares no claim`);
  }
});

test("reassertion reaffirms (times++); a conflicting sign SUPERSEDES (kept, never erased)", () => {
  const turn = (edge, claim, intent = "statement") => ({ intent, claim, edge, witness: "turn:0" });
  let m = updateSpeakerModel(EMPTY_MODEL, { turn: turn({ subject: "mayor", verb: "corrupt", object: null, negated: false }, "the mayor is corrupt") });
  m = updateSpeakerModel(m, { turn: turn({ subject: "mayor", verb: "corrupt", object: null, negated: false }, "the mayor is corrupt") });
  assert.equal(m.claims[0].times, 2, "the same edge reaffirmed");
  m = updateSpeakerModel(m, { turn: turn({ subject: "mayor", verb: "corrupt", object: null, negated: true }, "the mayor is not corrupt") });
  assert.equal(m.revisions, 1);
  const byStance = Object.fromEntries(m.claims.map((c) => [c.stance, c.edge]));
  assert.equal(byStance.holds.negated, true, "the new claim now holds");
  assert.equal(byStance.superseded.negated, false, "the old claim is KEPT, superseded, never erased");
  assert.ok(durableFacts(m).some((f) => /changed what you held/.test(f)));
  assert.equal(durableFacts(m).filter((f) => /you've said before/.test(f)).length, 1, "the superseded edge is kept in the record, not spoken");
});

test("integration through the real grammar (NL → grammar → EOT)", async () => {
  const p = await loadEotParser();
  const read = (t) => {
    const recs = p.parse(t);
    const intent = readIntent(recs)?.intents?.[0] ?? null;
    const edge = edgeFromRecords(recs);
    return { intent, claim: t, edge: edge.ok ? edge.edge : null, witness: "turn:0" };
  };
  let m = updateSpeakerModel(EMPTY_MODEL, { turn: read("I think the mayor is corrupt") });
  assert.equal(m.claims[0].edge.subject, "mayor", "descends into the embedded clause the person holds");
  assert.equal(m.claims[0].edge.negated, false);
  m = updateSpeakerModel(m, { turn: read("I don't think the mayor is corrupt") });
  assert.equal(m.revisions, 1, "the sign change supersedes — structurally, without a negator word list");
  const negated = m.claims.find((c) => c.stance === "holds");
  assert.equal(negated.edge.negated, true);
  assert.equal(updateSpeakerModel(EMPTY_MODEL, { turn: read("Do I think the mayor is corrupt?") }).claims.length, 0, "a question binds no claim");
  assert.equal(updateSpeakerModel(EMPTY_MODEL, { turn: read("can you explain that?") }).claims.length, 0);
});

test("FALSIFIER F8: two identities never collide onto one stored record", () => {
  assert.notEqual(speakerModelPath("user:a"), speakerModelPath("user_a"));
  assert.equal(sanitizeId("bench-conc-0-1"), "bench-conc-0-1");
});

test("the store: save, export, list, delete — the record is the person's", () => {
  const userId = `test-speaker-model-${process.pid}`;
  deleteSpeakerModel(userId);
  assert.equal(saveSpeakerModel(userId, { ...EMPTY_MODEL, revisions: 1 }), true);
  assert.equal(exportSpeakerModel(userId).revisions, 1);
  assert.ok(listSpeakerModels().includes(`${sanitizeId(userId)}.json`));
  assert.equal(deleteSpeakerModel(userId), true);
  assert.equal(loadSpeakerModel(userId).claims.length, 0);
  assert.equal(deleteSpeakerModel(userId), false);
});