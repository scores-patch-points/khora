// smoke on a real book: raw values, null draws (within-unit and unit-order), z, timing, MI profile of real and one null draw. node smoke-real.mjs [rel] [cap]
import { nullView, seedOf } from "../../../lib/pocket.mjs";
import * as fam from "../../comp.mjs";
import { bookView, atlasCells, cpuMs, round, tokensOf } from "./_t_util.mjs";
const rel = process.argv[2] ?? "01-literature-books/gitenberg/pg1400_Great-Expectations.txt", cap = Number(process.argv[3] ?? 60000);
const v = bookView(rel, "ge", cap), t = cpuMs(() => fam.compute(v));
console.log("tokens", tokensOf(v), "units", v.units.length, "cpu ms", round(t.cpu, 1));
const cells = atlasCells(v, 10);
for (const [k, c] of Object.entries(cells)) console.log(k.padEnd(9), "v", String(c.v).padEnd(8), "null", String(c.nullMean).padEnd(8), "sd", String(c.nullSd).padEnd(8), "z", c.z);
const m = fam.miProfile(v), n = fam.miProfile(nullView(v, "within-unit", seedOf("x", 1)));
console.log("MI real", m.MI.map((x) => round(x, 4)).join(" "), "\nMI null", n.MI.map((x) => round(x, 4)).join(" "), "\nN", m.N.join(" "));
