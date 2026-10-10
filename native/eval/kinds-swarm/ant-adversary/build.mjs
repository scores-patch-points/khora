// ant-adversary / build.mjs — independent kind induction (k-means on neighbour vectors) + impact records. See PREREG.md (read it first; this file only implements it).
//   node build.mjs --corpus eng|spa|rus|fas|jpn|tur|irc [--debug] [--out DIR]
// --debug uses UD DEV (not the evaluation data) / a tiny IRC sample to check the plumbing; it writes data/debug-*.json and is never evaluated.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { readConlluStream, impactBatch, shuffleSentences, seedFor, rngFor, SPAN_LABELS, DELTA_TYPES } from "../../law/impact.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CORPUS = opt("--corpus", "eng"), DEBUG = args.includes("--debug");
const OUT = opt("--out", path.join(HERE, "data"));
const IS_IRC = CORPUS === "irc";
const M = IS_IRC ? 256 : 128;
const MIN_MENT = 8, N_CTX = 150, KGRID = [3, 4, 6, 8], RESTARTS = 8, ITERS = 100, BLOCK = 10, SPLITS = 3, SHUF = 5;
const CAP_FORM = 10, NPOS = DEBUG ? 20 : IS_IRC ? 400 : 300, NSHAM = DEBUG ? 8 : 100, NDET = DEBUG ? 6 : 30;
const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
const EXCLUDED_IRC = ["kubuntu/2006-07-15.txt", "kubuntu/2008-03-15.txt", "ubuntu/2006-07-15.txt", "ubuntu/2007-03-15.txt", "ubuntu/2009-07-15.txt", "ubuntu/2014-07-15.txt"];
const CTRL_UPOS = new Set(["NOUN", "VERB", "ADJ", "ADV", "NUM", "ADP", "DET", "AUX", "PRON", "CCONJ", "SCONJ", "PART", "INTJ"]);
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const bin2 = (n) => Math.floor(Math.log2(n));
const shuffled = (a, rnd) => { const x = a.slice(); for (let k = x.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [x[k], x[j]] = [x[j], x[k]]; } return x; };

// ── corpora ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
const tokensOf = (text) => [...String(text).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
function loadUD(stem) {
  const file = DEBUG ? `/private/tmp/claude-501/ud-eval/${stem}/dev.conllu` : `/private/tmp/claude-501/fold80B/${stem}/tail.conllu`;
  const { sents, upos } = readConlluStream(file);
  return { docs: [{ name: `${stem}:${DEBUG ? "dev" : "fold80B-tail"}`, stream: sents, upos, H: Math.floor(sents.length / 2) }], meta: { file } };
}
function loadIrc() {
  const cands = [];
  for (const d of ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"]) {
    const dir = path.join(IRC_ROOT, d); if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt")).sort()) {
      const head = fs.readFileSync(path.join(dir, f), "utf8").slice(0, 400), m = /messages: "(\d+)"/.exec(head);
      if (m && Number(m[1]) >= 1500 && /lang: "en"/.test(head) && !EXCLUDED_IRC.includes(`${d}/${f}`)) cands.push(`${d}/${f}`);
    }
  }
  const rnd = rngFor(seedFor("adversary", "irc-days"));
  const files = shuffled(cands, rnd).slice(0, DEBUG ? 2 : 8).sort();
  const docs = []; const meta = { files, candidates: cands.length, nicks: 0, positives: 0 };
  for (const f of files) {
    const lines = fs.readFileSync(path.join(IRC_ROOT, f), "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
    const spoke = new Map(); for (const [, nick] of lines) spoke.set(nick, (spoke.get(nick) ?? 0) + 1);
    const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    const nickForms = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
    const msgs = lines.map(([, nick, text]) => ({ nick: form(nick), toks: tokensOf(text) })).filter((m) => m.toks.length >= 1);
    const tot = new Map(); let totalTokens = 0; for (const m of msgs) for (const t of m.toks) { tot.set(t, (tot.get(t) ?? 0) + 1); totalTokens += 1; }
    const topic = new Set([...nickForms].filter((n) => (tot.get(n) ?? 0) / totalTokens >= 1 / 300));
    const pos = new Set();
    msgs.forEach((m, k) => m.toks.forEach((t, i) => { if (nickForms.has(t) && !topic.has(t) && t !== m.nick) pos.add(`${k}:${i}`); }));
    meta.nicks += nickForms.size; meta.positives += pos.size;
    docs.push({ name: f, stream: msgs.map((m) => m.toks), upos: null, pos, nickForms, H: Math.floor(msgs.length / 2) });
  }
  return { docs, meta };
}

// ── kind induction (own): k-means on Hellinger left/right neighbour vectors ─────────────────────────────────────────────────────────────
function kmeans(X, K, seed) {
  const n = X.length, d = X[0].length, rnd = rngFor(seed);
  let best = null;
  const dist2 = (a, b) => { let s = 0; for (let k = 0; k < d; k++) { const t = a[k] - b[k]; s += t * t; } return s; };
  for (let r = 0; r < RESTARTS; r++) {
    const cent = [X[Math.floor(rnd() * n)].slice()], d2 = new Float64Array(n).fill(Infinity);
    while (cent.length < K) {
      let tot = 0; for (let q = 0; q < n; q++) { d2[q] = Math.min(d2[q], dist2(X[q], cent[cent.length - 1])); tot += d2[q]; }
      let u = rnd() * tot, pick = n - 1; for (let q = 0; q < n; q++) { u -= d2[q]; if (u <= 0) { pick = q; break; } }
      cent.push(X[pick].slice());
    }
    let lab = new Int32Array(n).fill(-1), inertia = 0;
    for (let it = 0; it < ITERS; it++) {
      let changed = 0; inertia = 0;
      for (let q = 0; q < n; q++) { let bk = 0, bd = Infinity; for (let k = 0; k < K; k++) { const dd = dist2(X[q], cent[k]); if (dd < bd) { bd = dd; bk = k; } } if (lab[q] !== bk) { lab[q] = bk; changed++; } inertia += bd; }
      if (!changed) break;
      const sum = Array.from({ length: K }, () => new Float64Array(d)), cnt = new Int32Array(K);
      for (let q = 0; q < n; q++) { cnt[lab[q]]++; for (let k = 0; k < d; k++) sum[lab[q]][k] += X[q][k]; }
      for (let k = 0; k < K; k++) { if (!cnt[k]) { cent[k] = X[Math.floor(rnd() * n)].slice(); continue; } for (let q = 0; q < d; q++) cent[k][q] = sum[k][q] / cnt[k]; }
    }
    if (!best || inertia < best.inertia) best = { lab: Array.from(lab), inertia };
  }
  return best.lab;
}
function ari(a, b) {
  const n = a.length, ca = new Map(), cb = new Map(), cab = new Map();
  const c2 = (x) => x * (x - 1) / 2;
  for (let q = 0; q < n; q++) { ca.set(a[q], (ca.get(a[q]) ?? 0) + 1); cb.set(b[q], (cb.get(b[q]) ?? 0) + 1); const k = a[q] + "|" + b[q]; cab.set(k, (cab.get(k) ?? 0) + 1); }
  let sij = 0; for (const v of cab.values()) sij += c2(v);
  let sa = 0; for (const v of ca.values()) sa += c2(v);
  let sb = 0; for (const v of cb.values()) sb += c2(v);
  const exp = sa * sb / c2(n), mx = (sa + sb) / 2;
  return mx === exp ? 0 : (sij - exp) / (mx - exp);
}
function nmi(a, b) {
  const n = a.length, ca = new Map(), cb = new Map(), cab = new Map();
  for (let q = 0; q < n; q++) { ca.set(a[q], (ca.get(a[q]) ?? 0) + 1); cb.set(b[q], (cb.get(b[q]) ?? 0) + 1); const k = a[q] + "|" + b[q]; cab.set(k, (cab.get(k) ?? 0) + 1); }
  const H = (m) => { let h = 0; for (const v of m.values()) h -= (v / n) * Math.log(v / n); return h; };
  let mi = 0; for (const [k, v] of cab) { const [x, y] = k.split("|"); mi += (v / n) * Math.log((v / n) / ((ca.get(isNaN(+x) ? x : +x) / n) * (cb.get(isNaN(+y) ? y : +y) / n))); }
  const ha = H(ca), hb = H(cb); return ha > 0 && hb > 0 ? mi / Math.sqrt(ha * hb) : 0;
}
function vectorsOf(sents, rowForms, ctxIdx) {
  const V = ctxIdx.size + 2, rowOf = new Map(rowForms.map((f, k) => [f, k]));
  const L = rowForms.map(() => new Float64Array(V)), R = rowForms.map(() => new Float64Array(V));
  const OTHER = ctxIdx.size, EDGE = ctxIdx.size + 1;
  for (const s of sents) for (let i = 0; i < s.length; i++) {
    const r = rowOf.get(s[i]); if (r === undefined) continue;
    L[r][i > 0 ? (ctxIdx.get(s[i - 1]) ?? OTHER) : EDGE] += 1; R[r][i < s.length - 1 ? (ctxIdx.get(s[i + 1]) ?? OTHER) : EDGE] += 1;
  }
  return rowForms.map((f, r) => {
    const sl = L[r].reduce((a, b) => a + b, 0), sr = R[r].reduce((a, b) => a + b, 0);
    const v = new Float64Array(2 * V);
    for (let k = 0; k < V; k++) { v[k] = sl ? Math.sqrt(L[r][k] / sl) / Math.SQRT2 : 0; v[V + k] = sr ? Math.sqrt(R[r][k] / sr) / Math.SQRT2 : 0; }
    return v;
  });
}
function induceKinds(indSents, corpus) {
  const count = new Map(); for (const s of indSents) for (const w of s) count.set(w, (count.get(w) ?? 0) + 1);
  const byCount = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
  const ctxIdx = new Map([...count].sort(byCount).slice(0, N_CTX).map(([w], k) => [w, k]));
  const rowForms = [...count].filter(([, c]) => c >= MIN_MENT).sort(byCount).map(([w]) => w);
  const out = { nForms: rowForms.length, count, rowForms };
  // split-half stability
  const nb = Math.ceil(indSents.length / BLOCK);
  const halves = [];
  for (let sp = 0; sp < SPLITS; sp++) {
    const rnd = rngFor(seedFor("adversary", corpus, "split", sp)), order = shuffled(Array.from({ length: nb }, (_, k) => k), rnd);
    const inA = new Set(order.slice(0, Math.floor(nb / 2)));
    halves.push([indSents.filter((_, k) => inA.has(Math.floor(k / BLOCK))), indSents.filter((_, k) => !inA.has(Math.floor(k / BLOCK)))]);
  }
  const cnt2 = (ss) => { const c = new Map(); for (const s of ss) for (const w of s) c.set(w, (c.get(w) ?? 0) + 1); return c; };
  const commonOf = (A, B) => { const ca = cnt2(A), cb = cnt2(B); return rowForms.filter((w) => (ca.get(w) ?? 0) >= 3 && (cb.get(w) ?? 0) >= 3); };
  const commons = halves.map(([A, B]) => commonOf(A, B));
  const stab = (K, halvesUse, commonsUse) => {
    let tot = 0, n = 0;
    halvesUse.forEach(([A, B], sp) => { const F = commonsUse[sp]; if (F.length < Math.max(K * 4, 12)) return; const pa = kmeans(vectorsOf(A, F, ctxIdx), K, seedFor("adversary", corpus, "stabA", K, sp)), pb = kmeans(vectorsOf(B, F, ctxIdx), K, seedFor("adversary", corpus, "stabB", K, sp)); tot += ari(pa, pb); n += 1; });
    return n ? tot / n : null;
  };
  const maxK = Math.floor(rowForms.length / 12);
  out.stability = [];
  for (const K of KGRID) {
    if (K > maxK) { out.stability.push({ K, skipped: "K > nForms/12" }); continue; }
    const real = stab(K, halves, commons), nulls = [];
    for (let h = 0; h < SHUF; h++) { const sh = shuffleSentences(indSents, seedFor("adversary", corpus, "shuf", h)); const hs = halves.map((_, sp) => { const nbk = Math.ceil(sh.length / BLOCK); const rnd = rngFor(seedFor("adversary", corpus, "split", sp)), order = shuffled(Array.from({ length: nbk }, (_, k) => k), rnd); const inA = new Set(order.slice(0, Math.floor(nbk / 2))); return [sh.filter((_, k) => inA.has(Math.floor(k / BLOCK))), sh.filter((_, k) => !inA.has(Math.floor(k / BLOCK)))]; }); const v = stab(K, hs, commons); if (v != null) nulls.push(v); }
    const meanNull = nulls.length ? nulls.reduce((a, b) => a + b, 0) / nulls.length : null, maxNull = nulls.length ? Math.max(...nulls) : null;
    out.stability.push({ K, ariReal: round(real), ariShufMean: round(meanNull), ariShufMax: round(maxNull), excess: real == null || meanNull == null ? null : round(real - meanNull), passes: real != null && maxNull != null && real > maxNull });
  }
  const valid = out.stability.filter((x) => x.excess != null);
  const bestK = valid.length ? valid.slice().sort((a, b) => b.excess - a.excess || a.K - b.K)[0] : null;
  out.K = bestK ? bestK.K : null; out.K1pass = bestK ? !!bestK.passes && bestK.excess > 0 : false;
  const Kuse = out.K ?? (maxK >= 3 ? 3 : null);
  out.Kused = Kuse; out.Kfallback = out.K == null;
  if (Kuse == null) { out.kindOf = new Map(); return out; }
  const lab = kmeans(vectorsOf(indSents, rowForms, ctxIdx), Kuse, seedFor("adversary", corpus, "final", Kuse));
  out.kindOf = new Map(rowForms.map((w, k) => [w, lab[k]]));
  return out;
}

// ── sampling ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function sampleRows(corpusDocs, kindOf, count, seed) {
  const rnd = rngFor(seed);
  const pos = [], ctrl = [];
  corpusDocs.forEach((doc, di) => {
    const { stream, H } = doc, occ = new Map();
    stream.forEach((sent, s) => sent.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([s, i]); }));
    for (let s = Math.max(H, M); s < stream.length; s++) {
      const sent = stream[s];
      for (let i = 0; i < sent.length; i++) {
        const w = sent[i], kind = kindOf.get(w); if (kind === undefined) continue;
        const o = occ.get(w); let k = o.findIndex(([a, b]) => a === s && b === i);
        let nwin = 0, last = -1; for (let j = k - 1; j >= 0 && s - o[j][0] <= M; j--) { nwin++; if (last < 0) last = o[j][0]; }
        if (nwin < 1) continue;
        let y = null, upos = null;
        if (doc.upos) { upos = doc.upos[s][i]; if (upos === "PROPN") y = 1; else if (CTRL_UPOS.has(upos)) y = 0; }
        else { if (doc.pos.has(`${s}:${i}`)) y = 1; else if (!doc.nickForms.has(w)) y = 0; }
        if (y == null) continue;
        const c = count.get(w);
        const row = { doc: di, s, i, id: w, y, upos, kind, cnt: c, nwin, gap: s - last, slen: sent.length, relidx: sent.length > 1 ? i / (sent.length - 1) : 0, posrel: (s - H) / Math.max(1, stream.length - H), cb: bin2(c), wb: Math.min(3, nwin) };
        (y === 1 ? pos : ctrl).push(row);
      }
    }
  });
  // cap per form, then match
  const capped = (rows) => { const by = new Map(); for (const r of shuffled(rows, rnd)) { const key = r.doc + "|" + r.id; const a = by.get(key) ?? by.set(key, []).get(key); if (a.length < CAP_FORM) a.push(r); } return [...by.values()].flat(); };
  const P = shuffled(capped(pos), rnd).slice(0, NPOS), C = capped(ctrl);
  const cell = new Map(); for (const r of shuffled(C, rnd)) { const key = `${r.cb}|${r.wb}`; (cell.get(key) ?? cell.set(key, []).get(key)).push(r); }
  const cbCell = new Map(); for (const r of shuffled(C, rnd)) { (cbCell.get(r.cb) ?? cbCell.set(r.cb, []).get(r.cb)).push(r); }
  const used = new Set(), rows = []; let fallback = 0, dropped = 0;
  for (const p of P) {
    let q = null;
    const a = cell.get(`${p.cb}|${p.wb}`) ?? []; while (a.length && !q) { const c = a.pop(); if (!used.has(c)) q = c; }
    if (!q) { const b = cbCell.get(p.cb) ?? []; while (b.length && !q) { const c = b.pop(); if (!used.has(c)) q = c; } if (q) fallback++; }
    if (!q) { dropped++; continue; }
    used.add(q); rows.push(p, q);
  }
  return { rows, nPosCandidates: pos.length, nCtrlCandidates: ctrl.length, fallbackPairs: fallback, dropped };
}

// ── scores ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SPAN_IX = Object.fromEntries(["births", "losses", "mentionShift", "edgesLost", "edgesBorn"].map((k) => [k, SPAN_LABELS.indexOf(k)]));
function scalarScores(rec) {
  const c = rec.counts, T = DELTA_TYPES.length;
  const at = (fam, band) => { let s = 0; for (let t = 0; t < T; t++) s += c[(fam * 3 + band) * T + t]; return s; };
  const S_ENTRY = at(3, 0) + at(3, 1);
  let S_OWN = 0; for (let fam = 0; fam < 4; fam++) S_OWN += at(fam, 0);
  let S_ALL = 0; for (const v of c) S_ALL += v;
  const sp = rec.span;
  const S_SPAN = Math.abs(sp[SPAN_IX.births]) + Math.abs(sp[SPAN_IX.losses]) + Math.abs(sp[SPAN_IX.mentionShift]) + Math.abs(sp[SPAN_IX.edgesLost]) + Math.abs(sp[SPAN_IX.edgesBorn]);
  return { S_ENTRY, S_OWN, S_ALL, S_SPAN };
}
const r5 = (a) => a.map((x) => round(x, 5));

async function main() {
  const t0 = Date.now(); fs.mkdirSync(OUT, { recursive: true });
  const c = IS_IRC ? loadIrc() : loadUD(CORPUS);
  const indSents = c.docs.flatMap((d) => d.stream.slice(0, d.H));
  console.error(`${CORPUS}${DEBUG ? " (DEBUG)" : ""}: ${c.docs.length} doc(s), induction sentences ${indSents.length}, eval sentences ${c.docs.reduce((a, d) => a + d.stream.length - d.H, 0)}`);
  const ind = induceKinds(indSents, CORPUS);
  console.error(`kinds: forms>=${MIN_MENT} ${ind.nForms}, stability ${JSON.stringify(ind.stability)}, K=${ind.K} used=${ind.Kused} K1pass=${ind.K1pass}`);
  if (ind.Kused == null) { fs.writeFileSync(path.join(OUT, `${DEBUG ? "debug-" : ""}${CORPUS}.json`), JSON.stringify({ corpus: CORPUS, failed: "too few forms for any kind", nForms: ind.nForms })); return; }
  // descriptive kind table (gold UPOS composition is DESCRIPTION ONLY, never used)
  const kindDesc = Array.from({ length: ind.Kused }, () => ({ forms: [], upos: {} }));
  const uposOfForm = new Map();
  for (const d of c.docs) if (d.upos) d.stream.forEach((sent, s) => sent.forEach((w, i) => { const m = uposOfForm.get(w) ?? uposOfForm.set(w, {}).get(w); m[d.upos[s][i]] = (m[d.upos[s][i]] ?? 0) + 1; }));
  for (const w of ind.rowForms) { const k = ind.kindOf.get(w); kindDesc[k].forms.push([w, ind.count.get(w)]); for (const [u, n] of Object.entries(uposOfForm.get(w) ?? {})) kindDesc[k].upos[u] = (kindDesc[k].upos[u] ?? 0) + n; }
  const kindsOut = kindDesc.map((k, id) => ({ id, nForms: k.forms.length, tokens: k.forms.reduce((a, [, n]) => a + n, 0), top: k.forms.slice(0, 14).map(([w, n]) => `${w}:${n}`), upos: k.upos }));
  // kinds vs frequency / sentence-initial share (C7)
  const forms = ind.rowForms, kinds = forms.map((w) => ind.kindOf.get(w));
  const tert = (vals) => { const sorted = vals.slice().sort((a, b) => a - b), t1 = sorted[Math.floor(sorted.length / 3)], t2 = sorted[Math.floor(2 * sorted.length / 3)]; return vals.map((v) => (v < t1 ? 0 : v < t2 ? 1 : 2)); };
  const init = new Map(), tot = new Map();
  for (const s of indSents) s.forEach((w, i) => { tot.set(w, (tot.get(w) ?? 0) + 1); if (i === 0) init.set(w, (init.get(w) ?? 0) + 1); });
  const fterc = tert(forms.map((w) => ind.count.get(w))), iterc = tert(forms.map((w) => (init.get(w) ?? 0) / tot.get(w)));
  const rndN = rngFor(seedFor("adversary", CORPUS, "nmi-null")); const nmiF = nmi(kinds, fterc), nmiI = nmi(kinds, iterc), nf = [], ni = [];
  for (let b = 0; b < 200; b++) { const kp = shuffled(kinds, rndN); nf.push(nmi(kp, fterc)); ni.push(nmi(kp, iterc)); }
  const q95 = (a) => a.slice().sort((x, y) => x - y)[Math.floor(0.95 * a.length)];
  const c7 = { nmiFreqTercile: round(nmiF), nullQ95Freq: round(q95(nf)), nmiSentInitialTercile: round(nmiI), nullQ95Init: round(q95(ni)) };
  console.error(`C7 ${JSON.stringify(c7)}`);
  const smp = sampleRows(c.docs, ind.kindOf, ind.count, seedFor("adversary", CORPUS, "sample"));
  const rows = smp.rows;
  console.error(`sample: ${rows.length / 2} pairs (candidates pos ${smp.nPosCandidates} ctrl ${smp.nCtrlCandidates}, fallback ${smp.fallbackPairs}, dropped ${smp.dropped}); ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const read = (rowsIn, streams, modes) => {
    const recs = Object.fromEntries(modes.map((m) => [m, new Array(rowsIn.length).fill(null)]));
    c.docs.forEach((d, di) => {
      const idx = rowsIn.map((t, k) => (t.doc === di ? k : -1)).filter((k) => k >= 0); if (!idx.length) return;
      const r = impactBatch(streams[di], idx.map((k) => ({ s: rowsIn[k].s, i: rowsIn[k].i })), { M, F: 0, modes, seedTag: `${CORPUS}:${di}`, maxSeconds: Infinity });
      for (const m of modes) idx.forEach((k, j) => { recs[m][k] = r.records[m][j]; });
    });
    return recs;
  };
  const streams = c.docs.map((d) => d.stream);
  const R = read(rows, streams, ["delete"]).delete;
  console.error(`read real ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  // C3 company shuffle: same tokens, located by occurrence ordinal in the shuffled sentence
  const shStreams = c.docs.map((d, di) => shuffleSentences(d.stream, seedFor("adversary", CORPUS, "shuffle", di)));
  const shRows = rows.map((t) => { const orig = streams[t.doc][t.s]; let ord = 0; for (let j = 0; j < t.i; j++) if (orig[j] === t.id) ord++; const sh = shStreams[t.doc][t.s]; let seen = 0, pos = -1; for (let j = 0; j < sh.length; j++) if (sh[j] === t.id) { if (seen === ord) { pos = j; break; } seen++; } return { ...t, i: pos }; });
  const RS = read(shRows, shStreams, ["delete"]).delete;
  console.error(`read shuffled ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  // C4 sham and C6 determinism
  const shamIdx = Array.from({ length: Math.min(NSHAM, rows.length) }, (_, k) => k * Math.floor(rows.length / Math.min(NSHAM, rows.length)));
  const sham = read(shamIdx.map((k) => rows[k]), streams, ["sham"]).sham;
  const det = read(rows.slice(0, NDET), streams, ["delete"]).delete;
  const out = rows.map((t, k) => {
    const r = R[k], rs = RS[k];
    return { ...t, block: IS_IRC ? t.doc : Math.min(9, Math.floor(t.posrel * 10)), isNull: r.isNull, noSlot: r.noSlot, ext: r.extent?.tokens ?? 0, hash: r.hash, sig: r5(r.sig), atm: r5(r.atm), ...scalarScores(r), sigS: r5(rs.sig), atmS: r5(rs.atm), isNullS: rs.isNull, extS: rs.extent?.tokens ?? 0, iS: shRows[k].i };
  });
  const result = {
    module: "ant-adversary/build.mjs", corpus: CORPUS, debug: DEBUG, M, prereg: "PREREG.md", docs: c.docs.map((d) => ({ name: d.name, sentences: d.stream.length, H: d.H })), meta: c.meta,
    induction: { nForms: ind.nForms, stability: ind.stability, K: ind.K, Kused: ind.Kused, K1pass: ind.K1pass, Kfallback: ind.Kfallback, C7: c7, kinds: kindsOut },
    formKind: Object.fromEntries(ind.rowForms.map((w) => [w, [ind.kindOf.get(w), ind.count.get(w)]])),
    sample: { pairs: rows.length / 2, nPosCandidates: smp.nPosCandidates, nCtrlCandidates: smp.nCtrlCandidates, fallbackPairs: smp.fallbackPairs, dropped: smp.dropped },
    C4_sham: { nullShare: round(sham.filter((r) => r.isNull).length / sham.length), n: sham.length, idx: shamIdx },
    C6_determinism: { same: det.filter((r, k) => r.hash === R[k].hash).length, total: det.length },
    seconds: round((Date.now() - t0) / 1000, 1), rows: out,
  };
  const file = path.join(OUT, `${DEBUG ? "debug-" : ""}${CORPUS}.json`);
  fs.writeFileSync(file, JSON.stringify(result));
  const sha = createHash("sha256").update(fs.readFileSync(path.join(HERE, "PREREG.md"), "utf8")).digest("hex");
  console.log(JSON.stringify({ corpus: CORPUS, rows: out.length, K: ind.Kused, K1pass: ind.K1pass, C4: result.C4_sham.nullShare, C6: result.C6_determinism, seconds: result.seconds, preregSha256: sha, file }));
}
await main();
