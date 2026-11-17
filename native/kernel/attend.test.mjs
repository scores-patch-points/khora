// attend.js: one learner, no task code. It must separate signal from noise, evaporate a useless channel, and be deterministic.
import test from "node:test"; import assert from "node:assert/strict"; import { trainAttend, score, auc, seeded } from "./attend.js";
const R = seeded(5); const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += R(); return (s - 3) * 1.4; };
const rows = []; for (let g = 0; g < 12; g++) for (let i = 0; i < 80; i++) { const y = R() < 0.5 ? 1 : 0; rows.push({ x: [y * 1.5 + gauss(), y * 1.2 + gauss(), gauss(), gauss(), gauss()], y, g: "g" + g }); }
const CHAN = ["signal", "signal", "noise", "noise", "noise"];
test("it finds the signal: held-out AUC well above chance", () => {
  const train = rows.filter((r) => r.g !== "g0"), test_ = rows.filter((r) => r.g === "g0"); const m = trainAttend(train, CHAN, { gated: false });
  assert.ok(auc(test_.map((r) => score(m, r.x)), test_.map((r) => r.y)) > 0.8);
});
test("attention: the gate keeps the signal channel and evaporates a channel that pays nothing", () => {
  const m = trainAttend(rows, CHAN, { gated: true }); assert.equal(m.gate.signal, 1); assert.equal(m.gate.noise, 0);
});
test("it learns its own L2 from the declared grid, and is deterministic", () => {
  const a = trainAttend(rows, CHAN, { gated: true }), b = trainAttend(rows, CHAN, { gated: true }); assert.ok([0.001, 0.01, 0.1].includes(a.lam)); assert.deepEqual([...a.w], [...b.w]); assert.equal(a.b, b.b);
});
test("a task of pure noise does NOT produce a confident learner (it must be able to fail)", () => {
  const noise = []; for (let g = 0; g < 10; g++) for (let i = 0; i < 60; i++) noise.push({ x: [gauss(), gauss(), gauss()], y: R() < 0.5 ? 1 : 0, g: "n" + g });
  const train = noise.filter((r) => r.g !== "n0"), te = noise.filter((r) => r.g === "n0"); const m = trainAttend(train, ["a", "a", "a"], { gated: false });
  const a = auc(te.map((r) => score(m, r.x)), te.map((r) => r.y)); assert.ok(a > 0.3 && a < 0.7, `AUC ${a} on noise`);
});
