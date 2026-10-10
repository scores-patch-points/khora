// edge cases and fuzz of the comp family: tiny views, one unit, one type, all-singleton units, all-unique tokens, CJK and astral tokens, and 300 seeded random small views. Every output must be a finite number or null; no exception.
import * as fam from "../../comp.mjs";
import { rngOf, seedOf } from "../../../lib/pocket.mjs";
const view = (units) => ({ id: "edge", which: "discover", units, docOf: units.map(() => 0) });
const cases = {
  empty: view([]), oneToken: view([["a"]]), hundredTokens: view(Array.from({ length: 20 }, (_, i) => ["a", "b", "c", "d", "e"].map((x) => x + (i % 3)))),
  oneUnit5000: view([Array.from({ length: 5000 }, (_, i) => "w" + ((i * 7) % 50))]),
  oneType: view(Array.from({ length: 2000 }, () => ["x", "x", "x", "x", "x"])),
  allSingletonUnits: view(Array.from({ length: 4000 }, (_, i) => ["w" + (i % 300)])),
  allUniqueTokens: view(Array.from({ length: 2000 }, (_, i) => [0, 1, 2, 3, 4].map((j) => "u" + (i * 5 + j)))),
  cjkChars: view(Array.from({ length: 3000 }, (_, i) => [0, 1, 2, 3].map((j) => String.fromCodePoint(0x4e00 + ((i * 3 + j * 7) % 400))))),
  astral: view(Array.from({ length: 3000 }, (_, i) => [0, 1, 2, 3].map((j) => String.fromCodePoint(0x1f300 + ((i * 3 + j * 7) % 300))))),
};
const bad = []; const check = (name, c) => { for (const [k, v] of Object.entries(c)) if (!(v === null || (typeof v === "number" && Number.isFinite(v)))) bad.push(`${name}.${k}=${v}`); };
const res = {};
for (const [name, v] of Object.entries(cases)) { try { const c = fam.compute(v); check(name, c); res[name] = Object.fromEntries(Object.entries(c).map(([k, x]) => [k, x == null ? null : Math.round(x * 1e4) / 1e4])); } catch (e) { res[name] = "EXCEPTION " + e.message; bad.push(`${name}: exception ${e.message}`); } }
const rnd = rngOf(seedOf("comp-edge-fuzz")); let nulls = 0, cells = 0;
for (let r = 0; r < 300; r++) {
  const nu = 1 + Math.floor(rnd() * 400), V = 2 + Math.floor(rnd() * 200), mx = 1 + Math.floor(rnd() * 30);
  const v = view(Array.from({ length: nu }, () => Array.from({ length: 1 + Math.floor(rnd() * mx) }, () => "t" + Math.floor(Math.pow(rnd(), 2.2) * V))));
  try { const c = fam.compute(v); check(`fuzz${r}`, c); for (const x of Object.values(c)) { cells++; if (x == null) nulls++; } } catch (e) { bad.push(`fuzz${r}: exception ${e.message}`); }
}
console.log(JSON.stringify({ problems: bad, fuzz: { views: 300, cells, nullCells: nulls }, cases: res }, null, 1));
