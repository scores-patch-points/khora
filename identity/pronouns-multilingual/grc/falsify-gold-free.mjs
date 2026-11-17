// falsify-gold-free.mjs <nt-test|nt-dev|hdt> — PREREG-GRC.md P6. Gold-free falsifier: a referent bound to both a masculine and a feminine CLEAN pronoun has at least one wrong binding.
// lower-bound error rate = sum over referents of min(masc bindings, fem bindings) / gendered bindings; NULL = the same bindings' referents permuted (200 draws). A book with fewer than 20 gendered bindings is "too thin".
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const W = path.resolve(HERE, "../../..");
const { parseProiel, ntBookOf, hdtBookOf } = await import("./lib-proiel-gold.mjs"); const { TEST, DEV } = await import("./splits.mjs");
const { readToWeft } = await import(W + "/native/the-fold/read-process.mjs"); const { defaultPronounPresence } = await import(W + "/native/adapters/text/pronoun-presence-chosen.js"); const { normalizePronounClass } = await import(W + "/native/adapters/text/pronouns.js");
const set = process.argv[2]; const J = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8"));
const ARMS = { REGFOLD: { reg: J("register-holdout.json"), dec: { prior: J("declension-holdout.json") } }, FULL: { reg: J("register-full.json"), dec: { prior: J("declension-full.json") } } };
const D = "/Users/mlacy/Documents/khora-cast/khora/identity/pronouns-multilingual/data/proiel-xml/";
const books = set === "hdt" ? parseProiel(D + "hdt.xml", { bookOf: hdtBookOf }) : parseProiel(D + "greek-nt.xml", { bookOf: ntBookOf }).filter((b) => (set === "nt-test" ? TEST : DEV).includes(b.code));
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rnd = mulberry(20261118);
const lower = (refs, gens) => { const c = new Map(); refs.forEach((r, i) => { if (!c.has(r)) c.set(r, [0, 0]); c.get(r)[gens[i]]++; }); let n = 0; for (const [, [m, f]] of c) n += Math.min(m, f); return n; };
// PREREG: a book that takes over 5 minutes is cut to its first 60000 characters at a sentence end. HDT1 (168K) did not finish in 9 minutes, so every Herodotus chunk is cut the same way (DEVIATIONS D4).
const CAP = set === "hdt" ? 60000 : Infinity; for (const bk of books) if (bk.text.length > CAP) { const cut = bk.text.slice(0, CAP); const e = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("· "), cut.lastIndexOf("; ")); bk.text = cut.slice(0, e + 1); }
const out = { set, cap: CAP === Infinity ? null : CAP, arms: {} };
for (const [arm, { reg, dec }] of Object.entries(ARMS)) {
  const cls = normalizePronounClass(reg); const rows = [];
  for (const bk of books) {
    if (bk.text.length < 200) { rows.push({ code: bk.code, skipped: "too_short" }); continue; }
    const t0 = Date.now(); const w = readToWeft(bk.text, { language: "grc", address: set + ":" + bk.code, declension: dec, readerOptions: { pronounPresence: { ...defaultPronounPresence(), language: "grc", pronounClass: reg, unspaced: false } } });
    if (w.error || w.skipped) { rows.push({ code: bk.code, skipped: w.error ?? w.skipped }); continue; }
    const bs = (w.pronounsPresence ?? []).map((b) => ({ ref: b.ref, rec: cls.get(String(b.pronoun).toLowerCase()) })).filter((b) => b.rec && b.rec.clean && (b.rec.gender === "m" || b.rec.gender === "f"));
    const refs = bs.map((b) => b.ref), gens = bs.map((b) => +(b.rec.gender === "f")); const nF = gens.reduce((a, b) => a + b, 0);
    const obs = lower(refs, gens); let nul = 0; const Dn = 200; for (let d = 0; d < Dn; d++) { const sh = [...refs]; for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } nul += lower(sh, gens); } nul /= Dn;
    rows.push({ code: bk.code, chars: bk.text.length, allBindings: (w.pronounsPresence ?? []).length, gendered: bs.length, fem: nF, refs: new Set(refs).size, obs, nul, thin: bs.length < 20, ms: Date.now() - t0 });
    console.error(set, arm, bk.code, `gendered ${bs.length} fem ${nF} obs ${obs} null ${nul.toFixed(1)}`);
  }
  const ok = rows.filter((r) => r.gendered >= 20); const sObs = ok.reduce((s, r) => s + r.obs, 0), sNul = ok.reduce((s, r) => s + r.nul, 0), sN = ok.reduce((s, r) => s + r.gendered, 0);
  const ds = []; for (let k = 0; k < 10000; k++) { let a = 0, b = 0; for (let i = 0; i < ok.length; i++) { const r = ok[Math.floor(rnd() * ok.length)]; a += r.nul - r.obs; b += r.gendered; } ds.push(a / Math.max(1, b)); } ds.sort((a, b) => a - b);
  const allG = rows.reduce((s, r) => s + (r.gendered ?? 0), 0), allF = rows.reduce((s, r) => s + (r.fem ?? 0), 0);
  out.arms[arm] = { rows, pooled: { booksUsed: ok.length, booksThin: rows.filter((r) => r.thin).length, gendered: sN, obsRate: sN ? sObs / sN : null, nullRate: sN ? sNul / sN : null, nullMinusObsCI95: ok.length ? [ds[250], ds[9749]] : null, booksObsBelowNull: ok.filter((r) => r.obs < r.nul).length, allGendered: allG, allFem: allF } };
  console.log(set, arm, JSON.stringify(out.arms[arm].pooled));
}
fs.writeFileSync(path.join(HERE, "results", `falsify-${set}.json`), JSON.stringify(out));
