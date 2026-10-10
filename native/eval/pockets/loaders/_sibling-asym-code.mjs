// loaders/_sibling-asym-code.mjs — SIBLING pockets (kind: code) for the replication of comp.asym (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// MATERIAL: source files under /Users/mlacy/Documents/3.0 that no atlas pocket reads (the atlas code pockets are cd-cc-* = the polyglot GitHub corpus under /private/tmp/claude-501/code-corpus, and cd-e09-* =
//   ethos/09-source-code; this machine's own repositories are in neither). Repos chosen here differ from those of the other sibling loaders (_sibling-ent-code, _sibling-js, _sibling-py, _sibling-deplen-code, _sibling-para-code
//   use penelope, janus, gmail-sender, ember, fold-stack, podcast-app, muninn, municipal-db, eodb, ai-code-harness, terrain-explorer, archon-holocracy, web-llm-chat, hmail, commoncite, caselink-*, MNPD-DFR, NPJ, ohs-custody,
//   fold, heimdall, khora, eoreader7), so that the replications do not share files.
//   asym-cd-js  JavaScript (.js .mjs .cjs .jsx) of eochat, eochatX, eopm, ab, eo-teachings
//   asym-cd-ts  TypeScript (.ts .tsx) of opencode-fold (a fork of an open-source TypeScript project: other authors' style)
//   asym-cd-py  Python (.py) of er7-redteam (red-team harness scripts plus the vendored garak/pyrit/harmbench/inspect sources it carries; the venv is NOT read)
// Tokenisation, unit (= one physical line with >= 1 token), document (= one source file) and the whole-file 300k cap are the atlas ones (_cd_util.mjs codeText/takeDocs/makePocket, as cd-cc-*).
// Dropped BEFORE building (rules fixed by reading the trees, before any statistic): node_modules, .git, dist, build, vendor, coverage, venv/.venv, __pycache__, .next, out, generated trees (gen, generated), translation
//   catalogues (i18n), *.min.js, *.d.ts, files > 400 KB, symlinks, files whose bytes equal a file of ethos/09-source-code (atlas) or an earlier file of the same pocket (sha256).
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/pocket.mjs";
import { newStats, sumStats, codeText, takeDocs, makePocket } from "./_cd_util.mjs";
const R3 = "/Users/mlacy/Documents/3.0", E09 = `${R3}/ethos/09-source-code`;
const SKIP_DIR = new Set(["node_modules", ".git", "dist", "build", "vendor", "coverage", "venv", ".venv", "__pycache__", ".next", "out", "gen", "generated", "i18n", ".turbo", ".cache"]);
const bad = (name) => /\.min\.js$|\.d\.ts$/.test(name);
function walk(dir, exts, out = []) {
  let names; try { names = fs.readdirSync(dir).sort(); } catch { return out; }
  for (const n of names) {
    const p = path.join(dir, n); let st; try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) { if (!SKIP_DIR.has(n)) walk(p, exts, out); } else if (exts.includes(path.extname(n).toLowerCase()) && !bad(n) && st.size <= 400000 && st.size > 0) out.push(p);
  }
  return out;
}
let _atlas = null;
const atlasHashes = () => _atlas ??= new Set(fs.existsSync(E09) ? walk(E09, [".js", ".jsx", ".mjs", ".cjs", ".py", ".ts", ".tsx"]).map((f) => sha256(fs.readFileSync(f))) : []);
function pocket(id, language, roots, exts, notes) {
  const cand = roots.flatMap((r) => walk(`${R3}/${r}`, exts)), seen = new Set(), files = [], drop = { atlasCopy: 0, repeated: 0 };
  for (const f of cand) { const h = sha256(fs.readFileSync(f)); if (atlasHashes().has(h)) { drop.atlasCopy++; continue; } if (seen.has(h)) { drop.repeated++; continue; } seen.add(h); files.push(f); }
  const per = new Map();
  const r = takeDocs(id, files, (f, i) => { const s = newStats(); const u = codeText(fs.readFileSync(f, "utf8"), s); per.set(i, s); return u; });
  const p = makePocket({ id, register: "code", language, script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: "code tokens, identical to loaders/_cd_util.mjs codeText (the cd-cc-* rule): maximal runs of letters/marks/digits/underscore, lowercased NFC, not split on camelCase/snake_case; numeric-initial tokens, unspaced-script tokens and tokens > 64 characters dropped; lines > 1000 characters dropped; comment and string words kept; unit = physical line with >= 1 token",
    docDef: "one source file = one document (whole files, sha256(id:fileIndex) order, cap 300000 tokens)", source: `${R3}/{${roots.join(",")}} ${exts.join(",")}`, sibling: true,
    notes: `${notes}; ${files.length} unique candidate files (${cand.length} found; dropped ${JSON.stringify(drop)}), ${r.docKeys.length} in the pocket; token-drop counters: ${JSON.stringify(sumStats(r.docKeys.map((i) => per.get(i))))}` } });
  return { ...p, group: "sib" };
}
export const IDS = ["asym-cd-js", "asym-cd-ts", "asym-cd-py"];
export async function load(onlyIds = null) {
  const want = (id) => !onlyIds || onlyIds.includes(id), out = [];
  if (want("asym-cd-js")) out.push(pocket("asym-cd-js", "x-javascript", ["eochat", "eochatX", "eopm", "ab", "eo-teachings"], [".js", ".mjs", ".cjs", ".jsx"], "the user's JavaScript: chat server and scripts, a project-manager web app, tests, teaching tools"));
  if (want("asym-cd-ts")) out.push(pocket("asym-cd-ts", "x-typescript", ["opencode-fold"], [".ts", ".tsx"], "TypeScript of a coding-agent CLI/app monorepo (opencode fork), node_modules/i18n/generated trees dropped"));
  if (want("asym-cd-py")) out.push(pocket("asym-cd-py", "x-python", ["er7-redteam"], [".py"], "Python of a red-team harness and the open-source evaluation toolkits it vendors"));
  return out;
}
