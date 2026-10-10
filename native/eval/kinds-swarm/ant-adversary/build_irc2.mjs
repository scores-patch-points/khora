// ant-adversary / build_irc.mjs — position-matched IRC nickname impact records. Implements PREREG_IRC_A1.md (amendment: stricter matching, fresh Set A2).
//   node build_irc.mjs --set A|B --part k/n [--debug]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { impactBatch, shuffleSentences, seedFor, rngFor, SPAN_LABELS, DELTA_TYPES } from "../../law/impact.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SET = opt("--set", "A2"), DEBUG = args.includes("--debug");
const [PART, NPART] = opt("--part", "0/1").split("/").map(Number);
const M = 256, CAP = 10, QUOTA = 80, NSHAM = 100, NDET = 30;
const ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
const EXCL = new Set(["kubuntu/2006-07-15", "kubuntu/2008-03-15", "ubuntu/2006-07-15", "ubuntu/2007-03-15", "ubuntu/2009-07-15", "ubuntu/2014-07-15", "ubuntu/2005-03-15", "ubuntu/2005-07-15", "ubuntu/2006-03-15", "ubuntu/2008-03-15", "ubuntu/2008-07-15", "ubuntu/2010-03-15", "ubuntu/2010-07-15", "ubuntu/2012-03-15", "ubuntu/2012-07-15", "ubuntu/2013-03-15"]);
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
const tokensOf = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
const shuffled = (a, rnd) => { const x = a.slice(); for (let k = x.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [x[k], x[j]] = [x[j], x[k]]; } return x; };
const lbk = (n) => (n <= 2 ? n : n <= 4 ? 3 : n <= 8 ? 4 : n <= 16 ? 5 : 6), gbk = (g) => (g <= 1 ? 0 : g <= 4 ? 1 : g <= 16 ? 2 : 3);
const bin2 = (n) => Math.floor(Math.log2(n)), ibucket = (i) => (i <= 2 ? i : i <= 4 ? 3 : i <= 8 ? 4 : 5), round = (x, d = 4) => (typeof x === "number" ? Number(x.toFixed(d)) : x);
function listDays() {
  const A = [], B = [];
  for (const d of ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"]) for (const f of fs.readdirSync(path.join(ROOT, d)).filter((x) => x.endsWith(".txt")).sort()) {
    const head = fs.readFileSync(path.join(ROOT, d, f), "utf8").slice(0, 400), m = /messages: "(\d+)"/.exec(head), k = `${d}/${f.slice(0, -4)}`;
    if (!m || !/lang: "en"/.test(head) || EXCL.has(k)) continue;
    const n = Number(m[1]); if (n >= 1500) A.push(k); else if (n >= 600) B.push(k);
  }
  const A10 = shuffled(A, rngFor(seedFor("adv-irc", "A"))).slice(0, 10).sort();
  return A.filter((k) => !A10.includes(k)).sort();
}
function loadDay(k) {
  const lines = fs.readFileSync(path.join(ROOT, k + ".txt"), "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
  const spoke = new Map(); for (const [, nick] of lines) spoke.set(nick, (spoke.get(nick) ?? 0) + 1);
  const nickForms = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
  const msgs = lines.map(([, nick, text]) => ({ nick: form(nick), toks: tokensOf(text) })).filter((m) => m.toks.length >= 1);
  const tot = new Map(); let T = 0; for (const m of msgs) for (const t of m.toks) { tot.set(t, (tot.get(t) ?? 0) + 1); T += 1; }
  const topic = new Set([...nickForms].filter((n) => (tot.get(n) ?? 0) / T >= 1 / 300));
  const gold = new Set(); msgs.forEach((m, s) => m.toks.forEach((t, i) => { if (nickForms.has(t) && !topic.has(t) && t !== m.nick) gold.add(`${s}:${i}`); }));
  return { k, stream: msgs.map((m) => m.toks), gold, nickForms, tot };
}
function candidates(day) {
  const { stream, gold, nickForms, tot } = day, occ = new Map();
  stream.forEach((sent, s) => sent.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([s, i]); }));
  const pos = [], neg = [];
  for (let s = M; s < stream.length; s++) stream[s].forEach((w, i) => {
    const c = tot.get(w); if (c < 3) return;
    const isPos = gold.has(`${s}:${i}`); if (!isPos && nickForms.has(w)) return;
    const o = occ.get(w), k = o.findIndex(([a, b]) => a === s && b === i);
    let nwin = 0, last16 = 0, last = -1; for (let j = k - 1; j >= 0 && s - o[j][0] <= M; j--) { nwin++; if (last < 0) last = o[j][0]; if (s - o[j][0] <= 16) last16++; }
    if (nwin < 1) return;
    const row = { day: day.k, s, i, id: w, y: isPos ? 1 : 0, init: i === 0 ? 1 : 0, ib: ibucket(i), cb: bin2(c), dayCount: c, nwin, wb: Math.min(3, nwin), lb: lbk(stream[s].length), gb: gbk(s - last), last16, gap: s - last, len: stream[s].length, rate: c / stream.length };
    (isPos ? pos : neg).push(row);
  });
  return { pos, neg };
}
function matchStratum(pos, neg, init, rnd, quota) {
  const cap = (rows) => { const by = new Map(); for (const r of shuffled(rows, rnd)) { const a = by.get(r.id) ?? by.set(r.id, []).get(r.id); if (a.length < CAP) a.push(r); } return [...by.values()].flat(); };
  const P = shuffled(cap(pos.filter((r) => r.init === init)), rnd), N = cap(neg.filter((r) => r.init === init));
  const cell = new Map(); for (const r of shuffled(N, rnd)) { const key = `${r.ib}|${r.cb}|${r.lb}|${r.wb}|${r.gb}`; (cell.get(key) ?? cell.set(key, []).get(key)).push(r); }
  const rows = []; let relaxed = 0, dropped = 0;
  for (const p of P) {
    if (rows.length / 2 >= quota) break;
    let q = cell.get(`${p.ib}|${p.cb}|${p.lb}|${p.wb}|${p.gb}`)?.pop();
    if (!q) for (const d of [-1, 1]) { q = cell.get(`${p.ib}|${p.cb + d}|${p.lb}|${p.wb}|${p.gb}`)?.pop(); if (q) { relaxed++; break; } }
    if (!q) { dropped++; continue; }
    rows.push({ ...p, pair: rows.length / 2 }, { ...q, pair: rows.length / 2 });
  }
  return { rows, relaxed, dropped, posAvailable: P.length, negAvailable: N.length };
}
const SPAN_IX = Object.fromEntries(["births", "losses", "mentionShift", "edgesLost", "edgesBorn"].map((k) => [k, SPAN_LABELS.indexOf(k)]));
function scalars(rec) {
  const c = rec.counts, T = DELTA_TYPES.length, at = (fam, band) => { let s = 0; for (let t = 0; t < T; t++) s += c[(fam * 3 + band) * T + t]; return s; };
  let S_OWN = 0; for (let f = 0; f < 4; f++) S_OWN += at(f, 0); let S_ALL = 0; for (const v of c) S_ALL += v;
  const sp = rec.span;
  return { S_ENTRY: at(3, 0) + at(3, 1), S_OWN, S_ALL, S_SPAN: Math.abs(sp[SPAN_IX.births]) + Math.abs(sp[SPAN_IX.losses]) + Math.abs(sp[SPAN_IX.mentionShift]) + Math.abs(sp[SPAN_IX.edgesLost]) + Math.abs(sp[SPAN_IX.edgesBorn]) };
}
const r5 = (a) => a.map((x) => round(x, 5));
async function doDay(k) {
  const t0 = Date.now(), day = loadDay(k), rnd = rngFor(seedFor("adv-irc", SET, k)), { pos, neg } = candidates(day);
  const I = matchStratum(pos, neg, 1, rnd, DEBUG ? 4 : QUOTA), N = matchStratum(pos, neg, 0, rnd, DEBUG ? 4 : QUOTA);
  const rows = [...I.rows.map((r) => ({ ...r, stratum: "INIT" })), ...N.rows.map((r) => ({ ...r, stratum: "NONINIT" }))];
  const read = (rs, stream, modes) => impactBatch(stream, rs.map((t) => ({ s: t.s, i: t.i })), { M, F: 0, modes, seedTag: `adv:${SET}:${k}`, maxSeconds: Infinity }).records;
  const R = read(rows, day.stream, ["delete"]).delete;
  const sh = shuffleSentences(day.stream, seedFor("adv-irc", "shuffle", k));
  const shRows = rows.map((t) => { const o = day.stream[t.s]; let ord = 0; for (let j = 0; j < t.i; j++) if (o[j] === t.id) ord++; let seen = 0, p = -1; sh[t.s].forEach((w, j) => { if (p < 0 && w === t.id) { if (seen === ord) p = j; seen++; } }); return { ...t, i: p }; });
  const RS = read(shRows, sh, ["delete"]).delete;
  const nS = Math.min(Math.ceil(NSHAM / 10), rows.length), shamIdx = Array.from({ length: nS }, (_, q) => Math.floor(q * rows.length / nS));
  const sham = read(shamIdx.map((q) => rows[q]), day.stream, ["sham"]).sham;
  const det = read(rows.slice(0, 3), day.stream, ["delete"]).delete;
  const out = rows.map((t, q) => ({ ...t, isNull: R[q].isNull, noSlot: R[q].noSlot, ext: R[q].extent?.tokens ?? 0, hash: R[q].hash, sig: r5(R[q].sig), atm: r5(R[q].atm), span: r5(R[q].span), c: r5(R[q].c), ...scalars(R[q]), sigS: r5(RS[q].sig), atmS: r5(RS[q].atm), spanS: r5(RS[q].span), cS: r5(RS[q].c), isNullS: RS[q].isNull, iS: shRows[q].i }));
  const res = { day: k, set: SET, M, msgs: day.stream.length, candidates: { pos: pos.length, neg: neg.length, posInit: pos.filter((r) => r.init).length }, INIT: { pairs: I.rows.length / 2, relaxed: I.relaxed, dropped: I.dropped, posAvailable: I.posAvailable }, NONINIT: { pairs: N.rows.length / 2, relaxed: N.relaxed, dropped: N.dropped, posAvailable: N.posAvailable }, sham: { n: sham.length, nullShare: round(sham.filter((r) => r.isNull).length / sham.length) }, determinism: { same: det.filter((r, q) => r.hash === R[q].hash).length, total: det.length }, seconds: round((Date.now() - t0) / 1000, 1), rows: out };
  fs.writeFileSync(path.join(HERE, "data", "irc", `${DEBUG ? "debug-" : ""}${SET}-${k.replace("/", "_")}.json`), JSON.stringify(res));
  console.log(JSON.stringify({ day: k, pairsInit: res.INIT.pairs, pairsNon: res.NONINIT.pairs, sham: res.sham.nullShare, det: res.determinism, seconds: res.seconds }));
}
const days = listDays().filter((_, q) => q % NPART === PART);
console.error(`set ${SET} part ${PART}/${NPART}: ${days.join(", ")}`);
for (const k of days) await doDay(k);
