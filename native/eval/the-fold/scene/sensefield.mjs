// sensefield.mjs — THE FIELD OF MEANING BY ABLATION. A word's meaning is not
// what it is near but the DELTA between what it is near and the whole background
// it is not — and the delta is the SHADOW: the typed slot changes when the word
// is removed (impact.mjs). Two views, both honest:
//   • ppmi (DEFAULT here): observed co-occurrence minus the corpus-wide
//     expectation — the manifold between the janus dictionary's anchored heads.
//     Rebuilt per read; a perception, not a law.
//   • shadow (available, RESOLVER FOR THIS MATERIAL REFUSED): a word's mean
//     impact span-delta. MEASURED DEGENERATE ON GREEK: the prior-free reader
//     impact.mjs ablates through yields a one-hot span (1 bin fires, norm 1.0),
//     and cosine over one-hot null-versus-anchor vectors is essentially random.
//     The shadow is a real object (the repo, NAME-SHAPE-RESULTS) but it is not
//     yet a working resolver on this language — it stands REFUSED here, named,
//     never forced. It will resolve once the reader it ablates through has the
//     Greek grammar's slots (case/POS-driven), which is a build, not a tweak.
//
// THIS IS KHORA'S, NOT JANUS'S — it is not a law. A law precedes its application
// (the lemma/case/pronoun priors: fixed, giver-named, consulted). This field is
// PERCEPTION: it is rebuilt at read time from the material being read, and cannot
// exist apart from the perceiving — the chora, the receptacle between things and
// laws, where a word is resolved not by decree but by where its delta sits against
// the whole background. The dictionary anchors are janus; the manifold is khora.
import { makeSnapshot, impactOfToken } from "../../law/impact.mjs";
import { splitSentences } from "../../../adapters/text/spans.js";

export function makeSenseField(rawText, { radius = 4, dict = null, posOf = null, kinds = null, minCount = 2 } = {}) {
  const strip = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const fold = (k) => strip(k).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
  // tokenize the raw material with positions
  const toks = [];
  for (const m of String(rawText).matchAll(/[\p{L}\u0300-\u036f]+/gu)) toks.push({ w: fold(m[0]), i: toks.length });
  const unigram = new Map();
  for (const t of toks) unigram.set(t.w, (unigram.get(t.w) ?? 0) + 1);
  const words = new Set(toks.map((t) => t.w).filter((w) => (unigram.get(w) ?? 0) >= minCount));
  const co = new Map(); // w -> Map(n -> count)
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i].w;
    if (!words.has(w)) continue;
    let row = co.get(w); if (!row) { row = new Map(); co.set(w, row); }
    for (let d = 1; d <= radius; d++) {
      for (const j of [i - d, i + d]) {
        const n = toks[j]?.w; if (!n || n === w || !words.has(n)) continue;
        row.set(n, (row.get(n) ?? 0) + 1);
        let prow = co.get(n); if (!prow) { prow = new Map(); co.set(n, prow); }
        prow.set(w, (prow.get(w) ?? 0) + 1);
      }
    }
  }
  const N = toks.length;
  // PPMI (secondary): observed co-occurrence minus the corpus-wide expectation.
  const ppmi = (w, n) => {
    const cwn = co.get(w)?.get(n) ?? 0;
    if (!cwn) return 0;
    const p = (cwn * N) / (unigram.get(w) * unigram.get(n));
    return Math.max(0, Math.log2(p));
  };
  const vec = (w) => { const v = new Map(); for (const n of (co.get(w)?.keys() ?? [])) { const p = ppmi(w, n); if (p > 0) v.set(n, p); } return v; };
  const cosine = (a, b) => {
    let dot = 0, na = 0, nb = 0;
    for (const [k, v] of a) { na += v * v; const x = b.get(k); if (x) dot += v * x; }
    for (const v of b.values()) nb += v * v;
    return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  };
  const cosVec = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return na && nb ? d / Math.sqrt(na * nb) : 0; };

  // ── ANCHORS: the received dictionary's folded heads (janus) PLUS the induced
  // being-kinds, when either has a foothold in the material. ──
  const anchorSet = new Map();                              // anchor-form -> { source, gloss, form }
  const addAnchor = (k, gloss) => { const s = fold(String(k)); if (!anchorSet.has(s) && words.has(s)) anchorSet.set(s, { source: "dictionary", gloss, form: k, s }); };
  const lookup = typeof dict === "function" ? dict : (dict?.lookup ?? ((w2) => w2));
  if (dict) { const keys = dict.__keys ?? (typeof dict === "object" ? Object.keys(dict) : []); for (const k of keys) addAnchor(k, lookup(k)); }
  if (kinds) for (const k of kinds) addAnchor(k, k);
  const anchors = [...anchorSet.values()];

  // ── THE SHADOW — the primary view. A token's shadow is its mean typed-slot-
  // delta when ablated (impactOfToken → span signature over the reader's slots).
  // Built LAZILY per word, over the text's own sentences, capped to keep it O(1)
  // per query (a perception: it exists because this read is being perceived).
  const sents = (() => { try { return splitSentences(String(rawText)).map((s) => String(s.text ?? s).toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean)); } catch { return null; } })();
  const shadowCache = new Map();                            // folded-form -> mean span vector {n, v}
  const loadShadow = (form, { max = 40 } = {}) => {
    const f = fold(form);
    if (shadowCache.has(f)) return shadowCache.get(f);
    if (!sents || !sents.length) return null;
    const acc = [];
    let snap = null, counted = 0;
    outer:
    for (let s = 0; s < sents.length && counted < max; s++) {
      const sent = sents[s];
      for (let i = 0; i < sent.length && counted < max; i++) {
        if (fold(sent[i]) !== f) continue;
        if (!snap || snap.s !== s) snap = makeSnapshot(sents, s, { M: 4 });
        const rec = impactOfToken(snap, i, { mode: "delete", w: Infinity, withC: false });
        if (rec && !rec.gap && rec.span) { acc.push(rec.span); counted += 1; }
      }
    }
    if (!acc.length) { shadowCache.set(f, null); return null; }
    // the mean shadow: mean over the word's own occurrences
    const m = acc[0].map((_, c) => acc.reduce((s2, r) => s2 + r[c], 0) / acc.length);
    shadowCache.set(f, { span: m, n: counted });
    return shadowCache.get(f);
  };

  // An anchor's shadow is its own ablation-delta — the imprint of the role it fills.
  const anchorShadow = (a) => loadShadow(a.form);

  // ── POS GATE: a verbal head can never wear a nominal anchor. ──
  const nominalTags = new Set(["NOUN", "PROPN", "PRON", "ADJ", "DET", "NUM"]);
  const verbalTags = new Set(["VERB", "AUX"]);
  const agree = (w, a) => {
    if (!posOf) return null;
    const pw = posOf(w), pa = posOf(a);
    if (pw === null || pw === undefined || pa === null || pa === undefined) return null;
    if (nominalTags.has(pw) && nominalTags.has(pa)) return 1;
    if (verbalTags.has(pw) && verbalTags.has(pa)) return 1;
    return 0;
  };

  const vectorOf = (w) => vec(w);
  const nearestAnchored = (w, { min = 0.15, margin = 1.15, view = "ppmi" } = {}) => {
    const bare = String(w ?? "").replace(/^\(\?/, "").replace(/\?$/, "").replace(/\)$/, "").trim();
    const pw = posOf ? posOf(bare) : null;
    const scored = anchors.map((a) => {
      let sim;
      if (view === "shadow") {
        const uw = loadShadow(bare), aw = loadShadow(a.form);
        sim = (uw && aw) ? cosVec(uw.span, aw.span) : 0;
      } else {
        if (!co.has(bare)) return { a, sim: 0 };
        sim = cosine(vec(bare), vec(a.form));
      }
      const g = agree(bare, a.form);
      if (g === 0) sim = 0;
      return { a, sim };
    }).filter((x) => x.sim >= min)
      .sort((a, b) => b.sim - a.sim);
    if (!scored.length) return null;
    const top = scored[0];
    const second = scored[1]?.sim ?? 0;
    if (top.sim < second * margin) return null;          // contested — two anchors pull equally
    return { anchor: top.a.s, sim: +top.sim.toFixed(3), gloss: top.a.gloss, source: top.a.source, pos: pw, view };
  };

  const buildDictKeys = (d) => { const ks = []; const src = d.__keys ?? Object.keys(d); for (const k of src) ks.push(k); return ks; };
  return { unigram, co, vectorOf, nearestAnchored, anchors: anchorSet.keys(), _keys: buildDictKeys, shadowOf: loadShadow };
}