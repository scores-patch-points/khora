// eval/kinds-swarm/ant-shape/collect.mjs — collect the FULL single-token impact record (sig85 atm19 span32 c8) for PROPN vs matched open-class tokens
// (UD DEV, 25 stems), for IRC nicknames vs matched forms, and the same tokens on within-sentence-SHUFFLED text. Records go to JSON; analysis is offline
// (analyse.mjs). Pre-registration: PREREG.md (sha256 in PREREG.sha256). Zero-model: no LLM, no prior, no capital; gold only selects tokens.
//
//   node collect.mjs ud     [--stems a,b] [--n 200] [--out DIR] [--shuffle]
//   node collect.mjs irc    [--n 300] [--files 6] [--out DIR] [--shuffle]
//   node collect.mjs checks [--out DIR]          (K1 sham on 40 tokens, K6 determinism on 40 tokens, English + IRC)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readConlluStream, impactBatch, seedFor, rngFor, shuffleSentences } from "../../law/impact.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UD_EVAL = "/private/tmp/claude-501/ud-eval";
const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SHUFFLE = args.includes("--shuffle");
const NPAIR = Number(opt("--n", cmd === "irc" ? 300 : 200));
const NFILES = Number(opt("--files", 6));
const OUT = opt("--out", path.join(HERE, "data"));
const DOCS = opt("--docs", null)?.split(",").map(Number) ?? null;
const STEMS = opt("--stems", null)?.split(",") ?? STEMS25;
const FORM_CAP = 5, OPEN = new Set(["NOUN", "VERB", "ADJ"]);
const bin = (n) => Math.floor(Math.log2(Math.max(1, n)));
const r5 = (x) => (typeof x === "number" ? Number(x.toFixed(5)) : x);
const arr5 = (a) => Array.from(a, r5);

// ── causal rivals (no ablation; counted from the prefix / causal window of the stream the reader sees) ─────────────────────────────────────────
export const RIVAL_LABELS = ["logWinBefore", "logPrefix", "logGap", "logWinSents", "burst", "logLast16", "logLeftWinFreq", "logRightWinFreq", "leftDiv", "rightDiv", "sameLeft", "sameRight", "sentInitial", "sentFinal", "logSentLen", "logWordLen"];
function indexStream(stream) {
  const occ = new Map();
  stream.forEach((sent, s) => sent.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([s, i]); }));
  return occ;
}
function rivalsOf(stream, occ, M, s, i) {
  const w = stream[s][i], o = occ.get(w);
  const k = o.findIndex(([a, b]) => a === s && b === i);
  const len = stream[s].length;
  const left = i > 0 ? stream[s][i - 1] : null, right = i + 1 < len ? stream[s][i + 1] : null;
  const winCount = (word) => { if (word == null) return 0; let c = 0; for (const [a] of occ.get(word)) if (a >= s - M && a <= s) c += 1; return c; };
  let cWin = 0, last16 = 0, sameL = 0, sameR = 0;
  const sentSet = new Set(), lset = new Set(), rset = new Set();
  for (let j = k - 1; j >= 0; j--) {
    const [a, b] = o[j]; if (s - a > M) break;
    cWin += 1; if (s - a <= 16) last16 += 1; sentSet.add(a);
    const l = b > 0 ? stream[a][b - 1] : null, r = b + 1 < stream[a].length ? stream[a][b + 1] : null;
    lset.add(l); rset.add(r); if (l === left) sameL += 1; if (r === right) sameR += 1;
  }
  const gap = cWin > 0 ? s - o[k - 1][0] : M + 1;
  const rate = k / Math.max(1, s);
  const v = [Math.log1p(cWin), Math.log1p(k), Math.log1p(gap), Math.log1p(sentSet.size), Math.log((last16 + 0.5) / (rate * 16 + 0.5)), Math.log1p(last16),
    Math.log1p(winCount(left)), Math.log1p(winCount(right)), cWin ? lset.size / cWin : 0, cWin ? rset.size / cWin : 0, cWin ? sameL / cWin : 0, cWin ? sameR / cWin : 0,
    i === 0 ? 1 : 0, i === len - 1 ? 1 : 0, Math.log1p(len), Math.log(Math.max(1, w.length))];
  return arr5(v);
}
const slim = (rec, rivals, extra) => ({ ...extra, sig: arr5(rec.sig), atm: arr5(rec.atm), span: arr5(rec.span), c: arr5(rec.c), counts: rec.counts.map((x) => Math.round(x)), isNull: rec.isNull, noSlot: rec.noSlot, nTokenSlots: rec.nTokenSlots, extent: { tokens: rec.extent.tokens, frames: rec.extent.frames, radius: rec.extent.radius }, hash: rec.hash, rivals });

// ── within-sentence shuffle with a tracked permutation (uses impact.mjs shuffleSentences on index-tagged tokens) ───────────────────────────────
function shuffleTracked(stream, seed) {
  const TAG = "\u0001";
  const tagged = stream.map((s) => s.map((w, i) => `${w}${TAG}${i}`));
  const sh = shuffleSentences(tagged, seed);
  const newIndex = stream.map((s) => new Array(s.length));
  const out = sh.map((s, k) => s.map((t, j) => { const [w, i] = t.split(TAG); newIndex[k][Number(i)] = j; return w; }));
  return { stream: out, newIndex };
}

// ── UD sampling (copied from eval/law/name-shape.mjs, plus a per-form cap) ──────────────────────────────────────────────────────────────────────────
function sampleUd(stem, sents, upos, M, N) {
  const rnd = rngFor(seedFor("ant-shape", stem));
  const freq = new Map(); for (const s of sents) for (const w of s) freq.set(w, (freq.get(w) ?? 0) + 1);
  const occ = indexStream(sents);
  const recurs = (w, s) => { let c = 0; for (const [os] of occ.get(w)) if (os <= s && s - os <= M) c += 1; return c >= 2; };
  const P = [], O = new Map();
  sents.forEach((s, si) => { if (si < M) return; s.forEach((w, i) => { if (!recurs(w, si)) return; if (upos[si][i] === "PROPN") P.push([si, i, w]); else if (OPEN.has(upos[si][i])) { const b = bin(freq.get(w)); (O.get(b) ?? O.set(b, []).get(b)).push([si, i, w]); } }); });
  const shuf = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const pcount = new Map(), ncount = new Map(), used = new Set(), picked = [];
  for (const [si, i, w] of shuf(P)) {
    if (picked.length >= 2 * NPAIR) break;
    if ((pcount.get(w) ?? 0) >= FORM_CAP) continue;
    const pool = (O.get(bin(freq.get(w))) ?? []).filter(([sj, j, v]) => !used.has(`${sj}:${j}`) && (ncount.get(v) ?? 0) < FORM_CAP);
    if (!pool.length) continue;
    const [sj, j, v] = pool[Math.floor(rnd() * pool.length)];
    used.add(`${sj}:${j}`); pcount.set(w, (pcount.get(w) ?? 0) + 1); ncount.set(v, (ncount.get(v) ?? 0) + 1);
    picked.push({ s: si, i, id: w, y: 1, upos: "PROPN" }, { s: sj, i: j, id: v, y: 0, upos: upos[sj][j] });
  }
  return picked;
}

async function collectStem(stem) {
  const file = path.join(UD_EVAL, stem, "dev.conllu");
  if (!fs.existsSync(file)) return { stem, gap: "no_gold" };
  const { sents, upos } = readConlluStream(file);
  const N = sents.length, M = Math.min(128, Math.floor(N / 5));
  if (M < 20) return { stem, gap: "too_short", N };
  const picked = sampleUd(stem, sents, upos, M, N);
  let stream = sents, rows = picked;
  if (SHUFFLE) {
    const sh = shuffleTracked(sents, seedFor("ant-shape", stem, "shuffle"));
    stream = sh.stream; rows = picked.map((t) => ({ ...t, i: sh.newIndex[t.s][t.i] }));
  }
  const occ = indexStream(stream);
  const t0 = Date.now();
  const res = impactBatch(stream, rows.map((t) => ({ s: t.s, i: t.i, id: t.id })), { M, F: 0, modes: ["delete"], seedTag: `ant-shape:${stem}`, withC: true });
  const out = [];
  let gaps = 0;
  rows.forEach((t, k) => {
    const rec = res.records.delete[k];
    if (!rec || rec.gap) { gaps += 1; return; }
    out.push(slim(rec, rivalsOf(stream, occ, M, t.s, t.i), { s: t.s, i: t.i, id: t.id, y: t.y, upos: t.upos, formBlock: seedFor("form", stem, t.id) % 8, posBlock: Math.min(7, Math.floor(((t.s - M) / Math.max(1, N - M)) * 8)) }));
  });
  return { stem, N, M, shuffle: SHUFFLE, pairsRequested: NPAIR, rows: out, gaps, cost: res.cost, seconds: (Date.now() - t0) / 1000 };
}

// ── IRC (copied from eval/law/name-rule-informal.mjs loadIrc / drawSample) ─────────────────────────────────────────────────────────────────────────
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
const tokensOf = (text) => [...String(text).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
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
  const docs = [];
  files.forEach((f, fi) => {
    const lines = fs.readFileSync(f, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
    const spoke = new Map();
    for (const [, nick] of lines) spoke.set(nick, (spoke.get(nick) ?? 0) + 1);
    const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    const nickForms = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
    const tot = new Map(); let totalTokens = 0;
    const msgs = lines.map(([, nick, text]) => ({ nick: form(nick), toks: tokensOf(text) })).filter((m) => m.toks.length >= 1);
    for (const m of msgs) for (const t of m.toks) { tot.set(t, (tot.get(t) ?? 0) + 1); totalTokens += 1; }
    const topic = new Set([...nickForms].filter((n) => (tot.get(n) ?? 0) / totalTokens >= 1 / 300));
    const stream = [], pos = new Set();
    msgs.forEach((m, k) => { stream.push(m.toks); m.toks.forEach((t, i) => { if (nickForms.has(t) && !topic.has(t) && t !== m.nick) pos.add(`${k}:${i}`); }); });
    docs.push({ name: path.relative(IRC_ROOT, f), stream, pos, fi });
  });
  return docs;
}
function drawIrc(doc, n, seed, M) {
  const { stream, pos } = doc;
  const occ = indexStream(stream); doc.occ = occ;
  const rnd = rngFor(seed), pick = (a) => a[Math.floor(rnd() * a.length)];
  const goldForm = new Set(); for (const k of pos) { const [s, i] = k.split(":").map(Number); goldForm.add(stream[s][i]); }
  const full = (s) => s >= M;
  const posOcc = (w) => occ.get(w).map(([s, i], k) => ({ s, i, k })).filter((o) => pos.has(`${o.s}:${o.i}`));
  const goldForms = [...goldForm].filter((w) => posOcc(w).length);
  const negForms = [...occ].filter(([w, o]) => !goldForm.has(w) && o.length >= 3 && w.length >= 2).map(([w]) => w);
  const negByBin = new Map(); for (const w of negForms) { const b = bin(occ.get(w).length); (negByBin.get(b) ?? negByBin.set(b, []).get(b)).push(w); }
  const later = []; let guard = 0;
  while (later.length < n * 2 && guard++ < n * 60 && goldForms.length) {
    const w = pick(goldForms), po = posOcc(w).filter((o) => o.k >= 3 && full(o.s));
    if (!po.length) continue;
    const pool = (negByBin.get(bin(occ.get(w).length)) ?? []).filter((x) => occ.get(x).some((o, k) => k >= 3 && full(o[0])));
    if (!pool.length) continue;
    const nw = pick(pool), no = occ.get(nw).map(([s, i], k) => ({ s, i, k })).filter((o) => o.k >= 3 && full(o.s));
    const a = pick(po), b = pick(no);
    later.push({ s: a.s, i: a.i, id: w, y: 1 }, { s: b.s, i: b.i, id: nw, y: 0 });
  }
  return later;
}
async function collectIrc() {
  const M = 256, seed = seedFor("name-rule-informal", "irc");
  const docs = loadIrc(seed);
  const perDoc = Math.max(1, Math.ceil(NPAIR / docs.length));
  const out = [], meta = { files: docs.map((d) => d.name), messages: docs.map((d) => d.stream.length), positivesAll: docs.map((d) => d.pos.size) };
  let gaps = 0; const t0 = Date.now();
  for (const [di, d] of docs.entries()) {
    if (DOCS && !DOCS.includes(di)) continue;
    const picked = drawIrc(d, perDoc, seed + 5 + di, M);
    let stream = d.stream, rows = picked;
    if (SHUFFLE) { const sh = shuffleTracked(d.stream, seedFor("ant-shape", "irc", "shuffle", di)); stream = sh.stream; rows = picked.map((t) => ({ ...t, i: sh.newIndex[t.s][t.i] })); }
    const occ = indexStream(stream);
    const res = impactBatch(stream, rows.map((t) => ({ s: t.s, i: t.i, id: t.id })), { M, F: 0, modes: ["delete"], seedTag: `irc:${di}`, withC: true });
    rows.forEach((t, k) => {
      const rec = res.records.delete[k];
      if (!rec || rec.gap) { gaps += 1; return; }
      out.push(slim(rec, rivalsOf(stream, occ, M, t.s, t.i), { s: t.s, i: t.i, id: t.id, y: t.y, upos: null, doc: di, formBlock: seedFor("form", "irc", t.id) % 8, posBlock: di, N: d.stream.length }));
    });
    console.error(`irc doc ${di}/${docs.length}: ${rows.length} rows, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  return { corpus: "irc", M, shuffle: SHUFFLE, pairsRequested: NPAIR, meta, rows: out, gaps, seconds: (Date.now() - t0) / 1000 };
}

// ── checks: K1 sham, K6 determinism ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function checks() {
  const res = {};
  const { sents, upos } = readConlluStream(path.join(UD_EVAL, "eng", "dev.conllu"));
  const N = sents.length, M = Math.min(128, Math.floor(N / 5));
  const picked = sampleUd("eng", sents, upos, M, N).slice(0, 40).map((t) => ({ s: t.s, i: t.i, id: t.id }));
  const a = impactBatch(sents, picked, { M, F: 0, modes: ["delete", "sham"], seedTag: "ant-shape:eng", withC: true });
  const b = impactBatch(sents, picked, { M, F: 0, modes: ["delete"], seedTag: "ant-shape:eng", withC: true });
  res.eng = { n: picked.length, shamNullShare: a.records.sham.filter((r) => r && r.isNull).length / picked.length, determinismSame: a.records.delete.filter((r, k) => r?.hash === b.records.delete[k]?.hash).length, deleteNonNull: a.records.delete.filter((r) => r && !r.isNull).length };
  const docs = loadIrc(seedFor("name-rule-informal", "irc"));
  const d = docs[0]; const pk = drawIrc(d, 20, 7, 256).slice(0, 40).map((t) => ({ s: t.s, i: t.i, id: t.id }));
  const a2 = impactBatch(d.stream, pk, { M: 256, F: 0, modes: ["delete", "sham"], seedTag: "irc:0", withC: true });
  const b2 = impactBatch(d.stream, pk, { M: 256, F: 0, modes: ["delete"], seedTag: "irc:0", withC: true });
  res.irc = { n: pk.length, shamNullShare: a2.records.sham.filter((r) => r && r.isNull).length / pk.length, determinismSame: a2.records.delete.filter((r, k) => r?.hash === b2.records.delete[k]?.hash).length, deleteNonNull: a2.records.delete.filter((r) => r && !r.isNull).length };
  return res;
}

fs.mkdirSync(OUT, { recursive: true });
if (cmd === "ud") {
  for (const stem of STEMS) {
    const file = path.join(OUT, SHUFFLE ? "ud-shuffled" : "ud", `${stem}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file) && !args.includes("--force")) { console.error(`${stem}: exists, skipped`); continue; }
    const r = await collectStem(stem);
    fs.writeFileSync(file, JSON.stringify(r));
    console.error(`${stem}: ${r.gap ?? `${r.rows.length} rows (${r.rows.filter((x) => x.y).length} pos), M=${r.M}, ${r.seconds.toFixed(0)}s, gaps ${r.gaps}`}`);
  }
} else if (cmd === "irc") {
  const r = await collectIrc();
  fs.writeFileSync(path.join(OUT, (SHUFFLE ? "irc-shuffled" : "irc") + (DOCS ? `.part${DOCS.join("")}` : "") + ".json"), JSON.stringify(r));
  console.error(`irc: ${r.rows.length} rows, ${r.seconds.toFixed(0)}s`);
} else if (cmd === "mergeirc") {
  for (const tag of ["irc", "irc-shuffled"]) {
    const parts = fs.readdirSync(OUT).filter((f) => f.startsWith(tag + ".part") && f.endsWith(".json")).sort();
    if (!parts.length) continue;
    const ps = parts.map((f) => JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")));
    const m = { ...ps[0], rows: ps.flatMap((p) => p.rows), gaps: ps.reduce((a, p) => a + p.gaps, 0), seconds: ps.reduce((a, p) => a + p.seconds, 0), parts };
    fs.writeFileSync(path.join(OUT, tag + ".json"), JSON.stringify(m)); console.error(tag, parts.length, "parts,", m.rows.length, "rows");
  }
} else if (cmd === "checks") {
  const r = await checks();
  fs.writeFileSync(path.join(OUT, "checks.json"), JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r));
} else { console.error("commands: ud | irc | checks"); process.exit(2); }
