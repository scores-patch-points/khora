// scene/export-speaker-frames-v2.mjs — the speaker frames with the clause text, object text and clause END byte.  (2026-10-14)
//
//   node eval/the-fold/scene/export-speaker-frames-v2.mjs [--in republic-speaker-frames.jsonl] [--out republic-speaker-frames.v2.jsonl]
//
// v1 carried the clause START byte only and no text. v2 re-parses the sentence each frame sits in (same parser, token offsets),
// matches the frame's clause by its start byte (±8 bytes) and predicate lemma, and adds: content.text (the clause's own words),
// content.objText, content.span {byteStart, byteEnd, sha256 of the bytes it names}, matrix.text, and `copular` (the content clause
// is a predication with `be`: its text is the candidate DEFINIENS). A frame whose clause cannot be matched is kept with
// matched:false, never guessed. Speakers stay SURFACE strings; `named` is true only when the surface is one of the dialogue's own
// listed persons. No pronoun is resolved to a person.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadModel, analyse, tokenize } from "../../../adapters/text/english-parser.js";
import { clausesOf } from "../../../adapters/text/nested-clauses.js";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const IN = path.resolve(HERE, opt("--in", "republic-speaker-frames.jsonl")), OUT = path.resolve(HERE, opt("--out", "republic-speaker-frames.v2.jsonl"));
const EN = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const model = loadModel(JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/parser-eng-ewt.json", "utf8")));
const buf = fs.readFileSync(EN), str = buf.toString("utf8");
// the dialogue's own listed persons
const pm = /_PERSONS OF THE DIALOGUE\._[\s\S]{0,420}?_And others/.exec(str)?.[0] ?? ""; const NAMED = new Set([...pm.matchAll(/\b([A-Z][a-z]{3,})\b/g)].map((m) => m[1].toLowerCase()).filter((w) => !["persons", "dialogue", "narrator", "others", "mute", "auditors", "who", "and"].includes(w)));
// sentences with byte starts, in order
const sents = []; { let pos = 0, b = 0; for (const m of str.matchAll(/[^.!?]+[.!?]+/g)) { b += Buffer.byteLength(str.slice(pos, m.index), "utf8"); const bl = Buffer.byteLength(m[0], "utf8"); sents.push({ text: m[0], c0: m.index, b0: b, b1: b + bl }); b += bl; pos = m.index + m[0].length; } }
const sentAt = (byte) => { let lo = 0, hi = sents.length - 1, r = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (sents[mid].b0 <= byte) { r = mid; lo = mid + 1; } else hi = mid - 1; } return r >= 0 && byte < sents[r].b1 ? r : -1; };
const parsed = new Map();
const parse = (i) => { let p = parsed.get(i); if (p) return p; const s = sents[i]; const toks = tokenize(s.text); const rows = analyse(model, toks.map((t) => t.form)); const cl = clausesOf(rows);
  const span = (c) => { const ts = c.own.tokens.map((id) => toks[id - 1]).filter(Boolean); if (!ts.length) return null; const a = Math.min(...ts.map((t) => t.start)), z = Math.max(...ts.map((t) => t.end)); return { b0: s.b0 + Buffer.byteLength(s.text.slice(0, a), "utf8"), b1: s.b0 + Buffer.byteLength(s.text.slice(0, z), "utf8") }; };
  p = { cl: cl.map((c) => ({ c, sp: span(c) })) }; parsed.set(i, p); return p; };
const lines = fs.readFileSync(IN, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); let matched = 0, copular = 0;
const out = lines.map((f) => {
  const at = Number(f.at.split("#")[1]), mAt = Number(f.matrixAt.split("#")[1]);
  const si = sentAt(at); const r = { ...f, speakerNamed: f.speaker ? NAMED.has(f.speaker) : false, matched: false };
  if (si < 0) return r; const { cl } = parse(si);
  const pick = (start, pred) => { const c = cl.filter((x) => x.sp && String(x.c.predicate?.lemma ?? x.c.predicate?.head ?? "").toLowerCase() === (pred ?? "") ).sort((x, y) => Math.abs(x.sp.b0 - start) - Math.abs(y.sp.b0 - start))[0]; return c && Math.abs(c.sp.b0 - start) <= 8 ? c : null; };
  const c = pick(at, f.content.pred), m = pick(mAt, f.matrixPredicate);
  if (c) { const bytes = buf.subarray(c.sp.b0, c.sp.b1); const isBe = /^(be|is|are|was|were|am)$/.test(String(c.c.predicate?.lemma ?? "").toLowerCase()) || /^(is|are|was|were)\b/.test(c.c.predicate?.text ?? ""); if (isBe) copular += 1;
    r.content = { ...f.content, text: c.c.own.text, objText: c.c.object?.text ?? null, span: { file: EN, byteStart: c.sp.b0, byteEnd: c.sp.b1, sha256: sha(bytes) } }; r.copular = isBe; r.matched = true; matched += 1; }
  if (m) r.matrix = { text: m.c.own.text, span: { file: EN, byteStart: m.sp.b0, byteEnd: m.sp.b1, sha256: sha(buf.subarray(m.sp.b0, m.sp.b1)) } };
  return r;
});
fs.writeFileSync(OUT, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
const named = out.filter((r) => r.speakerNamed).length;
console.log(`${out.length} frames → ${OUT}\nclause matched ${matched} (${(100 * matched / out.length).toFixed(0)}%) · copular content clauses ${copular} · speaker is one of the dialogue's listed persons ${named} · listed persons: ${[...NAMED].join(", ")}`);
const bad = out.filter((r) => r.matched && Buffer.from(buf.subarray(r.content.span.byteStart, r.content.span.byteEnd)).toString("utf8").replace(/\s+/g, " ").trim() !== r.content.text.replace(/\s+([,.;:?!])/g, "$1").trim()).length;
console.log(`span bytes vs clause text equal after whitespace normalisation: ${out.filter((r) => r.matched).length - bad} of ${matched}`);
const ex = out.filter((r) => r.copular && r.stephanus && Number(r.stephanus.slice(0, 3)) >= 331 && Number(r.stephanus.slice(0, 3)) <= 354).slice(0, 6);
for (const r of ex) console.log(`  ${r.stephanus} [${r.speaker ?? "∅"}→${r.matrixPredicate}] ${r.content.text.slice(0, 140)}`);
