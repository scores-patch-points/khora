// eval/law/name-rule-informal.mjs — THE NAME RULE, ZERO-SHOT, ON NON-STANDARD ENGLISH (and the same measure on a novel for contrast)
//
//   node eval/law/name-rule-informal.mjs --corpus irc|wp [--n 300] [--files 6] [--dry] [--out DIR]
//
// WHY THIS FILE EXISTS (user, 2026-10-06): "learning to tell nouns based on well formatted things is not a good practice." The first War and
// Peace test (name-war-and-peace.mjs) defined NAME by capitalisation, COMMON by a treebank POS prior, and fitted a classifier on them: that
// learns the noun/name distinction FROM well-formatted text and cannot be trusted to transfer to the informal registers the priors come from
// (ethos/19-organic-community: chat, SMS, IRC). This test removes all three: NO classifier is fitted anywhere; NO capital, POS prior, frame
// prior or treebank is used for any label or any score; the gold comes from sources that do not depend on how the text is formatted.
//
// THE RULE UNDER TEST: a name is that which affects the holographic field like a name — ablate the token, re-read, and the SLOTS it filled
// change (docs/LAW-FALSIFICATION.md 1.2 C2, R1; the single-mention rule 1.5).
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file on any corpus) ════════════════════════════════
// DISCLOSURE. Seen before this header: impact.mjs smoke on English UD DEV; probes at M=32/128; the 40+40-pair DRY RUN of name-war-and-peace.mjs
// (names left LESS trace than frequency-matched common words: non-null NAME 0.52 vs COMMON 0.83, CHAR 0.44 on n=9; capital arm 1.0 because it
// defined the label). The first full War and Peace runs (supervised design) were still running when this was written; their results had not
// been read. No IRC token has been read by any impact instrument.
//
// READERS. impact.mjs's three PRIOR-FREE shipped readers, A-DEL, frame-causal F=0 (the self message and the M before it). The reader sees the
// lowercased word units of each message / sentence; no ear, no prior, no capital.
// WINDOW. M is set so a window holds about 3,000 word units: IRC M=256 messages, War and Peace M=128 sentences.
//
// CORPORA AND GOLD (independent of capitals, priors and treebanks).
//   irc  ethos/19-organic-community/ubuntu-irc/{ubuntu,kubuntu,xubuntu,ubuntu-server}: --files channel-days (>= 1,500 messages), seeded draw. The
//        speaker field of a message line `<nick> text` is METADATA. A body token is a NAME occurrence when its word form (nick stripped to letters
//        and digits, lowercased, length >= 3) equals the form of a nick that spoke >= 3 messages that day, the speaker is a different nick, and the
//        form is not a "topic word": its share of the day's body tokens is below 1/300 (a derived cut, said once; it removes nicks that are also
//        what the channel talks about, e.g. a product). Everything the reader sees is the message body only.
//   wp   War and Peace (Maude): NAME occurrence = a token whose form is in the hand-verified cast of 48 referents (eoreader5 priors/coref: name,
//        display, surfaces), minus any form that appears in the displays of >= 3 referents (titles: prince, count, princess ...). Capitals play
//        no part. Kept for CONTRAST with a formatted text; the verdict is on the informal corpus.
// NEGATIVES. Tokens whose form is not a gold form, occurring >= 3 times in the stream, matched to each positive by log2 count bin of the form
//   (LATER: occurrence >= 4th, full windows) or by nearest position (FIRST: the form's first occurrence). This is a positive-UNLABELLED design:
//   an unlabelled token can be a name nobody listed (a product, a place), which can only DEPRESS every arm's AUC equally; it is stated, not corrected.
//
// SCORES (fixed functions of the impact record; NO fitted weights; direction fixed in advance: a larger impact is more name-like).
//   S_ENTRY  non-unchanged typed deltas in the ref-entry family at radius bands 0-1 (the referent entry the token fills or touches changes)
//   S_OWN    non-unchanged typed deltas at radius band 0 in every family (the slots the token itself fills)
//   S_ALL    non-unchanged typed deltas in all 72 delta components (everything the ablation changed)
//   S_SPAN   the span rival (R1): births + losses + |mentionShift| + edgesLost + edgesBorn of impact.mjs's span signature
//   R_BURST  causal burstiness: log((mentions in the last 16 messages + 0.5) / (rate x 16 + 0.5)) — a case-free rival that needs no ablation
//   R_FREQ   causal log(1 + mentions in the window) — matched out by design, reported as a check (expected near 0.5)
//   R_POS    log position — a control; must lie in [0.45, 0.55] (K4)
// OUTCOMES. O1 trace: share of tokens with a non-null signature by class; O2 AUC of each score, names vs matched negatives, per stratum (LATER;
//   FIRST causal; FIRST non-causal F=32), block-bootstrap 95% interval over files (irc) or position blocks (wp); K2 label permutation null (B=1000)
//   within blocks; O3 paired block-bootstrap AUC differences S_ENTRY - R_BURST, S_ENTRY - S_SPAN, S_ENTRY - S_ALL.
// CONTROLS BUILT TO FAIL. K1 sham ablation: 100% null signature. K2 above. K4 R_POS in [0.45, 0.55]. K5 licence: positives LATER non-null share
//   >= 0.50, else the readers are deaf to the gold names and the verdict is UNDERPOWERED(reader). K6 determinism: a 40-token re-run reproduces hashes.
// VERDICT (SESOI 0.03 AUC, a bare provisional number).
//   V1 DISCRIMINATES  LATER AUC(S_ENTRY) >= 0.60, 95% lower bound > 0.50, and > the K2 q95.
//   V2 BEYOND RIVAL   O3 S_ENTRY - R_BURST lower bound > 0.
//   V3 SINGLE MENTION FIRST causal AUC(S_ENTRY) >= 0.55 and lower bound > 0.50.
//   V4 SLOT NOT SPAN  O3 S_ENTRY - S_SPAN lower bound > 0.
//   HOLDS (informal)   V1 on irc; HOLDS-STRONG also V2 and V3.   FALSIFIED  V1 false with K5 passing.   UNDERPOWERED(reader)  K5 or K4 or K6 fails.
// PREDICTIONS (blind; orders are the claims).
//   P1 irc LATER AUC(S_ENTRY) in [0.55, 0.75] (V1 holds): nicknames recur with a consistent addressing company, so the entry they fill changes.
//   P2 wp LATER AUC(S_ENTRY) is within 0.05 of irc: the rule does not depend on the text being formatted.
//   P3 V3 fails: FIRST causal AUC(S_ENTRY) < 0.55 on both (the readers' floor of two mentions makes a single mention deaf).
//   P4 V2 fails: R_BURST >= S_ENTRY (a nickname is bursty because the conversation clusters around it).
//   P5 V4 fails: S_SPAN >= S_ENTRY, as in the impact smoke.
//   P6 K5 passes on irc (names leave a trace) and may FAIL on wp (the dry run: names left less trace than matched common words).
// NOT RUN HERE: SMS, Singlish chat and Enron email (no metadata gold; their gold needs a separate pre-registered annotation); the real production
//   pipeline arm; identity as a fold (T11).
//
// ═══ DISCLOSURE ADDED BEFORE THE FULL RUNS (no rule, threshold, score or prediction changed) ═════════════════════════════════════════════════
// A DRY RUN of this file on irc (3 channel-days, 24 LATER pairs, 24 FIRST pairs; header sha256 fa45773349dc76a2e0199fb8e8f4bc55ab642bd6b3c512b73113f6b84f2715dd)
// was read first: LATER AUC(S_ENTRY) 0.875 vs R_BURST 0.749; median extent 187 tokens for nicknames vs 1 for matched unlabelled tokens; K5 0.83; K6 40/40;
// K4 FAILED at that size (R_POS AUC 0.365 on 24 pairs: a sample of 24 cannot hold a position control to +-0.05); FIRST causal S_ENTRY 0.50 (deaf), FIRST
// NON-causal F=32 0.79. These numbers motivate nothing below: the full runs use the same code and the same rules at --n 300 --files 6.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { impactBatch, rngFor, seedFor, DELTA_TYPES, SPAN_LABELS } from "./impact.mjs";
import { auc } from "../competence/lib.mjs";
import { loadBook } from "./name-war-and-peace.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CORPUS = opt("--corpus", "irc"), DRY = args.includes("--dry");
const N = Number(opt("--n", DRY ? 30 : 300)), NFILES = Number(opt("--files", 6));
const OUT = opt("--out", path.join(HERE, "results"));
const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
const COREF = "/Users/mlacy/Documents/New Project/eochat-content-cv-demo/vendor/eoreader5/priors/coref/war-and-peace.json";
const SESOI = 0.03, BOOT = 1000, PERM = 1000, F_NC = 32, MAX_PAIR_GAP = 400;
const M = Number(opt("--M", CORPUS === "irc" ? 256 : 128));

const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
const tokensOf = (text) => [...String(text).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());

// ── corpora: a list of DOCUMENTS (a channel-day is one; a novel is one). A window never leaves its document. ─────────────────────────────────────────
function loadIrc(seed) {
  const dirs = ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"].map((d) => path.join(IRC_ROOT, d)).filter((d) => fs.existsSync(d));
  const cands = [];
  for (const d of dirs) for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".txt")).sort()) {
    const p = path.join(d, f), head = fs.readFileSync(p, "utf8").slice(0, 400);
    const m = /messages: "(\d+)"/.exec(head);
    if (m && Number(m[1]) >= 1500 && /lang: "en"/.test(head)) cands.push(p);
  }
  const rnd = rngFor(seed);
  const files = cands.slice().sort(() => rnd() - 0.5).slice(0, NFILES).sort();
  const docs = [], meta = { files: files.map((f) => path.relative(IRC_ROOT, f)), nicks: 0, positives: 0 };
  files.forEach((f, fi) => {
    const lines = fs.readFileSync(f, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
    const spoke = new Map();
    for (const [, nick] of lines) spoke.set(nick, (spoke.get(nick) ?? 0) + 1);
    const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    const nickForms = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
    const tot = new Map();
    let totalTokens = 0;
    const msgs = lines.map(([, nick, text]) => ({ nick: form(nick), toks: tokensOf(text) })).filter((m) => m.toks.length >= 1);
    for (const m of msgs) for (const t of m.toks) { tot.set(t, (tot.get(t) ?? 0) + 1); totalTokens += 1; }
    const topic = new Set([...nickForms].filter((n) => (tot.get(n) ?? 0) / totalTokens >= 1 / 300));
    meta.nicks += nickForms.size;
    const stream = [], pos = new Set();
    msgs.forEach((m, k) => {
      stream.push(m.toks);
      m.toks.forEach((t, i) => { if (nickForms.has(t) && !topic.has(t) && t !== m.nick) { pos.add(`${k}:${i}`); meta.positives += 1; } });
    });
    docs.push({ name: path.relative(IRC_ROOT, f), stream, pos, blockOf: () => fi });
  });
  return { docs, meta, nBlocks: files.length };
}

function loadWp() {
  const book = loadBook();
  const ref = JSON.parse(fs.readFileSync(COREF, "utf8")).referents;
  const per = ref.map((r) => new Set([r.name, r.display, ...(r.surfaces ?? [])].flatMap((f) => tokensOf(f))));
  const df = new Map(); for (const s of per) for (const w of s) df.set(w, (df.get(w) ?? 0) + 1);
  const cast = new Set([...df].filter(([, n]) => n < 3).map(([w]) => w).filter((w) => w.length >= 3));
  const pos = new Set();
  book.stream.forEach((sent, s) => sent.forEach((w, i) => { if (cast.has(w)) pos.add(`${s}:${i}`); }));
  const n = book.stream.length;
  return { docs: [{ name: "war-and-peace", stream: book.stream, pos, blockOf: (s) => Math.min(9, Math.floor((s / n) * 10)) }], meta: { castForms: cast.size, positives: pos.size }, nBlocks: 10 };
}

// ── sampling (per document) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const bin = (n) => Math.floor(Math.log2(n));
function indexDoc(doc) {
  doc.occ = new Map();
  doc.stream.forEach((sent, s) => sent.forEach((w, i) => { (doc.occ.get(w) ?? doc.occ.set(w, []).get(w)).push([s, i]); }));
  return doc;
}
function drawSample(doc, n, seed) {
  const { stream, pos, occ } = doc;
  const rnd = rngFor(seed), pick = (a) => a[Math.floor(rnd() * a.length)];
  const goldForm = new Set(); for (const k of pos) { const [s, i] = k.split(":").map(Number); goldForm.add(stream[s][i]); }
  const full = (s) => s >= M;
  const posOcc = (w) => occ.get(w).map(([s, i], k) => ({ s, i, k })).filter((o) => pos.has(`${o.s}:${o.i}`));
  const goldForms = [...goldForm].filter((w) => posOcc(w).length);
  const negForms = [...occ].filter(([w, o]) => !goldForm.has(w) && o.length >= 3 && w.length >= 2).map(([w]) => w);
  const negByBin = new Map(); for (const w of negForms) { const b = bin(occ.get(w).length); (negByBin.get(b) ?? negByBin.set(b, []).get(b)).push(w); }
  const out = { later: [], first: [], dropped: 0 };
  let guard = 0;
  while (out.later.length < n * 2 && guard++ < n * 60 && goldForms.length) {
    const w = pick(goldForms), po = posOcc(w).filter((o) => o.k >= 3 && full(o.s));
    if (!po.length) continue;
    const pool = (negByBin.get(bin(occ.get(w).length)) ?? []).filter((x) => occ.get(x).some((o, k) => k >= 3 && full(o[0])));
    if (!pool.length) continue;
    const nw = pick(pool), no = occ.get(nw).map(([s, i], k) => ({ s, i, k })).filter((o) => o.k >= 3 && full(o.s));
    const a = pick(po), b = pick(no);
    out.later.push({ s: a.s, i: a.i, id: w, y: 1 }, { s: b.s, i: b.i, id: nw, y: 0 });
  }
  const firstOf = (w) => occ.get(w)[0];
  const posFirst = goldForms.filter((w) => pos.has(`${firstOf(w)[0]}:${firstOf(w)[1]}`)).map((w) => ({ w, s: firstOf(w)[0], i: firstOf(w)[1] })).sort((a, b) => a.s - b.s);
  const negFirst = negForms.map((w) => ({ w, s: firstOf(w)[0], i: firstOf(w)[1] })).sort((a, b) => a.s - b.s);
  const used = new Set();
  for (const g of posFirst.slice(0, n)) {
    let best = null;
    for (const c2 of negFirst) { if (used.has(c2.w)) continue; const d = Math.abs(c2.s - g.s); if (best === null || d < best.d) best = { c2, d }; if (c2.s > g.s && best && c2.s - g.s > best.d) break; }
    if (!best || best.d > MAX_PAIR_GAP) { out.dropped += 1; continue; }
    used.add(best.c2.w);
    out.first.push({ s: g.s, i: g.i, id: g.w, y: 1 }, { s: best.c2.s, i: best.c2.i, id: best.c2.w, y: 0 });
  }
  return out;
}

// ── scores ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SPAN_IX = Object.fromEntries(["births", "losses", "mentionShift", "edgesLost", "edgesBorn"].map((k) => [k, SPAN_LABELS.indexOf(k)]));
function impactScores(rec) {
  const c = rec.counts, T = DELTA_TYPES.length;
  const at = (fam, band) => { let s = 0; for (let t = 0; t < T; t++) s += c[(fam * 3 + band) * T + t]; return s; };
  const S_ENTRY = at(3, 0) + at(3, 1);
  let S_OWN = 0; for (let fam = 0; fam < 4; fam++) S_OWN += at(fam, 0);
  let S_ALL = 0; for (const v of c) S_ALL += v;
  const sp = rec.span;
  const S_SPAN = Math.abs(sp[SPAN_IX.births]) + Math.abs(sp[SPAN_IX.losses]) + Math.abs(sp[SPAN_IX.mentionShift]) + Math.abs(sp[SPAN_IX.edgesLost]) + Math.abs(sp[SPAN_IX.edgesBorn]);
  return { S_ENTRY, S_OWN, S_ALL, S_SPAN };
}
function rivalScores(doc, t) {
  const { stream } = doc;
  const o = doc.occ.get(t.id), k = o.findIndex(([s, i]) => s === t.s && i === t.i);
  let inWin = 0, last16 = 0;
  for (let j = k - 1; j >= 0 && t.s - o[j][0] <= M; j--) { inWin += 1; if (t.s - o[j][0] <= 16) last16 += 1; }
  const rate = o.length / stream.length;
  return { R_BURST: Math.log((last16 + 0.5) / (rate * 16 + 0.5)), R_FREQ: Math.log1p(inWin), R_POS: Math.log1p(t.s) };
}

const aucOf = (scores, y, rows = null) => { const idx = rows ?? scores.map((_, k) => k); if (!idx.length) return null; return auc(idx.map((k) => scores[k]), idx.map((k) => y[k] === 1)); };
function bootAuc(scoreA, scoreB, y, block, B, seed) {
  const rnd = rngFor(seed), ids = [...new Set(block)], by = new Map(ids.map((b) => [b, []]));
  block.forEach((b, r) => by.get(b).push(r));
  const a = [], d = [];
  for (let t = 0; t < B; t++) {
    const rows = []; for (let k = 0; k < ids.length; k++) rows.push(...by.get(ids[Math.floor(rnd() * ids.length)]));
    const x = aucOf(scoreA, y, rows); if (x == null) continue; a.push(x);
    if (scoreB) { const z = aucOf(scoreB, y, rows); if (z != null) d.push(x - z); }
  }
  return { auc: round(aucOf(scoreA, y)), lo: round(quantile(a, 0.025)), hi: round(quantile(a, 0.975)), diffToB: scoreB ? { point: round(aucOf(scoreA, y) - aucOf(scoreB, y)), lo: round(quantile(d, 0.025)), hi: round(quantile(d, 0.975)) } : null };
}
function permNull(score, y, block, B, seed) {
  const rnd = rngFor(seed), by = new Map(); block.forEach((b, r) => (by.get(b) ?? by.set(b, []).get(b)).push(r));
  const out = [];
  for (let p = 0; p < B; p++) {
    const yp = y.slice();
    for (const rows of by.values()) { const lab = rows.map((r) => y[r]); for (let k = lab.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [lab[k], lab[j]] = [lab[j], lab[k]]; } rows.forEach((r, k) => { yp[r] = lab[k]; }); }
    const a = aucOf(score, yp); if (a != null) out.push(a);
  }
  return { q95: round(quantile(out, 0.95)), mean: round(mean(out)) };
}
const share = (xs) => (xs.length ? xs.filter(Boolean).length / xs.length : null);

function analyse(c, rows, recs, tag, seed) {
  const y = rows.map((t) => t.y), block = rows.map((t) => c.docs[t.doc].blockOf(t.s));
  const sc = rows.map((t, k) => ({ ...impactScores(recs[k]), ...rivalScores(c.docs[t.doc], t) }));
  const col = (n) => sc.map((r) => r[n]);
  const res = { tag, n: rows.length, pairs: rows.length / 2, auc: {}, ci: {}, null: {}, trace: {} };
  for (const n of ["S_ENTRY", "S_OWN", "S_ALL", "S_SPAN", "R_BURST", "R_FREQ", "R_POS"]) {
    const b = bootAuc(col(n), n === "S_ENTRY" ? col("R_BURST") : null, y, block, DRY ? 50 : BOOT, seed + n.length);
    res.auc[n] = b.auc; res.ci[n] = { lo: b.lo, hi: b.hi };
    if (n === "S_ENTRY") res.diffToBurst = b.diffToB;
  }
  res.null = permNull(col("S_ENTRY"), y, block, DRY ? 50 : PERM, seed + 77);
  res.diffs = { "S_ENTRY - S_SPAN": bootAuc(col("S_ENTRY"), col("S_SPAN"), y, block, DRY ? 50 : BOOT, seed + 1).diffToB, "S_ENTRY - S_ALL": bootAuc(col("S_ENTRY"), col("S_ALL"), y, block, DRY ? 50 : BOOT, seed + 2).diffToB, "S_ENTRY - R_BURST": res.diffToBurst };
  const tr = (cls) => rows.map((t, k) => (t.y === cls ? !recs[k].isNull : null)).filter((x) => x !== null);
  res.trace = { NAME: round(share(tr(1))), UNLABELLED: round(share(tr(0))), noSlotName: round(share(rows.map((t, k) => (t.y === 1 ? recs[k].noSlot : null)).filter((x) => x !== null))), noSlotUnlabelled: round(share(rows.map((t, k) => (t.y === 0 ? recs[k].noSlot : null)).filter((x) => x !== null))) };
  res.medianExtentTokens = { NAME: quantile(rows.map((t, k) => (t.y === 1 ? recs[k].extent.tokens : null)).filter((x) => x !== null), 0.5), UNLABELLED: quantile(rows.map((t, k) => (t.y === 0 ? recs[k].extent.tokens : null)).filter((x) => x !== null), 0.5) };
  return res;
}

async function main() {
  const t0 = Date.now();
  const seed = seedFor("name-rule-informal", CORPUS);
  const c = CORPUS === "irc" ? loadIrc(seed) : loadWp();
  c.docs.forEach(indexDoc);
  console.error(`${CORPUS}: ${c.docs.length} document(s), ${c.docs.reduce((a, d) => a + d.stream.length, 0)} sentences/messages, gold ${JSON.stringify(c.meta)}`);
  const perDoc = Math.max(1, Math.ceil(N / c.docs.length));
  const rowsL = [], rowsF = []; let dropped = 0;
  c.docs.forEach((d, di) => { const smp = drawSample(d, perDoc, seed + 5 + di); smp.later.forEach((t) => rowsL.push({ ...t, doc: di })); smp.first.forEach((t) => rowsF.push({ ...t, doc: di })); dropped += smp.dropped; });
  console.error(`sample: ${rowsL.length / 2} LATER pairs, ${rowsF.length / 2} FIRST pairs (${dropped} dropped)`);
  const run = (rows, F, modes = ["delete"]) => {
    const recs = Object.fromEntries(modes.map((m) => [m, new Array(rows.length).fill(null)]));
    c.docs.forEach((d, di) => {
      const idx = rows.map((t, k) => (t.doc === di ? k : -1)).filter((k) => k >= 0);
      if (!idx.length) return;
      const r = impactBatch(d.stream, idx.map((k) => rows[k]), { M, F, modes, seedTag: `${CORPUS}:${di}`, maxSeconds: Infinity });
      for (const m of modes) idx.forEach((k, j) => { recs[m][k] = r.records[m][j]; });
    });
    return recs;
  };
  const result = { module: "eval/law/name-rule-informal.mjs", corpus: CORPUS, dry: DRY, M, gold: c.meta, sample: { laterPairs: rowsL.length / 2, firstPairs: rowsF.length / 2, firstDropped: dropped } };
  console.error("reading LATER…");
  const L = run(rowsL, 0, ["delete", "sham"]);
  result.later = analyse(c, rowsL, L.delete, "LATER matched by frequency, frame-causal", seed + 100);
  console.error("reading FIRST causal and F=32…");
  const Fc = run(rowsF, 0), Fn = run(rowsF, F_NC);
  result.firstCausal = analyse(c, rowsF, Fc.delete, "FIRST matched by position, frame-causal", seed + 200);
  result.firstNoncausal = analyse(c, rowsF, Fn.delete, `FIRST NON-CAUSAL F=${F_NC}`, seed + 300);
  result.K1_sham = { nullShare: round(share(L.sham.map((r) => r.isNull))), n: L.sham.length };
  const posLater = rowsL.map((t, k) => (t.y === 1 ? !L.delete[k].isNull : null)).filter((x) => x !== null);
  result.K5_licence = { positivesNonNullShare: round(share(posLater)), n: posLater.length, pass: posLater.length ? share(posLater) >= 0.5 : null };
  const sub = rowsL.slice(0, 40), det = run(sub, 0);
  result.K6_determinism = { same: det.delete.filter((r, k) => r.hash === L.delete[k].hash).length, total: sub.length };
  const A = result.later, Fa = result.firstCausal;
  const k4 = A.auc.R_POS >= 0.45 && A.auc.R_POS <= 0.55;
  const V1 = A.auc.S_ENTRY >= 0.60 && A.ci.S_ENTRY.lo > 0.5 && A.auc.S_ENTRY > A.null.q95;
  const V2 = A.diffs["S_ENTRY - R_BURST"].lo > 0;
  const V3 = Fa.auc.S_ENTRY >= 0.55 && Fa.ci.S_ENTRY.lo > 0.5;
  const V4 = A.diffs["S_ENTRY - S_SPAN"].lo > 0;
  const under = result.K5_licence.pass === false || !k4 || result.K6_determinism.same !== sub.length;
  const verdict = under ? "UNDERPOWERED(reader)" : !V1 ? "FALSIFIED" : V2 && V3 ? "HOLDS-STRONG" : "HOLDS";
  result.K4_position = { aucPosition: A.auc.R_POS, inside: k4 };
  result.verdict = { V1_discriminates: V1, V2_beyond_burstiness: V2, V3_single_mention_causal: V3, V4_slot_not_span: V4, verdict, seconds: round((Date.now() - t0) / 1000, 1) };
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `name-rule-informal.${CORPUS}${DRY ? ".dry" : ""}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 1));
  const sha = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  console.log(JSON.stringify({ ...result.verdict, corpus: CORPUS, headerSha256: sha, file }, null, 1));
}
await main();
