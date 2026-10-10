// loaders/_sibling-ent-code.mjs — SIBLING pockets (kind: code) for the confirmation of order.entSlope: the user's own repositories under /Users/mlacy/Documents/3.0, never read by an atlas pocket.
//   ent-cd-js  JavaScript (.js/.mjs/.cjs) of penelope, janus, gmail-sender, ember, fold-stack, podcast-app, muninn, municipal-db, eodb, ai-code-harness, terrain-explorer, archon-holocracy
//   ent-cd-ts  TypeScript (.ts/.tsx) of web-llm-chat, hmail, commoncite
//   ent-cd-py  Python (.py) of caselink-scraper, caselink-webapp, legistar-surveillance-scanner, MNPD-DFR, NPJ, ai-code-harness, holodeck/tools, ohs-custody (the virtualenvs .venv/.whisper-venv are NOT read)
// Tokenisation, unit (= one physical line with >= 1 token), document (= one source file) and the whole-file 300k cap are the atlas ones (_cd_util.mjs codeText/takeDocs/makePocket, as cd-cc-*).
// Dropped before building: vendored/generated trees (node_modules, dist, build, vendor, coverage, widget-out), *.min.js, *.folded.js, *.d.ts, files > 400 KB, symlinks, and any file whose bytes equal a file of
// the atlas's own user-code pocket (ethos 09-source-code, including the EO matrix app) or an earlier file of the same pocket (sha256). The result is what the 3.0 checkout held when this was written.
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/pocket.mjs";
import { newStats, sumStats, codeText, takeDocs, makePocket } from "./_cd_util.mjs";
const R3 = "/Users/mlacy/Documents/3.0", E09 = `${R3}/ethos/09-source-code`;
const SKIP_DIR = new Set(["node_modules", ".git", "dist", "build", "vendor", "coverage", "widget-out", ".venv", ".whisper-venv", "venv", "__pycache__", ".next", "out", "dist-collab"]);
const bad = (name) => /\.min\.js$|\.folded\.js$|\.d\.ts$/.test(name);
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
const atlasHashes = () => _atlas ??= new Set(fs.existsSync(E09) ? walk(E09, [".js", ".jsx", ".mjs", ".py", ".ts", ".tsx"]).map((f) => sha256(fs.readFileSync(f))) : []);
function pocket(id, language, roots, exts, notes) {
  const cand = roots.flatMap((r) => walk(`${R3}/${r}`, exts)), seen = new Set(), files = [], drop = { atlasCopy: 0, repeated: 0 };
  for (const f of cand) { const h = sha256(fs.readFileSync(f)); if (atlasHashes().has(h)) { drop.atlasCopy++; continue; } if (seen.has(h)) { drop.repeated++; continue; } seen.add(h); files.push(f); }
  const per = new Map();
  const r = takeDocs(id, files, (f, i) => { const s = newStats(); const u = codeText(fs.readFileSync(f, "utf8"), s); per.set(i, s); return u; });
  const p = makePocket({ id, register: "code", language, script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: "code tokens, identical to loaders/_cd_util.mjs codeText (the cd-cc-* rule): maximal runs of letters/marks/digits/underscore, lowercased NFC, not split on camelCase/snake_case; numeric-initial tokens, unspaced-script tokens and tokens > 64 characters dropped; lines > 1000 characters dropped; comment and string words kept; unit = physical line with >= 1 token",
    docDef: "one source file = one document (whole files, sha256(id:fileIndex) order, cap 300000 tokens)", source: `${R3}/{${roots.join(",")}} ${exts.join(",")}`, sibling: true,
    notes: `${notes}; ${files.length} unique candidate files (${cand.length} found; dropped ${JSON.stringify(drop)}), ${r.docKeys.length} in the pocket; token-drop counters of the files in the pocket: ${JSON.stringify(sumStats(r.docKeys.map((i) => per.get(i))))}` } });
  return { ...p, group: "sib" };
}
export const IDS = ["ent-cd-js", "ent-cd-ts", "ent-cd-py"];
export async function load(onlyIds = null) {
  const want = (id) => !onlyIds || onlyIds.includes(id), out = [];
  if (want("ent-cd-js")) out.push(pocket("ent-cd-js", "x-javascript", ["penelope", "janus", "gmail-sender", "ember", "fold-stack", "podcast-app", "muninn", "municipal-db", "eodb", "ai-code-harness", "terrain-explorer", "archon-holocracy"], [".js", ".mjs", ".cjs"], "the user's own JavaScript (EO tooling, mail, podcast and scraping apps)"));
  if (want("ent-cd-ts")) out.push(pocket("ent-cd-ts", "x-typescript", ["web-llm-chat", "hmail", "commoncite"], [".ts", ".tsx"], "TypeScript of a chat web app, a mail client and a citation tool in the user's 3.0 folder"));
  if (want("ent-cd-py")) out.push(pocket("ent-cd-py", "x-python", ["caselink-scraper", "caselink-webapp", "legistar-surveillance-scanner", "MNPD-DFR", "NPJ", "ai-code-harness", "holodeck/tools", "ohs-custody"], [".py"], "the user's own Python (scrapers, web apps, data pipelines)"));
  return out;
}
