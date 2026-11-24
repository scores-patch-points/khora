// answer-probe.mjs — CAN THE CHAT'S HUNT ANSWER FROM Ýlir-One? find the documents (postings), cut the passages that carry the anchor (spans, byte addresses), let the hunt READ them and name what fills the void.
// DEV, EXPLORATORY: the questions of questions.json (already scored for document finding), what counts as right written before (answers-dev.json, STAMP-ANSWERS.txt). The fresh set is NOT used.
// The index is a STAND-IN for the ingestion session's planned one (it is not built; it waits for the owner's go): an in-memory lemma -> (document, count, first sentence) from its scratch `.lex` records,
// read only, and the same read interface the source is written against (lookup, catalog, sentences, total). It writes nothing anywhere (no pharos, no trail store).
//   node --max-old-space-size=8192 eval/ylir-find/answer-probe.mjs
import fs from "node:fs"; import path from "node:path"; import readline from "node:readline"; import { createHash } from "node:crypto";
const HERE = path.dirname(new URL(import.meta.url).pathname), K = new URL("../../native/", import.meta.url).href;
const SHARDS = process.env.YLIR_SHARDS ?? "/Users/mlacy/Downloads/workspace/ingest/Ýlir-One/shards", CLONE = process.env.YLIR_CLONE ?? "/Users/mlacy/Downloads/workspace/zenodotus-gh";
const SET = process.env.SET ?? "dev";   // SET=facts: the fact questions (answers-facts.json, stamped before any answer was read); default: the dev set
const A = JSON.parse(fs.readFileSync(path.join(HERE, SET === "facts" ? "answers-facts.json" : "answers-dev.json"), "utf8")), Q = SET === "facts" ? { gold: Object.keys(A.scored).map((q) => ({ q })), controls: A.controls } : JSON.parse(fs.readFileSync(path.join(HERE, "questions.json"), "utf8"));
const only = process.env.ONLY ? process.env.ONLY.toLowerCase() : null;   // ONLY=<part of a question> runs the questions that contain it
// ---- the index: the real door (DOOR=1: Zenodotus/scripts/ylir-one.mjs, built by the ingestion session on the owner's go) or the in-memory stand-in over the scratch `.lex` records
let lookup, catalog, sentences, total, INDEX;
if (process.env.DOOR) { const { ylirDoor } = await import(new URL("./door-adapter.mjs", import.meta.url).href), D = await ylirDoor(); ({ lookup, catalog, sentences, total } = D); INDEX = `the Ýlir-One door (${D.total} documents)`; console.log(`index: ${INDEX}`); }
else {
const t0 = Date.now(), docs = [], post = new Map();
for (const sh of fs.readdirSync(SHARDS).filter((f) => /^eng-\d+\.jsonl\.lex$/.test(f)).sort()) for await (const line of readline.createInterface({ input: fs.createReadStream(path.join(SHARDS, sh)), crlfDelay: Infinity })) { if (!line.trim()) continue; const j = JSON.parse(line), id = docs.length; docs.push({ file: j.file, hash: j.hash }); for (const [w, e] of Object.entries(j.lex)) { let a = post.get(w); if (!a) post.set(w, (a = [])); a.push(id, e.count, e.at ?? 0); } }
console.log(`stand-in index: ${docs.length} documents, ${post.size} lemma types, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
lookup = (w) => { const a = post.get(w); if (!a) return []; const out = []; for (let i = 0; i < a.length; i += 3) out.push({ doc: a[i], count: a[i + 1], at: a[i + 2] }); return out; };
catalog = (d) => (docs[d] ? { file: docs[d].file, sha256: docs[d].hash } : null);
const unpack = (b64) => { const out = []; let n = 0, mul = 1; for (const x of Buffer.from(b64, "base64")) { n += (x & 127) * mul; if (x & 128) mul *= 128; else { out.push(n); n = 0; mul = 1; } } return out; };
sentences = (d) => { try { const file = docs[d].file, rd = JSON.parse(fs.readFileSync(path.join(CLONE, "derived-priors", "readings", `${file}.reading.json`), "utf8")), buf = fs.readFileSync(path.join(CLONE, file)); if (createHash("sha256").update(buf).digest("hex") !== docs[d].hash || rd.hash !== docs[d].hash) return null; const sp = unpack(rd.spans), out = []; let pos = 0; for (let k = 0; k < sp.length / 2; k++) { const from = pos + sp[2 * k], to = from + sp[2 * k + 1]; pos = to; out.push({ k, from, to, text: buf.subarray(from, to).toString("utf8").split("\r").join("").replace(/\s+/g, " ").trim() }); } return out; } catch { return null; } };
  total = docs.length; INDEX = "stand-in over the scratch .lex records";
}
// ---- the hunt
const { ylirSource } = await import(K + "organs/hunt-source-ylir.js"), { voidOfQuestion, huntVoid } = await import(K + "organs/void-hunt.js");
const { rowsOfFor } = await import(K + "reading.js"), { splitSentences } = await import(K + "adapters/text/spans.js"), { priorsFor, abbreviationsFor } = await import(K + "the-fold/read-core.mjs");
const P = await rowsOfFor("eng"), pr = priorsFor("eng"), read = (s) => P.rowsOf(s) ?? [], split = (t) => splitSentences(t, { abbreviations: abbreviationsFor(t, { priors: pr, aliases: [], abbreviations: null }).set }).map((c) => c.text);
const src = ylirSource({ lookup, catalog, sentences, total, k: 3 });
// the second arm (EQUIV=1): the relation stand-in of huntVoid, with the near-verb organ over the frozen embedder (nomic-embed-text); the first arm is the exact verb only
let equivalents = null, embedder = null;
if (process.env.EQUIV) {
  const { makeEmbedder } = await import(K + "adapters/text/embed-personhood.js"), { makeVerbEquivalence, referenceVerbs, DIALS } = await import(K + "organs/verb-equivalents.js");
  embedder = makeEmbedder({ prefix: "classification: " }); const E = makeVerbEquivalence({ embed: (t) => embedder.embed(t), reference: referenceVerbs(priorsFor("eng").posPrior) });
  equivalents = (lemma, pool) => E.equivalents(lemma, pool, { band: DIALS.nearMissSigma.value });
}
const ARM = process.env.LABEL ?? (process.env.EQUIV ? "equiv" : "exact");
// whole words, not substrings: the first run's "right" for “THE GARRISON IN THE STOCKADE” was the accepted word "son" inside "garrison" (a flaw of the stamped rule, corrected the same way for every arm: DEVIATIONS-ANSWERS.md)
const wordsOf = (t) => { const out = []; let cur = ""; for (const ch of String(t ?? "").toLowerCase()) { if (ch !== ch.toUpperCase() || (ch >= "0" && ch <= "9") || ch === "-" || ch === "\u2019" || ch === "'") cur += ch; else { if (cur) out.push(cur); cur = ""; } } if (cur) out.push(cur); return out; };   // regex-ok: none used; a character walk
const judge = (q, ans) => { const acc = A.scored[q]; if (!acc) return A.controls && Q.controls.includes(q) ? (ans ? "wrong" : "gap") : "not scored"; return !ans ? "gap" : wordsOf(ans).some((w) => acc.includes(w)) ? "right" : "wrong"; };
const low = (s) => String(s ?? "").toLowerCase();
const results = [];
for (const q of [...Q.gold.map((g) => g.q), ...Q.controls]) {
  if (only && !q.toLowerCase().includes(only)) continue;
  const t = Date.now(), v = voidOfQuestion(read(q)); let h = null, err = null;
  try { h = v.ok ? await huntVoid(v, { sources: [src], read, split, equivalents }) : null; } catch (e) { err = String(e?.message ?? e).slice(0, 120); }
  const run = src.lastRun(), ans = h?.answer?.answer ?? h?.answer?.text ?? (typeof h?.answer === "string" ? h.answer : null), top = (h?.candidates ?? []).slice(0, 3).map((c) => ({ answer: c.answer, tier: c.tier, documents: c.documents, evidence: (c.evidence ?? []).slice(0, 1).map((e) => ({ title: e.title, section: e.section, sentence: String(e.sentence ?? e.text ?? "").slice(0, 200) })) }));
  const r = { q, void: v.ok ? { admits: v.admits, relation: v.relation?.lemma ?? null, anchors: v.anchors.map((a) => a.text) } : { ok: false }, documents: run.docs, gaps: run.gaps, answer: ans, unique: !!h?.unique, gap: h?.gap ?? null, candidates: top, verdict: judge(q, ans), readAs: h?.readAs ?? null, standIn: (h?.trail ?? []).find((x) => x.step === "relation_stand_in") ?? null, ms: Date.now() - t, error: err };
  results.push(r); console.log(`${r.verdict.padEnd(10)} ${q}\n   docs: ${run.docs.map((d) => `${path.basename(d.file)} (${d.passages} passages)`).join(" · ") || "none"}\n   answer: ${JSON.stringify(ans)}${h?.readAs ? ` (read “${v.relation?.lemma}” as “${h.readAs}”)` : ""}${h?.gap ? ` | gap: ${JSON.stringify(h.gap).slice(0, 140)}` : ""}${err ? ` | error: ${err}` : ""} | ${r.ms} ms`);
}
const tally = {}; for (const r of results) tally[r.verdict] = (tally[r.verdict] ?? 0) + 1;
const scored = results.filter((r) => ["right", "wrong", "gap"].includes(r.verdict) && A.scored[r.q]);
const out = { schema: "YlirAnswerProbe@1", set: SET, arm: ARM, index: INDEX, split: "DEV / EXPLORATORY (the questions were scored for document finding before; what counts as right was fixed before: answers-dev.json)", at: new Date().toISOString(), tally, scoredQuestions: scored.length, right: scored.filter((r) => r.verdict === "right").length, wrong: scored.filter((r) => r.verdict === "wrong").length, gap: scored.filter((r) => r.verdict === "gap").length, controls: results.filter((r) => Q.controls.includes(r.q)).map((r) => ({ q: r.q, verdict: r.verdict, answer: r.answer })), results };
fs.writeFileSync(path.join(HERE, SET === "facts" ? `results-answers-facts-${ARM}.json` : ARM === "exact" ? "results-answers-dev.json" : `results-answers-dev-${ARM}.json`), JSON.stringify(out, null, 1)); embedder?.save?.();
console.log("\nTALLY", JSON.stringify(tally), `| scored: right ${out.right}, wrong ${out.wrong}, gap ${out.gap} of ${out.scoredQuestions}`); process.exit(0);
