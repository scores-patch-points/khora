// EXPLORATORY (developer-written probes). WHAT DOES THE CHAT NEED A TABLE OF GIVEN NAMES FOR? One thing, tested directly: with two people in a sentence and then
// "he" or "she", which person does the chat bind the pronoun to when the thread has said nothing else about either? Two groups, with the prior the chat loads (title, dictionary, Wikidata
// snapshot; the state of it is printed): names the prior settles (the pronoun must bind without a question), and names it cannot settle (the chat must ASK, never guess).
// Scored on the NAME in "That would be X." (not on the quoted sentence after it). Also records how "Who smiled?" is answered.
//   node eval/chat-register/pronoun-probe.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const { makeThread } = await import("file://" + ROOT + "/native/chat/thread.mjs");
const mk = () => makeThread({ hl: "http://127.0.0.1:1", know: null, janus: null, log: null, getJson: async () => ({}) });
const cases = [["Pierre met Natasha. She smiled.", "Natasha", "second"], ["Natasha met Pierre. He smiled.", "Pierre", "second"], ["Pierre met Natasha. He smiled.", "Pierre", "first"], ["Natasha met Pierre. She smiled.", "Natasha", "first"],
  ["Dana met Tom. She smiled.", "Dana", "first"], ["Tom met Dana. She smiled.", "Dana", "second"], ["Mary called John. He answered.", "John", "second"], ["John called Mary. She answered.", "Mary", "second"],
  ["Mr Pierre met Mrs Natasha. She smiled.", "Natasha", "second"], ["Mrs Natasha met Mr Pierre. He smiled.", "Pierre", "second"]];
// names no source settles ("Casey", "Jordan": nothing in the words says; "Laurie": both kinds of sense): the honest answer is to ask which, never to pick
const openCases = [["Casey met Jordan. She smiled.", "Casey|Jordan"], ["Jordan met Casey. He smiled.", "Casey|Jordan"], ["Laurie met Avery. She smiled.", "Laurie|Avery"], ["Riley called Taylor. He answered.", "Riley|Taylor"]];
const out3 = { right: 0, asked: 0, wrong: 0 }, byPlace = { first: { right: 0, asked: 0, wrong: 0 }, second: { right: 0, asked: 0, wrong: 0 } }; const who = [];
for (const [say, want, place] of cases) { const th = await mk(); await th.turn(say); const pron = /\b(She|He) /.exec(say)[1].toLowerCase(), r = await th.turn(`Who is ${pron}?`), r2 = await th.turn(`Who ${say.split(". ")[1].split(" ")[1].replace(".", "")}?`);
  const text = String(r?.text ?? ""), named = (/^That would be ([^.]+)\./.exec(text) ?? [])[1] ?? "", names = say.split(". ")[0].split(" ").filter((w) => /^[A-Z]/.test(w)).map((w) => w.replace(/[.,]/g, ""));
  // right = it names the person; asked = it names BOTH candidates as a question ("Do you mean Pierre or Natasha?"), which is the honest answer when nothing says either name's gender; wrong = it names the other person, or names nobody and does not ask
  const asked = !named && names.every((n) => text.includes(n)) && text.includes("?"), outcome = named.split(" ").pop() === want ? "right" : asked ? "asked" : "wrong"; out3[outcome]++; byPlace[place][outcome]++; who.push(String(r2?.text ?? ""));
  console.log(`${outcome.padEnd(5)}  ${JSON.stringify(say).padEnd(40)} "${pron}" -> ${JSON.stringify(text.split(".")[0].slice(0, 44))}; the pronoun means the ${place}-named person (${want}); "Who ...?" -> ${JSON.stringify(String(r2?.text ?? "").slice(0, 34))}`); }
const fmt = (o) => `${o.right} right, ${o.asked} asked which, ${o.wrong} wrong`;
const gm = await import("file://" + ROOT + "/native/adapters/text/gender-of-words.js").catch(() => null), thePrior = gm?.makeDefaultNameGenderPrior?.({}), priorState = !thePrior ? "no gender module" : thePrior.missing ? "no table of given names" : "title + dictionary table + Wikidata snapshot";
const open3 = { asked: 0, guessed: 0, other: 0 }, openRows = [];
for (const [say, pair] of openCases) { const th = await mk(); await th.turn(say); const pron = /\b(She|He) /.exec(say)[1].toLowerCase(), r = await th.turn(`Who is ${pron}?`), text = String(r?.text ?? ""), names = pair.split("|"), named = (/^That would be ([^.]+)\./.exec(text) ?? [])[1] ?? "";
  const asked = !named && names.every((n) => text.includes(n)) && text.includes("?"), outcome = asked ? "asked" : named ? "guessed" : "other"; open3[outcome]++; openRows.push({ say, outcome, text: text.slice(0, 80) });
  console.log(`${outcome.padEnd(7)} ${JSON.stringify(say).padEnd(40)} "${pron}" -> ${JSON.stringify(text.slice(0, 70))}`); }
console.log(`\nprior: ${priorState}. Names it settles: ${cases.length} two-name probes: ${fmt(out3)}  (pronoun means the first-named person: ${fmt(byPlace.first)}; the second-named: ${fmt(byPlace.second)}); "Who smiled?" answered with the bare pronoun in ${who.filter((t) => /^(She|He)\.$/.test(t)).length} of ${who.length}\nNames it cannot settle: ${openCases.length} probes: ${open3.asked} asked which, ${open3.guessed} guessed, ${open3.other} other`);   // regex-ok: the reply text in a probe
// THE ASK-BACK AND WHAT IT LEARNS (scored). Each row is a conversation: [message, what the reply must start with, "?" for "it asks (a question mark)", or "both:A,B" for "it restates the question naming both candidates" (a refusal says what was asked)].
const dialogues = {
  "names the prior settles: no question, the pronoun binds": [["Pierre met Natasha. She smiled.", null], ["Who is she?", "That would be Natasha."], ["Who smiled?", "Natasha."]],
  "a title gives it away: Mrs": [["Mr Pierre met Mrs Natasha. She smiled.", null], ["Who is she?", "That would be Mrs Natasha."]],
  "open names: ask which, take the name, answer with it": [["Casey met Jordan. She smiled.", null], ["Who is she?", "?"], ["Casey", null], ["Who smiled?", "Casey."]],
  "open names: a settled she makes he someone else": [["Casey met Jordan. She smiled. He left.", null], ["Who is she?", "?"], ["Casey", null], ["Who is he?", "That would be Jordan."]],
  "open names: a wrong answer is refused and the question stays open": [["Casey met Jordan. She smiled.", null], ["Who is she?", "?"], ["the course", "both:Casey,Jordan"], ["Casey", null], ["Who smiled?", "Casey."]],
  "one pro-form settles a man (no question needed)": [["Pierre took his hat. Natasha smiled. He waved.", null], ["Who waved?", "Pierre."]],
  "a woman who smiled is the only one it can be (no question needed)": [["Pierre took his hat. Natasha smiled. She waved.", null], ["Who waved?", "Natasha."]],
  "one person only, no ambiguity (no question needed)": [["Natasha smiled. She waved.", null], ["Who waved?", "Natasha."]],
};
const dRows = []; let dOk = 0;
for (const [name, steps] of Object.entries(dialogues)) { const th = await mk(), trail = []; let ok = true;
  for (const [msg, want] of steps) { const r = await th.turn(msg), text = String(r?.text ?? ""); trail.push(`${msg} => ${text.slice(0, 48)}`); if (want === "?") { if (!text.includes("?")) ok = false; } else if (want?.startsWith("both:")) { if (!want.slice(5).split(",").every((n) => text.includes(n))) ok = false; } else if (want && !text.startsWith(want)) ok = false; }
  if (ok) dOk++; dRows.push({ name, ok, trail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : "\n      " + trail.join("\n      ")}`); }
console.log(`ask-back conversations: ${dOk} of ${Object.keys(dialogues).length}`);
fs.writeFileSync(path.join(HERE, "pronoun-probe.json"), JSON.stringify({ stamp: { when: new Date().toISOString(), split: "EXPLORATORY (developer-written probes)", commit: process.env.CHAT_COMMIT ?? "working tree" }, probes: cases.length, priorState, outcomes: out3, openNames: { probes: openCases.length, ...open3, rows: openRows }, wrongBindings: out3.wrong, dialogues: { passed: dOk, of: Object.keys(dialogues).length, rows: dRows }, byPlace, whoAnsweredWithBarePronoun: who.filter((t) => /^(She|He)\.$/.test(t)).length }, null, 1));
process.exit(0);
