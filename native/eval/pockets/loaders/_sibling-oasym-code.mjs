// loaders/_sibling-oasym-code.mjs — SIBLING code pockets for the replication of order.asym (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// Tokenisation, units (physical lines) and the whole-file-document + 300k cap rule are the atlas cd-cc-* rule (loaders/_cd_util.mjs codeText/takeDocs, loaders/_cd_codecorpus.mjs), imported unchanged.
//   oasym-cd-c-held     C, HELD-OUT FILES of the polyglot code corpus: the atlas pocket cd-cc-c is rebuilt (same candidate list, same hash order, same cap) and every file it did NOT take is a candidate here
//                       (files byte-identical to an atlas-chosen file dropped); then taken by whole files up to 300k under this id.
//   oasym-cd-rust-held, oasym-cd-go-held   the same for Rust (cd-cc-rust) and Go (cd-cc-go). (Java, Ruby and PHP have no held-out files: the atlas pockets took every candidate.)
//   oasym-cd-python-site  Python, third-party packages installed in /private/tmp/claude-501/venv (site-packages): a different corpus from the GitHub code corpus; files byte-identical to ANY file of the
//                       code corpus python split or to any ethos 09-source-code file are dropped.
import fs from "node:fs";
import path from "node:path";
import { sha256, tokenCount, MAX_TOKENS } from "../lib/pocket.mjs";
import { codeText, newStats, sumStats, takeDocs, makePocket } from "./_cd_util.mjs";
import { CC } from "./_sibling-oasym-common.mjs";

const TOKENISATION = "code tokens, identical to loaders/_cd_util.mjs codeText (the cd-cc-* rule): maximal runs of letters/marks/digits/underscore, lowercased NFC, not split on camelCase/snake_case; numeric-initial tokens, unspaced-script tokens and tokens > 64 characters dropped; lines > 1000 characters dropped; comment and string words kept; unit = physical line with >= 1 token";
const rd = (f) => fs.readFileSync(f, "utf8");
const fh = (f) => sha256(fs.readFileSync(f));
let _M = null; const manifest = () => (_M ??= JSON.parse(rd(`${CC}/manifest.json`)));
const loadDocFor = (per) => (f, i) => { const s = newStats(); const u = fs.existsSync(f.path) ? codeText(rd(f.path), s) : []; per.set(i, s); return u; };

function ccHeld({ id, lang, notes }) {
  const atlasId = `cd-cc-${lang.replace(/_/g, "")}`, L = manifest().languages[lang];
  const files = ["train", "dev", "test"].flatMap((s) => L[s]).filter((f) => f.origin === "fetched" && !f.restricted).sort((a, b) => (a.path < b.path ? -1 : 1));
  const a = takeDocs(atlasId, files, loadDocFor(new Map())), chosen = new Set(a.docKeys);
  const chosenHash = new Set(a.docKeys.filter((i) => fs.existsSync(files[i].path)).map((i) => fh(files[i].path)));
  const rest = [], seen = new Set(); let dupAtlas = 0, dupSelf = 0;
  files.forEach((f, i) => { if (chosen.has(i) || !fs.existsSync(f.path)) return; const h = fh(f.path); if (chosenHash.has(h)) { dupAtlas++; return; } if (seen.has(h)) { dupSelf++; return; } seen.add(h); rest.push(f); });
  const per = new Map(), r = takeDocs(id, rest, loadDocFor(per)), st = sumStats(r.docKeys.map((i) => per.get(i)));
  const repos = new Set(r.docKeys.map((i) => rest[i].repo)), atlasRepos = new Set(a.docKeys.map((i) => files[i].repo));
  const shared = [...repos].filter((x) => atlasRepos.has(x)).length;
  const p = makePocket({ id, register: "code", language: `x-${lang.replace(/_/g, "")}`, script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: TOKENISATION, docDef: "one source file = one document (whole files in sha256(id:fileIndex) order over the candidate list, cap 300000 tokens)", source: `${CC}/manifest.json, language ${lang}, files the atlas pocket ${atlasId} did not take`,
    notes: `${notes}; candidates (fetched, unrestricted, not taken by the atlas pocket, not byte-identical to one that was) ${rest.length} of ${files.length} files; files in pocket ${r.docKeys.length} from ${repos.size} repositories (${shared} of them also contribute files to the atlas pocket); dropped as byte-identical to an atlas-chosen file ${dupAtlas}, repeated among candidates ${dupSelf}; token-drop counters ${JSON.stringify(st)}`,
    sibling: true, heldOutOf: atlasId, atlasFilesTaken: a.docKeys.length, atlasTokens: tokenCount(a.units), atlasKeptFingerprint: sha256(JSON.stringify([a.units, a.docOf])).slice(0, 16), repoOverlap: { siblingRepos: repos.size, shared } } });
  return { ...p, group: "sib" };
}

const walkPy = (root) => { const out = []; const rec = (d) => { for (const n of fs.readdirSync(d).sort()) { if (n === "__pycache__") continue; const p = path.join(d, n); let st; try { st = fs.lstatSync(p); } catch { continue; } if (st.isSymbolicLink()) continue; if (st.isDirectory()) rec(p); else if (n.endsWith(".py")) out.push(p); } }; rec(root); return out; };
function pythonSite({ id }) {
  const root = "/private/tmp/claude-501/venv/lib/python3.14/site-packages", files = walkPy(root);
  const excl = new Set(manifest().languages.python.train.concat(manifest().languages.python.dev, manifest().languages.python.test).filter((f) => fs.existsSync(f.path)).map((f) => fh(f.path)));
  const E09 = "/Users/mlacy/Documents/3.0/ethos/09-source-code";
  if (fs.existsSync(E09)) for (const f of walkPy(E09)) excl.add(fh(f));
  const keep = [], seen = new Set(); let dupAtlas = 0, dupSelf = 0, empty = 0;
  for (const f of files) { const h = fh(f); if (excl.has(h)) { dupAtlas++; continue; } if (seen.has(h)) { dupSelf++; continue; } seen.add(h); keep.push({ path: f }); }
  const per = new Map(), r = takeDocs(id, keep, loadDocFor(per)), st = sumStats(r.docKeys.map((i) => per.get(i)));
  const pkgs = new Set(r.docKeys.map((i) => path.relative(root, keep[i].path).split(path.sep)[0]));
  const p = makePocket({ id, register: "code", language: "x-python", script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: TOKENISATION, docDef: "one source file = one document (whole files in sha256(id:fileIndex) order over the sorted candidate list, cap 300000 tokens)", source: root,
    notes: `Python files of third-party packages installed in the venv: ${files.length} .py files found, ${keep.length} candidates after dropping byte-identical copies of code-corpus python / ethos 09 files (${dupAtlas}) and repeats (${dupSelf}); files in pocket ${r.docKeys.length} from ${pkgs.size} top-level packages; token-drop counters ${JSON.stringify(st)}`,
    sibling: true } });
  return { ...p, group: "sib" };
}

export const SPECS = {
  "oasym-cd-c-held": () => ccHeld({ id: "oasym-cd-c-held", lang: "c", notes: "C, GitHub repositories of the polyglot corpus" }),
  "oasym-cd-rust-held": () => ccHeld({ id: "oasym-cd-rust-held", lang: "rust", notes: "Rust, GitHub repositories of the polyglot corpus" }),
  "oasym-cd-go-held": () => ccHeld({ id: "oasym-cd-go-held", lang: "go", notes: "Go, GitHub repositories of the polyglot corpus" }),
  "oasym-cd-python-site": () => pythonSite({ id: "oasym-cd-python-site" }),
};
export const IDS = Object.keys(SPECS);
export async function load(onlyIds = null) { return IDS.filter((i) => !onlyIds || onlyIds.includes(i)).map((i) => SPECS[i]()); }
