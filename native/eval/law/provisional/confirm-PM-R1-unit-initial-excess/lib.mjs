// confirm-PM-R1-unit-initial-excess/lib.mjs -- OWN implementation (independent of polarity-map/lib*.mjs) of the pInitX statistic, matched-pair evaluation, shuffle and sham controls, and the loaders.
// Imports only EXISTING modules (name-company.mjs pairsOf, impact.mjs rng, name-war-and-peace.mjs labelBook, ant-code lib npView, adapters/text/spans.js). New file; edits nothing.
import fs from "node:fs"; import path from "node:path"; import { createHash } from "node:crypto";
process.env.NAME_COMPANY_PAIRBLOCK = "1"; // both members of a matched pair share a block (see NAME-COMPANY-RESULTS.md); must be set BEFORE the dynamic import below
const NC = await import("../../name-company.mjs"), IM = await import("../../impact.mjs"), WP = await import("../../name-war-and-peace.mjs"), AC = await import("../../../kinds-swarm/ant-code/lib.mjs"), SP = await import("../../../../adapters/text/spans.js");
export const pairsOf = NC.pairsOf, rngFor = IM.rngFor, seedFor = IM.seedFor, labelBook = WP.labelBook, npView = AC.npView, splitSentences = SP.splitSentences;
export const PRE = "pm-r1-confirm";
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
export const shuffleIn = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
/** sha256 of a script's text up to (not including) its END OF PRE-REGISTRATION marker */
export const headerSha = (file) => sha256(fs.readFileSync(file, "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]);
const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);

// ── stream preparation: occurrence lists and k = number of earlier mentions of the same form ──────────────────────────────────────────
export function prep(stream) {
  const occ = new Map(), kArr = stream.map((u) => new Int32Array(u.length));
  stream.forEach((u, s) => u.forEach((w, i) => { let a = occ.get(w); if (!a) occ.set(w, (a = [])); kArr[s][i] = a.length / 2; a.push(s, i); }));
  return { stream, occ, kArr };
}
/** THE STATISTIC. Mentions of the form at (s,i): FULL = all (current included); CAUSAL4 = the 4 immediately before (prefix only); LOO = all but the current one.
 *  pInit = share at unit index 0; invLen = mean 1/len(unit of the mention) = the share expected if the index were uniform in the unit; pInitX = pInit - invLen (unit-initial EXCESS).
 *  pFinalX likewise for the last index (units of length >= 2 contribute their last index; a length-1 unit is both initial and final and counts as initial only). */
export function featuresOf(P, s, i, mode) {
  const w = P.stream[s][i], o = P.occ.get(w), k = P.kArr[s][i], js = [];
  const n = o.length / 2;
  if (mode === "FULL") for (let j = 0; j < n; j++) js.push(j); else if (mode === "LOO") { for (let j = 0; j < n; j++) if (j !== k) js.push(j); } else for (let j = k - 4; j < k; j++) js.push(j);
  let init = 0, fin = 0, inv = 0;
  for (const j of js) { const a = o[2 * j], b = o[2 * j + 1], len = P.stream[a].length; if (b === 0) init++; if (b === len - 1) fin++; inv += 1 / len; }
  const m = js.length;
  return { pInitX: (init - inv) / m, pInit: init / m, invLen: inv / m, pFinalX: (fin - inv) / m, nMent: m };
}
export const FEATS = ["pInitX", "pInit", "invLen", "pFinalX"];

// ── matched pairs ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function formCap(rows, cap, maxPairs) { // <= cap pairs per positive form and per negative form; <= maxPairs pairs
  const cp = new Map(), cn = new Map(), out = [];
  for (let k = 0; k < rows.length / 2 && out.length / 2 < maxPairs; k++) { const p = rows[2 * k], q = rows[2 * k + 1], a = cp.get(p.w) ?? 0, b = cn.get(q.w) ?? 0; if (a >= cap || b >= cap) continue; cp.set(p.w, a + 1); cn.set(q.w, b + 1); out.push(p, q); }
  return out;
}
const wr = (x, y) => (x > y ? 1 : x === y ? 0.5 : 0);
/** matched-pair win rate (= AUC on matched pairs) with a cluster bootstrap (clusters = positive form) and a cluster sign-flip permutation p (one-sided, AUC > 0.5) */
export function pairAuc(vp, vn, clusters, B, rnd, Bperm = 0) {
  const n = vp.length; if (!n) return null;
  const d = vp.map((x, k) => wr(x, vn[k])), est = mean(d), cid = new Map();
  clusters.forEach((c, k) => { let a = cid.get(c); if (!a) cid.set(c, (a = [0, 0])); a[0] += d[k]; a[1] += 1; });
  const cs = [...cid.values()], bs = [];
  for (let b = 0; b < B; b++) { let s = 0, m = 0; for (let t = 0; t < cs.length; t++) { const c = cs[Math.floor(rnd() * cs.length)]; s += c[0]; m += c[1]; } bs.push(s / m); }
  const out = { auc: round(est), lo: B ? round(quantile(bs, 0.025)) : null, hi: B ? round(quantile(bs, 0.975)) : null, nClusters: cs.length };
  if (Bperm) { let ge = 0; for (let b = 0; b < Bperm; b++) { let s = 0, m = 0; for (const c of cs) { m += c[1]; s += rnd() < 0.5 ? c[0] : c[1] - c[0]; } if (s / m >= est - 1e-12) ge++; } out.p = round((ge + 1) / (Bperm + 1)); }
  return out;
}
const eligible = (P, s, i, mode) => (mode === "LOO" || mode === "FULL" ? P.occ.get(P.stream[s][i]).length >= 6 : P.kArr[s][i] >= 4);
/** One cell: pool matched LATER pairs over bases (each {name, P, gold}); def(gold, form) -> "P"|"N"|null. Features by mode. opts.get(base) -> {P, gold} lets controls swap in shuffled streams. */
export function runCell(bases, def, mode, tag, { B = 400, Bperm = 1000, maxPairs = 600, get = (b) => ({ P: b.P, gold: b.gold }) } = {}) {
  const rows = [], per = Math.ceil(maxPairs / bases.length), meta = { dropped: 0 };
  for (const b of bases) {
    const { P, gold } = get(b), r = rngFor(seedFor(PRE, tag, b.name, mode));
    const doc = { name: b.name, stream: P.stream, block: () => 0, cls: (s, i) => { const w = P.stream[s][i], g = def(gold[s][i], w); if (!g) return null; return eligible(P, s, i, mode) ? g : null; } };
    const pr = pairsOf(doc, "LATER", r, Math.max(3000, per * 5)); meta.dropped += pr.dropped;
    for (const x of formCap(pr.rows, 3, per)) { x.P = P; rows.push(x); }
  }
  const n = rows.length / 2; if (!n) return { pairs: 0, ...meta };
  const FM = rows.map((r) => featuresOf(r.P, r.s, r.i, mode)), pos = rows.filter((_, k) => k % 2 === 0), cl = pos.map((r) => `${r.doc}|${r.w}`);
  const rnd = rngFor(seedFor(PRE, "boot", tag, bases[0].name, mode)), cell = { pairs: n, posForms: new Set(cl).size, feats: {}, ctrl: {}, strata: {}, ...meta };
  for (const f of FEATS) { const x = FM.map((o) => o[f]), vp = x.filter((_, k) => k % 2 === 0), vn = x.filter((_, k) => k % 2 === 1); cell.feats[f] = { ...pairAuc(vp, vn, cl, f === "pInitX" ? B : 0, rnd, f === "pInitX" ? Bperm : 0), mean: round(mean(vp)), meanNeg: round(mean(vn)) }; }
  const g = { pos: (r) => ib(r.i), logn: (r) => Math.log2(r.P.occ.get(r.w).length / 2), len: (r) => [...r.w].length, slen: (r) => r.P.stream[r.s].length };
  const neg = rows.filter((_, k) => k % 2 === 1);
  for (const [nm, fn] of Object.entries(g)) cell.ctrl[nm] = round(pairAuc(pos.map(fn), neg.map(fn), cl, 0, rnd).auc);
  cell.posControlOk = cell.ctrl.pos >= 0.45 && cell.ctrl.pos <= 0.55;
  cell.strictOk = cell.posControlOk && ["logn", "len", "slen"].every((k) => cell.ctrl[k] >= 0.45 && cell.ctrl[k] <= 0.55);
  const xs = FM.map((o) => o.pInitX), strat = (name, pred) => { const idx = pos.map((r, k) => k).filter((k) => pred(pos[k], k)); if (idx.length >= 20) cell.strata[name] = { pairs: idx.length, auc: round(mean(idx.map((k) => wr(xs[2 * k], xs[2 * k + 1])))) }; };
  strat("evalInitial", (r) => r.i === 0); strat("evalNonInitial", (r) => r.i > 0); strat("nMent3-5", (r, k) => FM[2 * k].nMent <= 5); strat("nMent6-15", (r, k) => FM[2 * k].nMent >= 6 && FM[2 * k].nMent <= 15); strat("nMent16+", (r, k) => FM[2 * k].nMent >= 16);
  return cell;
}
/** within-unit shuffle (unit lengths kept; the gold of a token moves with it) */
export function shuffledOf(base, seed) { const rnd = rngFor(seed), st = [], gd = []; base.P.stream.forEach((u, s) => { const idx = shuffleIn(u.map((_, i) => i), rnd); st.push(idx.map((j) => u[j])); gd.push(idx.map((j) => base.gold[s][j])); }); return { P: prep(st), gold: gd }; }
/** sham class: form-hash parity splits the NEGATIVES of a classdef into pseudo-P / pseudo-N and drops the true positives (a pipeline-bias control built to read 0.5) */
const fnv = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
export const shamOf = (def, tag) => (g, w) => (def(g, w) === "N" ? ((fnv(tag + w) & 1) === 0 ? "P" : "N") : null);

// ── loaders (own copies; gold is attached per token and used ONLY to select/evaluate) ───────────────────────────────────────────────────────
/** UD: lowercase NFC word units, PUNCT dropped, multiword ranges/empty nodes skipped. {start, budget}: a contiguous window of sentences starting at sentence index `start` and growing to >= budget word units. */
export function readConllu(file, win = null) {
  const sents = [], upos = []; let cur = [], cu = [];
  const flush = () => { if (cur.length) { sents.push(cur); upos.push(cu); } cur = []; cu = []; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) { if (!line) { flush(); continue; } if (line[0] === "#") continue; const f = line.split("\t"); if (f.length < 10 || !/^\d+$/.test(f[0])) continue; if (f[3] === "PUNCT") continue; cur.push(f[1].normalize("NFC").toLowerCase()); cu.push(f[3]); }
  flush();
  if (!win) return { sents, upos, total: sents.length };
  const tot = sents.reduce((a, s) => a + s.length, 0); if (tot <= win.budget) return { sents, upos, total: sents.length, window: [0, sents.length, tot] };
  // choose a start (uniform over sentence indices that still leave >= budget units after them)
  const suffix = new Array(sents.length + 1).fill(0); for (let s = sents.length - 1; s >= 0; s--) suffix[s] = suffix[s + 1] + sents[s].length;
  const ok = []; for (let s = 0; s < sents.length; s++) if (suffix[s] >= win.budget) ok.push(s);
  const a = ok[Math.floor(win.rnd() * ok.length)]; let b = a, c = 0; while (b < sents.length && c < win.budget) { c += sents[b].length; b++; }
  return { sents: sents.slice(a, b), upos: upos.slice(a, b), total: sents.length, window: [a, b, c] };
}
export const UD_DEFS = { PN: (g) => (g === "PROPN" ? "P" : g === "NOUN" ? "N" : null), PO: (g) => (g === "PROPN" ? "P" : g === "NOUN" || g === "VERB" || g === "ADJ" ? "N" : null) };
export function udBase(name, file, win) { const r = readConllu(file, win); return { name, P: prep(r.sents), gold: r.upos, window: r.window, nSent: r.sents.length, nTok: r.sents.reduce((a, s) => a + s.length, 0) }; }
// IRC: lines "<nick> text". Token = letters/digits/apostrophes, numerals dropped, lowercase NFC. Gold per token: "P" = body token equal to the form of a nick that spoke >= 3 messages that day (form length >= 3, not the speaker,
// not a topic word whose share of the day's body tokens is >= 1/300); "N" = a token of >= 3 characters that is not a nick form; else null. The speaker field is METADATA and never a feature.
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
const toks = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
export function ircBase(name, files) {
  const stream = [], gold = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean), spoke = new Map();
    for (const [, n] of lines) spoke.set(n, (spoke.get(n) ?? 0) + 1);
    const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase(), nicks = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
    const msgs = lines.map(([, n, t]) => ({ n: form(n), t: toks(t) })).filter((m) => m.t.length >= 1), tot = new Map(); let all = 0;
    for (const m of msgs) for (const w of m.t) { tot.set(w, (tot.get(w) ?? 0) + 1); all++; }
    const topic = new Set([...nicks].filter((n) => (tot.get(n) ?? 0) / all >= 1 / 300));
    for (const m of msgs) { stream.push(m.t); gold.push(m.t.map((w) => (nicks.has(w) && !topic.has(w) && w !== m.n ? "P" : !nicks.has(w) && [...w].length >= 3 ? "N" : null))); }
  }
  return { name, P: prep(stream), gold, nMsg: stream.length, nTok: stream.reduce((a, s) => a + s.length, 0) };
}
export const IRC_DEFS = { NK: (g) => g };
// books: Gutenberg text cleaned as in name-rule/war-and-peace loaders (header/footer cut, chapter lines dropped, splitSentences, words of >= 1 letter, sentences of >= 3 tokens); gold = capital-share labels of labelBook (evaluation only)
export function bookBase(name, file) {
  let text = fs.readFileSync(file, "utf8").replace(/^﻿/, ""); const a = text.indexOf("*** START OF"), b = text.indexOf("*** END OF");
  if (a >= 0) text = text.slice(text.indexOf("\n", a) + 1, b > a ? b : undefined);
  text = text.split("\n").filter((l) => !/^\s*((CHAPTER|Chapter|BOOK|Book|PART|Part|VOLUME|Volume) [\p{L}\d.:IVXLC ]*|[IVXLC]+\.?)\s*$/u.test(l)).join("\n");
  const stream = [], orig = [];
  for (const s of splitSentences(text)) { const t = [], o = []; for (const m of s.text.matchAll(WORD)) { const w = m[0].replace(/^['’]+|['’]+$/g, ""); if (!w || /^\p{N}+$/u.test(w)) continue; t.push(w.normalize("NFC").toLowerCase()); o.push(w); } if (t.length >= 3) { stream.push(t); orig.push(o); } }
  const { cls } = labelBook({ stream, orig });
  return { name, P: prep(stream), gold: stream.map((u) => u.map((w) => cls.get(w) ?? null)), nSent: stream.length, nTok: stream.reduce((x, s) => x + s.length, 0), nNames: [...cls.values()].filter((v) => v === "CHAR" || v === "NAME").length };
}
export const BOOK_DEFS = { NAMES: (g) => (g === "CHAR" || g === "NAME" ? "P" : g === "COMMON" ? "N" : null) };
// code: lexed files (ant-code lexers give parser gold: U user identifier, E external, K keyword, L literal, P operator, A ambiguous); NP view = operators dropped, one unit = one logical statement
export function codeBase(name, lexFile) { const lex = JSON.parse(fs.readFileSync(lexFile, "utf8")), v = npView(lex); return { name, P: prep(v.stream), gold: v.cls, nUnits: v.stream.length }; }
export const CODE_DEFS = { PE: (g, w) => ([...w].length < 3 ? null : g === "U" ? "P" : g === "E" ? "N" : null) };
