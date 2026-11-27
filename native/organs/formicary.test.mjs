// formicary.test.mjs: the law of the formicary, one test per clause (organs/formicary.mjs header). node --test native/organs/formicary.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openFormicary, addrOf, headOf, FormicaryError } from "./formicary.mjs";
import { trailWeight } from "../kernel/stigmergy.js";

const H = (c) => c.repeat(64), docA = H("a"), docB = H("b"), docC = H("c"), docD = H("d");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "formicary-"));
const clock = (t0 = 1_700_000_000_000) => { let t = t0; return { now: () => t, tick: (ms) => { t += ms; } }; };
const code = (fn) => { try { fn(); } catch (e) { return e instanceof FormicaryError ? e.code : `other:${e.message}`; } return "no error"; };

test("a target is an address of the scholia, a head is marks, never text", () => {
  assert.equal(addrOf({ doc: docA }), `doc:${docA}`); assert.equal(addrOf({ hash: docA, k: 7 }), `doc:${docA}#7`); assert.equal(addrOf({ lemma: "hamlet", lang: "en" }), "lemma:en:hamlet"); assert.equal(addrOf(`doc:${docA}#3`), `doc:${docA}#3`);
  assert.equal(code(() => addrOf({ doc: "abc" })), "BAD_ADDRESS"); assert.equal(code(() => addrOf("who was hamlet's father")), "BAD_ADDRESS"); assert.equal(code(() => addrOf({ lemma: "x" })), "BAD_ADDRESS");
  assert.equal(headOf(["father", "hamlet"]), headOf(["hamlet", "father", "hamlet"]), "the same marks in any order are one head");
  assert.equal(code(() => headOf(["who was hamlet's father"])), "HEAD_IS_TEXT"); assert.equal(code(() => headOf(["a".repeat(170)])), "HEAD_IS_TEXT"); assert.equal(code(() => headOf([])), "HEAD_IS_TEXT");
});

test("a trail is laid only on a verified use, and a failed try earns nothing", () => {
  const f = openFormicary({ user: "u1", dir: tmp() }), h = headOf(["hamlet"]);
  assert.equal(code(() => f.lay(h, { doc: docA })), "NOT_VERIFIED"); assert.equal(code(() => f.lay(h, { doc: docA }, { verified: "yes" })), "NOT_VERIFIED");
  f.tried(h, { doc: docB }); assert.equal(f.strength(h, { doc: docB }), 0, "a failure deposits no strength");
  f.lay(h, { doc: docA }, { verified: true }); assert.ok(f.strength(h, { doc: docA }) > 0);
});

test("order() is a PERMUTATION: earned first, untried as given, dead last; nothing added, nothing dropped", () => {
  const c = clock(), f = openFormicary({ user: "u1", dir: tmp(), now: c.now }), h = headOf(["hamlet"]), cands = [{ doc: docB }, { doc: docA }, { doc: docC }, { doc: docD }];
  f.lay(h, { doc: docC }, { verified: true }); f.tried(h, { doc: docB });
  const out = f.order(h, cands, { explore: 0 });
  assert.deepEqual(out.map((x) => x.doc), [docC, docA, docD, docB], "earned C, then untried A and D in the caller's order, then dead B");
  assert.deepEqual([...out].sort((x, y) => x.doc.localeCompare(y.doc)), [...cands].sort((x, y) => x.doc.localeCompare(y.doc)), "the same candidates");
  const empty = openFormicary({ user: "u2", dir: tmp() }).order(h, cands, { explore: 0 }); assert.deepEqual(empty, cands, "no trails, no reordering: absence proves nothing");
  const dup = f.order(h, [{ doc: docA }, { doc: docC }, { doc: docA }], { explore: 0 }); assert.equal(dup.length, 3, "a repeated candidate stays repeated");
});

test("each user has their own colony: one user's trails never reorder another's, and both persist", () => {
  const dir = tmp(), c = clock(), a = openFormicary({ user: "alice", dir, now: c.now }), b = openFormicary({ user: "bob", dir, now: c.now }), h = headOf(["hamlet"]), cands = [{ doc: docA }, { doc: docB }];
  a.lay(h, { doc: docB }, { verified: true });
  assert.deepEqual(a.order(h, cands, { explore: 0 }).map((x) => x.doc), [docB, docA]); assert.deepEqual(b.order(h, cands, { explore: 0 }).map((x) => x.doc), [docA, docB], "bob has no trail: his order is as given");
  assert.notEqual(a.file, b.file); const a2 = openFormicary({ user: "alice", dir, now: c.now }); assert.deepEqual(a2.order(h, cands, { explore: 0 }).map((x) => x.doc), [docB, docA], "alice's trail survives reopening");
  assert.equal(code(() => openFormicary({ user: "../etc" })), "BAD_USER");
});

test("the fade is the measured power law, not a half-life: weight = (1 + age in seconds)^-1.2, and an old trail never reaches zero", () => {
  const now = 2_000_000_000_000, w = (age) => trailWeight(now - age * 1000, now, { law: "power" }), ratio = (w(1) / w(100));
  assert.ok(Math.abs(Math.log(w(2) / w(101)) / Math.log(102 / 3) - 1.2) < 0.001, "the log-log slope against (1 + age) is -1.2");
  assert.ok(Math.abs(ratio / Math.pow(101 / 2, 1.2) - 1) < 0.001, `1 s ago against 100 s ago is (101/2)^1.2 = ${Math.pow(101 / 2, 1.2).toFixed(0)} times as strong, got ${ratio.toFixed(1)}`);
  assert.ok(w(86400 * 30) > 0, "a month-old trail still counts a little");
  const exp = (age) => trailWeight(now - age * 1000, now, { law: "exp" }); assert.ok(exp(1) / exp(100) < 1.001, "the 7-day exponential cannot tell 1 s from 100 s: that is the shape the nexus measured against");
});

test("recency beats an older, larger pile under the power law, and frequency still counts among equals", () => {
  const c = clock(), f = openFormicary({ user: "u1", dir: tmp(), now: c.now }), h = headOf(["hamlet"]);
  for (let i = 0; i < 3; i++) f.lay(h, { doc: docA }, { verified: true }); c.tick(3_600_000); f.lay(h, { doc: docB }, { verified: true });
  assert.deepEqual(f.order(h, [{ doc: docA }, { doc: docB }], { explore: 0 }).map((x) => x.doc), [docB, docA], "one trail an hour newer outranks three older ones");
  const g = openFormicary({ user: "u2", dir: tmp(), now: c.now }); g.lay(h, { doc: docA }, { verified: true }); g.lay(h, { doc: docB }, { verified: true }); g.lay(h, { doc: docB }, { verified: true });
  assert.ok(g.strength(h, { doc: docB }) > g.strength(h, { doc: docA }), "equally recent: more deposits, more strength");
});

test("a poisoned trail costs order, never membership; an alarm forgets what the route had deposited", () => {
  const c = clock(), f = openFormicary({ user: "u1", dir: tmp(), now: c.now }), h = headOf(["hamlet"]), cands = [{ doc: docA }, { doc: docB }, { doc: docC }];
  f.lay(h, { doc: docC }, { verified: true });   // a wrong document, laid in error
  const bad = f.order(h, cands, { explore: 0 }); assert.equal(bad[0].doc, docC); assert.deepEqual(bad.map((x) => x.doc).sort(), [docA, docB, docC].sort(), "the answer set is unchanged: only the order moved");
  c.tick(10); f.alarm(h, { doc: docC }, "gave a wrong answer"); assert.equal(f.strength(h, { doc: docC }), 0, "the alarm forgets the earlier deposits"); assert.deepEqual(f.order(h, cands, { explore: 0 }).map((x) => x.doc), [docA, docB, docC], "back to the caller's order");
});

test("scouts still go first sometimes: the exploration is not closed by the trails", () => {
  const f = openFormicary({ user: "u1", dir: tmp() }), h = headOf(["hamlet"]), cands = [{ doc: docA }, { doc: docB }, { doc: docC }];
  f.lay(h, { doc: docA }, { verified: true }); assert.equal(f.order(h, cands, { explore: 1, rng: () => 0 })[0].doc, docB, "an untried candidate is probed first when the scout rolls");
  assert.equal(f.order(h, cands, { explore: 0 })[0].doc, docA);
});

test("the user can forget everything; two handles on one user's file see each other", () => {
  const dir = tmp(), c = clock(), a = openFormicary({ user: "u1", dir, now: c.now }), a2 = openFormicary({ user: "u1", dir, now: c.now }), h = headOf(["hamlet"]), cands = [{ doc: docA }, { doc: docB }];
  a.lay(h, { doc: docB }, { verified: true }); assert.deepEqual(a2.order(h, cands, { explore: 0 }).map((x) => x.doc), [docB, docA], "the environment is the message: a second handle reads the first's deposit");
  a.forgetAll(); assert.equal(fs.existsSync(a.file), false); assert.deepEqual(a.order(h, cands, { explore: 0 }).map((x) => x.doc), [docA, docB]);
});

test("every deposit, alarm and mark is offered to a caller's log with the user named; nothing is written outside the user's file otherwise", async () => {
  const seen = [], c = clock(), f = openFormicary({ user: "u1", dir: tmp(), now: c.now, onMark: (m) => seen.push(m) }), h = headOf(["hamlet"]);
  f.lay(h, { doc: docA }, { verified: true }); f.alarm(h, { doc: docA }, "wrong"); await f.flush();
  assert.deepEqual(seen.map((m) => m.kind), ["trail-deposit", "trail-veto"]); assert.ok(seen.every((m) => m.user === "u1" && m.head === h && m.route === `doc:${docA}`), "the mark names the user, the head and the address, and no text");
  assert.equal(openFormicary({ user: "u2", dir: tmp() }).pharos().on, false, "no writer given: nothing goes to pharos, and it says so");
});
