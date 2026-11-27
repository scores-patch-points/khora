// eval/prompted/verb-demo.mjs — the fix for “Who made Claude?” against a prompt that says “created”, shown outside the chat (native/chat is not edited): when the question's own verb finds
// nothing in the fold, the fold's verbs are asked which of them say the same thing (organs/verb-equivalents.js), the question is asked again with that verb, and the reply says
// what was done. The matcher in the chat would do the same inside its own trace.   node eval/prompted/verb-demo.mjs
const N = new URL("../../native/", import.meta.url).href;
const { makeThread } = await import(N + "chat/thread.mjs"), { rowsOfFor } = await import(N + "reading.js"), { priorsFor } = await import(N + "the-fold/read-core.mjs");
const { makeVerbEquivalence, referenceVerbs, standsIn, DIALS } = await import(N + "organs/verb-equivalents.js"), { makeEmbedder } = await import(N + "adapters/text/embed-personhood.js");
const R = await rowsOfFor("eng"), e = makeEmbedder({ prefix: "classification: " }), E = makeVerbEquivalence({ embed: (t) => e.embed(t), reference: referenceVerbs(priorsFor("eng").posPrior) });
const PROMPTS = { "says created": "Claude is a helpful assistant. Claude was created by Anthropic.", "says made": "Claude is a helpful assistant. Claude was made by Anthropic.", "says built": "Claude is a helpful assistant. Claude was built by Anthropic.", "says created AND built by two": "Claude is a helpful assistant. Claude was created by Anthropic. Claude was built by Acme." };
const QUESTIONS = ["Who created Claude?", "Who made Claude?", "Who built Claude?", "Who developed Claude?", "Who killed Claude?"];
let before = 0, after = 0, n = 0;
for (const [label, prompt] of Object.entries(PROMPTS)) {
  const fold = await makeThread({ hl: "http://127.0.0.1:1", know: null, janus: null, log: null }); await fold.say(prompt, { given: label });
  const S = fold.engine.S, pool = [...new Set([...S.frames].map((f) => S.rowsOf.get(f.order)).filter(Boolean).map((rs) => rs.rows?.find?.((r) => r.upos === "VERB" && r.head === 0)?.lemma ?? null).filter(Boolean))];
  const verbs = [...new Set(S.frames.map((f) => (S.rowsOf.get(f.order)?.rows ?? []).filter((r) => r.upos === "VERB").map((r) => String(r.lemma).toLowerCase())).flat())];
  console.log(`\n== the prompt ${label}: "${prompt}"   (verbs in the fold: ${verbs.join(", ")})`);
  for (const q of QUESTIONS) {
    n++; const r0 = await fold.ask(q), qv = (R.rowsOf(q) ?? []).find((r) => r.upos === "VERB" && r.head === 0)?.lemma?.toLowerCase();
    let line = `   ${q.padEnd(22)} the chat says: ${r0.handled === false ? "gap" : String(r0.text).slice(0, 24)}`; if (r0.handled !== false) before++;
    if (qv && !verbs.includes(qv)) {   // the question's own verb is not in the fold: the organ's path, shown here whether or not the chat already does it for itself
      const eq = await E.equivalents(qv, verbs, { band: DIALS.nearMissSigma.value });   // verbs one spread under the bar come back flagged near_miss: standsIn says them beside the answer
      if (eq.length) {
        const surfaceOf = (lemma) => S.frames.map((f) => (S.rowsOf.get(f.order)?.rows ?? []).find((r) => r.upos === "VERB" && String(r.lemma).toLowerCase() === lemma)?.form).find(Boolean), form = (R.rowsOf(q) ?? []).find((r) => r.upos === "VERB" && r.head === 0).form, reword = (lemma) => q.split(" ").map((w) => (w === form ? surfaceOf(lemma) : w)).join(" ");
        const g = await standsIn(eq, async (lemma) => { const r = await fold.ask(reword(lemma)); return r.handled === false ? null : [String(r.text)]; });   // the fold is asked once per near verb; the DMD guard compares what it says
        line += `  | near verbs: ${eq.map((x) => `“${x.verb}” ${x.similarity}${x.near_miss ? " (near miss)" : ""}`).join(", ")} -> DMD guard: ${g.verdict}${g.verdict === "same" ? ` (“${g.chosen.verb}” -> ${g.chosen.answer[0].slice(0, 20)}; agreed: ${g.agreeing.join(", ")}${g.alsoSays.length ? `; ALSO the fold says ${g.alsoSays.map((a) => `“${a.verb}” -> ${a.answer[0].slice(0, 16)}`).join(", ")}` : ""})` : g.verdict === "other" ? ` (${g.answers.map((a) => `“${a.verb}” says ${a.answer[0].slice(0, 16)}`).join("; ")}): none picked` : ""}`; if (g.verdict === "same") after++;
      } else line += `  | no verb of the fold says the same as “${qv}”`;
    } else if (r0.handled !== false) after++;   // the question's own verb is in the fold: nothing to stand in for
    console.log(line);
  }
}
console.log(`\nthe chat answered ${before} of ${n} (since commit ea8dc63 the chat does the near-verb stand-in itself, so this is no longer the exact-verb-only count: it was 5 of 20 before); the organ on its own, exact verb or the guard passing (all agree): ${after} of ${n}  (EXPLORATORY: five questions I wrote, four prompts)`);
e.save(); process.exit(0);
