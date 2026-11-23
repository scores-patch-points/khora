// form-projection.js — the continuous fallback for a form the priors do not know.
//
// A form classifyWord cannot place (typo, casual, creole) is projected onto the prior's own
// vocabulary in the frozen embedding space (nomic-embed-text, the same codec polarity uses): the
// unknown form's nearest known form, by cosine, becomes the best-guess reading. The guess is
// DISCLOSED as a projection (projected:true), never a silent lookup: the caller re-runs
// classifyWord on the returned `nearest` form, so the same Thrax translation and ambiguity
// preservation apply to a guess as to an attestation.
//
// THE CLAIM IS MEASURED, NOT SET. projectClaim claims a projection only when the unknown form sits
// CLOSER to its nearest known form than that form's own nearest DISTINCT word. A form no closer to
// any word than two distinct words are to each other is not "the same word", and it abstains. The
// null is that nearest-distinct cosine, read off the prior's own vectors — no threshold typed here.
//
// Pure and synchronous at the seams it can be: it holds the vectors the vector library keeps and
// never calls a generative model — the embedder is the frozen codec (embed-personhood.js), a
// codec, no generation. A proposal, not a verdict. Status: EXPERIMENTAL.
import { makeEmbedder, PREFIX } from "./embed-personhood.js";

export const PROJECTION_SCHEMA = "FormProjection@1";
// The projection lives in the SAME vector space as every other read (the embedder's shared prefix):
// one space, two directions — a surface projects into it, a generation projects out of it. A
// separate prefix would be a separate space, and the whole point is that the spaces are one.
export const PROJECTION_PREFIX = PREFIX;

const dot = (a, b) => { let s = 0; const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) s += a[i] * b[i]; return s; };

/**
 * makeFormProjection({ forms, prefix, embedder }) -> { project, projectClaim, save }
 *  `forms` is the prior's own map (form -> { UPOS: count }), exactly posPrior.forms.
 *  The index (every known form, embedded) is built lazily once and cached in the vector library.
 */
export function makeFormProjection({ forms, prefix = PROJECTION_PREFIX, embedder = null } = {}) {
  if (!forms || typeof forms !== "object" || Array.isArray(forms)) throw new TypeError("makeFormProjection: the prior's forms map is required");
  const emb = embedder || makeEmbedder({ prefix });
  let index = null;

  const build = async () => {
    if (index) return index;
    const words = Object.keys(forms);
    const vecs = await emb.embed(words); // Float32Array[], L2-normalised by the vector library
    const dim = vecs[0]?.length ?? 0;
    const mat = new Float32Array(words.length * dim);
    for (let i = 0; i < words.length; i++) mat.set(vecs[i], i * dim);
    index = { words, mat, dim };
    return index;
  };

  const nearest = (mat, dim, v, skip = -1) => {
    const n = mat.length / dim; let best = -Infinity, bi = -1;
    for (let i = 0; i < n; i++) {
      if (i === skip) continue;
      const c = dot(v, mat.subarray(i * dim, i * dim + dim));
      if (c > best) { best = c; bi = i; }
    }
    return { best, bi };
  };

  return {
    /** project(surface) -> { surface, found, projected, nearest, cosine, candidates }.
     *  candidates = the nearest known form's POS counts (the raw prior map, shares uncomputed).
     *  found:true means the surface is already a known form (projection is a no-op); projected:true
     *  means nearest is a guess and must be disclosed as one. */
    async project(surface) {
      const s = String(surface ?? "").toLowerCase();
      if (!s) return { surface: s, found: false, projected: false, nearest: null, cosine: null, candidates: [] };
      const { words, mat, dim } = await build();
      const [v] = await emb.embed([s]);
      const { best, bi } = nearest(mat, dim, v);
      if (words[bi] === s) return { surface: s, found: true, projected: false, nearest: s, cosine: 1, candidates: forms[s] };
      return { surface: s, found: false, projected: true, nearest: words[bi], cosine: best, candidates: forms[words[bi]] };
    },

    /** projectClaim(surface) -> the projection plus a measured claim. claimed iff the unknown form
     *  is closer to `nearest` than `nearest` is to its own nearest DISTINCT word (the null). */
    async projectClaim(surface) {
      const p = await this.project(surface);
      if (!p.projected) return { ...p, claimed: false, null: null, margin: null, nearestOther: null, reason: p.found ? "known" : "empty" };
      const { words, mat, dim } = await build();
      const bi = words.indexOf(p.nearest);
      const other = nearest(mat, dim, mat.subarray(bi * dim, bi * dim + dim), bi);
      const margin = p.cosine - other.best;
      return { ...p, claimed: margin > 0, null: other.best, margin, nearestOther: words[other.bi] };
    },

    save: () => emb.save(),
  };
}
