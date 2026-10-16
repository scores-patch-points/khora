import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "delta-")); process.env.FOLD_WORKNOTES_DIR = d; return d; };
const R = await import("./opencode-record.mjs");
const D = await import("./opencode-delta.mjs");
const L = await import("./opencode-ledger.mjs");
const FRAME = { giver: "person", question: "does retry hold", ground: "tests" };
let n = 0;
const put = (task, referent, delta, extra = {}) => {
  const r = R.admit({ task, agent: "a", referent, delta, check: "true", exitCode: 0, now: Date.now() + (n++), ...extra });
  const b = R.blocks(task).find((x) => x.id === r.id);
  return D.measure({ task, block: b, judge: "box", frame: FRAME });
};
const seed = (task, k = 8) => { for (let i = 0; i < k; i++) put(task, `mod${i}@1`, `defines thing ${i}`); };

test("a restated block scores zero and is NOT appended (DMD gate); a novel referent is", () => {
  fresh(); D._forgetHolos(); L._forget();
  seed("t");
  const before = L.rows("t").length;
  const novel = put("t", "mod99@1", "brand new");
  assert.equal(L.rows("t").length, before + 1);
  const restated = put("t", "mod1@1", "defines thing 1");
  assert.equal(restated.slots.relation, "restated");
  assert.equal(restated.skipped, "no-difference");
  assert.equal(restated.bayes, 0);
  assert.ok(restated.bayes < novel.bayes);
  assert.equal(L.rows("t").length, before + 1, "the restatement left no row");
});

test("ledger rows carry the weft-lean envelope: asPass reads them and clothAt projects the cloth", () => {
  fresh(); D._forgetHolos(); L._forget();
  seed("t", 4);
  put("t", "mod1@1", "defines thing 1 differently");
  const c = L.cloth("t");
  assert.ok(c.referents.size >= 4 || c.referents.length >= 4, "the referents are in the cloth projected from the ledger");
  const sup = L.rows("t", { schema: "MeaningDelta@1" }).at(-1);
  assert.deepEqual(sup.con[0].slice(0, 3).map(String).slice(0, 2), ["mod1@1", "superseded"]);
  assert.equal(sup.git, null);
});

test("a repeat of the same measurement is not appended twice", () => {
  fresh(); D._forgetHolos(); L._forget();
  seed("t", 2);
  const b = R.blocks("t")[0];
  const n = L.rows("t").length;
  const again = D.measure({ task: "t", block: b, judge: "box", frame: FRAME });
  assert.equal(L.rows("t").length, n);
  assert.ok(again.skipped);
});

test("a supersede of an established referent outscores a novel referent", () => {
  fresh(); D._forgetHolos(); L._forget();
  seed("t", 12);
  const novel = put("t", "mod77@1", "another new one");
  const sup = put("t", "mod2@1", "defines thing 2 differently");
  assert.equal(sup.slots.relation, "superseded");
  assert.ok(sup.bayes > novel.bayes, `${sup.bayes} > ${novel.bayes}`);
});

test("slot-shuffle null: the real rare value beats the same stream with the last row's value drawn from the pooled column", async () => {
  fresh(); D._forgetHolos(); L._forget();
  const { createHolograph, admit } = await import("./native/kernel/bayes-surprise.js");
  seed("t", 20);
  const real = put("t", "mod3@1", "defines thing 3 differently");
  assert.equal(real.slots.relation, "superseded");
  const pool = L.rows("t", { schema: "MeaningDelta@1" }).slice(0, 20).map((r) => r.m.slots);
  let sv = 7; const rnd = () => (sv = (sv * 48271) % 2147483647) / 2147483647;
  let beats = 0;
  for (let k = 0; k < 200; k++) {
    const h = createHolograph();
    for (const sl of pool) admit(h, sl);
    const drawn = { ...pool[Math.floor(rnd() * pool.length)] }; // a value from the pooled column, not the real structure
    if (admit(h, drawn).bayes >= real.bayes) beats++;
  }
  assert.ok(beats / 200 < 0.05, `null matched the real supersede in ${beats}/200 draws`);
});

test("noise (an unseen kind, words only) does not outrank a real supersede; word noise moves nothing", () => {
  fresh(); D._forgetHolos(); L._forget();
  seed("t", 15);
  const sup = put("t", "mod4@1", "defines thing 4 differently");
  const noiseWords = put("t", "mod5@1", "defines thing 5"); // restated: words differ nowhere that matters
  const noiseKind = put("t", "zq9x@1", "kjsdf lkjsdf");
  assert.ok(sup.bayes > noiseKind.bayes, `supersede ${sup.bayes} > unseen-kind noise ${noiseKind.bayes}`);
  assert.ok(noiseWords.bayes < sup.bayes);
  // and the row records alpha, gamma, reader — declared, never measured
  const row = L.rows("t", { schema: "MeaningDelta@1" }).at(-1);
  assert.deepEqual([row.alpha, row.gamma, row.reader], [1, 1, "workspace"]);
});

test("register gate: reported rows feed the said-holograph, never the witnessed one", () => {
  fresh(); D._forgetHolos(); L._forget();
  seed("t", 6);
  const r = R.admit({ task: "t", agent: "a", referent: "said1@1", delta: "x", check: "true", exitCode: 0 });
  const b = R.blocks("t").find((x) => x.id === r.id);
  const m = D.measure({ task: "t", block: b, judge: "reported", frame: FRAME });
  assert.equal(m.register, "said");
  const w = L.rows("t", { schema: "MeaningDelta@1" }).filter((x) => x.register === "witnessed" && x.counted).length;
  assert.equal(w, 6, "the said row did not count into the world holograph");
});

test("no frame is a typed gap, logged and not counted; foreign priors are read, never admitted", async () => {
  fresh(); D._forgetHolos(); L._forget();
  const { createHolograph, admit } = await import("./native/kernel/bayes-surprise.js");
  const foreign = createHolograph(); admit(foreign, { kind: "mod0", relation: "new", verdict: "checked", wasGreen: "no" });
  const before = JSON.stringify([...foreign.slots]);
  const r = R.admit({ task: "t", agent: "a", referent: "g@1", delta: "x", check: "true", exitCode: 0 });
  const b = R.blocks("t").find((x) => x.id === r.id);
  assert.equal(D.measure({ task: "t", block: b, judge: "box" }).gap, "no_for_whom");
  assert.equal(D.rankOf("t").length, 0);
  const m = D.measure({ task: "t", block: b, judge: "box", frame: FRAME, priors: { zenodotus_code: foreign } });
  assert.ok(m.divergence.zenodotus_code > 0);
  assert.equal(JSON.stringify([...foreign.slots]), before, "foreign reader untouched");
});

test("rezero starts a new generation seeded fresh; old rows stay on the ledger", () => {
  fresh(); D._forgetHolos(); L._forget();
  seed("t", 10);
  const old = L.rows("t", { schema: "MeaningDelta@1" }).length;
  D.rezero({ task: "t", reason: "ground conceded" });
  const m = put("t", "mod0@1", "defines thing 0 differently");
  assert.equal(L.rows("t", { schema: "MeaningDelta@1" }).length, old + 1, "old rows kept, one new");
  assert.equal(L.rows("t", { schema: "MeaningDelta@1" }).at(-1).generation, 1);
  const first = L.rows("t", { schema: "MeaningDelta@1" })[0];
  assert.equal(first.generation, 0, "the old generation is frozen, not deleted");
  assert.ok(m.bayes > 0);
});
