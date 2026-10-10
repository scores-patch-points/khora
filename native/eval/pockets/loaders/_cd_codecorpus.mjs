// loaders/_cd_codecorpus.mjs — one pocket per language of the polyglot GitHub code corpus (/private/tmp/claude-501/code-corpus, 51 languages).
// Only files with origin "fetched" and restricted:false are used. The 28 "ethos-local" files are the ethos 09-source-code files and live in the cd-e09-* pockets instead (no duplicates).
import fs from "node:fs";
import { codeText, newStats, sumStats, takeDocs, makePocket, entry, readText } from "./_cd_util.mjs";

export const CC_ROOT = "/private/tmp/claude-501/code-corpus";
const REGISTER = { html: "markup", css: "markup", latex: "markup", vue: "markup", svelte: "markup", json: "config", yaml: "config", toml: "config", markdown: "docs" };
const TOKENISATION = "code tokens: maximal runs of letters/marks/digits/underscore, lowercased NFC, NOT split on camelCase or snake_case; numeric literals (a token starting with a digit), tokens containing unspaced-script characters (Han/kana/Thai/...) and tokens longer than 64 characters are dropped; operators and punctuation dropped; comment and string-literal words are kept; unit = physical source line with at least one token";
let _manifest = null;
const manifest = () => (_manifest ??= JSON.parse(readText(`${CC_ROOT}/manifest.json`)));

export function codeCorpusEntries() {
  if (!fs.existsSync(`${CC_ROOT}/manifest.json`)) return [];
  const M = manifest();
  return Object.keys(M.languages).sort().map((lang) => {
    const id = `cd-cc-${lang.replace(/_/g, "")}`;
    return entry(id, () => {
      const L = M.languages[lang];
      const files = ["train", "dev", "test"].flatMap((s) => L[s]).filter((f) => f.origin === "fetched" && !f.restricted).sort((a, b) => (a.path < b.path ? -1 : 1));
      const per = new Map();
      const r = takeDocs(id, files, (f, i) => { const s = newStats(); const u = fs.existsSync(f.path) ? codeText(readText(f.path), s) : []; per.set(i, s); return u; });
      const st = sumStats(r.docKeys.map((i) => per.get(i)));
      const repos = new Set(r.docKeys.map((i) => files[i].repo));
      return makePocket({
        id, register: REGISTER[lang] ?? "code", language: `x-${lang.replace(/_/g, "")}`, script: "latn", units: r.units, docOf: r.docOf,
        meta: {
          tokenisation: TOKENISATION, docDef: "one source file = one document (whole files taken in sha256(id:fileIndex) order, files sorted by path, cap 300000 tokens)",
          source: `${CC_ROOT} manifest.json, language ${lang}, splits train+dev+test pooled, fetched+unrestricted files only`,
          notes: `programming/markup language, not a natural language (language code is the private-use form x-<name>); files in pocket ${r.docKeys.length} of ${files.length} candidates from ${repos.size} repositories; token-drop counters of the files in the pocket: ${JSON.stringify(st)}`,
        },
      });
    });
  });
}
