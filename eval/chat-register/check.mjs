// The board's check: compares the current measurement with the starting point and says what moved. It runs nothing slow itself:
//   node eval/chat-register/invariance.mjs && node eval/chat-register/mechanics.mjs && node eval/chat-register/check.mjs
// Exit 1 if an invariant breaks or a reader invariance number drops (a regression to fix, never to re-record). A change in what the chat says to a kind
// of real message is reported for a human to read; it is not scored, because "better" there is a judgement the owner of native/chat makes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), J = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8"));
const iB = J("invariance.before.json").results, iN = J("invariance.json").results, mB = J("mechanics.before.json"), mN = J("mechanics.json");
let bad = 0;
// WHICH READER MADE THESE NUMBERS (2026-11-24: the prior door takes the FIRST existing home, and ../janus/priors is a 20-file stand-in that shadows the real janus; every run before today used it). A number from one
// reader against a number from another is not a regression or a gain, it is a different instrument: the comparison is printed and not counted.
const rdr = (j) => j.stamp?.reader ?? { parser: "english-parser", priorsFiles: 20, note: "not recorded: a run before 2026-11-24 used the stand-in home" };
const rb = rdr(J("invariance.before.json")), rn = rdr(J("invariance.json")), comparable = rb.parser === rn.parser && rb.priorsFiles === rn.priorsFiles;
console.log(`READERS: baseline ${rb.parser} over ${rb.priorsFiles} priors files${rb.note ? ` (${rb.note})` : ""}; now ${rn.parser} over ${rn.priorsFiles} priors files${comparable ? "" : "  -> NOT COMPARABLE: differences below are not scored (re-baseline under one reader)"}\n`);
console.log("READER INVARIANCE (higher is better; the 56 developer-written asks, EXPLORATORY)");
console.log("variant".padEnd(9), "same".padStart(12), "propn".padStart(12), "rels".padStart(12));
for (const v of ["lower", "nopunct", "typo"]) {
  const row = [v.padEnd(9)];
  for (const k of ["same", "propn", "rels"]) { const a = iB[v][k], b = iN[v][k]; const worse = comparable && b != null && a != null && b < a - 1e-9; if (worse) bad++; row.push(`${a} → ${b}${worse ? " WORSE" : ""}`.padStart(12)); }
  console.log(row.join(" "));
}
if (iN.control.rels !== 1) { bad++; console.log("CONTROL BROKEN: the same message read twice gave different relations (the instrument is not stable)"); } else console.log("control: 1 (the instrument is stable)");
console.log("\nWHAT THE CHAT DOES WITH REAL KINDS OF MESSAGE (two examples each; share = share of 3,600 sampled real messages)");
const by = (m) => Object.fromEntries(m.chatBehaviour.map((k) => [k.sig, k])), B = by(mB), N = by(mN);
const f = (k) => k.replies.map((r) => `${r.type ?? "ERR"}${r.handled === false ? "(gap)" : ""}`).join(",");
let moved = 0; for (const [sig, k] of Object.entries(N)) if (!B[sig] || f(B[sig]) !== f(k)) { moved++; console.log(`${sig.padEnd(24)} ${(k.share * 100).toFixed(1).padStart(5)}%  ${B[sig] ? f(B[sig]) : "-"}  →  ${f(k)}`); }
if (!moved) console.log("(no kind changed what the chat says)");
const dist = (m) => { const d = {}; for (const k of m.chatBehaviour) for (const r of k.replies) { const t = `${r.type ?? "ERR"}${r.handled === false ? "(gap)" : ""}`; d[t] = (d[t] ?? 0) + k.share / k.replies.length; } return d; };
const dB = dist(mB), dN = dist(mN), types = [...new Set([...Object.keys(dB), ...Object.keys(dN)])].sort();
console.log("\nreply type, share of real messages:", types.map((t) => `${t} ${((dB[t] ?? 0) * 100).toFixed(1)}→${((dN[t] ?? 0) * 100).toFixed(1)}`).join(" · "));
// did the chat go looking in the world for a message that is not about the world? (before: judged from its own reply sentence, because the first run did not count calls)
const went = (r) => (r.doorCalls != null ? r.doorCalls > 0 : /went to look|looked it up/.test(String(r.text)));   // regex-ok: reads the system's own reply string in this measurement, not language input
const share = (m, kinds) => m.chatBehaviour.filter((k) => kinds.test(k.sig)).reduce((a, k) => a + k.share * (k.replies.filter(went).length / Math.max(1, k.replies.length)), 0);
const part = /^question\/(I|you|it)/, allq = /^question/, anyk = /./;
console.log(`went looking in the world, share of real messages: participant questions (I/you/it) ${(share(mB, part) * 100).toFixed(1)}% → ${(share(mN, part) * 100).toFixed(1)}%; all questions ${(share(mB, allq) * 100).toFixed(1)}% → ${(share(mN, allq) * 100).toFixed(1)}%; ANY kind of message ${(share(mB, anyk) * 100).toFixed(1)}% → ${(share(mN, anyk) * 100).toFixed(1)}%`);
for (const k of mN.chatBehaviour) { const n = k.replies.filter(went).length; if (n && !/^question/.test(k.sig)) console.log(`  went looking on a non-question kind: ${k.sig} (${(k.share * 100).toFixed(1)}%): ${k.replies.filter(went).map((r) => JSON.stringify(r.said.slice(0, 50))).join(", ")}`); }
if (fs.existsSync(path.join(HERE, "pairing-probe.json"))) { const P = J("pairing-probe.json"), held = Object.values(P.controls).reduce((a, c) => a + c.held, 0), of = Object.values(P.controls).reduce((a, c) => a + c.of, 0), R = P.refusals ?? { passed: 0, of: 0 }, G = P.badThenGood ?? { passed: 0, of: 0 };
  console.log(`\nMECHANIC 7 (pairing probe, developer-written, ${P.stamp.commit}): positives ${P.positivePass} of ${P.positives.length} paired; controls ${held} of ${of} correctly not paired; refusals ${R.passed} of ${R.of} (not an answer: said why, nothing sent); bad then good ${G.passed} of ${G.of}`);
  if (P.positivePass < P.positives.length || held < of || R.passed < R.of || G.passed < G.of) bad++; }
if (fs.existsSync(path.join(HERE, "pronoun-probe.json"))) { const R = J("pronoun-probe.json"), o = R.outcomes, d = R.dialogues ?? { passed: 0, of: 0 };
  console.log(`\nPRONOUNS (two names then he/she, prior: ${R.priorState ?? "not recorded"}, developer-written, ${R.stamp.commit}): names it settles ${o.right} right, ${o.asked} asked which, ${o.wrong} wrong of ${R.probes}; names it cannot settle ${R.openNames ? `${R.openNames.asked} asked which, ${R.openNames.guessed} guessed of ${R.openNames.probes}` : "not recorded"}; ask-back conversations ${d.passed} of ${d.of}; "Who smiled?" answered with the bare pronoun: ${R.whoAnsweredWithBarePronoun}`);
  if (o.wrong > 0 || d.passed < d.of || (R.openNames?.guessed ?? 0) > 0) bad++; }   // a name nothing settles must be asked about, never guessed
console.log(bad ? `\n${bad} regression(s)` : "\nno invariant broken, no reader number dropped");
process.exit(bad ? 1 : 0);
