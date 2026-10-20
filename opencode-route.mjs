// opencode-route.mjs — THE CONVERSATION ROUTER: which handling does this ask get, decided before any model call.
//
//   routeOf(ask, { history }) -> { kind, research, why, also? } | { gap, detail }
//   kinds: account (an account of a world topic: research first, write from it, check), search (find resources, or something only true now),
//          work (code, files, the workspace), mechanical (settled by computation), creative (invented, or about the speaker's own thing: no research),
//          chat (the model's own view, a feeling, a greeting), followup (acts on the previous turn).
//   research is true for account and search: the asks whose answer is the world's, not the model's.
//
// NO REGEX. The reading is the received UD English parser's (native parser-eng-ewt, the lane's own parse): the root, its lemma, subject and object, person,
// definiteness and interrogative features. What is STRUCTURAL: an interrogative pronoun, an addressee subject or possessive (an ask of the model's own view),
// a pronoun or definite object (an ask that acts on the previous turn), a bare noun, a clausal complement of a causative verb (a change to a thing), a short ask
// that names nothing. Code-shaped tokens are read by character tests on the token (a backtick, a slash inside a path, a dot before a short tail, a lowercase
// letter before a capital, an underscore, a leading double dash), not by a pattern. What is LEXICAL, declared and measured (eval/route/PREREG.md), never
// defended: LEXICAL below. A word outside it falls to a structural default, and the batteries show what that costs.
import { loadEotParser } from "./native/the-fold/eot-notation.js";
import { laneFor } from "./opencode-lane.mjs";

export const LEXICAL = Object.freeze({
  invented: ["poem", "story", "song", "joke", "haiku", "limerick", "sonnet", "riddle", "lyrics", "fable", "tale", "name"],
  inventVerbs: ["invent", "imagine", "compose", "pretend"],
  accountGenre: ["essay", "report", "summary", "overview", "explanation", "history", "account", "article", "biography", "analysis", "introduction"],
  accountVerbs: ["explain", "describe", "compare", "outline", "discuss", "teach", "summarize", "understand", "contrast"],
  knowVerbs: ["know"],
  computeVerbs: ["convert", "calculate", "compute", "solve"],
  seekVerbs: ["find", "search", "locate", "get", "browse", "look"],
  fresh: ["today", "tonight", "now", "currently", "latest", "recent", "recently", "current", "tomorrow", "forecast"],
  modelViewVerbs: ["like", "prefer", "think", "feel", "enjoy", "love", "hate", "believe"],
  workNouns: ["file", "repo", "repository", "function", "method", "test", "commit", "code", "bug", "branch", "import", "script", "stack", "trace", "build", "class", "module", "variable", "config", "endpoint"],
});
const L = Object.fromEntries(Object.entries(LEXICAL).map(([k, v]) => [k, new Set(v)]));

let parser = null;
async function parse(ask) {
  try { if (!parser) parser = await loadEotParser(); return parser?.ok ? parser.parse(ask) : null; } catch { return null; }
}

/** The rows of a parsed sentence (CoNLL-U lines; comment lines and multiword ranges have no integer id). */
const rowsOf = (rec) => (rec?.surface?.lines ?? []).flatMap((line) => {
  const c = String(line).split("\t");
  const id = Number(c[0]);
  if (c.length < 8 || !Number.isInteger(id) || id < 1) return [];
  const feats = {};
  for (const kv of String(c[5] ?? "").split("|")) { const at = kv.indexOf("="); if (at > 0) feats[kv.slice(0, at)] = kv.slice(at + 1); }
  return [{ id, form: c[1], lemma: String(c[2] ?? "").toLowerCase(), upos: c[3], feats, head: Number(c[6]), deprel: c[7] ?? "" }];
});
const depIs = (r, name) => r.deprel === name || r.deprel.startsWith(`${name}:`);

const isLetter = (ch) => ch.toLowerCase() !== ch.toUpperCase();
const isLower = (ch) => isLetter(ch) && ch === ch.toLowerCase();
const isUpper = (ch) => isLetter(ch) && ch === ch.toUpperCase();
const isDigit = (ch) => ch >= "0" && ch <= "9";
/** the token without punctuation at its ends (a trailing full stop or question mark is not part of a name) */
const stripEnds = (t) => {
  let a = 0, b = t.length;
  while (a < b && !isLetter(t[a]) && !isDigit(t[a]) && t[a] !== "-" && t[a] !== "." && t[a] !== "`") a++;
  while (b > a && !isLetter(t[b - 1]) && !isDigit(t[b - 1]) && t[b - 1] !== "`") b--;
  return t.slice(a, b);
};
const words = (s) => s.split("\n").join(" ").split("\t").join(" ").split(" ").filter(Boolean);

/** Is this whitespace-delimited token shaped like code: a quoted span, a path, a file name, an identifier, a flag? Character tests, no pattern. */
function codeShaped(token) {
  if (token.includes("`")) return true;
  const t = stripEnds(token);
  if (!t) return false;
  if (t.startsWith("--") && t.length > 3) return true;
  if (t.includes("/") && t.length > 3 && (t.includes(".") || t.split("/").length > 2)) return true;
  const dot = t.lastIndexOf(".");
  if (dot > 0 && dot < t.length - 2) {                       // a name, a dot, a tail of two to five letters: "cli.mjs", "app.tsx"
    const tail = t.slice(dot + 1);
    if (tail.length <= 5 && [...tail].every(isLetter) && [...t.slice(0, dot)].some(isLetter)) return true;
  }
  const us = t.indexOf("_");
  if (us > 0 && us < t.length - 1 && [...t].some(isLetter)) return true;
  if (isLower(t[0])) for (let i = 1; i < t.length; i++) if (isUpper(t[i]) && isLower(t[i - 1])) return true;     // getUser, parseConfig
  return false;
}

export async function routeOf(ask, { history = [] } = {}) {
  const text = String(ask ?? "").trim();
  if (!text) return { gap: "empty-ask", detail: "no ask to route" };
  const verdict = (kind, why, extra = {}) => ({ kind, research: kind === "account" || kind === "search", why, ...extra });
  // 1. settled by computation: the reason-gate's own mechanical lane
  const lane = await laneFor({ ask: text }).catch(() => null);
  if (lane?.ok && lane.lane === "mechanical") return verdict("mechanical", "a mechanism settles it (computed, never generated)");
  const records = await parse(text);
  const rec = (records ?? []).find((r) => rowsOf(r).length);
  if (!rec) return { gap: "unparsed", detail: "the parser read no sentence" };
  const rows = rowsOf(rec);
  const content = rows.filter((r) => r.upos !== "PUNCT");
  const root = rows.find((r) => r.head === 0) ?? rows[0];
  const kids = (id, name) => rows.filter((r) => r.head === id && depIs(r, name));
  const nouns = rows.filter((r) => r.upos === "NOUN" || r.upos === "PROPN");
  const lemmas = new Set(rows.map((r) => r.lemma));
  const has = (set) => [...lemmas].some((l) => set.has(l));
  const whWord = (r) => (r.upos === "PRON" || r.upos === "ADV" || r.upos === "DET") && (r.feats.PronType === "Int" || r.feats.PronType === "Rel" || r.feats.PronType === "Int,Rel");
  const question = text.endsWith("?") || rows.some((r) => r.feats.PronType === "Int");
  const subj = [...kids(root.id, "nsubj"), ...kids(root.id, "csubj")][0];
  const addressee = (subj && subj.feats.Person === "2") || (root.upos === "PRON" && root.feats.Person === "2");   // "how are you": the addressee is the copular root
  const speaker = subj && subj.feats.Person === "1";
  const imperative = root.upos === "VERB" && !subj && root.feats.VerbForm === "Inf";
  const objects = [...kids(root.id, "obj"), ...kids(root.id, "iobj"), ...kids(root.id, "xcomp")];
  const anaphoric = (r) => r.upos === "PRON" && r.feats.Person !== "1" && r.feats.Person !== "2";   // it, that, this, them: not I, you
  const pronObject = objects.some(anaphoric);
  const modifiedBy = (n) => rows.some((r) => r.head === n.id && (depIs(r, "nmod") || depIs(r, "compound") || depIs(r, "acl") || depIs(r, "appos")));
  const numbers = rows.filter((r) => r.upos === "NUM");

  // 2. computation the mechanisms do not cover: a computing verb over a number, or two quantities asked about with nothing named
  if (L.computeVerbs.has(root.lemma) && numbers.length) return verdict("mechanical", "a computing verb over a number");
  if (question && numbers.length >= 2 && !rows.some((r) => r.upos === "PROPN")) return verdict("mechanical", "a question over two quantities with nothing named");
  // 3. the code and the workspace: a code-shaped token, a work noun, or a request that changes how a thing behaves ("make the form validate emails")
  if (words(text).some(codeShaped) || has(L.workNouns)) return verdict("work", "a code-shaped token or a work noun");
  const embedded = (head) => [...kids(head.id, "xcomp"), ...kids(head.id, "acl"), ...kids(head.id, "ccomp")].some((x) => x.upos === "VERB" && rows.some((r) => r.head === x.id && depIs(r, "obj")));
  if (imperative && kids(root.id, "obj").length && (embedded(root) || kids(root.id, "obj").some(embedded))) return verdict("work", "asks to change how a thing behaves");
  // 4. the model's own state, a greeting to it, or feedback on what it just said
  if (root.upos === "PRON" && root.feats.Person === "2") return verdict("chat", "a question about the addressee's own state");
  if (!question && root.upos !== "VERB" && rows.some((r) => depIs(r, "nsubj") && anaphoric(r)) && rows.some((r) => depIs(r, "cop")) && rows.some((r) => r.upos === "ADJ")) return verdict("chat", "an evaluation of the previous turn");
  // 5. acts on the previous turn: a pronoun object, only definite back-references, or a short ask that names no world referent
  if (history.length) {
    const referent = nouns.some((n) => n.upos === "PROPN" || modifiedBy(n));
    if (pronObject) return verdict("followup", "acts on a pronoun object");
    if (content.length <= 4 && !referent) return verdict("followup", "short, and names nothing in the world");
    if (nouns.length && nouns.every((n) => rows.some((r) => r.head === n.id && depIs(r, "det") && r.feats.Definite === "Def") || rows.some((r) => r.head === n.id && r.upos === "ADJ" && r.feats.NumType === "Ord"))) return verdict("followup", "only definite back-references");
  }
  // 6. invented work, or writing about the speaker's own thing
  const accountSignal = has(L.accountGenre) || [...lemmas].some((l) => L.accountVerbs.has(l)) || (has(L.knowVerbs) && (rows.some(whWord) || nouns.some((n) => n.upos === "PROPN" || modifiedBy(n))));
  const privateReferent = nouns.some((n) => rows.some((r) => r.head === n.id && depIs(r, "nmod") && r.deprel.includes("poss") && r.feats.Person === "1"));
  if (accountSignal && privateReferent) return verdict("creative", "writing about the speaker's own thing: nothing in the world to read");
  if (L.inventVerbs.has(root.lemma)) return verdict("creative", "the root verb invents");
  if (has(L.invented) && !accountSignal && (imperative || root.upos === "VERB" || !question)) return verdict("creative", "asks for an invented work");
  if (accountSignal && has(L.invented)) return verdict("account", "an account and an invented work in one ask", { also: "creative" });
  // 7. something only true now, or resources to be found
  if (has(L.fresh) && (question || imperative)) return verdict("search", "asks for something only true now");
  if (L.seekVerbs.has(root.lemma) && (root.lemma !== "get" || imperative) && (root.lemma !== "look" || rows.some((r) => r.head === root.id && (r.lemma === "up" || r.lemma === "for")) || rows.some((r) => r.lemma === "for"))) return verdict("search", "the root verb seeks");
  if (rows.some((r) => r.lemma === "where") && rows.some((r) => r.lemma === "can")) return verdict("search", "asks where something can be had");
  if (!subj && root.upos === "NOUN" && root.feats.Number === "Plur" && L.accountGenre.has(root.lemma)) return verdict("search", "a bare plural genre noun asks for pieces to be found");
  // 8. the model's view: its preferences and beliefs, or any second-person reference with no account asked for
  if (addressee && L.modelViewVerbs.has(root.lemma)) return verdict("chat", "asks what the model thinks or prefers");
  if (accountSignal) return verdict("account", "asks for an account (a genre noun, an accounting verb, or what is known)");
  if (addressee || rows.some((r) => r.feats.Person === "2" && r.upos === "PRON")) return verdict("chat", "asks the model's own view or state");
  // 9. what is left, by shape
  if (question && !speaker) return verdict("account", "a question about a third thing");
  if (!subj && root.upos === "NOUN" && !rows.some((r) => r.head === root.id && r.upos !== "PUNCT")) return verdict("account", "a bare noun is a topic");
  if (!subj && root.upos === "NOUN" && modifiedBy(root)) return verdict("account", "a bare topic");
  if (!subj && root.upos === "NOUN") return verdict("chat", "a bare noun with only an adjective (a greeting)");
  if (speaker && !question) return verdict("chat", "a statement about the speaker");
  if (!nouns.length) return verdict("chat", "names nothing in the world");
  return { gap: "unclassified", detail: `root ${root.lemma}/${root.upos}, ${nouns.length} noun(s), ${question ? "question" : "not a question"}` };
}
