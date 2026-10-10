// loaders/_sibling-deplen-code.mjs — SIBLING pockets for the replication of order.depLen: the user's own repository code (JavaScript, Python, shell), never read by any atlas pocket.
// Underscore prefix: run-atlas.mjs ignores this file. Contract: export async function load(onlyIds = null) -> Pocket[].
// The atlas "cd" code pockets are (a) /private/tmp/claude-501/code-corpus fetched GitHub files (loaders/_cd_codecorpus.mjs) and (b) ethos/09-source-code upstream landmarks + the EO matrix app
// (loaders/_cd_ethos.mjs). Neither touches /Users/mlacy/Documents/3.0/{khora,the-fold,holodeck,heimdall,penelope,...}. LEAKAGE GUARD: any file here whose sha256 equals the sha256 of ANY file listed in
// the code-corpus manifest.json, or of any file under ethos/09-source-code, or of an earlier sibling file, is dropped and counted (meta.dropped.duplicate). Minified/bundled files are dropped by shape (below), counted.
// Tokenisation, unit (= one physical line with >= 1 token), document (= one source file) and the whole-document 300k cap are the atlas ones (imported from _cd_util.mjs: codeText, takeDocs, makePocket).
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/pocket.mjs";
import { codeText, newStats, sumStats, takeDocs, makePocket, entry, readText } from "./_cd_util.mjs";

const R = "/Users/mlacy/Documents/3.0";
const TOKENISATION = "code tokens: maximal runs of letters/marks/digits/underscore, lowercased NFC, NOT split on camelCase or snake_case; numeric literals (a token starting with a digit), tokens containing unspaced-script characters and tokens longer than 64 characters are dropped; operators and punctuation dropped; comment and string-literal words are kept; unit = physical source line with at least one token";
const SKIP = new Set(["node_modules", ".git", ".next", ".next-verify", ".next-stress", ".next-crispr-test", "dist", "build", "vendor", "vendors", ".claude", "__pycache__", "venv", ".venv", "site-packages", "results", "coverage", ".app-cur", ".app-cur2", "pockets", "out", "target", "third_party", "tmp"]);
const JS = [".mjs", ".js", ".cjs"];
// each set: roots (absolute dirs or files) and extensions; every set is a SEPARATE pocket; a file belongs to the first set that reaches it
export const SETS = [
  { id: "sib-code-khora-core", language: "x-javascript", exts: JS, roots: ["khora/native/organs", "khora/native/adapters", "khora/native/kernel", "khora/native/tests", "khora/native/scripts", "khora/native/contracts", "khora/native/the-fold"], what: "khora native core JavaScript (organs, adapters, kernel, tests, scripts, contracts, the-fold)" },
  { id: "sib-code-khora-eval-js", language: "x-javascript", exts: JS, roots: ["khora/native/eval"], what: "khora native eval harness JavaScript (eval/pockets itself, results and vendored trees excluded)" },
  { id: "sib-code-fold-js", language: "x-javascript", exts: JS, roots: ["the-fold"], what: "the-fold repository JavaScript (.claude worktrees, vendored and .app-cur copies excluded)" },
  { id: "sib-code-misc-js", language: "x-javascript", exts: JS, roots: ["heimdall", "holodeck", "penelope", "janus", "muninn", "ember", "hmail", "fold", "janus-fold", "khora-fold", "opencode-fold", "penelope-fold"], what: "other first-party JavaScript projects (heimdall, holodeck, penelope, janus, muninn, ember, hmail, fold ...)" },
  { id: "sib-code-py", language: "x-python", exts: [".py"], roots: ["khora", "the-fold", "caselink-scraper", "holodeck", "heimdall", "NPJ", "legistar-surveillance-scanner", "municipal-db", "nashville-legistar-archive", "surveillance_corpus", "caselink-webapp", "podcast", "podcast-app"], what: "first-party Python scripts across the user's projects" },
  { id: "sib-code-sh", language: "x-bash", exts: [".sh"], roots: ["khora", "the-fold", "caselink-scraper", "heimdall", "n8n-server-docs", "eo-compendium", "eodb", "janus", "symphony", "podcast", "podcast-app", "holodeck", "eoWebLLM/scripts"], what: "first-party shell scripts across the user's projects" },
];
export const ids = () => SETS.map((s) => s.id);

let _guard = null;
function guardHashes() {
  if (_guard) return _guard;
  const h = new Set();
  const man = "/private/tmp/claude-501/code-corpus/manifest.json";
  if (fs.existsSync(man)) { const M = JSON.parse(readText(man)); for (const L of Object.values(M.languages)) for (const s of ["train", "dev", "test"]) for (const f of L[s]) if (f.sha256) h.add(f.sha256); }
  const E09 = "/Users/mlacy/Documents/3.0/ethos/09-source-code";
  const walkAll = (d) => { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walkAll(p); else if (st.size < 3e6) h.add(sha256(fs.readFileSync(p))); } };
  if (fs.existsSync(E09)) walkAll(E09);
  return (_guard = h);
}
function walk(dir, exts, out) {
  let names; try { names = fs.readdirSync(dir).sort(); } catch { return; }
  for (const n of names) {
    if (SKIP.has(n) || n.startsWith(".next")) continue;
    const p = path.join(dir, n); let st; try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) walk(p, exts, out); else if (exts.includes(path.extname(n)) && !/\.(min|bundle)\.[a-z]+$/.test(n)) out.push(p);
  }
}
function candidates(set, stats) {
  const files = [];
  for (const r of set.roots) { const p = path.join(R, r); if (fs.existsSync(p)) walk(p, set.exts, files); }
  const guard = guardHashes(), out = [], seen = new Set(), dropped = { duplicate: 0, atlasOrCorpusDuplicate: 0, minified: 0, tooBig: 0, empty: 0, earlierSibling: 0 };
  for (const f of files.sort()) {
    const buf = fs.readFileSync(f);
    if (buf.length > 600000) { dropped.tooBig++; continue; }
    if (!buf.length) { dropped.empty++; continue; }
    const h = sha256(buf);
    if (guard.has(h)) { dropped.atlasOrCorpusDuplicate++; continue; }
    if (seen.has(h)) { dropped.duplicate++; continue; }
    if (set._earlier?.has(h)) { dropped.earlierSibling++; continue; }
    const lines = buf.toString("utf8").split(/\r\n|\n|\r/).filter((l) => l.trim());
    const longShare = lines.filter((l) => l.length > 500).length / Math.max(1, lines.length);
    if (lines.length && (buf.length / lines.length > 200 || longShare > 0.05)) { dropped.minified++; continue; }
    seen.add(h); out.push({ path: f, sha: h });
  }
  stats.dropped = dropped; stats.listed = files.length;
  return out;
}
function entries() {
  const earlier = new Set();
  return SETS.map((set) => {
    const mine = { ...set, _earlier: new Set(earlier) }, stats = {};
    const cands = () => candidates(mine, stats);
    // register this set's candidate hashes for later sets lazily, in SETS order (deterministic regardless of which ids are asked for)
    const list = cands(); for (const c of list) earlier.add(c.sha);
    return entry(set.id, () => {
      const per = new Map();
      const r = takeDocs(set.id, list, (c, i) => { const s = newStats(); const u = codeText(readText(c.path), s); per.set(i, s); return u; });
      const st = sumStats(r.docKeys.map((i) => per.get(i)));
      return makePocket({ id: set.id, register: "code", language: set.language, script: "latn", units: r.units, docOf: r.docOf, meta: {
        tokenisation: TOKENISATION, docDef: "one source file = one document (whole files taken in sha256(id:fileIndex) order, files sorted by path, cap 300000 tokens)",
        source: `${set.roots.map((x) => `${R}/${x}`).join(", ")} (${set.exts.join(",")})`, siblingOf: "order.depLen", what: set.what, docFiles: r.docKeys.map((i) => ({ rel: path.relative(R, list[i].path), sha256: list[i].sha })),
        notes: `SIBLING of order.depLen: user's own code, never in an atlas pocket; ${list.length} candidate files after guards (${stats.listed} listed; dropped ${JSON.stringify(stats.dropped)}); ${r.docKeys.length} files in the pocket; token-drop counters ${JSON.stringify(st)}` } });
    });
  });
}
export async function load(onlyIds = null) {
  const out = [];
  for (const e of entries()) { if (onlyIds && !onlyIds.includes(e.id)) continue; try { out.push(await e.build()); } catch (err) { console.error(`${e.id}: ${String(err.message).slice(0, 200)}`); } }
  return out;
}
