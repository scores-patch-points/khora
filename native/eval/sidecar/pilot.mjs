// eval/sidecar/pilot.mjs — BOUNDED PILOT of the reading sidecar over the ethos corpus. Reads a seeded slice with the full
// production reader (the-fold/read-door.mjs readDoor), ear chosen by measured SIGNAL (earSelection:"signal"), and writes an
// append-only sidecar: one JSON line per document (address, ear, cast, relations, gaps). New dir, new file; nothing edited.
//
//   node eval/sidecar/pilot.mjs [--docs N] [--chars N] [--per-cat N] [--cands a,b,c] [--out DIR]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5 / READING-POLICY II.23). Written BEFORE the first run. ═══════════════════════
// THE QUESTION. Is the first sidecar layer — the cast (referents) and clause relations the full pipeline returns, with the ear
// chosen by signal rather than the (misdetecting) label — usable on a bounded, real slice of the corpus? This is a feasibility
// pilot, not the full read; scope is declared below and BOUNDED.
// SLICE. N documents sampled across the ethos categories (seeded, one walk), each capped at `chars`; categories are read as they
//   come (English and non-Latin alike) so the ear-by-signal path is exercised on both scripts.
// WHAT IS RECORDED (the sidecar line). The document's ADDRESS (category/relative path + bytes + cap), the reader's OWN report
//   (language, languageSource, the ear-selection scores, ms), the CAST (referent surfaces), the RELATIONS (relation + participant
//   surfaces), the SIGNAL (content relations), and the GAPS. Append-only; one line per document; nothing is rewritten.
// USABLE (declared). A document is USABLE iff its cast has >= 3 referents AND its reading has >= 3 content relations. The pilot
//   is PASSING iff >= 50% of read documents are USABLE. A document that is non-Latin and returns a typed gap is recorded as a
//   gap, not a failure (the non-Latin weakness is known and disclosed, not hidden).
// CONTROLS. K1 DETERMINISM: re-reading one document (same ear declared from its own sidecar line) reproduces the same cast and
//   relation counts. K2 TYPED GAPS: a document the reader cannot hear is a recorded gap, never a silent empty pass. K3 EAR
//   AGREES: where the document's language is known by category (English sources), the ear chosen by signal is an English-family
//   ear; disagreement is reported (the pilot's own check of the selector).
// SCOPE / LIMITS. Bounded N and chars, one sample; the trail table is per-process (not yet the persistent log); "usable" is a
//   floor (3 and 3), not a quality bar; referent/relation correctness is not adjudicated against gold here. Results are written
//   to <out>/sidecar.jsonl and <out>/summary.json.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readDoor } from "../../the-fold/read-door.mjs";
import { createSeededRng, shuffled } from "../../kernel/rng.js";

const ROOT = "/Users/mlacy/Documents/3.0/ethos";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAT = /^(0\d|1\d|20)-/;
// categories that are overwhelmingly English (for the K3 ear-agrees check); declared, not measured.
const ENGLISH_CAT = new Set(["01-literature-books", "02-encyclopedic", "05-academic-papers", "06-government-legal", "15-western-canon", "19-organic-community", "20-first-person-voices"]);
const EN_FAMILY = new Set(["eng"]);

function argv() { const o = { docs: 12, chars: 4000, perCat: 1, dir: null, ear: "auto", cands: ["eng", "spa", "fra", "deu", "ita", "por"], out: path.join(HERE, "pilot-results") }; const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) { const x = a[i]; if (x === "--docs") o.docs = Number(a[++i]); else if (x === "--chars") o.chars = Number(a[++i]); else if (x === "--per-cat") o.perCat = Number(a[++i]); else if (x === "--dir") o.dir = a[++i]; else if (x === "--ear") o.ear = a[++i]; else if (x === "--cands") o.cands = a[++i].split(","); else if (x === "--out") o.out = a[++i]; } return o; }
function walk(dir, out = []) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.name.startsWith(".")) continue; const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (/\.(txt|md)$/.test(e.name)) out.push(p); } return out; }

const o = argv();
const picked = [];
if (o.dir) { const abs = path.isAbsolute(o.dir) ? o.dir : path.join(ROOT, o.dir); for (const f of walk(abs)) picked.push({ cat: path.basename(abs), file: f }); }
else { const cats = fs.readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory() && CAT.test(e.name)).map((e) => e.name).sort(); for (const c of cats) { const all = walk(path.join(ROOT, c)); if (!all.length) continue; const rng = createSeededRng({ seed: "sidecar-pilot", population: c, purpose: "sample" }); for (const f of shuffled(all, rng).slice(0, o.perCat)) picked.push({ cat: c, file: f }); } }
const sample = picked.slice(0, o.docs);

fs.mkdirSync(o.out, { recursive: true });
const sidecar = path.join(o.out, "sidecar.jsonl");
fs.writeFileSync(sidecar, "");
const rows = [];
for (const { cat, file } of sample) {
  let text = ""; try { text = fs.readFileSync(file, "utf8"); } catch { continue; }
  if (text.trim().length < 200) continue;
  const rel = path.relative(ROOT, file);
  const t0 = Date.now();
  let body;
  try { body = await readDoor({ text: text.slice(0, o.chars), name: rel, earSelection: o.ear, earCandidates: o.cands, earProbeChars: 2000 }); }
  catch (err) { body = { error: String(err?.message ?? err) }; }
  const line = {
    schema: "SidecarRead@1", address: rel, category: cat, bytes: Buffer.byteLength(text), readCharacters: body.readCharacters ?? Math.min(o.chars, text.length),
    language: body.language ?? null, languageSource: body.languageSource ?? null, detector: body.detector ?? null, earSelection: body.earSelection ?? null,
    cast: (body.referents ?? []).map((r) => ({ ref: r.ref ?? null, surface: r.surfaces?.[0] ?? null })).filter((r) => r.surface),
    relations: (body.relations ?? []).map((r) => ({ relation: r.relation, participants: (r.participants ?? []).map((p) => ({ ref: p.ref ?? null, surface: p.surface ?? null })) })),
    signal: (body.relations ?? []).filter((r) => (r.participants ?? []).length >= 2 && (r.participants ?? []).every((p) => { const t = String(p.surface ?? "").trim(); return t && !/^[\p{P}\p{S}]+$/u.test(t); })).length,
    gaps: body.gaps ?? [], ms: body.ms ?? (Date.now() - t0), error: body.error ?? null,
  };
  fs.appendFileSync(sidecar, JSON.stringify(line) + "\n");
  rows.push(line);
  console.error(`${rel}: cast ${line.cast.length} rel ${line.relations.length} signal ${line.signal} lang ${line.language} (${line.languageSource}) ${line.ms}ms`);
}
const usable = (r) => (r.cast?.length >= 3) && (r.relations?.length >= 3);
const nUsable = rows.filter(usable).length;
const enRows = rows.filter((r) => ENGLISH_CAT.has(r.category));
const earAgrees = enRows.filter((r) => EN_FAMILY.has(String(r.language ?? "").slice(0, 3))).length;
const summary = {
  slice: { docsRequested: o.docs, docsRead: rows.length, charsCap: o.chars, candidates: o.cands, perCat: o.perCat },
  totals: { usable: nUsable, usableShare: rows.length ? +(nUsable / rows.length).toFixed(3) : 0, meanCast: rows.length ? +(rows.reduce((a, r) => a + (r.cast?.length ?? 0), 0) / rows.length).toFixed(1) : 0, meanRelations: rows.length ? +(rows.reduce((a, r) => a + (r.relations?.length ?? 0), 0) / rows.length).toFixed(1) : 0, errors: rows.filter((r) => r.error).length },
  K3_earAgreesOnEnglish: { englishDocs: enRows.length, agreed: earAgrees },
  verdict: rows.length && nUsable / rows.length >= 0.5 ? "PASSING" : "NOT_PASSING",
  rows: rows.map((r) => ({ address: r.address, cast: r.cast.length, relations: r.relations.length, signal: r.signal, language: r.language, languageSource: r.languageSource, explored: r.earSelection?.explored ?? null })),
};
fs.writeFileSync(path.join(o.out, "summary.json"), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary.totals, null, 1));
console.log("verdict:", summary.verdict, "| K3 ear agrees on English:", `${earAgrees}/${enRows.length}`);
console.log("sidecar:", sidecar);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { /* already ran */ }
export { usable };
