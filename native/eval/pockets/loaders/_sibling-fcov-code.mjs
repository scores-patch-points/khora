// loaders/_sibling-fcov-code.mjs — NEW code pockets for the SIBLING REPLICATION of para.formulaCov (underscore: ignored by run-atlas.mjs). New ids "sf-*" (sf = sibling of formulaCov): halves and the
// 300k whole-file cap hash these ids, so nothing is shared with any earlier sibling id.
// Material (all outside the atlas; exact-bytes sha256 dedupe against every atlas code-corpus JavaScript/TypeScript/TSX/Python/HTML/Bash file and everything under ethos 09-source-code, and the four pockets are
// disjoint from one another: a file goes to the first pocket that claims it, in the order of SPECS):
//   sf-js-misc    JavaScript of the user's repositories that the para.prefixCopy siblings (sp-js-*) did not take: holodeck, janus, eodb, ai-code-harness, penelope, eopm, eochat, commoncite, web-llm-chat, muninn, ember, gmail-sender, podcast-app.
//   sf-c-sdk      C / Objective-C / C++ system HEADERS of the macOS 14.4 SDK (Command Line Tools), usr/include: a different corpus, with licence boilerplate in nearly every file (the adversary of this confirmation).
//   sf-py-myenv   third-party Python packages of the virtualenv /Users/mlacy/myenv (python 3.12): numpy, matplotlib, openai, fontTools, httpx, pydantic ...
//   sf-py-nbvenv  third-party Python packages of the virtualenv /Users/mlacy/holodeck-notebook-venv (python 3.14): IPython, jedi, jsonschema, debugpy ...
// Choice of material is by location only (no statistic of any kind was computed on any file). Tokenisation, unit (physical line with >= 1 token) and document (one file) are those of the atlas cd-cc-* pockets (codePocket).
import fs from "node:fs";
import { REPOS, walk, dedupe, codePocket } from "./_sibling-common.mjs";

const BAD = /(^|\/)(node_modules|\.git|dist|vendor|\.claude|\.venv|venv|site-packages|fixtures|coverage|build|results|pockets|__pycache__|\.app|\.next[\w-]*)(\/|$)/;
const JSREPOS = ["holodeck", "janus", "eodb", "ai-code-harness", "penelope", "eopm", "eochat", "commoncite", "web-llm-chat", "muninn", "ember", "gmail-sender", "podcast-app"];
const SDK = "/Library/Developer/CommandLineTools/SDKs/MacOSX14.4.sdk/usr/include";
const MYENV = "/Users/mlacy/myenv/lib/python3.12/site-packages", NBVENV = "/Users/mlacy/holodeck-notebook-venv/lib/python3.14/site-packages";
const skipPy = (rel) => /(^|\/)(__pycache__|\w[\w.]*\.dist-info)(\/|$)/.test(rel);

export const SPECS = [
  { id: "sf-js-misc", language: "x-javascript", what: "JavaScript of the user's other repositories", roots: JSREPOS.map((r) => ({ root: `${REPOS}/${r}`, skip: (rel) => BAD.test(rel) })), exts: [".js", ".mjs"] },
  { id: "sf-c-sdk", language: "x-c", what: "system headers of the macOS 14.4 SDK (usr/include)", roots: [{ root: SDK, skip: () => false }], exts: [".h"] },
  { id: "sf-py-myenv", language: "x-python", what: "third-party Python packages of the virtualenv /Users/mlacy/myenv", roots: [{ root: MYENV, skip: skipPy }], exts: [".py"] },
  { id: "sf-py-nbvenv", language: "x-python", what: "third-party Python packages of the virtualenv /Users/mlacy/holodeck-notebook-venv", roots: [{ root: NBVENV, skip: skipPy }], exts: [".py"] },
];
export const IDS = SPECS.map((s) => s.id);
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
      const p = codePocket({ id: s.id, language: s.language, files: c.files, source: `${s.roots.map((r) => r.root).join(", ")} (${s.exts.join(",")}; ${c.walked} files walked; ${c.files.length} unique candidates)`,
        notes: `${s.what}; dedupe drops ${JSON.stringify(c.dropped)}; excluded by location: node_modules, .git, dist, vendor, .claude worktrees, fixtures, build output, results, eval/pockets, __pycache__, dist-info` });
      p.group = "sib"; out.push(p);
    } catch (e) { console.error(`${s.id}: ${String(e.message).slice(0, 200)}`); }
  }
  return out;
}
