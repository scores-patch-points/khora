// eval/pockets/loaders/organic.mjs — GROUP "oc": pockets from ethos/19-organic-community (real human chat: SMS, IRC, email, Weibo/Douban/PTT conversation).
//   export async function load(onlyIds = null) -> Pocket[]   (lazy: build() runs only for the ids asked for)
// What enters a unit: the message BODY only (IRC "<nick>" tags, email header lines, file frontmatter never do). Nothing here uses capital letters, POS, word lists,
// stop lists or speaker names: cleaning rules are structural (line shape, delimiters, "://", brace-placeholders).
import fs from "node:fs";
import path from "node:path";
import { validate, sha256, MAX_TOKENS, MIN_TOKENS, MIN_DOCS, tokenCount } from "../lib/pocket.mjs";

export const ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community";
const GROUP = "oc";

// ---------- tokenisation ----------
// WORD grain: maximal runs of letters/marks/digits, apostrophes allowed inside a run; NFC, lowercase; a token must contain a letter (so pure numbers/marks are dropped).
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;
// ZH-RAW grain (unsegmented Chinese): Han runs -> overlapping character bigrams (a run of 1 character -> that character), other scripts -> word runs as above.
const ZH_RAW = /\p{Script=Han}+|(?:(?!\p{Script=Han})[\p{L}\p{M}\p{N}])+(?:['’](?:(?!\p{Script=Han})[\p{L}\p{M}\p{N}])+)*/gu;
const URL_CHUNK = /\S*:\/\/\S*|\bwww\.\S+/giu;     // a URL is an address, not a word of the language: dropped as one chunk (structural: "://" or leading "www.")
const BRACE_SLOT = /\{\{[^{}]*\}\}/gu;             // scrub placeholders such as {{EMAIL}} {{TWITTER}} (anonymiser artefacts): dropped, counted
export const stats = {};                           // per-build counters, reset by each builder via newStats()
export const newStats = (id) => (stats[id] = { linesSeen: 0, emptyUnits: 0, addresseeColon: 0, urlsDropped: 0, bracePlaceholders: 0, emoticonsDropped: 0, zhSingletons: 0, lowercaseUnstable: 0 });
const ENT_SLOT = /&lt;[^&\s]{0,6}&gt;|<#>/gu;                               // NUS-SMS digit-scrub marker "<#>" (XML-escaped) and kin: a scrub artefact, dropped, counted with the brace placeholders
const ENTITY = /&(?:lt|gt|amp|quot|apos|nbsp);/giu;                         // leftover XML escapes: symbols, not words
const EMOTE = /(?<![\p{L}\p{N}])[:;=]['\-]?[pPdDoO](?![\p{L}\p{N}])/gu;   // isolated ":p" ":D" ";o" style faces: a lone letter after an eye-mark would otherwise become a pseudo-word
function prep(text, S) {
  return text.replace(URL_CHUNK, () => { if (S) S.urlsDropped++; return " "; }).replace(BRACE_SLOT, () => { if (S) S.bracePlaceholders++; return " "; })
    .replace(ENT_SLOT, () => { if (S) S.bracePlaceholders++; return " "; }).replace(ENTITY, " ").replace(EMOTE, () => { if (S) S.emoticonsDropped++; return " "; });
}
const hasLetter = /\p{L}/u;
function finish(raw, S, out) {
  for (const w0 of raw) {
    const w = w0.normalize("NFC").toLowerCase().normalize("NFC");
    if (!hasLetter.test(w)) continue;
    if (w !== w.toLowerCase()) { if (S) S.lowercaseUnstable++; continue; }
    out.push(w.replace(/’/g, "'"));
  }
  return out;
}
export function tokWords(text, S = null) {
  return finish(prep(text, S).match(WORD) ?? [], S, []);
}
export function tokZhRaw(text, S = null) {
  const t = prep(text, S), raw = [];
  for (const m of t.normalize("NFC").match(ZH_RAW) ?? []) {
    const cs = [...m];
    if (/^\p{Script=Han}/u.test(m)) { if (cs.length === 1) { raw.push(m); if (S) S.zhSingletons++; } else for (let i = 0; i + 1 < cs.length; i++) raw.push(cs[i] + cs[i + 1]); }
    else raw.push(m);
  }
  return finish(raw, S, []);
}

// ---------- files ----------
export function readSrc(rel) {
  const txt = fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n?/g, "\n").replace(/^﻿/, "");
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(txt), front = {};
  if (m) for (const l of m[1].split("\n")) { const k = /^([A-Za-z_]+):\s*"?(.*?)"?\s*$/.exec(l); if (k) front[k[1]] = k[2]; }
  return { front, body: m ? txt.slice(m[0].length) : txt };
}
export const listTxt = (rel) => fs.readdirSync(path.join(ROOT, rel)).filter((f) => f.endsWith(".txt")).sort();

// ---------- cap: take WHOLE documents in the order of sha256(id:docIndex) until the next one would pass MAX_TOKENS; keep document order ----------
// docs: [{units:[[..]], tag}] in natural order. Returns {units, docOf, tags, keptDocs, totalDocs, totalTokens, keptTokens}.
export function capDocs(id, docs, max = MAX_TOKENS) {
  const sizes = docs.map((d) => tokenCount(d.units)), total = sizes.reduce((a, b) => a + b, 0);
  const order = docs.map((_, i) => i).sort((a, b) => (sha256(`${id}:${a}`) < sha256(`${id}:${b}`) ? -1 : 1));
  const keep = new Set(); let used = 0;
  if (total <= max) docs.forEach((_, i) => keep.add(i));
  else for (const i of order) { if (used + sizes[i] > max) break; keep.add(i); used += sizes[i]; }
  const units = [], docOf = [], tags = []; let d = 0;
  docs.forEach((doc, i) => { if (!keep.has(i)) return; for (const u of doc.units) { units.push(u); docOf.push(d); } tags.push(doc.tag ?? null); d++; });
  return { units, docOf, tags, keptDocs: d, totalDocs: docs.length, totalTokens: total, keptTokens: tokenCount(units) };
}
// split a list of units into ~size-unit consecutive blocks (even blocks, never an empty one)
export function blocks(units, size = 100) {
  const n = units.length, b = Math.max(1, Math.round(n / size)), out = [];
  for (let j = 0; j < b; j++) out.push(units.slice(Math.floor((j * n) / b), Math.floor(((j + 1) * n) / b)));
  return out.filter((x) => x.length);
}
export const PARTS = [];   // registry: {id, build()} pushed by the sections below

// ---------- assemble one pocket (cap by whole documents, validate, attach meta) ----------
function assemble(id, docs, spec) {
  const c = capDocs(id, docs);
  if (!c.units.length) throw new Error(`${id}: no units`);
  const S = stats[id] ?? {};
  const p = {
    id, group: GROUP, register: spec.register, language: spec.language, script: spec.script, units: c.units, docOf: c.docOf,
    meta: {
      tokenisation: spec.tokenisation, docDef: spec.docDef, source: spec.source, family: spec.family, era: spec.era ?? null,
      notes: spec.notes + ` Cap: ${c.keptDocs}/${c.totalDocs} documents, ${c.keptTokens}/${c.totalTokens} tokens kept (whole documents by sha256(id:docIndex) order, max ${MAX_TOKENS}).`,
      counters: S, docSource: c.tags, totalTokensBeforeCap: c.totalTokens, totalDocsBeforeCap: c.totalDocs,
    },
  };
  validate(p);
  return p;
}
const WORD_TOK = "word: lowercase NFC maximal runs of letters/marks/digits with inner apostrophes; every token holds a letter (pure numbers dropped); URLs ('://' or leading 'www.') dropped as chunks; no punctuation tokens.";
const SENT_BODY = "Message BODY only; the file frontmatter is metadata.";

// ---------- IRC (ubuntu-irc): unit = one message body (the <nick> tag never enters), doc = ~100 consecutive messages of ONE channel-day ----------
function ircDayDocs(ch, file, S) {
  const { body } = readSrc(`ubuntu-irc/${ch}/${file}`), msgs = [];
  for (const line of body.split("\n")) {
    const m = /^<([^>]*)> ?(.*)$/.exec(line); if (!m) continue;   // a line without a <tag> prefix would be a continuation; none occur in these files
    S.linesSeen++; if (/^[^\s:]+: /.test(m[2])) S.addresseeColon++;   // structural diagnostic only: a message opening "token: " (IRC addressee convention); kept in the text
    const t = tokWords(m[2], S); if (t.length) msgs.push(t); else S.emptyUnits++;
  }
  return blocks(msgs, 100).map((units, j) => ({ units, tag: `${file.slice(0, 10)}#${j}` }));
}
const IRC_LANG = { ubuntu: "en", kubuntu: "en", xubuntu: "en", "ubuntu-server": "en", "ubuntu-de": "de", "ubuntu-es": "es", "ubuntu-it": "it" };
// [channel, era tag ("" = whole channel), first day, last day]. Eras were fixed by hand from one token count per channel-day (recorded in organic.manifest.json under eraBasis, recomputed by
// build-organic-manifest.mjs): a channel is split only while every era keeps >= 35k tokens, and #ubuntu/#kubuntu eras are cut at roughly <= 300k tokens (the cap). The rule is not re-derived at load time.
export const ircDayTokenCount = (ch, file) => { let n = 0; for (const line of readSrc(`ubuntu-irc/${ch}/${file}`).body.split("\n")) { const m = /^<([^>]*)> ?(.*)$/.exec(line); if (m) n += tokWords(m[2]).length; } return n; };
export const IRC_CHANNELS = Object.keys(IRC_LANG);
const IRC_ERAS = [
  ["ubuntu", "0406", "2004-11-15", "2006-03-15"], ["ubuntu", "0607", "2006-07-15", "2007-07-15"], ["ubuntu", "0809", "2008-03-15", "2009-03-15"],
  ["ubuntu", "0910", "2009-07-15", "2010-07-15"], ["ubuntu", "1112", "2011-03-15", "2012-07-15"], ["ubuntu", "1315", "2013-03-15", "2015-07-15"],
  ["kubuntu", "0506", "2005-07-15", "2006-07-15"], ["kubuntu", "0708", "2007-03-15", "2008-07-15"], ["kubuntu", "0915", "2009-03-15", "2015-07-15"],
  ["ubuntu-server", "0710", "2007-11-15", "2010-07-15"], ["ubuntu-server", "1115", "2011-03-15", "2015-07-15"],
  ["ubuntu-it", "1012", "2010-11-15", "2012-07-15"], ["ubuntu-it", "1315", "2013-03-15", "2015-07-15"],
  ["xubuntu", "", "2007-03-15", "2015-07-15"], ["ubuntu-es", "", "2010-11-15", "2015-11-15"], ["ubuntu-de", "", "2010-11-15", "2015-07-15"],
];
for (const [ch, tag, from, to] of IRC_ERAS) {
  const id = `oc-irc-${ch}${tag ? "-" + tag : ""}`;
  PARTS.push({ id, build() {
    const S = newStats(id), days = listTxt(`ubuntu-irc/${ch}`).filter((f) => f.slice(0, 10) >= from && f.slice(0, 10) <= to), docs = [];
    for (const f of days) docs.push(...ircDayDocs(ch, f, S));
    return assemble(id, docs, {
      register: "chat", language: IRC_LANG[ch], script: "latn", family: `irc-${ch}`, era: `${from}..${to}`,
      tokenisation: WORD_TOK, docDef: `~100 consecutive messages (even blocks, 67-150) inside ONE channel-day; ${days.length} channel-days in this era (a channel-day is too few documents: each channel has only 10-23 sampled days).`,
      source: `ubuntu-irc/${ch}/ ${from}..${to}`,
      notes: `IRC support chat #${ch}. unit = one message body (${SENT_BODY} The leading <nick> tag is dropped; a nick typed INSIDE a body as an addressee ("nick: ...") is kept as ordinary text: it is a vocative, not the speaker field.) Messages with no token (emoticons, URL-only) are dropped. Blocks of one day may be split across discover/confirm halves, so the halves share channel-day context (weaker independence than whole-day documents).`,
    });
  } });
}

// ---------- line-per-message corpora: COSEM, NUS SMS (en, zh), LCCC. unit = one message line, doc = one source file ----------
function lineDocs(dir, S, tok) {
  const docs = [];
  for (const f of listTxt(dir)) {
    const { body } = readSrc(`${dir}/${f}`), units = [];
    for (const line of body.split("\n")) { if (!line.trim()) continue; S.linesSeen++; const t = tok(line, S); if (t.length) units.push(t); else S.emptyUnits++; }
    if (units.length) docs.push({ units, tag: f.replace(/\.txt$/, "") });
  }
  return docs;
}
PARTS.push({ id: "oc-cosem", build() {
  const id = "oc-cosem", S = newStats(id);
  return assemble(id, lineDocs("cosem", S, tokWords), {
    register: "chat", language: "en", script: "latn", family: "cosem", era: "2016-2017", tokenisation: WORD_TOK + " Scrub placeholders {{EMAIL}}/{{TWITTER}} dropped (counted).",
    docDef: "one source file = a ~500-message stretch of one group conversation (conversations 17CF01, 17CF02, 17CF03 are pooled; 40 files).", source: "cosem/*.txt (CoSEM, Gonzales et al. 2021)",
    notes: `Singapore-English online text messages (Singlish: lah, meh, ah, etc. stay as written). unit = one message line. Messages that carry no letter (e.g. "??") are dropped. ${SENT_BODY}`,
  });
} });
PARTS.push({ id: "oc-nussms-en", build() {
  const id = "oc-nussms-en", S = newStats(id);
  return assemble(id, lineDocs("nus-sms/en", S, tokWords), {
    register: "sms", language: "en", script: "latn", family: "nussms", era: "2009-2010", tokenisation: WORD_TOK,
    docDef: "one source file = one contributor's SMS for one period (25 files, ~90-200 messages each).", source: "nus-sms/en/*.txt (NUS SMS corpus, Chen & Kan 2013)",
    notes: "SMS English written by one contributor (frontmatter country=India: Indian English mixed with romanised Hindi/Bengali, SMS abbreviations). unit = one message line. Identical messages the contributor forwarded repeatedly are kept (real behaviour).",
  });
} });
PARTS.push({ id: "oc-nussms-zh", build() {
  const id = "oc-nussms-zh", S = newStats(id);
  return assemble(id, lineDocs("nus-sms/zh", S, tokZhRaw), {
    register: "sms", language: "zh", script: "hani", family: "nussms", era: "2008-2009",
    tokenisation: "CHARACTER BIGRAMS: the source is unsegmented; each run of Han characters becomes overlapping character bigrams (a run of one character stays a unigram, counted in counters.zhSingletons); non-Han words as word runs; URLs/placeholders dropped. NOT comparable at word grain with word-tokenised pockets.",
    docDef: "one source file = one contributor's SMS for one period (20 files).", source: "nus-sms/zh/*.txt (NUS SMS corpus, Chen & Kan 2013)",
    notes: "Chinese SMS (frontmatter country=China), colloquial with kaomoji and ellipses. unit = one message line.",
  });
} });
PARTS.push({ id: "oc-lccc", build() {
  const id = "oc-lccc", S = newStats(id);
  return assemble(id, lineDocs("lccc", S, tokWords), {
    register: "chat", language: "zh", script: "hani", family: "lccc", era: "2010s",
    tokenisation: "WORD grain from the source's OWN segmentation (LCCC ships space-separated words); tokens = those words with punctuation tokens and pure numbers dropped; Latin words as words.",
    docDef: "one source file = a batch of ~37 dialogues (~160-180 turns) concatenated without separators (40 files); dialogue boundaries are not recoverable, so unit adjacency across a dialogue boundary is not discourse.",
    source: "lccc/*.txt (LCCC, thu-coai, MIT)", notes: "Cleaned Weibo/Douban/PTT Chinese short conversation. unit = one turn (line).",
  });
} });

// ---------- Enron email: unit = one SENTENCE of an email body, doc = one email ----------
// Header lines ("-- <date> | <from> | <subject>"), quoted lines (leading ">"), and everything from the first FENCE line on (a line opening with >= 4 of one of - _ = * ~ : forwarded/original-message
// markers, signature rules, disclaimers; the forwarded header block that follows is thereby cut too) are removed by LINE SHAPE only. Quoted-printable remnants ("=\n" soft breaks, "=XX" bytes) are decoded.
// Hard line wraps (lines >= 60 chars long continue on the next line) are joined; sentences end at . ! ? followed by whitespace (no capital-letter cue).
const HDR = /^-- [^|\n]*\d{4}[^|\n]* \| [^|\n]* \| ?.*$/;
const FENCE = /^([-_=*~])\1{3,}/;
const CP1252 = { 0x80: "€", 0x85: "…", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—" };
const decodeQP = (t, S) => t.replace(/=\n/g, () => { S.qpSoftBreaks++; return ""; }).replace(/=([0-9A-F]{2})/g, (_, h) => { S.qpBytes++; const b = parseInt(h, 16); return CP1252[b] ?? String.fromCharCode(b); });
function enronBody(lines, S) {
  const kept = [];
  for (const l of decodeQP(lines.join("\n"), S).split("\n")) {
    const t = l.trim();
    if (FENCE.test(t)) { S.fenceCuts++; break; }
    if (t.startsWith(">")) { S.quotedLines++; continue; }
    kept.push(l.replace(/\s+$/, ""));
  }
  const paras = []; let para = [], prev = 0;
  const flush = () => { if (para.length) paras.push(para.join(" ")); para = []; };
  for (const l of kept) { if (!l.trim()) { flush(); prev = 0; continue; } if (para.length && prev < 60) flush(); para.push(l.trim()); prev = l.length; }
  flush();
  return paras.flatMap((p) => p.split(/(?<=[.!?])\s+/));
}
export function enronDocs(S) {
  Object.assign(S, { emails: 0, emptyAfterClean: 0, duplicates: 0, qpSoftBreaks: 0, qpBytes: 0, fenceCuts: 0, quotedLines: 0 });
  const docs = [], seen = new Set();
  for (const mb of fs.readdirSync(path.join(ROOT, "enron")).sort()) for (const f of listTxt(`enron/${mb}`)) {
    const { body } = readSrc(`enron/${mb}/${f}`); let cur = null; const mails = [];
    for (const line of body.split("\n")) { if (HDR.test(line)) { cur = { head: line, lines: [] }; mails.push(cur); } else if (cur) cur.lines.push(line); }
    for (const m of mails) {
      S.emails++;
      const units = [], sents = enronBody(m.lines, S);
      for (const s of sents) { const t = tokWords(s, S); if (t.length) units.push(t); }
      if (!units.length) { S.emptyAfterClean++; continue; }
      const key = m.head + "\x1f" + sents.join("\n");
      if (seen.has(key)) { S.duplicates++; continue; } seen.add(key);
      const y = /(\d{1,2}) [A-Za-z]{3} (\d{4})/.exec(m.head);
      docs.push({ units, tag: `${mb}/${f.replace(/\.txt$/, "")}`, mailbox: mb, file: f, year: y ? +y[2] : null });
    }
  }
  return docs;
}
PARTS.push({ id: "oc-enron", build() {
  const id = "oc-enron", S = newStats(id), docs = enronDocs(S);
  return assemble(id, docs, {
    register: "email", language: "en", script: "latn", family: "enron", era: "1999-2001", tokenisation: WORD_TOK + " Sentences end at . ! ? plus whitespace.",
    docDef: `one email (after cleaning and exact de-duplication on header+body; the ten mailboxes' 60 monthly files are pooled). Most emails are 1-3 sentences, so documents are short.`,
    source: "enron/*/*.txt (10 mailboxes, FERC release via CMU)",
    notes: `Workplace email BODIES only: header lines, quoted lines (leading '>'), and everything from the first fence line (>=4 of one of - _ = * ~, i.e. forwarded/original-message markers, signature rules, disclaimers) are cut by line shape; ${S.emails} emails parsed, ${S.emptyAfterClean} had no body left, ${S.duplicates} exact duplicates (same header+body, e.g. filed in several folders) dropped. The corpus bodies are truncated at the source, so ~65% of the raw bytes were headers/quotes/duplicates: only ~34k tokens survive.`,
  });
} });

// ---------- public interface ----------
export async function load(onlyIds = null) {
  const out = [];
  for (const part of PARTS) { if (onlyIds && !onlyIds.includes(part.id)) continue; out.push(part.build()); }
  return out;
}
