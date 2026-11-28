#!/usr/bin/env node
// eval/ocr-reread/measure.mjs: does the rereading repair more OCR tokens than it breaks?
//   node measure.mjs fit  <dev-pairs.json>                 -> learns the channel and fits the dials on DEVELOPMENT pages; writes channel-tesseract-dev.json and fitted-dials.json
//   node measure.mjs test <pairs.json> [--label held-out]  -> ONE scoring run with the frozen channel and dials; prints the table
// SCORE (per OCR token aligned one-to-one with a token of the page): `before` = its core equals the page's; `after` = the core of what the rereading leaves there equals the page's.
//   fixed = wrong before, right after; broken = right before, wrong after; net = fixed - broken. Cores are compared with typographic apostrophes folded and case kept.
//   Tokens the OCR split or merged (unequal runs) are counted as `segmentation` and are outside what a token rereading can repair.
// ARMS: FOLD (ocr-reread.mjs, measured channel, fitted dials) · UNIFORM (same organ, no channel, same dials) · NEAREST (the strings twin: any unknown token becomes its most frequent known neighbour at one plain edit, always).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { rereadOcr, revisedText, tokensOf, formsOf, channelOf } from "../../native/the-fold/ocr-reread.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), [mode, file] = process.argv.slice(2), label = process.argv.includes("--label") ? process.argv[process.argv.indexOf("--label") + 1] : mode;
const APOS = new Map([["’", "'"], ["‘", "'"], ["`", "'"], ["“", '"'], ["”", '"']]), fold = (s) => [...s].map((c) => APOS.get(c) ?? c).join("");
const pairs = JSON.parse(fs.readFileSync(file, "utf8")), V = formsOf("eng");
// token alignment: longest common subsequence on folded cores; unequal runs between anchors are segmentation
function align(a, b) { const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0, ri = 0, rj = 0; const flush = () => { if (i - ri === j - rj) for (let k = 0; k < i - ri; k++) out.push([ri + k, rj + k]); else out.push({ seg: [i - ri, j - rj] }); };
  while (i < n && j < m) { if (a[i] === b[j]) { flush(); out.push([i, j]); i++; j++; ri = i; rj = j; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  i = n; j = m; flush(); return out; }
// character alignment of one wrong pair -> channel operations "ocr piece>page piece" (pieces of at most 2 characters)
function opsOf(o, g) { const n = o.length, m = g.length, D = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1)); for (let i = 0; i <= n; i++) D[i][0] = i; for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (o[i - 1] === g[j - 1] ? 0 : 1));
  const steps = []; let i = n, j = m; while (i > 0 || j > 0) { if (i > 0 && j > 0 && o[i - 1] === g[j - 1] && D[i][j] === D[i - 1][j - 1]) { steps.push(["=", o[i - 1], g[j - 1]]); i--; j--; } else if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + 1) { steps.push(["x", o[i - 1], g[j - 1]]); i--; j--; } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) { steps.push(["x", o[i - 1], ""]); i--; } else { steps.push(["x", "", g[j - 1]]); j--; } }
  steps.reverse(); const ops = []; let fo = "", fg = ""; for (const [t, a, b] of [...steps, ["=", "", ""]]) { if (t === "x") { fo += a; fg += b; } else { if ((fo || fg) && fo.length <= 2 && fg.length <= 2) ops.push(`${fo}>${fg}`); fo = ""; fg = ""; } } return ops; }
const lower = (s) => fold(s).toLowerCase();
function nearest(text) {   // the strings twin
  const toks = tokensOf(text), A = [..."abcdefghijklmnopqrstuvwxyz'"]; let out = "", at = 0;
  for (const t of toks) { const k = lower(t.core); if (!k || V.forms.has(k) || ![...k].some((c) => c.toLowerCase() !== c.toUpperCase())) continue; let best = null, bc = 0; const tryit = (f) => { const c = V.forms.get(f) ?? 0; if (c > bc) { bc = c; best = f; } };
    for (let i = 0; i <= k.length; i++) { if (i < k.length) { tryit(k.slice(0, i) + k.slice(i + 1)); for (const c of A) tryit(k.slice(0, i) + c + k.slice(i + 1)); } for (const c of A) tryit(k.slice(0, i) + c + k.slice(i)); }
    if (best) { out += text.slice(at, t.at[0]) + t.pre + best + t.post; at = t.at[1]; } }
  return out + text.slice(at); }
function score(rows, revise) {   // per page: { right, fixed, broken, wrongStill, seg }
  return rows.map((r, idx) => { const g = tokensOf(r.gold), o = tokensOf(r.ocr), v = tokensOf(revise(r.ocr, idx)); const s = { doc: r.doc, tokens: 0, wrongBefore: 0, fixed: 0, broken: 0, seg: 0 };
    if (v.length !== o.length) throw new Error("a revision changed the token count");
    for (const a of align(g.map((t) => fold(t.core)), o.map((t) => fold(t.core)))) { if (a.seg) { s.seg += a.seg[0]; continue; } const [gi, oi] = a, G = fold(g[gi].core), before = fold(o[oi].core) === G, after = fold(v[oi].core) === G; s.tokens++; if (!before) s.wrongBefore++; if (!before && after) s.fixed++; if (before && !after) s.broken++; }
    return s; }); }
const sum = (ps, k) => ps.reduce((a, p) => a + p[k], 0);
function boot(ps, f, B = 2000) { let seed = 20261128; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32, xs = []; for (let b = 0; b < B; b++) xs.push(f(Array.from({ length: ps.length }, () => ps[Math.floor(rnd() * ps.length)]))); xs.sort((a, b) => a - b); return [xs[Math.floor(B * 0.025)], xs[Math.floor(B * 0.975)]]; }
if (mode === "fit") {
  const ops = {}; let errors = 0;
  for (const r of pairs) { const g = tokensOf(r.gold), o = tokensOf(r.ocr); for (const a of align(g.map((t) => fold(t.core)), o.map((t) => fold(t.core)))) { if (a.seg) continue; const G = lower(g[a[0]].core), O = lower(o[a[1]].core); if (G === O || !G || !O) continue; errors++; for (const op of opsOf(O, G)) ops[op] = (ops[op] ?? 0) + 1; } }
  const channel = { schema: "OcrChannel@1", engine: "tesseract 5.3.4 eng", fittedOn: `${path.basename(file)}: ${pairs.length} page readings of ${new Set(pairs.map((p) => p.doc)).size} development documents, 80 and 65 dpi grey renders`, errors, ops };
  fs.writeFileSync(path.join(HERE, "channel-tesseract-dev.json"), JSON.stringify(channel, null, 1) + "\n"); const ch = channelOf(channel);
  // candidates do not depend on floor or margin: read each page once per (docKnown, maxEdits) with the dials open, then decide each (floor, margin) by the organ's own rule (proposed iff top >= floor and it leads the second by >= margin)
  let best = null; for (const docKnown of [0, 2, 3]) for (const maxEdits of [1, 2]) { const open = pairs.map((r) => rereadOcr(r.ocr, { channel: ch, dials: { floor: -1e9, margin: 0, docKnown, maxEdits }, forms: V.forms }));
    for (const floor of [-22, -18, -14, -10, -6]) for (const margin of [0, 1, 2, 4]) { const dials = { floor, margin, docKnown, maxEdits };
      const ps = score(pairs, (t, i) => revisedText(t, { tokens: open[i].tokens.map((r) => ({ ...r, status: r.cands.length && r.cands[0][1] >= floor && (r.cands.length === 1 || r.cands[0][1] - r.cands[1][1] >= margin) ? "proposed" : "kept", proposed: r.cands[0]?.[0] })) })), net = sum(ps, "fixed") - sum(ps, "broken");
      if (!best || net > best.net) best = { dials, net, fixed: sum(ps, "fixed"), broken: sum(ps, "broken"), wrongBefore: sum(ps, "wrongBefore"), tokens: sum(ps, "tokens") }; } }
  fs.writeFileSync(path.join(HERE, "fitted-dials.json"), JSON.stringify({ fittedOn: channel.fittedOn, grid: "docKnown 0,2,3 x maxEdits 1,2 x floor -22..-6 x margin 0,1,2,4; chosen by greatest fixed - broken on development pages", ...best }, null, 1) + "\n");
  console.log("channel:", errors, "wrong tokens,", Object.keys(ops).length, "distinct operations; top:", Object.entries(ops).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, c]) => `${k} ${c}`).join(" · ")); console.log("fitted (development, in sample):", JSON.stringify(best));
} else {
  const ch = channelOf(JSON.parse(fs.readFileSync(path.join(HERE, "channel-tesseract-dev.json"), "utf8"))), dials = JSON.parse(fs.readFileSync(path.join(HERE, "fitted-dials.json"), "utf8")).dials, res = {};
  for (const dpi of [...new Set(pairs.map((p) => p.dpi))].sort((a, b) => b - a)) { const rows = pairs.filter((p) => p.dpi === dpi), arms = { FOLD: (t) => revisedText(t, rereadOcr(t, { channel: ch, dials, forms: V.forms })), UNIFORM: (t) => revisedText(t, rereadOcr(t, { channel: null, dials, forms: V.forms })), NEAREST: nearest };
    res[dpi] = {}; for (const [name, f] of Object.entries(arms)) { const ps = score(rows, f), net = (x) => sum(x, "fixed") - sum(x, "broken"); res[dpi][name] = { pages: ps.length, documents: new Set(ps.map((p) => p.doc)).size, tokens: sum(ps, "tokens"), segmentation: sum(ps, "seg"), wrongBefore: sum(ps, "wrongBefore"), fixed: sum(ps, "fixed"), broken: sum(ps, "broken"), net: net(ps), netInterval95: boot(ps, net) }; }
    const c = { tokens: 0, proposed: 0, contested: 0, unknown: 0 }; for (const r of rows) { const rr = rereadOcr(r.ocr, { channel: ch, dials, forms: V.forms }); for (const k of Object.keys(c)) c[k] += rr.counts[k]; } res[dpi].foldStatuses = c; }
  console.log(`# ${label}`); console.log(JSON.stringify(res, null, 1)); fs.writeFileSync(path.join(HERE, `result-${label}.json`), JSON.stringify({ label, dials, result: res }, null, 1) + "\n");
}
