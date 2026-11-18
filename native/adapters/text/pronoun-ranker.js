// pronoun-ranker.js — a small, auditable antecedent ranker for he/she-class pronouns (identity/novels PREREG-ROUND25.md).
// It never adds a candidate: it reorders the candidates the presence rung already offers (`keepCandidates`), with a few NAMED, CAUSAL features (only the text before the pronoun, plus the rung's own earlier argmax).
// Model: conditional logit (softmax over a pronoun's candidates), L2, full-batch Adam, no hidden layer. The weights are a named JSON, readable by hand.
const KIND = (tok) => { const t = tok.toLowerCase(); return /^(he|she)$/.test(t) ? "subj" : /^(him)$/.test(t) ? "obj" : /^(his|hers|her)$/.test(t) ? (t === "her" ? "obj" : "poss") : /self$/.test(t) ? "refl" : "subj"; };
const KINDS = ["subj", "obj", "poss", "refl"]; const CROSSED = ["named_earlier_in_sentence", "last_mention_opened_sentence", "prev_pronoun_argmax"];
export const FEATURE_NAMES = Object.freeze(["log_activation", "rung_top", "rung_second", "dist0", "dist1", "dist2", "dist3plus", "log_mentions", "last_mention_opened_sentence", "named_earlier_in_sentence", "only_being_in_sentence", "prev_pronoun_argmax", "most_recent_mention", ...CROSSED.flatMap((f) => KINDS.map((k) => `${f}*${k}`))]);
export const FEATURE_FAMILIES = Object.freeze({ activation: ["log_activation", "rung_top", "rung_second"], distance: ["dist0", "dist1", "dist2", "dist3plus", "most_recent_mention"], salience: ["log_mentions", "last_mention_opened_sentence"], same_sentence: ["named_earlier_in_sentence", "only_being_in_sentence"], continuity: ["prev_pronoun_argmax"], kind_crossed: FEATURE_NAMES.filter((n) => n.includes("*")) });

// rows for one document: sentences [{i, offset, text}], mentions [{ref, start, end}], candidateLog [{offset, pronoun, cands:[[ref, activation]]}] -> [{offset, pronoun, kind, cands:[{ref, x}]}]
export function featureRows(sentences, mentions, candidateLog) {
  const ms = [...mentions].sort((a, b) => a.start - b.start); const sentOf = (pos) => { let lo = 0, hi = sentences.length - 1, ans = 0; while (lo <= hi) { const mid = (lo + hi) >> 1; if (sentences[mid].offset <= pos) { ans = mid; lo = mid + 1; } else hi = mid - 1; } return ans; };
  const first = new Map(); const seen = new Set(); for (const m of ms) { const si = sentOf(m.start); const k = si; if (!seen.has(k)) { seen.add(k); first.set(m, true); } }
  const log = [...candidateLog].sort((a, b) => a.offset - b.offset); let prevArg = null; const rows = [];
  for (const e of log) {
    if (!e.cands.length) continue; const si = sentOf(e.offset); const before = ms.filter((m) => m.start < e.offset); const kind = KIND(e.pronoun);
    const sameSent = before.filter((m) => sentOf(m.start) === si); const sameRefs = new Set(sameSent.map((m) => m.ref)); const lastAny = before[before.length - 1]?.ref;
    const cands = e.cands.map(([ref, act], rank) => { const mine = before.filter((m) => m.ref === ref); const last = mine[mine.length - 1]; const d = last ? si - sentOf(last.start) : 9;
      const f = { log_activation: Math.log(Math.max(act, 1e-9)), rung_top: rank === 0 ? 1 : 0, rung_second: rank === 1 ? 1 : 0, dist0: d === 0 ? 1 : 0, dist1: d === 1 ? 1 : 0, dist2: d === 2 ? 1 : 0, dist3plus: d >= 3 ? 1 : 0, log_mentions: Math.log1p(mine.length), last_mention_opened_sentence: last && first.get(last) ? 1 : 0, named_earlier_in_sentence: sameRefs.has(ref) ? 1 : 0, only_being_in_sentence: sameRefs.size === 1 && sameRefs.has(ref) ? 1 : 0, prev_pronoun_argmax: prevArg === ref ? 1 : 0, most_recent_mention: lastAny === ref ? 1 : 0 };
      for (const c of CROSSED) for (const k of KINDS) f[`${c}*${k}`] = k === kind ? f[c] : 0; return { ref, x: FEATURE_NAMES.map((n) => f[n]) }; });
    rows.push({ offset: e.offset, pronoun: e.pronoun, kind, cands }); prevArg = e.cands[0][0];
  }
  return rows;
}
const softmax = (zs) => { const m = Math.max(...zs); const es = zs.map((z) => Math.exp(z - m)); const s = es.reduce((a, b) => a + b, 0); return es.map((e) => e / s); };
export const scoreRow = (w, row) => softmax(row.cands.map((c) => c.x.reduce((a, v, i) => a + v * w[i], 0)));
export const pick = (w, row) => { const p = scoreRow(w, row); let b = 0; for (let i = 1; i < p.length; i++) if (p[i] > p[b]) b = i; return { ref: row.cands[b].ref, p: p[b], index: b }; };
// rows carry `correct`: Set of refs that are right. Marginal likelihood over the correct candidates; pronouns with no correct candidate carry no signal and are skipped.
export function fit(rows, { lambda = 0.1, iters = 400, lr = 0.05, only = null } = {}) {
  const use = rows.filter((r) => r.cands.some((c) => r.correct.has(c.ref))); const D = FEATURE_NAMES.length; const mask = only ? FEATURE_NAMES.map((n) => (only.has(n) ? 1 : 0)) : FEATURE_NAMES.map(() => 1);
  const w = new Array(D).fill(0), m = new Array(D).fill(0), v = new Array(D).fill(0);
  for (let t = 1; t <= iters; t++) { const g = new Array(D).fill(0);
    for (const r of use) { const p = scoreRow(w, r); const pc = r.cands.reduce((a, c, i) => a + (r.correct.has(c.ref) ? p[i] : 0), 0) || 1e-12;
      r.cands.forEach((c, i) => { const q = r.correct.has(c.ref) ? p[i] / pc : 0; const coef = p[i] - q; for (let d = 0; d < D; d++) g[d] += coef * c.x[d]; }); }
    for (let d = 0; d < D; d++) { g[d] = (g[d] / Math.max(1, use.length) + lambda * w[d]) * mask[d]; m[d] = 0.9 * m[d] + 0.1 * g[d]; v[d] = 0.999 * v[d] + 0.001 * g[d] * g[d]; w[d] -= lr * (m[d] / (1 - 0.9 ** t)) / (Math.sqrt(v[d] / (1 - 0.999 ** t)) + 1e-8); } }
  return w;
}
export const weightsJson = (w, extra = {}) => ({ schema: "PronounRanker@1", features: Object.fromEntries(FEATURE_NAMES.map((n, i) => [n, +w[i].toFixed(4)])), ...extra });
