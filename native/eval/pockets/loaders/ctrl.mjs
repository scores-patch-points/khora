// loaders/ctrl.mjs — group "ct": SHUFFLED-REAL LAW-FREE CONTROLS (atlas-run phase, new file). Each control keeps one real pocket's unigram counts, its multiset of unit lengths and its
// number of units per document, and destroys everything else: all tokens are shuffled globally, unit lengths are re-assigned to units by a global shuffle. Every statistic should
// therefore be a null draw (except lexicon-level ones, which are inert under the atlas nulls). They calibrate the false-PRESENT rate on REAL vocabularies, sizes and unit-length laws.
// Controls are instrument checks: classify-atlas excludes group "ct" from every law-level count, exactly like the planted pockets.
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import { rngOf, seedOf } from "../lib/pocket.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCES = ["ud-eng", "ud-fin", "ud-spa", "bk-pride-prej", "bk-moby-dick", "bk-cryptic", "oc-irc-ubuntu-0406", "oc-cosem", "cd-cc-python", "cd-cc-json", "cd-chess-lichess", "cd-smiles-chembl",
  "fm-law-de", "fm-pali-dn", "fm-wlc-torah", "ml-grc-homer", "ml-lat-livy", "ml-lzh-shiji", "ml-arb-hadith", "cd-ipa-latn"];
const LOADERS = ["ud.mjs", "ml.mjs", "books.mjs", "formal.mjs", "formal-legal.mjs", "formal-reference.mjs", "organic.mjs", "codemisc.mjs"];
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export async function load(onlyIds = null) {
  const want = SOURCES.filter((s) => !onlyIds || onlyIds.includes(`ct-${s}`));
  const out = [];
  for (const sid of want) {
    let src = null;
    for (const f of LOADERS) { const m = await import(pathToFileURL(path.join(HERE, f)).href); const r = (await m.load([sid])).filter((p) => p.id === sid); if (r.length) { src = r[0]; break; } }
    if (!src) continue;
    const rnd = rngOf(seedOf("ctrl-v1", sid)), flat = shuffle(src.units.flat(), rnd), lens = shuffle(src.units.map((u) => u.length), rnd);
    let o = 0; const units = lens.map((n) => { const u = flat.slice(o, o + n); o += n; return u; });
    out.push({ id: `ct-${sid}`, group: "ct", register: "control", language: src.language, script: src.script ?? null, units, docOf: src.docOf.slice(),
      meta: { tokenisation: `control of ${sid}: ${src.meta?.tokenisation ?? ""}`, docDef: "same units-per-document counts as the source", source: `shuffled-real control of ${sid}`, controlOf: sid,
        notes: "tokens shuffled globally, unit lengths re-assigned by a global shuffle; law-free by construction apart from lexicon-level quantities" } });
  }
  return out;
}
