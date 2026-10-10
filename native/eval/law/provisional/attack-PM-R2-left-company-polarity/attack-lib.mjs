// attack-PM-R2-left-company-polarity/attack-lib.mjs -- shared helpers of the attack on PM-R2 (NEW FILE; imports existing modules, edits none).
// Never pass "run" as the first CLI argument of a script importing this (name-company.mjs starts main() on argv[2]==="run").
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { prep, rngFor, seedFor, round, mean, quantile, shuffleIn, docOf, formCap, pairsOf, pairAuc, pooledAuc } from "../polarity-map/lib.mjs";
import { features2 } from "../polarity-map/lib2.mjs";
import * as R from "../polarity-map/registers.mjs";
export { prep, rngFor, seedFor, round, mean, quantile, shuffleIn, docOf, formCap, pairsOf, pairAuc, pooledAuc, features2, R };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONF = path.join(HERE, "..", "confirm-PM-R2-left-company-polarity");
export const MAN = JSON.parse(fs.readFileSync(path.join(CONF, "data", "manifest.json"), "utf8"));
export const SPC = "pm-r2-confirm"; // the confirmer's seed prefix (used only to REPRODUCE its rows)
export const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
export const cb = (w) => { const n = [...w].length; return n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : 3; };
export const lb = (n) => Math.max(0, Math.min(4, Math.floor(Math.log2(Math.max(2, n))) - 2));
export const fb = (n) => Math.floor(Math.log2(Math.max(1, n)));
export const wr = (x, y) => (x > y ? 1 : x === y ? 0.5 : 0);
export const headerSha = (file) => createHash("sha256").update(fs.readFileSync(file, "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
export const divOf = (a) => { const n = a.length; if (n < 2) return null; const m = new Map(); for (const x of a) m.set(x, (m.get(x) ?? 0) + 1); let c = 0; for (const v of m.values()) c += v * (v - 1); return 1 - c / (n * (n - 1)); };
export const rareLedge = (P) => { let n = 0, le = 0; for (const u of P.stream) u.forEach((w, i) => { if ((P.bins.get(w) ?? 11) >= 7) { n++; if (i === 0) le++; } }); return n ? le / n : null; };

// ── registers (the confirmer's own data, re-read from its manifest) ───────────────────────────────────────────────────────────────
function udWindow(tb, file, which) {
  const { sents, upos } = R.readConllu(file), N = sents.length, rnd = rngFor(seedFor(SPC, tb, "window")), a = Math.floor(rnd() * N), W = MAN.ud.windowTokens;
  const take = (start, maxSent, need) => { let tok = 0, b = start; const S = [], U = []; while (tok < need && S.length < maxSent) { S.push(sents[b % N]); U.push(upos[b % N]); tok += sents[b % N].length; b++; } return { S, U, tok }; };
  const w1 = take(a, N, W);
  if (which === 1) return { name: `ud-${tb}-w1`, kind: "ud", P: prep(w1.S), gold: w1.U, window: { start: a, sentences: w1.S.length, tokens: w1.tok } };
  const start2 = a + w1.S.length + 100, avail = N - w1.S.length - 200; if (avail <= 0) return null;
  const w2 = take(start2, avail, W); if (w2.tok < 30000) return null; // disjoint from w1 (>= 100 sentences gap on both sides), >= 30k tokens
  return { name: `ud-${tb}-w2`, kind: "ud", P: prep(w2.S), gold: w2.U, window: { start: start2 % N, sentences: w2.S.length, tokens: w2.tok } };
}
/** list of register specs {reg, fam, def, bases()} for a family; bases() loads lazily */
export function specs(family, opts = {}) {
  const out = [];
  if (family === "ud") for (const tb of (opts.stems ?? Object.keys(MAN.ud.files))) out.push({ reg: `ud-${tb}`, fam: "ud", def: opts.def ?? R.UD_DEFS.PO, bases: () => { const b = udWindow(tb, MAN.ud.files[tb], opts.window ?? 1); return b ? [b] : null; } });
  else if (family === "irc") {
    const by = MAN.irc.T3_lensByChannel, cand = (x) => ({ id: x.id, path: path.join(R.IRC_ROOT, x.id) });
    for (const ch of Object.keys(by).sort()) out.push({ reg: `irc-${ch}`, fam: "irc", def: R.IRC_DEFS.NK, bases: () => [R.ircBase(`irc-${ch}`, (opts.days ? by[ch].filter((x) => opts.days.has(x.id)) : by[ch]).map(cand))] });
    const all = Object.values(by).flat(); out.push({ reg: "irc-pooled37", fam: "irc-pooled", def: R.IRC_DEFS.NK, bases: () => [R.ircBase("irc-pooled37", (opts.days ? all.filter((x) => opts.days.has(x.id)) : all).map(cand))] });
  } else if (family === "book") for (const b of MAN.books.picked) out.push({ reg: b.name, fam: "book", def: R.BOOK_DEFS.NAMES, bases: () => [R.bookBase(b.name, R.loadText(b.file))] });
  else if (family === "code") for (const lg of ["js", "py", "rb"]) out.push({ reg: `code-${lg}`, fam: "code", def: R.CODE_DEFS.PE, bases: () => Array.from({ length: MAN.code[lg].length }, (_, i) => R.codeBase(lg, i, path.join(CONF, "data", "lex"))) });
  else throw new Error("family");
  return out;
}
/** REPRODUCE the confirmer's pair rows of a register exactly (same seeds as confirm.mjs runCell, ctag real:<reg>) */
export function confirmRows(spec, bases) {
  const rows = [], per = Math.ceil(600 / bases.length);
  for (const b of bases) {
    const r = rngFor(seedFor(SPC, `real:${spec.reg}`, b.name, "pairs")), pr = pairsOf(docOf(b, spec.def, "FULL", b.P, b.gold), "LATER", r, Math.max(3000, per * 5));
    for (const x of formCap(pr.rows, 3, per)) { x.P = b.P; x.doc = b.name; rows.push(x); }
  }
  return { rows, evalRnd: rngFor(seedFor(SPC, "eval", `real:${spec.reg}`, bases[0].name)) };
}
