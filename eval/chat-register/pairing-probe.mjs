// MECHANIC 7 probe (EXPLORATORY; the messages are the developer's, so this tests the mechanism, not real asks). When the chat asks back ("Who or what do you mean?"),
// the next message, if it is a fragment, should be read as the ANSWER and the original question asked again with it in place; the fragment must not be stored as a fact.
// Positives: a dangling-pronoun question, then a fragment: pass = reply.paired is set, its rebuilt question contains the answer, the gap is not fragment_unclear, and the
// thread's stored sentences did not change. Controls (each must NOT pair): a full statement between the two; the fragment alone; a second question between;
// a pronoun that HAS an antecedent (nothing was asked back). One observation not scored (not built yet): a "yes" answering a question the chat asked.
//   node eval/chat-register/pairing-probe.mjs   -> pairing-probe.json
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", ".."), K = "file://" + ROOT + "/native/";
const { makeThread } = await import(K + "chat/thread.mjs");
let calls = 0;   // outside calls made (the network is a counting stub)
const mk = () => makeThread({ hl: "http://127.0.0.1:1", know: { person: async () => null, lookup: async () => ({ primary: null }) }, janus: null, log: null, getJson: async () => { calls++; return {}; } });
const run = async (seq) => { const th = await mk(), out = []; for (const m of seq) { const before = th.state().sentences, r = await th.turn(m); out.push({ said: m, paired: r?.paired ?? null, gap: r?.gap ?? null, type: r?.type ?? null, stored: th.state().sentences - before }); } return out; };
const positives = [["is it worth doing?", "the course"], ["did he arrive?", "Pierre"], ["what did she say?", "Natasha"], ["is it open?", "the shop"], ["was it good?", "the film"], ["where is she?", "Mina"], ["does she live here?", "Sonya"], ["is it far?", "the station"]];
const controls = {
  "a full statement between the question and the fragment": positives.slice(0, 3).map(([q, a]) => [q, "Pierre loves Natasha.", a]),
  "the fragment alone, nothing asked back": positives.slice(0, 3).map(([, a]) => [a]),
  "a second question between": positives.slice(0, 3).map(([q, a]) => [q, "who is Pierre?", a]),
  "a pronoun that has an antecedent (nothing is asked back)": [["Pierre loves Natasha.", "does he love her?", "the course"], ["Mina gave Jonathan a book.", "did she give it?", "the shop"]],
};
const res = { stamp: { when: new Date().toISOString(), split: "EXPLORATORY (developer-written probes)", commit: process.env.CHAT_COMMIT ?? "unspecified" }, positives: [], controls: {} };
let pass = 0; for (const [q, a] of positives) { const r = await run([q, a]), last = r.at(-1), ok = !!last.paired && String(last.paired.rebuilt ?? "").toLowerCase().includes(a.toLowerCase().replace(/^the /, "")) && last.gap !== "fragment_unclear" && last.stored === 0; if (ok) pass++; res.positives.push({ q, a, ok, paired: last.paired, gap: last.gap, stored: last.stored }); console.log(`${ok ? "PASS" : "FAIL"} ${JSON.stringify(q)} -> ${JSON.stringify(a)}: ${last.paired ? JSON.stringify(last.paired.rebuilt) : `not paired (${last.gap ?? last.type})`}${last.stored ? `, stored ${last.stored}` : ""}`); }
console.log(`positives: ${pass} of ${positives.length} paired`); res.positivePass = pass;
for (const [name, seqs] of Object.entries(controls)) { let held = 0; const rows = []; for (const seq of seqs) { const r = await run(seq), last = r.at(-1), ok = !last.paired; if (ok) held++; rows.push({ seq, ok, paired: last.paired, gap: last.gap }); } res.controls[name] = { held, of: seqs.length, rows }; console.log(`control (${name}): ${held} of ${seqs.length} correctly not paired${rows.filter((x) => !x.ok).map((x) => `  [paired: ${JSON.stringify(x.seq)}]`).join("")}`); }
const yes = await run(["is it worth doing?", "yes"]).then((r) => r.at(-1)); res.notScored = { "a yes answering a question the chat asked": { paired: yes.paired, gap: yes.gap, type: yes.type } }; console.log(`not scored (not built): "yes" after an ask-back -> ${yes.paired ? "paired" : `not paired (${yes.gap ?? yes.type})`}`);
// REFUSALS (scored): the next fragment is not an answer to the pronoun (the wrong kind of thing, or no thing at all). The chat should say why, keep the question open, send nothing.
// pass = not paired, gap answer_does_not_fit, no outside call.
const refuse = [["did he arrive?", "the course"], ["is it open?", "Natasha"], ["where is she?", "the station"], ["is it far?", "Hahaha"], ["is it far?", "!pt"]], refRows = []; let refOk = 0;
for (const [q, a] of refuse) { calls = 0; const last = (await run([q, a])).at(-1), ok = !last.paired && last.gap === "answer_does_not_fit" && calls === 0; if (ok) refOk++; refRows.push({ q, a, ok, paired: last.paired?.rebuilt ?? null, gap: last.gap, type: last.type, outsideCalls: calls }); console.log(`${ok ? "PASS" : "FAIL"} refuses ${JSON.stringify(q)} -> ${JSON.stringify(a)}: ${last.paired ? `PAIRED as ${JSON.stringify(last.paired.rebuilt)}` : `not paired (${last.gap ?? last.type})`}${calls ? ` [${calls} outside call(s)]` : ""}`); }
res.refusals = { passed: refOk, of: refuse.length, rows: refRows }; console.log(`refusals: ${refOk} of ${refuse.length} refused cleanly`);
// BAD THEN GOOD (scored): a refused answer leaves the question open, so a good answer can still come.
const bg = [["is it open?", "Hahaha", "the shop"], ["did he arrive?", "the course", "Pierre"]], bgRows = []; let bgOk = 0;
for (const seq of bg) { const r = await run(seq), last = r.at(-1), ok = !!last.paired && last.stored === 0; if (ok) bgOk++; bgRows.push({ seq, ok, paired: last.paired?.rebuilt ?? null, gap: last.gap }); console.log(`${ok ? "PASS" : "FAIL"} bad then good ${JSON.stringify(seq)}: ${last.paired ? JSON.stringify(last.paired.rebuilt) : `not paired (${last.gap ?? last.type})`}`); }
res.badThenGood = { passed: bgOk, of: bg.length, rows: bgRows }; console.log(`bad then good: ${bgOk} of ${bg.length} paired on the good answer`);
// OBSERVED, not scored: the pronoun's person against a name. "where is he?" / "Mina": whether the chat can see that Mina is a woman depends on the given-name table it loads.
const mm = (await run(["where is he?", "Mina"])).at(-1); res.notScored["he / Mina (a woman's name)"] = { paired: mm.paired?.rebuilt ?? null, gap: mm.gap }; console.log(`not scored: "where is he?" / "Mina" -> ${mm.paired ? `PAIRED as ${JSON.stringify(mm.paired.rebuilt)}` : `not paired (${mm.gap ?? mm.type})`}`);
fs.writeFileSync(path.join(HERE, "pairing-probe.json"), JSON.stringify(res, null, 1)); process.exit(0);
