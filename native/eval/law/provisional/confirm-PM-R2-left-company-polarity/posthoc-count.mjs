// confirm-PM-R2-left-company-polarity/posthoc-count.mjs -- POST HOC (exploratory) robustness run: the SAME registers and data as confirm.mjs, matched pairs re-drawn with a MENTION-COUNT CALIPER. NEW FILE.
//
//   node posthoc-count.mjs --family ud|irc|book|code [--stems a,b] [--tag t]   -> results/ph.<family>[.tag].jsonl ; summary by posthoc-verdict.mjs
//
// ═══ PRE-REGISTRATION OF THE POST HOC RUN (written 2026-10-07 BEFORE this file was first run; AFTER the registered run of confirm.mjs had been read in full) ══════════════════════════════════════
// DISCLOSURE. The registered run (confirm.mjs, header sha256 in results/verdict.json) is done and read: verdict PARTIAL (only code holds). Its VALID-cell definition contained a frequency-control condition
//   (AUC of log2 mention counts between the two members of a pair in [0.45,0.55]) that I added as a TIGHTENING over the scoper; it voided ALL THREE IRC channel sets (AUC of counts 0.38-0.45: names have
//   FEWER mentions than their matched controls inside the same floor(log2 count) bin), 2 of 6 books and 19 of 52 UD windows. So the registered verdict cannot say whether the IRC effect (DLx 0.60-0.66,
//   CI lower > 0.5, shuffle Delta +0.20, sham ~0.5) is real or a count artefact. This script asks exactly that. It cannot change the registered verdict (thresholds are never loosened); it can only change
//   the SCOPE statement that I report next to it, and it is labelled post hoc everywhere.
// TEST. Same data, same classes, same features (features2.DLx), same cell evaluation as confirm.mjs, but pairs are drawn by my own matcher: exact floor(log2 count) bin, unit-index bucket, char-length bucket and
//   unit-length bucket as pairsOf, PLUS the negative is the pool member with the smallest |log2(count_N / count_P)| and must be within CALIPER = 0.15 (equal counts for counts below ~9); pairs without such a
//   negative are dropped; <= 3 pairs per form, <= 600 per cell, seeds under 'pm-r2-posthoc'. VALID cell: pairs >= 60 and position control AND frequency control both in [0.45,0.55] (as registered).
//   The registered criteria P1-P6 are re-evaluated on these cells by posthoc-verdict.mjs, unchanged.
// BLIND PREDICTIONS (post hoc, made after seeing the registered numbers). The count caliper brings the frequency control to 0.47-0.53 in >= 90% of cells (0.95). IRC DLx stays >= 0.55 with CI lower > 0.5
//   in all three channel sets: 0.65 (expected 0.58-0.64; pair counts fall to ~60-150); code unchanged (0.62-0.68); UD median 0.46-0.48, NEG share 25-40%; books median ~0.45; P1 rho 0.20-0.30
//   (fails 0.30 with prob 0.7).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shuffledOf, headerSha, seedFor, rngFor, round, mean, docOf, formCap, pairAuc, pooledAuc, prep, shuffleIn } from "../polarity-map/lib.mjs";
import { features2 } from "../polarity-map/lib2.mjs";
import * as R from "../polarity-map/registers.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HDR = headerSha(fileURLToPath(import.meta.url)), family = opt("--family"), tag = opt("--tag", "");
const OUT = path.join(HERE, "results", `ph.${family}${tag ? "." + tag : ""}.jsonl`), SP = "pm-r2-posthoc", CAL = 0.15;
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR.slice(0, 16), ...o }) + "\n");
const MAN = JSON.parse(fs.readFileSync(path.join(HERE, "data", "manifest.json"), "utf8"));
const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3), fb = (n) => Math.floor(Math.log2(Math.max(1, n))), cb = (w) => { const n = [...w].length; return n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : 3; }, lb = (n) => Math.max(0, Math.min(4, Math.floor(Math.log2(Math.max(2, n))) - 2));
const wr = (x, y) => (x > y ? 1 : x === y ? 0.5 : 0);
const divOf = (a) => { const n = a.length; if (n < 2) return null; const m = new Map(); for (const x of a) m.set(x, (m.get(x) ?? 0) + 1); let c = 0; for (const v of m.values()) c += v * (v - 1); return 1 - c / (n * (n - 1)); };
function flipP(vp, vn, cl, B, rnd) { const sums = new Map(); vp.forEach((x, k) => sums.set(cl[k], (sums.get(cl[k]) ?? 0) + wr(x, vn[k]) - 0.5)); const S = [...sums.values()], obs = Math.abs(S.reduce((a, b) => a + b, 0)); let ge = 0; for (let b = 0; b < B; b++) { let t = 0; for (const x of S) t += rnd() < 0.5 ? x : -x; if (Math.abs(t) >= obs - 1e-12) ge++; } return round((ge + 1) / (B + 1)); }
const rareLedge = (P) => { let n = 0, le = 0; for (const u of P.stream) u.forEach((w, i) => { if ((P.bins.get(w) ?? 11) >= 7) { n++; if (i === 0) le++; } }); return n ? le / n : null; };
/** matched pairs (LATER mentions, FULL eligibility) with a count caliper; returns rows [P, N, P, N, ...] as pairsOf does */
function pairsCal(base, P, gold, def, rnd, maxRows) {
  const dc = docOf(base, def, "FULL", P, gold), seen = new Map(), Pl = [], pool = new Map();
  P.stream.forEach((sent, s) => sent.forEach((w, i) => {
    const k = seen.get(w) ?? 0; seen.set(w, k + 1); if (k === 0) return; const c = dc.cls(s, i); if (!c) return;
    const n = P.count.get(w), o = { s, i, w, n, ln: Math.log2(n), key: [fb(n), ib(i), cb(w), lb(sent.length)].join("|") };
    if (c === "P") Pl.push(o); else (pool.get(o.key) ?? pool.set(o.key, []).get(o.key)).push(o);
  }));
  for (const a of pool.values()) shuffleIn(a, rnd);
  const rows = []; let dropped = 0;
  for (const p of shuffleIn(Pl, rnd)) {
    if (rows.length >= maxRows) break; const a = pool.get(p.key); let best = -1, bd = Infinity;
    if (a) for (let j = 0; j < a.length; j++) { const d = Math.abs(a[j].ln - p.ln); if (d < bd) { bd = d; best = j; if (d === 0) break; } }
    if (best < 0 || bd > CAL) { dropped++; continue; }
    const q = a.splice(best, 1)[0];
    for (const [o, y] of [[p, 1], [q, 0]]) rows.push({ y, s: o.s, i: o.i, w: o.w, doc: base.name });
  }
  return { rows, dropped };
}
function evalRows(rows, rnd, B) {
  const n = rows.length / 2; if (!n) return { pairs: 0 };
  const F = rows.map((r) => features2(r.P, r.s, r.i, "FULL", rnd));
  const pos = rows.filter((_, k) => k % 2 === 0), neg = rows.filter((_, k) => k % 2 === 1), cl = pos.map((r) => `${r.doc}|${r.w}`), y = rows.map((r) => r.y), half = (x) => [x.filter((_, k) => k % 2 === 0), x.filter((_, k) => k % 2 === 1)];
  const cell = { pairs: n, nPosForms: new Set(cl).size, ctrl: {} }, x = F.map((o) => o.DLx), [vp, vn] = half(x), a = pairAuc(vp, vn, cl, B, rnd);
  cell.DLx = { auc: a.auc, lo: a.lo, hi: a.hi, nClusters: a.nClusters, pooled: round(pooledAuc(x, y)), meanP: round(mean(vp)), meanN: round(mean(vn)), pPerm: flipP(vp, vn, cl, 2000, rnd) };
  const ctl = { pos: (r) => ib(r.i), logn: (r) => Math.log2(r.P.occ.get(r.w).length / 2), len: (r) => [...r.w].length, slen: (r) => r.P.stream[r.s].length };
  for (const [nm, g] of Object.entries(ctl)) cell.ctrl[nm] = round(pairAuc(pos.map(g), neg.map(g), cl, 0, rnd).auc);
  cell.posControlOk = cell.ctrl.pos >= 0.45 && cell.ctrl.pos <= 0.55; cell.freqControlOk = cell.ctrl.logn >= 0.45 && cell.ctrl.logn <= 0.55;
  return cell;
}
function runCell(bases, def, ctag, { get = (b) => ({ P: b.P, gold: b.gold }), B = 500, maxPairs = 600 } = {}) {
  const rows = [], per = Math.ceil(maxPairs / bases.length); let dropped = 0;
  for (const b of bases) { const { P, gold } = get(b), pr = pairsCal(b, P, gold, def, rngFor(seedFor(SP, ctag, b.name, "pairs")), Math.max(3000, per * 5) * 2); dropped += pr.dropped; for (const x of formCap(pr.rows, 3, per)) { x.P = P; rows.push(x); } }
  return { ...evalRows(rows, rngFor(seedFor(SP, "eval", ctag, bases[0].name)), B), dropped };
}
function doRegister(reg, fam, bases, def) {
  const t0 = Date.now(), cache = new Map(), shufGet = (b) => { let x = cache.get(b.name); if (!x) cache.set(b.name, (x = shuffledOf(b, seedFor(SP, "shuf", b.name)))); return x; };
  const rl = round(mean(bases.map((b) => rareLedge(b.P)).filter((x) => x !== null)));
  emit({ reg, fam, ctl: "props", rareL_edge: rl });
  emit({ reg, fam, ctl: "real", rareL_edge: rl, ...runCell(bases, def, `real:${reg}`) });
  emit({ reg, fam, ctl: "shuf", ...runCell(bases, def, `shuf:${reg}`, { get: shufGet }) });
  console.error(`${reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
function udBaseTrain(tb, file) { // identical window to confirm.mjs (same seed, same rule)
  const { sents, upos } = R.readConllu(file), rnd = rngFor(seedFor("pm-r2-confirm", tb, "window")), N = sents.length, a = Math.floor(rnd() * N);
  let tok = 0, b = a; const S = [], U = []; while (tok < MAN.ud.windowTokens && S.length < N) { S.push(sents[b]); U.push(upos[b]); tok += sents[b].length; b = (b + 1) % N; }
  return { name: `ud-${tb}-trainwin`, kind: "ud", P: prep(S), gold: U };
}
async function main() {
  if (family === "ud") { const tbs = opt("--stems") ? opt("--stems").split(",") : Object.keys(MAN.ud.files); for (const tb of tbs) doRegister(`ud-${tb}`, "ud", [udBaseTrain(tb, MAN.ud.files[tb])], R.UD_DEFS.PO); }
  else if (family === "irc") { const cand = (x) => ({ id: x.id, path: path.join(R.IRC_ROOT, x.id) }), by = MAN.irc.T3_lensByChannel; for (const ch of Object.keys(by).sort()) doRegister(`irc-${ch}`, "irc", [R.ircBase(`irc-${ch}`, by[ch].map(cand))], R.IRC_DEFS.NK); const all = Object.values(by).flat(); doRegister("irc-pooled37", "irc-pooled", [R.ircBase("irc-pooled37", all.map(cand))], R.IRC_DEFS.NK); }
  else if (family === "book") { for (const b of MAN.books.picked) doRegister(b.name, "book", [R.bookBase(b.name, R.loadText(b.file))], R.BOOK_DEFS.NAMES); }
  else if (family === "code") { const dir = path.join(HERE, "data", "lex"); for (const lg of ["js", "py", "rb"]) doRegister(`code-${lg}`, "code", Array.from({ length: MAN.code[lg].length }, (_, i) => R.codeBase(lg, i, dir)), R.CODE_DEFS.PE); }
  else throw new Error("--family ud|irc|book|code");
}
await main();
