// sig.mjs — ant-kinds-ud K2/K3 data: single-token impact records per induced kind + gold-strata pairs, and JOINT ablations per kind
// (shadow, imprint, collateral shadow, amplification as eval/law/name-shape.mjs computes them) with frequency-stratified pseudo-kinds.
//   node sig.mjs rec|joint --stems a,b [--src dev|fold80] [--Q 80] [--PN 250] [--W 6] [--B 20] [--out DIR]
// Pre-registration: PREREG.md (sha256 in PREREG.sha256). Gold UPOS selects the PROPN/NOUN strata and their frequency-matched controls only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readConlluStream, makeSnapshot, impactOfToken, readWindow, slotStructure, slotDeltas, tokenSlotsOf, sentenceText, seedFor, rngFor } from "../../law/impact.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const STEMS = opt("--stems", "swe").split(",");
const SRC = opt("--src", "dev");
const Q = Number(opt("--Q", 80)), PN = Number(opt("--PN", 250)), W = Number(opt("--W", 6)), B = Number(opt("--B", 20));
const IND = opt("--ind", path.join(HERE, SRC === "dev" ? "induced" : "induced-" + SRC));
const OUT = opt("--out", path.join(HERE, SRC === "dev" ? "sig" : "sig-" + SRC));
const fileOf = (stem) => (SRC === "dev" ? `/private/tmp/claude-501/ud-eval/${stem}/dev.conllu` : `/private/tmp/claude-501/fold80/${stem}/tail.conllu`);
const TYPES = ["emptied", "retyped", "rebound", "refilled", "shifted", "born"], FAM = 4, DIM = FAM * TYPES.length;
const bin = (n) => Math.floor(Math.log2(Math.max(1, n)));
const r3 = (x) => Math.round(x * 1000) / 1000;
const shuf = (a, rnd) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

function load(stem) {
  const { sents, upos } = readConlluStream(fileOf(stem));
  const ind = JSON.parse(fs.readFileSync(path.join(IND, `${stem}.json`), "utf8"));
  if (ind.gap) return { gap: ind.gap };
  const leafOf = new Map(ind.forms.map(([w, , , l]) => [w, l]));
  const N = sents.length, M = Math.min(128, Math.floor(N / 5));
  const freq = new Map(); for (const s of sents) for (const w of s) freq.set(w, (freq.get(w) ?? 0) + 1);
  return { sents, upos, ind, leafOf, N, M, freq };
}

// ── single-token records ──
function runRec(stem) {
  const t0 = Date.now();
  const D = load(stem); if (D.gap) return { stem, gap: D.gap };
  const { sents, upos, leafOf, N, M, freq } = D;
  const rnd = rngFor(seedFor("kinds-ud", "sample", stem, SRC));
  // causal mention count in window [s-M, s], at or before the token
  const occ = new Map(); sents.forEach((s, si) => s.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([si, i]); }));
  const nwin = new Map();
  for (const [w, L] of occ) { let lo = 0; for (let k = 0; k < L.length; k++) { while (L[lo][0] < L[k][0] - M) lo++; nwin.set(L[k][0] + ":" + L[k][1], k - lo + 1); } }
  const E = [];
  sents.forEach((s, si) => { if (si < M) return; s.forEach((w, i) => { const nw = nwin.get(si + ":" + i); if (nw < 2) return; E.push({ s: si, i, w, leaf: leafOf.get(w) ?? -1, upos: upos[si][i], fb: bin(freq.get(w)), nw }); }); });
  const pick = new Map(); const tag = (t, role, extra = {}) => { const k = t.s + ":" + t.i; let r = pick.get(k); if (!r) { r = { ...t, roles: [] }; pick.set(k, r); } r.roles.push({ role, ...extra }); return k; };
  const leaves = [...new Set(E.map((t) => t.leaf))].sort((a, b) => a - b);
  for (const l of leaves) shuf(E.filter((t) => t.leaf === l), rnd).slice(0, Q).forEach((t) => tag(t, "kind"));
  const pairs = [];
  for (const cls of ["PROPN", "NOUN"]) {
    const pos = shuf(E.filter((t) => t.upos === cls), rnd).slice(0, PN);
    const pool = new Map(); for (const t of E) if (t.upos !== cls) (pool.get(t.fb) ?? pool.set(t.fb, []).get(t.fb)).push(t);
    const used = new Set();
    for (const t of pos) {
      const p = (pool.get(t.fb) ?? []).filter((c) => !used.has(c.s + ":" + c.i) && !(c.s === t.s && c.i === t.i));
      if (!p.length) continue;
      const c = p[Math.floor(rnd() * p.length)]; used.add(c.s + ":" + c.i);
      const kp = tag(t, "cls-" + cls), kc = tag(c, "ctl-" + cls);
      pairs.push({ cls, pos: kp, ctl: kc });
    }
  }
  const items = [...pick.values()].sort((a, b) => a.s - b.s || a.i - b.i);
  const recs = []; let snap = null;
  let done = 0;
  for (const t of items) {
    if (++done % 100 === 0) console.error(`  ${stem} rec ${done}/${items.length} ${Date.now() - t0}ms`);
    if (!snap || snap.s !== t.s) snap = makeSnapshot(sents, t.s, { M, F: 0 });
    const r = impactOfToken(snap, t.i, { mode: "delete", withC: false });
    if (r.gap) continue;
    recs.push({ k: t.s + ":" + t.i, s: t.s, i: t.i, w: t.w, leaf: t.leaf, upos: t.upos, fb: t.fb, nw: t.nw, roles: t.roles.map((x) => x.role), sig: r.sig.map(r3), atm: r.atm.map(r3), ext: [r.extent.tokens, r.extent.frames, r.extent.radius], noSlot: r.noSlot ? 1 : 0, nts: r.nTokenSlots, isNull: r.isNull ? 1 : 0 });
  }
  return { stem, src: SRC, N, M, Q, PN, leaves, eligible: E.length, records: recs, pairs: pairs.filter((p) => pick.has(p.pos) && pick.has(p.ctl)), ms: Date.now() - t0 };
}

// ── joint ablations ──
function jointOf(snap, del) {
  const sents1 = snap.sents.map((sent, k) => sent.filter((_, i) => !del.has(`${k}:${i}`)));
  const reading1 = readWindow(sents1.map(sentenceText), snap.ropts, snap.ceiling ?? null);
  const sd = slotDeltas(snap.sl0, slotStructure(reading1));
  const I = new Set(); let noSlot = 0;
  for (const key of del) { const [k, i] = key.split(":").map(Number); const ids = tokenSlotsOf(snap.sl0, snap.sents, k, i); if (!ids.length) noSlot += 1; ids.forEach((id) => I.add(id)); }
  const fam = [0, 0, 0, 0];
  for (const id of I) { const [, kind, , f] = id.split(":"); fam[kind === "r" ? Number(f) : 3] += 1; }
  const all = new Array(DIM).fill(0), coll = new Array(DIM).fill(0); let n = 0, changed = 0, nd = 0, nc = 0;
  for (const r of sd.records) { n += 1; if (r.type === "unchanged") continue; changed += 1; const c = r.fam * TYPES.length + TYPES.indexOf(r.type); all[c] += 1; if (r.side === 0 && I.has(r.id)) nd += 1; else { coll[c] += 1; nc += 1; } }
  return { c: all, col: coll, imp: [...fam, noSlot], tok: del.size, slots: I.size, nd, nc, ch: changed, n };
}

function runJoint(stem) {
  const t0 = Date.now();
  const D = load(stem); if (D.gap) return { stem, gap: D.gap };
  const { sents, upos, leafOf, N, M, freq } = D;
  const rnd = rngFor(seedFor("kinds-ud", "joint", stem, SRC));
  const ends = Array.from({ length: W }, (_, k) => Math.floor(M + ((k + 0.5) * (N - M)) / W));
  // pseudo-kind label maps: form-level label permutation within log2-frequency strata (all forms of the stream, `u` = -1 included)
  const allForms = [...freq.keys()].sort();
  const perms = [];
  for (let b = 0; b < B; b++) {
    const byBin = new Map(); for (const w of allForms) (byBin.get(bin(freq.get(w))) ?? byBin.set(bin(freq.get(w)), []).get(bin(freq.get(w)))).push(w);
    const m = new Map();
    for (const ws of byBin.values()) { const labs = shuf(ws.map((w) => leafOf.get(w) ?? -1), rnd); ws.forEach((w, j) => m.set(w, labs[j])); }
    perms.push(m);
  }
  const out = { stem, src: SRC, N, M, W, B, windows: [], sham: null, determinism: null };
  for (const e of ends) {
    const snap = makeSnapshot(sents, e, { M, F: 0 });
    const lo = snap.lo, ws = snap.sents;
    const lab = ws.map((s) => s.map((w) => leafOf.get(w) ?? -1));
    const gold = ws.map((_, k) => upos[lo + k]);
    const cnt = new Map(); lab.forEach((r) => r.forEach((l) => cnt.set(l, (cnt.get(l) ?? 0) + 1)));
    const evalLeaves = [...cnt].filter(([l, n]) => l >= 0 && n >= 10).map(([l]) => l).sort((a, b) => a - b);
    const selOf = (pred) => { const d = new Set(); ws.forEach((s, k) => s.forEach((w, i) => { if (pred(k, i, w)) d.add(`${k}:${i}`); })); return d; };
    const win = { end: e, lo, hi: snap.hi, ntok: ws.reduce((a, s) => a + s.length, 0), tokPerLeaf: Object.fromEntries([...cnt]), real: {}, gold: {}, randGold: { PROPN: [], NOUN: [] }, pseudo: [] };
    for (const l of evalLeaves) win.real[l] = jointOf(snap, selOf((k, i) => lab[k][i] === l));
    for (const cls of ["PROPN", "NOUN"]) {
      const del = selOf((k, i) => gold[k][i] === cls);
      if (del.size < 10) continue;
      win.gold[cls] = jointOf(snap, del);
      const pool = new Map(); ws.forEach((s, k) => s.forEach((w, i) => { if (gold[k][i] !== cls) { const bb = bin(freq.get(w)); (pool.get(bb) ?? pool.set(bb, []).get(bb)).push([k, i]); } }));
      for (let d = 0; d < B; d++) {
        const rd = new Set();
        for (const key of del) { const [k, i] = key.split(":").map(Number); const p = (pool.get(bin(freq.get(ws[k][i]))) ?? []).filter(([a, c]) => !rd.has(`${a}:${c}`)); if (p.length) { const [a, c] = p[Math.floor(rnd() * p.length)]; rd.add(`${a}:${c}`); } }
        win.randGold[cls].push(jointOf(snap, rd));
      }
    }
    for (let b = 0; b < B; b++) {
      const pm = perms[b], row = {};
      for (const l of evalLeaves) { const del = selOf((k, i, w) => pm.get(w) === l); if (del.size >= 10) row[l] = jointOf(snap, del); }
      win.pseudo.push(row);
    }
    if (e === ends[0]) {
      out.sham = jointOf(snap, new Set()).ch;
      if (evalLeaves.length) { const l = evalLeaves[0]; const again = jointOf(snap, selOf((k, i) => lab[k][i] === l)); out.determinism = JSON.stringify(again.c) === JSON.stringify(win.real[l].c); }
    }
    out.windows.push(win);
    console.error(`  ${stem} window ${e}: leaves ${evalLeaves.length}, ${Date.now() - t0}ms`);
  }
  out.ms = Date.now() - t0;
  return out;
}

if (cmd === "rec" || cmd === "joint") {
  fs.mkdirSync(OUT, { recursive: true });
  for (const stem of STEMS) {
    const r = cmd === "rec" ? runRec(stem) : runJoint(stem);
    fs.writeFileSync(path.join(OUT, `${stem}.${cmd}.json`), JSON.stringify(r));
    console.error(`${stem} ${cmd}: ${r.gap ?? (cmd === "rec" ? `${r.records.length} records, ${r.pairs.length} pairs, eligible ${r.eligible}` : `${r.windows.length} windows sham=${r.sham} det=${r.determinism}`)} ${r.ms}ms`);
  }
}
