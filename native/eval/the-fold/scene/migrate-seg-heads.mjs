// scene/migrate-seg-heads.mjs — give v1 SEG records their subject and predicate heads, by re-parsing the sentence at the address.
//
//   node eval/the-fold/scene/migrate-seg-heads.mjs --from foundation-weft --to foundation-weft.next
//
// The v1 store kept for each clause cut only (id, parent, relation, marker, at). A frame — "she said that the storm took the
// roof" — needs the speaker and the verb. The bytes are still there: the sentence containing `at` is re-expanded, parsed by the
// same learned parser, and the clause whose own words begin at `at` supplies its heads. A record is migrated only when the
// re-parse AGREES with what was recorded (same relation, same marker); otherwise it keeps empty heads and is counted — a
// migration that guessed would be a second, silent reading.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "../../../the-fold/weft-store.mjs";
import { loadModel, analyse, tokenize } from "../../../adapters/text/english-parser.js";
import { clausesOf } from "../../../adapters/text/nested-clauses.js";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FROM = path.resolve(HERE, opt("--from", "foundation-weft")), TO = path.resolve(HERE, opt("--to", "foundation-weft.next"));
const REL = ["root", "complement", "open-complement", "subject-clause", "adverbial", "adnominal", "relative", "parataxis", "coordinate", "list", "apposition"];
const model = loadModel(JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/parser-eng-ewt.json", "utf8")));
const src = openStore(FROM), dst = openStore(TO);
if (dst.count() > 0) { console.error("target not empty"); process.exit(1); }
const bytes = new Map(); const sentCache = new Map();
const bufOf = (f) => { if (!bytes.has(f)) bytes.set(f, fs.existsSync(f) ? fs.readFileSync(f) : null); return bytes.get(f); };
const stats = { seg: 0, migrated: 0, disagreed: 0, noFile: 0, noSentence: 0, skipped: 0 };
function clausesAt(buf, file, at) {
  // the sentence containing byte `at`: back to the previous terminator, forward to the next
  const lo = Math.max(0, at - 1500);
  const before = buf.subarray(lo, at).toString("utf8");
  const m = /[.!?]["')\]]*\s+(?=[^.!?]*$)/.exec(before);
  const startByte = m ? lo + Buffer.byteLength(before.slice(0, m.index + m[0].length), "utf8") : (lo === 0 ? 0 : at);
  const key = `${file}:${startByte}`;
  let hit = sentCache.get(key);
  if (!hit) {
    const win = buf.subarray(startByte, startByte + 1800).toString("utf8");
    const e = /^[\s\S]*?[.!?]["')\]]*(?=\s|$)/.exec(win); const text = e ? e[0] : win.split(/\n\n/)[0];
    const toks = tokenize(text); if (toks.length < 2 || toks.length > 120) { sentCache.set(key, (hit = { clauses: [], text, startByte })); }
    else {
      const rows = analyse(model, toks.map((t) => t.form)).map((r, i) => ({ ...r, start: toks[i].start, end: toks[i].end }));
      hit = { clauses: clausesOf(rows), text, startByte }; sentCache.set(key, hit);
    }
    if (sentCache.size > 4000) sentCache.delete(sentCache.keys().next().value);
  }
  return hit;
}
let batch = []; let n = 0;
for (const l of src.passes()) {
  const buf = bufOf(l.a);
  const seg = l.seg.map((c) => {
    stats.seg += 1;
    if (c[5] || c[6]) { stats.skipped += 1; return c; }                       // already v2
    if (!buf) { stats.noFile += 1; return c; }
    const at = c[4]; if (!(at >= 0)) { stats.noSentence += 1; return c; }
    const { clauses, text, startByte } = clausesAt(buf, l.a, at);
    if (!clauses.length) { stats.noSentence += 1; return c; }
    const charOff = buf.subarray(startByte, at).toString("utf8").length;
    // the clause whose own words begin here, and which agrees with what was recorded
    const cand = clauses.filter((x) => x.own.start != null && Math.abs(x.own.start - charOff) <= 2 && REL.indexOf(x.relation) === c[2] && (x.marker ?? "") === (c[3] ?? ""));
    if (!cand.length) { stats.disagreed += 1; return c; }
    const x = cand.sort((a, b) => Math.abs(a.own.start - charOff) - Math.abs(b.own.start - charOff))[0];
    stats.migrated += 1;
    return [c[0], c[1], c[2], c[3], c[4], String(x.subject?.head ?? "").toLowerCase(), String(x.predicate?.lemma ?? x.predicate?.head ?? "").toLowerCase()];
  });
  batch.push({ ...l, seg });
  if (batch.length >= 25) { dst.append(batch); batch = []; }
  if (++n % 50 === 0) console.log(`  ${n} passes · migrated ${stats.migrated}/${stats.seg}`);
}
if (batch.length) dst.append(batch);
console.log(`done: ${n} passes · SEG records ${stats.seg}: heads recovered ${stats.migrated} (${(100 * stats.migrated / (stats.seg || 1)).toFixed(1)}%), re-parse disagreed ${stats.disagreed}, no sentence ${stats.noSentence}, no file ${stats.noFile}, already v2 ${stats.skipped}`);
console.log(`→ ${TO}`);
