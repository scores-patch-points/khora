// lib.mjs — helpers for the carried-rules verification scripts (new file; imports only node built-ins).
// Nothing here reads corpus text or runs a reader. It reads SAVED result JSON written by earlier agents and recomputes headline numbers.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const EVAL = "/Users/mlacy/Documents/3.0/khora/native/eval";
export const OUT = path.join(EVAL, "law/provisional/carried-rules");
export const STEMS = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
export const CASELESS = new Set(["cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "hin", "urd"]);
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export const maybe = (p) => (fs.existsSync(p) ? readJson(p) : null);

// sha256 of the header comment of a script: every line from the top up to (not including) the line "// END-HEADER".
export function headerSha(selfUrl) {
  const f = new URL(selfUrl).pathname, lines = fs.readFileSync(f, "utf8").split("\n"), end = lines.findIndex((l) => l.startsWith("// END-HEADER"));
  return createHash("sha256").update(lines.slice(0, end < 0 ? 0 : end).join("\n")).digest("hex");
}

// a check: the number a report states vs the number recomputed from the saved files; ok when |diff| <= tol
export function makeChecks() {
  const rows = [];
  const chk = (id, reported, recomputed, tol, note = "") => {
    const ok = typeof recomputed === "number" && typeof reported === "number" ? Math.abs(reported - recomputed) <= tol : reported === recomputed;
    rows.push({ id, reported, recomputed: round(recomputed), tol, ok, note });
    return ok;
  };
  return { rows, chk, summary: () => ({ n: rows.length, reproduced: rows.filter((r) => r.ok).length, notReproduced: rows.filter((r) => !r.ok).map((r) => r.id) }) };
}
export const save = (name, obj) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 1));
