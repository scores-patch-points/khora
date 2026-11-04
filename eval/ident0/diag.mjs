// POST-HOC, exploratory (written after results.json): why are forms unmapped under M1? For each unmapped form: does the article have an edge end that equals a prefix/suffix/substring of the form, or that contains the form?
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const R = JSON.parse(fs.readFileSync(path.join(here, 'results.json')));
const norm = (s) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const forms = new Map(); for (const r of R.rows) for (const f of [r.a, r.b]) forms.set(`${r.key}|${f}`, { key: r.key, f });
const ends = {}; const stat = { forms: forms.size, exact: 0, endContainsForm: 0, formContainsEnd: 0, none: 0, inCastOff: 0, unmappedInCastOff: 0 }; const ex = [];
for (const { key, f } of forms.values()) {
  const e = JSON.parse(fs.readFileSync(path.join(here, 'reads', `${key}__off.json`))); const set = ends[key] ??= new Set(e.edges.flatMap((x) => [norm(x.end1), norm(x.end2)]));
  const n = norm(f); const castHit = (e.cast ?? []).some((c) => [c.surface, ...(c.allSurfaces ?? [])].some((s) => norm(s) === n)); if (castHit) stat.inCastOff++;
  if (set.has(n)) { stat.exact++; continue; } if (castHit) stat.unmappedInCastOff++;
  const sup = [...set].filter((s) => s.includes(n)), sub = [...set].filter((s) => s.length > 2 && n.includes(s));
  if (sup.length) { stat.endContainsForm++; if (ex.length < 12) ex.push([f, 'end contains form', sup.slice(0, 3)]); } else if (sub.length) { stat.formContainsEnd++; if (ex.length < 24) ex.push([f, 'form contains end', sub.slice(0, 4)]); } else stat.none++;
}
console.log(JSON.stringify(stat)); for (const x of ex) console.log(JSON.stringify(x));
