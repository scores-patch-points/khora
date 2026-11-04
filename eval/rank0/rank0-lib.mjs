// rank0-lib.mjs — RANK-0: does a graded relatedness score ("smell") built on the real reader's own structure improve which sentences
// are offered as candidate answers, compared with a lexical ranking? Measurement and a library only. Nothing here is wired into any app.
//
// UNITS AND CONTEXT COME FROM THE READER (native/reading.js::readDocument, castIdentity:true), never from a splitter of ours:
//   units    entry.sentences (text, offset, order)
//   context  (a) the surface of the being the attention binder binds the sentence's opening neuter pronoun / definite description to
//                (attendedBindingsFor(entry,{enabled:true,...DECLARED}); a typed gap adds nothing and is counted);
//            (b) the primary surfaces of the cast beings whose mention spans fall inside the sentence.
//   unit text (FIXED, see PREREG-RANK-0.md): names.join(", ") + " — " + sentence, where names = distinct context surfaces, bound referent
//            first, then mention beings in order of first mention, each kept only if it does not already occur literally
//            (case-insensitive) in the sentence; with no names the unit text is the bare sentence.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const MODEL = "nomic-embed-text:latest";
export const MODEL_DIGEST_PREFIX = "0a109f422b47";
export const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";
export const SEED = 20261103;
export const RRF_K = 60;
export const BM25 = Object.freeze({ k1: 1.2, b: 0.75 });
// The binder's own declared round-5 dials (khora PR 95, eval/attention/score5.mjs DECLARED), unchanged and not tuned here.
export const DECLARED = Object.freeze({ window: 12, minActivation: 0.5, minMargin: 0.2, boost: 2, feed: true, centerVeto: true, clauseMateVeto: false,
  minWordShare: 0.25, carryVeto: true, expletiveVeto: true, demonstrativeSubject: true, causalWords: true,
  lineStarts: true, npHead: true, tieResolve: true, foldPlural: true, neverSilent: true, contextMinUses: 2,
  bearerShare: 0.2, weakRouteCarry: false, centerRivalShare: null, openerReset: false, capitalTargets: true });
// Chosen from DEVELOPMENT data only, by the rule in PREREG-RANK-0.md. Written there before any held-out run.
export const FUSION_SMELL_ARM = "S1g";

export const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---------- reading ----------
export async function loadKhora(K) {
  const { readDocument } = await import(path.join(K, "native/reading.js"));
  const { localLexicon } = await import(path.join(K, "native/adapters/text/wiktionary-pack.js"));
  const { attendedBindingsFor } = await import(path.join(K, "native/adapters/text/attention-switch.js"));
  const pri = await import(path.join(K, "native/adapters/text/priors.js"));
  return { readDocument, localLexicon, attendedBindingsFor, NEUTER: pri.NEUTER_THIRD_PERSON, DEFINITE: pri.DEFINITE_DETERMINERS };
}

const LEAD = /^[^\p{L}\p{N}]*/u;
const FIRST = /^[^\p{L}\p{N}]*([\p{L}\p{N}][\p{L}\p{N}'’-]*)/u;

/** Read one text once through the real pipeline; return its units with structural context. cacheDir (optional) stores the raw read+binder output. */
export async function readUnits(kh, text, cacheDir) {
  const key = sha(text);
  const cf = cacheDir ? path.join(cacheDir, `read-${key.slice(0, 16)}.json`) : null;
  let rec;
  if (cf && fs.existsSync(cf)) rec = JSON.parse(fs.readFileSync(cf, "utf8"));
  else {
    const entry = await kh.readDocument(text, { language: "en", minCharacters: 0, lexicon: kh.localLexicon("en"), castIdentity: true });
    const att = kh.attendedBindingsFor(entry, { enabled: true, ...DECLARED });
    rec = { sentences: entry.sentences, cast: entry.cast.map((c) => ({ ref: c.ref, surface: c.surface, mentionSpans: c.mentionSpans })), att };
    if (cf) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cf, JSON.stringify(rec)); }
  }
  const { sentences, cast, att } = rec;
  const surfaceOf = new Map(cast.map((c) => [c.ref, c.surface]));
  const byOrder = new Map();
  for (const b of att.bindings) { if (!byOrder.has(b.sentenceOrder)) byOrder.set(b.sentenceOrder, { b: [], g: [] }); byOrder.get(b.sentenceOrder).b.push(b); }
  for (const g of att.gaps) { if (!byOrder.has(g.sentenceOrder)) byOrder.set(g.sentenceOrder, { b: [], g: [] }); byOrder.get(g.sentenceOrder).g.push(g); }
  const mentions = [];
  for (const c of cast) for (const [s, e] of c.mentionSpans ?? []) mentions.push({ s, e, surface: c.surface });
  mentions.sort((a, b) => a.s - b.s || a.e - b.e);
  const units = sentences.map((st) => {
    const lead = (st.text.match(LEAD) || [""])[0].length, first = (st.text.match(FIRST) || [])[1] || "";
    const open = st.offset + lead;
    const rec1 = byOrder.get(st.order) || { b: [], g: [] };
    const openB = rec1.b.find((b) => b.at[0] === open && b.referentId), openG = openB ? null : rec1.g.find((g) => g.at[0] === open);
    const bound = openB ? surfaceOf.get(openB.referentId) ?? null : null;
    const end = st.offset + st.text.length, lower = st.text.toLowerCase();
    const mentioned = [];
    for (const m of mentions) if (m.s >= st.offset && m.e <= end && !mentioned.includes(m.surface)) mentioned.push(m.surface);
    const names = [];
    for (const n of [bound, ...mentioned]) if (n && !names.includes(n) && !lower.includes(n.toLowerCase())) names.push(n);
    return {
      order: st.order, offset: st.offset, text: st.text, first: first.toLowerCase(), openCandidate: kh.NEUTER.has(first.toLowerCase()) || kh.DEFINITE.has(first.toLowerCase()),
      bound, gap: openG ? openG.reason : null, hasOpenRecord: !!(openB || openG), mentioned, names,
      unitText: names.length ? `${names.join(", ")} — ${st.text}` : st.text,
    };
  });
  return { units, stats: { sentences: sentences.length, bound: units.filter((u) => u.bound).length, gapped: units.filter((u) => u.gap).length, ruling: att.ruling } };
}

// ---------- embeddings (local ollama, prefixes fixed) ----------
export function makeEmbedder(cacheFile) {
  const cache = new Map();
  if (cacheFile && fs.existsSync(cacheFile)) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(cacheFile, "utf8")))) cache.set(k, new Float32Array(Buffer.from(v, "base64").buffer.slice(0)));
  let dirty = false;
  async function embed(texts) {
    const need = [...new Set(texts.filter((t) => !cache.has(sha(t))))];
    for (let i = 0; i < need.length; i += 32) {
      const batch = need.slice(i, i + 32);
      const r = await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, input: batch }) });
      if (!r.ok) throw new Error(`ollama embed failed: ${r.status} ${await r.text()}`);
      const { embeddings } = await r.json();
      if (embeddings.length !== batch.length) throw new Error("ollama returned a different number of embeddings");
      batch.forEach((t, j) => cache.set(sha(t), Float32Array.from(embeddings[j])));
      dirty = true;
    }
    return texts.map((t) => cache.get(sha(t)));
  }
  const save = () => { if (cacheFile && dirty) { const o = {}; for (const [k, v] of cache) o[k] = Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64"); fs.writeFileSync(cacheFile, JSON.stringify(o)); dirty = false; } };
  return { embed, save, size: () => cache.size };
}
export async function modelDigest() {
  const r = await fetch(`${OLLAMA}/api/tags`); const j = await r.json();
  const m = j.models.find((x) => x.name === MODEL); return m ? m.digest : null;
}

// ---------- vectors ----------
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const cosine = (a, b) => { const d = Math.sqrt(dot(a, a) * dot(b, b)); return d === 0 ? 0 : dot(a, b) / d; };
const sub = (a, g) => { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] - g[i]; return o; };
export function meanVec(vs) { const g = new Float64Array(vs[0].length); for (const v of vs) for (let i = 0; i < g.length; i++) g[i] += v[i]; for (let i = 0; i < g.length; i++) g[i] /= vs.length; return g; }
/** raw cosine, or (ground=true) cos(q − g, d − g) with g the mean of the pool's document embeddings */
export function smellScores(q, docs, ground) {
  if (!ground) return docs.map((d) => cosine(q, d));
  const g = meanVec(docs), qg = sub(q, g);
  return docs.map((d) => cosine(qg, sub(d, g)));
}

// ---------- BM25 (k1 1.2, b .75, lower-case \w+ of 2+ chars, idf only, no stop list) ----------
export const tokens = (s) => (String(s).toLowerCase().match(/\w+/g) || []).filter((t) => t.length >= 2);
export function bm25Index(texts) {
  const docs = texts.map(tokens), N = docs.length, df = new Map();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
  const avg = docs.reduce((a, d) => a + d.length, 0) / N;
  const idf = (t) => { const n = df.get(t) || 0; return Math.log(1 + (N - n + 0.5) / (n + 0.5)); };
  const tfs = docs.map((d) => { const m = new Map(); for (const t of d) m.set(t, (m.get(t) || 0) + 1); return m; });
  const score = (q) => { const qt = [...new Set(tokens(q))]; return docs.map((d, i) => { let s = 0; for (const t of qt) { const f = tfs[i].get(t) || 0; if (f) s += idf(t) * (f * (BM25.k1 + 1)) / (f + BM25.k1 * (1 - BM25.b + BM25.b * d.length / avg)); } return s; }); };
  return { score, idf, tokensOf: (i) => new Set(docs[i]) };
}
/** idf-weighted overlap of the question with a pool sentence: sum idf(shared) / sum idf(question tokens) */
export function overlap(idx, q, i) {
  const qt = [...new Set(tokens(q))], d = idx.tokensOf(i); let a = 0, b = 0;
  for (const t of qt) { const w = idx.idf(t); b += w; if (d.has(t)) a += w; }
  return b === 0 ? 0 : a / b;
}

// ---------- ranks, fusion, measures ----------
export const ranksOf = (scores) => { const o = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a] || a - b), r = new Array(scores.length); o.forEach((i, k) => { r[i] = k + 1; }); return r; };
export function rrf(...rankArrays) { const n = rankArrays[0].length; return ranksOf(Array.from({ length: n }, (_, i) => rankArrays.reduce((a, r) => a + 1 / (RRF_K + r[i]), 0))); }
export function shuffleDocs(embs, rng) { const p = embs.map((_, i) => i); for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p.map((i) => embs[i]); }
export const KS = [1, 3, 5, 10];
export function measure(rows) { // rows: [{rank: first-gold rank}]
  const o = { n: rows.length, mrr: rows.length ? rows.reduce((a, r) => a + 1 / r.rank, 0) / rows.length : 0 };
  for (const k of KS) o[`r${k}`] = rows.filter((r) => r.rank <= k).length;
  return o;
}

// ---------- gold ----------
/** Gold sentences of a question: reader sentences of the named doc(s) whose normalised text contains a gold string (or, for a gold string that
 *  spans sentences, is contained in a sentence of 20+ characters). Schema: {id,q,doc,gold_start:[..]} (QSET-1 `new`) or {id,q,gold:[{doc,contains|start}]}. */
export function goldSpec(qn) {
  if (qn.gold) return qn.gold.map((g) => ({ doc: g.doc, s: norm(g.contains ?? g.start) }));
  return qn.gold_start.map((s) => ({ doc: qn.doc, s: norm(s) }));
}
export const poolDocsOf = (qn) => [...new Set(qn.docs ?? (qn.gold ? qn.gold.map((g) => g.doc) : [qn.doc]))];
export function goldIndices(pool, spec) {
  const hit = new Set(), unmatched = [];
  for (const g of spec) {
    let found = false;
    pool.forEach((u, i) => { if (u.doc !== g.doc) return; const t = norm(u.text); if (t.includes(g.s) || (t.length >= 20 && g.s.includes(t))) { hit.add(i); found = true; } });
    if (!found) unmatched.push(g);
  }
  return { gold: [...hit], unmatched };
}

// ---------- the run ----------
export const ARMS = ["L", "S0", "S0g", "S1", "S1g"];
export async function runAll(K, questions, textsDir, { cacheDir = null, embCache = null, fusionArm = FUSION_SMELL_ARM, poolMode = "doc", log = () => {} } = {}) {
  const kh = await loadKhora(K);
  // poolMode "doc": the question's own doc(s) (primary, the bars). "dir": every text in the texts dir (secondary, descriptive; the Ask pools like this).
  const allDocs = fs.readdirSync(textsDir).filter((f) => f.endsWith(".txt")).map((f) => f.slice(0, -4)).sort();
  const poolDocs = poolMode === "dir" ? () => allDocs : poolDocsOf;
  const docs = [...new Set(questions.flatMap(poolDocs))].sort();
  const read = {}, readStats = {};
  for (const d of docs) {
    const f = path.join(textsDir, `${d}.txt`);
    if (!fs.existsSync(f)) throw new Error(`missing text ${f}`);
    log(`reading ${d}`);
    const r = await readUnits(kh, fs.readFileSync(f, "utf8"), cacheDir);
    read[d] = r.units; readStats[d] = r.stats;
  }
  const emb = makeEmbedder(embCache);
  const D = {}; // per doc: embeddings of bare and unit texts
  for (const d of docs) {
    const us = read[d];
    D[d] = { s0: await emb.embed(us.map((u) => "search_document: " + u.text)), s1: await emb.embed(us.map((u) => "search_document: " + u.unitText)) };
    emb.save();
  }
  const rng = mulberry(SEED), per = [];
  for (const qn of questions) {
    const pool = [], E0 = [], E1 = [];
    for (const d of poolDocs(qn)) read[d].forEach((u, i) => { pool.push({ ...u, doc: d }); E0.push(D[d].s0[i]); E1.push(D[d].s1[i]); });
    const { gold, unmatched } = goldIndices(pool, goldSpec(qn));
    const [qv] = await emb.embed(["search_query: " + qn.q]); emb.save();
    const idx = bm25Index(pool.map((u) => u.text));
    const sc = { L: idx.score(qn.q), S0: smellScores(qv, E0, false), S0g: smellScores(qv, E0, true), S1: smellScores(qv, E1, false), S1g: smellScores(qv, E1, true) };
    const rk = Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, ranksOf(v)]));
    const E = fusionArm.startsWith("S0") ? E0 : E1, shufE = shuffleDocs(E, rng);
    const shufSc = smellScores(qv, shufE, fusionArm.endsWith("g"));
    rk.SH = ranksOf(shufSc); rk.F = rrf(rk.L, rk[fusionArm]); rk.FSH = rrf(rk.L, rk.SH);
    const first = (r) => gold.length ? Math.min(...gold.map((i) => r[i])) : null;
    const goldOverlap = gold.length ? Math.max(...gold.map((i) => overlap(idx, qn.q, i))) : null;
    const stratum = gold.length > 0 && gold.every((i) => pool[i].openCandidate && pool[i].hasOpenRecord);
    per.push({ id: qn.id, q: qn.q, pool: pool.length, docs: poolDocs(qn), gold, unmatched, goldOverlap, stratum, ranks: Object.fromEntries(Object.keys(rk).map((k) => [k, first(rk[k])])),
      goldInfo: gold.map((i) => ({ text: pool[i].text.slice(0, 90), first: pool[i].first, bound: pool[i].bound, gap: pool[i].gap, names: pool[i].names })) });
  }
  const scored = per.filter((p) => p.gold.length);
  const sorted = scored.map((p) => p.goldOverlap).sort((a, b) => a - b), median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : 0;
  for (const p of per) p.lowOverlap = p.gold.length > 0 && p.goldOverlap <= median;
  const armsAll = ["L", "S0", "S0g", "S1", "S1g", "SH", "F", "FSH"];
  const subsets = { full: scored, lowOverlap: scored.filter((p) => p.lowOverlap), stratum: scored.filter((p) => p.stratum) };
  const measures = {};
  for (const [name, ps] of Object.entries(subsets)) { measures[name] = {}; for (const a of armsAll) measures[name][a] = measure(ps.map((p) => ({ rank: p.ranks[a] }))); }
  const gapReasons = {}; for (const d of docs) for (const u of read[d]) if (u.gap) gapReasons[u.gap] = (gapReasons[u.gap] || 0) + 1;
  return { fusionArm, seed: SEED, median, nQuestions: questions.length, nScored: scored.length, unmatchedGold: per.filter((p) => p.unmatched.length).map((p) => ({ id: p.id, unmatched: p.unmatched })),
    pool: poolMode === "dir" ? "all reader sentences of every text in the texts dir" : "per question: all reader sentences of the named doc(s) of that question", readStats, gapReasons, measures, perQuestion: per, _read: read, _D: D };
}

/** Bars of PREREG-RANK-0.md, computed from measures. */
export function bars(m, fusionArm = FUSION_SMELL_ARM) {
  const g = fusionArm.endsWith("g") ? "g" : "";
  const bare = "S0" + g, ctx = "S1" + g, subs = ["lowOverlap", "stratum"];
  const B1 = m.full.F.r10 >= m.full.L.r10;
  const b2 = Object.fromEntries(subs.map((s) => [s, m[s].F.r3 - m[s].L.r3]));
  const b3 = Object.fromEntries(subs.map((s) => [s, m[s][ctx].r10 - m[s][bare].r10]));
  const b4 = Object.fromEntries(["full", ...subs].map((s) => [s, m[s].FSH.r3 - m[s].L.r3]));
  const testable = Object.fromEntries(subs.map((s) => [s, m[s].L.n >= 6])); // a subset of fewer than 6 questions is untestable, never a pass
  const B2 = subs.some((s) => testable[s] && b2[s] >= 2), B3 = subs.some((s) => testable[s] && b3[s] >= 2), B4 = Object.values(b4).every((v) => v <= 1);
  return { B1, B2, B3, B4, testable, b1: { F: m.full.F.r10, L: m.full.L.r10 }, b2, b3, b4, decision: B1 && B2 && B4 ? "may feed the Ask's candidate ranking by rank fusion, as 'smelled', never as a verdict" : "do not feed the Ask" };
}

export function table(m) {
  const lines = [];
  for (const [s, arms] of Object.entries(m)) {
    lines.push(`\n== ${s} (n=${arms.L.n}) ==  arm    R@1 R@3 R@5 R@10  MRR`);
    for (const [a, v] of Object.entries(arms)) lines.push(`   ${a.padEnd(5)} ${String(v.r1).padStart(4)} ${String(v.r3).padStart(3)} ${String(v.r5).padStart(3)} ${String(v.r10).padStart(4)}  ${v.mrr.toFixed(3)}`);
  }
  return lines.join("\n");
}
