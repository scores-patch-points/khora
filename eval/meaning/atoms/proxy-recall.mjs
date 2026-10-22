// proxy-recall.mjs — a MECHANICAL stand-in for the recall judge: a gold atom is met when some system atom of the same sentence has arguments
// that align with its arguments one to one (two of them, for a fact over three or more) (an entity by any text the gold gives it in that sentence or its name; a value by its words or
// its digits), order free; a one-argument atom also needs a predicate word in common. The predicate of a two-or-more argument atom is not
// compared: the proxy measures which facts' participants were found, and is checked against the judges before it is used (see --check).
//   import { metBy } from "./proxy-recall.mjs"; or  node proxy-recall.mjs --check  (agreement with the judged runs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/^(the|a|an|el|la|los|las|le|les|l'|l’|der|die|das|den|dem|des|un|une|una|ein|eine)\s+/u, "").replace(/[“”"'’(),.:;]/g, "").replace(/\s+/g, " ").trim();
const digits = (s) => String(s ?? "").replace(/[^\d]/g, "");
const stem = (w) => norm(w).replace(/^(more|most):/, "").split(/[_\s]+/).filter((x) => x.length > 2).map((x) => x.slice(0, 4));
const close = (a, b) => { a = norm(a); b = norm(b); if (!a || !b) return false; if (a === b) return true; if (a.length > 1 && b.length > 1 && (a.includes(b) || b.includes(a))) return true; const la = a.split(" ").at(-1), lb = b.split(" ").at(-1); return la.length > 3 && la === lb; };
// gold arguments as the texts that name them in this sentence
export function goldArgTexts(arg, { mentions, entities }) {
  if (typeof arg === "string" && /^E\d+$/.test(arg)) return [...new Set([...(mentions ?? []).filter((m) => m.entity === arg && m.text && !/^(pronoun|dropped)$/.test(m.how)).map((m) => m.text), entities.find((e) => e.id === arg)?.name].filter(Boolean))];
  return [String(arg)];
}
const sysArgTexts = (a) => (a && typeof a === "object" ? [a.name, a.value, ...(a.texts ?? [])].filter(Boolean) : [String(a)]);
const argMeets = (gTexts, sa) => { const st = sysArgTexts(sa); return gTexts.some((g) => st.some((s) => close(g, s) || (digits(g).length >= 2 && digits(g) === digits(s)))); };
export function metBy(goldAtom, sysAtoms, ctx) {
  const gs = goldAtom.args.map((a) => goldArgTexts(a, ctx));
  return sysAtoms.map((s, i) => [s, i]).filter(([s]) => {
    const as = s.args ?? [];
    if (gs.length === 1) return as.length >= 1 && argMeets(gs[0], as[0]) && stem(goldAtom.pred).some((p) => stem(s.pred).includes(p));
    if (as.length < 2) return false;
    // one to one, order free: each gold argument to a different system argument
    const used = new Set();
    // a fact over three or more participants is met by an atom over two of them
    const hits = gs.filter((g) => { const k = as.findIndex((a, j) => !used.has(j) && argMeets(g, a)); if (k < 0) return false; used.add(k); return true; }).length;
    return hits >= Math.min(gs.length, 2);
  }).map(([, i]) => i);
}
if (process.argv.includes("--check")) {
  const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
  const sets = [["atoms", "atoms/run13/system.json", "atoms/run13"], ["atoms14", "atoms14/system.json", "atoms14/judged"], ["atoms15", "atoms15/system.json", "atoms15/judged"], ["atoms16", "atoms16/system.json", "atoms16/judged"]];
  for (const [d, sys, jd] of sets) {
    const M = path.join(HERE, ".."), S = new Map(read(path.join(M, d, "sentences.json")).map((s) => [s.sid, s])), G = read(path.join(M, d, "gold.json")), Y = new Map(read(path.join(M, sys)).sentences.map((s) => [s.sid, s]));
    const R = new Map(); for (let k = 0; k < 4; k++) for (const v of read(path.join(M, jd, `judged-R${k}.json`))) R.set(`${v.sid}\t${v.j}`, !!v.found);
    let a = 0, b = 0, c = 0, dd = 0;
    for (const g of G.sentences) { const ctx = { mentions: g.mentions, entities: G.entities[S.get(g.sid).title] ?? [] }, y = Y.get(g.sid)?.atoms ?? [];
      g.atoms.forEach((ga, j) => { const p = metBy(ga, y, ctx).length > 0, J = R.get(`${g.sid}\t${j}`); if (J == null) return; if (p && J) a++; else if (p) b++; else if (J) c++; else dd++; }); }
    const n = a + b + c + dd;
    console.log(`${d}: judges ${(100 * (a + c) / n).toFixed(1)}%  proxy ${(100 * (a + b) / n).toFixed(1)}%  agreement ${(100 * (a + dd) / n).toFixed(1)}%  (both ${a}, proxy only ${b}, judge only ${c}, neither ${dd})`);
  }
}
