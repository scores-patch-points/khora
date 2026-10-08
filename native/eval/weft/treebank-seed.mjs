// native/eval/weft/treebank-seed.mjs — THE TREEBANK-SEEDED WEFT PASS (the khora-side gold seam).
//
// Kind induction (stage 8, janus) is judged against a gold it never touches. The gold here is the
// TREE BANK's own UPOS: a held-out .conllu read into a weft pass, with a SURFACE -> UPOS join. The
// reader (engineRelationsFor) reads the treebank's own TEXT; the gold is the treebank's own annotation.
// No capital, no POS tag, no word list is added to the weft — the weft stays kind-free; this only
// supplies `goldOf`, the testament janus's falsifier is injected with (never used to induce).
//
// One parser (readConllu) — janus never re-parses the treebank.
import fs from "node:fs";
import { readConllu } from "../competence/lib.mjs";
import { readToWeft } from "../../the-fold/read-process.mjs";

const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase().trim();

/**
 * Read a .conllu into a weft PASS and a `goldOf` predicate.
 *   treebankSeed(file, { address }) -> { pass, goldOf, upos, sentences }
 * `pass` is a WeftEntry@2 (edges + vocabulary) with `seq` set so it folds as one cursor pass.
 * `goldOf(refOrSurface)` -> 1 when the surface's own UPOS is PROPN (the being gold), else 0.
 */
export function treebankSeed(file, { address = "treebank", seq = 1 } = {}) {
  const sents = readConllu(file);
  const text = sents.map((s) => s.text ?? s.tokens.map((t) => t.form).join(" ")).filter(Boolean).join("\n\n");

  // surface -> { PROPN, total } over every WORD form (lowercased NFC). The join key is the same
  // normalisation the reader's own surfaces carry (diaNorm-free lower is not used: exact NFC-lower).
  const upos = new Map();
  for (const s of sents) for (const t of s.tokens) {
    const f = norm(t.form);
    if (!/[\p{L}]/u.test(f)) continue;
    const e = upos.get(f) ?? { PROPN: 0, total: 0 };
    e.total += 1; if (t.upos === "PROPN") e.PROPN += 1;
    upos.set(f, e);
  }

  const raw = readToWeft(text, { address, category: "treebank" });
  const pass = { ...raw, seq };

  // goldOf: a referent is a BEING (gold 1) when its surface's own treebank UPOS is majority PROPN.
  const goldOf = (ref) => {
    const surface = norm(typeof ref === "string" ? ref : (ref?.surface ?? ref?.ref ?? "")).replace(/^ref:auto:/, "");
    for (const f of [surface, ...surface.split(/\s+/)]) {
      const e = upos.get(f);
      if (e) return e.PROPN >= 1 && e.PROPN * 2 >= e.total ? 1 : 0;
    }
    return 0;   // not in the treebank: not the being gold
  };
  return { pass, goldOf, upos, sentences: sents.length };
}
