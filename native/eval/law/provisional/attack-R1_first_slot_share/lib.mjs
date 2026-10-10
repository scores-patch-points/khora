// attack-R1_first_slot_share/lib.mjs: own loader, own stream index, own R1 score and feature columns, own matching keys. NEW FILE. Edits nothing. Reads split.json (data only).
// The R1 score is re-implemented from the rule text: ISHARE = (a+1)/(b+2), a = EARLIER messages where the form is the first word, b = EARLIER messages containing it (prefix only).
// The score functions below take ONLY the token streams T (arrays of lowercase tokens per message). Gold (speaker S, nicks, topic) lives in the day object and is read only by classOf().
import fs from "node:fs";
export const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
export const SPLIT = JSON.parse(fs.readFileSync(new URL("../chat-scope/split.json", import.meta.url), "utf8"));
export const SETS = { D: SPLIT.discovery.map((d) => d.key), C: SPLIT.confirm.map((d) => d.key), R: SPLIT.used.slice(), I: SPLIT.ineligible.map((d) => d.key) };
export const LANG = { ubuntu: "en", kubuntu: "en", xubuntu: "en", "ubuntu-server": "en", "ubuntu-de": "de", "ubuntu-es": "es", "ubuntu-it": "it" };
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
export const toks = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
export const nickForm = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
/** Seeded rng (mulberry32 over an FNV hash of the parts). */
export function rngOf(...parts) { let h = 2166136261; for (const c of parts.join("|")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } let a = h || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const shuffleIn = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** Day loader. opt = gold parameters (defaults = the scoper's): minSpoke, minNickChars, topicShare (null = no topic exclusion), minNegChars. */
export function loadDay(key, opt = {}) {
  const { minSpoke = 3, minNickChars = 3, topicShare = 1 / 300, minNegChars = 3, dropSpeaker = null } = opt, [channel, file] = key.split("/");
  let lines = fs.readFileSync(`${IRC_ROOT}/${key}`, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
  if (dropSpeaker) { const cnt = new Map(); for (const [, n] of lines) cnt.set(n, (cnt.get(n) ?? 0) + 1); const top = [...cnt].sort((a, b) => b[1] - a[1]).map(([n]) => n); lines = lines.filter(([, n]) => !dropSpeaker(n, top)); }
  const spoke = new Map(); for (const [, n] of lines) spoke.set(n, (spoke.get(n) ?? 0) + 1);
  const nicks = new Set([...spoke].filter(([, c]) => c >= minSpoke).map(([n]) => nickForm(n)).filter((n) => [...n].length >= minNickChars));
  const msgs = lines.map(([, n, t]) => ({ n: nickForm(n), t: toks(t) })).filter((m) => m.t.length >= 1);
  const tot = new Map(); let all = 0; for (const m of msgs) for (const w of m.t) { tot.set(w, (tot.get(w) ?? 0) + 1); all++; }
  const topic = topicShare == null ? new Set() : new Set([...nicks].filter((n) => (tot.get(n) ?? 0) / all >= topicShare));
  return { key, channel, lang: LANG[channel], year: Number(file.slice(0, 4)), T: msgs.map((m) => m.t), S: msgs.map((m) => m.n), nicks, topic, minNegChars };
}
/** GOLD (evaluation only): P = nick form (not topic, not the message's own speaker); N = ordinary token of >= minNegChars chars that is no nick form. */
export const classOf = (d, k, w) => (d.nicks.has(w) ? (!d.topic.has(w) && w !== d.S[k] ? "P" : null) : [...w].length >= d.minNegChars ? "N" : null);
const push = (mp, w, v) => (mp.get(w) ?? mp.set(w, []).get(w)).push(v);
export const lbnd = (a, x) => { if (!a) return 0; let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
/** Stream index from tokens only. msg: messages containing w; ini: messages where w is the first word; sec: second word; lst: last word (msg length >= 2); early: first or second word. */
export function buildIx(T) {
  const count = new Map(), msg = new Map(), ini = new Map(), sec = new Map(), lst = new Map(), early = new Map();
  T.forEach((m, k) => { const seen = new Set(); m.forEach((w, i) => { count.set(w, (count.get(w) ?? 0) + 1); if (!seen.has(w)) { seen.add(w); push(msg, w, k); } });
    push(ini, m[0], k); push(early, m[0], k); if (m.length > 1) { push(sec, m[1], k); if (m[1] !== m[0]) push(early, m[1], k); push(lst, m[m.length - 1], k); } });
  return { T, count, msg, ini, sec, lst, early };
}
/** THE RULE SCORE and the feature columns at message k for form w (prefix only: every quantity uses messages < k). */
export function feat(ix, k, w) {
  const M = ix.msg.get(w), I = ix.ini.get(w), b = lbnd(M, k), a = lbnd(I, k), win = (W) => b - lbnd(M, Math.max(0, k - W)), awin = (W) => a - lbnd(I, Math.max(0, k - W));
  const sec = lbnd(ix.sec.get(w), k), lst = lbnd(ix.lst.get(w), k), ear = lbnd(ix.early.get(w), k);
  return { a, b, ishare: (a + 1) / (b + 2), a1: a > 0 ? 1 : 0, c8: win(8), c32: win(32), c128: win(128), a32: awin(32), a128: awin(128),
    gap: b > 0 ? k - M[b - 1] : null, gapI: a > 0 ? k - I[a - 1] : null, secSh: (sec + 1) / (b + 2), lstSh: (lst + 1) / (b + 2), earSh: (ear + 1) / (b + 2) };
}
/** Matching keys (all computed from the occurrence o = {k,i,w,len} and prefix features f). S0 = the scoper's exact key. */
export const ibk = (i) => (i <= 3 ? i : i <= 5 ? 4 : i <= 9 ? 5 : 6);
export const fq4 = (n) => Math.floor(4 * Math.log2(Math.max(1, n)));
export const clb = (w) => Math.min(11, [...w].length);
export const mlb = (n) => (n <= 7 ? n : n <= 9 ? 8 : n <= 11 ? 9 : n <= 14 ? 10 : n <= 19 ? 11 : n <= 27 ? 12 : n <= 40 ? 13 : 14);
const bcap = (b) => (b <= 12 ? b : 13 + Math.floor(Math.log2(b - 11)));
const gb = (g) => (g == null ? -1 : Math.floor(2 * Math.log2(1 + g)));
const cexact = (n) => (n <= 30 ? n : 31 + fq4(n));
export const KEYS = {
  S0: (o, f, ix) => [ibk(o.i), fq4(ix.count.get(o.w)), clb(o.w), mlb(o.len)],
  S1: (o, f, ix) => [ibk(o.i), fq4(ix.count.get(o.w)), clb(o.w), mlb(o.len), bcap(f.b)],
  S2: (o, f, ix) => [ibk(o.i), fq4(ix.count.get(o.w)), clb(o.w), mlb(o.len), gb(f.gap)],
  S3: (o, f, ix) => [ibk(o.i), fq4(ix.count.get(o.w)), clb(o.w), mlb(o.len), bcap(f.b), gb(f.gap)],
  S4: (o, f, ix) => [ibk(o.i), cexact(ix.count.get(o.w)), clb(o.w), mlb(o.len), bcap(f.b), gb(f.gap)],
  S5: (o, f, ix) => [ibk(o.i), fq4(ix.count.get(o.w)), clb(o.w), mlb(o.len), Math.min(f.c8, 6), Math.min(f.c32, 12), Math.floor(Math.log2(1 + f.c128))],
  // S6 = PREFIX-ONLY key (no whole-day count, i.e. no future information in the matching): index bucket, char length, message length, earlier-message count b exact, recency of the last earlier mention.
  S6: (o, f, ix) => [ibk(o.i), clb(o.w), mlb(o.len), bcap(f.b), gb(f.gap)],
  // S7 = S6 + local counts (last 8 and 32 messages exact, last 128 log2 bin): the strictest causal key.
  S7: (o, f, ix) => [ibk(o.i), clb(o.w), mlb(o.len), bcap(f.b), gb(f.gap), Math.min(f.c8, 6), Math.min(f.c32, 12), Math.floor(Math.log2(1 + f.c128))],
};
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
/** sha256 of a script's pre-registration header (everything above the END marker line). */
export const headerSha = (metaUrl) => createHash("sha256").update(fs.readFileSync(fileURLToPath(metaUrl), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
/** All LATER occurrences (the form occurred earlier as a token in the stream, as the scoper) with gold class. cls: "P"|"N". */
export function laterOccs(d) {
  const seen = new Map(), out = [];
  d.T.forEach((m, k) => m.forEach((w, i) => { const c = seen.get(w) ?? 0; seen.set(w, c + 1); if (c === 0) return; const g = classOf(d, k, w); if (g) out.push({ k, i, w, len: m.length, cls: g }); }));
  return out;
}
