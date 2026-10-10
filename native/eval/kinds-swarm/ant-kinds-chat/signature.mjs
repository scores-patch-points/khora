// signature.mjs — COLLECTOR for K2 / K3 of PREREG.md (the analysis lives in analyse.mjs and reads the jsonl files written here).
//   node signature.mjs --corpus irc --stage dev|conf --part single|joint     (IRC; kinds from results/kindmap.irc.<dev|conf>.json)
//   node signature.mjs --corpus sms|cosem|enron --part single|joint          (no gold: K2 only)
// Run with nohup; one jsonl line per sample row / per (window,class), appended day by day, so a partial run is usable (the analysis reports the days that finished).
// The readers are impact.mjs's three PRIOR-FREE readers, A-DEL, frame-causal F = 0, M = 256 messages (small corpora: min(256, 0.4 x stream)). No gold is a feature.
import fs from "node:fs";
import path from "node:path";
import * as L from "./lib.mjs";
import { impactBatch, makeSnapshot, readWindow, slotStructure, slotDeltas, tokenSlotsOf, sentenceText, DELTA_TYPES, SPAN_LABELS } from "../../law/impact.mjs";

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CORPUS = opt("--corpus", "irc"), STAGE = opt("--stage", "dev"), PART = opt("--part", "single");
const NDAYS = Number(opt("--days", 6)), NK = Number(opt("--nk", 12)), NPOS = Number(opt("--npos", 40)), BN = Number(opt("--bn", 6)), NWIN = Number(opt("--wins", 2));
const FROM = Number(opt("--from", 0)), TO = Number(opt("--to", 99)), SUF = opt("--suffix", "");
const MIN_CLASS = 20, TAG = `${CORPUS}.${STAGE}.${PART}`, FILETAG = TAG + SUF;
fs.mkdirSync(L.RESULTS, { recursive: true });
const OUT = path.join(L.RESULTS, `rows.${FILETAG}.jsonl`), LOG = path.join(L.RESULTS, `rows.${FILETAG}.log`);
const log = (...a) => fs.appendFileSync(LOG, `[${new Date().toISOString().slice(11, 19)}] ${a.join(" ")}\n`);
fs.writeFileSync(OUT, ""); fs.writeFileSync(LOG, "");

// ── kinds and days ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const km = JSON.parse(fs.readFileSync(path.join(L.RESULTS, `kindmap.${CORPUS}.${STAGE === "conf" ? "conf" : "dev"}.json`), "utf8"));
const kindOf = (w) => (w in km.labels ? km.labels[w] : -1), K = km.K;
let days = [], poolNick = new Set(), poolCount = new Map();
if (CORPUS === "irc") {
  const all = L.ircDays().filter((d) => d.split === (STAGE === "conf" ? "CONF" : "DEV")), loaded = all.map(L.loadIrcDay);
  const occ = new Map(), gocc = new Map();
  for (const d of loaded) d.stream.forEach((m, k) => m.forEach((w, i) => { occ.set(w, (occ.get(w) ?? 0) + 1); if (d.gold.has(`${k}:${i}`)) gocc.set(w, (gocc.get(w) ?? 0) + 1); }));
  poolCount = occ; poolNick = new Set([...gocc].filter(([w, g]) => g / occ.get(w) >= 0.5).map(([w]) => w));
  const rnd = L.rngFor(L.seedFor("kinds-chat", STAGE)), elig = loaded.filter((d) => d.n >= 3000).sort(() => rnd() - 0.5).slice(0, NDAYS).sort((a, b) => (a.rel < b.rel ? -1 : 1));
  days = elig.map((d) => ({ name: d.rel, stream: d.stream, gold: d.gold, nickForms: d.nickForms, M: 256 }));
} else {
  const docs = CORPUS === "sms" ? L.loadSmsDocs() : CORPUS === "cosem" ? L.loadCosemDocs() : L.loadEnronDocs(["allen-p"]);
  for (const d of docs) for (const m of d.stream) for (const w of m) poolCount.set(w, (poolCount.get(w) ?? 0) + 1);
  days = L.groupStreams(docs).filter((g) => g.stream.length >= 600).sort((a, b) => b.stream.length - a.stream.length).slice(0, 2).map((g) => ({ ...g, gold: null, nickForms: new Set(), M: Math.min(256, Math.floor(0.4 * g.stream.length)) }));
}
log(TAG, "days", days.map((d) => `${d.name}:${d.stream.length}`).join(" "), "K", K, "prereg", L.preregSha().slice(0, 12));

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const T = DELTA_TYPES.length, SPAN_IX = Object.fromEntries(["births", "losses", "mentionShift", "edgesLost", "edgesBorn"].map((k) => [k, SPAN_LABELS.indexOf(k)]));
function scalars(rec) { // copied from name-rule-informal.mjs impactScores
  const c = rec.counts, at = (fam, band) => { let s = 0; for (let t = 0; t < T; t++) s += c[(fam * 3 + band) * T + t]; return s; };
  let S_OWN = 0; for (let fam = 0; fam < 4; fam++) S_OWN += at(fam, 0);
  let S_ALL = 0; for (const v of c) S_ALL += v;
  const sp = rec.span;
  return { S_ENTRY: at(3, 0) + at(3, 1), S_OWN, S_ALL, S_SPAN: Math.abs(sp[SPAN_IX.births]) + Math.abs(sp[SPAN_IX.losses]) + Math.abs(sp[SPAN_IX.mentionShift]) + Math.abs(sp[SPAN_IX.edgesLost]) + Math.abs(sp[SPAN_IX.edgesBorn]) };
}
function indexDay(day) {
  day.occ = new Map();
  day.stream.forEach((m, s) => m.forEach((w, i) => { (day.occ.get(w) ?? day.occ.set(w, []).get(w)).push([s, i]); }));
  return day;
}
const inWin = (day, w, k) => { const o = day.occ.get(w); let n = 0; for (let j = k - 1; j >= 0 && o[k][0] - o[j][0] <= day.M; j--) n++; return n; };
const shuf = (a, rnd) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

// ── PART single: K2-S sample (stratified by kind) and K3 pairs ────────────────────────────────────────────────────────────────────────────
function sampleDay(day, di) {
  const SEEDTAG = PART === "control" ? `${CORPUS}.${STAGE}.single` : TAG, rnd = L.rngFor(L.seedFor("kinds-chat", "sample", SEEDTAG, di)), rows = new Map();
  const add = (w, k, tag) => { const [s, i] = day.occ.get(w)[k], key = `${s}:${i}`; if (!rows.has(key)) rows.set(key, { day: day.name, s, i, form: w, kind: kindOf(w), k, inWin: inWin(day, w, k), dayCount: day.occ.get(w).length, tags: [] }); rows.get(key).tags.push(tag); };
  const isGold = (w, k) => { const [s, i] = day.occ.get(w)[k]; return day.gold?.has(`${s}:${i}`); };
  const elig = (w, k) => day.occ.get(w)[k][0] >= day.M && inWin(day, w, k) >= 1;
  // K2-S: per kind, NK token occurrences uniform over occurrences (gold name occurrences excluded)
  const byKind = new Map();
  for (const [w, o] of day.occ) { const c = kindOf(w); if (c < 0) continue; for (let k = 0; k < o.length; k++) if (o[k][0] >= day.M && !isGold(w, k) && inWin(day, w, k) >= 1) (byKind.get(c) ?? byKind.set(c, []).get(c)).push([w, k]); }
  for (const [c, cand] of byKind) for (const [w, k] of shuf(cand, rnd).slice(0, NK)) add(w, k, `S${c}`);
  if (!day.gold) return [...rows.values()];
  // K3: positives, NEG-P, NEG-K
  const goldForms = new Set(); for (const key of day.gold) { const [s, i] = key.split(":").map(Number); goldForms.add(day.stream[s][i]); }
  const excluded = (w) => goldForms.has(w) || poolNick.has(w) || day.nickForms.has(w);
  const pos = []; for (const w of goldForms) { if (kindOf(w) < 0) continue; const o = day.occ.get(w); for (let k = 3; k < o.length; k++) if (isGold(w, k) && elig(w, k)) pos.push([w, k]); }
  const negs = []; for (const [w, o] of day.occ) { if (excluded(w) || o.length < 3 || w.length < 2) continue; for (let k = 3; k < o.length; k++) if (elig(w, k)) negs.push([w, k]); }
  const byBin = new Map(), byBinKind = new Map();
  for (const [w, k] of negs) { const b = L.log2bin(day.occ.get(w).length), c = kindOf(w); (byBin.get(b) ?? byBin.set(b, []).get(b)).push([w, k]); const kk = `${b}|${c}`; (byBinKind.get(kk) ?? byBinKind.set(kk, []).get(kk)).push([w, k]); }
  let pid = 0; const rnd2 = L.rngFor(L.seedFor("kinds-chat", "NR", TAG, di)), permMap = PART === "control" ? permutedMaps([...day.occ.keys()])[0] : new Map();
  for (const [w, k] of shuf(pos, rnd).slice(0, NPOS)) {
    const b = L.log2bin(day.occ.get(w).length), id = `${day.name}#${pid++}`;
    const P = byBin.get(b) ?? [], Kc = byBinKind.get(`${b}|${kindOf(w)}`) ?? [];
    if (!P.length) continue;
    add(w, k, `P:${id}`);
    const np = P[Math.floor(rnd() * P.length)]; add(np[0], np[1], `NP:${id}`);
    if (Kc.length) { const nk = Kc[Math.floor(rnd() * Kc.length)]; add(nk[0], nk[1], `NK:${id}`); }
    if (PART === "control" && permMap.has(w)) { // AMENDMENT A1 control: a negative sharing the positive's label under a RANDOM partition of the same sizes (frequency-stratified label permutation)
      const lab = permMap.get(w), R2 = negs.filter(([x]) => permMap.get(x) === lab && L.log2bin(day.occ.get(x).length) === b);
      if (R2.length) { const nr = R2[Math.floor(rnd2() * R2.length)]; add(nr[0], nr[1], `NR:${id}`); }
    }
  }
  return PART === "control" ? [...rows.values()].filter((r) => r.tags.some((t) => t.startsWith("NR:"))) : [...rows.values()];
}

async function runSingle() {
  for (let di = FROM; di < Math.min(days.length, TO + 1); di++) {
    const day = indexDay(days[di]), rows = sampleDay(day, di), t0 = Date.now();
    log(`day ${day.name}: ${rows.length} rows`);
    const first = di === 0 && PART === "single", modes = first ? ["delete", "sham"] : ["delete"];
    const sample = rows.map((r) => ({ s: r.s, i: r.i }));
    const res = impactBatch(day.stream, sample, { M: day.M, F: 0, modes, seedTag: `${TAG}:${di}`, maxSeconds: Infinity, withC: false });
    const recs = res.records.delete;
    let sham = null; if (first) { const sh = res.records.sham.filter(Boolean); sham = { n: sh.length, nullShare: sh.filter((r) => r.isNull).length / Math.max(1, sh.length) }; }
    rows.forEach((r, q) => { const rec = recs[q]; if (!rec || rec.gap) return; fs.appendFileSync(OUT, JSON.stringify({ ...r, block: CORPUS === "irc" ? day.name : `${day.name}:${Math.floor((3 * r.s) / day.stream.length)}`, M: day.M, rec: { sig: rec.sig, atm: rec.atm, counts: rec.counts, isNull: rec.isNull, noSlot: rec.noSlot, extent: rec.extent, hash: rec.hash, ...scalars(rec) } }) + "\n"); });
    // K6 determinism on 15 rows of the first day
    let det = null;
    if (first) { const sub = sample.slice(0, 15), again = impactBatch(day.stream, sub, { M: day.M, F: 0, modes: ["delete"], seedTag: `${TAG}:${di}`, maxSeconds: Infinity, withC: false }).records.delete; det = { same: again.filter((r, q) => r && recs[q] && r.hash === recs[q].hash).length, total: sub.length }; }
    log(`day ${day.name} done ${((Date.now() - t0) / 1000).toFixed(0)} s`, sham ? `sham ${JSON.stringify(sham)}` : "", det ? `determinism ${JSON.stringify(det)}` : "");
  }
}

// ── PART joint: delete ALL tokens of kind c in a window, vs permuted partitions ───────────────────────────────────────────────────────────
const FAM = 4, DIM = FAM * T;
function permutedMaps(forms) { // GLOBAL label permutation among forms inside log2(pool count) strata
  const out = [], assigned = forms.filter((w) => kindOf(w) >= 0);
  for (let r = 0; r < BN; r++) {
    const rnd = L.rngFor(L.seedFor("kinds-chat", "perm", TAG, r)), bins = new Map();
    for (const w of assigned) { const b = L.log2bin(poolCount.get(w) ?? 1); (bins.get(b) ?? bins.set(b, []).get(b)).push(w); }
    const map = new Map();
    for (const ws of bins.values()) { const labs = shuf(ws.map(kindOf), rnd); ws.forEach((w, q) => map.set(w, labs[q])); }
    out.push(map);
  }
  return out;
}
function jointAblate(snap, del) {
  const sents1 = snap.sents.map((sent, k) => sent.filter((_, i) => !del.has(`${k}:${i}`)));
  const reading1 = readWindow(sents1.map(sentenceText), snap.ropts, snap.ceiling ?? null), sd = slotDeltas(snap.sl0, slotStructure(reading1));
  const Iset = new Set(); let noSlot = 0;
  for (const key of del) { const [k, i] = key.split(":").map(Number); const ids = tokenSlotsOf(snap.sl0, snap.sents, k, i); if (!ids.length) noSlot++; ids.forEach((id) => Iset.add(id)); }
  const fam = [0, 0, 0, 0]; for (const id of Iset) { const [, kind, , f] = id.split(":"); fam[kind === "r" ? Number(f) : 3]++; }
  const all = new Array(DIM).fill(0), direct = new Array(DIM).fill(0), coll = new Array(DIM).fill(0); let n = 0, changed = 0;
  for (const r of sd.records) { n++; if (r.type === "unchanged") continue; changed++; const c = r.fam * T + DELTA_TYPES.indexOf(r.type); all[c]++; (r.side === 0 && Iset.has(r.id) ? direct : coll)[c]++; }
  return { counts: all, direct, collateral: coll, changed, considered: n, imprint: fam, noSlot, tokens: del.size, slots: Iset.size };
}
async function runJoint() {
  for (let di = FROM; di < Math.min(days.length, TO + 1); di++) {
    const day = indexDay(days[di]), N = day.stream.length, forms = [...day.occ.keys()], perms = permutedMaps(forms), t0 = Date.now();
    for (let q = 0; q < NWIN; q++) {
      const e = Math.floor(day.M + ((q + 0.5) * (N - day.M)) / NWIN), snap = makeSnapshot(day.stream, e, { M: day.M, F: 0, seedTag: `${TAG}:${di}:${q}` });
      const doClass = (mode, labelOf) => {
        const cls = new Map();
        snap.sents.forEach((sent, k) => sent.forEach((w, i) => { const c = labelOf(w); if (c < 0) return; (cls.get(c) ?? cls.set(c, new Set()).get(c)).add(`${k}:${i}`); }));
        for (const [c, del] of [...cls].sort((a, b) => a[0] - b[0])) { if (del.size < MIN_CLASS) continue; fs.appendFileSync(OUT, JSON.stringify({ day: day.name, di, e, win: q, mode, c, ...jointAblate(snap, del) }) + "\n"); }
      };
      doClass("real", kindOf);
      perms.forEach((pm, r) => doClass(`null${r}`, (w) => (pm.has(w) ? pm.get(w) : -1)));
      log(`day ${day.name} window ${q} (e=${e}) done ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  }
}
if (PART === "single" || PART === "control") await runSingle(); else await runJoint();
log("DONE");
