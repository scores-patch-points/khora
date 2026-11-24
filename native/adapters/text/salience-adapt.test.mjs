// salience-adapt.test.mjs — adaptation is per (language, user), switched on only when the learning beats the shipped prior, kept as observations without text, and rebuilt from the log.
import test from "node:test"; import assert from "node:assert/strict";
import { makeAdaptiveSalience, observationOf, DEFAULTS } from "./salience-adapt.js";
const w = (s1) => { const a = new Array(13).fill(0); a[4] = s1; return a; };   // a subject of the sentence before is worth s1 for every anaphor role
const TABLE = { schema: "SaliencePrior@1", weights: { S: w(1), O: w(1), X: w(1) }, measured: { calibration: { persons: [] } } };
const cand = (roles) => ({ roles, mentions: 1 });
// a stream where the shipped prior is systematically wrong: the older subject (two sentences back) is the right one, the shipped prior prefers the subject of the sentence before
const wrongStream = (n) => Array.from({ length: n }, () => ({ anaphorRole: "S", candidates: [cand(["-", "S", "-"]), cand(["-", "-", "S"])], gold: 1 }));
const rightStream = (n) => Array.from({ length: n }, () => ({ anaphorRole: "S", candidates: [cand(["-", "S", "-"]), cand(["-", "-", "S"])], gold: 0 }));
test("an observation is features and the index of the right candidate: no text, no ids; null when the right one is not among the candidates", () => {
  const o = observationOf({ anaphorRole: "S", kind: "person", goldId: "casey", candidates: [{ id: "casey", roles: ["-", "S"], mentions: 2 }, { id: "jordan", roles: ["-", "O", "-"], mentions: 1 }] });
  assert.deepEqual(o, { anaphorRole: "S", kind: "person", gold: 0, candidates: [{ roles: ["-", "S", "-"], mentions: 2 }, { roles: ["-", "O", "-"], mentions: 1 }] }); assert.doesNotMatch(JSON.stringify(o), /casey|jordan/);   // regex-ok: a test that no name is stored
  assert.equal(observationOf({ anaphorRole: "S", goldId: "zed", candidates: [{ id: "a", roles: [] }] }), null); assert.equal(observationOf({ anaphorRole: "Q", goldId: "a", candidates: [{ id: "a", roles: [] }] }), null);
});
test("where the shipped prior is right the shadow never beats it, so it never switches on and the answers are the shipped prior's", () => {
  const ad = makeAdaptiveSalience({ table: TABLE }); for (const o of rightStream(80)) ad.observe("fr|u1", o);
  const st = ad.status("fr|u1"); assert.equal(st.adapted, false); assert.equal(ad.prior("fr|u1").adapted, false); assert.match(ad.prior("fr|u1").why, /shipped prior stands/); assert.equal(st.shippedRight, 80);
});
test("where the shipped prior is systematically wrong the shadow learns, wins the disagreements, and the switch turns on; an adapted answer is not calibrated", () => {
  const ad = makeAdaptiveSalience({ table: TABLE }); const q = { anaphorRole: "S", candidates: [{ id: "new", roles: ["-", "S", "-"], mentions: 1 }, { id: "old", roles: ["-", "-", "S"], mentions: 1 }], kind: "person" };
  assert.equal(ad.prior("fr|u1").rank(q).top, "new");   // the shipped answer
  for (const o of wrongStream(120)) ad.observe("fr|u1", o);
  const st = ad.status("fr|u1"); assert.equal(st.adapted, true, JSON.stringify(st)); assert.ok(st.a >= DEFAULTS.minDiscordant && st.b === 0 && st.z > DEFAULTS.z);
  const p = ad.prior("fr|u1"), r = p.rank(q); assert.equal(p.adapted, true); assert.equal(r.top, "old", "the adapted answer follows what this language and user showed"); assert.equal(r.calibrated, null); assert.match(p.why, /adapted from 120 observations/);
});
test("adaptation is per language and user: another key keeps the shipped prior", () => {
  const ad = makeAdaptiveSalience({ table: TABLE }); for (const o of wrongStream(120)) ad.observe("fr|u1", o); for (const o of rightStream(30)) ad.observe("en|u2", o);
  assert.equal(ad.status("fr|u1").adapted, true); assert.equal(ad.status("en|u2").adapted, false); assert.equal(ad.prior("tr|nobody").adapted, false); assert.equal(ad.status("tr|nobody").why, "no observations"); assert.deepEqual(ad.keys().sort(), ["en|u2", "fr|u1"]);
});
test("the state is rebuilt from the log in order: the same entries give the same status as observing live", () => {
  const live = makeAdaptiveSalience({ table: TABLE }), obs = wrongStream(60).concat(rightStream(10)); for (const o of obs) live.observe("fr|u1", o);
  const log = obs.map((o) => ({ kind: "anaphor-observation", body: { key: "fr|u1", ...o } })).concat([{ kind: "utterance", body: {} }]), rebuilt = makeAdaptiveSalience({ table: TABLE }).fromLog(log);
  assert.deepEqual(rebuilt.status("fr|u1"), live.status("fr|u1"));
});
test("once on it stays on (the tally is cumulative), but the shadow keeps learning, so its answers follow the stream when the stream reverses", () => {
  const ad = makeAdaptiveSalience({ table: TABLE }), q = { anaphorRole: "S", candidates: [{ id: "new", roles: ["-", "S", "-"], mentions: 1 }, { id: "old", roles: ["-", "-", "S"], mentions: 1 }] };
  for (const o of wrongStream(100)) ad.observe("k", o); assert.equal(ad.status("k").adapted, true); assert.equal(ad.prior("k").rank(q).top, "old");
  for (const o of rightStream(400)) ad.observe("k", o); assert.equal(ad.status("k").adapted, true, "no decayed tally: it does not switch off"); assert.equal(ad.prior("k").rank(q).top, "new", "but its answers followed the reversal");
});
test("a missing table does nothing and says so; the evaluation switch alwaysOn answers from the shadow", () => {
  const none = makeAdaptiveSalience({ table: null }); none.observe("k", wrongStream(1)[0]); assert.equal(none.prior("k").adapted, false); assert.equal(none.prior("k").missing, true);
  const on = makeAdaptiveSalience({ table: TABLE, alwaysOn: true }); on.observe("k", wrongStream(1)[0]); assert.equal(on.prior("k").adapted, true);
});
