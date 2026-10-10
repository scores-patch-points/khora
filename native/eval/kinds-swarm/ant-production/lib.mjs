// eval/kinds-swarm/ant-production/lib.mjs — shared instruments of ant-production (CONTAMINATED: reads through the production pipeline's priors).
// No LLM, no model call. Nothing here edits an existing file; it IMPORTS the repo's instruments.
//
//   readProd(text, {language, arm, seed})   the production reader (mirror of the-fold/corpus-session.js readDocument + projectReferents/
//                                           projectRelations), one read returns BOTH the referent index and the relations; arms:
//                                           real      posPrior + framePrior   (the shipped nominal tier: recurring words the grammar reads as nominal)
//                                           company   posPrior only           (the heardSurfaces tier: organs/kind-standing.js discoverCompanyKinds is
//                                                                              what places a word into a `^`-signed kind that admits it as a being)
//                                           deranged  posPrior + framePrior DERANGED among their keys (eval/competence/r3-beings.mjs scramblePrior, Sattolo)
//                                           null      no prior at all (the lowercased text then has no capital witness either)
//   corpora loaders: wp (War and Peace, natural text lowercased), irc (channel-day messages), ud (a UD DEV treebank: tokens joined, PUNCT glued
//   to the previous token, as written text).  Each corpus is a list of SENTENCES, a sentence = list of {w: lowercase unit, p: glued punct, ...gold}.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { grammarFor } from "../../../the-fold/language-grammar.js";
import { createCausalTextPerceiver, textEncounters } from "../../../adapters/text/recursive.js";
import { scramblePrior } from "../../competence/r3-beings.mjs";
import { contextVectors, discoverCompanyKinds, cosine } from "../../../organs/kind-standing.js";
import { splitSentences } from "../../../adapters/text/spans.js";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NATIVE = path.join(HERE, "..", "..", "..");
export const sha = (s) => createHash("sha256").update(s).digest("hex");
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const seedOf = (...p) => parseInt(sha(["ant-production", ...p.map(String)].join("\x1f")).slice(0, 8), 16) >>> 0;

// ── the grammar (declared language), cached; the deranged copy is built once per language+seed ─────────────────────────────────────────
const grammars = new Map();
export function grammarOf(language, text = null) {
  if (!grammars.has(language)) grammars.set(language, grammarFor(language, { text }));
  return grammars.get(language);
}
const deranged = new Map();
export function derangedOf(language, seed = 20261006) {
  const k = `${language}|${seed}`;
  if (!deranged.has(k)) { const g = grammarOf(language); deranged.set(k, scramblePrior(g.posPrior, g.framePrior, seed)); }
  return deranged.get(k);
}

// ── the production read ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const ARMS = Object.freeze(["real", "company", "deranged", "null"]);
export async function readProd(text, { language, arm = "real", seed = 20261006 } = {}) {
  const g = grammarOf(language, text);
  let cfg;
  if (arm === "real") cfg = { posPrior: g.posPrior, framePrior: g.framePrior };
  else if (arm === "company") cfg = { posPrior: g.posPrior, framePrior: null };
  else if (arm === "deranged") { const d = derangedOf(language, seed); cfg = { posPrior: d.posPrior, framePrior: d.framePrior }; }
  else if (arm === "null") cfg = { posPrior: null, framePrior: null };
  else throw new Error(`unknown arm ${arm}`);
  const perceiver = createCausalTextPerceiver({
    posPrior: cfg.posPrior, framePrior: cfg.framePrior, proclitics: arm === "null" ? null : g.proclitics, enclitics: arm === "null" ? null : g.enclitics,
    contractions: arm === "null" ? null : g.contractions, reprojectEvery: null, language: g.language,
  });
  const byId = new Map();
  const rel = new Map();
  let nObs = 0;
  for (const encounter of textEncounters(text, { source: "w" })) {
    const obs = await perceiver.perceive(encounter);
    for (const o of obs) {
      nObs += 1;
      for (const e of o?.candidate?.graphEntries ?? []) {
        if (e?.schema !== "EOReferent@1") continue;
        let r = byId.get(e.id);
        if (!r) byId.set(e.id, (r = { id: e.id, surfaces: [], mentions: 0 }));
        for (const s of e.surfaces ?? []) if (!r.surfaces.includes(s)) r.surfaces.push(s);
        r.mentions += e.mentions ?? 1;
      }
      for (const h of o?.candidate?.hyperedges ?? []) {
        const key = `${h.relation}|${(h.participants ?? []).map((p) => `${p?.role ?? ""}:${p?.surface ?? p?.ref ?? ""}`).join("|")}`;
        rel.set(key, (rel.get(key) ?? 0) + 1);
      }
    }
  }
  return { referents: byId, relations: rel, nObs };
}

// ── corpora ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// A corpus = { name, language, sents: [[{w, p, g}]], docOf: (sentenceIndex) -> document id, M, ...} ; w = lowercase NFC unit (the ablation identity),
// p = punctuation glued after it, g = gold tag of that occurrence (UPOS for ud; "NAME"/null for irc; cast flag for wp) — gold is for labels only.
export const render = (sent, drop = null) => {
  const pieces = [];
  for (const t of sent) {
    if (drop && drop(t)) { if (t.p) { if (pieces.length) pieces[pieces.length - 1] += t.p; else pieces.push(t.p); } continue; }
    pieces.push(t.w + (t.p ?? ""));
  }
  let s = pieces.join(" ").trim();
  if (!s) return "";
  if (!/[.!?。؟]$/.test(s)) s += ".";
  return s;
};
export const renderWindow = (sents, drop = null) => sents.map((s) => render(s, drop)).filter(Boolean).join(" ");

const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
// tokens of free text with the punctuation that follows each; digits-only and apostrophe-edge stripped as in impact.mjs's streams
export function tokenise(text) {
  const out = [];
  let last = 0;
  const ms = [...String(text).matchAll(WORD)];
  ms.forEach((m, k) => {
    const w = m[0].replace(/^['’]+|['’]+$/g, "");
    const end = m.index + m[0].length;
    const nxt = ms[k + 1] ? ms[k + 1].index : String(text).length;
    const between = String(text).slice(end, nxt).replace(/\s+/g, "");
    if (!w) return;
    if (/^\p{N}+$/u.test(w)) { if (out.length) out[out.length - 1].p += between; return; }
    out.push({ w: w.normalize("NFC").toLowerCase(), p: between, c: /^\p{Lu}/u.test(w) });
    last = end;
  });
  void last;
  return out;
}

export function loadWP() {
  const text = fs.readFileSync("/Users/mlacy/Documents/3.0/ethos/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt", "utf8").replace(/^﻿/, "");
  const a = text.indexOf("*** START OF"), b = text.indexOf("*** END OF");
  let body = text.slice(text.indexOf("\n", a) + 1, b);
  const first = body.indexOf("BOOK ONE: 1805"), second = body.indexOf("BOOK ONE: 1805", first + 1);
  body = body.slice(second >= 0 ? second : first);
  body = body.split("\n").filter((l) => !/^\s*(CHAPTER [IVXLC]+|BOOK [A-Z]+(?:: ?\d+)?|FIRST EPILOGUE.*|SECOND EPILOGUE.*)\s*$/.test(l)).join("\n");
  const sents = [];
  for (const s of splitSentences(body)) { const t = tokenise(s.text); if (t.length >= 3) sents.push(t); }
  const ref = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/New Project/eochat-content-cv-demo/vendor/eoreader5/priors/coref/war-and-peace.json", "utf8")).referents;
  const per = ref.map((r) => new Set([r.name, r.display, ...(r.surfaces ?? [])].flatMap((f) => tokenise(f ?? "").map((t) => t.w))));
  const df = new Map(); for (const s of per) for (const w of s) df.set(w, (df.get(w) ?? 0) + 1);
  const cast = new Set([...df].filter(([, n]) => n < 3).map(([w]) => w).filter((w) => w.length >= 3));
  for (const s of sents) for (const t of s) t.g = cast.has(t.w) ? "NAME" : null;
  return { name: "wp", language: "eng", sents, docOf: () => 0, M: 128, labelTool: "eng", nameTag: "NAME" };
}

export function loadIRC({ nFiles = 6, seed = 7 } = {}) {
  const ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
  const dirs = ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"].map((d) => path.join(ROOT, d)).filter((d) => fs.existsSync(d));
  const cands = [];
  for (const d of dirs) for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".txt")).sort()) {
    const p = path.join(d, f), head = fs.readFileSync(p, "utf8").slice(0, 400);
    const m = /messages: "(\d+)"/.exec(head);
    if (m && Number(m[1]) >= 1500 && /lang: "en"/.test(head)) cands.push(p);
  }
  const rnd = mulberry32(seed);
  const files = cands.slice().sort(() => rnd() - 0.5).slice(0, nFiles).sort();
  const sents = [], docIdx = [];
  files.forEach((f, fi) => {
    const lines = fs.readFileSync(f, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
    const spoke = new Map();
    for (const [, nick] of lines) spoke.set(nick, (spoke.get(nick) ?? 0) + 1);
    const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    const nickForms = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
    const msgs = lines.map(([, nick, text]) => ({ nick: form(nick), toks: tokenise(text) })).filter((m) => m.toks.length >= 1);
    const tot = new Map(); let total = 0;
    for (const m of msgs) for (const t of m.toks) { tot.set(t.w, (tot.get(t.w) ?? 0) + 1); total += 1; }
    const topic = new Set([...nickForms].filter((n) => (tot.get(n) ?? 0) / total >= 1 / 300));
    for (const m of msgs) {
      for (const t of m.toks) t.g = nickForms.has(t.w) && !topic.has(t.w) && t.w !== m.nick ? "NAME" : null;
      sents.push(m.toks); docIdx.push(fi);
    }
  });
  return { name: "irc", language: "eng", sents, docOf: (i) => docIdx[i], M: 256, labelTool: "eng", nameTag: "NAME", files: files.map((f) => path.relative(ROOT, f)) };
}

const UD = "/private/tmp/claude-501/ud-eval";
export function loadUD(stem, { M = 128 } = {}) {
  const file = `${UD}/${stem}/dev.conllu`;
  if (/test\.conllu/.test(file)) throw new Error("TEST split refused");
  const sents = [];
  let cur = [];
  const flush = () => { if (cur.length) sents.push(cur); cur = []; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    if (line[0] === "#") continue;
    const f = line.split("\t");
    if (f.length < 10 || !/^\d+$/.test(f[0])) continue;
    const form = f[1].normalize("NFC").toLowerCase();
    if (f[3] === "PUNCT") { if (cur.length) cur[cur.length - 1].p += form; else cur.push({ w: "", p: form, g: "PUNCT" }); continue; }
    cur.push({ w: form.replace(/\s+/g, "_"), p: "", g: f[3] });
  }
  flush();
  const clean = sents.map((s) => s.filter((t) => t.w)).filter((s) => s.length >= 3);
  return { name: stem, language: stem, sents: clean, docOf: () => 0, M, labelTool: stem, nameTag: stem === "arb" ? "PROPN|X" : "PROPN" };
}

export function loadCorpus(name) {
  if (/^[a-z]+A$/.test(name)) name = name.slice(0, -1);
  if (name === "wp") return loadWP();
  if (name === "irc") return loadIRC();
  return loadUD(name);
}

// ── labels of a type inside a window (gold; EVALUATION and STRATIFICATION only) ─────────────────────────────────────────────────────────
const CLOSED = new Set(["DET", "ADP", "PRON", "AUX", "CCONJ", "SCONJ", "PART"]);
export const isNameTag = (corpus, g) => (corpus.name === "wp" || corpus.name === "irc" ? g === "NAME" : corpus.name === "arb" ? g === "PROPN" || g === "X" : g === "PROPN");
// priors only as a LABEL tool for the two English text corpora (the shipped English POS prior settles common words, as labelBook does)
let engForms = null;
const engSettled = (w) => {
  engForms ??= JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", "pos-eng.json"), "utf8")).forms;
  const c = engForms[w]; if (!c) return null; const t = Object.values(c).reduce((a, b) => a + b, 0); const [k, n] = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return n / t >= 0.5 ? k : null;
};
export function typeClass(corpus, w, occGold) {
  // occGold: gold tags of this type's occurrences in the window
  const n = occGold.length;
  if (corpus.name === "wp" || corpus.name === "irc") {
    const nameShare = occGold.filter((g) => g === "NAME").length / n;
    if (nameShare >= 0.5) return "NAME";
    if (nameShare > 0) return "AMBIG";
    const k = engSettled(w);
    if (!k) return "UNK";
    if (CLOSED.has(k)) return "FUNC";
    return k === "NOUN" ? "NOUN" : "OPEN";
  }
  const cnt = new Map(); for (const g of occGold) cnt.set(g, (cnt.get(g) ?? 0) + 1);
  const [g0, n0] = [...cnt].sort((a, b) => b[1] - a[1])[0];
  if (n0 / n < 0.5) return "AMBIG";
  if (isNameTag(corpus, g0)) return "NAME";
  if (g0 === "NOUN") return "NOUN";
  if (CLOSED.has(g0)) return "FUNC";
  return "OPEN";
}

// ── the reader's own kind standing (organs/kind-standing.js), at the END of a window ──────────────────────────────────────────────────────
// kinds = discoverCompanyKinds over the window's lowercased sentences with the window's recurring words as vocabulary, at the SAME declared
// floors heardSurfaces uses (minMentions 2, minShare 0.3, minMembers 2 — adapters/text/recursive.js line ~693). Returns Map word -> signature.
export function readerKinds(sentTexts) {
  const heard = sentTexts.map((t) => ({ text: t.toLowerCase() }));
  const counts = new Map();
  for (const s of heard) for (const w of s.text.split(/[^\p{L}\p{N}']+/u)) { if (w.length < 2) continue; counts.set(w, (counts.get(w) ?? 0) + 1); }
  const vocab = [...counts].filter(([w, n]) => n >= 2 && w.length >= (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(w) ? 2 : 3)).map(([w]) => w);
  if (!vocab.length) return new Map();
  const kinds = discoverCompanyKinds(heard, vocab, { minMentions: 2, minShare: 0.3, minMembers: 2 });
  const out = new Map();
  for (const k of kinds) for (const m of k.members) out.set(m, k.signature);
  return out;
}
export { contextVectors, discoverCompanyKinds, cosine };
