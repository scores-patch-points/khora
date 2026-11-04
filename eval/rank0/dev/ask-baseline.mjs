// A = the Ask's own recorded top-5 passages (holodeck draft PR 31, raw/base.json: the Ask with layers 3 and 4 off), scored against the same gold.
// NOT the same pool: the Ask ranked statements of all 21 texts; hits are counted if the passage lies in a gold doc and contains a gold string (or, 20+ chars, is contained in one).
// usage: node ask-baseline.mjs <ask raw json> <DEV-27.json>
import fs from "node:fs";
const norm = (s) => String(s).replace(/\s+/g, " ").trim().toLowerCase();
const raw = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), qs = JSON.parse(fs.readFileSync(process.argv[3], "utf8")).new;
const rows = [];
for (const q of qs) {
  const r = raw.results.find((x) => x.id === q.id); const gold = q.gold.map((g) => ({ doc: g.doc, s: norm(g.contains) }));
  let rank = null;
  (r?.passages || []).forEach((p, i) => { if (rank) return; const t = norm(p.text); if (gold.some((g) => (p.docs || []).includes(g.doc) && (t.includes(g.s) || (t.length >= 20 && g.s.includes(t))))) rank = i + 1; });
  rows.push({ id: q.id, rank });
}
const o = { n: rows.length, r1: 0, r3: 0, r5: 0, mrr: 0 };
for (const r of rows) { if (r.rank) { if (r.rank <= 1) o.r1++; if (r.rank <= 3) o.r3++; o.r5++; o.mrr += 1 / r.rank; } }
o.mrr /= rows.length; console.log(JSON.stringify(o), JSON.stringify(rows));
