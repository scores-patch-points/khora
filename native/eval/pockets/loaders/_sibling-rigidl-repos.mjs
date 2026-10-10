// loaders/_sibling-rigidl-repos.mjs — NEW repository pockets of kinds the earlier code siblings did not use (CSS stylesheets, SQL, YAML, shell scripts) for the SIBLING REPLICATION of comp.rigidL (underscore: ignored by run-atlas.mjs). NEW FILE.
// Material: files of the user's repositories under /Users/mlacy/Documents/3.0 (location rule only; no statistic of any kind was computed on any file when the rules were fixed). Top-level directories that are copies, worktrees, backups,
// retired trees or the evaluation harness itself are skipped (eoreader7-* except eoreader7-latest, eoreader6*, holodeck-*, the-fold-raw-exec, *RETIRED*, *backup*, khora-fold, er7-generated-site, khora), as are node_modules, .git, venvs,
// site-packages, dist, build, vendor, .claude, fixtures, coverage, .next, target, __pycache__, *.min.css, files over 400 KB and symlinks. Files whose sha256 equals a file of the atlas code corpus (/private/tmp/claude-501/code-corpus
// manifest, ALL languages) or of ethos 09-source-code, or an earlier candidate of the same pocket, are dropped and counted. Tokenisation, unit (a physical line with >= 1 token) and document (one file) are those of the atlas cd-cc-* pockets
// (codePocket -> _cd_util.mjs codeText / takeDocs / makePocket). Pockets below the 20,000-token / 20-document floor are returned flagged thin (never scored).
import fs from "node:fs";
import { REPOS, walk, codePocket, fileHash } from "./_sibling-common.mjs";

const CC = "/private/tmp/claude-501/code-corpus", E09 = `${REPOS}/ethos/09-source-code`;
const BAD = /(^|\/)(node_modules|\.git|\.venv|venv|site-packages|dist|build|vendor|\.claude|fixtures|coverage|\.next|target|__pycache__)(\/|$)/;
const TOPSKIP = /^(eoreader7-(?!latest$).+|eoreader6.*|holodeck-.+|the-fold-raw-exec|.*RETIRED.*|.*backup.*|khora-fold|er7-generated-site|khora)$/;
const skip = (rel, isDir) => { if (BAD.test(rel)) return true; if (!rel.includes("/") && isDir && TOPSKIP.test(rel)) return true; return !isDir && /\.min\.(css|js)$/.test(rel); };
export const SPECS = [
  { id: "rl-css-repos", exts: [".css"], language: "x-css", register: "markup", what: "CSS stylesheets" },
  { id: "rl-sql-repos", exts: [".sql"], language: "x-sql", register: "code", what: "SQL scripts and migrations" },
  { id: "rl-yaml-repos", exts: [".yml", ".yaml"], language: "x-yaml", register: "config", what: "YAML configuration" },
  { id: "rl-sh-repos", exts: [".sh"], language: "x-bash", register: "code", what: "shell scripts" },
];
export const IDS = SPECS.map((s) => s.id);
let _atlas = null;
function atlasHashes() {
  if (_atlas) return _atlas;
  const set = new Set();
  if (fs.existsSync(`${CC}/manifest.json`)) { const M = JSON.parse(fs.readFileSync(`${CC}/manifest.json`, "utf8")); for (const L of Object.values(M.languages)) for (const s of ["train", "dev", "test"]) for (const f of L[s] ?? []) if (f.sha256) set.add(f.sha256); }
  if (fs.existsSync(E09)) walk(E09, () => false, [".css", ".sql", ".yml", ".yaml", ".sh", ".js", ".py", ".c", ".h", ".cpp", ".go", ".html", ".txt", ".md"]).forEach((f) => set.add(fileHash(f)));
  return (_atlas = set);
}
export async function load(onlyIds = null) {
  const out = [], atlas = atlasHashes(), claimed = new Set();
  for (const s of SPECS) {
    if (onlyIds && !onlyIds.includes(s.id)) continue;
    const all = walk(REPOS, skip, s.exts), dropped = { atlas: 0, repeated: 0, over400k: 0 }, keep = [], seen = new Set();
    for (const f of all) {
      let st; try { st = fs.statSync(f); } catch { continue; }
      if (st.size > 400000) { dropped.over400k++; continue; }
      const h = fileHash(f);
      if (atlas.has(h)) { dropped.atlas++; continue; }
      if (seen.has(h) || claimed.has(h)) { dropped.repeated++; continue; }
      seen.add(h); keep.push({ f, h });
    }
    for (const h of seen) claimed.add(h);
    if (!keep.length) { console.error(`${s.id}: no files`); continue; }
    const p = codePocket({ id: s.id, language: s.language, register: s.register, files: keep, source: `${REPOS} ${s.exts.join(", ")} (${all.length} files walked; ${keep.length} unique candidates)`,
      notes: `${s.what} of the user's repositories; dedupe drops ${JSON.stringify(dropped)}; location exclusions: node_modules, .git, venvs, dist, build, vendor, .claude, fixtures, coverage, copies/worktrees/backups/retired trees and the khora evaluation harness` });
    p.group = "sib"; out.push(p);
  }
  return out;
}
