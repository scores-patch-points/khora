// loaders/_sibling-fcov-docs.mjs — NEW English technical-documentation pocket for the SIBLING REPLICATION of para.formulaCov (underscore: ignored by run-atlas.mjs). New id "sf-md-docs".
// Material: Markdown files (.md) of the user's repositories under /Users/mlacy/Documents/3.0 (top-level notes, eoreader7-latest, eo-compendium, eoreaderhandbook, the-fold-latest, eo-evidence, heimdall, holodeck), a corpus that no atlas
// pocket reads (the atlas "docs" pockets are cd-cc-markdown, GitHub README files, and cd-e09-docs, ethos 09). Exact-bytes dedupe (sha256) against every atlas code-corpus file and ethos 09, and among the candidates.
// Excluded by location: node_modules, .git, dist, vendor, .claude worktrees, results, eval/pockets (the evaluation harness itself), eochat (a vendored copy of ethos). Tokenisation, unit and document are the atlas docs rule:
// _cd_util.proseSentences (apostrophe-bearing words, fenced code skipped, sentence split after . ! ?; unit = sentence), document = one .md file, whole files in sha256(id:fileIndex) order up to the 300k cap.
import fs from "node:fs";
import { REPOS, walk, dedupe } from "./_sibling-common.mjs";
import { newStats, sumStats, proseSentences, takeDocs, makePocket } from "./_cd_util.mjs";

const BAD = /(^|\/)(node_modules|\.git|dist|vendor|\.claude|results|pockets|build|coverage|__pycache__)(\/|$)/;
const ROOTS = ["eoreader7-latest", "eo-compendium", "eoreaderhandbook", "the-fold-latest", "eo-evidence", "heimdall", "holodeck"];
export const ID = "sf-md-docs";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  let all = fs.readdirSync(REPOS).sort().filter((f) => f.endsWith(".md")).map((f) => `${REPOS}/${f}`);
  for (const r of ROOTS) if (fs.existsSync(`${REPOS}/${r}`)) all.push(...walk(`${REPOS}/${r}`, (rel) => BAD.test(rel), [".md"]));
  const d = dedupe(all), files = d.keep, per = new Map();
  const r = takeDocs(ID, files, (f, i) => { const s = newStats(); const u = proseSentences(fs.readFileSync(f.f, "utf8"), s); per.set(i, s); return u; });
  const st = sumStats(r.docKeys.map((i) => per.get(i)));
  const p = makePocket({ id: ID, register: "docs", language: "en", script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: "prose tokens as the atlas docs pockets (_cd_util.proseSentences / proseLine): maximal runs of letters/marks/digits/underscore with inner apostrophes, lowercased NFC; numeric-initial, unspaced-script and > 64-character tokens dropped; fenced code skipped; unit = sentence",
    docDef: "one Markdown file = one document (whole files, sha256(id:fileIndex) order, cap 300000 tokens)", source: `${REPOS} (${ROOTS.join(", ")}; ${all.length} .md files walked; ${files.length} unique candidates)`,
    notes: `English technical documentation written for or by agents; dedupe drops ${JSON.stringify(d.dropped)}; files in pocket ${r.docKeys.length} of ${files.length}; counters ${JSON.stringify(st)}` } });
  p.group = "sib"; return [p];
}
