// load.mjs — chat-scope lens: IRC day loader + gold, new file. Gold rule copied from eval/law/name-company.mjs ircDocs (speaker metadata = GOLD ONLY, never a rule input).
import fs from "node:fs";
import path from "node:path";
export const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
export const CHANNELS = ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server", "ubuntu-de", "ubuntu-es", "ubuntu-it"];
export const LANG = { ubuntu: "en", kubuntu: "en", xubuntu: "en", "ubuntu-server": "en", "ubuntu-de": "de", "ubuntu-es": "es", "ubuntu-it": "it" };
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
export const toks = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
export const nickForm = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
/** Seeded PRNG (mulberry32 from an FNV-1a string hash). */
export function rngOf(...parts) { let h = 2166136261; for (const c of parts.join("|")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } let a = h || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const shuffleIn = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** All day files with message counts. */
export function listDays() {
  const out = [];
  for (const c of CHANNELS) { const dir = path.join(IRC_ROOT, c); for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt")).sort()) out.push({ key: `${c}/${f}`, channel: c, file: f, path: path.join(dir, f), lang: LANG[c], year: Number(f.slice(0, 4)) }); }
  return out;
}
/** Load one day: msgs = [{n: speaker form (GOLD ONLY), t: lowercase tokens}], nicks = gold forms (spoke >= 3 messages, >= 3 chars), topic = nick forms with day share >= 1/300 (excluded). */
export function loadDay(d) {
  const lines = fs.readFileSync(d.path, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
  const spoke = new Map(); for (const [, n] of lines) spoke.set(n, (spoke.get(n) ?? 0) + 1);
  const nicks = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => nickForm(n)).filter((n) => n.length >= 3));
  const msgs = lines.map(([, n, t]) => ({ n: nickForm(n), t: toks(t) })).filter((m) => m.t.length >= 1);
  const tot = new Map(); let all = 0; for (const m of msgs) for (const w of m.t) { tot.set(w, (tot.get(w) ?? 0) + 1); all += 1; }
  const topic = new Set([...nicks].filter((n) => (tot.get(n) ?? 0) / all >= 1 / 300));
  return { ...d, msgs, nicks, topic, nTok: all };
}
