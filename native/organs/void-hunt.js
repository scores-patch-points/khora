// void-hunt.js — DECLARE THE VOID, THEN HUNT FOR WHAT FILLS IT, IN WHOLE DOCUMENTS, FROM MORE THAN ONE SOURCE.
//
//   voidOfQuestion(rows)                       -> the void the question declares: what kind of thing is missing (admits), which roles are
//                                                 already taken (the anchors it names), and the relation that ties them
//   huntVoid(void, { sources, read, split })   -> { void, trail, candidates, answer, unique, gap }
//
// The owner, 2026-11-23: "get the define voids to be able to do the hunt and seek for the answers, and we don't need to limit ourselves to only
// the intro Wikipedia." So the hunt is driven by the void and is not tied to an intro, a page or a site. A SOURCE is anything with
// `find(void) -> [{ title, url, passages: [{ section, text }] }]`: it returns whole documents, section by section, not a lead. The organ reads
// every candidate sentence through the reader (injected `read`), keeps only sentences that carry every anchor the question names (the document's
// own title counts as carrying the anchor it is named for: the Cast section of "Lethal Weapon" never says "Lethal Weapon"), and takes as fillers
// the things of the kind the void admits. Nothing is picked silently: every candidate is listed with HOW it was found (its basis tier), where
// (document, section, the sentence verbatim) and how much supports it, and an answer is named only if the top candidate is alone in the best tier
// by the evidence behind it.
//
// BASIS TIERS, best first, each one a different thing the reading can attest:
//   role      the sentence has the question's relation as a verb and the filler sits in a role the question left open
//   copular   "the capital of X is Y" / "Y is the capital of X": the relation noun, the anchor under it, the filler on the other side
//   linked    the sentence has the relation and every anchor, and a filler of the right kind, but the parse does not give it the open role
//   comention every anchor and a filler of the right kind within two steps of an anchor, with no relation in the sentence at all (a cast list:
//             "Mel Gibson as Martin Riggs")
//
// PURE. No fetch, no fs, no DOM. Sources and the reader are injected. Imports only the question grammar's closed class.
import { INTERROGATIVE_ADMITS, ADMITS_KARAKA } from "../adapters/text/wh-narrow.js";

export const HUNT_SCHEMA = "VoidHunt@1";
const lem = (r) => String(r?.lemma ?? r?.form ?? "").toLowerCase();
const low = (s) => String(s ?? "").toLowerCase();
const TIERS = Object.freeze(["role", "byline", "copular", "linked", "comention"]);
// the English reader's own small table: verbs whose doer is credited with “a NOUN by PERSON”. A stand-in for the induced class of verbs of making (the owner's own-hypernym work); until that is wired, a verb outside it gets no by-line.
export const MAKING = Object.freeze(["write", "compose", "paint", "direct", "create", "found", "build", "design", "invent", "discover", "make", "produce", "author", "draw", "sculpt", "compose", "publish", "develop"]);
const KIND_OK = Object.freeze({ person: ["PROPN"], place: ["PROPN"], thing: ["PROPN", "NOUN"], time: ["NUM"], quantity: ["NUM"] });
// the roles a gap of each kind can sit in; the roles the question's own anchors already hold are taken out of this at hunt time
const OPEN_ROLES = Object.freeze({ person: ["kartṛ", "karman", "sampradāna", "apādāna"], place: ["adhikaraṇa", "apādāna"], time: ["kāla", "adhikaraṇa"], thing: ["karman", "karaṇa", "kartṛ"], quantity: ["karman", "kāla"] });

// grammatical function with the voice taken out: who does and who is done to, however the sentence is built (“A directed B” and “B was directed by A”)
const featOf = (r, k) => String(r?.feats ?? "").split("|").map((x) => x.split("=")).find((p) => p[0] === k)?.[1] ?? null;
const verbAbove = (rows, node) => { const byId = new Map(rows.map((r) => [r.id, r])); let c = byId.get(node.head), n = 0; while (c && n++ < 40) { if (c.upos === "VERB") return c; c = byId.get(c.head); } return null; };
const passiveVerb = (rows, vb) => rows.some((r) => r.deprel === "aux:pass" && r.head === vb.id) || (featOf(vb, "VerbForm") === "Part" && rows.some((r) => ["cop", "aux", "aux:pass"].includes(r.deprel) && lem(r) === "be" && (r.head === vb.id || r.head === vb.head)));   // “Where was X born?” hangs its “was” on the adverb
export const functionOf = (rows, r) => { const vb = verbAbove(rows, r); if (!vb) return null; if (r.deprel === "obl:agent") return "agent"; if (r.deprel === "obj") return "patient"; if (r.deprel === "iobj") return "recipient"; if (r.deprel === "nsubj" || r.deprel === "nsubj:pass") return r.deprel === "nsubj:pass" || passiveVerb(rows, vb) ? "patient" : "agent"; return null; };
// the English reader's own small table: lower-case particles that sit inside a personal name (“Leonardo da Vinci”), which the parser leaves untagged
export const NAME_PARTICLES = Object.freeze(["da", "de", "del", "della", "di", "van", "von", "der", "den", "du", "la", "le", "bin", "ibn", "al", "el", "ten", "ter"]);
const bridge = (rows, r) => NAME_PARTICLES.includes(low(r.form)) && r.upos !== "PROPN" && rows.find((x) => x.id === r.id - 1)?.upos === "PROPN" && rows.find((x) => x.id === r.id + 1)?.upos === "PROPN";
export const PLACE_CASE = Object.freeze(["in", "at", "near", "on", "from", "outside", "inside", "into", "around", "within"]);
const runsOf = (rows, ok) => { const out = []; let cur = []; for (const r of rows) { if ((ok(r) || (cur.length && ok(cur.at(-1)) && bridge(rows, r))) && (!cur.length || r.id === cur.at(-1).id + 1)) cur.push(r); else { if (cur.length) out.push(cur); cur = ok(r) ? [r] : []; } } if (cur.length) out.push(cur); return out; };
const textOf = (run) => run.map((r) => r.form).join(" ");

/** voidOfQuestion(rows) -> { admits, relation: { lemma, kind }, anchors: [{ text, tokens }], taken: [roles], ok, gap? } */
export function voidOfQuestion(rows) {
  const wh = rows.find((r) => INTERROGATIVE_ADMITS[lem(r)]);
  if (!wh) return { ok: false, gap: { kind: "no_wh_word", detail: "the question does not declare what is missing" } };
  const admits = INTERROGATIVE_ADMITS[lem(wh)], root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT");
  const mainVerb = root?.upos === "VERB" ? root : rows.find((r) => r.upos === "VERB");   // “Where was X born?” has an adverb for a root: the relation is the verb under it
  // the parser tags the tail of a title (“The Starry Night”) as a common noun: a capitalised word right after a name is part of it (the English reader's cue, here and nowhere else)
  const joined = runsOf(rows, (r) => r.upos === "PROPN" || (r.id > 1 && /^\p{Lu}/u.test(String(r.form)) && ["NOUN", "ADJ"].includes(r.upos) && rows.find((x) => x.id === r.id - 1)?.upos === "PROPN"));   // regex-ok: a capital letter on a token, not language
  const anchors = joined.map((run) => ({ text: textOf(run), tokens: run.map((r) => low(r.form)), forms: run.map((r) => r.form), roles: run.map((r) => r.karaka).filter(Boolean), fn: run.map((r) => functionOf(rows, r) ?? (r.deprel === "nsubj" && mainVerb ? (passiveVerb(rows, mainVerb) ? "patient" : "agent") : null)).find(Boolean) ?? null }));
  if (!anchors.length) {
    const things = rows.filter((r) => r.upos === "NOUN" && ["obj", "nsubj", "nsubj:pass", "obl"].includes(r.deprel) && !(root?.upos === "NOUN" && r === root));
    for (const r of things.slice(0, 2)) anchors.push({ text: r.form, tokens: [low(r.form)], roles: r.karaka ? [r.karaka] : [], fn: functionOf(rows, r) ?? null, common: true });
  }
  if (!anchors.length) return { ok: false, admits, gap: { kind: "no_anchor", detail: "the question names nothing the reader takes for a name, so there is nothing to look for the answer beside" } };
  const copular = root?.upos === "NOUN" && rows.some((r) => r.deprel === "cop" && r.head === root.id);
  const relation = !root ? null : copular && !mainVerb ? { lemma: lem(root), kind: "noun" } : mainVerb ? { lemma: lem(mainVerb), kind: "verb" } : null;
  // “War and Peace”: two names with only “and” between them may be one title. Which it is, the source says (a page named so), not the question.
  const joinable = []; for (let i = 0; i + 1 < joined.length; i++) { const a = joined[i], b = joined[i + 1], mid = rows.filter((r) => r.id > a.at(-1).id && r.id < b[0].id); if (mid.length === 1 && mid[0].upos === "CCONJ") joinable.push({ i, text: `${textOf(a)} ${mid[0].form} ${textOf(b)}`, tokens: [...a.map((r) => low(r.form)), low(mid[0].form), ...b.map((r) => low(r.form))], forms: [...a.map((r) => r.form), mid[0].form, ...b.map((r) => r.form)] }); }
  const taken = [...new Set(anchors.flatMap((a) => a.roles))], takenFns = [...new Set(anchors.map((a) => a.fn).filter(Boolean))];
  if (!OPEN_ROLES[admits]) return { ok: false, admits, anchors, relation, gap: { kind: "kind_not_huntable", detail: `a gap of kind “${admits}” is not one the hunt can recognise in a sentence yet` } };
  return { ok: true, admits, relation, anchors, joinable, taken, takenFns, openRoles: OPEN_ROLES[admits].filter((x) => !taken.includes(x)), wh: lem(wh), karaka: ADMITS_KARAKA[admits] };
}

// ---------------------------------------------------------------------------------------------------------------- reading one sentence against the void

const isUpper = (c) => !!c && c !== c.toLowerCase() && c === c.toUpperCase();
const spanOf = (rows, tokens, { surnameOk = false, fn = null, forms = null } = {}) => {   // where an anchor's tokens stand in these rows: whole, or (only on a page named for it) as a bare surname
  const f = rows.map((r) => low(r.form));
  for (let i = 0; i + tokens.length <= f.length; i++) if (tokens.every((t, k) => f[i + k] === t && (!isUpper(forms?.[k]?.[0]) || isUpper(String(rows[i + k].form)[0]))) && rows[i - 1]?.upos !== "PROPN" && rows[i + tokens.length]?.upos !== "PROPN") return rows.slice(i, i + tokens.length);   // “Hans Albert Einstein” is not Albert Einstein
  if (surnameOk && tokens.length > 1) {   // on a page named for the person, the person is also “Lincoln” or “Leonardo”: of the bare first or last name in the sentence, the one that stands as the anchor does in the question (“Leonardo was born in Vinci”)
    const bare = rows.filter((r, i) => (low(r.form) === tokens[0] || low(r.form) === tokens.at(-1)) && rows.slice(0, i).filter((x) => x.upos !== "PUNCT").at(-1)?.upos !== "PROPN");   // “Edward Baker “Eddie” Lincoln” is not Lincoln
    const pick = (fn && bare.find((r) => functionOf(rows, r) === fn)) || (!fn ? bare[0] : null);
    if (pick) return [pick];
  }
  return null;
};
const hops = (rows, a, b) => { const byId = new Map(rows.map((r) => [r.id, r])), up = (r) => { const o = [r.id]; let c = r, n = 0; while (c && c.head && n++ < 40) { c = byId.get(c.head); if (c) o.push(c.id); } return o; }, A = up(a), B = up(b); const i = A.findIndex((x) => B.includes(x)); return i < 0 ? 99 : i + B.indexOf(A[i]); };
const under = (rows, node, root) => { const byId = new Map(rows.map((r) => [r.id, r])); let c = node, n = 0; while (c && n++ < 40) { if (c.id === root.id) return true; c = byId.get(c.head); } return false; };

/** the words of a phrase: the node and everything under it (case markers and punctuation left off), as the block of rows it covers */
const DASHES = new Set(["–", "—", "-"]);
const phraseOf = (rows, node) => {   // a date or a name phrase: the node and what is under it, cut at a verb, at a dash, and where the words stop touching (a “in Ajaccio” after “1769” is another phrase)
  const cut = rows.find((r) => DASHES.has(r.form) && r.id > node.id)?.id ?? Infinity;
  const sealed = (r) => { let c = r, n = 0; while (c && c.id !== node.id && n++ < 40) { if (c.upos === "VERB" || ["acl", "acl:relcl", "advcl", "parataxis"].includes(c.deprel)) return true; c = rows.find((x) => x.id === c.head); } return false; };
  const inside = rows.filter((r) => under(rows, r, node) && r.id < cut && !sealed(r) && r.deprel !== "case" && ["NUM", "PROPN", "NOUN", "PUNCT"].includes(r.upos) && !(r.upos === "PUNCT" && r.form !== ","));
  const keep = new Set([node.id]); let grew = true;
  while (grew) { grew = false; for (const r of inside) if (!keep.has(r.id) && (keep.has(r.id - 1) || keep.has(r.id + 1)) && (r.upos !== "PUNCT" || keep.has(r.id - 1))) { keep.add(r.id); grew = true; } }
  return rows.filter((r) => keep.has(r.id) && r.upos !== "PUNCT");
};

/** matchSentence(void, rows, title) -> [{ answer, tier, why }] : what in this sentence could fill the void, and by which tier */
export function matchSentence(v, rows, title = "", { aliases = new Set() } = {}) {
  const titleLow = low(title), out = [];
  // every anchor must be carried by the sentence or be the document's own subject
  const found = v.anchors.map((a) => { const bare = titleLow.split(" (")[0], isTitle = !!titleLow && (bare === a.tokens.join(" ") || (bare.startsWith("the ") && bare.slice(4) === a.tokens.join(" "))); return { a, span: spanOf(rows, a.tokens, { surnameOk: isTitle, fn: a.fn, forms: a.forms }), isTitle }; });
  if (found.some((f) => !f.span && !f.isTitle)) return out;
  const inAnchor = new Set(found.flatMap((f) => (f.span ?? []).map((r) => r.id)));
  const kinds = KIND_OK[v.admits] ?? [], fillers = v.admits === "time"
    ? rows.filter((r) => rows.find((h) => h.id === r.head)?.upos === "VERB" && !inAnchor.has(r.id) && r.upos !== "PUNCT" && r.deprel !== "case" && !["nsubj", "nsubj:pass", "obj", "iobj", "csubj", "xcomp", "ccomp", "parataxis", "conj"].includes(r.deprel) && rows.some((c) => c.upos === "NUM" && under(rows, c, r))).map((r) => [r])   // the phrase under the verb that holds the date
    : runsOf(rows, (r) => kinds.includes(r.upos) && !inAnchor.has(r.id) && !(v.relation?.kind === "noun" && lem(r) === v.relation.lemma) && !(r.upos === "PROPN" && rows.find((h) => h.id === r.head)?.upos === "NUM"));   // a name hanging from a number is part of a date (“7 November”), not a person or a place
  if (!fillers.length) return out;
  const verbs = v.relation?.kind === "verb" ? rows.filter((r) => r.upos === "VERB" && lem(r) === v.relation.lemma) : [];
  const nouns = v.relation?.kind === "noun" ? rows.filter((r) => r.upos === "NOUN" && lem(r) === v.relation.lemma) : [];
  // the anchors must stand in the sentence as they stand in the question: under the same verb, in the same role. A passive lead (“X is a film directed by Y”) puts X under “directed”
  // through the noun the participle modifies.
  // a sentence about the page's subject that names neither the anchor nor a “he/she/it” for it is about someone else (“Eddie Lincoln, born in 1846”, on Lincoln's page)
  const present = found.every((f) => f.span || (f.isTitle && rows.some((r) => r.upos === "PRON" && ["3", null].includes(featOf(r, "Person")) && ["nsubj", "nsubj:pass", "obj", "nmod:poss"].includes(r.deprel))));
  const holdsAnchorsUnder = (verb) => found.every(({ a, span, isTitle }) => {
    if (!a.fn) return true;
    const own = rows.filter((r) => verbAbove(rows, r) === verb && functionOf(rows, r) === a.fn);
    const hasSubject = rows.some((r) => r.head === verb.id && (r.deprel === "nsubj" || r.deprel === "nsubj:pass"));
    // “Founded in 1975 by A and B, Microsoft rose”, “Born in a cabin on 12 February 1809, Lincoln was raised”: a verb with no subject of its own is said of the subject of the clause it is joined to, whichever of the two the parser made the root
    const joined = hasSubject ? [] : rows.filter((vb) => vb.upos === "VERB" && vb !== verb && (verb.head === vb.id || (vb.head === verb.id && ["parataxis", "advcl", "conj", "ccomp", "xcomp"].includes(vb.deprel))));
    const holder = own.length || !joined.length ? own : rows.filter((r) => joined.some((vb) => verbAbove(rows, r) === vb) && ["nsubj", "nsubj:pass"].includes(r.deprel));
    if (holder.some((r) => (span ?? []).some((x) => x.id === r.id) || (isTitle && r.upos === "PRON"))) return true;
    const N = verb.deprel?.startsWith("acl") ? rows.find((r) => r.id === verb.head) : null;   // a film directed by Y: the film is the anchor, and it is what was directed
    return !!N && a.fn === "patient" && ((span ?? []).some((x) => x.id === N.id || x.head === N.id || N.head === x.id) || (isTitle && rows.some((c) => c.head === N.id && c.deprel === "nsubj")));
  });
  // two names joined by a conjunction that says “and” are an answer together (“founded by A and B”); two joined by a comma alone are a place and what contains it (“Warsaw, Russian Empire”): the first is the answer and the second is its context, not a rival
  const joinedTo = (run, o) => o.some((r) => r.deprel === "conj" && run.some((x) => x.id === r.head)) || run.some((r) => r.deprel === "conj" && o.some((x) => x.id === r.head));
  const chain = (run) => { const ids = new Set(run.map((r) => r.id)); let grew = true; while (grew) { grew = false; for (const r of rows) if (r.deprel === "conj" && ids.has(r.head) && !ids.has(r.id)) { ids.add(r.id); grew = true; } else if (r.deprel === "conj" && ids.has(r.id) && !ids.has(r.head)) { ids.add(r.head); grew = true; } } return ids; };
  const saidAnd = (run) => rows.some((r) => r.deprel === "cc" && chain(run).has(r.head));
  const peersOf = (run) => fillers.filter((o) => o !== run && joinedTo(run, o) && saidAnd(run)).map((o) => answerText(o));
  const elaborates = (run) => fillers.some((o) => o !== run && joinedTo(run, o) && !saidAnd(run) && o[0].id < run[0].id);   // a later name listed after a comma, under an earlier one
  const anchorText = v.anchors.map((a) => a.tokens.join(" "));
  const isAnchorName = (run) => { const t = low(textOf(run)); return anchorText.some((a) => t === a || t.includes(a) || (t.includes(" ") && a.includes(t))); };   // a bare “Vinci” inside “Leonardo da Vinci” is a place; “Starry Night” inside “The Starry Night” is the thing itself
  const nextTo = (run, upos) => rows.some((r) => r.upos === upos && (r.id === run[0].id - 1 || r.id === run.at(-1).id + 1));
  const caseOf = (run) => rows.filter((c) => c.deprel === "case" && run.some((r) => r.id === c.head)).map((c) => low(c.form));
  const answerText = (run) => (v.admits === "time" ? phraseOf(rows, run[0]).map((r) => r.form).join(" ") : textOf(run));
  const anchorHeads = found.filter((f) => f.span).map((f) => f.span.at(-1));
  const depthTo = (run, verb) => { const byId = new Map(rows.map((r) => [r.id, r])); let c = run.find((r) => !run.some((x) => x.id === r.head)) ?? run[0], d = 0, n = 0; while (c && c.id !== verb.id && n++ < 40) { if (!["conj", "flat", "compound", "case"].includes(c.deprel)) d++; c = byId.get(c.head); } return c ? d : 99; };
  for (const run of fillers) {
    if (isAnchorName(run) && v.admits !== "time") continue;                                  // what the question names is never its own answer, in whatever sentence it recurs
    if (v.admits !== "time" && nextTo(run, "NUM")) continue;                                  // “18 June”: a month is a date part, not a person or a place
    if (v.admits === "place" && caseOf(run).length && !caseOf(run).some((c) => PLACE_CASE.includes(c))) continue;   // “born to Caterina” is a person, “born in Vinci” a place
    if (v.admits !== "time" && elaborates(run)) continue;   // its context, not a candidate
    // A person fills the role the anchors left open (who did it, who it was done to). A place or a time is an adjunct: the parser's labels for those vary too much to trust (“born in Ulm” gives Ulm the object's label), so what counts is that it hangs from the relation verb, and the nearest to the verb wins.
    const fnOfRun = run.map((r) => functionOf(rows, r)).find(Boolean), adjunct = v.admits === "place" || v.admits === "time";
    const role = adjunct ? "adjunct" : run.map((r) => r.karaka).find((k) => k && v.openRoles.includes(k)) ?? (v.admits === "person" && fnOfRun && !v.takenFns.includes(fnOfRun) ? "open" : null);
    const chainOf = (vb) => { const ids = new Set([vb.id]); let grew = true; while (grew) { grew = false; for (const r of rows) if (r.upos === "VERB" && r.deprel === "conj" && ids.has(r.head) && !ids.has(r.id)) { ids.add(r.id); grew = true; } else if (r.upos === "VERB" && ids.has(r.id) && r.deprel === "conj" && !ids.has(r.head)) { ids.add(r.head); grew = true; } } return ids; };
    const verb = verbs.find((vb) => run.some((r) => { const a = verbAbove(rows, r); return a === vb || (a && !rows.some((x) => x.head === vb.id && ["obl:agent", "nsubj", "nsubj:pass"].includes(x.deprel)) && chainOf(vb).has(a.id)) || (v.admits === "time" && r.head === vb.id); }));   // the nearest verb above it, not any verb it hangs from: “directed by A and written by B” gives B to “written”
    // a by-line: the anchor is what a noun is (“X is a novel by Y”), and Y is credited with it. Only for a verb of making, and only where the anchor is the thing made.
    const byCase = v.relation?.kind === "verb" && MAKING.includes(v.relation.lemma) && v.anchors.every((a) => !a.fn || a.fn === "patient") && v.admits === "person"
      ? rows.find((c) => c.deprel === "case" && lem(c) === "by" && run.some((r) => under(rows, r, rows.find((x) => x.id === c.head) ?? r))) : null;
    const byX = byCase && rows.find((x) => x.id === byCase.head);
    if (byCase && byX && byX.deprel === "nmod" && rows.find((x) => x.id === byX.head)?.upos === "NOUN") {   // the “by” hangs from a noun (“a novel by …”), not from a verb (“directed by …”, which the role tier reads)
      const X = byX, pred = (() => { let c = rows.find((x) => x.id === X?.head), n = 0; while (c && n++ < 6) { if (c.upos === "NOUN" && rows.some((k) => k.head === c.id && (k.deprel === "nsubj" || k.deprel === "cop"))) return c; c = rows.find((x) => x.id === c.head); } return null; })();
      const subjectIsAnchor = pred && (found.every((f) => f.span ? rows.some((k) => k.head === pred.id && k.deprel === "nsubj" && (f.span.some((s) => s.id === k.id) || under(rows, k, rows.find((z) => z.id === f.span.at(-1).id) ?? k))) : (f.isTitle && rows.some((k) => k.head === pred.id && k.deprel === "nsubj" && (k.upos === "PRON" || aliases.has(lem(k)))))));   // on a page named for the anchor, only “it” or the page's own word for its subject (“the novel”) stands for it: “the libretto” or “a musical adaptation” is another thing
      if (subjectIsAnchor && !isAnchorName(run)) { out.push({ answer: answerText(run), peers: peersOf(run), tier: "byline", why: `“${textOf(run)}” is credited as the maker in “${pred.form} by …”, said of the anchor, and the question's “${v.relation.lemma}” is a verb of making` }); continue; }
    }
    if (verb && role && present && holdsAnchorsUnder(verb)) { out.push({ _d: depthTo(run, verb), answer: answerText(run), peers: peersOf(run), tier: "role", why: `${run.map((r) => r.form).join(" ")} is the ${role} of “${lem(verb)}”, with every anchor in the sentence` }); continue; }
    const noun = nouns.find((n) => anchorHeads.some((h) => under(rows, h, n) && h !== n) || (found.some((f) => f.isTitle) && rows.some((c) => c.head === n.id && c.deprel === "nmod:poss" && (c.upos === "PRON" || aliases.has(lem(c))))));
    if (noun) {
      const cop = rows.some((r) => r.deprel === "cop" && r.head === noun.id), subj = rows.find((r) => r.head === noun.id && r.deprel === "nsubj"), onNoun = under(rows, run[0], noun) && run[0].id !== noun.id && !run.some((r) => r.deprel === "nsubj" && r.head === noun.id) && !anchorHeads.some((h) => under(rows, run[0], h));
      const predicate = run.find((r) => rows.some((c) => c.head === r.id && c.deprel === "cop"));   // “… is Paris”: the name carries the “is”
      const sideB = (cop && subj && run.some((r) => r === subj || under(rows, r, subj))) || (!cop && rows.some((r) => r.head === 0 && r.upos === "PROPN" && run.includes(r))) || (!!predicate && (predicate.head === noun.id || noun.head === predicate.id || noun.head === 0));
      const appos = noun.deprel === "appos" ? rows.find((r) => r.id === noun.head) : null;
      if (appos && run.some((r) => r.id === appos.id)) { out.push({ answer: answerText(run), peers: peersOf(run), tier: "copular", why: `“${run.map((r) => r.form).join(" ")}, the ${v.relation.lemma} of the anchor”` }); continue; }
      if (sideB && (!onNoun || predicate)) { out.push({ answer: answerText(run), peers: peersOf(run), tier: "copular", why: `the ${v.relation.lemma} of the anchor, said as “${run.map((r) => r.form).join(" ")}” on the other side of “is”` }); continue; }
    }
    if (present && verbs.some((vb) => run.some((r) => verbAbove(rows, r) === vb || (v.admits === "time" && r.head === vb.id)) && holdsAnchorsUnder(vb))) { out.push({ answer: answerText(run), peers: peersOf(run), tier: "linked", why: `the sentence has “${v.relation.lemma}” and every anchor, and ${run.map((r) => r.form).join(" ")} is of the kind asked for, but the parse gives it no open role` }); continue; }
    // a name coordinated with an anchor ("Gibson and Glover") is its peer, not something it is related to
    const partOfAnchor = run.some((r) => ["compound", "flat", "amod"].includes(r.deprel) && found.some((f) => f.span?.some((a) => a.id === r.head)));
    const peer = partOfAnchor || run.some((r) => r.deprel === "conj" && found.some((f) => f.span?.some((a) => a.id === r.head))) || found.some((f) => f.span?.some((a) => a.deprel === "conj" && run.some((r) => r.id === a.head)));
    if (!peer && v.relation?.kind !== "noun" && run.every((r) => r.upos === "PROPN" || v.admits === "time") && anchorHeads.length) { const near = Math.min(...anchorHeads.map((h) => hops(rows, h, run[0]))); if (near <= 2) out.push({ answer: answerText(run), tier: "comention", why: `${run.map((r) => r.form).join(" ")} stands ${near} step${near === 1 ? "" : "s"} from the anchor, and the sentence names no relation` }); }
  }
  // among the fillers that hang from the same verb, the ones directly on it answer; the ones nested under them (“in Ulm … in the German Empire”) are their context
  const direct = Math.min(...out.filter((o) => o.tier === "role").map((o) => o._d), Infinity);
  const nested = out.filter((o) => o.tier === "role" && o._d > direct).map((o) => o.answer);
  return out.filter((o) => o.tier !== "role" || o._d === direct).map(({ _d, ...rest }) => (rest.tier === "role" && nested.length ? { ...rest, contexts: nested } : rest));
}

// ---------------------------------------------------------------------------------------------------------------- the hunt

/**
 * huntVoid(v, { sources, read, split, maxSentences, perSource }) -> Promise<{ void, trail, candidates, answer, unique, gap }>
 *   sources  [{ name, find(v) -> [{ title, url, passages: [{ section, text }] }] }]  whole documents, in the order the source judges best
 *   read     (sentence) -> rows       the reader, one sentence
 *   split    (text) -> [sentence]     the reader's own splitter
 */
async function huntCore(v, { sources = [], read, split, maxSentences = 600, budgetMs = 60000, now = () => Date.now() } = {}) {
  if (!v?.ok) return { void: v, trail: [], candidates: [], answer: null, unique: false, gap: v?.gap ?? { kind: "no_void", detail: "no void to hunt" } };
  if (typeof read !== "function" || typeof split !== "function") throw new TypeError("huntVoid: read and split must be supplied");
  const trail = [], found = new Map(), deadline = now() + budgetMs;
  // a title the source knows by its full name is one anchor: “War and Peace” is a page, “War” and “Peace” are two other pages
  for (const j of v.joinable ?? []) {
    for (const src of sources) { let ok = false; try { ok = typeof src.exists === "function" && await src.exists(j.text, { deadline }); } catch { ok = false; }
      if (ok) { const a = v.anchors[j.i], b = v.anchors[j.i + 1]; v = { ...v, anchors: [...v.anchors.slice(0, j.i), { text: j.text, tokens: j.tokens, forms: j.forms, roles: [...new Set([...a.roles, ...b.roles])], fn: a.fn ?? b.fn }, ...v.anchors.slice(j.i + 2)], joinable: [] }; trail.push({ step: "anchors", joined: j.text, by: src.name }); break; } }
  }
  for (const src of sources) {
    let docs = [];
    if (now() > deadline) { trail.push({ source: src.name, error: "time budget spent before this source was asked" }); continue; }
    try { docs = (await src.find(v, { note: (n) => trail.push({ source: src.name, ...n }), deadline })) ?? []; } catch (e) { trail.push({ source: src.name, error: String(e?.message ?? e).slice(0, 120) }); continue; }
    for (const doc of docs) {
      let read_ = 0, matched = 0;
      // a page named for the thing asked about is cited first (its evidence is ordered so)
      // what the page calls its own subject: “Japan is an island COUNTRY”, so “the country's capital” is Japan's
      const aliases = new Set();
      for (const sent of split(String(doc.passages?.find((p) => !p.section)?.text ?? "").split("\n")[0] ?? "").slice(0, 3)) {
        const rows = read(String(sent).trim()) ?? [], root = rows.find((r) => r.head === 0 && r.upos === "NOUN" && rows.some((c) => c.deprel === "cop" && c.head === r.id));
        if (root && rows.some((c) => c.head === root.id && c.deprel === "nsubj")) aliases.add(lem(root));
      }
      for (const p of doc.passages ?? []) {
        for (const line of String(p.text ?? "").split("\n")) for (const sent of split(line)) {
          if (read_ >= maxSentences) break;
          const s = String(sent).trim(); if (!s) continue;
          read_++;
          const rows = read(s); if (!rows?.length) continue;
          for (const m of matchSentence(v, rows, doc.title, { aliases })) {
            matched++;
            const key = low(m.answer), cur = found.get(key) ?? { answer: m.answer, tier: m.tier, support: [], docs: new Set(), sources: new Set(), peers: new Set(), contexts: new Set() };
            for (const q of m.peers ?? []) cur.peers.add(q);
            for (const q of m.contexts ?? []) cur.contexts.add(low(q));
            if (TIERS.indexOf(m.tier) < TIERS.indexOf(cur.tier)) { cur.tier = m.tier; cur.why = m.why; }
            cur.why ??= m.why; cur.support.push({ source: src.name, title: doc.title, url: doc.url ?? null, section: p.section ?? null, sentence: s, tier: m.tier });
            cur.docs.add(`${src.name}:${doc.title}`); cur.sources.add(src.name); found.set(key, cur);
          }
        }
      }
      trail.push({ source: src.name, title: doc.title, url: doc.url ?? null, sentencesRead: read_, matched });
    }
  }
  // “Shakespeare” and “William Shakespeare” are one candidate: the shorter is folded into the longer that contains it, with its support
  const all = [...found.values()].sort((a, b) => b.answer.split(" ").length - a.answer.split(" ").length);
  for (const c of all) { const longer = all.filter((d) => d !== c && c.answer.split(" ").length === 1 && d.answer.split(" ").length > 1 && low(d.answer).split(" ").at(-1) === low(c.answer) && found.has(low(d.answer))), big = longer.length === 1 ? longer[0] : null; if (big && found.has(low(c.answer))) { big.support.push(...c.support); c.docs.forEach((x) => big.docs.add(x)); c.sources.forEach((x) => big.sources.add(x)); if (TIERS.indexOf(c.tier) < TIERS.indexOf(big.tier)) { big.tier = c.tier; big.why = c.why; } found.delete(low(c.answer)); } }
  const candidates = [...found.values()].map((c) => ({ answer: c.answer, tier: c.tier, why: c.why, support: c.support.length, documents: c.docs.size, sources: [...c.sources], evidence: [...c.support].sort((x, y) => Number(!v.anchors.some((an) => low(String(x.title)).split(" (")[0] === an.tokens.join(" "))) - Number(!v.anchors.some((an) => low(String(y.title)).split(" (")[0] === an.tokens.join(" ")))).slice(0, 4), corroborated: c.docs.size > 1 }))
    .sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || b.documents - a.documents || b.support - a.support);
  const peerKey = (c) => new Set([low(c.answer), ...[...(found.get(low(c.answer))?.peers ?? [])].map(low)]);
  const best = candidates.filter((c) => c.tier === candidates[0]?.tier);
  const containersEarly = new Set([...found.values()].flatMap((c) => [...c.contexts])), top = best.find((c) => !containersEarly.has(low(c.answer))) ?? best[0];
  // names that were said together in a sentence (“founded by Bill Gates and Paul Allen”) answer together: they are one set, not rivals
  // a place that another candidate sits inside (“Ulm … in the German Empire”) is that candidate's container: the more specific answer leads
  const containers = new Set([...found.values()].flatMap((c) => [...c.contexts]));
  const specific = best.filter((c) => !containers.has(low(c.answer)));
  const raced = specific.length ? specific : best;
  const members = top ? raced.filter((c) => c === top || peerKey(top).has(low(c.answer)) || peerKey(c).has(low(top.answer))) : [], rest = raced.filter((c) => !members.includes(c)), second = rest[0];
  if (top && members.length > 1) { top.set = members.map((c) => c.answer); top.documents = Math.max(...members.map((c) => c.documents)); }
  // alone in the best tier, or in strictly more documents than the next: nothing else is a judgement call
  const unique = !!top && top.tier !== "comention" && (!second || top.documents > second.documents);   // a name seen next to the anchors, with no sentence that says the relation, is a lead and never an answer
  if (unique && top.set) top.answerText = top.set.length > 1 ? `${top.set.slice(0, -1).join(", ")} and ${top.set.at(-1)}` : top.answer;
  const limited = trail.filter((t) => ["rate limit", "429", "time budget"].some((x) => String(t.error ?? "").includes(x)));
  if (!candidates.length && limited.length) return { void: v, trail, candidates, answer: null, unique: false, gap: { kind: "source_rate_limited", detail: `${limited.length} request${limited.length === 1 ? "" : "s"} refused as too many; nothing was read, so nothing can be said about the answer` } };
  if (!candidates.length) return { void: v, trail, candidates, answer: null, unique: false, gap: { kind: "nothing_fills_the_void", detail: `${trail.filter((t) => t.sentencesRead != null).reduce((n, t) => n + t.sentencesRead, 0)} sentences read in ${trail.filter((t) => t.sentencesRead != null).length} documents; none carries every anchor with a filler of the kind asked for` } };
  return { void: v, trail, candidates, answer: unique ? top : null, lead: top ?? null, unique, gap: unique ? null : top?.tier === "comention" ? { kind: "relation_not_attested", detail: `${best.slice(0, 3).map((c) => c.answer).join(", ")} stand next to ${v.anchors.map((a) => a.text).join(" and ")}, but no sentence says “${v.relation?.lemma ?? "the relation"}”` } : { kind: "several_fill_the_void", detail: best.slice(0, 4).map((c) => `${c.answer} (${c.tier}, ${c.support})`).join("; ") } };
}

// ---------------------------------------------------------------------------------------------------------------- the hunt, with a memory in the environment

/** what was asked, as a key the environment can hold a trail under: the relation, the kind, and the names, before any source has had a say */
export const huntHead = (v) => `ask:${v?.relation?.lemma ?? "-"}:${v?.admits ?? "-"}:${(v?.anchors ?? []).map((a) => a.tokens.join(" ")).join("+")}`;
const routeOf = (e) => `${e.source}|${e.title}|${e.section ?? ""}`;

/**
 * huntVoid(v, { sources, read, split, trails, ... }) -> { ...hunt, head, routes, via }
 *   trails  a trail store (trail-store.mjs): the environment this hunt reads before it spends a request and writes after it succeeds.
 * A man with a notebook looks in the notebook first: the page and section that settled this question before are tried first, alone, and if they settle
 * it again that is the answer (via: "trail"), with one request and not seven. If they do not, he hunts as if he had never looked, and what he finds leaves a
 * new trail; the old one is never deleted by this file, it evaporates, unless the caller raises an alarm (trails.veto(head, route)) because it was wrong.
 */
export async function huntVoid(v, opts = {}) {
  const { trails = null, sources = [], now = () => Date.now() } = opts;
  if (!trails || !v?.ok) return huntCore(v, opts);
  const head = huntHead(v), t0 = now();
  // the remembered pages, the one named for the thing asked about first: a trail that reinforces itself drifts toward whatever it already follows (the army-ant mill), so the page that is the subject leads
  const named = (x) => Number(!(v.anchors ?? []).some((an) => low(String(x[1])).split(" (")[0] === an.tokens.join(" ")));
  const remembered = trails.known(head).map((r) => r.split("|")).filter((x) => x.length >= 2).sort((a, b) => named(a) - named(b)).slice(0, 2);
  if (remembered.length) {
    const pseudo = sources.filter((src) => typeof src.page === "function" && remembered.some(([n]) => n === src.name)).map((src) => ({ name: src.name, exists: src.exists, find: async (_v, o) => (await Promise.all(remembered.filter(([n]) => n === src.name).map(([, title]) => src.page(title, o)))).filter(Boolean) }));
    if (pseudo.length) {
      const r = await huntCore(v, { ...opts, sources: pseudo });
      if (r.unique) { const routes = [...new Set(r.answer.evidence.map(routeOf))]; for (const x of routes) trails.deposit(head, x, true, now() - t0); return { ...r, head, routes, via: "trail", trail: [{ step: "trail", used: remembered.map((x) => x.join("|")) }, ...r.trail] }; }
    }
  }
  const r = await huntCore(v, opts), routes = r.unique ? [...new Set(r.answer.evidence.map(routeOf))] : [];
  for (const x of routes) trails.deposit(head, x, true, now() - t0);
  return { ...r, head, routes, via: "hunt" };
}
