// row-recovery.js — the wiring: the resolver, applied to the read's own rows.
//
// The read produces UD rows (form, lemma, upos, feats, head, deprel). A row whose form the POS prior
// never saw is a span the read cannot place — this pass recovers it: the row's deprel/case names a
// kāraka role (via karakaOf), the resolver predicts the word that fits that role and confirms it by
// look (jumble/one-edit) and sound (homophone), and the recovered word's dominant class becomes the
// row's upos. This is the "spans less standardized" move: a loose span is resolved by the universes,
// not refused for not being a clean token.
//
// The role is read from the parse, not guessed: deprel -> kāraka (KARAKA_MAP), the verb slot (root)
// is "predicate", and the grammatical slots (adposition/determiner/conjunction) are "function". A row
// with no decodable role passes through unresolved (a typed gap, not a silent default). Adapter-only,
// like speakers.js — not yet on the read's own hot path.
import { karakaOf } from "./karaka-map.mjs";
import { makeResolver } from "./span-resolver.js";

export function roleOfRow(row) {
  const upos = String(row.upos ?? "");
  if (upos === "VERB" || upos === "AUX" || row.deprel === "root") return "predicate";
  const k = karakaOf(row);
  if (k) return k;
  if (["ADP", "DET", "CCONJ", "SCONJ", "PART"].includes(upos)) return "function";
  return null;
}

const dominantOf = (counts) => {
  if (!counts) return "";
  let best = "", n = -1;
  for (const [upos, c] of Object.entries(counts)) if (c > n || (c === n && upos < best)) { best = upos; n = c; }
  return best;
};

/** makeRowRecoverer({ forms, resolver }) -> { recoverRow, recoverRows, roleOfRow } */
export function makeRowRecoverer({ forms, resolver = null } = {}) {
  const res = resolver || makeResolver({ forms });

  const recoverRow = (row) => {
    const form = String(row.form ?? "").toLowerCase();
    if (!form) return { ...row, recovered: false, recoveredRole: null, recoveredBy: null, recoveredFrom: null };
    if (forms && forms[form]) return { ...row, recovered: false, recoveredRole: null, recoveredBy: null, recoveredFrom: null };
    const role = roleOfRow(row);
    const r = res.resolve({ surface: form, role });
    if (r.claimed) {
      return { ...row, form: r.nearest, lemma: r.nearest, upos: dominantOf(forms[r.nearest]), recovered: true, recoveredRole: role, recoveredBy: r.method, recoveredFrom: form, dmd: r.dmd };
    }
    return { ...row, recovered: false, recoveredRole: role, recoveredBy: null, recoveredFrom: null };
  };

  return { recoverRow, recoverRows: (rows) => rows.map(recoverRow), roleOfRow };
}
