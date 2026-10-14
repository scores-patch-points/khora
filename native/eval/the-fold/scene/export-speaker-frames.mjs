// scene/export-speaker-frames.mjs — the Republic's speaker frames as JSONL, read-only on the lean store.  (2026-10-14)
//
//   node eval/the-fold/scene/export-speaker-frames.mjs [--store liberal-arts-weft] [--out republic-speaker-frames.jsonl]
//
// A frame is a matrix clause whose predicate the received act prior types SIG (say/tell/claim/hear…) or EVA (believe/know/deny…)
// with a complement clause under it (frames-bridge.mjs, same rule). Speakers are SURFACE STRINGS (the matrix subject head,
// lowercased): there is no coreference or referent step, "i"/"he" are not resolved to Socrates, and dialogue turns that carry no
// verb of saying are not frames. `at` is the clause START byte (the store holds no end); the object is not stored (obj: null).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "../../../the-fold/weft-store.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const STORE = path.resolve(HERE, opt("--store", "liberal-arts-weft")), OUT = path.resolve(HERE, opt("--out", "republic-speaker-frames.jsonl"));
const act = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/act-prior-en.json", "utf8")).forms;
const lemFor = (w) => { for (const c of [w, w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"), w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, "")]) if (act[c]) return c; return null; };
const opsOf = (lemma) => { const k = lemFor(String(lemma ?? "").toLowerCase()); if (!k) return null; const f = act[k]; return f.op ? [f.op] : (f.candidates ?? []).map((c) => c.op); };
const classOf = (lemma) => { const o = opsOf(lemma); if (!o) return null; if (o.includes("SIG")) return "SIG"; if (o.includes("EVA")) return "EVA"; return null; };
const REL = new Set([1, 2, 3]);
const EN = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt";
const eRaw = fs.readFileSync(EN, "utf8"), start = eRaw.indexOf("I went down yesterday to the Piraeus");
const marks = []; { const re = /\*(\d{3})([A-Ea-e])?\*/g; re.lastIndex = start; let m, last = 326; while ((m = re.exec(eRaw)) !== null) { const p = Number(m[1]); if (p >= last && p <= 621) { marks.push({ sec: `${p}${(m[2] ?? "A").toUpperCase()}`, at: Buffer.byteLength(eRaw.slice(0, m.index), "utf8") }); last = p; } } }
const stephanusAt = (b) => { let lo = 0, hi = marks.length - 1, r = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (marks[mid].at <= b) { r = marks[mid].sec; lo = mid + 1; } else hi = mid - 1; } return r; };
const lines = []; let pass = 0;
for (const l of openStore(STORE).passes().filter((x) => x.a.endsWith("pg55201_The_Republic_by_Plato.txt"))) {
  pass += 1; const byId = new Map(l.seg.map((c, i) => [c[0], { c, i }])); const neg = new Set(l.eva.filter((v) => v[0] === "seg").map((v) => v[1]));
  const key = (id) => `p${pass}:${id}`;
  for (const { c, i } of byId.values()) {
    if (!REL.has(c[2]) || !c[1]) continue; const m = byId.get(c[1]); if (!m) continue;
    const cls = classOf(m.c[6]); if (!cls) continue;
    let depth = 0, p = m; while (p && p.c[1] && depth < 8) { const q = byId.get(p.c[1]); if (!q) break; if (REL.has(p.c[2])) depth += 1; p = q; }
    const parent = REL.has(m.c[2]) && m.c[1] ? key(m.c[1]) : null;
    lines.push(JSON.stringify({ id: key(c[0]), speaker: m.c[5] || null, frameClass: cls, matrixPredicate: m.c[6], matrixSign: neg.has(m.i) ? "-" : "+", content: { subj: c[5] || null, pred: c[6] || null, obj: null, sign: neg.has(i) ? "-" : "+" }, depth, parentFrame: parent, matrixAt: `${l.a}#${m.c[4]}`, at: `${l.a}#${c[4]}`, stephanus: stephanusAt(c[4]), marker: c[3] || null }));
  }
}
fs.writeFileSync(OUT, lines.join("\n") + "\n");
const recs = lines.map((x) => JSON.parse(x)); const bySp = new Map(); for (const r of recs) bySp.set(r.speaker, (bySp.get(r.speaker) ?? 0) + 1);
console.log(`${recs.length} frames → ${OUT}`); console.log("top speaker surfaces:", [...bySp].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([s, n]) => `${s}×${n}`).join(", "));
const inBook1 = recs.filter((r) => r.stephanus && Number(r.stephanus.slice(0, 3)) >= 331 && Number(r.stephanus.slice(0, 3)) <= 354); console.log(`in 331–354: ${inBook1.length} frames; stephanus range covered: ${recs[0]?.stephanus}…${recs.at(-1)?.stephanus}`);
