// organs/fold-at-point.mjs — the universe folded at a point (2026-10-01).
//
// Identity is the universe folded at a point, bounded by differences that make
// a difference, for a particular for-whom. An essay IS such a fold: the same
// universe (the clean sources) folds differently at different for-whoms, and
// the fold's identity is the consequence it makes there. This organ is the
// ETHOS: it selects, from the universe, the claims whose differences make a
// difference TO the for-whom — the load-bearing threads of the fold.
//
// The box selects by the for-whom's stake (its significant words, plus each
// section's aspect); a clean sentence that shares the stake is a load-bearing
// difference; the rest of the universe stays outside the fold. Two for-whoms →
// two stakes → two selections → two identities, by consequence.
//
// STANCE, INJECTED (2026-10-02, GL-RR-10). Word-overlap selection has a named
// weakness: a sentence can share the stake's words and still be OFF the being
// the stake names (the shuffled control — act words on the wrong referent).
// So the fold carries, per selected claim, the STANCE verdict when the caller
// injects the stance organ (eoreader7/native/organs/stance.js — the cast.js
// pattern, organs injected): readStance(claim, holon) → in_terms / against /
// off_being at the level. The verdict is a FACT about the claim relative to
// the source it came from, carried beside the byte address — never used to
// drop a claim (the fold's selection stays the difference-making), only to
// disclose what the selected claim IS to the material it stands on. Omitted,
// the fold is byte-identical to before (no stance field).
//
// PURE (node builtins + injected organs). Selftest:
//   node --input-type=module -e "import('./organs/fold-at-point.mjs').then(m=>m.selftest())"

export const FOLD_SCHEMA = "FoldAtPoint@1";

const STOP = new Set(["the", "and", "that", "with", "this", "from", "have", "been", "which", "what", "there", "for", "in", "of", "to", "a", "an", "is", "are", "it", "as", "on", "at", "by", "who", "whose", "one", "must", "will", "about", "into", "its", "their", "your", "not", "but", "so", "how", "why", "what", "does"]);
const words = (s) => new Set(String(s).toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !STOP.has(w)));
const overlap = (text, stake) => { let n = 0; for (const w of words(text)) if (stake.has(w)) n++; return n; };

/** Fold the universe at the for-whom: select, per section, the clean sentences
 *  whose differences make a difference to that point. `indices` = { label:
 *  SourceIndex }. Each selected claim carries its byte address — the ethos
 *  spine of the essay. `organs` = { readStance } (injected, optional): when the
 *  stance organ is present, each selected claim also carries its stance verdict
 *  relative to its source (in_terms / against / off_being) — disclosed, never
 *  used to drop. */
export function foldAtPoint({ forWhom = "", indices = {}, sections = [], per = 2, minOverlap = 2, organs = {} } = {}) {
  const stake = words(forWhom);
  const folds = [];
  const used = new Set();
  // the stance organ, injected (cast.js pattern). The holon each claim is read
  // against: the claim's OWN source as the material, the for-whom's stake as
  // the theme, the referents from the caller's injected `organs.referents`
  // (buildReferents over the source — a SourceIndex carries the source FILE,
  // not its text, so the caller who holds the bytes supplies the referents).
  const readStance = organs.readStance ?? null;
  const refsFor = organs.referents ?? null;
  for (const sec of sections) {
    const secStake = new Set([...stake, ...words(sec.aspect)]);
    const scored = [];
    for (const [label, idx] of Object.entries(indices)) {
      if (!idx?.ok) continue;
      for (const s of idx.sentences) {
        const o = overlap(s.text, secStake);
        if (o >= minOverlap) scored.push({ text: s.text, abs: s.abs, len: s.len, src: label, overlap: o });
      }
    }
    scored.sort((a, b) => b.overlap - a.overlap || a.abs - b.abs);
    const selected = [];
    for (const c of scored) {
      const key = c.src + "@" + c.abs;
      if (used.has(key)) continue;
      used.add(key);
      const claim = { text: c.text, abs: c.abs, len: c.len, src: c.src, overlap: c.overlap };
      if (readStance) {
        try {
          const referents = typeof refsFor === "function" ? refsFor(c.src) : null;
          const holon = { theme: forWhom, ground: "", referents, passages: [{ ref: c.src, text: c.text }] };
          const r = readStance(c.text, holon, { level: "sentence" });
          claim.stance = { reading: r.stance, sign: r.sign, tied: r.strain ? r.strain.tied : null, basis: r.basis };
        } catch { claim.stance = null; }
      }
      selected.push(claim);
      if (selected.length >= per) break;
    }
    folds.push({ section: sec.name, aspect: sec.aspect, claims: selected });
  }
  return { schema: FOLD_SCHEMA, ok: true, forWhom, stake: [...stake], folds };
}

export async function selftest() {
  const t = (n, c) => { if (!c) { console.error("FAIL", n); process.exitCode = 1; } else console.log("ok", n); };
  const { indexSource } = await import("./source-index.mjs");
  const REP = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
  const WM = "/tmp/wm-research.txt";
  const indices = { republic: indexSource(REP), research: indexSource(WM) };
  const holder = foldAtPoint({ forWhom: "the one who keeps a memory in a box and must learn to let it go", indices, sections: [{ name: "the classical image", aspect: "how the wax hardens and crowds with a long life" }] });
  const learner = foldAtPoint({ forWhom: "the student learning how memory works and how to keep it", indices, sections: [{ name: "the modern research", aspect: "the prefrontal cortex maintaining representations in working memory" }] });
  t("the fold selects claims whose differences make a difference to the for-whom", holder.ok && holder.folds[0].claims.length >= 1);
  t("identity by consequence: different for-whoms fold different claims", (() => {
    const h = holder.folds[0].claims.map((c) => c.src + "@" + c.abs);
    const l = learner.folds[0].claims.map((c) => c.src + "@" + c.abs);
    return h.some((k) => !l.includes(k)) || l.some((k) => !h.includes(k));
  })());
  t("every selected claim carries a byte address", holder.folds[0].claims.every((c) => c.abs > 0 && c.src));
  // STANCE INJECTED: the fold carries each claim's verdict when the caller
  // supplies readStance (the emergent stance organ). Omitted, byte-identical.
  try {
    const { readStance } = await import("../../khora/native/organs/stance.js");
    const withStance = foldAtPoint({ forWhom: "the one who keeps a memory in a box and must learn to let it go", indices, sections: [{ name: "s", aspect: "how memory works" }], organs: { readStance } });
    const claim0 = withStance.folds[0].claims[0];
    t("the fold carries a stance verdict per selected claim when injected", !!claim0 && !!claim0.stance && ["in_terms", "against", "off_being", "unnamed"].includes(claim0.stance.reading));
    const without = foldAtPoint({ forWhom: "the one who keeps a memory in a box and must learn to let it go", indices, sections: [{ name: "s", aspect: "how memory works" }] });
    t("omitted, the fold is byte-identical (no stance field)", without.folds[0].claims.every((c) => !("stance" in c)));
  } catch (e) { t("stance injection loads from eoreader7", false); }
}