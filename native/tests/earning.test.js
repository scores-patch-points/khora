// earning — how signal is earned from noise, medium-blind (kernel/earning.js). Items are plain indices; nothing here knows a pixel or a word.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nullOf, continuity, agree, difference, REFUSALS, lcg } from "../kernel/earning.js";
import { DIFFERENCE } from "../kernel/commitments.js";

const noise = (n, moments, seed) => { const r = lcg(seed); return Array.from({ length: moments }, () => Array.from({ length: n }, () => r())); };

test("law 1: a null that names neither what it destroys nor what it keeps is refused", () => {
  assert.throws(() => nullOf({ keeps: "x", draws: 10, q: 0.99 }), (e) => e.code === REFUSALS.NO_DESTROYS);
  assert.throws(() => nullOf({ destroys: "x", draws: 10, q: 0.99 }), (e) => e.code === REFUSALS.NO_KEEPS);
  assert.throws(() => nullOf({ destroys: "x", keeps: "y" }), (e) => e.code === REFUSALS.UNDECLARED);
  assert.match(nullOf({ destroys: "where", keeps: "how much", draws: 10, q: 0.99 }).text, /destroys where; keeps how much/);
});

test("law 5: the verdict is the kernel's own signal/noise kind", () => {
  assert.equal(difference(2, 1), DIFFERENCE.SIGNAL);
  assert.equal(difference(1, 1), DIFFERENCE.NOISE);
});

test("law 3: an item that comes back moment after moment is signal; noise everywhere is not", () => {
  const f = noise(200, 10, 1); for (const m of f) m[17] += 1;     // item 17 is a little higher, every moment
  const c = continuity(f, { draws: 400, q: 0.99, seed: 2 });
  assert.equal(c.flags[17], 1);
  // pure noise passes a 99th-percentile null about 1% of the time, no more: averaged over seeds
  let passed = 0; for (const s of [1, 2, 3, 4, 5]) passed += continuity(noise(200, 10, 100 + s), { draws: 400, q: 0.99, seed: s }).flags.reduce((a, b) => a + b, 0);
  assert.ok(passed / (5 * 200) <= 0.02, `pure noise passes at ${(passed / 10).toFixed(1)}%`);
  assert.equal(c.verdicts[17], "SIG");
});

test("law 3: one loud moment is not continuity", () => {
  const f = noise(200, 10, 3); f[4][50] += 3;                     // a single spike, once
  const c = continuity(f, { draws: 400, q: 0.99, seed: 4 });
  assert.equal(c.flags[50], 0, "a single spike, however loud, is not continuity");
  const steady = noise(200, 10, 3); for (const m of steady) m[50] += 0.5;   // a smaller difference, every moment
  const s = continuity(steady, { draws: 400, q: 0.99, seed: 4 });
  assert.equal(s.flags[50], 1, "a steady modest difference is signal");
});

test("law 2: exchangeable only among likes — a stratum that is noisier is not mistaken for signal", () => {
  // items 0..99 are 'smooth' (noise costs them more), 100..199 'busy'; nothing is signal
  const r = lcg(5), f = Array.from({ length: 10 }, () => Array.from({ length: 200 }, (_, i) => r() * (i < 100 ? 3 : 1)));
  const flat = continuity(f, { draws: 400, q: 0.99, seed: 6 });
  const strata = Array.from({ length: 200 }, (_, i) => (i < 100 ? 0 : 1));
  const strat = continuity(f, { strata, stratumName: "smooth or busy", draws: 400, q: 0.99, seed: 6 });
  const count = (c) => c.flags.reduce((a, b) => a + b, 0);
  assert.ok(count(flat) > 10, `without strata the noisier stratum floods the verdict (${count(flat)})`);
  assert.ok(count(strat) <= 4, `with strata it does not (${count(strat)})`);
  assert.match(strat.null.text, /within smooth or busy/);
  assert.throws(() => continuity(f, { strata: [0, 1], draws: 10, q: 0.99 }), (e) => e.code === REFUSALS.NO_STRATA);
});

test("law 4: co-location beyond chance, by two mechanisms, is signal; one mechanism twice is one reading", () => {
  const n = 300, mk = (on, extra, seed) => { const r = lcg(seed), f = new Uint8Array(n); for (const i of on) f[i] = 1; for (let k = 0; k < extra; k++) f[Math.floor(r() * n)] = 1; return f; };
  const figure = [10, 11, 12, 13, 14];
  const a = { name: "a", mechanism: "differencing", flags: mk(figure, 20, 1) }, b = { name: "b", mechanism: "pursuit", flags: mk(figure, 20, 2) };
  const r = agree([a, b], { draws: 300, q: 0.99, seed: 3 });
  for (const i of figure) assert.ok(r.items.includes(i));
  const twin = { name: "a2", mechanism: "differencing", flags: a.flags };
  assert.equal(agree([a, twin], { draws: 300, q: 0.99, seed: 3 }).items.length, 0, "two names for one decoder corroborate nothing");
  assert.throws(() => agree([{ name: "x", flags: a.flags }], { draws: 10, q: 0.99 }), (e) => e.code === REFUSALS.NO_MECHANISM);
});

test("law 4: adding instruments raises the bar, never lowers it", () => {
  const n = 300, r = lcg(9), dense = () => Uint8Array.from({ length: n }, () => (r() < 0.3 ? 1 : 0));
  const few = agree([1, 2].map((k) => ({ name: `i${k}`, mechanism: `m${k}`, flags: dense() })), { draws: 300, q: 0.99, seed: 1 });
  const many = agree([1, 2, 3, 4, 5, 6].map((k) => ({ name: `i${k}`, mechanism: `m${k}`, flags: dense() })), { draws: 300, q: 0.99, seed: 1 });
  assert.ok(many.need > few.need, `need ${few.need} with 2 instruments, ${many.need} with 6`);
});

import { startle } from "../kernel/earning.js";
test("the loudest moment is a startle: a sudden change startles, a steady difference does not", () => {
  const f = noise(120, 10, 21).map((m) => m.map((v) => v * 0.1));
  for (const m of f) m[30] += 1;          // item 30: a steady difference (continuity)
  for (let k = 7; k < 10; k++) f[k][80] += 2;   // item 80: something new from moment 7 on
  const s = startle(f, { minPast: 3 });
  assert.ok(s.byItem.get(80)?.includes(7), "the onset startles");
  assert.ok(!(s.byItem.get(30) ?? []).length, "what the past's own dynamics predict does not startle");
  const c = continuity(f, { draws: 400, q: 0.99, seed: 1 });
  assert.equal(c.flags[30], 1, "the steady difference is continuity");
});

test("law 4: two dense instruments agree somewhere by chance, but not on a connected region", () => {
  const W = 30, n = W * 20, r = lcg(31), nb = (i) => [i - 1, i + 1, i - W, i + W].filter((j) => j >= 0 && j < n && (Math.abs((j % W) - (i % W)) <= 1));
  const region = []; for (let y = 5; y < 10; y++) for (let x = 5; x < 11; x++) region.push(y * W + x);
  const mk = () => { const f = Uint8Array.from({ length: n }, () => (r() < 0.15 ? 1 : 0)); for (const i of region) f[i] = 1; return f; };
  const a = { name: "a", mechanism: "differencing", flags: mk() }, b = { name: "b", mechanism: "pursuit", flags: mk() };
  const plain = agree([a, b], { draws: 200, q: 0.99, seed: 2 });
  assert.ok(plain.need > 2 && plain.items.length === 0, "by count alone, two dense instruments never corroborate");
  const withRegions = agree([a, b], { draws: 200, q: 0.99, seed: 2, neighbors: nb });
  for (const i of region) assert.ok(withRegions.items.includes(i));
  assert.ok(withRegions.items.length < region.length + 15, `few chance items join (${withRegions.items.length - region.length})`);
  const noRegion = agree([{ ...a, flags: Uint8Array.from({ length: n }, () => (r() < 0.15 ? 1 : 0)) }, { ...b, flags: Uint8Array.from({ length: n }, () => (r() < 0.15 ? 1 : 0)) }], { draws: 200, q: 0.99, seed: 3, neighbors: nb });
  assert.equal(noRegion.regions, 0, "scattered agreement makes no region");
});

test("a cut startles the whole moment: everything changes at once, so no item is an outlier, but the moment is", () => {
  const r = lcg(41), f = Array.from({ length: 10 }, (_, k) => Array.from({ length: 100 }, () => r() * 0.1 + (k === 7 ? 3 : 0)));
  const s = startle(f), m7 = s.moments.find((m) => m.at === 7);
  assert.equal(m7.whole, true);
  assert.ok(s.moments.filter((m) => m.at !== 7 && m.at !== 8).every((m) => m.whole !== true), "quiet moments are not cuts");
});
