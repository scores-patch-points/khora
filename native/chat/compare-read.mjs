// native/chat/compare-read.mjs — THE CHAT'S OWN READING BESIDE THE CANONICAL READ, as a pure comparison.
// The chat reads each sentence of a thread itself (rows, a cast, its own pronoun binder); the canonical read (reading.js readDocument) reads the same text whole. This pairs every gendered third-person
// pronoun the chat has read with the canonical read's own binding for it, and counts where they agree. PURE: it takes the chat's bindings (thread.bindings()) and the canonical entry and returns numbers.
// Used by eval/chat-register/shadow-read.mjs (a measured run) and by the thread's opt-in comparison mode (CHAT_COMPARE=1). It never changes what the chat says.
//
// Pairing is by SENTENCE AND OCCURRENCE, not by character offset: the two reads number their sentences the same way (the same splitter) but count offsets differently on a hard-wrapped text.
// A pronoun is (sentence, its form, which time that form occurs in the sentence). The same BEING under two spellings is not a conflict ("Mrs." and "Mrs"; "Frank" and "Frank Churchill").

const norm = (s) => String(s ?? "").toLowerCase();
const wordsOf = (s) => norm(s).split(".").join(" ").split(" ").filter(Boolean);
/** are these two names the same being: one name's words are among the other's */
export const sameName = (a, b) => { const x = wordsOf(a), y = wordsOf(b); return x.length > 0 && y.length > 0 && (x.every((w) => y.includes(w)) || y.every((w) => x.includes(w))); };

const keyed = (list, sentenceOf, formOf, posOf) => {
  const seen = new Map(), out = new Map();
  for (const x of [...list].sort((a, b) => posOf(a) - posOf(b))) { const base = `${sentenceOf(x)}|${norm(formOf(x))}`, k = seen.get(base) ?? 0; seen.set(base, k + 1); out.set(`${base}|${k}`, x); }
  return out;
};

export const KINDS = Object.freeze(["agree", "conflict", "chat_open", "chat_none", "canon_none", "both_none"]);

/**
 * compareBindings(chat, weft, { text }) -> { counts, items, paired, pronouns }
 *   chat   thread.bindings(): [{ order, form, at, chat: the name or null, open, candidates, via }]
 *   weft   the canonical read's entry (pronounsPresence and pronounsGuess: [{ pronoun, sentence, at: [start, end], surface, confident }])
 *   counts agree (both bind, the same being) / conflict (both bind, different) / chat_open (the chat asks, the canonical read binds) / chat_none (the chat has nobody, the canonical read binds) /
 *          canon_none (the chat binds, the canonical read has no binding) / both_none
 *   items  every pair that is not agree or both_none, with its context when `text` is given
 */
export function compareBindings(chat, weft, { text = null } = {}) {
  const canonList = [...(weft?.pronounsPresence ?? []), ...(weft?.pronounsGuess ?? [])];
  const canon = keyed(canonList, (b) => b.sentence, (b) => b.pronoun, (b) => b.at?.[0] ?? 0), chatKeyed = keyed(chat ?? [], (b) => b.order, (b) => b.form, (b) => b.at);
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0])), items = [];
  for (const [key, b] of chatKeyed) {
    const c = canon.get(key) ?? null, cn = c?.surface ?? null; let kind;
    if (b.chat && cn) kind = sameName(b.chat, cn) ? "agree" : "conflict";
    else if (b.open && cn) kind = "chat_open";
    else if (!b.chat && cn) kind = "chat_none";
    else if (b.chat && !cn) kind = "canon_none";
    else kind = "both_none";
    counts[kind]++;
    if (kind !== "agree" && kind !== "both_none") items.push({ kind, pronoun: b.form, order: b.order, at: b.at, ...(text ? { context: text.slice(Math.max(0, b.at - 40), b.at + 30).split("\n").join(" ") } : {}), chat: b.chat, open: b.open ? b.candidates : null, via: b.via, canonical: cn, confident: c?.confident ?? null });
  }
  return { counts, items, paired: [...chatKeyed.keys()].filter((k) => canon.has(k)).length, pronouns: chatKeyed.size };
}

// ---- I AND YOU (the speaker rung, native/adapters/text/speakers.js, in the canonical read since 9113500) ----
// The canonical read binds a first person to the speaker of its quotation, or (outside quotations, when it recurs) to the one narrator of the text, and a second person only inside a quotation, to the speaker of the quotation before it. It
// has no notion of a conversation. The chat does: in a message the user typed, "I" is the user and "you" is the chat (thread.participants()). This pairs the two by CHARACTER OFFSET (the same text is read by both and a typed message has no
// hard wrap) and counts them with the same kinds. A speaker (chat) agrees with a speaker or a narrator (canonical); an addressee with an addressee. A mention only the canonical read binds is a mention the chat has nobody for (a quotation
// it does not read, or a passage somebody else said): chat_none, counted and named, never guessed.
/**
 * compareSpeakers(chat, weft, { text }) -> { counts, items, paired, mentions, refs, gap }
 *   chat   thread.participants(): [{ order, form, at, kind: "speaker"|"addressee", chat: "user"|"me"|null, via }]  (chat null = the chat binds nobody: inside a quotation)
 *   weft   the canonical entry: speakerBindings: [{ a, b, cl, ref, kind: "speaker"|"addressee"|"narrator", via }] or { gap, detail }
 */
export function compareSpeakers(chat, weft, { text = null } = {}) {
  const sb = weft?.speakerBindings, gap = sb && !Array.isArray(sb) ? { gap: sb.gap ?? "speakers_unavailable", detail: sb.detail ?? null } : null;
  const canon = new Map((Array.isArray(sb) ? sb : []).map((m) => [m.a, m])), seen = new Set(), counts = Object.fromEntries(KINDS.map((k) => [k, 0])), items = [];
  const ctx = (at) => (text ? { context: text.slice(Math.max(0, at - 40), at + 30).split("\n").join(" ") } : {});
  for (const b of [...(chat ?? [])].sort((x, y) => x.at - y.at)) {
    const c = canon.get(b.at) ?? null; if (c) seen.add(b.at); let kind;
    if (b.chat && c) kind = (b.kind === "speaker" && (c.kind === "speaker" || c.kind === "narrator")) || (b.kind === "addressee" && c.kind === "addressee") ? "agree" : "conflict";
    else if (!b.chat && c) kind = "chat_none"; else if (b.chat && !c) kind = "canon_none"; else kind = "both_none";
    counts[kind]++; if (kind !== "agree" && kind !== "both_none") items.push({ kind, pronoun: b.form, role: b.kind, order: b.order, at: b.at, ...ctx(b.at), chat: b.chat, via: b.via, canonical: c ? { kind: c.kind, ref: c.ref, via: c.via } : null });
  }
  for (const [a, c] of canon) if (!seen.has(a)) { counts.chat_none++; items.push({ kind: "chat_none", pronoun: text ? text.slice(a, c.b) : null, role: c.kind, order: null, at: a, ...ctx(a), chat: null, via: "the chat lists no such mention here", canonical: { kind: c.kind, ref: c.ref, via: c.via } }); }
  const refs = { chat: [...new Set((chat ?? []).filter((b) => b.chat && b.kind === "speaker").map((b) => b.chat))], canonical: [...new Set([...canon.values()].filter((m) => m.kind !== "addressee").map((m) => String(m.ref)))] };
  return { counts, items, paired: [...seen].length, mentions: (chat ?? []).length + [...canon.keys()].filter((a) => !seen.has(a)).length, refs, gap };
}
