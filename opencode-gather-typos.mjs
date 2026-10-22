// opencode-gather-typos.mjs — a misspelt word matches no page, so a question with one reads nothing ("commerical airtlines" turned away every page).
// A word the English prior has never seen, with a word it has seen a letter or two away (transposition, doubled or dropped letter), is the
// prior's word. The prior is the Zenodotus part-of-speech form counts (cli/priors/pos-prior-en.json): the same background the gather already
// uses for "ordinary English". Capitalised words (names) and short words are left alone, and a word with two equally near candidates is not guessed.
import fs from "node:fs";

const FORMS = (() => { try { return JSON.parse(fs.readFileSync(new URL("./cli/priors/pos-prior-en.json", import.meta.url), "utf8")).forms ?? {}; } catch { return {}; } })();
const count = (w) => Object.values(FORMS[w] ?? {}).reduce((n, x) => n + x, 0);
const BY_LEN = new Map();
for (const w of Object.keys(FORMS)) if (/^[a-z]+$/.test(w)) (BY_LEN.get(w.length) ?? BY_LEN.set(w.length, []).get(w.length)).push(w);

/** Damerau-Levenshtein (optimal string alignment) distance, abandoned above `max`. */
export const distance = (a, b, max = 2) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
};

export const fixWord = (w, { forms = FORMS } = {}) => {
  const lw = w.toLowerCase();
  if (lw.length < 6 || !/^[a-z]+$/.test(lw) || count(lw) > 0 || /^\p{Lu}/u.test(w)) return null;
  const max = lw.length >= 8 ? 2 : 1;
  const cands = [];
  for (let len = lw.length - max; len <= lw.length + max; len++) for (const c of BY_LEN.get(len) ?? []) { const dist = distance(lw, c, max); if (dist <= max && count(c) >= 1) cands.push({ c, dist, n: count(c) }); }
  cands.sort((x, y) => x.dist - y.dist || y.n - x.n);
  if (!cands.length) return null;
  const best = cands[0], rival = cands.find((x) => x.c !== best.c && x.dist === best.dist && x.n * 3 > best.n);
  return rival ? null : best.c;
};

/** The text with each unknown word replaced by its near neighbour in the prior; `fixed` lists what changed. */
export const correct = (text) => {
  const fixed = [];
  const out = String(text).replace(/\p{L}+/gu, (w) => { const f = fixWord(w); if (!f) return w; fixed.push([w, f]); return /^\p{Lu}/u.test(w) ? f[0].toUpperCase() + f.slice(1) : f; });
  return { text: out, fixed };
};
