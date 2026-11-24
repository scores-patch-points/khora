// EXPLORATORY (developer-written conversations). THE OWNER'S WORD, 2026-11-24: "if the person says 'that's not right' they can correct the record and the system will be right next time."
// A wrong binding is a revisable claim; the user's correction is evidence that outranks the system's pick, and the answer after it follows the correction. What the chat does today:
// each row is a conversation; the last message asks a question whose right answer is the corrected one. "Noted." after a correction that changes nothing is scored too: the chat said it took
// something in and answered as before.
//   node eval/chat-register/correction-probe.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
import os from "node:os";
process.env.CHAT_PHAROS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "correction-probe-pharos-"));   // a log of its own: the probe writes nowhere else
const { makeThread } = await import("file://" + ROOT + "/native/chat/thread.mjs"), { openLog } = await import("file://" + ROOT + "/native/chat/record.mjs");
const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })();
// [what is corrected, the messages, the correction's index, what the last reply must start with]
const convs = [
  ["an asked-back pick, corrected with 'that's not right'", ["Casey met Jordan. She smiled.", "Who is she?", "Casey", "Who smiled?", "That's not right, she is Jordan.", "Who smiled?"], 4, "Jordan."],
  ["an asked-back pick, corrected with 'no, I meant'", ["Casey met Jordan. She smiled.", "Who is she?", "Casey", "No, I meant Jordan.", "Who smiled?"], 3, "Jordan."],
  ["a they with no one bound, told who it is", ["Casey smiled. They waved.", "Who waved?", "No, they means Casey.", "Who waved?"], 2, "Casey."],
  ["a name's gender stated, then asked", ["Pierre met Natasha. She smiled.", "No, Natasha is a man. He smiled.", "Who is he?"], 1, "That would be Natasha."],
];
const rows = [];
for (const [what, steps, at, want] of convs) {
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-24T06:30:00") }), trail = []; let last = "", ack = "";
  for (let i = 0; i < steps.length; i++) { const r = await th.turn(steps[i]), text = String(r?.text ?? ""); trail.push(`${steps[i]} => ${text.slice(0, 60)}`); if (i === at) ack = text; last = text; }
  const ok = last.startsWith(want); rows.push({ what, ok, ack: ack.slice(0, 60), last: last.slice(0, 60), want, trail });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${ok ? "" : `\n      the correction was answered ${JSON.stringify(ack.slice(0, 40))}; the question after it: ${JSON.stringify(last.slice(0, 60))}, wanted ${JSON.stringify(want)}`}`);
}
// ACROSS CONVERSATIONS (the owner, 2026-11-24: yes, a correction carries over): thread 1 is corrected, thread 2 is a new thread on the same pharos log; its first answer must already follow what the user said.
const across = [
  ["a corrected pick is there in the next thread (no question asked again)", ["Casey met Jordan. She smiled.", "Who is she?", "Casey", "No, I meant Jordan."], ["Jordan met Casey. She smiled.", "Who smiled?"], "Jordan."],
  ["a told they is there in the next thread", ["Casey smiled. They waved.", "No, they means Casey."], ["Casey wrote a letter. Casey waved.", "Casey"], "they"],
];
for (const [what, first, second, want] of across) {
  const log = openLog(); const t1 = await makeThread({ hl: "http://127.0.0.1:1", know: null, log, now: () => new Date("2026-11-24T06:30:00") }); for (const m of first) await t1.turn(m);
  const t2 = await makeThread({ hl: "http://127.0.0.1:1", know: null, log, now: () => new Date("2026-11-24T06:40:00") }); let last = ""; for (const m of second) { const r = await t2.turn(m); last = String(r?.text ?? ""); }
  let got = last; if (want === "they") { const b = t2.engine.S.read.cast.referents.find((x) => x.forms[0][0] === "Casey"), pr = b ? (await t2.engine.wordProfile("", { ref: b.ref })).pronoun : null; got = pr ? `${pr.nom} (${pr.source})` : "name"; }
  const ok = want === "they" ? got.startsWith("they (told") : last.startsWith(want); rows.push({ what, ok, ack: "", last: got.slice(0, 60), want, trail: [...first, "— new thread —", ...second] });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${ok ? "" : `\n      the next thread said ${JSON.stringify(got.slice(0, 70))}, wanted ${JSON.stringify(want)}`}`);
}
const passed = rows.filter((r) => r.ok).length, noted = rows.filter((r) => !r.ok && /^Noted\.?$/.test(r.ack.trim())).length;   // regex-ok: the system's own acknowledgement string in a probe
console.log(`corrections that changed the answer, in the thread and in the next one: ${passed} of ${rows.length}; "Noted." said and nothing changed: ${noted}`);
fs.writeFileSync(path.join(HERE, "correction-probe.json"), JSON.stringify({ stamp: { when: new Date().toISOString(), split: "EXPLORATORY (developer-written conversations)", commit }, passed, of: rows.length, notedAndNothingChanged: noted, rows }, null, 1) + "\n");
process.exit(0);
