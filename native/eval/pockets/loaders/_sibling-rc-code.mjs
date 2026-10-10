// loaders/_sibling-rc-code.mjs — SIBLING code pockets for the replication of the atlas law order.rareCurve (underscore: ignored by run-atlas.mjs).
// Material: the user's repositories under /Users/mlacy/Documents/3.0 and the Python packages installed in their virtualenvs. No file is an atlas file: exact-bytes dedupe against every atlas code file (code-corpus JS/TS/TSX/Python/HTML/Bash
// + ethos 09-source-code, loaders/_sibling-common.mjs atlasCodeHashes) and across the pockets of THIS file (a file goes to the first pocket that claims it). Choice of material is by LOCATION only (authored source directories, no
// build output, no node_modules, no vendored bundles, no generated clients, no translation tables); no statistic was computed on any file when the choice was made.
// Tokenisation, units (physical line with >= 1 token), documents (one file) and the 300k cap (whole files, sha256(id:fileIndex) order) are those of the atlas cd-cc-* pockets (_cd_util codeText / takeDocs, via _sibling-common codePocket). Group "sib".
//   MINUS-side siblings (expected PRESENT-, kind = JavaScript / TypeScript / TSX):  sib-rc-js-holodeck (holodeck + holodeck-proxy + janus), sib-rc-js-eochat (eochat server/ui/scripts/eval),
//        sib-rc-js-eopm (eopm/src + ab + penelope), sib-rc-ts-opencode (opencode-fold packages .ts), sib-rc-tsx-opencode (opencode-fold packages .tsx)
//   ABSENT-side siblings (expected ABSENT, kind = Python):  sib-rc-py-authored (authored Python of the repositories), sib-rc-py-sitepkg (pip packages of three virtualenvs: er7-redteam/venv, legistar-surveillance-scanner/.venv, .whisper-venv)
import fs from "node:fs";
import { REPOS, walk, dedupe, codePocket } from "./_sibling-common.mjs";

const R = REPOS;
const BAD = /(^|\/)(node_modules|\.git|dist|dist-collab|build|vendor|\.claude|\.venv|venv|\.whisper-venv|site-packages|__pycache__|coverage|fixtures|\.app|\.next|legacy|archives)(\/|$)/;
const MIN_BAD = /\.min\.(js|mjs)$|(^|\/)(bundle|vendor)[^/]*\.(js|mjs)$/;
const skipJs = (rel) => BAD.test(rel) || MIN_BAD.test(rel);
const skipTs = (rel) => BAD.test(rel) || /\.d\.ts$/.test(rel) || /(^|\/)(i18n|locales?|translations?|gen|generated|sdk)(\/|$)/.test(rel) || /\.gen\.tsx?$/.test(rel);
const OC = `${R}/opencode-fold`;
const PKGS_TS = ["opencode", "core", "llm", "codemode", "schema", "client", "tui", "effect-drizzle-sqlite", "stats", "console"];
const PKGS_TSX = ["app", "ui", "tui", "console", "session-ui", "web", "stats", "opencode"];
const SP_VENVS = [`${R}/er7-redteam/venv/lib/python3.14/site-packages`, `${R}/legistar-surveillance-scanner/.venv/lib/python3.14/site-packages`, `${R}/.whisper-venv/lib/python3.14/site-packages`];
const skipSp = (rel) => /(^|\/)(__pycache__|tests?|testing|_vendor|data|locale|\.pytest_cache)(\/|$)|\.dist-info(\/|$)|(^|\/)(pip|setuptools|pkg_resources|_distutils_hack|isympy|sympy)(\/|$)/.test(rel);
const skipPyAuthored = (rel) => BAD.test(rel) || /(^|\/)(the-fold|heimdall)(\/|$)/.test(rel);
const PYROOTS = ["er7-redteam/harmbench", "legistar-surveillance-scanner/src", "legistar-surveillance-scanner/webapp", "legistar-surveillance-scanner/scripts", "nashville-legistar-archive/src", "nashville-legistar-archive/scripts",
  "ohs-custody", "MNPD-DFR/scripts", "caselink-scraper", "NPJ/tools"];   // khora/, khora-fold/ and the eoreader7 trees are NOT read: other agents write .py files into khora/native/eval while this runs (a first build was not reproducible for that reason)
const lists = {
  "sib-rc-js-holodeck": () => ["holodeck", "holodeck-proxy", "janus"].flatMap((d) => walk(`${R}/${d}`, skipJs, [".js", ".mjs"])),
  "sib-rc-js-eochat": () => ["server", "ui", "scripts", "eval"].flatMap((d) => walk(`${R}/eochat/${d}`, skipJs, [".js", ".mjs"])),
  "sib-rc-js-eopm": () => [`${R}/eopm/src`, `${R}/ab`, `${R}/penelope`].flatMap((d) => walk(d, skipJs, [".js", ".mjs"])),
  "sib-rc-ts-opencode": () => PKGS_TS.flatMap((p) => ["src", "test", "app", "core"].map((s) => `${OC}/packages/${p}/${s}`)).filter((d) => fs.existsSync(d)).flatMap((d) => walk(d, skipTs, [".ts"])),
  "sib-rc-tsx-opencode": () => PKGS_TSX.map((p) => `${OC}/packages/${p}`).filter((d) => fs.existsSync(d)).flatMap((d) => walk(d, skipTs, [".tsx"])),
  "sib-rc-py-authored": () => PYROOTS.map((p) => `${R}/${p}`).filter((d) => fs.existsSync(d)).flatMap((d) => walk(d, skipPyAuthored, [".py"])),
  "sib-rc-py-sitepkg": () => SP_VENVS.filter((d) => fs.existsSync(d)).flatMap((d) => walk(d, skipSp, [".py"])),
};
const META = {
  "sib-rc-js-holodeck": { language: "x-javascript", what: "JavaScript (browser extension and Node, ES modules and scripts) of the user's repositories holodeck, holodeck-proxy, janus" },
  "sib-rc-js-eochat": { language: "x-javascript", what: "JavaScript (Node server, UI, scripts, eval) of the user's repository eochat" },
  "sib-rc-js-eopm": { language: "x-javascript", what: "JavaScript of the user's repositories eopm (src), ab and penelope" },
  "sib-rc-ts-opencode": { language: "x-typescript", what: "TypeScript (.ts) of the packages of the open-source fork opencode-fold (src and test; i18n tables, d.ts, generated sdk excluded)" },
  "sib-rc-tsx-opencode": { language: "x-tsx", what: "TSX (.tsx) of the packages of the open-source fork opencode-fold (i18n tables, generated sdk excluded)" },
  "sib-rc-py-authored": { language: "x-python", what: "authored Python of the user's repositories (scripts, harnesses, scrapers; harmbench is third-party research code kept inside er7-redteam)" },
  "sib-rc-py-sitepkg": { language: "x-python", what: "third-party pip packages installed in three virtualenvs (library code with docstrings; tests, data, sympy, pip, setuptools excluded)" },
};
export const IDS = Object.keys(lists);
let _cache = null;
function candidates() {
  if (_cache) return _cache;
  const claimed = new Set(), out = {};
  for (const id of IDS) {
    const all = lists[id](), d = dedupe(all, claimed);
    for (const h of d.hashes) claimed.add(h);
    out[id] = { files: d.keep, walked: all.length, dropped: d.dropped };
  }
  return (_cache = out);
}
export async function load(onlyIds = null) {
  const C = candidates(), out = [];
  for (const id of IDS) {
    if (onlyIds && !onlyIds.includes(id)) continue;
    const c = C[id], m = META[id];
    if (!c.files.length) continue;
    const p = codePocket({ id, language: m.language, files: c.files, source: `${m.what} (${c.walked} files walked; ${c.files.length} unique candidates)`, notes: `${m.what}; dedupe drops ${JSON.stringify(c.dropped)}`, register: "code" });
    out.push({ ...p, group: "sib" });
  }
  return out;
}
