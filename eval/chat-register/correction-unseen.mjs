// EXPLORATORY (developer-written, but written AFTER the chat session's correction commit 47b7561 and run once as written, so not tuned to). The chat's corrections were fixed to correction-probe.mjs (6 of 6),
// which proves little. These conversations are other phrasings, other names, and the traps a correction reader must NOT take: a question ("Is she Priya?"), a negation ("She is not Priya."), a copula
// whose subject is not the pronoun ("My sister is Priya."), a name the thread does not hold ("No, she is Zoltan."). Each row: the messages, then the question whose answer shows what the chat believes.
// "is" means the answer must start with the wanted text; "not" means it must not (a trap must leave the earlier answer standing).
//   node eval/chat-register/correction-unseen.mjs
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { fileURLToPath } from "node:url"; import { execSync, execFileSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
// ONE PROCESS PER CONVERSATION, each with a pharos log of its own (a first version shared one log, so what a conversation told the chat about Riley leaked into the next: a correction carries over BY DESIGN)
const ONE = process.argv.indexOf("--one") > 0 ? Number(process.argv[process.argv.indexOf("--one") + 1]) : null;
if (ONE !== null) process.env.CHAT_PHAROS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "correction-unseen-pharos-"));   // nothing is written to ~/.pharos
const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })();
const A = ["Dana met Priya. She smiled.", "Who is she?", "Dana"];   // an ask-back answered, so "she" is Dana, and the correction is to Priya
const T = ["Taylor met Riley. She smiled.", "Who is she?", "Taylor"];  // two names no source settles
const convs = [
  // what must be taken
  { what: "'actually she is X'", corr: "Actually she is Priya.", threads: [[...A, "Actually she is Priya.", "Who smiled?"]], is: "Priya." },
  { what: "a man, 'no, he is X'", corr: "No, he is Leo.", threads: [["Leo met Omar. He left.", "Who is he?", "Omar", "No, he is Leo.", "Who left?"]], is: "Leo." },
  { what: "'no, it was X'", corr: "No, it was Priya.", threads: [[...A, "No, it was Priya.", "Who smiled?"]], is: "Priya." },
  { what: "'not X, Y'", corr: "Not Dana, Priya.", threads: [[...A, "Not Dana, Priya.", "Who smiled?"]], is: "Priya." },
  { what: "lower case, no punctuation", corr: "no she is priya", threads: [[...A, "no she is priya", "Who smiled?"]], is: "Priya." },
  { what: "'by they I mean X'", corr: "By they I mean Mina.", threads: [["Mina smiled. They waved.", "By they I mean Mina.", "Who waved?"]], is: "Mina." },
  { what: "a gender stated settles the ask-back", corr: "Riley is a man.", threads: [["Taylor met Riley. She smiled.", "Riley is a man.", "Who is she?"]], is: "That would be Taylor." },
  { what: "corrected twice, the last one stands", corr: "Sorry, she is Taylor.", threads: [[...T, "No, she is Riley.", "Sorry, she is Taylor.", "Who smiled?"]], is: "Taylor." },
  { what: "across threads, an unrelated order of names", corr: "No, she is Riley.", threads: [[...T, "No, she is Riley."], ["Riley met Taylor. She smiled.", "Who smiled?"]], is: "Riley." },
  // what must NOT be taken
  { what: "TRAP a question: 'Is she Priya?'", corr: "Is she Priya?", threads: [[...A, "Is she Priya?", "Who smiled?"]], not: "Priya." },
  { what: "TRAP a negation: 'She is not Priya.'", corr: "She is not Priya.", threads: [[...A, "She is not Priya.", "Who smiled?"]], not: "Priya." },
  { what: "TRAP another subject: 'My sister is Priya.'", corr: "My sister is Priya.", threads: [[...A, "My sister is Priya.", "Who smiled?"]], not: "Priya." },
  { what: "TRAP a name the thread does not hold: 'No, she is Zoltan.'", corr: "No, she is Zoltan.", threads: [[...A, "No, she is Zoltan.", "Who smiled?"]], not: "Zoltan." },
  { what: "TRAP the earlier pick is not wiped by a correction of someone else", corr: "No, she is Priya.", threads: [["Dana met Priya. Leo met Omar. He left.", "Who is he?", "Omar", "No, she is Priya.", "Who left?"]], is: "Omar." },
];
const run = async (c) => {
  const { makeThread } = await import("file://" + ROOT + "/native/chat/thread.mjs"), { openLog } = await import("file://" + ROOT + "/native/chat/record.mjs");
  const log = openLog(); let last = "", ack = ""; const trail = [];
  for (let ti = 0; ti < c.threads.length; ti++) { const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, log, now: () => new Date("2026-11-24T07:00:00") }); if (ti) trail.push("— new thread —");
    for (const m of c.threads[ti]) { const r = await th.turn(m), text = String(r?.text ?? ""); trail.push(`${m} => ${text.slice(0, 70)}`); if (m === c.corr) ack = text; last = text; } }
  return { what: c.what, ok: c.is ? last.startsWith(c.is) : !last.startsWith(c.not), last: last.slice(0, 80), want: c.is ? `is ${c.is}` : `not ${c.not}`, ack: ack.slice(0, 80), trail };
};
if (ONE !== null) { console.log(JSON.stringify(await run(convs[ONE]))); process.exit(0); }
const rows = [];
for (let i = 0; i < convs.length; i++) { const c = convs[i], out = execFileSync("node", [fileURLToPath(import.meta.url), "--one", String(i)], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 }), line = out.split("\n").filter((l) => l.startsWith("{")).pop(), row = JSON.parse(line); rows.push(row);
  console.log(`${row.ok ? "PASS" : "FAIL"} ${c.what}: ${JSON.stringify(row.last.slice(0, 60))} (${c.is ? "wanted " + c.is : "must not be " + c.not})${row.ok ? "" : `\n      reply to the correction: ${JSON.stringify(row.ack.slice(0, 80))}`}`); }
const taken = rows.filter((r, i) => convs[i].is), traps = rows.filter((r, i) => convs[i].not);
console.log(`corrections taken: ${taken.filter((r) => r.ok).length} of ${taken.length}; traps left alone: ${traps.filter((r) => r.ok).length} of ${traps.length}`);
fs.writeFileSync(path.join(HERE, "correction-unseen.json"), JSON.stringify({ stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY (developer-written after 47b7561, run once as written)", commit }, taken: { right: taken.filter((r) => r.ok).length, of: taken.length }, traps: { right: traps.filter((r) => r.ok).length, of: traps.length }, rows }, null, 1) + "\n");
process.exit(0);
