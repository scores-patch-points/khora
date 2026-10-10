// diag: compare the token-global and within-unit nulls for the four bag statistics (refrain, dupShare, formulaCov, tmplReuse) on law-free and structured worlds.
import fs from "node:fs";
import { load } from "../../../loaders/planted.mjs";
import { halves, nullView, seedOf } from "../../../lib/pocket.mjs";
import { proseView, quranView, cpu } from "./_t_util.mjs";
import { lengthWorld, refrainWorld } from "./_t_worlds.mjs";
import * as para from "../../para.mjs";
const ET = "/Users/mlacy/Documents/3.0/ethos", IDS = ["refrain", "dupShare", "formulaCov", "tmplReuse"], out = {};
function diag(name, view) {
  const obs = para.compute(view), r = { tokens: view.units.reduce((a, u) => a + u.length, 0) };
  for (const kind of ["token-global", "within-unit"]) {
    const D = []; for (let k = 0; k < 10; k++) D.push(para.compute(nullView(view, kind, seedOf(name, "diag", kind, k))));
    for (const s of IDS) { const xs = D.map((d) => d[s]).filter(Number.isFinite), m = xs.reduce((a, b) => a + b, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); (r[s] ||= { v: obs[s] })[kind] = { m, sd, z: sd > 0 ? (obs[s] - m) / sd : null }; }
  }
  out[name] = r; console.error(name, r.tokens + "t", IDS.map((s) => { const c = r[s], f = (x) => x.z === null ? "null" : x.z.toFixed(1); return `${s}: v ${c.v?.toPrecision(3)} | TG m ${c["token-global"].m.toPrecision(2)} z ${f(c["token-global"])} | WU m ${c["within-unit"].m.toPrecision(2)} z ${f(c["within-unit"])}`; }).join(" || "));
}
const H = {}; for (const p of await load(["pl-null", "pl-null2", "pl-length", "pl-frames", "pl-parallel", "pl-mix", "pl-markov"])) H[p.id] = halves(p);
for (const id of Object.keys(H)) for (const w of ["discover", "confirm"]) diag(`${id}/${w}`, H[id][w]);
const hv = (v, id) => halves({ id, units: v.units, docOf: v.docOf });
for (const [n, v] of [["dracula", proseView(`${ET}/01-literature-books/gitenberg/pg345_Dracula.txt`)], ["quran-en", quranView(`${ET}/14-holy-texts/quran-suras`)]]) { const h = hv(v, n); for (const w of ["discover", "confirm"]) diag(`${n}/${w}`, h[w]); }
for (const v of [lengthWorld({ tag: "lw-rho0" }), refrainWorld({ tag: "rw-refrain" })]) diag(v.id, v);
fs.writeFileSync(new URL("./diag-bag-null.json", import.meta.url), JSON.stringify(out, null, 1));
