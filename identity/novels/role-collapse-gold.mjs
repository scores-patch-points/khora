// role-collapse-gold.mjs <test|dev|B> [--shift] [--k 20] — PREREG-ROUND32-SUPERPOSITION.md (arms OFF, R31, R32; K on R32). Adapted from name-convention-gold.mjs (round 31).
// Per document: the canonical read (readToWeft) OFF and ON (`readerOptions.nameConvention: true`), and, with --shift (every gold NOUN token's
// first letter upper-cased; lengths and gold offsets unchanged), K random-refusal control arms (the same GROUND, the same number of capital
// surfaces refused at random). Scored against GUM's gold mentions: NB (cast spans on a gold mention headed PROPN), FB (on one headed NOUN and
// none headed PROPN), R (gold PROPN-headed mentions covered). Output: /tmp/gum-data/r31-<split><-shift>.json. Pass GUM_DIR (the .conllu files).
import fs from "node:fs"; import path from "node:path"; import { pathToFileURL, fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const KH = path.resolve(HERE, "..", ".."); const imp = (p) => import(pathToFileURL(path.join(KH, p)).href);
const { parseGum, slicesOf } = await imp("eval/referents/pronoun-golden.mjs"); const { readToWeft } = await imp("native/the-fold/read-process.mjs");
const split = process.argv[2]; const SHIFT = process.argv.includes("--shift"); const ki = process.argv.indexOf("--k"); const K = ki > 0 ? +process.argv[ki + 1] : 20;
const DIR = process.env.GUM_DIR ?? "/home/user/data/gum";
const docs = split === "B" ? slicesOf(parseGum(path.join(DIR, "en_gum-ud-train.conllu"))).B : parseGum(path.join(DIR, `en_gum-ud-${split}.conllu`));
const upFirst = (text, at) => text.slice(0, at) + text[at].toUpperCase() + text.slice(at + 1);
const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0;
const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); };
function score(w, ms) {
  const spans = []; for (const c of w.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) spans.push([a, b]);
  let NB = 0, FB = 0;
  for (const [a, b] of spans) { const on = ms.filter((m) => overlap(a, b, m.a, m.b)); if (on.some((m) => m.upos === "PROPN")) NB++; else if (on.some((m) => m.upos === "NOUN")) FB++; }
  const gp = ms.filter((m) => m.upos === "PROPN"); const covered = gp.filter((m) => spans.some(([a, b]) => overlap(a, b, m.a, m.b))).length;
  return { NB, FB, gp: gp.length, covered, spans: spans.length };
}
const out = [];
for (const doc of docs.sort((x, y) => (x.id < y.id ? -1 : 1))) {
  const sents = doc.sents.map((s) => { let t = s.text; if (SHIFT) for (const tk of s.tokens) if (tk.upos === "NOUN" && tk.end > tk.start) t = upFirst(t, tk.start); return t; });
  const text = sents.join(" "); const offs = []; let o = 0; for (const t of sents) { offs.push(o); o += t.length + 1; }
  const ms = []; doc.sents.forEach((s, si) => s.mentions.forEach((m) => ms.push({ a: offs[si] + m.c0, b: offs[si] + m.c1, upos: m.goldHead.upos })));
    const rd = (ro) => readToWeft(text, { address: "gum:" + doc.id, language: "eng", readerOptions: ro });
  const off = rd({}), r31 = rd({ nameConvention: true }), r32 = rd({ roleCollapse: true }); const rep = r32.roleCollapseReport ?? null;
  // "on" is R32 (the summary compares on against off); r31 is kept beside it for H5
  const row = { id: doc.id, off: score(off, ms), on: score(r32, ms), r31: score(r31, ms), fired: !!rep?.groundFired, refused: rep?.demoted?.length ?? 0, refusedSample: (rep?.demoted ?? []).slice(0, 12), bound: (rep?.rows ?? []).filter((x) => x.act === "binding").length };
  if (SHIFT && row.refused > 0) {
    row.K = [];
    for (let s = 1; s <= K; s++) { const R = rng(20261128 + s); const demote = (xs, n) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }; row.K.push(score(rd({ roleCollapse: { demote } }), ms)); }
  }
  out.push(row); console.error(split, SHIFT ? "shift" : "plain", doc.id, "ground", row.fired, "demoted", row.refused, "FB", row.off.FB, "->", row.on.FB, "NB", row.off.NB, "->", row.on.NB);
}
fs.mkdirSync("/tmp/gum-data", { recursive: true });
const file = `/tmp/gum-data/r32-${split}${SHIFT ? "-shift" : ""}.json`; fs.writeFileSync(file, JSON.stringify(out)); console.log(file, out.length, "documents");
