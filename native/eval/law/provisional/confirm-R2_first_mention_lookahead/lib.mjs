// lib.mjs — INDEPENDENT implementation of the R2 observable, gold, matcher and the cell statistics, written from the rule text (confirm-R2_first_mention_lookahead).
// Observables (all text-only): lowercase word forms, message boundaries, the first / second / last word of a message, whole-day counts, rank bins of whole-day counts.
// GOLD (speaker field, UD UPOS) is read only inside the label functions and only to label evaluation pairs; no score reads it.
import fs from "node:fs";
export const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
export const UD_ROOT = "/private/tmp/claude-501/ud-eval";
export const LANG = { ubuntu: "en", kubuntu: "en", xubuntu: "en", "ubuntu-server": "en", "ubuntu-de": "de", "ubuntu-es": "es", "ubuntu-it": "it" };
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
export const toks = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
export const nickForm = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
/** Seeded PRNG: FNV-1a string hash -> mulberry32. */
export function rngOf(...parts) { let h = 2166136261; for (const c of parts.join("|")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } let a = h || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const shuffleIn = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const era = (y) => (y <= 2007 ? "2004-07" : y <= 2011 ? "2008-11" : "2012-15");
/** One IRC channel-day. T = token arrays per message; S = speaker form per message (GOLD ONLY); nicks = forms of speakers with >= 3 messages that day and >= 3 chars (GOLD); topic = nick forms that are >= 1/300 of the day's tokens (excluded). */
export function loadIrc(key, mode = "real") {
  const [channel, file] = key.split("/");
  const lines = fs.readFileSync(`${IRC_ROOT}/${key}`, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
  const spoke = new Map(); for (const [, n] of lines) spoke.set(n, (spoke.get(n) ?? 0) + 1);
  const nicks = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => nickForm(n)).filter((n) => n.length >= 3));
  const msgs = lines.map(([, n, t]) => ({ n: nickForm(n), t: toks(t) })).filter((m) => m.t.length >= 1);
  const tot = new Map(); let all = 0; for (const m of msgs) for (const w of m.t) { tot.set(w, (tot.get(w) ?? 0) + 1); all++; }
  const topic = new Set([...nicks].filter((n) => (tot.get(n) ?? 0) / all >= 1 / 300));
  let T = msgs.map((m) => m.t.slice()), S = msgs.map((m) => m.n); const r = rngOf("R2confirm-mode", key, mode);
  if (mode === "msgshuf") { const idx = shuffleIn(T.map((_, k) => k), r); T = idx.map((k) => T[k]); S = idx.map((k) => S[k]); }
  if (mode === "wordshuf") T = T.map((t) => shuffleIn(t, r));
  const label = (k, i, w) => (nicks.has(w) ? (!topic.has(w) && w !== S[k] ? "P" : null) : [...w].length >= 3 ? "N" : null);
  return { key, channel, lang: LANG[channel], year: Number(file.slice(0, 4)), era: era(Number(file.slice(0, 4))), nMsg: msgs.length, T, label };
}
/** One UD file (test.conllu) as one stream: unit = sentence of lexical tokens (UPOS not PUNCT/SYM, not all digits), lowercase NFC. Gold = UPOS (labels only). */
export function loadUd(stem, mode = "real") {
  const txt = fs.readFileSync(`${UD_ROOT}/${stem}/${process.env.R2_UD_SPLIT ?? "test"}.conllu`, "utf8"), U = []; let cur = null;
  const flush = () => { if (cur && cur.t.length) U.push(cur); cur = null; };
  for (const l of txt.split("\n")) {
    if (l.startsWith("# sent_id")) { flush(); cur = { t: [], g: [] }; continue; }
    if (!l) { flush(); continue; } if (l[0] === "#") continue;
    const c = l.split("\t"); if (c.length < 8 || /[-.]/.test(c[0]) || !cur) continue;
    if (c[3] === "PUNCT" || c[3] === "SYM") continue; const w = c[1].normalize("NFC").toLowerCase(); if (!w || /^\p{N}+$/u.test(w)) continue; cur.t.push(w); cur.g.push(c[3]);
  }
  flush(); let T = U.map((u) => u.t), G = U.map((u) => u.g); const r = rngOf("R2confirm-ud-mode", stem, mode);
  if (mode === "msgshuf") { const idx = shuffleIn(T.map((_, k) => k), r); T = idx.map((k) => T[k]); G = idx.map((k) => G[k]); }
  if (mode === "wordshuf") { const ix = T.map((t) => shuffleIn(t.map((_, j) => j), r)); T = T.map((t, k) => ix[k].map((j) => t[j])); G = G.map((g, k) => ix[k].map((j) => g[j])); }
  const propn = new Set(); U.forEach((u) => u.t.forEach((w, i) => { if (u.g[i] === "PROPN") propn.add(w); }));
  const LEX = new Set(["NOUN", "VERB", "ADJ", "ADV"]);
  const label = (k, i, w) => (G[k][i] === "PROPN" ? "P" : !propn.has(w) && LEX.has(G[k][i]) && [...w].length >= 3 ? "N" : null);
  return { key: stem, channel: stem, lang: stem, year: 0, era: "ud", nMsg: T.length, T, label };
}
