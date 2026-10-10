// loaders/_sibling-deplen-code-frozen.mjs — the five repository-code sibling pockets of order.depLen rebuilt from the byte-for-byte snapshot written by results/confirm-order.depLen/snapshot-code.mjs
// (same ids, same tokenisation, same documents in the same order as the live loader had at snapshot time; verified by the fingerprints stored in index.json). Underscore: ignored by run-atlas.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "../lib/pocket.mjs";
import { codeText, newStats, sumStats, makePocket, readText } from "./_cd_util.mjs";
const SNAP = path.join(path.dirname(fileURLToPath(import.meta.url)), "../results/confirm-order.depLen/code-snapshot");
const TOK = "code tokens: maximal runs of letters/marks/digits/underscore, lowercased NFC, NOT split on camelCase or snake_case; numeric literals (a token starting with a digit), tokens containing unspaced-script characters and tokens longer than 64 characters are dropped; operators and punctuation dropped; comment and string-literal words are kept; unit = physical source line with at least one token";
const index = () => JSON.parse(fs.readFileSync(path.join(SNAP, "index.json"), "utf8"));
export const ids = () => Object.keys(index());
export async function load(onlyIds = null) {
  const out = [], I = index();
  for (const [id, e] of Object.entries(I)) {
    if (onlyIds && !onlyIds.includes(id)) continue;
    const units = [], docOf = [], per = [];
    e.docs.forEach((d, k) => { const buf = fs.readFileSync(path.join(SNAP, id, d.file)); if (sha256(buf) !== d.sha256) throw new Error(`${id}/${d.file}: snapshot file changed`); const s = newStats(); for (const u of codeText(readText(path.join(SNAP, id, d.file)), s)) { units.push(u); docOf.push(k); } per.push(s); });
    const p = makePocket({ id, register: "code", language: id.endsWith("-py") ? "x-python" : "x-javascript", script: "latn", units, docOf, meta: { tokenisation: TOK, docDef: "one source file = one document (the files chosen by the live sibling loader, frozen)", source: `${SNAP}/${id} (copies of ${e.docs.length} files of /Users/mlacy/Documents/3.0)`, siblingOf: "order.depLen", frozenFrom: "snapshot-code.mjs", tokensAtSnapshot: e.tokensAtSnapshot, notes: `frozen snapshot; token-drop counters ${JSON.stringify(sumStats(per))}` } });
    const fp = sha256(JSON.stringify(p.units)).slice(0, 16), fo = sha256(JSON.stringify(p.docOf)).slice(0, 16);
    if (fp !== e.unitsFingerprint || fo !== e.docOfFingerprint) throw new Error(`${id}: frozen pocket differs from the live pocket at snapshot time`);
    out.push(p);
  }
  return out;
}
