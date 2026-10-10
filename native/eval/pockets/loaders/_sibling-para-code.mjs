// loaders/_sibling-para-code.mjs — NEW repository-code pockets for the SIBLING REPLICATION of para.prefixCopy (underscore: ignored by run-atlas.mjs).
// Material: source files of the user's own repositories under /Users/mlacy/Documents/3.0 and the Python packages vendored in the-fold's PII virtualenv. None of these files is in the atlas: exact-bytes dedupe (sha256) against every
// code-corpus JavaScript / TypeScript / TSX / Python / HTML / Bash file and everything under ethos 09-source-code (helpers of loaders/_sibling-common.mjs: walk, dedupe, codePocket), and the six pockets are disjoint from one another
// (a file goes to the first pocket that claims it, in the order of SPECS). New pocket ids "sp-<lang>-<what>" (sp = sibling of para.prefixCopy): halves and the 300k whole-file cap use sha256 of these ids.
// Tokenisation, unit (one physical line with >= 1 token) and document (one source file) are those of the atlas cd-cc-* pockets (codePocket -> _cd_util.mjs codeText / takeDocs / makePocket).
// Choice of material is by location only (no statistic was computed on any file): authored source directories; vendored libraries, build output, dependency trees, worktree copies, fixtures, results and this evaluation harness
// itself (eval/pockets, whose files would otherwise be read by a pocket that evaluates them) are excluded.
import { REPOS, walk, dedupe, codePocket } from "./_sibling-common.mjs";

const BAD = /(^|\/)(node_modules|\.git|dist|vendor|\.claude|\.venv|venv|site-packages|fixtures|coverage|build|results|pockets|__pycache__|\.app|\.app-cur|\.app-cur2|\.app-cur-broken1|\.next[\w-]*)(\/|$)/;
const JS = [".js", ".mjs"];
const skipFold = (rel) => BAD.test(rel) || /^eval\/\.app/.test(rel);
const skipHeimdall = (rel) => BAD.test(rel) || /^dist\//.test(rel) || /^public\//.test(rel);
const skipE7 = (rel) => BAD.test(rel) || /(^|\/)(the-fold|heimdall|khora)(\/|$)/.test(rel);
const VENV = `${REPOS}/the-fold/scripts/pii/.venv/lib/python3.12/site-packages`;
const skipVenv = (rel) => /(^|\/)(__pycache__|phonenumbers|en_core_web_lg|_vendor)(\/|$)|(^|\/)spacy\/lang(\/|$)|\.dist-info(\/|$)/.test(rel);
const PYROOTS = ["khora", "the-fold", "caselink-scraper", "holodeck", "heimdall", "NPJ", "legistar-surveillance-scanner", "municipal-db", "nashville-legistar-archive", "surveillance_corpus", "caselink-webapp", "podcast", "podcast-app"];
const SHROOTS = ["khora", "the-fold", "caselink-scraper", "heimdall", "n8n-server-docs", "eo-compendium", "eodb", "janus", "symphony", "podcast", "podcast-app", "holodeck", "eoWebLLM/scripts"];
const multi = (roots) => roots.map((r) => ({ root: `${REPOS}/${r}`, name: r }));

export const SPECS = [
  { id: "sp-js-fold", language: "x-javascript", lang: "js", what: "JavaScript of the-fold", roots: [{ root: `${REPOS}/the-fold`, skip: skipFold }], exts: JS },
  { id: "sp-js-heimdall", language: "x-javascript", lang: "js", what: "JavaScript of heimdall", roots: [{ root: `${REPOS}/heimdall`, skip: skipHeimdall }], exts: JS },
  { id: "sp-js-eoreader7", language: "x-javascript", lang: "js", what: "JavaScript of eoreader7 (checkout eoreader7-latest)", roots: [{ root: `${REPOS}/eoreader7-latest`, skip: skipE7 }], exts: JS },
  { id: "sp-py-foldvenv", language: "x-python", lang: "py", what: "third-party Python packages vendored in the-fold/scripts/pii/.venv", roots: [{ root: VENV, skip: skipVenv }], exts: [".py"] },
  { id: "sp-py-first", language: "x-python", lang: "py", what: "first-party Python scripts of the user's projects", roots: PYROOTS.map((r) => ({ root: `${REPOS}/${r}`, skip: (rel) => BAD.test(rel) })), exts: [".py"] },
  { id: "sp-sh-first", language: "x-bash", lang: "sh", what: "first-party shell scripts of the user's projects", roots: SHROOTS.map((r) => ({ root: `${REPOS}/${r}`, skip: (rel) => BAD.test(rel) })), exts: [".sh"] },
];
export const IDS = SPECS.map((s) => s.id);
import fs from "node:fs";
let _cache = null;
function candidates() {
  if (_cache) return _cache;
  const claimed = new Set(), out = {};
  for (const s of SPECS) {
    const all = [];
    for (const r of s.roots) if (fs.existsSync(r.root)) all.push(...walk(r.root, r.skip, s.exts));
    const d = dedupe(all, claimed);
    for (const h of d.hashes) claimed.add(h);
    out[s.id] = { files: d.keep, walked: all.length, dropped: d.dropped };
  }
  return (_cache = out);
}
export async function load(onlyIds = null) {
  const C = candidates(), out = [];
  for (const s of SPECS) {
    if (onlyIds && !onlyIds.includes(s.id)) continue;
    const c = C[s.id];
    try {
      out.push(codePocket({ id: s.id, language: s.language, files: c.files, source: `${s.roots.map((r) => r.root).join(", ")} (${s.exts.join(",")}; ${c.walked} files walked; ${c.files.length} unique candidates)`,
        notes: `${s.what}; dedupe drops ${JSON.stringify(c.dropped)}; excluded by location: node_modules, .git, dist, vendor, .claude worktrees, .venv outside the vendored set, fixtures, build output, results, eval/pockets` }));
    } catch (e) { console.error(`${s.id}: ${String(e.message).slice(0, 200)}`); }
  }
  return out;
}
