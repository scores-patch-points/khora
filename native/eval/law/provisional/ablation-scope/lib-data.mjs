// lib-data.mjs — corpus loaders for the ablation-scope lens (NEW FILE; imports existing modules, edits none).
// Each loader returns a DOCUMENT: { name, kind, stream: string[][] (lowercased word units per message/sentence), goldPos: Set("s:i"),
//   negExclude: Set(form) (forms that must not be used as unlabelled negatives), speakers?: string[] }.
// Gold is used ONLY to label evaluation positives; the reader sees the lowercased stream and nothing else.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitSentences } from "../../../../adapters/text/spans.js";
import { loadBook } from "../../name-war-and-peace.mjs";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LAW = path.join(HERE, "..", "..");
export const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
export const COREF = "/Users/mlacy/Documents/New Project/eochat-content-cv-demo/vendor/eoreader5/priors/coref/war-and-peace.json";
export const MIDDLEMARCH = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/pg145_Middlemarch-George-Eliot.txt";
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
export const tokensOf = (text) => [...String(text).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
const nickForm = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();

/** IRC channel-days already used by the registered name tests (name-rule-informal gold.files, name-company C3.days). */
export function usedIrcDays() {
  const used = new Set();
  const rd = (p) => JSON.parse(fs.readFileSync(path.join(LAW, "results", p), "utf8"));
  for (const f of rd("name-rule-informal.irc.json").gold.files) used.add(f.replace(/\.txt$/, ""));
  for (const d of ["name-company", "name-company-pairblocks"]) for (const f of rd(`${d}/report.json`).C3.days) used.add(f.replace(/\.txt$/, ""));
  return used;
}
/** The pool of en channel-days with >= 1500 messages in the four English channels, minus the used days. */
export function ircPool() {
  const used = usedIrcDays(), out = [];
  for (const d of ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"]) {
    const dir = path.join(IRC_ROOT, d); if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt")).sort()) {
      const p = path.join(dir, f), head = fs.readFileSync(p, "utf8").slice(0, 400), m = /messages: "(\d+)"/.exec(head);
      const name = `${d}/${f.replace(/\.txt$/, "")}`;
      if (m && Number(m[1]) >= 1500 && /lang: "en"/.test(head) && !used.has(name)) out.push({ name, path: p, messages: Number(m[1]) });
    }
  }
  return out;
}

/** One IRC channel-day. NAME occurrence = body token equal to the form of a nick that spoke >= 3 messages that day, speaker differs, not a topic word. */
export function loadIrcDay(p, name) {
  const lines = fs.readFileSync(p, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
  const spoke = new Map(); for (const [, n] of lines) spoke.set(n, (spoke.get(n) ?? 0) + 1);
  const nickForms = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => nickForm(n)).filter((n) => n.length >= 3));
  const anyNick = new Set([...spoke.keys()].map(nickForm).filter((n) => n.length >= 3));
  const msgs = lines.map(([, n, t]) => ({ nick: nickForm(n), toks: tokensOf(t) })).filter((m) => m.toks.length >= 1);
  const tot = new Map(); let all = 0; for (const m of msgs) for (const t of m.toks) { tot.set(t, (tot.get(t) ?? 0) + 1); all += 1; }
  const topic = new Set([...nickForms].filter((n) => (tot.get(n) ?? 0) / all >= 1 / 300));
  const goldPos = new Set(), negExclude = new Set([...anyNick, ...topic]);
  msgs.forEach((m, k) => m.toks.forEach((t, i) => { if (nickForms.has(t) && !topic.has(t) && t !== m.nick) goldPos.add(`${k}:${i}`); }));
  return { name, kind: "irc", stream: msgs.map((m) => m.toks), speakers: msgs.map((m) => m.nick), goldPos, negExclude, goldForms: [...nickForms].filter((n) => !topic.has(n)) };
}

/** War and Peace (Maude): NAME = hand-verified cast forms (titles that serve >= 3 referents removed). Same gold as name-rule-informal.mjs. */
export function loadWp() {
  const book = loadBook();
  const ref = JSON.parse(fs.readFileSync(COREF, "utf8")).referents;
  const per = ref.map((r) => new Set([r.name, r.display, ...(r.surfaces ?? [])].flatMap((f) => tokensOf(f))));
  const df = new Map(); for (const s of per) for (const w of s) df.set(w, (df.get(w) ?? 0) + 1);
  const cast = new Set([...df].filter(([, n]) => n < 3).map(([w]) => w).filter((w) => w.length >= 3));
  const castAll = new Set([...df].map(([w]) => w));
  const goldPos = new Set();
  book.stream.forEach((sent, s) => sent.forEach((w, i) => { if (cast.has(w)) goldPos.add(`${s}:${i}`); }));
  return { name: "war-and-peace", kind: "wp", stream: book.stream, goldPos, negExclude: castAll, goldForms: [...cast] };
}
