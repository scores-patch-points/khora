// eval/law/name-company.mjs — IS THE NAME SHAPE IN COMPANY? A language-general company profile of a token occurrence, learned on known names.
//
//   node eval/law/name-company.mjs run [--out DIR]       (collect, analyse, write DIR/report.json)
//
// WHY (2026-10-06). The ablation record carries a weak, language-general name signal that cheap counts mostly explain (ant-shape), and no name-specific or
// family-specific SHAPE (name-shape, ant-kinds-ud). The strongest name signal anywhere was in COMPANY: ant-kinds-novel found that the similarity of a
// word's neighbouring-word profile to the other cast forms' separates cast from frequency-matched forms at AUC ~0.93 (exploratory, one book). Firth: you know
// a word by the company it keeps. The user's belief: the shape of a proper noun is specific, and specific to WORD-ORDER LANGUAGE FAMILIES — and company is
// exactly the observable that word order shapes. This file tests that on company, with the confounds the adversary found removed by matching.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══════════════════════════════════════════════════
// DISCLOSURE. Seen before this header: all of the beings ladder, name-rule, name-shape and swarm results (ant-shape, ant-kinds-ud, ant-kinds-chat,
// ant-kinds-novel, ant-adversary CRITIQUE). Not seen: any company-profile AUC on UD or IRC. No company feature has been computed by any script.
// OBJECT. For an occurrence of token w at index i of its sentence (UD word stream; IRC message), the COMPANY PROFILE = four categorical slots: the left
//   neighbour (distance 1), left-2, right neighbour, right-2, each coded by the log2 FREQUENCY-RANK BIN of that neighbour in the language's/day's OWN stream
//   (bin = floor(log2(rank)); 12 bins, rank 1 = the commonest form) or by the EDGE category (^ or $ / beyond the sentence). One-hot: 4 x 13 = 52 features.
//   No neighbour is identified by its string (so a profile transfers across languages and registers); no POS, prior, list or capital enters. Arms:
//   LEFT = left1+left2 (CAUSAL: usable at the first mention, prefix only); RIGHT = right1+right2 (one or two tokens of lookahead, disclosed); BOTH.
//   Case-free RIVALS: POSITION = within-sentence index bucket {0,1,2-3,4+} + sentence-length bucket; CHARLEN = character-length bucket {<=2,3-4,5-6,7+};
//   FREQ = log2 form frequency in the stream; RIVALS = all three; BOTH+RIVALS. POSITION is also the CONTROL arm: it is matched out, so it must sit in [0.45, 0.55].
// DATA. UD DEV (held-out gold) of the 25 stems (eval/law/impact.mjs readConlluStream: lowercase word units, punctuation dropped). Gold UPOS selects the classes
//   and stratifies; no learner feature uses it. IRC: 8 channel-days (>= 1,500 messages, lang en) drawn with a seed from days NOT in
//   eval/law/results/name-rule-informal.irc.json gold.files; positives = body tokens equal to the form of a nickname that spoke >= 3 messages that day
//   (not the speaker, not a topic word with share >= 1/300), the speaker field being METADATA, exactly the rule of eval/law/name-rule-informal.mjs.
// CLASSES AND MATCHING. UD positives: PROPN occurrences; negatives: NOUN/VERB/ADJ occurrences. IRC negatives: ordinary tokens of >= 3 characters that are not
//   nickname forms. Each positive is paired, without replacement, with a negative of the SAME key = (form-frequency bin floor(log2 count), within-sentence index
//   bucket, character-length bucket, sentence-length bucket); a positive with no match is dropped (relaxing the sentence-length bucket first). STRATA: FIRST =
//   the occurrence is the form's first in the stream (the single-mention case: all forms, hapax included); LATER = every other occurrence. <= 600 pairs per
//   language per stratum. A language/stratum with < 60 pairs is `thin` and excluded from every count (the denominators are reported).
// LEARNER. Ridge-logistic (lambda 1.0, standardised, no PCA, no tuning): fitLogit/predict/standardise exported by eval/law/name-war-and-peace.mjs.
// TESTS. (every threshold fixed here; SESOI 0.03 AUC)
//   C1 OWN-LANGUAGE leave-one-position-block-out CV AUC (4 blocks by sentence quartile), per arm and stratum, permutation null (within blocks, B=200).
//   C2 FAMILY TRANSFER: target language L; train on OTHER languages of the SAME word-order family vs an EQUALISED set of other-family languages (same number of
//      languages, same pairs per language, 20 seeded draws averaged); 2-family scheme primary (SOV-like vs SVO-like merged; memberships from
//      results/name-shape/_report.json families.membership, derived from role-config word-order shares), 3-cluster scheme secondary. Count of languages
//      with same > other, one-sided sign test, mean difference with a language-bootstrap CI.
//   C3 CROSS-REGISTER: UD pooled -> IRC (position/character-length/frequency-matched), UD-English -> IRC, SVO-like -> IRC, SOV-like -> IRC, IRC leave-one-day-out,
//      IRC -> UD-English.
//   C4 COMPANY SHUFFLE: the same pipeline on within-sentence-shuffled streams (company destroyed, sentence length kept) for eng spa rus fas jpn tur hin fin:
//      the company arms must fall to the POSITION level (the position arm is recomputed on the shuffled stream).
//   C5 BEYOND RIVALS: BOTH+RIVALS minus RIVALS >= 0.03 with a lower language-bootstrap bound > 0 (LATER), and the same for LEFT+RIVALS at FIRST.
// VERDICTS. COMPANY SHAPE EXISTS if BOTH own-language AUC >= 0.65 (LATER) in >= 15 of the non-thin languages with mean above the permutation q95, and C5 holds.
//   SINGLE-MENTION (causal) if LEFT at FIRST >= 0.60 in >= 12 non-thin languages and mean above its q95. FAMILY-SPECIFIC if C2 same - other >= 0.03 and same >
//   other in >= 70% of languages (one-sided sign p <= 0.05). REGISTER-ROBUST if UD pooled -> IRC >= 0.60 with the IRC position arm in [0.45, 0.55]. COMPANY (not
//   counts) if C4 takes the company arms to within 0.03 of the shuffled POSITION arm.
// PREDICTIONS (blind; orders are the claims). P1 BOTH LATER >= 0.65 in >= 15 languages (company carries a name signal: the novel ant's 0.93 was one book).
//   P2 C5 holds. P3 LEFT at FIRST >= 0.60 in >= 12 languages. P4 FAMILY-SPECIFIC FAILS: rank-bin company is language-general, same - other < 0.03 (the user's
//   belief is tested in its best form and my prior is that it fails; SOV-like languages may score higher in level). P5 UD pooled -> IRC >= 0.60. P6 C4 holds.
// NOT TESTED: neighbour identity features (language-specific), production-reader nomination, SMS/cosem/enron (no gold).
// DISCLOSURE ADDED BEFORE THE FULL RUN (no rule, threshold or prediction changed): a smoke run of this same code (scratch output, cut off after 12 languages) printed
//   own-language AUC for eng spa rus cmn cmn-hans arb heb fas kor jpn fra deu: LATER BOTH 0.60 0.68 0.55 0.61 0.63 thin 0.68 0.68 thin 0.64 0.71 0.53; FIRST LEFT 0.63 0.71 0.50
//   0.54 0.53 thin 0.67 0.62 0.51 0.58 0.68 0.68. The full run below recomputes everything from scratch with the same seeds.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { readConlluStream, rngFor, seedFor } from "./impact.mjs";
import { fitLogit, predict, standardise, aucOf } from "./name-war-and-peace.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = opt("--out", path.join(HERE, "results", "name-company"));
const UD = "/private/tmp/claude-501/ud-eval";
const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
const OPEN = new Set(["NOUN", "VERB", "ADJ"]);
const NB = 13, MAXPAIRS = 600, THIN = 60, PERM = 40, CAP = 150; // PERM was registered as 200; reduced to 40 for cost BEFORE any run (the ridge fit on 52 features x 4 folds x 200 draws x 50 cells is hours)
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
const shuffleIn = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ── company features ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function rankBins(stream) {
  const c = new Map(); for (const s of stream) for (const w of s) c.set(w, (c.get(w) ?? 0) + 1);
  const order = [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const bins = new Map(); order.forEach(([w], r) => bins.set(w, Math.min(11, Math.floor(Math.log2(r + 1)))));
  return { bins, count: c };
}
const oh = (n, k) => { const v = new Array(k).fill(0); v[Math.min(n, k - 1)] = 1; return v; };
const slot = (sent, j, bins) => (j < 0 || j >= sent.length ? 12 : bins.get(sent[j]) ?? 11);
const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
const cb = (w) => { const n = [...w].length; return n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : 3; };
const lb = (n) => Math.max(0, Math.min(4, Math.floor(Math.log2(Math.max(2, n))) - 2));
const fb = (n) => Math.floor(Math.log2(Math.max(1, n)));
function featuresOf(sent, i, bins, count, w) {
  return {
    L1: oh(slot(sent, i - 1, bins), NB), L2: oh(slot(sent, i - 2, bins), NB), R1: oh(slot(sent, i + 1, bins), NB), R2: oh(slot(sent, i + 2, bins), NB),
    POS: [...oh(ib(i), 4), ...oh(lb(sent.length), 5)], CHAR: oh(cb(w), 4), FREQ: [Math.log2(Math.max(1, count.get(w) ?? 1))],
  };
}
export const ARMS = {
  LEFT: (f) => [...f.L1, ...f.L2], RIGHT: (f) => [...f.R1, ...f.R2], BOTH: (f) => [...f.L1, ...f.L2, ...f.R1, ...f.R2],
  POSITION: (f) => f.POS, CHARLEN: (f) => f.CHAR, FREQ: (f) => f.FREQ, RIVALS: (f) => [...f.POS, ...f.CHAR, ...f.FREQ],
  "LEFT+RIVALS": (f) => [...f.L1, ...f.L2, ...f.POS, ...f.CHAR, ...f.FREQ], "BOTH+RIVALS": (f) => [...f.L1, ...f.L2, ...f.R1, ...f.R2, ...f.POS, ...f.CHAR, ...f.FREQ],
};

// ── documents and matched pairs ─────────────────────────────────────────────────────────────────────────────────────────────────────
// POST-HOC AMENDMENT (2026-10-06, after the first full run): NAME_COMPANY_PAIRBLOCK=1 puts both members of a matched pair in the POSITIVE member's block. The first run's
// position control sat at ~0.38 (must be 0.45-0.55) because the members of a pair fell in different blocks (leave-block-out anti-learning; see name-company-diag.mjs).
// The default (unset) reproduces the first run exactly.
const PAIRBLOCK = process.env.NAME_COMPANY_PAIRBLOCK === "1";
/** A document = {stream, cls(s,i) -> "P" | "N" | null, block(s), name}. Occurrences carry k = how many times the form occurred before. */
export function pairsOf(doc, stratum, rnd, max = MAXPAIRS) {
  const { stream } = doc, { bins, count } = rankBins(stream);
  const seen = new Map(), P = [], N = [];
  stream.forEach((sent, s) => sent.forEach((w, i) => {
    const k = seen.get(w) ?? 0; seen.set(w, k + 1);
    if ((stratum === "FIRST") !== (k === 0)) return;
    const c = doc.cls(s, i); if (!c) return;
    const o = { s, i, w, k, key: [fb(count.get(w)), ib(i), cb(w), lb(sent.length)] };
    (c === "P" ? P : N).push(o);
  }));
  const pool = new Map(); for (const o of N) { const kk = o.key.join("|"); (pool.get(kk) ?? pool.set(kk, []).get(kk)).push(o); }
  for (const a of pool.values()) shuffleIn(a, rnd);
  const rows = []; let dropped = 0;
  for (const p of shuffleIn(P, rnd)) {
    if (rows.length >= max * 2) break;
    let q = null;
    for (const relax of [false, true]) {
      const kk = relax ? null : p.key.join("|");
      const cand = relax ? [...pool.entries()].find(([k2, a]) => a.length && k2.split("|").slice(0, 3).join("|") === p.key.slice(0, 3).join("|")) : [kk, pool.get(kk)];
      if (cand && cand[1]?.length) { q = cand[1].pop(); break; }
    }
    if (!q) { dropped += 1; continue; }
    for (const [o, y] of [[p, 1], [q, 0]]) rows.push({ f: featuresOf(stream[o.s], o.i, bins, count, o.w), y, s: o.s, i: o.i, w: o.w, block: doc.block(PAIRBLOCK ? p.s : o.s), doc: doc.name });
  }
  return { rows, dropped, pairs: rows.length / 2 };
}
export function udDoc(stem, shuffled = false) {
  const p = path.join(UD, stem, "dev.conllu"); if (!fs.existsSync(p)) return null;
  let { sents, upos } = readConlluStream(p);
  if (shuffled) { const rnd = rngFor(seedFor("name-company", stem, "shuffle")); const idx = sents.map((s) => shuffleIn(s.map((_, i) => i), rnd)); sents = sents.map((s, k) => idx[k].map((j) => s[j])); upos = upos.map((u, k) => idx[k].map((j) => u[j])); }
  const n = sents.length;
  return { name: stem, stream: sents, cls: (s, i) => (upos[s][i] === "PROPN" ? "P" : OPEN.has(upos[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) };
}

export function ircDocs(seed, nDays = 8) {
  const used = new Set(JSON.parse(fs.readFileSync(path.join(HERE, "results", "name-rule-informal.irc.json"), "utf8")).gold.files);
  const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
  const toks = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
  const cands = [];
  for (const d of ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"]) { const dir = path.join(IRC_ROOT, d); if (!fs.existsSync(dir)) continue; for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt")).sort()) { const p = path.join(dir, f), head = fs.readFileSync(p, "utf8").slice(0, 400), m = /messages: "(\d+)"/.exec(head); if (m && Number(m[1]) >= 1500 && /lang: "en"/.test(head) && !used.has(`${d}/${f}`)) cands.push([d, f, p]); } }
  const rnd = rngFor(seed), pick = shuffleIn(cands.slice(), rnd).slice(0, nDays).sort((a, b) => (a[2] < b[2] ? -1 : 1));
  return pick.map(([d, f, p], di) => {
    const lines = fs.readFileSync(p, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
    const spoke = new Map(); for (const [, n] of lines) spoke.set(n, (spoke.get(n) ?? 0) + 1);
    const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    const nicks = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
    const msgs = lines.map(([, n, t]) => ({ n: form(n), t: toks(t) })).filter((m) => m.t.length >= 1);
    const tot = new Map(); let all = 0; for (const m of msgs) for (const w of m.t) { tot.set(w, (tot.get(w) ?? 0) + 1); all += 1; }
    const topic = new Set([...nicks].filter((n) => (tot.get(n) ?? 0) / all >= 1 / 300));
    return { name: `${d}/${f}`, stream: msgs.map((m) => m.t), speakers: msgs.map((m) => m.n), nicks, topic, block: () => di,
      cls(s, i) { const w = this.stream[s][i]; if (this.nicks.has(w) && !this.topic.has(w) && w !== this.speakers[s]) return "P"; return !this.nicks.has(w) && [...w].length >= 3 ? "N" : null; } };
  });
}
function cvScoresLocal(X, y, block) {
  const out = new Array(X.length).fill(null);
  for (const b of new Set(block)) {
    const tr = [], te = []; block.forEach((bb, r) => (bb === b ? te : tr).push(r));
    if (!te.length || new Set(tr.map((r) => y[r])).size < 2) continue;
    const [Xtr, Xte] = standardise(tr.map((r) => X[r]), te.map((r) => X[r]));
    if (!Xtr[0]?.length) continue;
    const w = fitLogit(Xtr, tr.map((r) => y[r])); te.forEach((r, k) => { out[r] = predict(w, Xte[k]); });
  }
  return out;
}
const cvAuc = (rows, a) => aucOf(cvScoresLocal(rows.map((r) => ARMS[a](r.f)), rows.map((r) => r.y), rows.map((r) => r.block)), rows.map((r) => r.y));
function permQ95(rows, a, rnd, B = PERM) {
  const X = rows.map((r) => ARMS[a](r.f)), by = new Map(); rows.forEach((r, k) => (by.get(r.block) ?? by.set(r.block, []).get(r.block)).push(k));
  const out = [];
  for (let b = 0; b < B; b++) { const y = rows.map((r) => r.y); for (const ks of by.values()) { const lab = shuffleIn(ks.map((k) => y[k]), rnd); ks.forEach((k, j) => { y[k] = lab[j]; }); } const s = aucOf(cvScoresLocal(X, y, rows.map((r) => r.block)), y); if (s != null) out.push(s); }
  return quantile(out, 0.95);
}
function trainTest(train, test, a) {
  const [Xtr, Xte] = standardise(train.map((r) => ARMS[a](r.f)), test.map((r) => ARMS[a](r.f)));
  if (!Xtr[0]?.length) return null;
  const w = fitLogit(Xtr, train.map((r) => r.y)); return aucOf(Xte.map((x) => predict(w, x)), test.map((r) => r.y));
}
const capPairs = (rows, n, rnd) => { const idx = shuffleIn(Array.from({ length: rows.length / 2 }, (_, k) => k), rnd).slice(0, n); return idx.flatMap((k) => [rows[2 * k], rows[2 * k + 1]]); };
const bootMean = (xs, B = 2000, rnd = rngFor(7)) => { const m = []; for (let b = 0; b < B; b++) { let t = 0; for (let k = 0; k < xs.length; k++) t += xs[Math.floor(rnd() * xs.length)]; m.push(t / xs.length); } return { mean: round(mean(xs)), lo: round(quantile(m, 0.025)), hi: round(quantile(m, 0.975)) }; };
const signP = (w, l) => { const n = w + l; let p = 0; const lc = (k) => { let s = 0; for (let i = 2; i <= k; i++) s += Math.log(i); return s; }; for (let k = w; k <= n; k++) p += Math.exp(lc(n) - lc(k) - lc(n - k) - n * Math.log(2)); return n ? p : 1; };

async function main() {
  const t0 = Date.now(); fs.mkdirSync(OUT, { recursive: true });
  const fam = JSON.parse(fs.readFileSync(path.join(HERE, "results", "name-shape", "_report.json"), "utf8")).families.membership;
  const famOf = (s, scheme) => (scheme === 2 ? (String(fam[s]).startsWith("SOV") ? "SOV" : "SVO") : fam[s]);
  const R = {}, own = {};
  for (const stem of STEMS25) {
    const doc = udDoc(stem); if (!doc) continue;
    const r = rngFor(seedFor("name-company", stem));
    R[stem] = { L: pairsOf(doc, "LATER", r), F: pairsOf(doc, "FIRST", r) }; own[stem] = {};
    for (const [st, key] of [["LATER", "L"], ["FIRST", "F"]]) {
      const pr = R[stem][key]; own[stem][st] = { pairs: pr.pairs, dropped: pr.dropped, thin: pr.pairs < THIN };
      if (pr.pairs < THIN) continue;
      for (const a of Object.keys(ARMS)) own[stem][st][a] = round(cvAuc(pr.rows, a));
      own[stem][st].permQ95 = round(permQ95(pr.rows, st === "LATER" ? "BOTH" : "LEFT", r));
    }
    console.error(`${stem}: LATER ${own[stem].LATER.pairs} pairs BOTH ${own[stem].LATER.BOTH ?? "-"} | FIRST ${own[stem].FIRST.pairs} pairs LEFT ${own[stem].FIRST.LEFT ?? "-"}`);
    fs.writeFileSync(path.join(OUT, "own.json"), JSON.stringify(own));
  }
  const ok = (st) => STEMS25.filter((s) => own[s] && !own[s][st]?.thin);
  const key = (st) => (st === "LATER" ? "L" : "F");
  const out = { module: "eval/law/name-company.mjs", denominators: { LATER: ok("LATER").length, FIRST: ok("FIRST").length }, own };
  // C1 and C5 summaries
  out.C1 = {};
  for (const st of ["LATER", "FIRST"]) { out.C1[st] = {}; for (const a of Object.keys(ARMS)) { const v = ok(st).map((s) => own[s][st][a]).filter((x) => x != null); out.C1[st][a] = { mean: round(mean(v)), ge060: v.filter((x) => x >= 0.6).length, ge065: v.filter((x) => x >= 0.65).length, n: v.length }; } out.C1[st].permQ95Mean = round(mean(ok(st).map((s) => own[s][st].permQ95))); }
  const d5 = (st, a, b) => ok(st).map((s) => own[s][st][a] - own[s][st][b]);
  out.C5 = { LATER_BOTH_plus_RIVALS_minus_RIVALS: { ...bootMean(d5("LATER", "BOTH+RIVALS", "RIVALS")), ge003: d5("LATER", "BOTH+RIVALS", "RIVALS").filter((x) => x >= 0.03).length }, FIRST_LEFT_plus_RIVALS_minus_RIVALS: { ...bootMean(d5("FIRST", "LEFT+RIVALS", "RIVALS")), ge003: d5("FIRST", "LEFT+RIVALS", "RIVALS").filter((x) => x >= 0.03).length } };
  // C2 family transfer
  const famTransfer = (st, a, scheme) => {
    const langs = ok(st), res = {};
    for (const L of langs) {
      const r = rngFor(seedFor("name-company", "fam", L, st, a, scheme));
      const S = langs.filter((x) => x !== L && famOf(x, scheme) === famOf(L, scheme)), O = langs.filter((x) => x !== L && famOf(x, scheme) !== famOf(L, scheme));
      const k = Math.min(S.length, O.length); if (k < 2) continue;
      const test = R[L][key(st)].rows, sa = [], oa = [];
      for (let d = 0; d < 20; d++) {
        const pick = (set) => shuffleIn(set.slice(), r).slice(0, k).flatMap((x) => capPairs(R[x][key(st)].rows, CAP, r));
        const a1 = trainTest(pick(S), test, a), a2 = trainTest(pick(O), test, a);
        if (a1 != null && a2 != null) { sa.push(a1); oa.push(a2); }
      }
      if (sa.length) res[L] = { same: round(mean(sa)), other: round(mean(oa)), diff: round(mean(sa) - mean(oa)), k, family: famOf(L, scheme) };
    }
    const diffs = Object.values(res).map((x) => x.diff), w = diffs.filter((x) => x > 0).length, l = diffs.filter((x) => x < 0).length;
    return { languages: diffs.length, ...bootMean(diffs), sameBeatsOther: w, otherBeatsSame: l, signP: round(signP(w, l)), meanSame: round(mean(Object.values(res).map((x) => x.same))), meanOther: round(mean(Object.values(res).map((x) => x.other))), perLanguage: res };
  };
  out.C2 = { LATER_BOTH_2fam: famTransfer("LATER", "BOTH", 2), LATER_BOTH_3cl: famTransfer("LATER", "BOTH", 3), FIRST_LEFT_2fam: famTransfer("FIRST", "LEFT", 2), FIRST_LEFT_3cl: famTransfer("FIRST", "LEFT", 3), LATER_POSITION_2fam_control: famTransfer("LATER", "POSITION", 2) };
  fs.writeFileSync(path.join(OUT, "partial.json"), JSON.stringify(out));
  // C3 cross-register
  const rI = rngFor(seedFor("name-company", "irc")), days = ircDocs(seedFor("name-company", "irc-days"));
  const ircRows = { LATER: [], FIRST: [] }; let ircPairs = { LATER: 0, FIRST: 0 };
  for (const d of days) for (const st of ["LATER", "FIRST"]) { const pr = pairsOf(d, st, rI, 150); ircRows[st].push(...pr.rows); ircPairs[st] += pr.pairs; }
  const pool = (st, filt) => ok(st).filter(filt).flatMap((s) => capPairs(R[s][key(st)].rows, CAP, rI));
  out.C3 = { days: days.map((d) => d.name), ircPairs, ircPositionControl: { LATER: round(cvAuc(ircRows.LATER, "POSITION")), FIRST: round(cvAuc(ircRows.FIRST, "POSITION")) } };
  for (const [st, a] of [["LATER", "BOTH"], ["FIRST", "LEFT"]]) {
    const t = ircRows[st], f2 = (s) => famOf(s, 2);
    out.C3[st] = { arm: a, udPooledToIrc: round(trainTest(pool(st, () => true), t, a)), udEngToIrc: round(trainTest(pool(st, (s) => s === "eng"), t, a)), udSvoToIrc: round(trainTest(pool(st, (s) => f2(s) === "SVO"), t, a)), udSovToIrc: round(trainTest(pool(st, (s) => f2(s) === "SOV"), t, a)), udPooledToIrcPositionArm: round(trainTest(pool(st, () => true), t, "POSITION")), ircLeaveOneDayOut: round(cvAuc(t, a)), ircToUdEng: R.eng && !own.eng[st].thin ? round(trainTest(t, R.eng[key(st)].rows, a)) : null };
  }
  // C4 company shuffle
  out.C4 = {};
  for (const s of ["eng", "spa", "rus", "fas", "jpn", "tur", "hin", "fin"]) {
    if (!R[s] || own[s].LATER.thin) continue;
    const doc = udDoc(s, true), r = rngFor(seedFor("name-company", s, "shuf")), pr = pairsOf(doc, "LATER", r);
    out.C4[s] = pr.pairs < THIN ? { thin: true } : { pairs: pr.pairs, real: { BOTH: own[s].LATER.BOTH, LEFT: own[s].LATER.LEFT, POSITION: own[s].LATER.POSITION }, shuffled: { BOTH: round(cvAuc(pr.rows, "BOTH")), LEFT: round(cvAuc(pr.rows, "LEFT")), POSITION: round(cvAuc(pr.rows, "POSITION")) } };
  }
  out.seconds = round((Date.now() - t0) / 1000, 1);
  const sha = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  out.headerSha256 = sha; fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ denominators: out.denominators, C1_LATER_BOTH: out.C1.LATER.BOTH, C1_LATER_RIVALS: out.C1.LATER.RIVALS, C1_FIRST_LEFT: out.C1.FIRST.LEFT, C5: out.C5, C2_2fam: { LATER_BOTH: { mean: out.C2.LATER_BOTH_2fam.mean, lo: out.C2.LATER_BOTH_2fam.lo, hi: out.C2.LATER_BOTH_2fam.hi, win: out.C2.LATER_BOTH_2fam.sameBeatsOther, p: out.C2.LATER_BOTH_2fam.signP } }, C3: out.C3, headerSha256: sha }, null, 1));
}
if (args[0] === "run") await main();
