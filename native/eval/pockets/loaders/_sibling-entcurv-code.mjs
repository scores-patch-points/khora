// loaders/_sibling-entcurv-code.mjs — SIBLING pockets (kind: code) for the confirmation of order.entCurv: repositories under /Users/mlacy/Documents/3.0 that no atlas pocket reads and that none of the entSlope
// siblings read either (the roots below are disjoint from the roots of loaders/_sibling-ent-code.mjs):
//   ec-cd-js  JavaScript (.js/.mjs/.cjs) of heimdall, eopm, holodeck, eochat, eo-teachings, ab, NPJ, eoreader6.1-RETIRED, fold, eo-evidence, eo-historian, eoreaderhandbook
//   ec-cd-ts  TypeScript (.ts/.tsx) of opencode-fold (a clone of a third-party open-source TypeScript project: other authors than the user's own code)
//   ec-cd-py  Python (.py) of er7-redteam, nashville-legistar-archive, the-fold, khora-fold, eoreader7-latest, eo-evidence, live_priors-latest, test run (virtualenvs are NOT read)
// Tokenisation, unit (= one physical line with >= 1 token), document (= one source file) and the whole-file 300k cap are the atlas ones (_cd_util.mjs codeText/takeDocs/makePocket, as cd-cc-*).
// Dropped before building: vendored/generated trees (node_modules, dist, build, vendor, coverage, widget-out, any directory named like a virtualenv), *.min.js, *.folded.js, *.d.ts, files > 400 KB,
// symlinks, and any file whose bytes equal a file of the atlas's own user-code pocket (ethos 09-source-code, including the EO matrix app) or an earlier file of the same pocket (sha256).
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/pocket.mjs";
import { newStats, sumStats, codeText, takeDocs, makePocket } from "./_cd_util.mjs";
const R3 = "/Users/mlacy/Documents/3.0", E09 = `${R3}/ethos/09-source-code`;
const SKIP_DIR = (n) => new Set(["node_modules", ".git", "dist", "build", "vendor", "coverage", "widget-out", "__pycache__", ".next", "out", "dist-collab", "site-packages"]).has(n) || /(^|[-_.])venv$/.test(n) || n === ".venv";
const bad = (name) => /\.min\.js$|\.folded\.js$|\.d\.ts$/.test(name);
function walk(dir, exts, out = []) {
  let names; try { names = fs.readdirSync(dir).sort(); } catch { return out; }
  for (const n of names) {
    const p = path.join(dir, n); let st; try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) { if (!SKIP_DIR(n)) walk(p, exts, out); } else if (exts.includes(path.extname(n).toLowerCase()) && !bad(n) && st.size <= 400000 && st.size > 0) out.push(p);
  }
  return out;
}
let _atlas = null;
const atlasHashes = () => _atlas ??= new Set(fs.existsSync(E09) ? walk(E09, [".js", ".jsx", ".mjs", ".py", ".ts", ".tsx"]).map((f) => sha256(fs.readFileSync(f))) : []);
function pocket(id, language, roots, exts, notes) {
  const cand = roots.flatMap((r) => walk(`${R3}/${r}`, exts)), seen = new Set(), files = [], drop = { atlasCopy: 0, repeated: 0 };
  for (const f of cand) { const h = sha256(fs.readFileSync(f)); if (atlasHashes().has(h)) { drop.atlasCopy++; continue; } if (seen.has(h)) { drop.repeated++; continue; } seen.add(h); files.push(f); }
  const per = new Map();
  const r = takeDocs(id, files, (f, i) => { const s = newStats(); const u = codeText(fs.readFileSync(f, "utf8"), s); per.set(i, s); return u; });
  const p = makePocket({ id, register: "code", language, script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: "code tokens, identical to loaders/_cd_util.mjs codeText (the cd-cc-* rule): maximal runs of letters/marks/digits/underscore, lowercased NFC, not split on camelCase/snake_case; numeric-initial tokens, unspaced-script tokens and tokens > 64 characters dropped; lines > 1000 characters dropped; comment and string words kept; unit = physical line with >= 1 token",
    docDef: "one source file = one document (whole files, sha256(id:fileIndex) order, cap 300000 tokens)", source: `${R3}/{${roots.join(",")}} ${exts.join(",")}`, sibling: true,
    notes: `${notes}; ${files.length} unique candidate files (${cand.length} found; dropped ${JSON.stringify(drop)}), ${r.docKeys.length} in the pocket; files in pocket: ${r.docKeys.map((i) => path.relative(R3, files[i])).join(" | ")}; token-drop counters of the files in the pocket: ${JSON.stringify(sumStats(r.docKeys.map((i) => per.get(i))))}` } });
  return { ...p, group: "sib", meta: { ...p.meta, fileList: r.docKeys.map((i) => files[i]) } };
}
export const IDS = ["ec-cd-js", "ec-cd-ts", "ec-cd-py"];
export async function load(onlyIds = null) {
  const want = (id) => !onlyIds || onlyIds.includes(id), out = [];
  if (want("ec-cd-js")) out.push(pocket("ec-cd-js", "x-javascript", ["heimdall", "eopm", "holodeck", "eochat", "eo-teachings", "ab", "NPJ", "eoreader6.1-RETIRED", "fold", "eo-evidence", "eo-historian", "eoreaderhandbook"], [".js", ".mjs", ".cjs"], "the user's own JavaScript (EO tooling, a routing/safety tool, chat apps, document tools)"));
  if (want("ec-cd-ts")) out.push(pocket("ec-cd-ts", "x-typescript", ["opencode-fold"], [".ts", ".tsx"], "TypeScript of a third-party open-source coding-agent project cloned into the user's 3.0 folder"));
  if (want("ec-cd-py")) out.push(pocket("ec-cd-py", "x-python", ["er7-redteam", "nashville-legistar-archive", "the-fold", "khora-fold", "eoreader7-latest", "eo-evidence", "live_priors-latest", "test run"], [".py"], "the user's own Python (red-team drivers, scrapers, data scripts)"));
  return out;
}
