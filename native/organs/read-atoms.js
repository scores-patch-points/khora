// read-atoms.js — one sentence, read with its page, as ATOMS over the page's referents: the whole reading path in one call (rows → mentions and
// entities by coref.js, or by the learned ranker → EOTClaim@1 claims → atoms.js, plus the learned producer's further atoms when given).
// The meaning check reads a claim and its source this way and weighs atom against atom (atom-support.js).
//   readAtoms({ text, lang, title, previous, grammar, pack, same, lookup, corefModel, producer, chooser, filter, keysOf })
//     → { atoms, entities, mentions, claims, rows }
//   grammar: { rowsOf(text), claimsOf(text, rows) } (grammar-en.js, or grammar-ud.js's loadGrammar)
import { resolvePage } from "./coref.js";
import { resolveWithModel } from "./coref-learned.js";
import { atomize, realize } from "./atoms.js";
import { produce } from "./atom-produce.js";

export function readAtoms({ text, lang = "en", title = null, previous = [], grammar, pack = null, same = null, lookup = null, corefModel = null, producer = null, chooser = null, filter = null, keysOf = null }) {
  const sentences = [...previous, text];
  const R0 = resolvePage({ lang, title, sentences, rowsOf: grammar.rowsOf, pack, same, lookup });
  let entities = R0.entities, mentions = R0.sentences.at(-1).mentions;
  if (corefModel) { const L = resolveWithModel(R0, { lang, title, same, proDrop: !!pack?.proDrop }, corefModel); entities = L.entities; mentions = L.sentences.at(-1).mentions; }
  const rows = R0.sentences.at(-1).rows, claims = grammar.claimsOf(text, rows);
  const ctx = { rows, mentions, entities, text, lang, keysOf };
  const base = atomize({ claims, ...ctx });
  const atoms = producer ? [...base, ...produce(ctx, producer, { have: base, chooser, filter })] : base;
  const out = atoms.map((a) => ({ ...a, text: realize(a), span: a.start != null ? text.slice(a.start, a.end) : null }));
  // what this reading did not read: the grammar's own unread words (claim-coverage.js), less those a produced atom carries
  const low = (x) => String(x ?? "").normalize("NFKC").toLowerCase();
  const carried = low(out.filter((a) => a.from === "path").map((a) => a.text).join(" "));
  const unread = [...new Set(claims.flatMap((c) => c.unread ?? []))].filter((w) => !carried.includes(low(w)));
  return { atoms: out, entities, mentions, claims, rows, unread };
}
