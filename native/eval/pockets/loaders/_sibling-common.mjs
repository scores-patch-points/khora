// loaders/_sibling-common.mjs — shared helpers of the SIBLING-REPLICATION loaders of the confirmation of fig.introRight (underscore: ignored by run-atlas.mjs).
// New pockets only: nothing here reads a document that an atlas pocket read. Dedupe is by sha256 of the raw file bytes: against the atlas's own code files (code corpus JS/TS/Python, ethos 09-source-code) and across the sibling pockets.
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/pocket.mjs";
import { newStats, sumStats, codeText, takeDocs, makePocket } from "./_cd_util.mjs";

export const SIB_GROUP = "sib";
export const REPOS = "/Users/mlacy/Documents/3.0";
const CC = "/private/tmp/claude-501/code-corpus", E09 = `${REPOS}/ethos/09-source-code`;
export const fileHash = (f) => sha256(fs.readFileSync(f));

/** deterministic recursive walk (names sorted); skip(relPath, isDir) -> true prunes. Symlinks are never followed. */
export function walk(root, skip, exts) {
  const out = [];
  const rec = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const p = path.join(dir, name), rel = path.relative(root, p);
      let st; try { st = fs.lstatSync(p); } catch { continue; }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) { if (!skip(rel, true)) rec(p); } else if (exts.includes(path.extname(name).toLowerCase()) && !skip(rel, false)) out.push(p);
    }
  };
  rec(root);
  return out;
}

let _atlasHashes = null;
/** sha256 of every atlas code file that could coincide with a sibling file: code-corpus javascript/typescript/tsx/python/html/bash files and everything under ethos 09-source-code. */
export function atlasCodeHashes() {
  if (_atlasHashes) return _atlasHashes;
  const set = new Set();
  if (fs.existsSync(`${CC}/manifest.json`)) {
    const M = JSON.parse(fs.readFileSync(`${CC}/manifest.json`, "utf8"));
    for (const lang of ["javascript", "typescript", "tsx", "python", "html", "bash"]) for (const s of ["train", "dev", "test"]) for (const f of M.languages[lang]?.[s] ?? []) if (fs.existsSync(f.path)) set.add(fileHash(f.path));
  }
  if (fs.existsSync(E09)) walk(E09, () => false, [".js", ".jsx", ".mjs", ".py", ".c", ".h", ".cpp", ".go", ".ts", ".html", ".txt", ".md"]).forEach((f) => set.add(fileHash(f)));
  return (_atlasHashes = set);
}

/** Candidate files -> unique files: a file whose bytes equal an atlas file, an earlier candidate, or a file in `claimed` is dropped (and counted). `claimed` (Set of hashes) is updated by the caller. */
export function dedupe(files, claimed = new Set()) {
  const keep = [], dropped = { atlas: 0, repeated: 0, claimedByOtherSibling: 0, empty: 0 }, atlas = atlasCodeHashes(), seen = new Set();
  for (const f of files) {
    const h = fileHash(f);
    if (atlas.has(h)) { dropped.atlas++; continue; }
    if (claimed.has(h)) { dropped.claimedByOtherSibling++; continue; }
    if (seen.has(h)) { dropped.repeated++; continue; }
    seen.add(h); keep.push({ f, h });
  }
  return { keep, dropped, hashes: seen };
}

/** One source file = one document (as the atlas code pockets cd-cc-*); whole files in sha256(id:fileIndex) order up to the 300k cap. */
export function codePocket({ id, language, files, tokenisationNote, source, notes, register = "code" }) {
  const per = new Map();
  const r = takeDocs(id, files, (f, i) => { const s = newStats(); const u = codeText(fs.readFileSync(f.f, "utf8"), s); per.set(i, s); return u; });
  const st = sumStats(r.docKeys.map((i) => per.get(i)));
  return makePocket({ id, register, language, script: "latn", units: r.units, docOf: r.docOf, meta: {
    tokenisation: "code tokens, identical to loaders/_cd_util.mjs codeText (the cd-cc-* rule): maximal runs of letters/marks/digits/underscore, lowercased NFC, not split on camelCase/snake_case; numeric-initial tokens, unspaced-script tokens and tokens > 64 characters dropped; lines > 1000 characters dropped; comment and string words kept; unit = physical line with >= 1 token" + (tokenisationNote ? "; " + tokenisationNote : ""),
    docDef: "one source file = one document (whole files, sha256(id:fileIndex) order, cap 300000 tokens)", source, notes: `${notes}; files in pocket ${r.docKeys.length} of ${files.length} candidates; token-drop counters of the files in the pocket: ${JSON.stringify(st)}` } });
}
