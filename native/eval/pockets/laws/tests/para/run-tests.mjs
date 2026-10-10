// tests/para/run-tests.mjs — node run-tests.mjs <suite> ; writes results-<suite>.json next to this file. Suites: planted, real, lenworld, size, timing.
import fs from "node:fs";
import { load } from "../../../loaders/planted.mjs";
import { halves } from "../../../lib/pocket.mjs";
import { evalView, row, proseView, quranView, hebrewView, codeView, sliceTokens, tokensOf, cpu } from "./_t_util.mjs";
import { lengthWorld, refrainWorld } from "./_t_worlds.mjs";
import * as para from "../../para.mjs";
const ET = "/Users/mlacy/Documents/3.0/ethos", suite = process.argv[2], out = {};
const log = (...a) => console.error(...a);
const halvesOf = (v) => { const h = halves({ id: v.id, units: v.units, docOf: v.docOf }); return h; };
async function planted() {
  for (const p of await load(["pl-null", "pl-null2", "pl-parallel", "pl-burst", "pl-markov", "pl-frames", "pl-length", "pl-mix"])) {
    const H = halves(p);
    for (const w of ["discover", "confirm"]) { const r = evalView(H[w], p.id); out[`${p.id}/${w}`] = r; log(`${p.id}/${w} ${r.tokens}t cpuObs ${r.cpuObs.toFixed(2)} ${row(r)}`); }
  }
}
function real() {
  const books = [["dracula", proseView(`${ET}/01-literature-books/gitenberg/pg345_Dracula.txt`)], ["quran-en", quranView(`${ET}/14-holy-texts/quran-suras`)]];
  for (const [name, v] of books) {
    const H = halvesOf({ ...v, id: name });
    for (const w of ["discover", "confirm"]) { const r = evalView(H[w], name); out[`${name}/${w}`] = r; log(`${name}/${w} ${r.tokens}t ${r.units}u cpuObs ${r.cpuObs.toFixed(2)} ${row(r)}`); }
  }
}
function real2() { // non-Latin script (Hebrew Torah, verses = units, chapters = docs) and source code (lines = units, blocks of 100 lines = docs)
  const books = [["hebrew-torah", hebrewView(`${ET}/14-holy-texts/wlc-tanakh`, ["Gen", "Exod", "Lev", "Num", "Deut"])], ["code-bitcoin", codeView(`${ET}/09-source-code/bitcoin_bitcoin`, 150000)]];
  for (const [name, v] of books) {
    const H = halvesOf({ ...v, id: name });
    for (const w of ["discover", "confirm"]) { const r = evalView(H[w], name); out[`${name}/${w}`] = r; log(`${name}/${w} ${r.tokens}t ${r.units}u cpuObs ${r.cpuObs.toFixed(2)} ${row(r)}`); }
  }
}
function lenworld() {
  const worlds = [lengthWorld({ tag: "lw-rho0" }), lengthWorld({ tag: "lw-rho07", rho: 0.7 }), lengthWorld({ tag: "lw-rho09-long", rho: 0.9, mu: Math.log(16) }),
    ...[4, 8, 16, 32].map((m) => lengthWorld({ tag: `lw-mean${m}`, mu: Math.log(m), sigma: 0.4 })), lengthWorld({ tag: "lw-tok12k", tokens: 12500 }), lengthWorld({ tag: "lw-tok25k", tokens: 25000 }), refrainWorld({ tag: "rw-refrain" })];
  for (const v of worlds) { const r = evalView(v, v.id); out[v.id] = r; log(`${v.id} ${r.tokens}t ${r.units}u meanLen ${(r.tokens / r.units).toFixed(1)} ${row(r)}`); }
}
function size() {
  const v = proseView(`${ET}/01-literature-books/gitenberg/pg345_Dracula.txt`);
  for (const nt of [12500, 25000, 50000, 100000]) { const s = { ...sliceTokens(v, nt), which: "discover" }; const r = evalView(s, `dracula-${nt}`); out[`dracula-${nt}`] = r; log(`dracula-${nt} ${r.tokens}t ${row(r)}`); }
}
function timing() {
  const v = proseView(`${ET}/01-literature-books/gitenberg/pg1400_Great-Expectations.txt`), s = sliceTokens(v, 150000);
  const T = []; for (let i = 0; i < 5; i++) T.push(cpu(() => para.compute(s))[1]);
  const per = para.STATS.length; out.timing = { tokens: tokensOf(s), units: s.units.length, cpuSeconds: T, note: "process.cpuUsage user+system of one compute() call, 5 repeats, single thread" }; log(JSON.stringify(out.timing));
}
await ({ planted, real, real2, lenworld, size, timing })[suite]();
fs.writeFileSync(new URL(`./results-${suite}.json`, import.meta.url), JSON.stringify(out, null, 1));
