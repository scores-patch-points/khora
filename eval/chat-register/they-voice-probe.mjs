// EXPLORATORY (developer-written probes). THE OWNER'S RULE, 2026-11-23: "default to 'they' when you're not sure." What does the chat engine's own voice (the referent profile: "They wrote and waved") say
// of a person, in each state of knowledge? "Not sure" is not a threshold here: a gender is decided by the book's own pronouns, or by the thread's given-name prior (a title, a name's dictionary
// sense, the Wikidata snapshot), or it is not. Expected: decided by either -> he / she; nothing decides it, or the book's pronouns conflict -> they (plural verb); a place -> its name, never "they".
//   node eval/chat-register/they-voice-probe.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const { makeThread } = await import("file://" + ROOT + "/native/chat/thread.mjs");
const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim() + (execSync("git status --porcelain native/chat", { cwd: ROOT }).toString().trim() ? "+working tree" : ""); } catch { return "unknown"; } })();
// [label, the thread's sentences, the being, what the voice must say: "they" | "she" | "he" | "name" (no pronoun: its own name)]
const cases = [
  ["an open name that acts, nothing says its gender", "Casey wrote a letter. Casey opened the door. Casey waved.", "Casey", "they"],
  ["two open names, then a she that could be either (contested)", "Casey met Jordan. She smiled. Casey wrote a letter. Jordan waved.", "Casey", "they"],
  ["a woman's given name, the book never says she", "Natasha wrote a letter. Natasha lost the hat. Natasha waved.", "Natasha", "she"],
  ["a man's given name, the book never says he", "Pierre wrote a letter. Pierre lost the hat. Pierre waved.", "Pierre", "he"],
  ["a title gives it away (Mrs), the book never says she", "Mrs Bennet wrote a letter. Mrs Bennet lost the hat. Mrs Bennet waved.", "Mrs Bennet", "she"],
  ["the book decided: six she / her / herself, none against (the read's sign test, p 0.031)", "Mina kissed her son. She hugged herself. Mina lost her hat. Mina washed herself. Mina opened her door. Mina saw herself. Mina sold her house.", "Mina", "she"],
  ["four she / her / herself and none against (the read's sign test says p 0.125: contested)", "Mina kissed her son. She hugged herself. Mina lost her hat. Mina washed herself. Mina opened her door.", "Mina", "she"],
  ["a place that is not an agent", "Jordan read the letter in Paris. Jordan was tired in Paris.", "Paris", "name"],
  ["a place that is the subject (metonymy: Paris sent a letter)", "Paris sent a letter. Paris lost the hat. Paris waved.", "Paris", "name"],
];
const rows = [];
for (const [label, text, name, want] of cases) {
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-24T06:00:00") }); await th.turn(text);
  const b = th.engine.S.read.cast.referents.find((x) => x.forms[0][0] === name);
  if (!b) { rows.push({ label, name, want, got: "not a referent", ok: false, summary: "" }); continue; }
  const p = await th.engine.wordProfile("", { ref: b.ref }), nom = p.pronoun?.nom ?? null, got = nom === "they" ? "they" : nom === "she" ? "she" : nom === "he" ? "he" : /^(They|She|He) /.test(String(p.summary).split(". ").slice(1).join(". ")) ? "pronoun" : "name";   // regex-ok: the reply text in a probe
  rows.push({ label, name, want, got, source: p.pronoun?.source ?? null, ok: got === want, summary: String(p.summary).slice(0, 160) });
}
for (const r of rows) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.label}: want ${r.want}, got ${r.got}${r.source ? ` (${r.source})` : ""}${r.ok ? "" : `\n      ${r.summary}`}`);
const passed = rows.filter((r) => r.ok).length;
// UNSEEN: written after 3397389 fixed the nine cases above, so not tuned to; run once as written. For each: the being, what is true of it, what the voice may say.
//   right = the true gender's pronoun (a they for a person who is unisex or unknown is the owner's default, so SAFE for a gendered person, RIGHT for a name that is both) or the bare name for a non-person;
//   wrong = the opposite gender's pronoun, or a pronoun for a place or an organisation.
const unseen = [
  ["Priya", "f person", "Priya wrote a letter. Priya lost the hat. Priya waved.", { right: ["she"], safe: ["they"] }],
  ["Omar", "m person", "Omar wrote a letter. Omar lost the hat. Omar waved.", { right: ["he"], safe: ["they"] }],
  ["Liam", "m person", "Liam wrote a letter. Liam lost the hat. Liam waved.", { right: ["he"], safe: ["they"] }],
  ["Svetlana", "f person", "Svetlana wrote a letter. Svetlana lost the hat. Svetlana waved.", { right: ["she"], safe: ["they"] }],
  ["Mr Hargreaves", "m person, title", "Mr Hargreaves wrote a letter. Mr Hargreaves lost the hat. Mr Hargreaves waved.", { right: ["he"], safe: ["they"] }],
  ["Mrs Okafor", "f person, title", "Mrs Okafor wrote a letter. Mrs Okafor lost the hat. Mrs Okafor waved.", { right: ["she"], safe: ["they"] }],
  ["Jamie", "unisex name", "Jamie wrote a letter. Jamie lost the hat. Jamie waved.", { right: ["they"], safe: [] }],
  ["Alex", "unisex name", "Alex wrote a letter. Alex lost the hat. Alex waved.", { right: ["they"], safe: [] }],
  ["Casey", "a woman, once the user says so (told)", "Casey wrote a letter. Casey lost the hat. Casey waved. Casey opened her door. Casey saw herself. Casey kissed her son. She hugged herself.", { right: ["she"], safe: [] }],
  ["London", "a place that acts", "London sent a letter. London lost the hat. London waved.", { right: ["name"], safe: [] }],
  ["Kansas", "a place that acts", "Kansas sent a letter. Kansas lost the hat. Kansas waved.", { right: ["name"], safe: [] }],
  ["Rome", "a place that acts", "Rome sent a letter. Rome lost the hat. Rome waved.", { right: ["name"], safe: [] }],
  ["Microsoft", "an organisation that acts", "Microsoft sent a letter. Microsoft lost the hat. Microsoft waved.", { right: ["name"], safe: [] }],
  ["Florence", "a woman whose name is also a city", "Florence wrote a letter. Florence lost the hat. Florence waved.", { right: ["she"], safe: ["they", "name"] }],
];
const unseenRows = [];
for (const [name, what, text, rule] of unseen) {
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-24T06:00:00") }); await th.turn(text);
  const b = th.engine.S.read.cast.referents.find((x) => x.forms[0][0] === name); let got = "not a referent", source = null, summary = "";
  if (b) { const p = await th.engine.wordProfile("", { ref: b.ref }); source = p.pronoun?.source ?? null; summary = String(p.summary).slice(0, 140); const nom = p.pronoun?.nom; got = nom === "they" ? "they" : nom === "she" ? "she" : nom === "he" ? "he" : "name"; }
  const verdict = rule.right.includes(got) ? "right" : rule.safe.includes(got) ? "safe" : "wrong"; unseenRows.push({ name, what, got, source, verdict, summary });
  console.log(`${verdict.padEnd(5)} UNSEEN ${name} (${what}): said ${got}${source ? ` (${source})` : ""}${verdict === "wrong" ? `\n      ${summary}` : ""}`);
}
const uc = { right: 0, safe: 0, wrong: 0 }; for (const r of unseenRows) uc[r.verdict]++;
console.log(`UNSEEN (written after the fix, not tuned to): ${uc.right} right, ${uc.safe} safe (they where the prior knew), ${uc.wrong} wrong, of ${unseenRows.length}`);

console.log(`they-default voice: ${passed} of ${rows.length}`);
fs.writeFileSync(path.join(HERE, "they-voice-probe.json"), JSON.stringify({ stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY (developer-written probes)", commit }, passed, of: rows.length, rows, unseen: { counts: uc, of: unseenRows.length, rows: unseenRows } }, null, 1) + "\n");
process.exit(0);
