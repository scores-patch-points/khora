// greek-shadow.mjs — THE SHADOW, ON GREEK'S OWN SLOTS. impact.mjs's shadow was
// measured degenerate on Greek because the reader it ablates through (prior-free)
// has no case/POS slots for this language. Here the ablation runs through the
// SAME seam the main read uses (greekClauses: case · person · voice · mood ·
// tense — each slot carries its cube cell). The shadow of a word = the mean
// typed-slot delta of ablating it, typed by CUBE CELL (op·grain). Refused where
// the reader sees nothing change — never forced.
import fs from "node:fs";
import { confirmedVerbSet, greekClauses, nominalClass } from "../../lavar/greek.mjs";
import { splitSentences } from "../../../adapters/text/spans.js";
import { dmd, economySVD } from "../../../kernel/dmd.js";

const cellKey = (cell) => (cell ? `${cell.op}·${cell.grain}` : null);

export function makeGreekShadow(rawText, { posPrior, casePrior, dict = null, kinds = null, minCount = 2 } = {}) {
  const strip = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const fold = (k) => strip(k).replace(/[ηῆῃ]/g, "ε").replace(/[ωῶ]/g, "ο").replace(/[ΐϊίῖ]/g, "ι");
  if (!posPrior || !casePrior) {
    try { posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8")); } catch {}
    try { casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8")); } catch {}
  }
  const verbs = confirmedVerbSet(posPrior);

  // SENTENCES split once, token positions mapped to folds — the material owns the char address.
  const sents = splitSentences(String(rawText ?? "")).map((s) => String(s.text ?? s).trim()).filter((s) => s.length);
  const sentsToks = sents.map((s) => s.split(/[^\p{L}\u0300-\u036f]+/u).filter(Boolean));

  // ── the shadow box: parses the sentence ONCE with and WITHOUT the target token.
  const slotData = (clauses) => {
    // typed-slot delta over the clause's own grammar cells to a 27-dim cube-vector
    const vec = new Array(27).fill(0);
    const idx = (k) => { if (!k) return -1; const { op, grain } = k; return (["NUL","SIG","INS","SEG","CON","SYN","DEF","EVA","REC"].indexOf(op) * 3 + ["Ground","Figure","Pattern"].indexOf(grain)); };
    for (const c of clauses) {
      for (const cell of [c.subjectCell, c.objectCell, c.dativeCell]) { const i = idx(cell); if (i >= 0) vec[i] += 1; }
    }
    return vec;
  };
  // THE IMPRINT HALF: which slots the removed token itself filled — its own
  // subject/object/dative cell-votes in the clause it lived in. The shadow of a
  // word = (the slot-vote strip of ablating it) ⊕ (its own positional imprint).
  const imprintOf = (clauses, f) => {
    const vec = new Array(27).fill(0);
    const idx = (k) => { if (!k) return -1; const { op, grain } = k; return (["NUL","SIG","INS","SEG","CON","SYN","DEF","EVA","REC"].indexOf(op) * 3 + ["Ground","Figure","Pattern"].indexOf(grain)); };
    for (const c of clauses) {
      for (const role of [c.subject, c.object, c.dative]) {
        if (!role) continue;
        const head = String(role.head ?? role.surface ?? "").toLowerCase();
        if (strip(head).replace(/[ηῆῃ]/g,"ε").replace(/[ωῶ]/g,"ο").replace(/[ΐϊίῖ]/g,"ι") === f) {
          const i = idx(role.cell); if (i >= 0) vec[i] += 1;
        }
      }
    }
    return vec;
  };
  const parse = (s) => { try { return [...greekClauses(s, verbs, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })]; } catch { return []; } };
  // WORD → MEAN SHADOW: ablating it shifts the sentence's clause-slot cells.
  // (cap: up to 60 ablate-reads per word; a perception, rebuilt per read.)
  const shadowCache = new Map();
  const wordShadows = new Map();                       // fold-form -> { span, n }
  const gshOf = (w) => {
    const f = fold(w);
    if (wordShadows.has(f)) return wordShadows.get(f);
    if (!sents.length) return null;
    // find up to 40 occurrences (the addresses where this word lives)
    const hits = [];
    outer:
    for (let s = 0; s < sents.length && hits.length < 40; s++) for (let i = 0; i < sentsToks[s].length; i++) {
      if (fold(sentsToks[s][i]) === f) { hits.push([s, i]); if (hits.length >= 40) break outer; }
    }
    if (!hits.length) { wordShadows.set(f, null); return null; }
    let sum = new Array(27).fill(0), n = 0;
    for (const [s, i] of hits) {
      const full = parse(sents[s]);
      const toks = sentsToks[s];
      const removed = toks.filter((_, j) => j !== i).join(" ");
      const without = parse(removed);
      const vFull = slotData(full), vWithout = slotData(without);
      const diff = vFull.map((x, k) => x - vWithout[k]);
      const imprint = imprintOf(full, f);
      for (let k = 0; k < 27; k++) sum[k] += diff[k] + imprint[k];
      n += 1;
    }
    const mean = sum.map((x) => x / n);
    wordShadows.set(f, { span: mean, n });
    return wordShadows.get(f);
  };

  // ANCHORS: janus dictionary heads + induced being-kinds, when present in the text.
  const anchorSet = new Map();
  const lookup = typeof dict === "function" ? dict : (dict?.lookup ?? ((x) => x));
  const addAnchor = (k, gloss) => { const s = fold(String(k)); if (!anchorSet.has(s) && sents.some((t) => fold(t).includes(s))) anchorSet.set(s, { source: "dictionary", gloss, form: k, s }); };
  if (dict) { const keys = dict.__keys ?? (typeof dict === "object" ? Object.keys(dict) : []); for (const k of keys) addAnchor(k, lookup(k)); }
  if (kinds) for (const k of kinds) addAnchor(k, k);

  // POS gate: a verbal head may never wear a nominal anchor.
  const nominalTags = new Set(["NOUN", "PROPN", "PRON", "ADJ", "DET", "NUM"]);
  const verbalTags = new Set(["VERB", "AUX"]);
  const agree = (w, a) => {
    const pw = nominalClass(strip(w), posPrior), pa = nominalClass(strip(a), posPrior);
    if (pw == null || pa == null) return null;
    if (nominalTags.has(pw) && nominalTags.has(pa)) return 1;
    if (verbalTags.has(pw) && verbalTags.has(pa)) return 1;
    return 0;
  };
  const cosV = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return na && nb ? d / Math.sqrt(na * nb) : 0; };
  // DEGENERACY GATES — a shadow this sparse cannot wear confidence:
  //   · a vector firing FEWER THAN 2 cells is one-hot noise; refuse the query
  //   · cos > 0.99 is saturated gold-weight alignment, not agreement — refuse
  //     (measured 2026-10-08: εταρους→"to come"=1, ολοντο→"Odysseus"=1 were
  //     both WRONG — the single shared cell saturated the cosine).
  const fired = (v) => { let n = 0; for (const x of v) if (Math.abs(x) > 1e-9) n += 1; return n; };
  const SATURATION = 0.99;

  const nearestAnchored = (w, { min = 0.3, margin = 1.05 } = {}) => {
    const bare = String(w ?? "").replace(/^\(\?/, "").replace(/\?$/, "").replace(/\)$/, "").trim();
    const uw = gshOf(bare);
    if (!uw || !uw.n) return { refused: "no_occurrence" };
    // DENSE in the read's eigen-space: project the sparse raw shadow onto the
    // trajectory's SVD basis — the word's loading of each Koopman mode.
    const uspec = spectralProj(uw.span);
    if (uspec.every((x) => Math.abs(x) < 1e-9)) return { refused: "degenerate_query", detail: "zero spectral loading — no mode the word excites" };
    const scored = [...anchorSet.values()]
      .filter((a) => a.s !== fold(bare))                    // never resolve a word to itself
      .map((a) => {
        const aw = gshOf(a.form);
        let sim = 0;
        if (aw && aw.n) {
          sim = cosV(uspec, spectralProj(aw.span));
          if (sim > SATURATION && sim >= min) sim = 0;      // gold-weight saturation, refuse
        }
        const g = agree(bare, a.form);
        if (g === 0) sim = 0;
        return { a, sim };
      }).filter((x) => x.sim >= min).sort((a, b) => b.sim - a.sim);
    if (!scored.length) return { refused: "contested_or_no_anchor" };
    const top = scored[0], second = scored[1]?.sim ?? 0;
    if (top.sim < second * margin) return { refused: "contested", top: top.a.gloss, sim: +top.sim.toFixed(3) };
    return { anchor: top.a.s, sim: +top.sim.toFixed(3), gloss: top.a.gloss, source: top.a.source };
  };

  // THE READ'S DYNAMICS, IN CELLS AS EIGENVALUES. The clause stream is a
  // trajectory over the 27-cell spine; DMD (kernel/dmd.js, Koopman) decomposes
  // it into modes each with complex eigenvalue — |λ| is the cell's growth,
  // arg(λ) its FREQUENCY in the read's own flow. The trajectory's SVD basis U
  // is DMD's own observable space: orthonormal, dense, built from the read
  // itself (never a hand-chosen weight). A word's shadow, projected onto U,
  // becomes a dense spectral signature — how the word loads the read's modes —
  // and sparse-cell saturation vanishes because the modes are orthonormal:
  // each cell is held AS the eigenvalue of a mode, never a lone tally bin.
  const cellTrajectory = (() => {
    const idx = (k) => { if (!k) return -1; const { op, grain } = k; return (["NUL","SIG","INS","SEG","CON","SYN","DEF","EVA","REC"].indexOf(op) * 3 + ["Ground","Figure","Pattern"].indexOf(grain)); };
    const T = [];                                            // T[t] = 27-dim occupancy of sentence t
    for (const s of sents) {
      const v = new Array(27).fill(0);
      for (const c of parse(s)) for (const cell of [c.subjectCell, c.objectCell, c.dativeCell]) { const i = idx(cell); if (i >= 0) v[i] += 1; }
      T.push(v);
    }
    if (T.length < 4) return { proj: (v) => v, eigenvalues: [] };
    const X = T.slice(0, -1);
    const Xp = T.slice(1);
    const modeMap = dmd(X, Xp, { rank: "numerical", dt: 1 });
    // U = the left singular vectors of the trajectory (DMD's observable basis).
    const { U, s: sing } = economySVD(X);
    const r = U.length ? U[0].length : 0;
    return {
      eigenvalues: modeMap.eigenvalues.slice(0, r),
      proj: (v) => { const out = new Array(r).fill(0); for (let r2 = 0; r2 < r; r2++) { let d = 0; for (let i = 0; i < Math.min(27, v.length); i++) d += v[i] * (U[i]?.[r2] ?? 0); out[r2] = d; } return out; },
    };
  })();
  const spectralProj = cellTrajectory.proj;

  const shadowOf = (w) => { const s = gshOf(w); return s ? { ...s, spec: spectralProj(s.span) } : null; };
  return { nearestAnchored, shadowOf, anchors: anchorSet.keys(), count: wordShadows.size };
}