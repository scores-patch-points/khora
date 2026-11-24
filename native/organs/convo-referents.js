// convo-referents.js — WHO "HE" IS, IN A CONVERSATION WITH THE CORPUS: the referents a conversation has made, and the binding of a follow-up question's third-person pronouns to them, on the reader's own rows.
// "Where was Goethe born?" ... "When did he die?": the second question names nothing, so it declares no void; a man with a notebook reads "he" as the one the last question was about. This organ keeps that notebook
// and does the reading the way the repo reads: not by editing the string, but on the rows. A pronoun row (the reader's PRON with Person=3, PronType=Prs, and the Gender and Number the reader gave it) is
// REPLACED by proper-noun rows of the referent it is bound to, carrying the pronoun's head, relation and kāraka, so that everything downstream (the void, the hunt) reads a question that names its subject.
//
// AGREEMENT is read from the reader's marks: Gender=Masc -> a person who is not known to be a woman; Gender=Fem -> a person who is not known to be a man; Gender=Neut ("it") -> not a person; Number=Plur ("they") -> a
// referent said to be plural. A referent's own gender is what the given-name prior says of its words (injected `genderOf`, the chat's prior: organs/../adapters/text/gender-of-words.js), and then what the user's own
// pronouns said of it ("he" for Goethe is evidence that Goethe is male, held as told, overcome by nothing here). SALIENCE: the latest turn first; within it the being the question was about, then the answer.
// A pronoun nobody can be found for is UNRESOLVED and said so (a typed gap), never guessed; two equally salient candidates are bound to the first and the other is returned in `alternatives`.
// PURE: no reader, no I/O. Rows in, rows out.
export const CONVO_SCHEMA = "ConvoReferents@1";

/** verbs whose anchor, in a question, is a being (“Where was X born?”, “When did X die?”): a closed class of the English question grammar, the same way the question words are */
export const BEING_VERBS = Object.freeze(["bear", "die", "live", "marry", "reign", "rule"]);
const feat = (r, k) => { for (const kv of String(r?.feats ?? "").split("|")) { const i = kv.indexOf("="); if (i > 0 && kv.slice(0, i) === k) return kv.slice(i + 1); } return null; };
const low = (s) => String(s ?? "").toLowerCase();

export function makeConversation({ genderOf = null } = {}) {
  let referents = [], turn = 0;
  const personOf = (r) => r.kind === "person";
  const gender = (r) => r.told ?? r.gender ?? null;
  const fits = (pr, r) => {
    const g = feat(pr, "Gender"), n = feat(pr, "Number") ?? "Sing";
    if (n === "Plur" ? !r.plural : r.plural) return false;
    if (g === "Neut") return !personOf(r);
    if (g === "Masc") return personOf(r) && gender(r) !== "female";
    if (g === "Fem") return personOf(r) && gender(r) !== "male";
    return personOf(r) || n === "Plur";   // “they”: a person, or a plural referent
  };
  const rank = (r) => r.turn * 10 + (r.how === "asked" ? 2 : r.how === "answered" ? 1 : 0);
  const named = (rows, i, ref) => {
    const pr = rows[i], toks = ref.forms, n = toks.length, shift = n - 1, gen = pr.id;
    const last = gen + shift, mk = (form, k) => ({ ...pr, id: gen + k, form, lemma: low(form), upos: "PROPN", feats: k === n - 1 ? pr.feats : "_", head: k === n - 1 ? (pr.head > gen ? pr.head + shift : pr.head) : last, deprel: k === n - 1 ? pr.deprel : "flat", boundFrom: pr.form, boundTo: ref.text });
    const out = [];
    for (const r of rows) {
      if (r.id < gen) out.push({ ...r, head: r.head > gen ? r.head + shift : r.head === gen ? last : r.head });
      else if (r.id === gen) toks.forEach((t, k) => out.push(mk(t, k)));
      else out.push({ ...r, id: r.id + shift, head: r.head === gen ? last : r.head > gen ? r.head + shift : r.head });
    }
    return out;
  };
  return {
    schema: CONVO_SCHEMA,
    referents: () => referents.map((r) => ({ text: r.text, kind: r.kind, gender: gender(r), turn: r.turn, how: r.how })),
    reset() { referents = []; turn = 0; },
    /** bind(rows) -> { rows, bindings: [{ pronoun, referent, kind, why, alternatives }], unresolved: [{ pronoun, why }] } */
    bind(inRows) {
      let rows = inRows.slice(), bindings = [], unresolved = [];
      for (let i = 0; i < rows.length; i++) {
        const pr = rows[i]; if (pr.upos !== "PRON" || feat(pr, "PronType") !== "Prs" || feat(pr, "Person") !== "3") continue;
        const ok = referents.filter((r) => fits(pr, r)).sort((a, b) => rank(b) - rank(a));
        if (!ok.length) { unresolved.push({ pronoun: pr.form, why: referents.length ? `nobody mentioned so far fits “${pr.form}” (${feat(pr, "Gender") === "Neut" ? "not a person" : feat(pr, "Number") === "Plur" ? "plural" : "a person"})` : "nothing has been mentioned yet for it to mean" }); continue; }
        const best = ok[0], tied = ok.filter((r) => rank(r) === rank(best) && r !== best);
        const why = best.how === "asked" ? `the ${personOf(best) ? "person" : "thing"} the last question was about` : best.how === "answered" ? "the answer given last" : "mentioned earlier";
        bindings.push({ pronoun: pr.form, referent: best.text, kind: best.kind, why, alternatives: tied.map((r) => r.text) });
        if (personOf(best) && !best.told && feat(pr, "Gender") === "Masc") best.told = "male"; if (personOf(best) && !best.told && feat(pr, "Gender") === "Fem") best.told = "female";   // what the user's own pronoun says of it
        const w = rows.length; rows = named(rows, i, best); i += rows.length - w;
      }
      return { rows, bindings, unresolved };
    },
    /** note({ void, answer }): what this turn was about and what it said, for the next one. answer: { text, admits } or null */
    note({ void: v, answer = null } = {}) {
      turn++;
      const add = (text, kind, how, extra = {}) => { const forms = String(text).split(" ").filter(Boolean); if (!forms.length) return; referents = referents.filter((r) => low(r.text) !== low(text)); referents.push({ text: String(text), forms, kind, how, turn, plural: false, gender: kind === "person" && genderOf ? (genderOf(forms) ?? null) : null, ...extra }); };
      const being = v?.relation && BEING_VERBS.includes(v.relation.lemma);
      const aBeing = being || (v?.admits === "person" && (!v?.relation || v.relation.kind === "noun"));   // “Who is X?”, “Who was X's teacher?”: X is a being; “Who wrote X?”: X is what was written
      for (const a of v?.anchors ?? []) { if (a.common) continue; add(a.text, aBeing ? "person" : v?.admits === "person" && v?.relation ? "thing" : "unknown", "asked"); }
      if (answer?.text && (answer.admits === "person" || answer.admits === "place")) add(answer.text, answer.admits === "person" ? "person" : "place", "answered");
      referents = referents.slice(-12);
    },
  };
}
