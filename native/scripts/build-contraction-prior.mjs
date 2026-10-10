// khora · build-contraction-prior — UD CoNLL-U in, ContractionPrior@1 out: how a language's
// treebank itself splits what is written as one word, so the reader's words are the grid the
// POS and frame priors were built on.
//
// WHY. UD splits "don't" -> do n't, "del" -> de el, "l'homme" -> l' homme, "ayahnya" -> ayah nya,
// "hacerlo" -> hacer lo. A reader that keeps the written word reads "arafat's" and "arafat" as two
// beings, "l'italia" as an unseen word and "del" as a possible name, and asks a frame prior (built
// on the split tokens) about neighbours it never saw. The ear already peels Arabic/Hebrew
// proclitics and Korean particles from priors derived this way; this is the same move for the
// languages whose treebank marks the split with a multi-word token or with glued tokens.
//
// WHAT (every number derived from the giver's own annotation; nothing typed):
//   splits    surface -> components, for every surface word the treebank splits at least
//             ARRIVALS_FLOOR (2) times and splits at least SETTLE (0.5) of the times it is written.
//   suffixes  bound endings ("'s" "n't" "lo" "nya") and  prefixes  bound apostrophe-final
//             beginnings ("l'" "d'" "qu'" "dell'"), kept only if the RULE, simulated over the
//             treebank by the ear's own affixPeel on every surface word, is right at least SETTLE of the times it fires (fixpoint: dropping
//             one affix can change what the next one fires on; the type map is not consulted
//             in the simulation, so a rule is judged as a generalizer). A suffix peels a SEEN stem only
//             if the stem's majority class is one the affix has been seen attached to (`hosts`:
//             classes holding >= KEY_ALPHA of its stems); an UNSEEN stem (a name) may only take an
//             affix that carries an apostrophe (`marked`) — orthography, not guesswork.
// Languages whose tokens are not written with word boundaries (more than half of the glued word
// pairs have no space) get no file: segmentation is script-segment.js's job, a typed gap here.
// Languages with their own proclitic/enclitic prior (arb heb kor) are left to it.
//
// NOT A MODEL: counts and one simulated precision per rule. Usage:
//   node native/scripts/build-contraction-prior.mjs <train.conllu> <out.json> <lang>
import { readFileSync, writeFileSync } from "node:fs";
import { parseConllu } from "../eval/competence/lib.mjs";
import { surfaceWords } from "./lib/surface-words.mjs";
import { affixPeel } from "../adapters/text/ear.js";
import { KEY_ALPHA } from "../adapters/text/keyness.js";

const [IN, OUT, LANGUAGE] = process.argv.slice(2);
if (!IN || !OUT || !LANGUAGE) { console.error("usage: build-contraction-prior.mjs <train.conllu> <out.json> <lang>"); process.exit(1); }
const ARRIVALS_FLOOR = 2, SETTLE = 0.5;
const HAS_LETTER = /\p{L}/u, APOS = /'/;
const total = (m) => Object.values(m).reduce((a, b) => a + b, 0);
const topClass = (c) => Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

const sentences = parseConllu(readFileSync(IN, "utf8"));
const words = sentences.flatMap(surfaceWords);

// the unspaced-script check: of the word tokens written next to another word token, how many have no space between them
let pairs = 0, glued = 0;
for (const s of sentences) for (let i = 1; i < s.tokens.length; i++) { const a = s.tokens[i - 1]; if (!/^[\p{L}\p{M}\p{N}]+$/u.test(a.form) || !/^[\p{L}\p{M}\p{N}]+$/u.test(s.tokens[i].form)) continue; pairs++; if (!a.spaceAfter) glued++; }
if (pairs && glued / pairs > SETTLE) { console.log(`${LANGUAGE}: no file — ${(100 * glued / pairs).toFixed(0)}% of adjacent word tokens are written without a space (segmentation is not this prior's job)`); process.exit(0); }

// the treebank's own form tally (what the ear's posPrior will be)
const forms = {};
for (const s of sentences) for (const t of s.tokens) { const f = t.form.toLowerCase().replace(/’/g, "'"); (forms[f] ??= {})[t.upos] = (forms[f][t.upos] ?? 0) + 1; }

// type-level splits
const bySurface = new Map(); // surface -> { plain, split: Map<key, {n, comps}> }
for (const w of words) {
  const r = bySurface.get(w.surface) ?? { plain: 0, split: new Map() };
  if (w.comps.length === 1) r.plain += 1;
  else { const k = w.comps.join(" "); const e = r.split.get(k) ?? { n: 0, comps: w.comps }; e.n += 1; r.split.set(k, e); }
  bySurface.set(w.surface, r);
}
const splits = {};
for (const [surface, r] of bySurface) {
  const n = [...r.split.values()].reduce((a, e) => a + e.n, 0);
  if (n < ARRIVALS_FLOOR || n / (n + r.plain) < SETTLE) continue;
  const top = [...r.split.values()].sort((a, b) => b.n - a.n)[0];
  if (top.n / n >= SETTLE) splits[surface] = top.comps;
}

// affix candidates: the last / first component of a concatenative split
const sufCand = new Map(), preCand = new Map();
for (const w of words) {
  if (w.fused && w.fused.surface.endsWith("'") && HAS_LETTER.test(w.fused.surface)) {   // a multi-word token written against the next word: dell'italia = di l' italia
    const e = preCand.get(w.fused.surface) ?? { n: 0, comps: w.fused.comps }; e.n += 1; preCand.set(w.fused.surface, e);
  }
  if (w.comps.length < 2 || w.comps.join("") !== w.surface) continue;
  const b = w.comps[w.comps.length - 1], a = w.comps[0];
  if (HAS_LETTER.test(b) && b.length < w.surface.length) { const e = sufCand.get(b) ?? { n: 0, hosts: {} }; e.n += 1; const h = w.classes[w.classes.length - 2]; e.hosts[h] = (e.hosts[h] ?? 0) + 1; sufCand.set(b, e); }
  if (HAS_LETTER.test(a) && a.endsWith("'") && a.length < w.surface.length) { const e = preCand.get(a) ?? { n: 0 }; e.n += 1; preCand.set(a, e); }
}
let suffixes = [...sufCand].filter(([, e]) => e.n >= ARRIVALS_FLOOR).map(([affix, e]) => ({ affix, marked: APOS.test(affix), hosts: Object.entries(e.hosts).filter(([, n]) => n / e.n >= KEY_ALPHA).map(([c]) => c).sort(), n_gold: e.n }));
let prefixes = [...preCand].filter(([, e]) => e.n >= ARRIVALS_FLOOR).map(([affix, e]) => ({ affix, marked: true, ...(e.comps ? { comps: e.comps } : {}), n_gold: e.n }));

// simulate the RULE (not the type map) on every surface word; drop what is not right at least SETTLE of the times it fires; repeat to a fixpoint.
// The rule is two numbers per affix (the string, its host classes), so scoring it on the words its candidates came from leaks little; scoring it
// only on words the type map misses would starve a rule that is simply always covered (n't).
const residual = words;
const posPrior = { forms };
let rounds = 0, stats = new Map();
for (; rounds < 8; rounds++) {
  stats = new Map();
  const bump = (affix, ok) => { const e = stats.get(affix) ?? { fires: 0, correct: 0 }; e.fires += 1; if (ok) e.correct += 1; stats.set(affix, e); };
  const rules = { prefixes: [...prefixes].sort((a, b) => b.affix.length - a.affix.length), suffixes: [...suffixes].sort((a, b) => b.affix.length - a.affix.length), posPrior };
  for (const w of residual) {
    const fired = affixPeel(w.surface, rules);
    if (!fired) continue;
    const { parts } = fired;
    const ok = parts.length === w.comps.length && parts.every((p, i) => p.toLowerCase() === w.comps[i]);
    // each firing is charged to the affix(es) it actually used: the head and/or the tail
    for (const u of [fired.head, fired.tail]) if (u) bump(u, ok);
  }
  const keep = (a) => { const e = stats.get(a.affix); return e && e.fires >= ARRIVALS_FLOOR && e.correct / e.fires >= SETTLE; };
  const nS = suffixes.length + prefixes.length;
  suffixes = suffixes.filter(keep); prefixes = prefixes.filter(keep);
  if (suffixes.length + prefixes.length === nS) break;
}
const withStats = (list) => list.map((a) => ({ ...a, fires: stats.get(a.affix)?.fires ?? 0, precision: Number(((stats.get(a.affix)?.correct ?? 0) / Math.max(1, stats.get(a.affix)?.fires ?? 1)).toFixed(3)) })).sort((x, y) => y.n_gold - x.n_gold);

if (!Object.keys(splits).length && !suffixes.length && !prefixes.length) { console.log(`${LANGUAGE}: no file — the treebank splits nothing the reader would meet as one written word`); process.exit(0); }
writeFileSync(OUT, JSON.stringify({
  schema: "ContractionPrior@1", language: LANGUAGE,
  provenance: {
    giver: "Universal Dependencies treebank (train split), human-annotated gold — multi-word tokens and glued tokens",
    builder: "khora native/scripts/build-contraction-prior.mjs",
    basis: "type-level splits (>= 2 splits and >= 0.5 of the surface's writings); bound affixes whose peel rule, simulated by the ear's applyAffixes over every surface word the splits do not cover, is right >= 0.5 of the times it fires",
    arrivals_floor: ARRIVALS_FLOOR, settle_share: SETTLE, key_alpha: KEY_ALPHA,
    surface_words: words.length, split_surface_types: Object.keys(splits).length, simulated_surface_words: residual.length, simulation_rounds: rounds + 1,
  },
  splits, suffixes: withStats(suffixes), prefixes: withStats(prefixes),
}, null, 1) + "\n");
const top = (l) => l.slice(0, 8).map((a) => `${a.affix}(${a.precision})`).join(" ");
console.log(`${LANGUAGE}: ${Object.keys(splits).length} splits, ${suffixes.length} suffixes [${top(withStats(suffixes))}], ${prefixes.length} prefixes [${top(withStats(prefixes))}] -> ${OUT}`);
