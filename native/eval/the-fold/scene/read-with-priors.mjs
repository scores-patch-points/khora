// scene/read-with-priors.mjs — READ A TEXT WITH THE FOUNDATION AS ITS PRIORS.  (2026-10-14)
//
//   node eval/the-fold/scene/read-with-priors.mjs --file <text> [--from "<opening words>"] [--windows 2]
//        [--layer liberal-arts] [--store liberal-arts-weft] [--foundation foundation-weft]
//        [--index <the-fold>/mind/foundation-index.json] [--local <the-fold>/mind/foundation-index.local.json]
//
// "We can't make sense of Plato and Heidegger unless we understand how the world really works" (the user, 2026-10-14). The
// foundation — oral histories, stories, testimony, in the places the canon does not come from — was read first so that what comes
// after is read AGAINST it. This reads a later text (the liberal arts) and does two things:
//
//   1. RECORDS it the way the foundation was recorded: INS / SEG / CON / EVA transformation records at byte addresses, appended
//      to its own store (the liberal arts are a LATER layer; seq runs on from the foundation's).
//   2. READS IT AGAINST THE MIND, and says what the mind did to the reading:
//        · SPOKEN TO — a sentence of the text whose content words the foundation covers MORE than chance covers for words of
//          the same frequency (the consumer's born null, fold-chat-foundation.js). The foundation's sentence is quoted verbatim,
//          at its address, beside it.
//        · CORROBORATED / CONTRADICTED — a connection of the text (end1, connector, end2) that the foundation also recorded,
//          and whether the foundation recorded it NEGATED where the text affirms it (or the reverse).
//        · NOT SPOKEN TO — the rest, said, never filled. A mind that has nothing licensed to say about a sentence says nothing.
//      Both rates are read against a null: the same sentences' content words redrawn from the document's own vocabulary, and the
//      same connections with their second ends shuffled. A priors report that does not beat its null is a report that the
//      foundation does not bear on this text — and says so.
//
// What this does NOT claim: that a testimony sentence "explains" a philosophical one. It claims only that they are about the
// same things to a degree chance does not reach, and it puts them side by side with their addresses so a person can judge.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readToWeft } from "../../../the-fold/read-process.mjs";
import { leanOf } from "../../../the-fold/weft-lean.mjs";
import { openStore, keyOf } from "../../../the-fold/weft-store.mjs";
import { addressEntry } from "./read-corpus-batch.mjs";

const FOLD = "/Users/mlacy/Documents/3.0/the-fold";
const { indexOf, mindPassagesFor, contentStems } = await import(path.join(FOLD, "fold-chat-foundation.js"));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FILE = opt("--file", null);
if (!FILE) { console.error("usage: read-with-priors.mjs --file <text> [--from \"opening words\"] [--windows N]"); process.exit(2); }
const FROM = opt("--from", null);
const WINDOWS = Number(opt("--windows", 2));
const LAYER = opt("--layer", "liberal-arts");
const STORE = path.resolve(HERE, opt("--store", "liberal-arts-weft"));
const FSTORE = path.resolve(HERE, opt("--foundation", "foundation-weft"));
const IDX_PUBLIC = opt("--index", path.join(FOLD, "mind/foundation-index.json"));
const IDX_LOCAL = opt("--local", path.join(FOLD, "mind/foundation-index.local.json"));
const SEED = 20261014;
const WIN = 60000;

const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const bytes = (s) => Buffer.byteLength(s, "utf8");
const stem = (w) => { const f = String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""); return f.length > 4 && f.endsWith("s") && !/(ss|us|is)$/.test(f) ? f.slice(0, -1) : f; };
const headStem = (s) => String(s ?? "").toLowerCase().split(/\s+/).map(stem).filter((w) => w.length > 2).sort().join(" ");

// ── 1. record the text ───────────────────────────────────────────────────────────────────────────────────────
const full = fs.readFileSync(FILE, "utf8");
const startChar = FROM ? Math.max(0, full.indexOf(FROM)) : 0;
if (FROM && full.indexOf(FROM) < 0) { console.error(`--from text not found in ${FILE}`); process.exit(2); }
const body = full.slice(startChar);
const wins = []; for (let s0 = 0; s0 < body.length && wins.length < WINDOWS;) { let e0 = Math.min(body.length, s0 + WIN); if (e0 < body.length) { const cut = body.lastIndexOf("\n\n", e0); if (cut > s0 + WIN / 2) e0 = cut + 2; } wins.push([s0, e0]); s0 = e0; }

const foundation = openStore(FSTORE);
const store = openStore(STORE);
const baseSeq = 32 + foundation.count();
const have = store.keys();
let seq = baseSeq + store.count();
const t0 = Date.now(); let wrote = 0;
for (const [w0, w1] of wins) {
  const abs = startChar + w0;
  const key = `${FILE}@${abs}`; if (have.has(key)) continue;
  const e = readToWeft(body.slice(w0, w1), { address: FILE, category: LAYER });
  if (e.skipped || e.error) { console.log(`  window @${abs}: ${e.skipped ?? e.error}`); continue; }
  const p = { schema: "WeftEntry@4", ...addressEntry(e, { file: FILE, text: full, prefixChars: abs }), layer: "foundation", foundation: { layer: LAYER, language: "en", windowStart: abs } };
  store.append([leanOf({ ...p, seq: seq++ })]); wrote += 1;
}
const mine = store.passes().filter((l) => l.a === FILE);
console.log(`recorded ${FILE.split("/").pop()} — ${wins.length} window(s) of ${WIN} chars from char ${startChar}; ${wrote} new, ${mine.length} in ${path.basename(STORE)} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// ── 2. read it against the mind ──────────────────────────────────────────────────────────────────────────────
const loadIdx = (f) => { try { const j = JSON.parse(fs.readFileSync(f, "utf8")); return j.schema === "FoundationIndex@1" ? j : null; } catch { return null; } };
const pub = loadIdx(IDX_PUBLIC), loc = loadIdx(IDX_LOCAL);
if (!pub && !loc) { console.error("no foundation index; build one with the-fold/scripts/build-foundation-index.mjs"); process.exit(1); }
let merged = pub ?? loc;
if (pub && loc) { const off = pub.docs.length; merged = { ...pub, docs: [...pub.docs, ...loc.docs], units: [...pub.units, ...loc.units.map((u) => [u[0] + off, u[1], u[2]])] }; }
const index = indexOf(merged);
console.log(`the mind: ${merged.docs.length} documents, ${merged.units.length} verbatim units${loc ? " (local index merged)" : ""}`);

const fileBytes = fs.readFileSync(FILE);
const sentenceAt = (at) => { const win = fileBytes.subarray(at, at + 900).toString("utf8"); const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(win); return norm(m ? m[0] : win.split(/\n/)[0].slice(0, 300)); };
const sentences = new Map();                        // address → sentence, once
for (const l of mine) for (const c of l.con) if (c[3] >= 0 && !sentences.has(c[3])) { const s = sentenceAt(c[3]); if (s.length >= 25 && s.length <= 500) sentences.set(c[3], s); }
const sents = [...sentences.entries()];

// the document's own vocabulary, for the null: each sentence's content words redrawn from it
const vocab = [...new Set(sents.flatMap(([, s]) => contentStems(s)))];
const redraw = (n) => { const out = []; while (out.length < n) out.push(vocab[Math.floor(rnd() * vocab.length)]); return out.join(" "); };

let spoken = 0, nullSpoken = 0; const pairs = [];
for (const [at, s] of sents) {
  const n = contentStems(s).length;
  const r = mindPassagesFor({ question: s, index });
  if (r.passages.length) { spoken += 1; pairs.push({ at, sentence: s, terms: r.basis.n, need: r.basis.need, chance: r.basis.chance, passages: r.passages.map((p) => ({ text: p.text, doc: p.title, layer: p.layer, source: p.source, address: `${p.address.file}#${p.address.at}`, coverage: p.coverage })) }); }
  if (n >= 2 && mindPassagesFor({ question: redraw(n), index }).passages.length) nullSpoken += 1;
}

// connections: does the foundation hold the same pair, and with what sign?
const fpasses = foundation.passes();
const held = new Map();                              // unordered stem pair → { n, negated }
for (const l of fpasses) {
  const neg = new Set(l.eva.filter((v) => v[0] === "con").map((v) => v[1]));
  l.con.forEach((c, i) => {
    const a = headStem(c[0]), b = headStem(c[2]); if (!a || !b || a === b) return;
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    const h = held.get(k) ?? { n: 0, negated: 0, docs: new Set() }; h.n += 1; if (neg.has(i)) h.negated += 1; h.docs.add(path.basename(l.a)); held.set(k, h);
  });
}
const cons = []; for (const l of mine) { const neg = new Set(l.eva.filter((v) => v[0] === "con").map((v) => v[1])); l.con.forEach((c, i) => { if (c[0] && c[2]) cons.push({ c, neg: neg.has(i) }); }); }
const keyOfPair = (a, b) => { const x = headStem(a), y = headStem(b); return x && y && x !== y ? (x < y ? `${x}|${y}` : `${y}|${x}`) : null; };
let corroborated = 0, contradicted = 0; const corr = [];
for (const { c, neg } of cons) { const k = keyOfPair(c[0], c[2]); const h = k ? held.get(k) : null; if (!h) continue; corroborated += 1; const theirsNeg = h.negated > h.n / 2; if (neg !== theirsNeg) { contradicted += 1; } if (corr.length < 40) corr.push({ text: `${c[0]} —${c[1]}→ ${c[2]}`, negatedHere: neg, heldIn: h.n, heldNegated: h.negated, docs: [...h.docs].slice(0, 3) }); }
const ends2 = cons.map((x) => x.c[2]);
let nullCorr = 0; for (let i = 0; i < cons.length; i++) { const k = keyOfPair(cons[i].c[0], ends2[Math.floor(rnd() * ends2.length)]); if (k && held.has(k)) nullCorr += 1; }

// THE UNIT THAT FITS THE BAR: a whole philosophical sentence has more content words than any one testimony sentence can cover
// (the born null correctly refuses it). A CONNECTION — two ends and what joins them — is what the reading recorded, and is
// short enough to be evidence: "what does the mind hold that is about these two things at once?"
const seenPair = new Map(); for (const { c } of cons) { const q = `${c[0]} ${c[2]}`; if (c[0] && c[2] && contentStems(q).length >= 2 && !seenPair.has(q)) seenPair.set(q, c); }
let connSpoken = 0, connNull = 0; const connPairs = [];
const allEnds1 = [...seenPair.values()].map((c) => c[0]), allEnds2 = [...seenPair.values()].map((c) => c[2]);
for (const [q, c] of seenPair) {
  const r = mindPassagesFor({ question: q, index });
  if (r.passages.length) { connSpoken += 1; connPairs.push({ connection: `${c[0]} —${c[1]}→ ${c[2]}`, at: c[3], sentence: c[3] >= 0 ? sentenceAt(c[3]) : null, terms: r.basis.n, need: r.basis.need, chance: r.basis.chance, passages: r.passages.map((p) => ({ text: p.text, doc: p.title, layer: p.layer, address: `${p.address.file}#${p.address.at}`, coverage: p.coverage })) }); }
  const n1 = allEnds1[Math.floor(rnd() * allEnds1.length)], n2 = allEnds2[Math.floor(rnd() * allEnds2.length)];
  if (contentStems(`${n1} ${n2}`).length >= 2 && mindPassagesFor({ question: `${n1} ${n2}`, index }).passages.length) connNull += 1;
}

const rate = (a, b) => (b ? (a / b).toFixed(3) : "n/a");
const report = {
  schema: "ReadWithPriors@1", at: new Date().toISOString(), file: FILE, from: FROM, windows: wins.length, layer: LAYER,
  mind: { documents: merged.docs.length, units: merged.units.length, local: !!loc, foundationPasses: fpasses.length },
  sentences: { read: sents.length, spokenTo: spoken, spokenToRate: +rate(spoken, sents.length), nullRate: +rate(nullSpoken, sents.length), notSpokenTo: sents.length - spoken },
  connections: { read: cons.length, corroborated, corroboratedRate: +rate(corroborated, cons.length), nullRate: +rate(nullCorr, cons.length), contradictedByNegation: contradicted },
  connectionsSpokenTo: { askable: seenPair.size, spokenTo: connSpoken, rate: +rate(connSpoken, seenPair.size), nullRate: +rate(connNull, seenPair.size) },
  beatsNull: { sentences: spoken > nullSpoken, connectionsCorroborated: corroborated > nullCorr, connectionsSpokenTo: connSpoken > connNull },
  pairs: pairs.slice(0, 10),
  connectionPairs: connPairs.sort((a, b) => b.terms - a.terms || b.passages.length - a.passages.length).slice(0, 40),
  corroborations: corr.slice(0, 20),
  limits: "a shared-content-words bar, not entailment; the connection match is by stems of the two ends, unordered; the null redraws words from the document's own vocabulary",
};
const slug = path.basename(FILE).replace(/\.[a-z]+$/i, "").replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);
const out = path.join(HERE, `reading-with-priors.${slug}.json`);
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(`\nsentences read ${sents.length}: the mind speaks to ${spoken} (${rate(spoken, sents.length)}) vs null ${nullSpoken} (${rate(nullSpoken, sents.length)}) · not spoken to ${sents.length - spoken}`);
console.log(`connections read ${cons.length}: corroborated by the foundation ${corroborated} (${rate(corroborated, cons.length)}) vs null ${nullCorr} (${rate(nullCorr, cons.length)}) · contradicted by sign ${contradicted}`);
console.log(`connections the mind speaks to (two ends at once): ${connSpoken}/${seenPair.size} (${rate(connSpoken, seenPair.size)}) vs null ${connNull} (${rate(connNull, seenPair.size)})`);
console.log(`beats its null — whole sentences: ${report.beatsNull.sentences} · connection pairs spoken to: ${report.beatsNull.connectionsSpokenTo} · connections corroborated: ${report.beatsNull.connectionsCorroborated}\n→ ${out}`);
