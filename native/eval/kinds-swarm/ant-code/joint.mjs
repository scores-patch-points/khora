// joint.mjs -- ant-code T1: JOINT ablation of all visible (>=3 char) tokens of a class in a window (logic of eval/law/name-shape.mjs joint()): shadow, imprint, collateral shadow, amplification.
// usage: node joint.mjs LANG     classes U,E,K,L; RAND = 20 draws of a set the size of U matched token-for-token on (log2 freq bin, first-in-line, length bucket) from non-U,non-A tokens.
import fs from "node:fs"; import path from "node:path";
import { makeSnapshot, readWindow, slotStructure, slotDeltas, tokenSlotsOf, sentenceText, seedFor, rngFor } from "../../law/impact.mjs";
import { DATA, M, npView, r5 } from "./lib.mjs";
const lang = process.argv[2], W = 4, DRAWS = 20, FAM = 4, TYPES = ["emptied", "retyped", "rebound", "refilled", "shifted", "born"], DIM = FAM * TYPES.length;
const files = JSON.parse(fs.readFileSync(path.join(DATA, "files.json"), "utf8"))[lang];
const bin = (n) => Math.floor(Math.log2(Math.max(1, n))), lb = (n) => (n <= 3 ? 0 : n === 4 ? 1 : n <= 6 ? 2 : n <= 9 ? 3 : 4);
const out = { lang, W, DRAWS, design: "A2 paired U/N draws", windows: [], sham: [], determinism: null };
files.forEach((fl, idx) => {
  const view = npView(JSON.parse(fs.readFileSync(path.join(DATA, "lex", `${lang}-${idx}.json`), "utf8")));
  const { stream, cls } = view, N = stream.length; if (N < M + W) return;
  const freq = new Map(); for (const u of stream) for (const w of u) freq.set(w, (freq.get(w) ?? 0) + 1);
  const rnd = rngFor(seedFor("ant-code", "joint", lang, idx));
  const ends = Array.from({ length: W }, (_, k) => Math.floor(M + ((k + 0.5) * (N - M)) / W));
  for (const e of ends) {
    const snap = makeSnapshot(stream, e, { M, F: 0, seedTag: `ant-code:joint:${lang}:${idx}` });
    const gold = []; for (let s = snap.lo; s <= snap.hi; s++) gold.push(cls[s]);
    const vis = (k, i) => snap.sents[k][i].length >= 3;
    const joint = (del) => {
      const sents1 = snap.sents.map((sent, k) => sent.filter((_, i) => !del.has(`${k}:${i}`)));
      const reading1 = readWindow(sents1.map(sentenceText), snap.ropts, snap.ceiling ?? null);
      const sd = slotDeltas(snap.sl0, slotStructure(reading1));
      const I = new Set(); let noSlot = 0;
      for (const key of del) { const [k, i] = key.split(":").map(Number); const ids = tokenSlotsOf(snap.sl0, snap.sents, k, i); if (!ids.length) noSlot += 1; ids.forEach((id) => I.add(id)); }
      const fam = [0, 0, 0, 0]; for (const id of I) { const [, kind, , f] = id.split(":"); fam[kind === "r" ? Number(f) : 3] += 1; }
      const all = new Array(DIM).fill(0), direct = new Array(DIM).fill(0), collateral = new Array(DIM).fill(0); let n = 0, changed = 0;
      for (const r of sd.records) { n += 1; if (r.type === "unchanged") continue; changed += 1; const c = r.fam * TYPES.length + TYPES.indexOf(r.type); all[c] += 1; (r.side === 0 && I.has(r.id) ? direct : collateral)[c] += 1; }
      return { counts: all, direct, collateral, changed, all: n, imprint: { fam, noSlot, tokens: del.size, slots: I.size } };
    };
    const delOf = (c) => { const d = new Set(); gold.forEach((g, k) => g.forEach((cc, i) => { if (cc === c && vis(k, i)) d.add(`${k}:${i}`); })); return d; };
    const win = { file: idx, end: e, classes: {}, n: {} };
    for (const C of ["U", "E", "K", "L"]) { const d = delOf(C); win.n[C] = d.size; win.classes[C] = d.size ? joint(d) : null; }
    if (e === ends[0]) { win.sham = joint(new Set()).changed; const again = delOf("U").size ? joint(delOf("U")) : null; win.determinism = again ? JSON.stringify(again.counts) === JSON.stringify(win.classes.U.counts) : null; }
    const uTok = []; gold.forEach((g, k) => g.forEach((c, i) => { if (c === "U" && vis(k, i)) uTok.push([k, i]); }));
    const nTok = []; gold.forEach((g, k) => g.forEach((c, i) => { if ((c === "E" || c === "K" || c === "L") && vis(k, i)) nTok.push([k, i]); }));
    const m = Math.floor(Math.min(uTok.length, nTok.length) / 2); win.m = m; win.pairs = [];
    const fb = (k, i) => bin(freq.get(snap.sents[k][i])), ini = (k, i) => (i === 0 ? 1 : 0), lbk = (k, i) => lb(snap.sents[k][i].length);
    if (m >= 10) for (let d = 0; d < DRAWS; d++) {
      const us = uTok.slice(); for (let t = us.length - 1; t > 0; t--) { const j = Math.floor(rnd() * (t + 1)); [us[t], us[j]] = [us[j], us[t]]; } const uSet = us.slice(0, m);
      const avail = new Set(nTok.map(([k, i]) => `${k}:${i}`)), picked = new Set(); let exact = 0;
      const levels = [(a, b) => fb(...a) === fb(...b) && ini(...a) === ini(...b) && lbk(...a) === lbk(...b), (a, b) => fb(...a) === fb(...b) && lbk(...a) === lbk(...b), (a, b) => Math.abs(fb(...a) - fb(...b)) <= 1, () => true];
      for (const u of uSet) {
        for (let lv = 0; lv < levels.length; lv++) {
          const cand = nTok.filter((q) => avail.has(`${q[0]}:${q[1]}`) && levels[lv](u, q)); if (!cand.length) continue;
          const q = lv === 3 ? cand.sort((x, y) => Math.abs(fb(...x) - fb(...u)) - Math.abs(fb(...y) - fb(...u)))[0] : cand[Math.floor(rnd() * cand.length)];
          avail.delete(`${q[0]}:${q[1]}`); picked.add(`${q[0]}:${q[1]}`); if (lv === 0) exact += 1; break;
        }
      }
      win.pairs.push({ U: joint(new Set(uSet.map(([k, i]) => `${k}:${i}`))), N: joint(picked), exact: exact / m, size: [uSet.length, picked.size] });
    }
    out.windows.push(win);
  }
  console.error(`${lang} file ${idx}: ${out.windows.length} windows so far`);
});
fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(path.join("results", `joint-${lang}.json`), JSON.stringify(out));
