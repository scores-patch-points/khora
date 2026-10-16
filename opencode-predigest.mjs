// opencode-predigest.mjs — PROTOTYPE: predigest an agent's prose turn into weft-lean records (INS beings, CON relations, EVA negation)
// using RECEIVED priors only (no model, no hand lists): the engineering-register prior and everyday vocabulary derived from Zenodotus,
// the received POS prior (janus/priors/pos-eng.json) and the received English closed classes (adapters/text/priors.js).
//   BEING   identifier-shaped | a declared name in the session's code | register-technical (keyness) | an open-class word the everyday
//           vocabulary and the POS prior do not know (a coinage). Closed classes and everyday words are never beings.
//   CON     being -> (verb after it, lemma by the POS prior) -> the last token of the phrase that follows, at a byte; EVA only where negated.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NEGATION_WORDS } from "./native/adapters/text/priors.js";
import { pack } from "./native/the-fold/weft-lean.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENG = process.env.FOLD_ENG_PRIOR_DIR ?? path.resolve(HERE, "..", "Zenodotus", "derived-priors", "engineering-priors");
const POS_FILE = process.env.FOLD_POS_PRIOR ?? path.resolve(HERE, "..", "janus", "priors", "pos-eng.json");
let _reg = null;
export function loadRegister() {
  if (_reg) return _reg;
  const j = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
  const eng = j(path.join(ENG, "engineering-register-prior-v1.json")), ev = j(path.join(ENG, "engineering-everyday-vocabulary-v1.json")), pos = j(POS_FILE);
  _reg = {
    gap: !eng || !ev || !pos ? { eng: !!eng, everyday: !!ev, pos: !!pos } : null,
    tech: new Set(eng?.technicalVocabulary ?? []), acts: new Map((eng?.acts ?? []).map((a) => [a.verb, a])),
    everyday: new Set(ev?.words ?? []), forms: pos?.forms ?? {},
  };
  return _reg;
}
const AUX = (reg, w) => { const f = reg.forms[w]; if (!f) return false; const t = Object.values(f).reduce((a, b) => a + b, 0); return t > 0 && ((f.AUX ?? 0) + (f.DET ?? 0) + (f.ADP ?? 0) + (f.CCONJ ?? 0) + (f.SCONJ ?? 0) + (f.PRON ?? 0)) / t >= 0.5; };
const verbShare = (reg, w) => { const f = reg.forms[w]; if (!f) return null; const t = Object.values(f).reduce((a, b) => a + b, 0); return t ? (f.VERB ?? 0) / t : null; };
export function lemmaOf(reg, w) {
  const c = [...new Set([w, w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""), w.replace(/ed$/, ""), w.replace(/ed$/, "e"), w.replace(/ing$/, ""), w.replace(/ing$/, "e")])].filter((x) => x.length >= 3).sort((a, b) => a.length - b.length);
  for (const x of c) { const v = verbShare(reg, x); if (v !== null && v >= 0.5) return x; }
  return null;
}
const identShaped = (t) => /_/.test(t) || /[a-z][A-Z]/.test(t) || /\(\)$/.test(t);
const TOK = /[A-Za-z_][A-Za-z0-9_']*(?:\(\))?/g;
const negated = (w) => NEGATION_WORDS.has(w) || /n't$/.test(w);

export function isBeing(reg, tok, declared = new Set()) {
  const l = tok.toLowerCase().replace(/\(\)$/, "");
  if (l.length < 4 || negated(l)) return false;
  if (identShaped(tok) || declared.has(l)) return true;
  if (reg.tech.has(l)) return true;
  if (!reg.everyday.has(l) && !reg.forms[l] && /^[a-z][a-z0-9_]+$/.test(l) && l.length >= 5) return true; // a coinage
  return false;
}

/** text -> { ins:[[surface,at]], con:[[e1,label,e2,at,neg]] } ; `at` is a character offset into the turn */
export function predigest(text, { declared = new Set(), level = 2 } = {}) {
  const reg = loadRegister(); const s = String(text ?? "");
  const ins = new Map(), con = [];
  const sentStarts = [0]; for (const m of s.matchAll(/[.!?]\s+/g)) sentStarts.push(m.index + m[0].length);
  const sentOf = (i) => { let k = 0; while (k + 1 < sentStarts.length && sentStarts[k + 1] <= i) k++; return k; };
  const toks = [...s.matchAll(TOK)].map((m) => ({ t: m[0], l: m[0].toLowerCase().replace(/\(\)$/, ""), at: m.index, sent: sentOf(m.index) }));
  toks.forEach((k) => { k.being = isBeing(reg, k.t, declared); if (k.being && !ins.has(k.l)) ins.set(k.l, k.at); });
  if (level >= 2) toks.forEach((k, i) => {
    if (!k.being) return;
    let neg = false, act = null, j = i + 1;
    for (; j < toks.length && toks[j].sent === k.sent && j - i <= 5; j++) {
      const w = toks[j];
      if (negated(w.l)) { neg = true; continue; }
      if (AUX(reg, w.l)) continue;
      const lem = w.being ? null : lemmaOf(reg, w.l);
      if (lem) { act = { lem, j }; break; }
      if (w.being) break;
    }
    if (!act) return;
    let obj = null; const phrase = [];
    for (let q = act.j + 1; q < toks.length && toks[q].sent === k.sent && q - act.j <= 3; q++) { if (AUX(reg, toks[q].l) && !phrase.length) continue; phrase.push(toks[q]); }
    if (phrase.length) obj = phrase[phrase.length - 1];
    if (obj) con.push([k.l, act.lem, obj.l, k.at, neg]);
  });
  return { ins: [...ins], con };
}

/** the lean passes of a session (WeftLean@1 shape) for byte accounting and the weft store */
export function leanPasses(digests) {
  return digests.map((d) => ({ a: `turn-${d.n}`, l: null, g: "en", w: 0, ws: null, s: d.n, ins: d.ins.map(([s]) => s), seg: [], con: d.con.map(([e1, lab, e2, at]) => [e1, lab, e2, at, 0, 0, ""]), eva: d.con.flatMap(([, , , , neg], i) => (neg ? [["con", i]] : [])) }));
}
export const packedBytes = (digests) => pack(leanPasses(digests)).length;
