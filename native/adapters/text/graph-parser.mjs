// graph-parser.mjs — an ARC-FACTORED, non-projective dependency parser: the decoder is shared (Chu-Liu-Edmonds MST), the arc-feature CODEX is per language and FOLDED ON DEMAND.
// Why: the transition parser walks left to right (a word-order assumption English bakes in). A free-word-order language folds its OWN codex — Sanskrit folds morphology (case/number/gender/lemma), English folds word order (forms/adjacency) — and both feed the SAME decoder. No shared feature assumptions between languages.
import { parseConllu } from "../../kernel/eot-rich.js";
const attr = (feats, key) => { if (!feats || feats === "_") return "_"; const p = feats.split("|").find((x) => x.startsWith(key + "=")); return p ? p.slice(key.length + 1) : "_"; };
const norm = (w) => (w === "ROOT" ? w : /\d/.test(w) ? w.replace(/\d/g, "#").toLowerCase() : w.toLowerCase());
const uniq = (a) => [...new Set(a)].sort().join(",");
const between = (s, h, d) => { const lo = Math.min(h, d), hi = Math.max(h, d), out = []; for (let k = lo + 1; k < hi; k++) if (k >= 1) out.push(s.tokens[k - 1]); return out; };

// ── Chu-Liu-Edmonds (non-projective maximum arborescence) ─────────────────────────────
function findCycle(bestParent, root) {
  const n = bestParent.length, state = new Array(n).fill(0);
  for (let s = 0; s < n; s++) {
    if (s === root || state[s] !== 0) continue;
    const path = [], pos = new Map(); let x = s;
    while (x !== -1 && x !== root) {
      if (pos.has(x)) return path.slice(pos.get(x));
      if (state[x] === 2) break;
      pos.set(x, path.length); path.push(x); x = bestParent[x];
    }
    for (const p of path) state[p] = 2;
  }
  return null;
}
export function cle(weight, root = 0) {
  const n = weight.length;
  const bestParent = new Array(n).fill(-1);
  for (let j = 0; j < n; j++) { if (j === root) continue; let bp = -1, bw = -Infinity; for (let i = 0; i < n; i++) { if (i === j) continue; if (weight[i][j] > bw) { bw = weight[i][j]; bp = i; } } bestParent[j] = bp; }
  const cycle = findCycle(bestParent, root);
  if (!cycle) { const h = new Array(n).fill(-1); for (let j = 0; j < n; j++) if (j !== root) h[j] = bestParent[j]; return h; }
  const cycSet = new Set(cycle);
  const external = []; const map = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) if (!cycSet.has(i)) { map[i] = external.length; external.push(i); }
  const cycId = external.length, m = external.length + 1;
  const pred = (c) => bestParent[c]; // cycle predecessor
  const newWeight = Array.from({ length: m }, () => new Array(m).fill(-Infinity));
  for (const u of external) for (const v of external) newWeight[map[u]][map[v]] = weight[u][v];
  for (const u of external) { let bw = -Infinity; for (const c of cycle) bw = Math.max(bw, weight[u][c] - weight[pred(c)][c]); newWeight[map[u]][cycId] = bw; }
  for (const v of external) { let bw = -Infinity; for (const c of cycle) bw = Math.max(bw, weight[c][v]); newWeight[cycId][map[v]] = bw; }
  const subRoot = map[root];
  const subHead = cle(newWeight, subRoot);
  const head = new Array(n).fill(-1);
  for (let a = 0; a < m; a++) { if (a === subRoot) continue; const p = subHead[a];
    if (a === cycId) { const u = external[p]; let bw = -Infinity, bc = -1; for (const c of cycle) { const w = weight[u][c] - weight[pred(c)][c]; if (w > bw) { bw = w; bc = c; } } head[bc] = u; }
    else { const v = external[a]; if (p === cycId) { let bw = -Infinity, bc = -1; for (const c of cycle) if (weight[c][v] > bw) { bw = weight[c][v]; bc = c; } head[v] = bc; } else head[v] = external[p]; }
  }
  for (const c of cycle) if (head[c] === -1) head[c] = bestParent[c];
  return head;
}

// ── per-language arc-feature CODICES (folded on demand) ──────────────────────────────
const CODECS = {
  eng: (s, h, d) => {
    const f = []; const D = s.tokens[d - 1]; const H = h === 0 ? null : s.tokens[h - 1];
    const hw = h === 0 ? "ROOT" : norm(H.form), dw = norm(D.form);
    const hp = h === 0 ? "ROOT" : H.upos, dp = D.upos;
    const dir = d > h ? "R" : "L", dist = Math.abs(d - h) <= 4 ? String(Math.abs(d - h)) : Math.abs(d - h) <= 7 ? "5-7" : "8+";
    const CLOSED = ["DET", "AUX", "ADP", "PART", "PRON", "CCONJ", "SCONJ"];
    f.push("bias", `dp=${dp}`, `hp=${hp}`, `dp.hp=${dp}|${hp}`, `dir=${dir}`, `dist=${dist}`);
    f.push(`dw=${dw}`, `hw=${hw}`, `dw.hw=${dw}|${hw}`, `adj=${Math.abs(d - h) === 1}`);
    f.push(`dwt=${dw}|${dp}`, `hwt=${hw}|${hp}`);
    // configurational anchors (the Figure signal: who can govern, who is closed)
    f.push(`hverb=${h !== 0 && (H.upos === "VERB" || H.upos === "AUX")}`, `dclosed=${CLOSED.includes(dp)}`);
    f.push(`dir.dist=${dir}|${dist}`, `dp.hp.dir=${dp}|${hp}|${dir}`, `dp.hp.dist=${dp}|${hp}|${dist}`);
    // head context (the local phrase around the head)
    const hlw = h >= 2 ? norm(s.tokens[h - 2].form) : "∅", hrw = h < s.tokens.length ? norm(s.tokens[h].form) : "∅";
    const hlt = h >= 2 ? s.tokens[h - 2].upos : "∅", hrt = h < s.tokens.length ? s.tokens[h].upos : "∅";
    f.push(`hl=${hlw}`, `hr=${hrw}`, `hlt=${hlt}`, `hrt=${hrt}`, `hrt.dp=${hrt}|${dp}`);
    // dep context
    const dlw = d >= 2 ? norm(s.tokens[d - 2].form) : "∅", drw = d < s.tokens.length ? norm(s.tokens[d].form) : "∅";
    const dlt = d >= 2 ? s.tokens[d - 2].upos : "∅", drt = d < s.tokens.length ? s.tokens[d].upos : "∅";
    f.push(`dl=${dlw}`, `dr=${drw}`, `dlt=${dlt}`, `drt=${drt}`, `drt.hp=${drt}|${hp}`);
    // intervening tokens (the global Figure signal for PP attachment / coordination)
    const bw = between(s, h, d);
    if (bw.length) {
      f.push(`btwn=${uniq(bw.map((t) => t.upos))}`, `btwnN=${Math.min(bw.length, 6)}`);
      f.push(`btwnVerb=${bw.some((t) => t.upos === "VERB" || t.upos === "AUX")}`, `btwnAdp=${bw.some((t) => t.upos === "ADP")}`);
    }
    return f;
  },
  san: (s, h, d) => {
    const f = []; const D = s.tokens[d - 1]; const H = h === 0 ? null : s.tokens[h - 1];
    const hl = h === 0 ? "ROOT" : norm(H.lemma), dl = norm(D.lemma);
    const hp = h === 0 ? "ROOT" : H.upos, dp = D.upos;
    const hc = h === 0 ? "_" : attr(H.feats, "Case"), dc = attr(D.feats, "Case");
    const dir = d > h ? "R" : "L", dist = Math.abs(d - h) <= 4 ? String(Math.abs(d - h)) : Math.abs(d - h) <= 7 ? "5-7" : "8+";
    f.push("bias", `dp=${dp}`, `hp=${hp}`, `dp.hp=${dp}|${hp}`, `dir=${dir}`, `dist=${dist}`);
    f.push(`dc=${dc}`, `hc=${hc}`, `dc.hc=${dc}|${hc}`);
    f.push(`dn=${attr(D.feats, "Number")}`, `hn=${h === 0 ? "_" : attr(H.feats, "Number")}`, `dg=${attr(D.feats, "Gender")}`, `hg=${h === 0 ? "_" : attr(H.feats, "Gender")}`);
    f.push(`dper=${attr(D.feats, "Person")}`, `hper=${h === 0 ? "_" : attr(H.feats, "Person")}`, `dtns=${attr(D.feats, "Tense")}`, `hmd=${h === 0 ? "_" : attr(H.feats, "Mood")}`);
    f.push(`dl=${dl}`, `hl=${hl}`, `dl.hl=${dl}|${hl}`, `dl.dc=${dl}|${dc}`, `hl.hc=${hl}|${hc}`);
    return f;
  },
};

// ── averaged perceptron over arc features ─────────────────────────────────────────────
class Perceptron {
  constructor() { this.w = new Map(); this.aw = new Map(); this.steps = 0; }
  score(f) { let s = 0; for (const k of f) s += this.w.get(k) ?? 0; return s; }
  update(posF, negF) { for (const k of posF) this.w.set(k, (this.w.get(k) ?? 0) + 1); for (const k of negF) this.w.set(k, (this.w.get(k) ?? 0) - 1); for (const k of posF) this.aw.set(k, (this.aw.get(k) ?? 0) + this.steps); for (const k of negF) this.aw.set(k, (this.aw.get(k) ?? 0) - this.steps); this.steps++; }
  avg(f) { let s = 0; for (const k of f) s += (this.w.get(k) ?? 0) - ((this.aw.get(k) ?? 0) / this.steps); return s; }
}

export function trainGraph(sents, { lang = "eng", iterations = 10, log = () => {} } = {}) {
  const codec = CODECS[lang]; if (!codec) throw new Error("no codec for " + lang);
  const P = new Perceptron();
  const scores = (s) => { const n = s.tokens.length + 1; const sc = Array.from({ length: n }, () => new Array(n).fill(-Infinity)); for (let h = 0; h < n; h++) for (let d = 1; d < n; d++) if (h !== d) sc[h][d] = P.score(codec(s, h, d)); return sc; };
  for (let it = 0; it < iterations; it++) {
    let ok = 0, total = 0;
    for (const s of sents) {
      const n = s.tokens.length + 1;
      const pred = cle(scores(s), 0);   // decode the FULL tree, then update on the global mistake
      for (let d = 1; d < n; d++) {
        const g = s.tokens[d - 1].head === 0 ? 0 : s.tokens[d - 1].head;
        total++;
        if (pred[d] === g) { ok++; continue; }
        P.update(codec(s, g, d), codec(s, pred[d], d));
      }
    }
    log(`iter ${it + 1}/${iterations}: ${(100 * ok / total).toFixed(2)}% tree-head` );
  }
  return { P, codec, lang };
}
export function parseGraph(model, sents) {
  const { P, codec } = model;
  let uas = 0, las = 0, n = 0;
  for (const s of sents) {
    const N = s.tokens.length + 1;
    const sc = Array.from({ length: N }, () => new Array(N).fill(-Infinity));
    for (let h = 0; h < N; h++) for (let d = 1; d < N; d++) if (h !== d) sc[h][d] = P.avg(codec(s, h, d));
    const head = cle(sc, 0);
    for (let d = 1; d < N; d++) { const g = s.tokens[d - 1].head === 0 ? 0 : s.tokens[d - 1].head; if (g === null) continue; n++; if (head[d] === g) uas++; }
  }
  return { uas: n ? uas / n : 0, n };
}
