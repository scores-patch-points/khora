// organs/find-thing.js — FIND THE THING: which callables already on the ground does the ask's own wording point at (2026-10-13).
// Cell: SEG · Ground → Differentiate / Structure / Field (kernel/cube.js cellOf). The callables a session already has
// (names a held file declares or binds, a library it imports, the running engine's own names) are a field; the ask's
// words cut that field to the few that answer it. Look (repo-look.js) cuts the repo's FILES; this cuts its CALLABLES.
//
// WHY THIS ORGAN EXISTS (CENNINI.md, the movement: Find the thing; CODING-LESSONS 102, 105). Measured over 688
// transcripts of the master's own work: 78% of the calls an edit adds reach something that already existed, and 16.5%
// reach a name the edit declares itself. Every coder finds the library that has the thing and adds a little; the
// lever for a small mouth is to be handed the right existing callable, so the change is a call and a little glue.
// Lovelace's text names the unit worth retrieving: the operations and how they are distributed, "cards ... have all
// the generality of algebra"; this returns callables, never finished results.
//
// THE ALGORITHM (lexical, as repo-look.js, with the same disclosed limits):
//   words    the ask's alphabetic words and the pieces of any identifier in it (camelCase, snake_case), lower-cased,
//            each lightly normalised (plural, -ing and -ed endings cut: ordinary suffix stripping, ENGLISH ONLY and
//            Latin letters only, disclosed: another language's text lands as unstemmed words or as no words at all) A word
//            and a derivation of it (`slug`, `slugify`) are NOT the same word here; that is a limit, measured not hidden
//   field    each callable's name split the same way
//   weight   IDF over the field: log(1 + N / df). A word nothing in the field carries has no weight; a word every
//            name carries has little. Nothing is hand-set.
//   score    the summed weight of the ask words the name shares; ties by kind (own file, repo, library, runtime) then name
// A word the ask spends that lands on nothing is a typed gap `no-word-landed`, never a guess. No model, no network.
//
// MATCH ON REFERENTS (the user, 2026-10-13: "match on referents"; feedback_referent_model_not_pointers). A callable is an
// entity; a name is only one of its surfaces. The other surfaces are the words people used when they reached for it:
// the asks of earlier turns whose edits called it. `ReferentField` is that index: ask words attested for a callable,
// learned from units strictly earlier in time, so a later ask resolves to the callable by what it MEANT before, not by
// the string it shares (`give me a slug` reaches `slugifyTitle` once an ask about "a url slug from the title" did).
// Three modes: `lexical` (names only, above), `referent` (attested surfaces only), `both` (each scaled by its own max).
//
// WHAT IT DOES NOT DO. It does not know what a callable DOES (names only, no signatures yet), does not read installed
// packages (the caller puts them in the field), and does not decide a candidate is right: the test does. Whether it
// ranks the callables the master actually reached above another ask's words is graded in cli/apprentice-assembled.mjs.

export const FIND_SCHEMA = "EOFindThing@1";
const KIND_ORDER = Object.freeze({ own: 0, repo: 1, library: 2, runtime: 3 });

/** a lowercase word, lightly de-suffixed (ordinary suffix stripping, Porter-lite; never below three letters) */
export function stem(w) {
  let s = String(w).toLowerCase();
  const long = (n) => s.length > n + 2;
  if (/ies$/.test(s) && long(3)) s = s.slice(0, -3) + "y";
  else if (/(ss|x|z|ch|sh)es$/.test(s) && long(2)) s = s.slice(0, -2);
  else if (/s$/.test(s) && !/ss$/.test(s) && long(1)) s = s.slice(0, -1);
  if (/ing$/.test(s) && long(3)) { s = s.slice(0, -3); if (/([^aeiou])\1$/.test(s)) s = s.slice(0, -1); }
  else if (/ed$/.test(s) && long(2)) { s = s.slice(0, -2); if (/([^aeiou])\1$/.test(s)) s = s.slice(0, -1); }
  return s;
}

/** the word pieces of a text or an identifier: camelCase and snake_case split, stemmed, de-duplicated */
export function wordsOf(text) {
  const out = new Set();
  for (const raw of String(text ?? "").match(/[A-Za-z][A-Za-z0-9]*/g) ?? []) {
    const parts = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/\s+/);
    for (const p of parts) if (p.length >= 2) out.add(stem(p));
  }
  return out;
}

/**
 * find({ ask, names, runtime, own, k }) -> { ok:true, candidates:[{name, kind, score, matched}], considered } | { ok:false, gap }
 *   names    Map name -> "library" | "repo" (what the session's held files bind or declare)
 *   own      Set of names the located file already declares
 *   runtime  Set of the engine's own names (optional; JavaScript only)
 */
export function find({ ask, names = new Map(), own = new Set(), runtime = null, k = 8, referents = null, mode = "lexical" } = {}) {
  const askWords = wordsOf(ask);
  if (!askWords.size) return { ok: false, schema: FIND_SCHEMA, gap: { kind: "no-words", reason: "the ask has no words to cut by" } };
  const field = new Map();
  for (const n of own) field.set(String(n), "own");
  for (const [n, kind] of names) if (!field.has(String(n))) field.set(String(n), kind);
  if (runtime) for (const n of runtime) if (!field.has(String(n))) field.set(String(n), "runtime");
  if (!field.size) return { ok: false, schema: FIND_SCHEMA, gap: { kind: "empty-field", reason: "no callables on the ground" } };

  const rows = [];
  const df = new Map();
  for (const [name, kind] of field) {
    const w = wordsOf(name);
    rows.push({ name, kind, w });
    for (const t of w) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = rows.length;
  const weight = (t) => Math.log(1 + N / (df.get(t) ?? N));
  const scored = [];
  for (const r of rows) {
    const matched = [...askWords].filter((t) => r.w.has(t));
    if (!matched.length) continue;
    scored.push({ name: r.name, kind: r.kind, score: matched.reduce((a, t) => a + weight(t), 0), matched: matched.sort() });
  }
  if (mode !== "lexical" && referents) {
    const ref = referents.score(ask, field);
    if (mode === "referent") {
      if (!ref.size) return { ok: false, schema: FIND_SCHEMA, gap: { kind: "no-referent-landed", reason: "no ask word was ever attested for a callable on the ground" }, considered: N };
      const out = [...ref].map(([name, score]) => ({ name, kind: field.get(name), score, matched: [] }));
      out.sort((a, b) => b.score - a.score || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.name < b.name ? -1 : 1));
      return { ok: true, schema: FIND_SCHEMA, candidates: out.slice(0, Math.max(1, k)), considered: N, mode };
    }
    // both: each signal scaled by its own maximum, then summed
    const maxLex = Math.max(...scored.map((c) => c.score), 0), maxRef = Math.max(...ref.values(), 0);
    const merged = new Map(scored.map((c) => [c.name, { ...c, score: maxLex ? c.score / maxLex : 0 }]));
    for (const [name, v] of ref) {
      const cur = merged.get(name) ?? { name, kind: field.get(name), score: 0, matched: [] };
      cur.score += maxRef ? v / maxRef : 0;
      merged.set(name, cur);
    }
    if (!merged.size) return { ok: false, schema: FIND_SCHEMA, gap: { kind: "no-word-landed", reason: "no ask word lands in a name or a field of attested surfaces" }, considered: N };
    const out = [...merged.values()];
    out.sort((a, b) => b.score - a.score || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.name < b.name ? -1 : 1));
    return { ok: true, schema: FIND_SCHEMA, candidates: out.slice(0, Math.max(1, k)), considered: N, mode };
  }
  if (!scored.length) return { ok: false, schema: FIND_SCHEMA, gap: { kind: "no-word-landed", reason: "no word of the ask appears in any callable's name" }, considered: N };
  scored.sort((a, b) => b.score - a.score || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.name < b.name ? -1 : 1));
  return { ok: true, schema: FIND_SCHEMA, candidates: scored.slice(0, Math.max(1, k)), considered: N };
}

// ═════════════════════════════ referents: the surfaces a callable has been reached by ═════════════════════════════
/**
 * ReferentField — a callable's attested surfaces: the ask words of units whose edits reached it. Append-only; the caller
 * feeds it units in time order and scores a unit BEFORE learning it (prequential).
 */
export class ReferentField {
  constructor() { this.bag = new Map(); this.post = new Map(); this.total = new Map(); this.units = 0; }
  /** `reached` is the callable names the unit's edit reached; `ask` the words that led there */
  learn(ask, reached) {
    const ws = [...wordsOf(ask)];
    if (!ws.length) return 0;
    let n = 0;
    for (const name of new Set(reached)) {
      let b = this.bag.get(name);
      if (!b) this.bag.set(name, (b = new Map()));
      for (const w of ws) {
        b.set(w, (b.get(w) ?? 0) + 1);
        let p = this.post.get(w);
        if (!p) this.post.set(w, (p = new Set()));
        p.add(name);
      }
      this.total.set(name, (this.total.get(name) ?? 0) + ws.length);
      n++;
    }
    if (n) this.units++;
    return n;
  }
  /** name -> score over the callables an ask's words were attested for (idf over callables, log counts, length-normalised) */
  score(ask, candidates = null) {
    const out = new Map();
    const Nn = Math.max(this.bag.size, 1);
    for (const w of wordsOf(ask)) {
      const p = this.post.get(w);
      if (!p) continue;
      // a word attested for EVERY callable (`the`, `a`) separates nothing: weight zero, no stop list typed anywhere
      const idf = this.bag.size < 2 ? 1 : Math.log(Nn / p.size);
      if (idf <= 0) continue;
      for (const name of p) {
        if (candidates && !candidates.has(name)) continue;
        const c = this.bag.get(name).get(w);
        out.set(name, (out.get(name) ?? 0) + (idf * Math.log(1 + c)) / Math.log(2 + (this.total.get(name) ?? 1)));
      }
    }
    return out;
  }
}
