// native/eval/weft/chronology.mjs — the corpus in PUBLICATION ORDER, with a NAMED GIVER per date.
//
// The read order is time. A date is GIVEN (a named source) or a TYPED GAP — never a guess.
// Per-category resolvers, each naming its giver:
//   ntrs_accession  — NASA NTRS accession number's own year prefix (19650003019 -> 1965)
//   bibliographic   — the work's year of first publication (pubyears.json, giver named there)
//   declared        — a year the document's OWN header declares (Published/Date/Issued/Effective)
//   year_unknown    — a typed gap, categorised (encyclopedic / holy / code / catalog ...)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUB = JSON.parse(fs.readFileSync(path.join(HERE, "pubyears.json"), "utf8"));

const CATEGORISE_UNDATED = (rel) => {
  const top = rel.split("/")[0];
  if (/encyclopedic/.test(top)) return "encyclopedic_undated";
  if (/holy-texts/.test(top)) return "holy_undated";
  if (/source-code/.test(top)) return "code_undated";
  if (/audio-music|images-media/.test(top)) return "catalog_undated";
  if (/government-legal/.test(top)) return "legal_undated";
  return "undated";
};

/** resolve(relPath, head) -> { year, source, giver, note? } | { year: null, source, category } */
export function resolve(rel, head = "") {
  // 1. NTRS accession number's own year
  const nt = /ntrs-white-papers\/(\d{4})/.exec(rel);
  if (nt) return { year: Number(nt[1]), source: "ntrs_accession", giver: "the NTRS accession number's own year prefix" };
  // 1b. UDHR — the declaration's own declared adoption date ("Adopted: … 10 December 1948")
  if (/un-udhr\//.test(rel)) { const a = /Adopted:[^\n]*?(\d{4})/.exec(head); return { year: a ? Number(a[1]) : 1948, source: "declared", giver: "the UDHR's own declared adoption date (UN GA res. 217 A, 1948)" }; }
  // 1c. legislation — the act's own year, in its identifier (BOPA-C-1993.md, ZZ-2023-1.md)
  if (/world-legislation\//.test(rel)) { const y = /(?:^|[^\d])((?:19|20)\d{2})(?:[^\d]|$)/.exec(rel.split("/").pop()); if (y) return { year: Number(y[1]), source: "declared", giver: "the legislation file's own identifier year" }; }
  if (/world-factbook\//.test(rel)) return { year: null, source: "year_unknown", category: "factbook_annual_undated" };
  // 2. the work's first publication (giver named in pubyears.json)
  const base = rel.split("/").pop();
  if (PUB.years[base]) return { year: PUB.years[base].year, source: "bibliographic", giver: PUB.giver, note: PUB.years[base].note };
  // 3. a year the document's own header declares
  const m = /^\s*(?:published|publication|date|issued|effective)\b[^\n]*?(\d{4})\b/im.exec(String(head).slice(0, 4000));
  if (m) return { year: Number(m[1]), source: "declared", giver: "the document's own declared header" };
  // 4. typed gap, categorised
  return { year: null, source: "year_unknown", category: CATEGORISE_UNDATED(rel) };
}

export function chronology(root) {
  const files = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.name.startsWith(".")) continue; const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.(txt|md)$/.test(e.name)) files.push(p); } };
  walk(root);
  const rows = files.map((p) => { let head = ""; try { head = fs.readFileSync(p, "utf8").slice(0, 4000); } catch {} const rel = path.relative(root, p); return { path: rel, ...resolve(rel, head) }; });
  const known = rows.filter((r) => r.year != null).sort((a, b) => a.year - b.year || a.path.localeCompare(b.path));
  const unknown = rows.filter((r) => r.year == null).sort((a, b) => a.path.localeCompare(b.path));
  return { order: [...known, ...unknown], rows, known: known.length, unknown: unknown.length, total: rows.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] || "/Users/mlacy/Documents/3.0/ethos";
  const c = chronology(root);
  const bySource = {}; for (const r of c.rows) bySource[r.source] = (bySource[r.source] || 0) + 1;
  console.log(`chronology: ${c.total} docs · ${c.known} dated (${(100 * c.known / c.total).toFixed(0)}%) · ${c.unknown} typed gaps`);
  console.log("by source:", JSON.stringify(bySource));
  const ys = c.order.filter((r) => r.year != null);
  console.log(`span: ${ys[0].year} → ${ys[ys.length - 1].year}`);
  const byCent = {}; for (const r of ys) { const k = r.year < 0 ? "BCE" : `${Math.floor(r.year / 100) * 100}s`; byCent[k] = (byCent[k] || 0) + 1; }
  console.log("by century:", Object.entries(byCent).join(" "));
  const gapCat = {}; for (const r of c.rows.filter((r) => r.year == null)) gapCat[r.category] = (gapCat[r.category] || 0) + 1;
  console.log("typed gaps:", JSON.stringify(gapCat));
  const out = path.join(HERE, "chronology.json");
  fs.writeFileSync(out, JSON.stringify({ schema: "Chronology@1", root, givers: { ntrs_accession: "NTRS accession scheme", bibliographic: PUB.giver, declared: "the document's own header" }, order: c.order }, null, 1));
  console.log(`wrote ${out}`);
  console.log("\nfirst 10 dated:"); for (const r of ys.slice(0, 10)) console.log(`  ${String(r.year).padStart(5)}  ${r.source.padEnd(14)} ${r.path}`);
}
