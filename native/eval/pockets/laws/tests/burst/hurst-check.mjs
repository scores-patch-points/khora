import { load } from "../../../loaders/planted.mjs";
import { nullView, seedOf } from "../../../lib/pocket.mjs";
import { compute } from "../../burst.mjs";
const [p] = await load(["pl-markov"]);
const idx = []; p.docOf.forEach((d, k) => { if (d >= 50) idx.push(k); });
let tok = 0, cut = idx.length; for (let i = 0; i < idx.length; i++) { tok += p.units[idx[i]].length; if (tok >= 50000 && p.docOf[idx[i + 1]] !== p.docOf[idx[i]]) { cut = i + 1; break; } }
const view = { id: "pl-markov", which: "B", units: idx.slice(0, cut).map((k) => p.units[k]), docOf: idx.slice(0, cut).map((k) => p.docOf[k]) };
const obs = compute(view).hurst, xs = [];
for (let k = 0; k < 150; k++) xs.push(compute(nullView(view, "unit-order", seedOf("hc", k))).hurst);
const m = xs.reduce((a, b) => a + b, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / 149);
console.log(JSON.stringify({ obs, nullMean: m, nullSd: sd, z150: (obs - m) / sd, pctBelow: xs.filter((x) => x < obs).length / 150, min: Math.min(...xs), max: Math.max(...xs) }));
