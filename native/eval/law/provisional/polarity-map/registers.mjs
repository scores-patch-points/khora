// provisional/polarity-map/registers.mjs — register loaders: UD, IRC (any channel language), books, code. GOLD is attached per token for evaluation only.
// Gold (UD UPOS, nickname metadata, capital-share book labels, parser classes) never enters a feature; classdefs map gold -> "P" (name) | "N" (matched control) | null.
import fs from "node:fs";
import path from "node:path";
import { prep, rngFor, seedFor, shuffleIn } from "./lib.mjs";
import { splitSentences } from "../../../../adapters/text/spans.js";
import { loadBook, labelBook } from "../../name-war-and-peace.mjs";
import { npView } from "../../../kinds-swarm/ant-code/lib.mjs";

export const UD_ROOT = "/private/tmp/claude-501/ud-eval";
export const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
export const LAWRES = "/Users/mlacy/Documents/3.0/khora/native/eval/law/results";
export const CODE_DATA = "/Users/mlacy/Documents/3.0/khora/native/eval/kinds-swarm/ant-code/data";
export const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
export const allStems = () => fs.readdirSync(UD_ROOT).filter((d) => fs.existsSync(path.join(UD_ROOT, d, "dev.conllu"))).sort();

// ── UD (same reading as impact.mjs readConlluStream: lowercase NFC word units, PUNCT dropped; a copy so that the split is a parameter) ──
export function readConllu(file) {
  const sents = [], upos = []; let cur = [], cu = [];
  const flush = () => { if (cur.length) { sents.push(cur); upos.push(cu); } cur = []; cu = []; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; } if (line[0] === "#") continue;
    const f = line.split("\t"); if (f.length < 10 || !/^\d+$/.test(f[0])) continue; if (f[3] === "PUNCT") continue;
    cur.push(f[1].normalize("NFC").toLowerCase()); cu.push(f[3]);
  }
  flush(); return { sents, upos };
}
export function udBase(stem, split = "dev") {
  const p = path.join(UD_ROOT, stem, `${split}.conllu`); if (!fs.existsSync(p)) return null;
  const { sents, upos } = readConllu(p); return { name: `ud-${stem}-${split}`, kind: "ud", stem, split, P: prep(sents), gold: upos };
}
export const UD_DEFS = {
  PO: (g) => (g === "PROPN" ? "P" : g === "NOUN" || g === "VERB" || g === "ADJ" ? "N" : null),
  PN: (g) => (g === "PROPN" ? "P" : g === "NOUN" ? "N" : null),
};
// ── IRC ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
const toks = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
export function usedIrcDays() {
  const used = new Set(JSON.parse(fs.readFileSync(path.join(LAWRES, "name-rule-informal.irc.json"), "utf8")).gold.files);
  for (const d of ["name-company", "name-company-pairblocks"]) { try { for (const f of JSON.parse(fs.readFileSync(path.join(LAWRES, d, "report.json"), "utf8")).C3.days) used.add(f); } catch {} }
  return used;
}
/** all candidate days of the given channels: [{id, path, n, lang}] */
export function ircCandidates(channels, minMsgs, lang, exclude = new Set()) {
  const out = [];
  for (const d of channels) { const dir = path.join(IRC_ROOT, d); if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt")).sort()) { const p = path.join(dir, f), head = fs.readFileSync(p, "utf8").slice(0, 400), m = /messages: "(\d+)"/.exec(head);
      if (m && Number(m[1]) >= minMsgs && new RegExp(`lang: "${lang}"`).test(head) && !exclude.has(`${d}/${f}`)) out.push({ id: `${d}/${f}`, path: p, n: Number(m[1]) }); } }
  return out;
}
/** pool the given days into one stream; gold per token = "P" (a nickname that spoke >= 3 messages that day, not the speaker, not a topic word) | "N" (ordinary >= 3 chars) | null. The speaker field is METADATA. */
export function ircBase(name, days) {
  const stream = [], gold = [], dayOf = [];
  days.forEach((day, di) => {
    const lines = fs.readFileSync(day.path, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
    const spoke = new Map(); for (const [, n] of lines) spoke.set(n, (spoke.get(n) ?? 0) + 1);
    const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    const nicks = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
    const msgs = lines.map(([, n, t]) => ({ n: form(n), t: toks(t) })).filter((m) => m.t.length >= 1);
    const tot = new Map(); let all = 0; for (const m of msgs) for (const w of m.t) { tot.set(w, (tot.get(w) ?? 0) + 1); all += 1; }
    const topic = new Set([...nicks].filter((n) => (tot.get(n) ?? 0) / all >= 1 / 300));
    for (const m of msgs) { stream.push(m.t); dayOf.push(di); gold.push(m.t.map((w) => (nicks.has(w) && !topic.has(w) && w !== m.n ? "P" : !nicks.has(w) && [...w].length >= 3 ? "N" : null))); }
  });
  return { name, kind: "irc", days: days.map((d) => d.id), P: prep(stream), gold, dayOf };
}
export const IRC_DEFS = { NK: (g) => g };
// ── books ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function loadText(file) { // same cleaning as name-war-and-peace.mjs loadBook, for any Gutenberg text
  let text = fs.readFileSync(file, "utf8").replace(/^﻿/, ""); const a = text.indexOf("*** START OF"), b = text.indexOf("*** END OF");
  if (a >= 0) text = text.slice(text.indexOf("\n", a) + 1, b > a ? b : undefined);
  text = text.split("\n").filter((l) => !/^\s*((CHAPTER|Chapter|BOOK|Book|PART|Part|VOLUME|Volume) [\p{L}\d.:IVXLC ]*|[IVXLC]+\.?)\s*$/u.test(l)).join("\n");
  const WORDS = /[\p{L}\p{M}\p{N}'’]+/gu, stream = [], orig = [];
  for (const s of splitSentences(text)) { const t = [], o = []; for (const m of s.text.matchAll(WORDS)) { const w = m[0].replace(/^['’]+|['’]+$/g, ""); if (!w || /^\p{N}+$/u.test(w)) continue; t.push(w.normalize("NFC").toLowerCase()); o.push(w); } if (t.length >= 3) { stream.push(t); orig.push(o); } }
  return { stream, orig };
}
export function bookBase(name, book) {
  const { cls } = labelBook(book); return { name, kind: "book", P: prep(book.stream), gold: book.stream.map((u) => u.map((w) => cls.get(w) ?? null)) };
}
export const wpBase = () => bookBase("book-war-and-peace", loadBook());
export const BOOK_DEFS = { NAMES: (g) => (g === "CHAR" || g === "NAME" ? "P" : g === "COMMON" ? "N" : null), CHAR: (g) => (g === "CHAR" ? "P" : g === "COMMON" ? "N" : null) };
// ── code (lexed files; NP view: operators dropped, one unit = one logical statement) ─────────────────────────────────────────────────
export function codeBase(lg, idx, lexDir = path.join(CODE_DATA, "lex")) {
  const lex = JSON.parse(fs.readFileSync(path.join(lexDir, `${lg}-${idx}.json`), "utf8")), v = npView(lex);
  return { name: `code-${lg}-${idx}`, kind: "code", lg, idx, P: prep(v.stream), gold: v.cls };
}
const len3 = (w) => [...w].length >= 3;
export const CODE_DEFS = { PE: (g, w) => (!len3(w) ? null : g === "U" ? "P" : g === "E" ? "N" : null), PA: (g, w) => (!len3(w) ? null : g === "U" ? "P" : g === "E" || g === "K" || g === "L" ? "N" : null) };
// ── sham class: form-hash parity splits the NEGATIVES of a classdef into pseudo-P / pseudo-N (a pipeline-bias control built to read 0.5) ─
const fnv = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
export const shamOf = (def, tag) => (g, w) => (def(g, w) === "N" ? ((fnv(tag + w) & 1) === 0 ? "P" : "N") : null);
