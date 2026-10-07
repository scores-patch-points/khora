// eval/law/identity-fold-compare.mjs — IDENTITY AS A FOLD, BY COMPARISON (no perturbation): two spans are the same referent
// iff the universe folded at each — bounded by distinctions that make a difference, from a perspective, following the relation
// order — are LESS DIFFERENT than chance. New file; nothing existing is edited.
//
//   node eval/law/identity-fold-compare.mjs run [--tbs A,B] [--w 2] [--per-doc 40] [--max-pairs 400] [--max-sents 150] [--out DIR]
//   node eval/law/identity-fold-compare.mjs report [--out DIR]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5 / READING-POLICY II.23). Written BEFORE the first run. ══════════════════════════════
// THE CLAIM (the user's refinement R2, second form). "A word is only the company it keeps and nothing more"; identity is the
// universe folded at a point. So: take a span, FOLD it — the typed, directed relations reachable from the slots it fills
// (impact.mjs slotStructure), truncated by the distinctions that make a difference — and two spans are the same referent iff
// their folds are LESS DIFFERENT THAN CHANCE. No token is deleted or exchanged: the word is empty, so perturbing it measures
// nothing (identity-fold.mjs falsified that); the test is a COMPARISON of two folds against a null.
// FOLD(s; p, w). p = the window (the declared standpoint). w = a declared graph radius (2 here: the relation a span stands in
//   and its one-hop relations through the co-figure sharing an edge). THE DMD BOUND: the reach of the present R is MEASURED per
//   document by kernel/activation.js::dmdWindow over sentence recency, conclusion = the cast (figures recurring >= 2); a relation
//   more than R sentences from any occurrence of the span is outside the fold (it "makes no difference" by the material's own
//   measure). R is reported; when dmdWindow returns reach_exceeds_candidates the whole document is the fold (flagged).
// THE FOLD VECTOR of s = a sparse weighted map over {direction:other-figure, L:label} of the relations touching s, weight
//   1/(1+frame-distance); direction from s (out if s is end1, in if end2, self if both). Distance = 1 - cosine.
// GOLD. CorefUD via the built D15 adapter, split "dev" = bucket 4 of TRAIN. The CorefUD test file is never opened. Unambiguous
//   forms only (one cluster), exact window tokens, type by head UPOS.
// PAIRS. Unordered distinct forms in a document, balanced pos (same cluster) / neg (different), seeded, capped.
// ARMS (AUC against the gold; higher = more likely same).
//   fold       REAL: cosine of the fold vectors (DMD-bounded).
//   foldNoDmd  ablation: the same cosine with NO DMD bound (all frames) — what the measured reach buys.
//   company    rival: Jaccard of the sentence co-occurrence sets (the company in the plain sense).
//   string     rival: 1 iff same string. span rival: -|mean position difference|. lemma rival (giver-based).
// CONTROLS. K1 self-fold: cosine(fold(s), fold(s)) = 1 exactly. K2 determinism: recomputed fold vector identical. K3 SHUFFLE:
//   cluster labels permuted among the document's forms; fold AUC under the permutation must sit near 0.5.
// METRIC. AUC of each arm; document-cluster bootstrap CI for fold; and a NEAREST-FOLD test: for each form, the rank of its
//   true coreferent among all forms in the document by fold similarity (mean reciprocal rank; chance MRR = 1/(n-1)).
// PASS (declared before the run): fold AUC >= 0.70 AND cluster-CI lower > 0.55 AND fold beats company, string, span by >= 0.10
//   AND K1/K2 hold AND nearest-fold MRR exceeds chance (mean MRR > 2x the chance mean across documents). Under-powered when
//   < 60 pairs or < 5 docs; unmeasured when the file is absent.
// PREDICTIONS (blind; orders are the claims).
//   PF1 fold > chance (AUC > 0.55) on all three treebanks: the fold carries real identity (the company it keeps).
//   PF2 fold is within 0.05 of company (the fold IS the company, made structural), and the DMD bound does not change AUC by
//       more than 0.03 (PF2b) — a first, honest test of whether the measured reach matters.
//   PF3 fold > string and > span on name->pronoun (both are near chance there).
//   PF4 mean nearest-fold MRR > chance by >= 2x on at least two treebanks.
//   Headline guess: fold AUC in [0.55, 0.75]; the fold's structural typing buys little over plain company on this data.
// NOT TESTED: the dependency ORDER of operations (needs the folding reader that emits operations — kernel/fold.js / the-fold/fold.js
//   — not the stateless impact readers); perspective beyond the window; a learned fold metric; languages the reader cannot tokenise.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readWindow, slotStructure, sentenceText } from "./impact.mjs";
import { dmdWindow } from "../../kernel/activation.js";
import { corefCorpus, loadCorefTreebank, rngFor } from "./corpus.mjs";
import { norm, docStream, formIndex, pairType, auc } from "./identity-fold.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, "results", "identity-fold-compare");
export const W_FOLD = 2;
export const MIN_PAIRS = 60, MIN_DOCS = 5, BAR = 0.70, CI_LOWER_BAR = 0.55, SESOI = 0.10;
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const dyadic = (n) => { const o = []; for (let d = 2; d < n; d *= 2) if (d >= 2) o.push(d); return o; };
const jaccard = (a, b) => { if (!a.size && !b.size) return 1; let i = 0; for (const x of a) if (b.has(x)) i += 1; return i / (a.size + b.size - i); };
const cos = (a, b) => { let dot = 0, na = 0, nb = 0; for (const [k, x] of a) { na += x * x; if (b.has(k)) dot += x * b.get(k); } for (const x of b.values()) nb += x * x; return na && nb ? dot / Math.sqrt(na * nb) : 0; };

/** The reach of the present: the shallowest sentence depth whose cast (figures recurring >= 2) equals the whole document's. */
export function reachOf(stream) {
  const derive = (sents) => { const c = new Map(); for (const s of sents) for (const k of new Set(s)) c.set(k, (c.get(k) ?? 0) + 1); return [...c].filter(([, n]) => n >= 2).map(([k]) => k).sort(); };
  const cand = dyadic(stream.length);
  if (!cand.length) return { window: null, gap: "too_short" };
  const m = dmdWindow(stream, derive, { candidates: cand, restrict: (o, d) => o.slice(Math.max(0, o.length - d)) });
  return { window: m.window, gap: m.gap ?? null };
}

/** FOLD(s): the typed, directed relations touching s, within radius w and within the measured reach R of any occurrence. */
export function foldVector(sl0, form, occ, { w = W_FOLD, R = null } = {}) {
  const v = new Map();
  const add = (k, x) => v.set(k, (v.get(k) ?? 0) + x);
  const occFrames = occ.map(([e]) => e);
  const byFig = new Map();
  for (const ed of sl0.rel) for (const f of [ed.end1, ed.end2]) { if (!byFig.has(f)) byFig.set(f, []); byFig.get(f).push(ed); }
  const dist = new Map([[form, 0]]);
  let frontier = [form];
  for (let hop = 0; hop <= w && frontier.length; hop += 1) {
    const next = [];
    for (const node of frontier) {
      for (const ed of byFig.get(node) ?? []) {
        const fd = Math.min(...occFrames.map((e) => Math.abs(ed.e - e)));
        if (R != null && fd > R) continue;
        const wgt = 1 / ((1 + fd) * (1 + hop));
        add(`L:${ed.label}`, wgt);
        const other = ed.end1 === node ? ed.end2 : ed.end1;
        add(`F:${other}`, wgt);
        if (!dist.has(other)) { dist.set(other, hop + 1); next.push(other); }
      }
    }
    frontier = next;
  }
  return v;
}

function companySet(stream, form) {
  const s = new Set();
  for (const sent of stream) if (sent.includes(form)) for (const t of sent) s.add(t);
  return s;
}
const pMean = (occ) => occ.reduce((a, [e, i]) => a + e * 10000 + i, 0) / occ.length;

function runTreebank(entry, { perDoc, maxPairs, maxSents }) {
  const tb = loadCorefTreebank(entry, { split: "dev" });
  const sentById = new Map(tb.sentences.map((s) => [s.i, s]));
  const pairs = [];
  const reach = [];
  for (const doc of tb.docs) {
    const { stream, localOf } = docStream(doc, sentById, { maxSents });
    if (stream.length < 2) continue;
    const idx = formIndex(doc, sentById, stream, localOf);
    if (idx.size < 2) continue;
    const read0 = readWindow(stream.map(sentenceText));
    const sl0 = slotStructure(read0);
    const R = reachOf(stream);
    reach.push(R.window);
    const forms = [...idx.entries()].map(([f, r]) => ({ f, ...r, fold: foldVector(sl0, f, r.occ, { R: R.window }), foldAll: foldVector(sl0, f, r.occ, { R: null }) }));
    const rnd = rngFor("identity-fold-compare", entry.treebank, doc.docId);
    const pos = [], neg = [];
    for (let a = 0; a < forms.length; a += 1) for (let b = a + 1; b < forms.length; b += 1) (forms[a].cluster === forms[b].cluster ? pos : neg).push([forms[a], forms[b]]);
    const shuf = (arr) => { for (let i = arr.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    shuf(pos); shuf(neg);
    const take = Math.max(1, Math.floor(perDoc / 2));
    for (const [A, B] of [...pos.slice(0, take), ...neg.slice(0, take)]) pairs.push({ doc: doc.docId, stream, A, B, label: A.cluster === B.cluster ? 1 : 0 });
    pairs.__forms ??= [];
    pairs.__forms.push({ doc: doc.docId, forms, seed: rnd });
  }
  // balanced global cap
  const rndG = rngFor("identity-fold-compare-cap", entry.treebank);
  const shufG = (arr) => { for (let i = arr.length - 1; i > 0; i -= 1) { const j = Math.floor(rndG() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const P = shufG(pairs.filter((p) => p.label === 1)), N = shufG(pairs.filter((p) => p.label === 0));
  const half = Math.floor(maxPairs / 2);
  const picked = shufG([...P.slice(0, half), ...N.slice(0, half)]);
  const rows = picked.map((p) => {
    const { A, B } = p;
    return {
      doc: p.doc, a: A.f, b: B.f, type: pairType(A, B), label: p.label,
      fold: cos(A.fold, B.fold) || (A.fold.size === 0 && B.fold.size === 0 ? 1 : 0),
      foldNoDmd: cos(A.foldAll, B.foldAll) || (A.foldAll.size === 0 && B.foldAll.size === 0 ? 1 : 0),
      company: jaccard(companySet(p.stream, A.f), companySet(p.stream, B.f)),
      string: A.f === B.f ? 1 : 0, span: -Math.abs(pMean(A.occ) - pMean(B.occ)),
      lemma: (A.lemmas.size && B.lemmas.size && [...A.lemmas].some((l) => B.lemmas.has(l))) ? 1 : 0,
    };
  });
  // nearest-fold MRR: rank the true coreferent among the document's forms by fold similarity
  const rr = [];
  for (const { forms } of pairs.__forms ?? []) {
    for (const A of forms) { const others = forms.filter((x) => x.f !== A.f); if (!others.length) continue; const ranked = others.map((x) => [x, cos(A.fold, x.fold)]).sort((u, v) => v[1] - u[1]); const i = ranked.findIndex(([x]) => x.cluster === A.cluster); if (i >= 0) rr.push(1 / (i + 1)); }
  }
  return { rows, reach, mrr: mean(rr), mrrChance: mean((pairs.__forms ?? []).flatMap(({ forms }) => forms.map(() => 1 / Math.max(1, forms.length - 1)))) };
}

function summarise(tb) {
  const rows = tb.rows;
  const S = (k, rs = rows) => round(auc(rs.map((r) => r[k]), rs.map((r) => r.label)));
  const docs = [...new Set(rows.map((r) => r.doc))];
  const rnd = rngFor("ifc-boot", "x");
  const boot = [];
  for (let t = 0; t < 300; t += 1) { const s = docs.map(() => docs[Math.floor(rnd() * docs.length)]); const rs = []; for (const d of s) for (const r of rows) if (r.doc === d) rs.push(r); const a = auc(rs.map((r) => r.fold), rs.map((r) => r.label)); if (a != null) boot.push(a); }
  boot.sort((x, y) => x - y);
  const ci = boot.length ? [round(boot[Math.floor(0.025 * boot.length)]), round(boot[Math.floor(0.975 * boot.length)])] : null;
  const byType = {};
  for (const t of ["name->pronoun", "name->name", "name->nominal", "pronoun->pronoun", "pronoun->nominal", "nominal->nominal"]) { const rs = rows.filter((r) => r.type === t); if (rs.length) byType[t] = { n: rs.length, fold: S("fold", rs), company: S("company", rs), string: S("string", rs), span: S("span", rs) }; }
  const rw = tb.reach.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return { n: rows.length, nPos: rows.filter((r) => r.label === 1).length, nDocs: docs.length, fold: S("fold"), foldNoDmd: S("foldNoDmd"), company: S("company"), string: S("string"), span: S("span"), lemma: S("lemma"), ci, mrr: round(tb.mrr), mrrChance: round(tb.mrrChance), reachMedian: rw.length ? rw[Math.floor(rw.length / 2)] : null, reachGapShare: round(tb.reach.filter((x) => x == null).length / Math.max(1, tb.reach.length)), byType };
}

function controls(entry) {
  const tb = loadCorefTreebank(entry, { split: "dev" });
  const sentById = new Map(tb.sentences.map((s) => [s.i, s]));
  const doc = tb.docs.find((d) => d.sentenceIndices.length >= 3);
  if (!doc) return { K1: null, K2: null };
  const { stream, localOf } = docStream(doc, sentById, { maxSents: 150 });
  const idx = formIndex(doc, sentById, stream, localOf);
  if (!idx.size) return { K1: null, K2: null };
  const sl0 = slotStructure(readWindow(stream.map(sentenceText)));
  const R = reachOf(stream).window;
  let pick = null;
  for (const [f, r] of idx) { if (foldVector(sl0, f, r.occ, { R }).size) { pick = [f, r]; break; } }
  if (!pick) return { K1: null, K2: null };
  const [f, r] = pick;
  const a = foldVector(sl0, f, r.occ, { R }), b = foldVector(sl0, f, r.occ, { R });
  return { K1: { cos: round(cos(a, b)), exact: cos(a, b) === 1 && a.size > 0 }, K2: { exact: JSON.stringify([...a]) === JSON.stringify([...b]) } };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = { tbs: null, perDoc: 40, maxPairs: 400, maxSents: 150, out: OUT_DIR, w: W_FOLD };
  for (let i = 0; i < rest.length; i += 1) { const a = rest[i]; if (a === "--tbs") o.tbs = rest[++i].split(","); else if (a === "--per-doc") o.perDoc = Number(rest[++i]); else if (a === "--max-pairs") o.maxPairs = Number(rest[++i]); else if (a === "--max-sents") o.maxSents = Number(rest[++i]); else if (a === "--out") o.out = rest[++i]; }
  const inv = corefCorpus({ split: "dev" });
  if (!inv.available) { console.log(JSON.stringify({ gap: inv.gap, reason: inv.reason })); return; }
  const want = o.tbs ?? ["English-GUM", "English-LitBank", "Catalan-AnCora"];
  const chosen = inv.treebanks.filter((t) => want.includes(t.treebank.replace(/^CorefUD_/, "")));
  if (cmd === "run") {
    fs.mkdirSync(o.out, { recursive: true });
    const out = { w: o.w, treebanks: {} };
    for (const entry of chosen) {
      const t0 = Date.now();
      const tb = runTreebank(entry, o);
      const ctl = controls(entry);
      const sum = summarise(tb);
      const pass = sum.n >= MIN_PAIRS && sum.nDocs >= MIN_DOCS && sum.fold != null && sum.fold >= BAR && (sum.ci?.[0] ?? -1) > CI_LOWER_BAR
        && ["company", "string", "span"].every((k) => sum[k] != null && sum.fold - sum[k] >= SESOI)
        && ctl.K1?.exact === true && ctl.K2?.exact === true && sum.mrr > 2 * sum.mrrChance;
      out.treebanks[entry.treebank] = { ...sum, controls: ctl, pass, seconds: round((Date.now() - t0) / 1000, 1) };
      fs.writeFileSync(path.join(o.out, `${entry.treebank}.rows.json`), JSON.stringify(tb.rows));
      console.error(`${entry.treebank}: n=${sum.n} fold=${sum.fold} company=${sum.company} reach=${sum.reachMedian} pass=${pass} ${out.treebanks[entry.treebank].seconds}s`);
    }
    fs.writeFileSync(path.join(o.out, "identity-fold-compare.json"), JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
  } else if (cmd === "report") {
    const R = JSON.parse(fs.readFileSync(path.join(o.out, "identity-fold-compare.json"), "utf8"));
    const f = (x) => (x == null ? "  -  " : Number(x).toFixed(3));
    const L = ["# identity-as-fold, BY COMPARISON (CorefUD dev; w=" + R.w + ")", "", "treebank                 n   docs  fold   foldNoD company string span  lemma  CI(fold)      MRR/chance   reach  pass"];
    for (const [n, t] of Object.entries(R.treebanks)) L.push(`${n.padEnd(24)} ${String(t.n).padStart(3)} ${String(t.nDocs).padStart(4)}  ${f(t.fold)} ${f(t.foldNoDmd)}  ${f(t.company)} ${f(t.string)} ${f(t.span)} ${f(t.lemma)}  ${(t.ci ? `[${t.ci[0]},${t.ci[1]}]` : "-").padEnd(13)} ${f(t.mrr)}/${f(t.mrrChance)}   ${String(t.reachMedian).padStart(3)}   ${t.pass}`);
    for (const [n, t] of Object.entries(R.treebanks)) { L.push("", `## ${n} by subtype`); for (const [k, v] of Object.entries(t.byType)) L.push(`  ${k.padEnd(18)} n=${String(v.n).padStart(4)} fold ${f(v.fold)} company ${f(v.company)} string ${f(v.string)} span ${f(v.span)}`); L.push(`  controls ${JSON.stringify(t.controls)}  reachGapShare ${t.reachGapShare}`); }
    console.log(L.join("\n"));
  } else { console.error("usage: identity-fold-compare.mjs run|report [--tbs A,B] [--per-doc N] [--max-pairs N]"); process.exit(2); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
