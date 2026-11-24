// eval/prompted/verb-demo.mjs — the fix for “Who made Claude?” against a prompt that says “created”, shown outside the chat (native/chat is not edited): when the question's own verb finds
// nothing in the fold, the fold's verbs are asked which of them say the same thing (organs/verb-equivalents.js), the question is asked again with that verb, and the reply says
// what was done. The matcher in the chat would do the same inside its own trace.   node eval/prompted/verb-demo.mjs
const N = new URL("../../native/", import.meta.url).href;
const { makeThread } = await import(N + "chat/thread.mjs"), { rowsOfFor } = await import(N + "reading.js"), { priorsFor } = await import(N + "the-fold/read-core.mjs");
const { makeVerbEquivalence, referenceVerbs } = await import(N + "organs/verb-equivalents.js"), { makeEmbedder } = await import(N + "adapters/text/embed-personhood.js");
const R = await rowsOfFor("eng"), e = makeEmbedder({ prefix: "classification: " }), E = makeVerbEquivalence({ embed: (t) => e.embed(t), reference: referenceVerbs(priorsFor("eng").posPrior) });
const PROMPTS = { "says created": "Claude is a helpful assistant. Claude was created by Anthropic.", "says made": "Claude is a helpful assistant. Claude was made by Anthropic.", "says built": "Claude is a helpful assistant. Claude was built by Anthropic." };
const QUESTIONS = ["Who created Claude?", "Who made Claude?", "Who built Claude?", "Who developed Claude?", "Who killed Claude?"];
let before = 0, after = 0, n = 0;
for (const [label, prompt] of Object.entries(PROMPTS)) {
  const fold = await makeThread({ hl: "http://127.0.0.1:1", know: null, janus: null, log: null }); await fold.say(prompt, { given: label });
  const S = fold.engine.S, pool = [...new Set([...S.frames].map((f) => S.rowsOf.get(f.order)).filter(Boolean).map((rs) => rs.rows?.find?.((r) => r.upos === "VERB" && r.head === 0)?.lemma ?? null).filter(Boolean))];
  const verbs = [...new Set(S.frames.map((f) => (S.rowsOf.get(f.order)?.rows ?? []).filter((r) => r.upos === "VERB").map((r) => String(r.lemma).toLowerCase())).flat())];
  console.log(`\n== the prompt ${label}: "${prompt}"   (verbs in the fold: ${verbs.join(", ")})`);
  for (const q of QUESTIONS) {
    n++; const r0 = await fold.ask(q), qv = (R.rowsOf(q) ?? []).find((r) => r.upos === "VERB" && r.head === 0)?.lemma?.toLowerCase();
    let line = `   ${q.padEnd(22)} exact: ${r0.handled === false ? "gap" : String(r0.text).slice(0, 24)}`; if (r0.handled !== false) before++;
    if (r0.handled === false && qv) {
      const eq = await E.equivalents(qv, verbs);
      if (eq.length) { const surface = (S.frames.map((f) => (S.rowsOf.get(f.order)?.rows ?? []).find((r) => r.upos === "VERB" && String(r.lemma).toLowerCase() === eq[0].verb)?.form).find(Boolean)); const form = (R.rowsOf(q) ?? []).find((r) => r.upos === "VERB" && r.head === 0).form, q2 = q.split(" ").map((w) => (w === form ? surface : w)).join(" "); const r1 = await fold.ask(q2); line += `  | “${qv}” ~ “${eq[0].verb}” (${eq[0].similarity}) -> ${q2.padEnd(20)} ${r1.handled === false ? "gap" : "-> " + String(r1.text).slice(0, 24)}`; if (r1.handled !== false) after++; }
      else line += `  | no verb of the fold says the same as “${qv}”`;
    } else if (r0.handled !== false) after++;
    console.log(line);
  }
}
console.log(`\nanswered with the question's own verb: ${before} of ${n}; with the fold's equivalent verb tried when it found nothing: ${after} of ${n}  (EXPLORATORY: five questions I wrote, three prompts)`);
e.save(); process.exit(0);
