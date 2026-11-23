// form-projection.test.mjs — the continuous fallback for unknown forms.
// Pins the mechanism (deterministic, mock embedder, no model) and the typo recovery (frozen codec,
// skipped when ollama is not reachable). The claim is measured, not set: a projection is claimed
// only when the unknown form is closer to its nearest known form than that form's own nearest
// distinct word.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeFormProjection, PROJECTION_PREFIX } from "./form-projection.js";

const norm = (a) => { let n = 0; for (const x of a) n += x * x; n = Math.sqrt(n) || 1; return Float32Array.from(a, (x) => x / n); };
const mockEmbedder = (vecFor) => ({ embed: async (texts) => texts.map((t) => norm(vecFor(t))), save: () => {} });

const VOCAB = ["receive", "thought", "because", "dog", "cat", "run", "happy", "quickly"];
const V = {
  receive: [1, 0, 0, 0, 0, 0, 0],
  thought: [0, 1, 0, 0, 0, 0, 0],
  because: [0, 0, 1, 0, 0, 0, 0],
  dog: [0, 0, 0, 1, 0, 0, 0],
  cat: [0, 0, 0, 0.8, 0.6, 0, 0],
  run: [0, 0, 0, 0, 0, 1, 0],
  happy: [0, 0, 0, 0, 0, 0, 1],
  quickly: [0.1, 0, 0, 0, 0, 0, 0.99],
  recieve: [0.99, 0, 0, 0, 0, 0, 0.14], // typo of receive
  thouhgt: [0, 0.99, 0, 0, 0, 0, 0.14], // typo of thought
  zzzq: [0, 0, 0, 0, 0, 0, 0], // far from everything
};
const FORMS = {
  receive: { VERB: 10 },
  thought: { NOUN: 20, VERB: 8 },
  because: { SCONJ: 30 },
  dog: { NOUN: 15 },
  cat: { NOUN: 14 },
  run: { VERB: 12, NOUN: 3 },
  happy: { ADJ: 9 },
  quickly: { ADV: 7 },
};

test("projection: a typo projects to the nearest known form and carries its POS (mechanism, no model)", async () => {
  const p = makeFormProjection({ forms: FORMS, embedder: mockEmbedder((t) => V[t] ?? [0, 0, 0, 0, 0, 0, 0]) });
  const r = await p.project("recieve");
  assert.equal(r.projected, true, "recieve is a guess, not an attestation");
  assert.equal(r.nearest, "receive", "recieve projects to receive");
  assert.deepEqual(r.candidates, { VERB: 10 }, "the guess carries receive's POS counts");

  const thouhgt = await p.project("thouhgt");
  assert.equal(thouhgt.nearest, "thought", "thouhgt projects to thought");
  assert.deepEqual(thouhgt.candidates, { NOUN: 20, VERB: 8 });
});

test("projection: a known form is a no-op, never re-guessed", async () => {
  const p = makeFormProjection({ forms: FORMS, embedder: mockEmbedder((t) => V[t] ?? [0, 0, 0, 0, 0, 0, 0]) });
  const r = await p.project("receive");
  assert.equal(r.found, true);
  assert.equal(r.projected, false);
  assert.equal(r.nearest, "receive");
});

test("claim: measured, not set — closer than the form's own nearest distinct word", async () => {
  const p = makeFormProjection({ forms: FORMS, embedder: mockEmbedder((t) => V[t] ?? [0, 0, 0, 0, 0, 0, 0]) });
  const c = await p.projectClaim("recieve");
  assert.equal(c.claimed, true, "recieve is closer to receive than any distinct word is");
  assert.equal(c.nearest, "receive");
  assert.ok(c.margin > 0, "the margin is positive when claimed");

  const far = await p.projectClaim("zzzq");
  assert.equal(far.claimed, false, "a form no closer than distinct words are abstains");
});

test("empty surface abstains", async () => {
  const p = makeFormProjection({ forms: FORMS, embedder: mockEmbedder((t) => V[t] ?? [0, 0, 0, 0, 0, 0, 0]) });
  const r = await p.project("");
  assert.equal(r.projected, false);
  assert.equal(r.found, false);
});

const ollama = await (async () => { try { const r = await fetch("http://localhost:11434/api/tags"); const j = await r.json(); return (j.models ?? []).some((m) => m.name === "nomic-embed-text:latest"); } catch { return false; } })();

test("typo recovery under the frozen codec: confident typo recovers and claims, degenerate match abstains", { skip: !ollama }, async () => {
  const forms = {
    receive: { VERB: 10 }, thought: { NOUN: 20, VERB: 8 }, because: { SCONJ: 30 },
    dog: { NOUN: 15 }, cat: { NOUN: 14 }, run: { VERB: 12 }, walk: { VERB: 9 },
    happy: { ADJ: 9 }, quickly: { ADV: 7 }, the: { DET: 50 }, and: { CCONJ: 40 },
    but: { CCONJ: 22 }, if: { SCONJ: 18 }, water: { NOUN: 16 }, fire: { NOUN: 13 },
    book: { NOUN: 21, VERB: 2 }, read: { VERB: 11 }, write: { VERB: 9 }, love: { NOUN: 12, VERB: 10 },
    hate: { VERB: 7 }, big: { ADJ: 8 }, small: { ADJ: 6 }, day: { NOUN: 25 }, night: { NOUN: 24 },
  };
  const p = makeFormProjection({ forms });

  // The confident typo recovers its word and CLAIMS against the measured null (closer to receive
  // than receive is to its nearest distinct word).
  const r = await p.project("recieve");
  assert.equal(r.nearest, "receive", `recieve should recover receive (got ${r.nearest})`);
  assert.equal(r.projected, true);
  const c = await p.projectClaim("recieve");
  assert.equal(c.claimed, true, "the recovered typo claims against its measured null");

  // The honest limit: single-word nomic embeddings are degenerate for open vocabulary — a typo can
  // fall into the dense function-word cluster ("thouhgt" -> "the"). The claim guard must then ABSTAIN,
  // never false-claim. This is the safety property that makes the projection usable.
  const t = await p.projectClaim("thouhgt");
  if (t.nearest === "thought") assert.equal(t.claimed, true);
  else assert.equal(t.claimed, false, `a degenerate match (thouhgt -> ${t.nearest}) must abstain, never false-claim`);
});
