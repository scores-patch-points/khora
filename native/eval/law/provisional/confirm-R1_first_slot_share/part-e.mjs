// part-e.mjs — PART E: CoSEM (Singapore group chat, no speaker field, no name gold). Phase 1 writes shuffled, arm-blind items (results/e-items.txt) and the hidden key (results/e-key.json; NOT to be read before labelling);
// phase 2 (when results/e-labels.json exists) unblinds. Single rater, exploratory. See the header of confirm.mjs.
import fs from "node:fs";
import { toks, streamIndex, ishare, rngOf, shuffleIn, round, SEED, THETA } from "./lib.mjs";
import { KEY_EXACT } from "./pairs.mjs";
const DIR = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/cosem", R = new URL("./results/", import.meta.url);
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
const spans = (t) => [...String(t).matchAll(WORD)].map((m) => ({ w: m[0].replace(/^['’]+|['’]+$/g, "").normalize("NFC").toLowerCase(), s: m.index, e: m.index + m[0].length })).filter((x) => x.w && !/^\p{N}+$/u.test(x.w));
function loadConv() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".txt")).sort(), conv = new Map();
  for (const f of files) {
    const id = f.split("-")[0], lines = fs.readFileSync(`${DIR}/${f}`, "utf8").split("\n"); let k = 0, n = 0;
    for (; k < lines.length; k++) if (lines[k] === "---" && ++n === 2) break;
    const c = conv.get(id) ?? conv.set(id, { id, raw: [], T: [], rawIdx: [] }).get(id);
    for (const l of lines.slice(k + 1)) { if (!l.trim()) continue; c.raw.push(l); const t = toks(l); if (t.length) { c.T.push(t); c.rawIdx.push(c.raw.length - 1); } }
  }
  return [...conv.values()];
}
const mark = (conv, m, i) => { const raw = conv.raw[conv.rawIdx[m]], sp = spans(raw), x = sp[i]; return x ? raw.slice(0, x.s) + "[[" + raw.slice(x.s, x.e) + "]]" + raw.slice(x.e) : raw; };
function select() {
  const out = [];
  for (const conv of loadConv()) {
    const ix = streamIndex(conv.T), seen = new Map(), F = [], C = new Map(), rnd = rngOf(SEED, "cosem", conv.id);
    conv.T.forEach((m, k) => m.forEach((w, i) => {
      const kk = seen.get(w) ?? 0; seen.set(w, kk + 1); if (kk === 0 || [...w].length < 3) return;
      const o = { conv: conv.id, w, m: k, i, len: m.length }; o.key = KEY_EXACT(o, ix); o.s = ishare(ix, w, k);
      if (o.s >= THETA) F.push(o); else (C.get(o.key) ?? C.set(o.key, []).get(o.key)).push(o);
    }));
    for (const a of C.values()) shuffleIn(a, rnd);
    const perForm = new Map(), usedC = new Map(), pairs = [];
    for (const o of shuffleIn(F, rnd)) {
      if (pairs.length >= 30) break; if ((perForm.get(o.w) ?? 0) >= 2) continue;
      const a = C.get(o.key); let q = null; while (a?.length) { const c = a.pop(); if ((usedC.get(c.w) ?? 0) < 2 && c.w !== o.w) { q = c; break; } }
      if (!q) continue; perForm.set(o.w, (perForm.get(o.w) ?? 0) + 1); usedC.set(q.w, (usedC.get(q.w) ?? 0) + 1); pairs.push({ F: o, C: q });
    }
    out.push({ conv, pairs, nFlagged: F.length, forms: new Set(F.map((o) => o.w)).size });
  }
  return out;
}
const ctx = (conv, o) => { const r = conv.rawIdx[o.m], p = conv.raw[r - 1] ?? "", n = conv.raw[r + 1] ?? ""; return `    prev: ${p}\n    >>>   ${mark(conv, o.m, o.i)}\n    next: ${n}`; };
export async function run({ dry }) {
  const sel = select(), key = [], R0 = { conversations: sel.map((s) => ({ id: s.conv.id, msgs: s.conv.T.length, flaggedOcc: s.nFlagged, flaggedForms: s.forms, pairs: s.pairs.length })) };
  const labPath = new URL("e-labels.json", R);
  if (!fs.existsSync(labPath)) {
    const items = []; let id = 0;
    for (const s of sel) for (const p of s.pairs) for (const arm of ["F", "C"]) { const o = p[arm]; items.push({ id: id++, arm, conv: s.conv.id, pair: `${s.conv.id}:${s.pairs.indexOf(p)}`, w: o.w, m: o.m, i: o.i, s: round(o.s), text: ctx(s.conv, o) }); }
    const r = rngOf(SEED, "cosem-order"), order = shuffleIn(items.map((_, j) => j), r), txt = order.map((j, n) => `#${n}  token: ${items[j].w}\n${items[j].text}\n`).join("\n");
    fs.writeFileSync(new URL("e-items.txt", R), txt); fs.writeFileSync(new URL("e-key.json", R), JSON.stringify(order.map((j, n) => ({ n, ...items[j], text: undefined }))));
    return { phase: 1, ...R0, nItems: items.length, headline: { phase: "items written; label results/e-items.txt into results/e-labels.json as {n: 'N'|'O'|'U'}", ...R0 } };
  }
  const labels = JSON.parse(fs.readFileSync(labPath, "utf8")), K = JSON.parse(fs.readFileSync(new URL("e-key.json", R), "utf8")), by = new Map();
  for (const k of K) { const l = labels[k.n]; (by.get(k.pair) ?? by.set(k.pair, {}).get(k.pair))[k.arm] = { l, w: k.w, s: k.s, conv: k.conv }; }
  let nF = 0, nC = 0, tot = 0, b = 0, c = 0, dropped = 0; const nameForms = {}, flaggedNames = [], ctrlNames = [], flaggedOther = [], byConv = {};
  for (const [pair, v] of by) {
    if (!v.F || !v.C || v.F.l === "U" || v.C.l === "U" || !v.F.l || !v.C.l) { dropped++; continue; }
    const f = v.F.l === "N", g = v.C.l === "N"; tot++; if (f) { nF++; flaggedNames.push(v.F.w); } else flaggedOther.push(v.F.w); if (g) { nC++; ctrlNames.push(v.C.w); } if (f && !g) b++; if (!f && g) c++;
    const o = (byConv[v.F.conv] ??= { n: 0, nF: 0, nC: 0 }); o.n++; o.nF += f; o.nC += g;
  }
  let p = 0; const nd = b + c; const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }; for (let k = b; k <= nd; k++) p += binom(nd, k) / 2 ** nd;
  const precF = round(nF / Math.max(1, tot)), rateC = round(nC / Math.max(1, tot)), holds = precF >= 0.5 && precF - rateC >= 0.25 && p < 0.01;
  const res = { ...R0, pairsLabelled: tot, dropped, precisionFlagged: precF, rateControl: rateC, lift: round(precF - rateC), discordant: { b_flaggedNameControlNot: b, c_controlNameFlaggedNot: c }, signTestP: round(p, 6), holdsInCoSEM: holds, byConv, flaggedNameForms: [...new Set(flaggedNames)], flaggedOtherForms: [...new Set(flaggedOther)], controlNameForms: [...new Set(ctrlNames)] };
  return { phase: 2, ...res, headline: { pairsLabelled: tot, precisionFlagged: precF, rateControl: rateC, discordant: res.discordant, signTestP: res.signTestP, holdsInCoSEM: holds } };
}
