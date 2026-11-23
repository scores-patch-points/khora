// demo/knowledge.mjs — the hyperlexicon + the priors + the dictionary, so the demo can talk about any
// word, not just what is already in the fold.
//
//   hyperlexicon (HyperlexiconBin@2)  surface -> node, part of speech, lemma (of), giver — what the
//                                      givers wrote, for any word, with provenance.
//   priors (pos-eng, pronunciation)    UPOS (Universal Dependencies tag) and the IPA pronunciation.
//   dictionary (kaikki-en, pharos)     the definitions (glosses) — "what does it mean".
//
// The hyperlexicon v2 store has no gloss.bin (built before glosses were kept), so the definition
// comes from the kaikki dictionary; the hyperlexicon supplies the giver-named parts of speech and the
// lemma a surface is a form of. Lookups are cached; the dictionary is streamed once per uncached word.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { openHyperlexiconBin } from "/Users/mlacy/janus-main/native/organs/hyperlexicon/bin.mjs";
import { makeKindGiver } from "../adapters/text/kind-hierarchy.js";

const HL_DIR = process.env.HYPERLEXICON_DIR || "/Users/mlacy/hyperlexicon/v2";
const PRIORS_DIR = process.env.KHORA_PRIORS_DIR || "/Users/mlacy/janus-main/priors";
const KAIKKI = process.env.KAIKKI_EN || "/tmp/given-pharos/kaikki-en.jsonl";

export function makeKnowledge({ hlDir = HL_DIR, priorsDir = PRIORS_DIR, kaikki = KAIKKI } = {}) {
  let hl = null;
  try { hl = openHyperlexiconBin(hlDir); }
  catch { hl = null; }

  const posPrior = (() => { try { return JSON.parse(fs.readFileSync(path.join(priorsDir, "pos-eng.json"), "utf8")).forms; } catch { return null; } })();
  const pron = (() => { try { return JSON.parse(fs.readFileSync(path.join(priorsDir, "pronunciation-eng.json"), "utf8")).words; } catch { return null; } })();
  const glossCache = new Map();
  const entityCache = new Map();
  const kindGiver = makeKindGiver({});

  const hlNames = (word) => {
    if (!hl) return null;
    try {
      const r = hl.answer({ op: "names", surfaces: [word], lang: "en" });
      const s = r.surfaces?.[word];
      return (s?.here ?? []).map((x) => ({ node: x.node, kind: x.kind, pos: x.pos, of: x.of ?? [], giver: x.giver }));
    } catch { return null; }
  };

  const glosses = async (word) => {
    if (glossCache.has(word)) return glossCache.get(word);
    const out = [];
    if (fs.existsSync(kaikki)) {
      const needle = `"addr":"lemma:${word}"`;
      const rl = readline.createInterface({ input: fs.createReadStream(kaikki), crlfDelay: Infinity });
      for await (const line of rl) {
        if (out.length >= 5) { rl.close(); break; }
        if (line.includes(needle)) { try { const g = JSON.parse(line).body?.gloss; if (g) out.push(g); } catch { /* torn line */ } }
      }
    }
    glossCache.set(word, out);
    return out;
  };

  const entity = async (word) => {
    if (entityCache.has(word)) return entityCache.get(word);
    let e = null;
    try { e = await kindGiver.entityInfo(word); } catch { e = null; }
    entityCache.set(word, e);
    return e;
  };
  const kind = async (word) => {
    try { return await kindGiver.kindChain(word); } catch { return null; }
  };

  return {
    hasHyperlexicon: !!hl,
    async lookup(word) {
      const w = String(word ?? "").toLowerCase();
      if (!w) return { word: w, hyperlexicon: null, upos: null, ipa: null, glosses: [], primary: null, entity: null };
      const gs = await glosses(w);
      const e = await entity(w);
      return { word: w, hyperlexicon: hlNames(w), upos: posPrior?.[w] ?? null, ipa: pron?.[w]?.ipa ?? null, glosses: gs, primary: primaryGloss(gs), entity: e };
    },
    async reference(word) { const e = await entity(String(word ?? "").toLowerCase()); return e; },
    async person(word) { try { return await kindGiver.personOf(String(word ?? "").toLowerCase()); } catch { return null; } },
    async kindOf(word) { return kind(String(word ?? "").toLowerCase()); },
  };
}

// a cross-reference is not a definition: "Initialism of X", "past participle of X", "Alternative form
// of X" point at another word instead of saying what THIS one means. The primary gloss is the first
// real definition, so "dog" answers "A mammal of the family Canidae", not "Initialism of digital
// on-screen graphic". This is a closed class of markers, not a sense guess.
const CROSS_REF = /^(initialism|acronym|abbreviation|short for|clipping|ellipsis|aphetic form|alternative (form|spelling)|variant (form|spelling)|obsolete (form|spelling)|dated (form|spelling)|misspelling|nonstandard (form|spelling)|eye dialect|pronunciation (spelling|variant)|syncopic form|contraction|(simple |)past( tense)?( and past participle)? of|present participle( and gerund)? of|past participle of|plural of|singular of|comparative form of|superlative form of|inflection of|third-person singular( simple present)? of|form of)/i;
const primaryGloss = (gs) => gs.find((g) => !CROSS_REF.test(g)) ?? gs[0] ?? null;
