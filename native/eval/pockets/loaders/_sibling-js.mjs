// loaders/_sibling-js.mjs — three NEW JavaScript pockets for the sibling replication of fig.introRight, one per 3.0 repository: the-fold, heimdall, eoreader7 (the checkout eoreader7-latest; /3.0/eoreader7 itself holds only JSON logs).
// None of these files is in the code corpus or in ethos 09-source-code (exact-bytes dedupe against both), and the three pockets are disjoint (a file goes to the first pocket that claims it: the-fold, then heimdall, then eoreader7).
// Choice of material is by location only (no statistic was computed on any file): authored source directories; build output, vendored libraries, worktree copies, fixtures and dependency trees are excluded.
import { REPOS, walk, dedupe, codePocket } from "./_sibling-common.mjs";

const BAD = /(^|\/)(node_modules|\.git|dist|vendor|\.claude|\.venv|fixtures|coverage|build|\.app|\.app-cur|\.app-cur2|\.app-cur-broken1)(\/|$)/;
const EXTS = [".js", ".mjs"];
const skipFold = (rel) => BAD.test(rel) || /^eval\/\.app/.test(rel) || /(^|\/)(vendor|dist)(\/|$)/.test(rel);
const skipHeimdall = (rel) => BAD.test(rel) || /^dist\//.test(rel) || /^public\//.test(rel);
const skipE7 = (rel) => BAD.test(rel) || /(^|\/)(the-fold|heimdall|khora)(\/|$)/.test(rel);   // the-fold/heimdall copies inside eoreader7 belong to the other two repositories

const SPECS = [
  { id: "sib-js-fold", repo: "the-fold", root: `${REPOS}/the-fold`, skip: skipFold },
  { id: "sib-js-heimdall", repo: "heimdall", root: `${REPOS}/heimdall`, skip: skipHeimdall },
  { id: "sib-js-eoreader7", repo: "eoreader7 (checkout eoreader7-latest)", root: `${REPOS}/eoreader7-latest`, skip: skipE7 },
];

let _cache = null;
function candidates() {
  if (_cache) return _cache;
  const claimed = new Set(), out = {};
  for (const s of SPECS) {
    const all = walk(s.root, s.skip, EXTS), d = dedupe(all, claimed);
    for (const h of d.hashes) claimed.add(h);
    out[s.id] = { files: d.keep, walked: all.length, dropped: d.dropped };
  }
  return (_cache = out);
}

export const IDS = SPECS.map((s) => s.id);
export async function load(onlyIds = null) {
  const C = candidates(), out = [];
  for (const s of SPECS) {
    if (onlyIds && !onlyIds.includes(s.id)) continue;
    const c = C[s.id];
    out.push(codePocket({ id: s.id, language: "x-javascript", files: c.files, source: `${s.root} *.js, *.mjs (${c.walked} files walked; ${c.files.length} unique candidates)`,
      notes: `JavaScript (ES modules and scripts, Node and browser) of the user's repository ${s.repo}; AI-assisted authored code with long English comments; dedupe drops ${JSON.stringify(c.dropped)}; exclusions: node_modules, .git, dist, vendor, .claude worktrees, fixtures, build output${s.id === "sib-js-eoreader7" ? ", and the the-fold/heimdall/khora subtrees (other repositories)" : ""}` }));
  }
  return out;
}
