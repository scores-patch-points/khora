// ylir-find-probe.mjs — CAN A QUESTION FIND ITS DOCUMENT IN Ýlir-One, AND ITS SENTENCE, BY ADDRESS?   (the owner, 2026-11-24: "the hyperlexicon shouldn't carry the facts but the newly made Ýlir-One should")
// A THROWAWAY probe: reads the ingestion session's scratch `.lex` records (per document: per lemma its count and `at`, the index of the sentence it first occurs in) and the readings' sentence spans
// (a reading stores no text, only where each sentence sits in the file), builds an inverted lemma -> (document, count, at) in memory, and for each question in questions.json
// (stamped before this ran) scores the documents, then cuts the sentence at `at` of the question's rarest lemma out of the top document's file. It writes nothing into Ýlir-One.
// The real index is the ingestion session's (designed to live in the same pharos log); this says what that index must hold. EXPLORATORY: 20 questions I wrote.
//   node --max-old-space-size=8192 eval/ylir-find/ylir-find-probe.mjs
import fs from "node:fs"; import path from "node:path"; import readline from "node:readline";
const HERE = path.dirname(new URL(import.meta.url).pathname), K = new URL("../../native/", import.meta.url).href;
const SHARDS = process.env.YLIR_SHARDS ?? "/Users/mlacy/Downloads/workspace/ingest/Ýlir-One/shards", CLONE = process.env.YLIR_CLONE ?? "/Users/mlacy/Downloads/workspace/zenodotus-gh";
const Q = JSON.parse(fs.readFileSync(path.join(HERE, "questions.json"), "utf8"));
// ---- the index
const t0 = Date.now(), docs = [], post = new Map(); let nPost = 0;
for (const sh of fs.readdirSync(SHARDS).filter((f) => /^eng-\d+\.jsonl\.lex$/.test(f)).sort()) {
  for await (const line of readline.createInterface({ input: fs.createReadStream(path.join(SHARDS, sh)), crlfDelay: Infinity })) {
    if (!line.trim()) continue; const j = JSON.parse(line), id = docs.length; docs.push({ file: j.file, hash: j.hash, bytes: j.bytes });
    for (const [w, e] of Object.entries(j.lex)) { let a = post.get(w); if (!a) post.set(w, (a = [])); a.push(id, e.count, e.at ?? 0); nPost++; }
  }
}
const N = docs.length; console.log(`index: ${N} documents, ${post.size} lemma types, ${nPost} postings, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const df = (w) => (post.get(w)?.length ?? 0) / 3;
// ---- the question's content lemmas, by the reader
const { rowsOfFor } = await import(K + "reading.js"), R = await rowsOfFor("eng");
const lemmasOf = (q) => [...new Set((R.rowsOf(q) ?? []).filter((r) => ["NOUN", "PROPN", "VERB", "ADJ"].includes(r.upos)).map((r) => String(r.lemma ?? r.form).toLowerCase()))];
const score = (lemmas) => { const s = new Float64Array(N); for (const w of lemmas) { const a = post.get(w); if (!a) continue; const idf = Math.log(N / (a.length / 3)); for (let i = 0; i < a.length; i += 3) s[a[i]] += Math.log(1 + a[i + 1]) * idf; } return s; };
const top = (s, k) => { const idx = []; for (let i = 0; i < N; i++) if (s[i] > 0) idx.push(i); return idx.sort((a, b) => s[b] - s[a]).slice(0, k); };
// ---- the sentence at an address: the reading's spans (base64 of LEB128 varints: start of sentence 0, length, then for each next sentence the gap from the previous end, length)
const unpack = (b64) => { const out = []; let n = 0, mul = 1; for (const x of Buffer.from(b64, "base64")) { n += (x & 127) * mul; if (x & 128) mul *= 128; else { out.push(n); n = 0; mul = 1; } } return out; };
const sentenceAt = (file, idx) => { try { const rd = JSON.parse(fs.readFileSync(path.join(CLONE, "derived-priors", "readings", `${file}.reading.json`), "utf8")), sp = unpack(rd.spans); let pos = 0, s = 0, e = 0; for (let k = 0; k <= idx; k++) { s = pos + sp[2 * k]; e = s + sp[2 * k + 1]; pos = e; } return fs.readFileSync(path.join(CLONE, file)).subarray(s, e).toString("utf8").replace(/\s+/g, " ").trim(); } catch (err) { return `(could not cut: ${String(err.message).slice(0, 60)})`; } };
// ---- the questions
const out = { schema: "YlirFindProbe@1", split: "EXPLORATORY", at: new Date().toISOString(), index: { documents: N, lemmaTypes: post.size, postings: nPost, buildSeconds: +((Date.now() - t0) / 1000).toFixed(0) }, questions: [] }, ks = [1, 3, 10], hit = { 1: 0, 3: 0, 10: 0 };
for (const g of Q.gold) {
  const lemmas = lemmasOf(g.q), s = score(lemmas), ranked = top(s, 10), goldIdx = docs.map((d, i) => (g.files.includes(d.file) ? i : -1)).filter((i) => i >= 0);
  const rank = goldIdx.length ? Math.min(...goldIdx.map((i) => { let r = 1; for (let j = 0; j < N; j++) if (s[j] > s[i]) r++; return r; })) : null;
  for (const k of ks) if (rank && rank <= k) hit[k]++;
  const present = lemmas.filter((w) => post.has(w)).sort((a, b) => df(a) - df(b)), rare = present[0], d1 = ranked[0] !== undefined ? docs[ranked[0]] : null;
  const atOf = (w, id) => { const a = post.get(w); if (!a) return null; for (let i = 0; i < a.length; i += 3) if (a[i] === id) return a[i + 2]; return null; }, at1 = d1 && rare ? atOf(rare, ranked[0]) : null;
  out.questions.push({ q: g.q, gold: g.files.map((f) => path.basename(f)), goldInIndex: goldIdx.length, rank, lemmas, rarest: rare ? { lemma: rare, docFreq: df(rare) } : null, top3: ranked.slice(0, 3).map((i) => ({ file: path.basename(docs[i].file), score: +s[i].toFixed(2) })), sentenceFromTop1: d1 && rare && at1 != null ? { file: d1.file, lemma: rare, at: at1, text: sentenceAt(d1.file, at1).slice(0, 300) } : null });
}
out.found = { atK: Object.fromEntries(ks.map((k) => [k, `${hit[k]} of ${Q.gold.length}`])), chanceAtK: Object.fromEntries(ks.map((k) => [k, +(k / N).toFixed(5)])) };
out.controls = Q.controls.map((q) => { const lemmas = lemmasOf(q), s = score(lemmas), r = top(s, 3); return { q, lemmas, top3: r.map((i) => ({ file: path.basename(docs[i].file), score: +s[i].toFixed(2) })) }; });
const f = path.join(HERE, "results.json"); fs.writeFileSync(f, JSON.stringify(out, null, 1));
for (const x of out.questions) console.log(`${String(x.rank ?? "-").padStart(5)}  ${x.q}\n       lemmas ${x.lemmas.join(" ")} | rarest ${x.rarest?.lemma} (in ${x.rarest?.docFreq} docs) | top ${x.top3.map((t) => `${t.file} ${t.score}`).join(" · ")}\n       ${x.sentenceFromTop1 ? `“${x.sentenceFromTop1.text.slice(0, 160)}”` : ""}`);
console.log("\nFOUND", JSON.stringify(out.found)); for (const c of out.controls) console.log("control:", c.q, "->", c.top3.map((t) => `${t.file} ${t.score}`).join(" · "));
console.log("written", f); process.exit(0);
