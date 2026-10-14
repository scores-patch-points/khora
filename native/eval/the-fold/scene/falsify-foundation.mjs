// scene/falsify-foundation.mjs — TRY TO BREAK THE CLAIM that the foundation is parsed well and added to the mind correctly.  (2026-10-14)
//
//   node eval/the-fold/scene/falsify-foundation.mjs [--store foundation-weft] [--baseline <committed 32-pass weft>] [--index <the-fold index>] [--out RESULTS.json]
//
// The claim: (A) the text is parsed well — the transformations the reader recorded are grounded in the file's bytes and supported
// by the sentence they were done to; (B) they are added to the mind correctly — append-only, ordered, deterministic; (C) the mind
// will be USED — something downstream finds what was read and something actually does.
//
// THE SUBSTRATE IS TRANSFORMATION RECORDS (weft-lean.mjs): INS beings, SEG clause cuts, CON connections, EVA negations — at byte
// addresses, no corpus text. Every check that needs a sentence re-expands it from the corpus file's own bytes. Each test states
// its prediction and the observation that would KILL it BEFORE it runs; every rate read against chance is read against a null
// born from the same bytes (seeded), never against a number typed in here. Where a check is only a proxy it says so in `limit`.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { readToWeft } from "../../../the-fold/read-process.mjs";
import { weftAttestations } from "../../../the-fold/weft.js";
import { leanOf } from "../../../the-fold/weft-lean.mjs";
import { openStore, asPass, keyOf } from "../../../the-fold/weft-store.mjs";
import { fieldFromWeft } from "../../../../../janus/native/organs/ruliad.js";
import { loadModel, analyse } from "../../../adapters/text/english-parser.js";
import { treeTriples } from "../../../adapters/text/nested-clauses.js";
import { splitFrontmatter, addressEntry } from "./read-corpus-batch.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const STORE = path.resolve(opt("--store", path.join(HERE, "foundation-weft")));
const BASE = path.resolve(opt("--baseline", "/Users/mlacy/Documents/3.0/Zenodotus/eots/corpus.eot.jsonl"));
const SCENE_WEFT = path.join(HERE, "corpus.eot.jsonl");
const INDEX = path.resolve(opt("--index", "/Users/mlacy/Documents/3.0/the-fold/mind/foundation-index.json"));
const OUT = path.resolve(opt("--out", path.join(HERE, "foundation-falsification-RESULTS.json")));
const SEED = 20261014;

const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const pick = (arr, n) => { const a = arr.slice(); const m = Math.min(n, a.length); for (let i = 0; i < m; i++) { const j = i + Math.floor(rnd() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, m); };
const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
const letters = (s) => norm(s).replace(/[^\p{L}\p{N}]+/gu, "");
const fileCache = new Map();
const bytesOf = (f) => { if (!fileCache.has(f)) fileCache.set(f, fs.readFileSync(f)); return fileCache.get(f); };
/** The sentence a transformation was done to, re-expanded from the corpus file's own bytes at its address. */
const sentenceAt = (f, at) => {
  if (!(at >= 0) || !fs.existsSync(f)) return "";
  const win = bytesOf(f).subarray(at, at + 900).toString("utf8");
  const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(win);
  return norm(m ? m[0] : win.split(/\n/)[0].slice(0, 300));
};
const store = openStore(STORE);
const foundation = store.passes();
const live = foundation.filter((l) => fs.existsSync(l.a));
const record_ = { schema: "FoundationFalsification@2", at: new Date().toISOString(), seed: SEED, store: { dir: path.basename(STORE), passes: foundation.length, segments: store.segments() }, tests: [] };
const record = (t) => { record_.tests.push(t); console.log(`${t.survived ? "SURVIVED" : "FALSIFIED"}  ${t.id}  ${t.title}\n   ${t.observed}`); };
const layerOf = (l) => l.l ?? "?";
const NEG = /\b(?:not|never|no|nobody|none|nothing|nowhere|neither|nor|cannot|without)\b|n['’]t\b/i;

// ── T1 — a witness is the sentence's own bytes ──────────────────────────────────────────────────────────────
// Prediction: for a CON record, an end's surface occurs in the file's bytes within a short window after its address.
// Kill: the real hit rate does not exceed the MAX of a null where the same surfaces are tested at addresses drawn from
// elsewhere in the same file (seeded, 200 draws).
{
  const cons = []; for (const l of live) l.con.forEach((c, i) => { if (c[3] >= 0 && c[0] && c[2]) cons.push({ l, c, i }); });
  const sample = pick(cons, 1500);
  const hit = (x, off) => { const seg = norm(bytesOf(x.l.a).subarray(Math.max(0, off), off + 1200).toString("utf8")); return seg.includes(norm(x.c[0])) || seg.includes(norm(x.c[2])); };
  let real = 0; for (const x of sample) if (hit(x, x.c[3])) real++;
  const nullRates = [];
  for (let d = 0; d < 200; d++) { let h = 0; for (const x of pick(sample, 150)) h += hit(x, Math.floor(rnd() * Math.max(1, bytesOf(x.l.a).length - 1200))) ? 1 : 0; nullRates.push(h / 150); }
  const nullMax = Math.max(...nullRates); const rate = real / (sample.length || 1);
  const by = {}; for (const x of sample) { const k = layerOf(x.l); (by[k] ??= [0, 0]); by[k][1]++; if (hit(x, x.c[3])) by[k][0]++; }
  record({ id: "T1", title: "a connection's address lands in the sentence it was done to", survived: sample.length > 0 && rate > nullMax,
    observed: `${real}/${sample.length} = ${rate.toFixed(3)} · null mean ${(nullRates.reduce((s, x) => s + x, 0) / nullRates.length).toFixed(3)}, max ${nullMax.toFixed(3)} · by layer ${Object.entries(by).map(([k, [h, n]]) => `${k} ${(h / n).toFixed(2)} (${n})`).join(", ")}`,
    limit: "an end appearing near the address is necessary, not sufficient; the door's addresses are clause-level" });
}

// ── T2 — the sentence supports the connection ───────────────────────────────────────────────────────────────
// Prediction: both ends of a CON record occur in the sentence re-expanded at its address. Kill: no better than a null that
// pairs each record's first end with ANOTHER record's second end from the same pass.
{
  const cons = []; for (const l of live) for (const c of l.con) if (c[3] >= 0 && c[0] && c[2] && l.l !== "story") cons.push({ l, c });
  const sample = pick(cons, 3000);
  const has = (s, e) => s.includes(norm(e));
  let real = 0; for (const { l, c } of sample) { const s = sentenceAt(l.a, c[3]); if (has(s, c[0]) && has(s, c[2])) real++; }
  const byPass = new Map(); for (const x of cons) (byPass.get(x.l) ?? byPass.set(x.l, []).get(x.l)).push(x);
  const nullRates = [];
  for (let d = 0; d < 100; d++) { let h = 0; const sub = pick(sample, 200); for (const { l, c } of sub) { const pool = byPass.get(l); const o = pool[Math.floor(rnd() * pool.length)].c; const s = sentenceAt(l.a, c[3]); if (has(s, c[0]) && has(s, o[2])) h++; } nullRates.push(h / sub.length); }
  const nullMax = Math.max(...nullRates, 0); const rate = real / (sample.length || 1);
  record({ id: "T2", title: "both ends of a connection occur in the sentence it was done to (vs ends swapped within the document)", survived: sample.length > 0 && rate > nullMax,
    observed: `${real}/${sample.length} = ${rate.toFixed(3)} · swapped-ends null mean ${(nullRates.reduce((s, x) => s + x, 0) / (nullRates.length || 1)).toFixed(3)}, max ${nullMax.toFixed(3)}`,
    limit: "string support, not entailment: it cannot see that 'A hit B' was recorded as 'B hit A'; the sentence is re-expanded by a terminator rule, not the reader's own segmentation" });
}

// ── T3 — negation is recorded ───────────────────────────────────────────────────────────────────────────────
// Prediction: connections done to negated sentences carry an EVA record more often than connections done to affirmative ones.
// Kill: no lift. People say "we never", "I didn't", "nobody came" — a mind that drops the negation inverts the testimony.
{
  let negN = 0, negEva = 0, posN = 0, posEva = 0; const unmarked = [];
  for (const l of live) {
    const eva = new Set(l.eva.filter((v) => v[0] === "con").map((v) => v[1]));
    l.con.forEach((c, i) => {
      if (!(c[3] >= 0)) return;
      const s = sentenceAt(l.a, c[3]); if (!s) return;
      if (NEG.test(s)) { negN++; if (eva.has(i)) negEva++; else if (unmarked.length < 3) unmarked.push(s.slice(0, 100)); } else { posN++; if (eva.has(i)) posEva++; }
    });
  }
  const pn = negN ? negEva / negN : 0, pp = posN ? posEva / posN : 0;
  record({ id: "T3", title: "connections done to negated sentences carry an EVA record more often than affirmative ones", survived: negN > 0 && pn > pp,
    observed: `P(EVA | negated sentence) = ${negEva}/${negN} = ${pn.toFixed(3)} vs ${posEva}/${posN} = ${pp.toFixed(3)} otherwise${unmarked.length ? " · negated yet unrecorded, e.g. " + JSON.stringify(unmarked[0]) : ""}`,
    limit: "a lexical negator list over the re-expanded sentence; negation is recorded per CLAUSE, so an affirmative clause inside a negated sentence is rightly unmarked and counts against this rate" });
}

// ── T4 — nothing in the cast is invented ────────────────────────────────────────────────────────────────────
// Prediction: every admitted being's surface occurs in the text it was read from. Two readings are kept apart: LITERAL (case- and
// space-folded substring) and LENIENT (letters and digits only, so "Dr" matches "Dr."). Kill: any surface absent even leniently.
{
  let n = 0, absentLit = 0, absentLen = 0; const bad = [];
  for (const l of pick(live.filter((x) => x.ins.length), 80)) {
    const raw = norm(bytesOf(l.a).toString("utf8")); const flat = letters(raw);
    for (const s of l.ins) {
      const t = norm(s); if (!t) continue; n++;
      if (!raw.includes(t)) { absentLit++; if (!flat.includes(letters(s))) { absentLen++; if (bad.length < 4) bad.push(s); } }
    }
  }
  record({ id: "T4", title: "every admitted being's surface is in the file's bytes", survived: n > 0 && absentLen === 0,
    observed: `${n} beings checked · ${absentLit} absent literally · ${absentLen} absent even leniently (letters and digits only)${bad.length ? " (" + bad.join(" | ") + ")" : ""}`,
    limit: "a surface that is present is not thereby the same being; windows are read separately so a being is checked against its whole file" });
}

// ── T5 — a read is reproducible ─────────────────────────────────────────────────────────────────────────────
// Prediction: reading the same window again records the same transformations. Kill: any difference in the CON / SEG / EVA
// records (a mind that changes on re-read cannot be audited or resumed).
{
  const WIN = 60000;
  const eng = live.filter((l) => Number.isFinite(l.ws) && /\.(txt|md)$/.test(l.a));
  const byLayer = {}; for (const l of eng) (byLayer[layerOf(l)] ??= []).push(l);
  let same = 0, n = 0; const diff = [];
  for (const ls of Object.values(byLayer)) for (const l of pick(ls, 2)) {
    const full = fs.readFileSync(l.a, "utf8"); const { body, prefixChars } = splitFrontmatter(full);
    const wins = []; for (let s0 = 0; s0 < body.length;) { let e0 = Math.min(body.length, s0 + WIN); if (e0 < body.length) { const cut = body.lastIndexOf("\n\n", e0); if (cut > s0 + WIN / 2) e0 = cut + 2; } wins.push([s0, e0]); s0 = e0; }
    const w = wins.find((x) => x[0] === l.ws); if (!w) continue;
    const e = readToWeft(body.slice(w[0], w[1]), { address: l.a });
    const p = { ...addressEntry(e, { file: l.a, text: full, prefixChars: prefixChars + w[0] }), layer: "foundation", foundation: { layer: l.l, language: l.g, windowStart: l.ws } };
    const again = leanOf(p);
    n++; if (JSON.stringify([again.con, again.seg, again.eva, again.ins]) === JSON.stringify([l.con, l.seg, l.eva, l.ins])) same++; else diff.push(path.basename(l.a));
  }
  record({ id: "T5", title: "re-reading the same window records the same transformations", survived: n > 0 && same === n,
    observed: `${same}/${n} windows identical on re-read (CON, SEG, EVA, INS)${diff.length ? " · differ: " + diff.join(", ") : ""}`, limit: "two reads, minutes apart, one machine; a cross-machine rerun is not tested" });
}

// ── T6 — the weft is append-only and in the declared order ──────────────────────────────────────────────────
// Prediction: the committed 32-pass baseline is byte-identical to the scene's corpus.eot.jsonl; the store's seq runs on from it
// without a gap; foundation layers appear in the declared order. Kill: any violation.
{
  const baseLines = fs.readFileSync(BASE, "utf8").split("\n").filter(Boolean);
  const nowLines = fs.readFileSync(SCENE_WEFT, "utf8").split("\n").filter(Boolean);
  const prefix = baseLines.length === nowLines.length && baseLines.every((l, i) => nowLines[i] === l);
  const seqs = foundation.map((l) => l.s);
  const seqOk = seqs.every((s, i) => s === baseLines.length + i);
  const ORDER = ["oral-history", "story", "testimony", "oral-history-us", "testimony-trc"];
  const ranks = foundation.map((l) => ORDER.indexOf(l.l));
  const ordered = ranks.every((r, i) => r >= 0 && (i === 0 || r >= ranks[i - 1]));
  const noDup = new Set(foundation.map(keyOf)).size === foundation.length;
  record({ id: "T6", title: "append-only: baseline intact, seq contiguous from it, layers in declared order, no pass twice", survived: prefix && seqOk && ordered && noDup,
    observed: `baseline identical: ${prefix} (${baseLines.length} passes) · store seq contiguous from ${baseLines.length}: ${seqOk} · layer order monotone: ${ordered} · no duplicate window: ${noDup}`, limit: "order within a layer is path-sorted, not curated" });
}

// ── T7 — the same story in nine languages reads as the same story ───────────────────────────────────────────
// Prediction: each translation of an African Storybook story binds a connection. Kill: a language that reads to zero while its
// siblings do not (the door silently failed).
{
  const sb = foundation.filter((l) => /african-storybook\/[a-z-]+\/0001_/.test(l.a));
  const rows = sb.map((l) => ({ lang: path.basename(path.dirname(l.a)), n: l.con.length, ins: l.ins.length }));
  const zeros = rows.filter((r) => r.n === 0);
  record({ id: "T7", title: "every translation of the same story binds a connection", survived: rows.length > 1 && zeros.length === 0,
    observed: `${rows.length} translations read · connections per language ${rows.map((r) => `${r.lang}:${r.n}`).join(" ")}${zeros.length ? " · ZERO: " + zeros.map((z) => z.lang).join(",") : ""}`,
    limit: "counts, not parallel structure: that the nine reads record the SAME propositions is not tested" });
}

// ── T8 — the testimony's own subject survives the reading ───────────────────────────────────────────────────
// Prediction: the commonest content words of an oral history appear among the ends and connectors it recorded. Kill: coverage no
// better than the same test with a DIFFERENT interview's commonest words.
{
  const STOP = new Set("the and that was for with this have had they were but not you are his her from she him there when what which would about out then them said one all their been who will more very like just into over than some could also back because after only other going know think really yeah okay well".split(" "));
  const topWords = (t, k) => { const c = new Map(); for (const w of (t.toLowerCase().match(/[a-zà-ÿ]{4,}/g) ?? [])) if (!STOP.has(w)) c.set(w, (c.get(w) ?? 0) + 1); return [...c].sort((a, b) => b[1] - a[1]).slice(0, k).map(([w]) => w); };
  const byFile = new Map(); for (const l of live.filter((x) => x.l === "oral-history")) (byFile.get(l.a) ?? byFile.set(l.a, []).get(l.a)).push(l);
  const docs = [...byFile.entries()];
  const endsOf = (ls) => new Set(ls.flatMap((l) => l.con.flatMap((c) => [c[0], c[1], c[2]])).flatMap((s) => String(s ?? "").toLowerCase().split(/\s+/)));
  let real = 0, nul = 0, n = 0;
  for (let i = 0; i < docs.length; i++) {
    const [f, ls] = docs[i], [g] = docs[(i + 1) % docs.length]; if (f === g) continue;
    const ends = endsOf(ls); const own = topWords(bytesOf(f).toString("utf8"), 20), other = topWords(bytesOf(g).toString("utf8"), 20);
    if (!own.length || !other.length) continue;
    real += own.filter((w) => ends.has(w)).length / own.length; nul += other.filter((w) => ends.has(w)).length / other.length; n++;
  }
  record({ id: "T8", title: "an interview's own commonest words reach its recorded connections (vs another interview's words)", survived: n > 0 && real / n > nul / n,
    observed: `coverage ${(real / (n || 1)).toFixed(3)} for its own top-20 vs ${(nul / (n || 1)).toFixed(3)} for a different interview's, over ${n} interviews`,
    limit: "word overlap, not meaning; interviews on one island and one hurricane share vocabulary, which blunts the null" });
}

// ── T9 — the index can find what was read, and invents nothing ──────────────────────────────────────────────
// Prediction: folding the store into the hyperlexicon field gives rows whose witnesses lead back to a foundation file, and every
// row's (left, right) pair is a pair some connection actually carried. Kill: an invented row, or a row whose witnesses lead nowhere.
{
  const passes = foundation.map(asPass);
  const atts = [...weftAttestations(passes)];
  const attested = new Set(atts.filter((a) => a.left.surface && a.right.surface).map((a) => `${a.left.surface}\u0000${a.right.surface}`));
  const field = fieldFromWeft(passes);
  const rows = Object.values(field.hyperlexicon.composition);
  const files = new Set(foundation.map((l) => l.a));
  const invented = rows.filter((r) => !attested.has(`${r.left}\u0000${r.right}`)).length;
  const leadless = rows.filter((r) => !(r.witnesses ?? []).some((w) => files.has(String(w).replace(/#\d+$/, "")))).length;
  record({ id: "T9", title: "every field row is a connected pair and leads back to a foundation file", survived: rows.length > 0 && invented === 0 && leadless === 0,
    observed: `${rows.length} composition rows from ${foundation.length} passes · ${invented} rows no connection carries · ${leadless} rows whose witnesses lead to no foundation file · ${field.stats.attestations} attestations`,
    limit: "tests that the index is faithful and addressable, not that it is the right index or that anything consults it (T10)" });
}

// ── T10 — something downstream USES it ──────────────────────────────────────────────────────────────────────
// Prediction: a runtime path in the fold loads the index built from the store, and the chat merges it into a turn. Kill: only
// build and eval scripts read them. T10b: the index served was built from THIS store (its sha16 is the store's).
{
  const chat = "/Users/mlacy/Documents/3.0/the-fold/fold-chat.js", mod = "/Users/mlacy/Documents/3.0/the-fold/fold-chat-foundation.js";
  const loads = fs.existsSync(mod) && /foundation-index\.json/.test(fs.readFileSync(mod, "utf8"));
  const merges = fs.existsSync(chat) && /mergeMind\(webPassages, mp\)/.test(fs.readFileSync(chat, "utf8"));
  record({ id: "T10", title: "the runtime loads the index built from the store and the chat merges it into a turn", survived: loads && merges,
    observed: `loader in fold-chat-foundation.js: ${loads} · chat merges at the web-read seam: ${merges}`,
    limit: "static source check; that an answer moves is the-fold/fold-chat-foundation.test.mjs F1-F4, not this" });
  if (fs.existsSync(INDEX)) {
    const h = crypto.createHash("sha256");
    for (const f of fs.readdirSync(STORE).filter((x) => /^seg-\d{6}\.bin$/.test(x)).sort()) h.update(fs.readFileSync(path.join(STORE, f)));
    const sha = h.digest("hex").slice(0, 16); const idx = JSON.parse(fs.readFileSync(INDEX, "utf8"));
    record({ id: "T10b", title: "the served index was built from THIS store", survived: idx.weft?.sha16 === sha,
      observed: `index store sha16 ${idx.weft?.sha16} vs store ${sha} · ${idx.units?.length ?? 0} units from ${idx.docs?.length ?? 0} documents (${idx.excluded?.closedLicenseDocuments ?? 0} closed-licence documents left out)`,
      limit: "freshness, not completeness: closed-licence documents are left out of the committed index by design" });
  }
}

// ── T11 — nested clauses are recorded, nested, and at their own bytes ───────────────────────────────────────
// Prediction: SEG records exist, a large share are nested under a parent, and a clause's marker ("that", "because", "who" …)
// occurs in the sentence at the clause's address (vs the same marker tested at addresses from elsewhere in the same file).
// Kill: no cuts, a flat tree, or marker presence no better than the null.
{
  const segs = []; for (const l of live) for (const c of l.seg) segs.push({ l, c });
  const nested = segs.filter(({ c }) => c[1]).length;
  const marked = pick(segs.filter(({ c }) => c[3] && c[4] >= 0), 1500);
  const has = (l, c, at) => sentenceAt(l.a, at).includes(norm(c[3]));
  let real = 0; for (const { l, c } of marked) if (has(l, c, c[4])) real++;
  const nullRates = [];
  for (let d = 0; d < 100; d++) { let h = 0; for (const { l, c } of pick(marked, 120)) if (has(l, c, Math.floor(rnd() * Math.max(1, bytesOf(l.a).length - 200)))) h++; nullRates.push(h / 120); }
  const nullMax = Math.max(...nullRates, 0); const rate = real / (marked.length || 1);
  record({ id: "T11", title: "clause cuts are recorded, nested, and each marker is in the sentence at its address", survived: segs.length > 0 && nested > 0 && rate > nullMax,
    observed: `${segs.length} SEG records, ${nested} nested (${(nested / (segs.length || 1)).toFixed(2)}) · marker in the sentence at its address ${real}/${marked.length} = ${rate.toFixed(3)} vs null max ${nullMax.toFixed(3)}`,
    limit: "the tree is the parser's (T12 scores it); a marker's presence is necessary for the clause, not sufficient" });
}

// ── T12 — the nesting is right, on text the parser was not trained on ───────────────────────────────────────
// Prediction: on UD English-EWT TEST, nested clause triples (head, parent, relation) from the parser's output beat the best of 20
// random-parent nulls over the same heads. Kill: they do not. The F1 is reported because a result that beats chance and is still
// half wrong should be read as half wrong.
{
  const model = loadModel(JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/parser-eng-ewt.json", "utf8")));
  const gold = []; let cur = [];
  for (const line of fs.readFileSync(path.join(HERE, "../../fixtures/ud-english-ewt/en_ewt-ud-test.conllu"), "utf8").split("\n")) {
    if (line.startsWith("#")) continue;
    if (!line.trim()) { if (cur.length) gold.push(cur); cur = []; continue; }
    const f = line.split("\t"); if (/[-.]/.test(f[0])) continue;
    cur.push({ id: +f[0], form: f[1], lemma: f[2], upos: f[3], head: +f[6], deprel: f[7] });
  }
  const sample = gold.filter((s) => s.length >= 6).slice(0, 500);
  let tp = 0, fp = 0, fn = 0; const pools = [];
  for (const g of sample) {
    const P0 = treeTriples(analyse(model, g.map((r) => r.form))); const G = new Set(treeTriples(g).filter((t) => !t.endsWith("\u0000root"))); const P = new Set(P0.filter((t) => !t.endsWith("\u0000root")));
    for (const t of P) (G.has(t) ? tp++ : fp++); for (const t of G) if (!P.has(t)) fn++;
    pools.push({ G, P, heads: [...new Set(P0.map((t) => +t.split("\u0000")[0]))] });
  }
  let worst = 0;
  for (let d = 0; d < 20; d++) { let h = 0; for (const { G, P, heads } of pools) for (const t of P) { const [hd, , rel] = t.split("\u0000"); const rp = heads.length > 1 ? heads[Math.floor(rnd() * heads.length)] : 0; if (G.has(`${hd}\u0000${rp}\u0000${rel}`)) h++; } worst = Math.max(worst, h); }
  const p = tp / (tp + fp || 1), r = tp / (tp + fn || 1), f1 = 2 * p * r / (p + r || 1);
  record({ id: "T12", title: "nested clause triples beat the random-parent null on held-out UD English-EWT gold", survived: tp > worst,
    observed: `${sample.length} held-out sentences · P ${p.toFixed(3)} R ${r.toFixed(3)} F1 ${f1.toFixed(3)} · tp ${tp} vs best null ${worst}`,
    limit: "F1 about 0.5: the nesting is better than chance and wrong about half the time; the parser is a small perceptron, and a stronger one would need a download" });
}

record_.summary = { survived: record_.tests.filter((t) => t.survived).map((t) => t.id), falsified: record_.tests.filter((t) => !t.survived).map((t) => t.id) };
fs.writeFileSync(OUT, JSON.stringify(record_, null, 2) + "\n");
console.log(`\nsurvived ${record_.summary.survived.join(" ")} · falsified ${record_.summary.falsified.join(" ") || "none"}\n→ ${OUT}`);
