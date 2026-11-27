// native/chat/condense.mjs — TELL IT IN SHORT, NOT IN THE PAGE'S OWN SENTENCES. (The owner, looking at "say more": "is this verbatim? we should be paraphrasing.")
//
// A sentence read from a page is not handed over whole. The reader's tree says which parts are the sentence and which are set beside it, and the chat tells the sentence without the
// parts that are set beside it, under the name the person already knows the subject by:
//   1  a bracketed span ("(; Russian: …, IPA: […]; 9 September 1828 – 20 November 1910)") is furniture: the pronunciation and the dates in brackets are for the page, not for the telling
//   2  a participial set off by commas that only RESTATES the subject's name ("..., usually referred to in English as Leo Tolstoy, ...") is redundant once the sentence uses that name, so it
//      is not told; nothing else is dropped: "a film directed by Richard Donner" is a fact, and condensing must not lose a fact it cannot restate
//   3  the subject's own long name ("Count Lev Nikolayevich Tolstoy") is the name the person already uses ("Leo Tolstoy")
// Every change is checked by reading the result back: it must still have a predicate and a subject. If it does not, that change is not made, and the sentence stands as written (never a
// guess). What this is NOT, and the owner should know: it is condensing and re-naming, in the page's own words. Real paraphrase (other words for the same event, voice alternation with the
// inflected verb) needs a generator for English verb forms and a giver of synonyms, which this system does not have; the reply keeps the page's sentence under "Reasoning" so the two can be compared.
//
// PURE. rows = the reader's rows for one sentence; read(text) = the reader, for the check.

const NO_SPACE_BEFORE = new Set([",", ".", ";", ":", "!", "?", ")", "’", "'s", "n't", "%"]), NO_SPACE_AFTER = new Set(["(", "“", "‘", "["]);
const detok = (forms) => {
  let o = "", open = false, prev = null;   // a straight quote opens, then closes: no space inside it ("youthful sins", not " youthful sins ")
  forms.forEach((w, i) => {
    const q = w === '"'; let space = i > 0;
    if (NO_SPACE_BEFORE.has(w) || NO_SPACE_AFTER.has(prev)) space = false;
    if (q && open) space = false; if (prev === '"' && open) space = false;
    o += (space ? " " : "") + w; if (q) open = !open; prev = w;
  });
  return o;
};
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function subtree(rows, id) { const out = new Set([id]); let grew = true; while (grew) { grew = false; for (const r of rows) if (!out.has(r.id) && out.has(r.head)) { out.add(r.id); grew = true; } } return out; }

/** has a predicate and a subject: what a sentence needs to be told on its own */
export function wellFormed(rows) {
  const real = rows.filter((r) => r.upos !== "PUNCT");
  if (real.length < 3) return false;
  const root = real.find((r) => r.head === 0); if (!root) return false;
  const predicate = root.upos === "VERB" || root.upos === "AUX" || rows.some((r) => r.deprel === "cop" && r.head === root.id);
  const subject = rows.some((r) => String(r.deprel).startsWith("nsubj") && (r.head === root.id)) || real.some((r) => r.upos === "PRON" && String(r.deprel).startsWith("nsubj"));
  return predicate && subject;
}

/** condense(rows, { name, read }) -> { text, changes, original } . `name` is how the person already refers to the subject ("Leo Tolstoy"). */
export function condense(rows, { name = null, read = null } = {}) {
  const original = detok(rows.map((r) => r.form)), changes = [];
  const attempt = (dropIds, subjectRun) => {
    const kept = rows.filter((r) => !dropIds.has(r.id));
    attempt.kept = kept;
    let forms = kept.map((r) => r.form);
    if (subjectRun?.length) { const first = kept.findIndex((r) => r.id === subjectRun[0]); forms = [...forms.slice(0, first), name, ...forms.slice(first + subjectRun.length)]; }
    // a comma left at the front or doubled by a drop is not part of the telling
    const out = []; for (const f of forms) { if (f === "," && (!out.length || out.at(-1) === ",")) continue; out.push(f); }
    while (out.length && out.at(-1) === ",") out.pop();
    if (out.length && ![".", "!", "?"].includes(out.at(-1))) out.push(".");
    return cap(detok(out));
  };
  // the result must still be a sentence. If the reader parses the original as one, the result must parse as one too; if it cannot (it hangs the main verb under something), the check is
  // that a verb or auxiliary is still left among the words kept
  const origOk = typeof read === "function" ? wellFormed(read(original) ?? []) : true;
  const check = (text, keptRows) => (origOk ? (typeof read !== "function" || wellFormed(read(text) ?? [])) : keptRows.some((r) => r.upos === "VERB" || r.upos === "AUX"));

  // 1. bracketed spans
  // by the character, whatever the reader tagged it ("]" is tagged a proper noun in "[O.S. 28 August]"); an unbalanced pair is not trusted and nothing is dropped for it
  let brackets = new Set(), depth = 0;
  for (const r of rows) { if (r.form === "(" || r.form === "[") { depth++; brackets.add(r.id); continue; } if (r.form === ")" || r.form === "]") { depth = Math.max(0, depth - 1); brackets.add(r.id); continue; } if (depth > 0) brackets.add(r.id); }
  if (depth !== 0) brackets = new Set();

  // 2. modifiers set off by commas that are their own little clause
  const drop = new Set(brackets), offsets = new Map(rows.map((r, i) => [r.id, i]));
  const coreOf = (ids) => [...ids].filter((i) => rows[offsets.get(i)].upos !== "PUNCT").map((i) => offsets.get(i)).sort((a, b) => a - b);
  const setOff = (ids) => { const c = coreOf(ids); if (!c.length) return false; const before = rows[c[0] - 1], after = rows[c.at(-1) + 1]; return (before && before.form === ",") || (after && after.form === ","); };
  const takeComma = (ids) => { const c = coreOf(ids), after = rows[c.at(-1) + 1], before = rows[c[0] - 1]; for (const x of [after, before]) if (x && x.form === ",") { ids.add(x.id); break; } };   // a span that was set off by commas takes one of them with it
  for (const r of rows) {
    if (!name || drop.has(r.id) || r.deprel !== "acl" || r.upos !== "VERB") continue;   // a participial: a verb that modifies a noun (a relative clause, acl:relcl, can be the main predicate misparsed, and is never dropped)
    const ids = subtree(rows, r.id); for (const b of brackets) ids.delete(b);
    const nameWords = new Set(String(name).toLowerCase().split(" ")); if (![...ids].some((i) => nameWords.has(String(rows[offsets.get(i)].form).toLowerCase()) && rows[offsets.get(i)].upos === "PROPN")) continue;   // only a span that restates the name
    if (ids.has(rows.find((x) => x.head === 0)?.id)) continue;
    if (setOff(ids)) { takeComma(ids); for (const i of ids) drop.add(i); changes.push(`set-off ${r.deprel}`); }
  }

  // 3. the subject's own long name is the name the person already uses
  let run = null;
  if (name) {
    const live = rows.filter((r) => !drop.has(r.id)), lead = []; for (const r of live) { if (r.upos === "PROPN" || r.deprel === "nmod:desc") lead.push(r); else break; }
    const words = new Set(String(name).toLowerCase().split(" ")); if (lead.length > 1 && lead.some((r) => words.has(String(r.form).toLowerCase())) && detok(lead.map((r) => r.form)).toLowerCase() !== String(name).toLowerCase()) { run = lead.map((r) => r.id); changes.push("name"); }
  }

  // each change is kept only if the result is still a sentence: try all, then fewer
  const plans = [[drop, run, "all"], [drop, null, "no rename"], [brackets, run, "brackets and rename"], [brackets, null, "brackets only"]];
  for (const [d, sr, label] of plans) {
    if (d.size === 0 && !sr) continue;
    const text = attempt(d, sr); if (check(text, attempt.kept) && text.length < original.length + 4) return { text, changes: label.split(" and ").filter((x) => x !== "all"), kept: label + (origOk ? "" : " (the reader cannot parse the sentence as written: checked by the words kept)"), original };
  }
  return { text: original, changes: [], kept: "as written", original };
}
