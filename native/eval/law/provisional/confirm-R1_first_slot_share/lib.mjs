// confirm-R1_first_slot_share/lib.mjs — INDEPENDENT re-implementation of the R1 fixed score (ISHARE_Cinf), the matched-pair builder and the cell statistics.
// New file. Imports only generic helpers (seeded rng / shuffle, paired-AUC and bootstrap utilities) from the scoper's directory; the SCORE, the gold, the matcher are written here from the rule text.
// Observables of the rule: lowercase word tokens, message boundaries, first-word slot, counts over EARLIER messages. Gold (speaker field, UD UPOS) is used only to label the evaluation pairs.
import fs from "node:fs";
import { rngOf, shuffleIn } from "../chat-scope/load.mjs";
import { pAuc, bootPairs, bootDays, thrRule, flipQ95, round } from "../chat-scope/stats.mjs";
export { rngOf, shuffleIn, pAuc, bootPairs, bootDays, thrRule, flipQ95, round };
export const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
export const UD_ROOT = "/private/tmp/claude-501/ud-eval";
export const SEED = "confirm-R1-first-slot-share";
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
export const toks = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
export const nickForm = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
export const LANG = { ubuntu: "en", kubuntu: "en", xubuntu: "en", "ubuntu-server": "en", "ubuntu-de": "de", "ubuntu-es": "es", "ubuntu-it": "it" };
/** IRC day: T = token arrays (one per message), S = speaker form per message (GOLD ONLY), nicks = gold nick forms (spoke >= 3 msgs, >= 3 chars), topic = nick forms with day share >= 1/300 (excluded). */
export function loadIrcDay(key) {
  const [channel, file] = key.split("/");
  const lines = fs.readFileSync(`${IRC_ROOT}/${key}`, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
  const spoke = new Map(); for (const [, n] of lines) spoke.set(n, (spoke.get(n) ?? 0) + 1);
  const nicks = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => nickForm(n)).filter((n) => n.length >= 3));
  const msgs = lines.map(([, n, t]) => ({ n: nickForm(n), t: toks(t) })).filter((m) => m.t.length >= 1);
  const tot = new Map(); let all = 0; for (const m of msgs) for (const w of m.t) { tot.set(w, (tot.get(w) ?? 0) + 1); all++; }
  const topic = new Set([...nicks].filter((n) => (tot.get(n) ?? 0) / all >= 1 / 300));
  return { key, channel, lang: LANG[channel], year: Number(file.slice(0, 4)), T: msgs.map((m) => m.t), S: msgs.map((m) => m.n), nicks, topic, nTok: all };
}
/** UD file -> one stream. unit = sentence reduced to lexical tokens (UPOS not PUNCT/SYM, not all digits), lowercase NFC. G = UPOS, D = DEPREL per kept token (gold, evaluation only); genre = sent_id prefix letters; docid = newdoc id (cluster for the bootstrap; blocks of 50 sentences when the file has none). */
export function loadUd(stem, split = "test") {
  const txt = fs.readFileSync(`${UD_ROOT}/${stem}/${split}.conllu`, "utf8"), U = [];
  let sid = "", doc = "", cur = null, nd = 0;
  const flush = () => { if (cur && cur.t.length) U.push(cur); cur = null; };
  for (const l of txt.split("\n")) {
    if (l.startsWith("# newdoc")) { doc = (l.split("=")[1] ?? "d" + nd).trim(); nd++; continue; }
    if (l.startsWith("# sent_id")) { flush(); sid = l.split("=")[1].trim(); cur = { t: [], g: [], d: [], sid, doc, genre: /^[a-z]+/i.exec(sid)?.[0]?.toLowerCase() ?? "" }; continue; }
    if (!l || l[0] === "#") { if (!l) flush(); continue; }
    const c = l.split("\t"); if (c.length < 8 || /[-.]/.test(c[0]) || !cur) continue;
    const up = c[3]; if (up === "PUNCT" || up === "SYM") continue; const w = c[1].normalize("NFC").toLowerCase(); if (!w || /^\p{N}+$/u.test(w)) continue;
    cur.t.push(w); cur.g.push(up); cur.d.push(c[7]);
  }
  flush(); const noDoc = U.every((u) => !u.doc);
  return { key: stem, stem, T: U.map((u) => u.t), G: U.map((u) => u.g), D: U.map((u) => u.d), genre: U.map((u) => u.genre), sid: U.map((u) => u.sid), docid: U.map((u, k) => (noDoc ? "blk" + Math.floor(k / 50) : u.doc)) };
}
const push = (mp, w, v) => (mp.get(w) ?? mp.set(w, []).get(w)).push(v);
export const lb = (a, x) => { if (!a) return 0; let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
/** Stream index: whole-stream form counts (used only for MATCHING/controls), per-form sorted message indices (any position) and message indices where the form is the first word. */
export function streamIndex(T) {
  const count = new Map(), msgIdx = new Map(), initIdx = new Map();
  T.forEach((m, k) => { const seen = new Set(); for (const w of m) { count.set(w, (count.get(w) ?? 0) + 1); if (!seen.has(w)) { seen.add(w); push(msgIdx, w, k); } } push(initIdx, m[0], k); });
  return { T, count, msgIdx, initIdx };
}
/** THE RULE SCORE ISHARE_Cinf at message m for form w: (a+1)/(b+2), a = EARLIER messages where w is the first word, b = EARLIER messages containing w. Prefix only (index < m). */
export const ishare = (ix, w, m) => (lb(ix.initIdx.get(w), m) + 1) / (lb(ix.msgIdx.get(w), m) + 2);
export const cntEarlier = (ix, w, m) => lb(ix.msgIdx.get(w), m);
export const cnt128 = (ix, w, m) => lb(ix.msgIdx.get(w), m) - lb(ix.msgIdx.get(w), Math.max(0, m - 128));
export const THETA = 0.67;
