// eval/law/provisional/ablation-scope/read-M.mjs — RE-READ the confirmation tokens of IRC group B at a SMALLER reader window (M=64 messages) to test whether the scope variable is the reader's WINDOW count.
//
//   node read-M.mjs --doc ubuntu/2011-03-15 --src data/confirmation --out data/confirmation-M64 [--M 64]
//
// ═══ PRE-REGISTRATION (written before this script was first run; post hoc with respect to confirm-rules-a1.mjs, whose numbers I had read) ═══
// QUESTION. The slot arm (S_ENTRY >= 1) works in IRC non-initial tokens only above a local count of 3 (blind at c2 and c3: 0.51) and its sensitivity rises with c (names: 0.49 / 0.77 / 0.81 at c4_6 / c7_15 / c16p; matched
// unlabelled tokens 0 / 0.005 / 0.04). If c is the reader's WINDOW count (a reader property: the floor of 2-3 mentions) and not a property of the nickname, then re-reading the SAME tokens in a window four times shorter
// (M=64) must move them to the stratum of their new count c': S(names, c') under M=64 must resemble S(names, c) under M=256, and tokens with c' <= 3 must be blind whatever their count at M=256.
// DATA. The group-B pairs of data/confirmation in strata c4_6, c7_15, c16p (the ones with a non-trivial S_ENTRY); both members of each pair, same (s, i); the window is [s-64, s] instead of [s-256, s]; the reader and F=0 are unchanged.
// RECORDED. Per token: c256 (stored), c' (count of the form in [s-64, s], computed from the stream), S_ENTRY' (the same fixed score, ref-entry typed deltas at radius bands 0-1), isNull', the hash.
// ANALYSIS (python, descriptive, after the reads): share of tokens with S_ENTRY' > 0 by class and c' bin (1, 2, 3, 4-6, 7-15, 16+), beside the M=256 shares by c256 bin of the same tokens. No test, no threshold.
// BLIND PREDICTIONS (belief). R1 tokens with c' <= 3 have S_ENTRY' > 0 in <= 3% of cases in both classes (0.9). R2 names with c' in 4-6 have S_ENTRY' > 0 within 0.15 of the M=256 share at c in 4-6 (0.49) (0.6).
// R3 unlabelled tokens have S_ENTRY' > 0 in <= 5% of cases at every c' (0.8).
// ═══ END OF PRE-REGISTRATION ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { impactBatch } from "../../impact.mjs";
import { loadIrcDay, IRC_ROOT } from "./lib-data.mjs";
import { ablationScores } from "./features.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DOC = opt("--doc", ""), SRC = opt("--src", "data/confirmation"), OUT = opt("--out", "data/confirmation-M64"), M2 = Number(opt("--M", 64));
const doc = loadIrcDay(path.join(IRC_ROOT, `${DOC}.txt`), DOC);
const occ = new Map(); doc.stream.forEach((sent, s) => sent.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([s, i]); }));
const rows = [];
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith(".jsonl"))) for (const l of fs.readFileSync(path.join(SRC, f), "utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l); if (r.doc === DOC && r.grp === "B" && ["c4_6", "c7_15", "c16p"].includes(r.stratum)) rows.push(r); }
fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, `${DOC.replace(/\//g, "_")}.jsonl`); fs.writeFileSync(file, "");
const CH = 10; let done = 0; const t0 = Date.now();
for (let a = 0; a < rows.length; a += CH) {
  const chunk = rows.slice(a, a + CH), res = impactBatch(doc.stream, chunk.map((r) => ({ s: r.s, i: r.i, id: r.w })), { M: M2, F: 0, modes: ["delete"], seedTag: `${DOC}:M${M2}`, maxSeconds: Infinity });
  const lines = chunk.map((r, k) => { const rec = res.records.delete[k]; if (!rec || rec.gap) return null; const cp = (occ.get(r.w) ?? []).filter(([s]) => s >= r.s - M2 && s <= r.s).length; const sc = ablationScores(rec);
    return JSON.stringify({ doc: DOC, pair: r.pair, y: r.y, s: r.s, i: r.i, w: r.w, stratum: r.stratum, c256: r.c, cprime: cp, entry256: ablationScores(r.rec).S_ENTRY, entryPrime: sc.S_ENTRY, nullPrime: rec.isNull, hash: rec.hash }); }).filter(Boolean);
  fs.appendFileSync(file, lines.map((l) => l + "\n").join("")); done += chunk.length;
  if ((a / CH) % 5 === 0) console.error(`  ${done}/${rows.length} tokens, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
const sha = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
fs.writeFileSync(path.join(OUT, `${DOC.replace(/\//g, "_")}.summary.json`), JSON.stringify({ doc: DOC, M: M2, tokens: done, headerSha256: sha, seconds: (Date.now() - t0) / 1000 }));
console.log(JSON.stringify({ doc: DOC, tokens: done, headerSha256: sha }));
