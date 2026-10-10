// eval/pockets/loaders/ud.mjs — group "ud": one pocket per Universal Dependencies treebank stem (dev + test concatenated), id ud-<stem>.
//   export async function load(onlyIds = null) -> Pocket[]      export async function loadWithReport(onlyIds) -> {pockets, rows, skipped}
// Reader: same semantics as readConlluStream in eval/law/impact.mjs (integer-ID word lines, UPOS PUNCT dropped, NFC lowercase) EXCEPT that this module also
// reads test.conllu (impact.mjs refuses a TEST split on purpose; the atlas protocol asks for dev+test, so this file has its own reader and does not touch impact.mjs).
// Extra drops needed by the Pocket contract: tokens with no letter at all (pure numbers, pure symbols). Internal spaces of a form (vie, swe, fin, ...) become "_".
// Environment options (defaults are the contract; every value used is recorded in meta): UD_SPLITS=dev,test | dev ; UD_GRAIN=words | surface.
// words = CoNLL-U word lines (multiword-token ranges split into their syntactic words); surface = the range's own surface form (orthographic words).
import fs from "node:fs";
import { tokenCount } from "../lib/pocket.mjs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { readConllu } from "./_conllu.mjs";
import { runLoader } from "./_ud_ml_run.mjs";

export const GROUP = "ud";
const ROOT = process.env.UD_ROOT ?? "/private/tmp/claude-501/ud-eval";
const SPLITS = (process.env.UD_SPLITS ?? "dev,test").split(",").map((s) => s.trim()).filter(Boolean);
const GRAIN = process.env.UD_GRAIN === "surface" ? "surface" : "words";
const BLOCK = 25;
const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];

function spec(stem) {
  return { id: `ud-${stem}`, async build() {
    const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }, units = [], docOf = [], files = [];
    let d = 0;
    for (const sp of SPLITS) {
      const file = `${ROOT}/${stem}/${sp}.conllu`;
      if (!fs.existsSync(file)) continue;
      const sents = readConllu(file, intern, st, GRAIN); files.push(`${sp}:${sents.length}`);
      sents.forEach((s, k) => { units.push(s); docOf.push(d + Math.floor(k / BLOCK)); });
      d += Math.ceil(sents.length / BLOCK);
    }
    if (!units.length) return { skip: "no conllu files" };
    const tokens = tokenCount(units), letters = units.reduce((a, u) => a + u.reduce((b, w) => b + [...w].length, 0), 0);
    return { id: `ud-${stem}`, group: GROUP, register: "treebank", language: stem.split("-")[0], script: scriptOf(units), units, docOf, meta: {
      tokenisation: GRAIN === "words" ? "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _"
        : "ud-surface: CoNLL-U surface forms (a multiword-token range kept as ONE token), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _",
      docDef: `consecutive blocks of ${BLOCK} sentences, blocked separately inside each split file (${SPLITS.join("+")})`,
      source: `${ROOT}/${stem}/{${SPLITS.join(",")}}.conllu`,
      notes: [stem === "cmn" || stem === "cmn-hans" ? `text-identical to ud-${stem === "cmn" ? "cmn-hans" : "cmn"} up to Traditional/Simplified script: the two pockets are NOT independent` : null,
        STEMS25.includes(stem) ? "stem is one of the 25 in name-company.mjs STEMS25" : "stem outside name-company.mjs STEMS25"].filter(Boolean).join("; "),
      stem, splits: SPLITS, grain: GRAIN, files, meanLettersPerToken: +(letters / tokens).toFixed(3), mwtTokenShare: +(st.mwtTokens / tokens).toFixed(4),
      spaceTokens: st.spaceTokens, droppedNoLetter: st.droppedNoLetter, punctDropped: st.punctDropped,
      testSplitUsed: SPLITS.includes("test"), inSTEMS25: STEMS25.includes(stem) } };
  } };
}

export const IDS = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).filter((s) => fs.existsSync(`${ROOT}/${s}/dev.conllu`) || fs.existsSync(`${ROOT}/${s}/test.conllu`)).sort().map((s) => `ud-${s}`) : [];
export const SPECS = IDS.map((id) => spec(id.slice(3)));
export const loadWithReport = (onlyIds = null) => runLoader(SPECS, onlyIds);
export async function load(onlyIds = null) { return (await loadWithReport(onlyIds)).pockets; }
