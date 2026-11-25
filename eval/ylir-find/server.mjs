// eval/ylir-find/server.mjs — ASK THE CORPUS, AND SEE HOW IT ANSWERED.   node eval/ylir-find/server.mjs   ->   http://127.0.0.1:4873
// The real Ýlir-One door (read only), the chat's hunt reading the passages it is handed, and for every answer the sentence, its document and its byte address, cut from the source file. No model runs.
// It writes nothing: not to pharos, not to a trail store. One question at a time (the source keeps its last run).
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname), K = new URL("../../native/", import.meta.url).href, PORT = Number(process.env.PORT || 4873);
const CLONE = process.env.YLIR_CLONE ?? "/Users/mlacy/Downloads/workspace/zenodotus-gh";
const { ylirDoor } = await import(new URL("./door-adapter.mjs", import.meta.url).href), D = await ylirDoor();
const { ylirSource } = await import(K + "organs/hunt-source-ylir.js"), { voidOfQuestion, huntVoid } = await import(K + "organs/void-hunt.js");
const { rowsOfFor } = await import(K + "reading.js"), { splitSentences } = await import(K + "adapters/text/spans.js"), { priorsFor, abbreviationsFor } = await import(K + "the-fold/read-core.mjs");
const P = await rowsOfFor("eng"), pr = priorsFor("eng"), read = (s) => P.rowsOf(s) ?? [], split = (t) => splitSentences(t, { abbreviations: abbreviationsFor(t, { priors: pr, aliases: [], abbreviations: null }).set }).map((c) => c.text);
// the near-verb stand-in needs the frozen embedder (ollama); without it the hunt says so in its trace and runs on the exact verb
let equivalents = null, equivalentsNote = null;
try { const { makeEmbedder } = await import(K + "adapters/text/embed-personhood.js"), { makeVerbEquivalence, referenceVerbs, DIALS } = await import(K + "organs/verb-equivalents.js"), e = makeEmbedder({ prefix: "classification: " }), E = makeVerbEquivalence({ embed: (t) => e.embed(t), reference: referenceVerbs(priorsFor("eng").posPrior) }); equivalents = (lemma, pool) => E.equivalents(lemma, pool, { band: DIALS.nearMissSigma.value }); } catch (err) { equivalentsNote = String(err?.message ?? err).slice(0, 100); }
// the conversation: the referents the questions and answers so far have made, and the pronouns of a follow-up bound to them on the reader's rows (organs/convo-referents.js)
const { makeConversation } = await import(K + "organs/convo-referents.js");
let genderOf = null; try { const g = await import(K + "adapters/text/gender-of-words.js"), prior = g.makeDefaultNameGenderPrior(); genderOf = (words) => { const r = prior.explain?.(words)?.gender; return r === "m" ? "male" : r === "f" ? "female" : null; }; } catch { /* no gender prior: he and she bind to any person */ }
const conv = makeConversation({ genderOf });
const src = ylirSource({ lookup: D.lookup, catalog: D.catalog, sentences: D.sentences, total: D.total, k: 3 });
let busy = Promise.resolve();
const json = (res, code, b) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(b)); };
const body = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => { b += c; if (b.length > 20000) req.destroy(); }); req.on("end", () => ok(b)); });
// where an answer sits in its file: the section label of a passage is "bytes <from>-<to>"; the context is cut from the source file itself
const addressOf = (e) => { const sec = String(e.section ?? ""), file = String(e.url ?? "").startsWith("ylir-one:") ? String(e.url).slice(9) : null; if (!file || !sec.startsWith("bytes ")) return null; const [a, b] = sec.slice(6).split("-").map(Number); if (!Number.isFinite(a) || !Number.isFinite(b)) return null; let ctx = null; try { const fd = fs.openSync(path.join(CLONE, file), "r"), from = Math.max(0, a - 350), buf = Buffer.alloc(b - from + 350); const n = fs.readSync(fd, buf, 0, buf.length, from); fs.closeSync(fd); const t = buf.subarray(0, n); ctx = { before: t.subarray(0, a - from).toString("utf8"), sentence: t.subarray(a - from, b - from).toString("utf8"), after: t.subarray(b - from).toString("utf8") }; } catch { /* the file is not in the checkout */ } return { file, from: a, to: b, context: ctx }; };
const ask = async (question) => {
  const t0 = Date.now(), asked = read(question), bound = conv.bind(asked), rows = bound.rows, v = voidOfQuestion(rows), conversation = { bindings: bound.bindings, unresolved: bound.unresolved };
  if (!v.ok) { conv.note({ void: v, answer: null }); return { question, conversation, void: { ok: false, gap: v.gap ?? null }, documents: [], answer: null, gap: bound.unresolved.length ? { kind: "pronoun_unresolved", detail: bound.unresolved.map((u) => `“${u.pronoun}”: ${u.why}`).join("; ") } : (v.gap ?? { kind: "no_void", detail: "the question declares nothing to look for" }), ms: Date.now() - t0 }; }
  const h = await huntVoid(v, { sources: [src], read, split, equivalents, maxSentences: 3000 }), run = src.lastRun();
  const ev = (c) => (c.evidence ?? []).slice(0, 2).map((e) => ({ title: e.title, sentence: e.sentence, address: addressOf(e) }));
  const stand = (h.trail ?? []).find((x) => x.step === "relation_stand_in") ?? null;
  const said = h.answer && h.answer.tier !== "identity" && ["person", "place"].includes(v.admits) ? { text: h.answer.answer, admits: v.admits } : null; conv.note({ void: v, answer: said });
  return { question, conversation: { ...conversation, tracking: conv.referents() }, void: { ok: true, admits: v.admits, relation: v.relation, anchors: v.anchors.map((a) => a.text), wh: v.wh },
    documents: run.docs.map((d) => ({ file: d.file, score: d.score, sentences: d.sentences, passages: d.passages })), sourceGaps: run.gaps,
    sentencesRead: (h.trail ?? []).filter((x) => x.sentencesRead != null).reduce((n, x) => n + x.sentencesRead, 0),
    answer: h.answer ? { text: h.answer.answerText ?? h.answer.answer, tier: h.answer.tier, why: h.answer.why, sentences: h.answer.sentences, evidence: ev(h.answer) } : null,
    readAs: h.readAs ?? null, standIn: stand ? { asked: stand.asked, verdict: stand.verdict ?? null, near: stand.near ?? [], gap: stand.gap ?? null } : null,
    candidates: (h.candidates ?? []).slice(0, 5).map((c) => ({ answer: c.answer, tier: c.tier, support: c.support, sentences: c.sentences, documents: c.documents, why: c.why, evidence: ev(c).slice(0, 1) })),
    gap: h.gap ?? null, equivalents: equivalents ? "on" : `off (${equivalentsNote})`, ms: Date.now() - t0 };
};
const facts = () => { const rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8")); } catch { return null; } }, A = rd("answers-facts.json"), X = rd(process.env.FACTS_RESULTS ?? "results-answers-facts-equiv-realpriors-v11.json"), B = null; if (!A || !X) return null; return { stamp: fs.existsSync(path.join(HERE, "STAMP-FACTS.txt")) ? fs.readFileSync(path.join(HERE, "STAMP-FACTS.txt"), "utf8").split("\n")[0] : null, accept: A.scored, rows: X.results.filter((r) => A.scored[r.q]).map((r) => ({ q: r.q, verdict: r.verdict, answer: r.answer, equiv: B?.results?.find((x) => x.q === r.q)?.verdict ?? null, gap: r.gap?.kind ?? null })), controls: X.results.filter((r) => (A.controls ?? []).includes(r.q)).map((r) => ({ q: r.q, verdict: r.verdict })) }; };
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (req.method === "GET" && url.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(path.join(HERE, "demo.html"), "utf8")); }
    if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, { documents: D.total, equivalents: equivalents ? "on" : `off (${equivalentsNote})`, facts: facts() });
    if (req.method === "POST" && url.pathname === "/api/reset") { conv.reset(); return json(res, 200, { ok: true }); }
    if (req.method === "POST" && url.pathname === "/api/ask") { const { question } = JSON.parse((await body(req)) || "{}"), q = String(question ?? "").trim(); if (!q) return json(res, 400, { error: "no question" }); const run = busy.then(() => ask(q)); busy = run.catch(() => {}); return json(res, 200, await run); }
    json(res, 404, { error: "not found" });
  } catch (e) { json(res, 500, { error: String(e?.stack ?? e).slice(0, 300) }); }
}).listen(PORT, "127.0.0.1", () => console.log(`Ýlir-One answers on http://127.0.0.1:${PORT} (${D.total} documents; near-verb stand-in ${equivalents ? "on" : "off"})`));
