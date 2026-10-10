// descriptors.mjs: per-file language descriptors for the company-moderators lens.   node descriptors.mjs dev OUT.json [stem ...]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══
// DISCLOSURE: written after moderators-prereg.txt (sha256 81293b19b4b03a212de3988f09684de56abdd7fb2b030f5ba30155d967142df1). Descriptors: none computed before this run.
//   I have seen all own-language AUCs of the 25 stems (own.json). Nothing about the 28 other stems.
// DATA: UD dev.conllu of the 25 name-company stems (split argument must be "dev" here; test is read only by confirm.mjs, after its own header). No test file is opened by this script.
// TESTS: none. This script computes descriptors; it has no threshold and no verdict. Moderator definitions are the ones in moderators-prereg.txt:
//   M1 FWC32, M2 CHAIN (above); every other number is EXPLORATORY and is labelled so in moderators.mjs.
// BLIND PREDICTIONS: M1 +, M2 +, M3 + (moderators-prereg.txt).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import { UD, readConllu, round, mean, headerSha } from "./util.mjs";

export function describe(file) {
  const S = readConllu(file), cnt = new Map();
  let nTok = 0; for (const s of S) for (const w of s.w) { cnt.set(w, (cnt.get(w) ?? 0) + 1); nTok += 1; }
  const order = [...cnt].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), top = new Set(order.slice(0, 32).map((x) => x[0]));
  let fw = 0, cased = 0, hapaxTypes = 0; for (const s of S) s.w.forEach((w, i) => { if (top.has(w)) fw += 1; if (s.raw[i] !== w) cased += 1; }); for (const [, c] of order) if (c === 1) hapaxTypes += 1;
  // PROPN structure on the punctuation-dropped stream
  const pc = new Map(); let nP = 0, prec = { ADP: 0, DET: 0, ADJ: 0, NOUN: 0, PROPN: 0, none: 0, other: 0 }, foll = { ADP: 0, PROPN: 0, end: 0, other: 0 }, chain = 0, init = 0, flat = 0, hapaxTok = 0, len = 0;
  for (const s of S) s.upos.forEach((u, i) => { if (u !== "PROPN") return; nP += 1; pc.set(s.w[i], (pc.get(s.w[i]) ?? 0) + 1); len += [...s.w[i]].length;
    const l = i > 0 ? s.upos[i - 1] : "none", r = i + 1 < s.upos.length ? s.upos[i + 1] : "end";
    prec[l in prec ? l : "other"] += 1; foll[r in foll ? r : "other"] += 1; if (l === "PROPN" || r === "PROPN") chain += 1; if (i === 0) init += 1; if (/^(flat|compound)/.test(s.dep[i])) flat += 1; });
  let pHapaxTypes = 0; for (const [, c] of pc) if (c === 1) pHapaxTypes += 1; for (const s of S) s.upos.forEach((u, i) => { if (u === "PROPN" && cnt.get(s.w[i]) === 1) hapaxTok += 1; });
  // word order from gold deprel (original ids, so dropped punctuation does not matter)
  const ord = { nsubjBefore: [0, 0], objAfter: [0, 0], caseBefore: [0, 0], amodBefore: [0, 0], detBefore: [0, 0] };
  for (const s of S) s.dep.forEach((d, i) => { const base = d.split(":")[0], hid = s.head[i], before = s.id[i] < hid, tick = (k, v) => { ord[k][1] += 1; if (v) ord[k][0] += 1; };
    if (base === "nsubj") tick("nsubjBefore", before); else if (base === "obj") tick("objAfter", !before); else if (base === "case") tick("caseBefore", before); else if (base === "amod") tick("amodBefore", before); else if (base === "det") tick("detBefore", before); });
  const sh = (a, b) => (b ? round(a / b) : null), o = {};
  for (const [k, [a, b]] of Object.entries(ord)) o[k] = { share: sh(a, b), n: b };
  return { sentences: S.length, tokens: nTok, meanSentLen: round(nTok / S.length, 3), FWC32: round(fw / nTok), TTR: round(cnt.size / nTok), hapaxTypeShare: round(hapaxTypes / cnt.size), casedShare: round(cased / nTok),
    propn: { n: nP, density: round(nP / nTok), precededBy: Object.fromEntries(Object.entries(prec).map(([k, v]) => [k, sh(v, nP)])), followedBy: Object.fromEntries(Object.entries(foll).map(([k, v]) => [k, sh(v, nP)])),
      CHAIN: sh(chain, nP), sentenceInitial: sh(init, nP), flatShare: sh(flat, nP), hapaxTokenRate: sh(hapaxTok, nP), hapaxTypeRate: round(pHapaxTypes / Math.max(1, pc.size)), meanChars: round(len / Math.max(1, nP), 3) }, wordOrder: o };
}
if (process.argv[1] && process.argv[1].endsWith("descriptors.mjs")) {
  const [split, outFile, ...stems] = process.argv.slice(2);
  if (split !== "dev") throw new Error("descriptors.mjs reads dev only; the confirmation script owns test.conllu");
  const list = stems.length ? stems : ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
  const R = { headerSha256: headerSha(import.meta.url), split, languages: {} };
  for (const s of list) { const p = `${UD}/${s}/dev.conllu`; if (!fs.existsSync(p)) continue; R.languages[s] = describe(p); console.error(s, R.languages[s].tokens, R.languages[s].FWC32, R.languages[s].propn.CHAIN); fs.writeFileSync(outFile, JSON.stringify(R, null, 1)); }
  console.log("done", Object.keys(R.languages).length);
}
