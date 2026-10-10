// loaders/_sibling-sfx-code.mjs — four NEW code pockets for the SIBLING REPLICATION of para.suffixCopy (underscore: ignored by run-atlas.mjs).
// Material = software that ships with this machine, never read by any atlas pocket (the atlas code pockets are GitHub files of /private/tmp/claude-501/code-corpus and ethos/09-source-code):
//   sfx-cd-py314  Python 3.14 standard library (Homebrew python@3.14, Lib/**/*.py)           python
//   sfx-cd-rb26   Ruby 2.6 standard library (macOS Ruby.framework, ruby/2.6.0/**/*.rb)       ruby
//   sfx-cd-chdr   C headers of the macOS 14.4 SDK (usr/include/**/*.h, not c++/)              c
//   sfx-cd-npmjs  JavaScript of the npm CLI (Homebrew lib/node_modules/npm, lib + dependencies)   javascript
// Choice of files is by LOCATION only (no statistic was computed on any file): test directories, caches, doc blobs, minified/bundled files and files > 400 KB are excluded. Files whose sha256 equals
// a code-corpus manifest file of the same language family or any ethos/09-source-code file are dropped and counted. Symlinks are never followed.
// Tokenisation, unit (= one physical line with >= 1 token), document (= one source file) and the whole-file 300k cap are the atlas ones (_cd_util.mjs codeText / takeDocs / makePocket, as cd-cc-*).
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/pocket.mjs";
import { newStats, sumStats, codeText, takeDocs, makePocket } from "./_cd_util.mjs";

const CC = "/private/tmp/claude-501/code-corpus", E09 = "/Users/mlacy/Documents/3.0/ethos/09-source-code";
const PY = "/opt/homebrew/opt/python@3.14/Frameworks/Python.framework/Versions/3.14/lib/python3.14";
const RB = "/System/Library/Frameworks/Ruby.framework/Versions/2.6/usr/lib/ruby/2.6.0";
const SDK = "/Library/Developer/CommandLineTools/SDKs/MacOSX14.4.sdk/usr/include";
const NPM = "/opt/homebrew/lib/node_modules/npm";
const TESTDIR = /^(test|tests|__tests__|idle_test|__pycache__|site-packages|pydoc_data|config-.*|docs?|man|c\+\+|\.git)$/;
export const SPECS = [
  { id: "sfx-cd-py314", lang: "python", ccLangs: ["python"], root: PY, exts: [".py"], skipName: /^_sysconfigdata/, what: "Python 3.14 standard library (Homebrew python@3.14 Lib/**/*.py; test, site-packages, pydoc_data, __pycache__ excluded)" },
  { id: "sfx-cd-rb26", lang: "ruby", ccLangs: ["ruby"], root: RB, exts: [".rb"], skipName: null, what: "Ruby 2.6 standard library (macOS Ruby.framework ruby/2.6.0/**/*.rb)" },
  { id: "sfx-cd-chdr", lang: "c", ccLangs: ["c", "cpp"], root: SDK, exts: [".h"], skipName: null, what: "C headers of the macOS 14.4 SDK (usr/include/**/*.h; c++/ excluded)" },
  { id: "sfx-cd-npmjs", lang: "javascript", ccLangs: ["javascript", "typescript", "tsx"], root: NPM, exts: [".js", ".cjs", ".mjs"], skipName: /\.min\.js$/, what: "JavaScript of the npm CLI (Homebrew lib/node_modules/npm: lib/ and bundled dependencies; test dirs, docs, man excluded)" },
];
export const IDS = SPECS.map((s) => s.id);

function walk(dir, exts, skipName, out = []) {
  let names; try { names = fs.readdirSync(dir).sort(); } catch { return out; }
  for (const n of names) {
    const p = path.join(dir, n); let st; try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) { if (!TESTDIR.test(n)) walk(p, exts, skipName, out); }
    else if (exts.includes(path.extname(n).toLowerCase()) && !(skipName && skipName.test(n)) && st.size > 0 && st.size <= 400000) out.push(p);
  }
  return out;
}
const hashFile = (f) => sha256(fs.readFileSync(f));
function atlasHashes(ccLangs) {
  const set = new Set(), M = JSON.parse(fs.readFileSync(`${CC}/manifest.json`, "utf8"));
  for (const lang of ccLangs) for (const s of ["train", "dev", "test"]) for (const f of M.languages[lang]?.[s] ?? []) if (fs.existsSync(f.path)) set.add(hashFile(f.path));
  const rec = (d) => { for (const n of fs.readdirSync(d).sort()) { const p = path.join(d, n), st = fs.lstatSync(p); if (st.isSymbolicLink()) continue; if (st.isDirectory()) rec(p); else if (st.size < 3e6) set.add(hashFile(p)); } };
  if (fs.existsSync(E09)) rec(E09);
  return set;
}
/** minified or bundled = a file whose mean line length is > 300 characters (counted as dropped.minified). */
const looksMinified = (txt) => { const n = txt.split("\n").length; return txt.length / n > 300; };
const TOKENISATION = "code tokens, identical to loaders/_cd_util.mjs codeText (the cd-cc-* rule): maximal runs of letters/marks/digits/underscore, lowercased NFC, not split on camelCase/snake_case; numeric-initial tokens, unspaced-script tokens and tokens > 64 characters dropped; lines > 1000 characters dropped; comment and string words kept; unit = physical line with >= 1 token";

export async function load(onlyIds = null) {
  const out = [];
  for (const s of SPECS) {
    if (onlyIds && !onlyIds.includes(s.id)) continue;
    const all = walk(s.root, s.exts, s.skipName), atlas = atlasHashes(s.ccLangs), seen = new Set(), keep = [], dropped = { atlas: 0, repeated: 0, minified: 0 };
    for (const f of all) {
      const buf = fs.readFileSync(f), h = sha256(buf);
      if (atlas.has(h)) { dropped.atlas++; continue; }
      if (seen.has(h)) { dropped.repeated++; continue; }
      if (looksMinified(buf.toString("utf8"))) { dropped.minified++; continue; }
      seen.add(h); keep.push(f);
    }
    const per = new Map();
    const r = takeDocs(s.id, keep, (f, i) => { const st = newStats(); const u = codeText(fs.readFileSync(f, "utf8"), st); per.set(i, st); return u; });
    const st = sumStats(r.docKeys.map((i) => per.get(i)));
    const p = makePocket({ id: s.id, register: "code", language: `x-${s.lang}`, script: "latn", units: r.units, docOf: r.docOf, meta: {
      tokenisation: TOKENISATION, docDef: "one source file = one document (whole files, sha256(id:fileIndex) order over the sorted candidate list, cap 300000 tokens)", source: `${s.root} (${s.exts.join(",")})`,
      notes: `${s.what}; ${all.length} files walked, dropped ${JSON.stringify(dropped)}, ${keep.length} candidates, ${r.docKeys.length} files in the pocket; token-drop counters ${JSON.stringify(st)}` } });
    p.group = "sib";
    out.push(p);
  }
  return out;
}
