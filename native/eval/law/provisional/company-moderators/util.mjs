// util.mjs: shared helpers for the company-moderators lens (NEW FILE; imports nothing that edits existing modules).
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const UD = "/private/tmp/claude-501/ud-eval";
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const sd = (xs) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : null; };
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };

/** sha256 of the text of `metaUrl`'s file up to (not including) the line that contains the marker string. */
export function headerSha(metaUrl, marker = "END OF PRE-REGISTRATION") {
  const txt = fs.readFileSync(fileURLToPath(metaUrl), "utf8"), k = txt.indexOf(marker);
  return createHash("sha256").update(k >= 0 ? txt.slice(0, k) : txt).digest("hex");
}

/** Full CoNLL-U reader (own implementation: impact.mjs's reader refuses test splits and drops head/deprel).
 *  Keeps, per sentence, the punctuation-dropped stream exactly as readConlluStream builds it (NFC, lowercase, UPOS != PUNCT, integer ids only),
 *  plus raw forms, UPOS, head and deprel in ORIGINAL ids (so order tests are unaffected by dropped punctuation). */
export function readConllu(file) {
  const out = [];
  let cur = null;
  const flush = () => { if (cur && cur.w.length) out.push(cur); cur = null; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    if (line[0] === "#") continue;
    const f = line.split("\t");
    if (f.length < 10 || !/^\d+$/.test(f[0])) continue;
    if (f[3] === "PUNCT") continue;
    cur ??= { w: [], raw: [], upos: [], id: [], head: [], dep: [] };
    const nfc = f[1].normalize("NFC");
    cur.w.push(nfc.toLowerCase()); cur.raw.push(nfc); cur.upos.push(f[3]); cur.id.push(Number(f[0])); cur.head.push(Number(f[6])); cur.dep.push(f[7]);
  }
  flush();
  return out;
}
