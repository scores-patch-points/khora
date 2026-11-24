// EXPLORATORY (developer-written conversations and three prose passages). THE SHADOW READ: the chat's own reading of a thread beside the canonical read (reading.js readDocument), on the same text, NO behaviour changed.
// The owner, 2026-11-24: "Yes, shadow first" (move the chat onto the canonical read, starting by measuring where the two disagree). For every gendered third-person pronoun the thread has read (thread.bindings(), a
// read-only view) the canonical read's own binding (pronounsPresence + pronounsGuess, keyed by the pronoun's character offset) is looked up, and the pair is counted:
//   agree          both bind the same name           conflict        both bind, to different names
//   chat_open      the chat asks (two candidates), the canonical read binds     chat_none  the chat has nobody for it, the canonical read binds
//   canon_none     the chat binds, the canonical read has no binding           both_none  neither binds
// and the names each side admits as beings are compared. Nothing is written to any log (the canonical read runs with the gate off).
//   KHORA_PRIORS_DIR=$HOME/Documents/janus/priors node eval/chat-register/shadow-read.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
process.env.KHORA_NO_PHAROS_GATE = "1";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const { makeThread } = await import("file://" + ROOT + "/native/chat/thread.mjs"), { readDocument } = await import("file://" + ROOT + "/native/reading.js");
const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })();
const home = process.env.KHORA_PRIORS_DIR ? process.env.KHORA_PRIORS_DIR : "(default order)";
const WS = path.resolve(ROOT, "..");
const prose = (file, from, to) => { try { return fs.readFileSync(file, "utf8").slice(from, to); } catch { return null; } };
const convs = [
  ["open names, she", ["Zelko met Brannoc. She smiled."]],
  ["open names, she (Casey, Jordan)", ["Casey met Jordan. She smiled."]],
  ["open names, he (Riley, Taylor)", ["Riley called Taylor. He answered."]],
  ["names the prior settles, she", ["Pierre met Natasha. She smiled."]],
  ["names the prior settles, he", ["Pierre met Natasha. He smiled."]],
  ["a village and a book", ["Mina gave Jonathan a book. She lives in the village."]],
  ["titles", ["Mrs Bennet wrote a letter. She lost the hat. Mr Darcy read it. He smiled."]],
  ["possessives and reflexives", ["Mina kissed her son. She hugged herself. Mina lost her hat. Mina washed herself. Mina opened her door."]],
  ["his hat", ["Pierre took his hat. He put on his coat. Natasha watched him."]],
  ["the 25-message chain's statements", ["Mina gave Jonathan a book. She lives in the village. Jonathan wrote a letter to Mina. The letter was long. Mina read the letter in the garden. Pierre visited Mina in the village. Pierre brought a basket of apples. He gave the apples to Jonathan. Mina did not read the book."]],
  ["three people", ["Priya met Omar and Liam. She smiled. He waved. Liam thanked her."]],
  ...[["prose: Dracula, 9,000 characters", path.join(WS, "ingest/index-test/dracula-excerpt.txt"), 0, 9000], ["prose: Emma, 6,000 characters", path.join(WS, "zenodotus-gh/01-literature-books/gitenberg/pg158_Emma.txt"), 20000, 26000], ["prose: Lincoln's Second Inaugural", path.join(WS, "zenodotus-gh/01-literature-books/wikisource/Abraham_Lincoln_s_Second_Inaugural_Address.txt"), 0, 6000]]
    .map(([label, f, a, b]) => [label, prose(f, a, b)]).filter(([, t]) => t).map(([label, t]) => [label, [t]]),
];
const norm = (s) => String(s ?? "").toLowerCase();
const totals = { agree: 0, conflict: 0, chat_open: 0, chat_none: 0, canon_none: 0, both_none: 0 }, rows = [], castDiffs = [];
for (const [label, msgs] of convs) {
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-24T12:00:00") });
  for (const m of msgs) { if (m.length > 600) await th.say(m, { given: "shadow-read" }); else await th.turn(m); }   // a passage is read into the thread as it stands; a short message goes through the chat as a user message
  const text = th.engine.S.text ?? th.state().text, chat = th.bindings();   // the engine's own text: sentenceStart indexes into it
  const w = await readDocument(text, { language: "eng", rows: true, minCharacters: 1 });
  // PAIRED BY SENTENCE AND OCCURRENCE, not by character offset: the two reads number their sentences the same way (the same splitter) but count offsets differently on a hard-wrapped text (a line break the
  // chat folds to a space shifts every later offset), and 59 of 84 offsets did not line up on a page of Emma. A pronoun is (sentence, its form, which time that form occurs in the sentence).
  const keyed = (list, sentenceOf, formOf, posOf) => { const seen = new Map(), out = new Map(); for (const x of [...list].sort((a, b) => posOf(a) - posOf(b))) { const base = `${sentenceOf(x)}|${norm(formOf(x))}`, k = seen.get(base) ?? 0; seen.set(base, k + 1); out.set(`${base}|${k}`, x); } return out; };
  const canonList = [...(w.pronounsPresence ?? []), ...(w.pronounsGuess ?? [])];
  const canon = keyed(canonList, (b) => b.sentence, (b) => b.pronoun, (b) => b.at?.[0] ?? 0), chatKeyed = keyed(chat, (b) => b.order, (b) => b.form, (b) => b.at);
  const aligned = [...chatKeyed.keys()].filter((k) => canon.has(k)).length, canonSentences = (w.sentences ?? []).length, chatSentences = th.engine.S.sentenceStart.size;
  const counts = { agree: 0, conflict: 0, chat_open: 0, chat_none: 0, canon_none: 0, both_none: 0 }, items = [];
  for (const [key, b] of chatKeyed) {
    const c = canon.get(key) ?? null, cn = c?.surface ?? null; let kind;
    if (b.chat && cn) kind = norm(b.chat) === norm(cn) ? "agree" : "conflict";
    else if (b.open && cn) kind = "chat_open";
    else if (!b.chat && cn) kind = "chat_none";
    else if (b.chat && !cn) kind = "canon_none";
    else kind = "both_none";
    counts[kind]++; totals[kind]++;
    if (kind !== "agree" && kind !== "both_none") items.push({ kind, pronoun: b.form, at: b.at, context: text.slice(Math.max(0, b.at - 40), b.at + 30).split("\n").join(" "), chat: b.chat, open: b.open ? b.candidates : null, via: b.via, canonical: cn, confident: c?.confident ?? null });
  }
  const chatNames = new Set((th.engine.S.read?.cast?.referents ?? []).filter((b) => b.kind === "name").map((b) => norm(b.forms?.[0]?.[0]))), canonNames = new Set((w.cast ?? []).map((c) => norm(c.surface)));
  const only = (a, b) => [...a].filter((x) => !b.has(x));
  castDiffs.push({ label, chatOnly: only(chatNames, canonNames).length, canonOnly: only(canonNames, chatNames).length, both: [...chatNames].filter((x) => canonNames.has(x)).length, chatOnlyNames: only(chatNames, canonNames).slice(0, 6), canonOnlyNames: only(canonNames, chatNames).slice(0, 6) });
  rows.push({ label, chars: text.length, pronouns: chat.length, aligned, counts, conflicts: items.filter((x) => x.kind === "conflict").slice(0, 20), items: items.filter((x) => x.kind !== "conflict").slice(0, 8) });
  console.log(`${label.padEnd(40)} pronouns ${String(chat.length).padStart(3)}  agree ${counts.agree}  conflict ${counts.conflict}  chat_open ${counts.chat_open}  chat_none ${counts.chat_none}  canon_none ${counts.canon_none}  both_none ${counts.both_none}${aligned < chat.length ? `  (paired ${aligned}/${chat.length}; sentences chat ${chatSentences} canonical ${canonSentences})` : ""}`);
}
const n = Object.values(totals).reduce((a, b) => a + b, 0), bound = totals.agree + totals.conflict;
console.log(`\nALL ${n} gendered pronouns: agree ${totals.agree}, conflict ${totals.conflict}, chat_open ${totals.chat_open}, chat_none ${totals.chat_none}, canon_none ${totals.canon_none}, both_none ${totals.both_none}`);
if (bound) console.log(`where both bind: ${totals.agree} of ${bound} the same (${Math.round(100 * totals.agree / bound)}%)`);
for (const r of rows) for (const it of (r.conflicts ?? []).slice(0, 6)) console.log(`  conflict in "${r.label}": …${it.context}… chat ${it.chat} (${it.via ?? "?"}) vs canonical ${it.canonical}`);
fs.writeFileSync(path.join(HERE, "shadow-read.json"), JSON.stringify({ stamp: { when: new Date().toISOString(), split: "EXPLORATORY (developer-written conversations, three prose passages)", commit, priorsHome: home }, totals, rows, castDiffs }, null, 1) + "\n");
process.exit(0);
