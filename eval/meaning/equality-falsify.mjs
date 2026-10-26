// eval/meaning/equality-falsify.mjs — try to BREAK the equation: "two things are equal if the identity on both sides cancels when viewed from the same perspective, to a margin smaller than a DMD".
// Read-only: no production code changes. Three attempts on data we already hold.
//   E2  value-equality is not identity: over the 108 English pairs, how often do a claim figure and a source figure of one measure MEET (the 2% rule and the stated-precision rule) while the pair is labelled a contradiction?
//   E3  transitivity: on the figures of the 32 source pages, how many triples a~b, b~c have a !~ c, under each rule? (an equation is an equivalence; a margin is not)
//   E4  the margin has two sides: how does "meets" move with the margin, and which of the rules is needed to keep every labelled-equal pair?
// Precision is read from the digits the figure was WRITTEN with (the half of its last stated place); no hand constant but the legacy 2% rule being tested.   node eval/meaning/equality-falsify.mjs   (from the workspace root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsOfPage } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const P = await rowsOfFor("eng"), opts = { claimsOf: P.claimsOf, corefModel, lang: "en" };
const SCALE = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
// the figure as written -> { v: its value in value units, half: half of the last stated place, in value units }
function stated(text) {
  const m = /(\d[\d,]*(?:\.\d+)?)\s*(thousand|million|billion|trillion)?/i.exec(String(text ?? "")); if (!m) return null;
  const raw = m[1], scale = m[2] ? SCALE[m[2].toLowerCase()] : 1, dot = raw.indexOf("."), D = raw.replace(/,/g, "");
  const decimals = dot >= 0 ? raw.length - dot - 1 : 0, v = Number(D);
  if (!Number.isFinite(v)) return null;
  const tz = decimals ? 0 : (D.match(/0+$/)?.[0].length ?? 0);
  return { v: v * scale, half: 0.5 * 10 ** (decimals ? -decimals : tz) * scale, written: raw };
}
const figs = (atoms) => atoms.filter((a) => /^has_/.test(a.pred) && a.args?.[1]?.measure).map((a) => {
  const x = a.args[1], s = stated(x.value); if (!s || !x.base) return null;
  const k = x.base / s.v;                                          // value units -> base units (unit conversion; offsets ignored)
  return { measure: x.measure, base: x.base, res: s.half * k, text: x.value, being: a.args[0]?.name ?? "" };
}).filter(Boolean);
const legacy = (a, b) => Math.abs(a.base - b.base) <= 0.02 * Math.max(Math.abs(a.base), Math.abs(b.base), 1e-9);
const precise = (a, b) => Math.abs(a.base - b.base) < a.res + b.res;                 // the two differ by less than what each says it can tell
const T = { pairs: 0, withBothFigures: 0, byLabel: {} }, bump = (l, k) => { (T.byLabel[l] ??= {})[k] = (T.byLabel[l][k] ?? 0) + 1; };
const showL = [], showP = [];
for (const s of ["fresh", "heldout", "relations", "fresh19", "fresh20"]) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, `${s}.json`), "utf8"));
  for (const p of d.pairs ?? d) {
    if ((p.lang ?? "en") !== "en") continue; T.pairs++;
    const rd = async (t) => atomsOfPage(await readDocument(t, { language: "en", lexicon: false, minCharacters: 0, rows: true }), opts).atoms;
    const A = figs(await rd(p.claim)), B = figs(await rd(p.sentence));
    const pairsF = A.flatMap((a) => B.filter((b) => b.measure === a.measure).map((b) => [a, b]));
    if (!pairsF.length) { bump(p.label, "noComparableFigures"); continue; }
    T.withBothFigures++; const L = pairsF.some(([a, b]) => legacy(a, b)), Pr = pairsF.some(([a, b]) => precise(a, b));
    bump(p.label, "figuresCompared"); if (L) bump(p.label, "meet2pct"); if (Pr) bump(p.label, "meetPrecision"); if (L !== Pr) bump(p.label, "rulesDisagree");
    if (p.label === "C" && L && showL.length < 6) showL.push({ id: p.id, claim: p.claim.slice(0, 70), pairs: pairsF.filter(([a, b]) => legacy(a, b)).map(([a, b]) => `${a.text} ~ ${b.text}`).slice(0, 2) });
    if (L !== Pr && showP.length < 6) showP.push({ id: p.id, label: p.label, legacy: L, precise: Pr, pairs: pairsF.map(([a, b]) => `${a.text} ~ ${b.text}`).slice(0, 2) });
  }
}
console.log("E2 value equality vs the pair's label:", JSON.stringify(T, null, 1));
console.log("  contradictions whose figures MEET under the 2% rule (equal value, different fact):"); showL.forEach((x) => console.log("   ", JSON.stringify(x)));
console.log("  pairs where the two rules disagree:"); showP.forEach((x) => console.log("   ", JSON.stringify(x)));
// E3 transitivity over the figures of every source page
const pageOf = new Map(); for (const s of ["fresh19", "fresh20"]) for (const pg of JSON.parse(fs.readFileSync(path.join(HERE, `${s}.sources.json`), "utf8")).pages ?? []) pageOf.set(pg.url, pg);
const tri = { pages: 0, figures: 0, triples: 0, legacyBreaks: 0, preciseBreaks: 0, example: null };
for (const pg of pageOf.values()) {
  if (pg.lang && pg.lang !== "en") continue; tri.pages++;
  const F = figs(atomsOfPage(await readDocument(pg.text, { language: "en", lexicon: false, rows: true }), opts).atoms); tri.figures += F.length;
  const byM = new Map(); for (const f of F) (byM.get(f.measure) ?? byM.set(f.measure, []).get(f.measure)).push(f);
  for (const L of byM.values()) for (let i = 0; i < L.length; i++) for (let j = 0; j < L.length; j++) for (let k = 0; k < L.length; k++) {
    if (i === j || j === k || i === k || i > k) continue; tri.triples++;
    if (legacy(L[i], L[j]) && legacy(L[j], L[k]) && !legacy(L[i], L[k])) tri.legacyBreaks++;
    if (precise(L[i], L[j]) && precise(L[j], L[k]) && !precise(L[i], L[k])) { tri.preciseBreaks++; tri.example ??= [L[i].text, L[j].text, L[k].text]; }
  }
}
console.log("E3 transitivity:", JSON.stringify(tri));
