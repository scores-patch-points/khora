// EXPLORATORY (developer-written). THE OWNER, 2026-11-24: "the tool is called The Fold." So the chat has a name to compare an address against. A person with a notebook who is addressed by the right name answers; one
// addressed by another name ("Hi Andreu, ...") is overhearing a message for someone else and does not go and look it up. What does the chat do today (it has no name: the leading name is peeled as an address and
// the rest is judged alone)? Each row: the message, whether it should send words out (researched) or not, and what it did (outside calls counted, network stubbed, each query kept).
//   node eval/chat-register/address-probe.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execSync } from "node:child_process";
import { readerStamp } from "./reader-stamp.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const { makeThread } = await import("file://" + ROOT + "/native/chat/thread.mjs");
const rows = [
  ["who wrote Hamlet?", "researched", "no address: the baseline"],
  ["The Fold, who wrote Hamlet?", "researched", "addressed by its own name"],
  ["Fold, who wrote Hamlet?", "researched", "addressed by its own name, short"],
  ["Hey Fold, who wrote Hamlet?", "researched", "a greeting then its own name"],
  ["Hi Andreu, have v 2 get down at piliyandala town?", "not researched", "another person's name: a message for someone else (a real SMS from the sample)"],
  ["Hi Andreu, who wrote Hamlet?", null, "another name, then a question about the world: not scored (the owner's design)"],
  ["Priya, are you coming on sunday?", "not researched", "another name, a question about her"],
  ["Claude, who wrote Hamlet?", null, "a name that is also a name for an AI: not scored (the chat session says it must still be researched)"],
];
const out = []; for (const [text, expect, why] of rows) {
  let calls = 0; const urls = []; const th = await makeThread({ hl: "http://127.0.0.1:1", know: { person: async () => null, lookup: async () => ({ primary: null }) }, janus: null, log: null, getJson: async (u) => { calls++; urls.push(String(u).slice(0, 150)); return {}; } });
  const r = await Promise.race([th.turn(text), new Promise((res) => setTimeout(() => res({ text: "TIMEOUT" }), 20000))]); const got = calls ? "researched" : "not researched", ok = expect ? got === expect : null;
  out.push({ text, why, expect, got, ok, calls, urls: urls.slice(0, 2), reply: String(r?.text ?? "").slice(0, 90) });
  console.log(`${ok === null ? "obs " : ok ? "PASS" : "FAIL"} ${JSON.stringify(text)} (${why}): ${got}${calls ? ` (${calls} calls)` : ""} -> ${JSON.stringify(String(r?.text ?? "").slice(0, 70))}`);
}
const scored = out.filter((r) => r.expect), passed = scored.filter((r) => r.ok).length;
console.log(`address probe: ${passed} of ${scored.length} scored cases`);
fs.writeFileSync(path.join(HERE, "address-probe.json"), JSON.stringify({ stamp: { reader: await readerStamp(), when: new Date().toISOString(), split: "EXPLORATORY (developer-written)", commit: (() => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "unknown"; } })() }, passed, of: scored.length, rows: out }, null, 1) + "\n");
process.exit(0);
