// native/chat/hunt-check.mjs — THE MAN IN THE BOX CHECKS BEFORE HE SAYS IT (see native/docs/THE-MAN-IN-THE-BOX.md).
// The first live run of the hunt door answered "Who wrote War and Peace?" with "Suetonius", confidently, from one sentence in a section about the title's history; the right
// name, Leo Tolstoy, was in the candidates, backed by two pages (the novel's lead says "an epic novel by the Russian author Leo Tolstoy"). A person who had read both would not
// say the first thing he found: he would notice that more pages stand behind someone else. So before the chat states a hunt's answer it asks the one question any reader asks:
// does anyone else have more behind them? If so it says what it found and how much stands behind each, and does not pick. (The hunt organ is another session's; the fix to
// its ranking belongs there, and has been sent. This check stays, because it is what a careful reader does whatever the ranking.)
//
// PURE. h is the hunt's result (void-hunt.js huntVoid): { unique, answer, candidates: [{ answer, documents, tier, support }] }.

const pages = (n) => (n === 1 ? "one page" : `${n} pages`);

/** settled(h) -> { ok: true } | { ok: false, text, rivals } */
export function settled(h) {
  if (!h?.unique || !h.answer) return { ok: true };
  const mine = h.answer, rivals = (h.candidates ?? []).filter((c) => c.answer !== mine.answer && !(mine.set ?? []).includes(c.answer) && c.documents > mine.documents);
  if (!rivals.length) return { ok: true };
  const top = rivals.sort((a, b) => b.documents - a.documents)[0];
  return { ok: false, rivals: rivals.map((c) => c.answer), text: `Wikipedia doesn't settle it: ${mine.answerText ?? mine.answer} is credited on ${pages(mine.documents)}, but ${top.answer} is named next to it on ${pages(top.documents)}.` };
}
