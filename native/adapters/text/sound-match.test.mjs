// sound-match.test.mjs — the "sounds right" confirmation: a surface resolved by its pronunciation.
// Pins the homophone claim (exact IPA, no threshold) and the falsification that motivates it: the
// phonetic misspelling is the case ORTHOGRAPHY gets wrong and only sound gets right ("fone" is one
// edit from "one" but sounds exactly like "phone"). Skips when espeak-ng is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSoundMatch, g2p } from "./sound-match.js";
import { makeFormRecovery } from "./form-recovery.js";
import { execFileSync } from "node:child_process";

const hasEspeak = (() => { try { execFileSync("espeak-ng", ["--version"]); return true; } catch { return false; } })();

const FORMS = {
  phone: { NOUN: 20, VERB: 5 }, through: { ADP: 40 }, cough: { NOUN: 8, VERB: 4 },
  night: { NOUN: 30 }, right: { ADJ: 25, NOUN: 6 }, write: { VERB: 15 }, white: { ADJ: 12 },
  one: { NUM: 50 }, true: { ADJ: 18 }, coffee: { NOUN: 12 }, definitely: { ADV: 9 },
};

test("g2p: espeak pronounces a phonetic misspelling exactly like its intended word", { skip: !hasEspeak }, () => {
  assert.equal(g2p("fone"), g2p("phone"), "fone is phone's homophone");
  assert.equal(g2p("thru"), g2p("through"), "thru is through's homophone");
  assert.equal(g2p("coff"), g2p("cough"), "coff is cough's homophone");
});

test("soundClaim: a phonetic misspelling recovers its word by exact sound", { skip: !hasEspeak }, () => {
  const r = makeSoundMatch({ forms: FORMS });
  assert.deepEqual([r.soundClaim("fone").method, r.soundClaim("fone").nearest], ["homophone", "phone"]);
  assert.equal(r.soundClaim("thru").nearest, "through");
  assert.equal(r.soundClaim("nite").nearest, "night");
  assert.equal(r.soundClaim("wite").nearest, "white");
});

test("soundClaim: an ambiguous homophone abstains (rite = right AND write)", { skip: !hasEspeak }, () => {
  const r = makeSoundMatch({ forms: FORMS });
  const c = r.soundClaim("rite");
  assert.equal(c.claimed, false);
  assert.equal(c.reason, "ambiguous-homophone");
  assert.ok(c.matches.includes("right") && c.matches.includes("write"), `matches: ${c.matches}`);
});

test("the division of labour: orthography gets the phonetic misspelling wrong, sound gets it right", { skip: !hasEspeak }, () => {
  const snd = makeSoundMatch({ forms: FORMS });
  const orth = makeFormRecovery({ forms: FORMS });
  // "fone" is one edit from "one" (orthography "recovers" one, wrong) and two from "phone" (abstains),
  // but it sounds exactly like "phone" — the person typed the sound, so sound is the cue that carries.
  assert.equal(orth.recoverClaim("fone").nearest, "one", "orthography alone lands on the wrong word");
  assert.equal(snd.soundClaim("fone").nearest, "phone", "sound alone lands on the intended word");
});

test("soundClaim: a known form is a no-op; empty abstains", { skip: !hasEspeak }, () => {
  const r = makeSoundMatch({ forms: FORMS });
  assert.equal(r.soundClaim("phone").method, "known");
  assert.equal(r.soundClaim("").claimed, false);
  assert.equal(r.soundClaim("").reason, "empty");
});
